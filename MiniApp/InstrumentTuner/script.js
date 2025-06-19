document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const instrumentSwitcher = document.getElementById('instrument-switcher');
    const instrumentDisplay = document.getElementById('instrument-display');
    const instrumentSelectHidden = document.getElementById('instrument-select-hidden');
    const noteNameDisplay = document.getElementById('meter-note');
    const frequencyDisplay = document.getElementById('meter-hz');
    const centsDisplay = document.getElementById('meter-cents');
    const statusDisplay = document.getElementById('status');
    const stringStatusContainer = document.getElementById('string-status');
    const pointer = document.getElementById('pointer');
    const meterFrame = document.querySelector('.tuner-meter-frame');

    // --- Basic Checks ---
    if (!instrumentSwitcher || !instrumentDisplay || !pointer || !meterFrame || !stringStatusContainer || !noteNameDisplay || !frequencyDisplay || !centsDisplay || !statusDisplay) {
        console.error("Fatal Error: Critical UI element(s) missing. Check HTML IDs and selectors.");
        if (statusDisplay) statusDisplay.textContent = "Error: UI Load Failed.";
        return;
    }

    // --- Audio Setup ---
    let audioContext;
    let analyser;
    let mediaStreamSource;
    let buflen;
    let buf;
    let rafId;

    // --- Tuning Constants ---
    const A4 = 440;
    const noteStrings = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const IN_TUNE_THRESHOLD_CENTS = 5;
    const STABILITY_THRESHOLD_FRAMES = 5;
    const STRING_FLASH_FRAMES = 3;
    const MIN_RMS_THRESHOLD = 0.01;
    const MIN_DETECT_FREQ = 60;
    const MAX_DETECT_FREQ = 1400;
    const MAX_POINTER_ROTATION = 80;

    // --- Instrument Definitions ---
    const instruments = {
        guitar: { name: "Guitar", notes: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }},
        ukulele: { name: "Ukulele", notes: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }}
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';

    // --- State Variables ---
    let stableCounter = 0;
    let stringStableCounters = {};
    let stringTunedStatus = {};
    
    // --- NEW: Smoothing variables ---
    const SMOOTHING_BUFFER_SIZE = 5; // Average over the last 5 frames
    const centsBuffer = [];
    let smoothedCents = 0;
    let frameCount = 0; // For throttling text updates

    // --- Audio Feedback ---
    let osc;
    let gainNode;

    // ==========================================================================
    // Initialization
    // ==========================================================================
    function initAudio() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             console.error("getUserMedia not supported on your browser!");
             statusDisplay.textContent = "Error: Browser does not support microphone input.";
             alert("Error: Your browser does not support the necessary features for microphone input.");
             return;
        }

        statusDisplay.textContent = "Requesting microphone access...";
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.connect(audioContext.destination);

                osc = audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioContext.currentTime);
                osc.connect(gainNode);
                try { osc.start(); } catch (e) { console.warn("Oscillator already started.", e); }

                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                buflen = analyser.fftSize;
                buf = new Float32Array(buflen);
                analyser.smoothingTimeConstant = 0.1;

                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                mediaStreamSource.connect(analyser);

                statusDisplay.textContent = "Microphone active";
                setupInstrumentSwitcher();
                updateStringIndicators();

                if (audioContext.state === 'suspended') {
                     audioContext.resume().then(() => {
                        if (!rafId) updateTuner();
                     }).catch(e => console.error("Error resuming AudioContext:", e));
                } else if (!rafId){
                    updateTuner();
                }
            })
            .catch(err => {
                console.error("Microphone access denied or error:", err);
                statusDisplay.textContent = "Error: Microphone access denied or unavailable.";
                if (err.name === 'NotAllowedError') {
                     alert('Microphone access was denied. Please grant permission and refresh.');
                } else if (err.name === 'NotFoundError') {
                     alert('No microphone found. Please connect a microphone.');
                } else {
                    alert('An error occurred while accessing the microphone: ' + err.message);
                }
            });
    }

    // ==========================================================================
    // Pitch Detection (Autocorrelation)
    // ==========================================================================
    function autoCorrelate(buf, sampleRate) {
        const SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) { rms += buf[i] * buf[i]; }
        rms = Math.sqrt(rms / SIZE);
        if (rms < MIN_RMS_THRESHOLD) return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        if (r1 === SIZE / 2) r1 = 0;
        for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        const bufSlice = buf.slice(r1, r2);

        const NEW_SIZE = bufSlice.length;
        if (NEW_SIZE < 4) return -1;
        
        const c = new Float32Array(NEW_SIZE).fill(0);
        for (let i = 0; i < NEW_SIZE; i++) { for (let j = 0; j < NEW_SIZE - i; j++) { c[i] = c[i] + bufSlice[j] * bufSlice[j + i]; } }

        let d = 0; while (d < NEW_SIZE -1 && c[d] > c[d + 1]) { d++; }
        if (d === NEW_SIZE -1) return -1;

        let maxval = -1, maxpos = -1;
        for (let i = d; i < NEW_SIZE; i++) {
            if (i > 0 && i < NEW_SIZE - 1 && c[i-1] <= c[i] && c[i] >= c[i+1]){ if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
        }
        if (maxpos === -1) { maxpos = d; for(let i = d+1; i < NEW_SIZE; i++){ if(c[i] > c[maxpos]){ maxpos = i; } } }

        let T0 = maxpos;
        if (T0 > 0 && T0 < NEW_SIZE - 1) {
            const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
            const a = (x1 + x3 - 2 * x2) / 2; const b = (x3 - x1) / 2;
            if (Math.abs(a) > 1e-6) { const extremum = -b / (2 * a); if (Math.abs(extremum) < 1) { T0 += extremum; } }
        }
        if (T0 <= 0) return -1;

        const fundamentalFrequency = sampleRate / T0;
        if (fundamentalFrequency < MIN_DETECT_FREQ || fundamentalFrequency > MAX_DETECT_FREQ || !Number.isFinite(fundamentalFrequency)) return -1;
        return fundamentalFrequency;
    }

    // ==========================================================================
    // Note Calculation
    // ==========================================================================
    function frequencyFromNoteNumber(note) { return A4 * Math.pow(2, (note - 69) / 12); }
    function noteFromPitch(frequency) { if (!Number.isFinite(frequency) || frequency <= 0) return { note: -1, cents: 0 }; const noteNum = 12 * (Math.log(frequency / A4) / Math.log(2)); const roundedNote = Math.round(noteNum) + 69; const cents = 1200 * (Math.log(frequency / frequencyFromNoteNumber(roundedNote)) / Math.log(2)); return { note: roundedNote, cents: Number.isFinite(cents) ? cents : 0 }; }

    // ==========================================================================
    // UI Update Functions
    // ==========================================================================
    function setupInstrumentSwitcher() {
        instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
        if (instrumentSelectHidden) instrumentSelectHidden.value = currentInstrumentKey;

        instrumentSwitcher.addEventListener('click', () => {
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            if (instrumentSelectHidden) instrumentSelectHidden.value = currentInstrumentKey;
            
            // Reset state
            stringTunedStatus = {}; stringStableCounters = {}; stableCounter = 0;
            centsBuffer.length = 0; // Clear the smoothing buffer
            smoothedCents = 0;

            updateStringIndicators();
            if (pointer) { pointer.style.transform = `translateX(-50%) rotate(0deg)`; pointer.classList.remove('in-tune'); }
            if (noteNameDisplay) noteNameDisplay.textContent = '--';
            if (frequencyDisplay) frequencyDisplay.textContent = '-- Hz';
            if (centsDisplay) centsDisplay.textContent = '-- cents';
            if (statusDisplay) statusDisplay.textContent = 'Play a note...';
        });

        instrumentSwitcher.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { instrumentSwitcher.click(); e.preventDefault(); } });
    }

    function updateStringIndicators() {
        const targetNotes = instruments[currentInstrumentKey].notes;
        stringStatusContainer.innerHTML = '';
        stringStableCounters = {};
        if (!targetNotes) return;
        for (const noteName in targetNotes) {
            stringStableCounters[noteName] = 0;
            const span = document.createElement('span');
            span.className = 'string-note';
            span.textContent = noteName;
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) span.classList.add('tuned');
            stringStatusContainer.appendChild(span);
        }
    }

    function flashStringIndicator(noteName) {
        const targetElement = stringStatusContainer.querySelector(`.string-note[data-note="${noteName}"]`);
        if (targetElement) {
            targetElement.classList.add('flash-tune');
            targetElement.addEventListener('animationend', () => targetElement.classList.remove('flash-tune'), { once: true });
        }
    }

    // ==========================================================================
    // Main Update Loop
    // ==========================================================================
    function updateTuner() {
        if (!audioContext || audioContext.state !== 'running' || !analyser) {
            rafId = requestAnimationFrame(updateTuner); return;
        }

        analyser.getFloatTimeDomainData(buf);
        const currentPitch = autoCorrelate(buf, audioContext.sampleRate);
        const pitchDetected = currentPitch !== -1;

        let noteName = "--";
        let displayFrequency = 0;
        let currentCents = 0;
        let detectedTargetNote = null;
        let isInTune = false;

        // --- Pitch Analysis ---
        if (pitchDetected) {
            displayFrequency = currentPitch;
            const { note, cents } = noteFromPitch(currentPitch);
            if (note !== -1) {
                noteName = `${noteStrings[note % 12]}${Math.floor(note / 12) - 1}`;
                currentCents = cents;

                const targetNotes = instruments[currentInstrumentKey].notes;
                let minDiff = Infinity, closestTarget = null, closestTargetFreq = 0;
                for (const targetNote in targetNotes) {
                    const diff = Math.abs(currentPitch - targetNotes[targetNote]);
                    if (diff < minDiff) { minDiff = diff; closestTarget = targetNote; closestTargetFreq = targetNotes[targetNote]; }
                }
                if (Math.abs(1200 * Math.log2(currentPitch / closestTargetFreq)) < 50) {
                    detectedTargetNote = closestTarget;
                    isInTune = Math.abs(currentCents) < IN_TUNE_THRESHOLD_CENTS;
                }
            }
        }

        // --- NEW: Smooth the cents value for the pointer ---
        if (pitchDetected) {
            centsBuffer.push(currentCents);
            if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) {
                centsBuffer.shift(); // Keep buffer at a fixed size
            }
        } else {
             // If no signal, gradually move buffer to 0 to center the pointer
            centsBuffer.push(0);
            if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) {
                centsBuffer.shift();
            }
        }
        smoothedCents = centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length;
        
        // --- Update Pointer using SMOOTHED value ---
        let rotation = (smoothedCents / 50) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        if (pointer) {
            pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            pointer.classList.toggle('in-tune', isInTune && detectedTargetNote);
        }

        // --- Update Text less frequently to reduce flicker ---
        frameCount++;
        if (frameCount % 3 === 0) { // Update text every 3 frames (~20fps)
            frequencyDisplay.textContent = `${pitchDetected ? displayFrequency.toFixed(1) : '--'} Hz`;
            centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
            noteNameDisplay.textContent = noteName;
        }

        // --- Handle String Status & Feedback (using raw, not smoothed values for immediate logic) ---
        if (detectedTargetNote) {
            stringStableCounters[detectedTargetNote] = (stringStableCounters[detectedTargetNote] || 0) + 1;
            if (isInTune) {
                if (!stringTunedStatus[detectedTargetNote] && stringStableCounters[detectedTargetNote] >= STRING_FLASH_FRAMES) {
                    stringTunedStatus[detectedTargetNote] = true;
                    flashStringIndicator(detectedTargetNote);
                    const targetElement = stringStatusContainer.querySelector(`.string-note[data-note="${detectedTargetNote}"]`);
                    if(targetElement) targetElement.classList.add('tuned');
                }
                stableCounter++;
                if (stableCounter === STABILITY_THRESHOLD_FRAMES) {
                    const now = audioContext.currentTime;
                    gainNode.gain.cancelScheduledValues(now);
                    gainNode.gain.setValueAtTime(0.1, now);
                    gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
                    meterFrame.classList.add('flash-green');
                    meterFrame.addEventListener('animationend', () => meterFrame.classList.remove('flash-green'), { once: true });
                }
                if (statusDisplay) { statusDisplay.textContent = `${detectedTargetNote} In Tune ✓`; statusDisplay.className = 'status-message in-tune'; }
            } else {
                stableCounter = 0;
                stringStableCounters[detectedTargetNote] = 0;
                if (statusDisplay) {
                    if (currentCents > IN_TUNE_THRESHOLD_CENTS) { statusDisplay.textContent = `${detectedTargetNote} Tune Down ↓`; statusDisplay.className = 'status-message sharp'; }
                    else if (currentCents < -IN_TUNE_THRESHOLD_CENTS) { statusDisplay.textContent = `${detectedTargetNote} Tune Up ↑`; statusDisplay.className = 'status-message flat'; }
                    else { statusDisplay.textContent = `${detectedTargetNote} Getting closer...`; statusDisplay.className = 'status-message'; }
                }
            }
        } else {
            stableCounter = 0;
            if (statusDisplay) { statusDisplay.textContent = pitchDetected ? "Aim for a string..." : "Play a note..."; statusDisplay.className = 'status-message'; }
        }
        for (const note in stringStableCounters) { if (note !== detectedTargetNote) { stringStableCounters[note] = 0; } }

        rafId = requestAnimationFrame(updateTuner);
    }

    // Event Listeners & Startup
    document.addEventListener('visibilitychange', () => {
        if (!audioContext) return;
        if (document.hidden) {
            if (audioContext.state === 'running') audioContext.suspend().catch(e=>console.error("Suspend failed", e));
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else {
            if (audioContext.state === 'suspended') audioContext.resume().then(() => { if (!rafId) updateTuner(); }).catch(e => console.error("Resume failed", e));
            else if (!rafId && audioContext.state === 'running') updateTuner();
        }
    });

    initAudio();

});