document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const instrumentSwitcher = document.getElementById('instrument-switcher');
    const instrumentDisplay = document.getElementById('instrument-display');
    const instrumentSelectHidden = document.getElementById('instrument-select-hidden'); // Hidden select
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
        if (statusDisplay) {
            statusDisplay.textContent = "Error: UI Load Failed.";
        }
        return; // Stop execution if critical elements are missing
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
    const STABILITY_THRESHOLD_FRAMES = 5; // Frames for meter flash / sound
    const STRING_FLASH_FRAMES = 3; // Frames to consider string stable for flash
    const MIN_RMS_THRESHOLD = 0.01; // Minimum volume to process
    const MIN_DETECT_FREQ = 60;
    const MAX_DETECT_FREQ = 1400;
    const MAX_POINTER_ROTATION = 80; // Max degrees for rectangular meter

    // --- Instrument Definitions ---
    const instruments = {
        guitar: { name: "Guitar", notes: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }},
        ukulele: { name: "Ukulele", notes: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }}
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar'; // Default

    // --- State Variables ---
    let currentPitch = -1;
    let currentCents = 0;
    let stableCounter = 0; // Counter for stable in-tune detection (meter flash/sound)
    let stringStableCounters = {}; // Track stability PER string for flashing: { 'E4': count }
    let stringTunedStatus = {}; // Persistent tuned state: { 'E4': true }
    let lastPlayedNote = null;

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
                audioContext.onstatechange = () => {
                    // Optional: Handle state changes like 'suspended' or 'closed'
                    if (audioContext.state !== 'running' && rafId) {
                        cancelAnimationFrame(rafId);
                        rafId = null;
                    } else if (audioContext.state === 'running' && !rafId) {
                         updateTuner(); // Restart loop if context becomes running again
                    }
                 };

                // Setup Gain Node for sound feedback (start muted)
                gainNode = audioContext.createGain();
                gainNode.gain.setValueAtTime(0, audioContext.currentTime);
                gainNode.connect(audioContext.destination);

                // Setup Oscillator (but don't start it yet)
                osc = audioContext.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note
                osc.connect(gainNode);
                try { osc.start(); } catch (e) { console.warn("Oscillator already started or other issue:", e); }

                // Setup Analyser
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                buflen = analyser.fftSize;
                buf = new Float32Array(buflen);
                analyser.smoothingTimeConstant = 0.1; // Smoothing helps stabilize readings

                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                mediaStreamSource.connect(analyser);

                statusDisplay.textContent = "Microphone active";
                setupInstrumentSwitcher(); // Setup the custom switcher now
                updateStringIndicators(); // Initial population based on default instrument

                // Resume context if it's suspended (often needed after user interaction)
                if (audioContext.state === 'suspended') {
                     audioContext.resume().then(() => {
                        if (!rafId) updateTuner(); // Start loop if not already running
                     }).catch(e => console.error("Error resuming AudioContext:", e));
                } else if (!rafId){
                    updateTuner(); // Start the loop if context is already running
                }
            })
            .catch(err => {
                console.error("Microphone access denied or error:", err);
                statusDisplay.textContent = "Error: Microphone access denied or unavailable.";
                if (err.name === 'NotAllowedError') {
                     alert('Microphone access was denied. Please grant permission in your browser settings and refresh the page.');
                } else if (err.name === 'NotFoundError') {
                     alert('No microphone found. Please ensure a microphone is connected and enabled.');
                } else {
                    alert('An error occurred while accessing the microphone: ' + err.message);
                }
            });
    }

    // ==========================================================================
    // Pitch Detection (Autocorrelation - Basic)
    // ==========================================================================
    function autoCorrelate(buf, sampleRate) {
        const SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) { rms += buf[i] * buf[i]; }
        rms = Math.sqrt(rms / SIZE);

        if (rms < MIN_RMS_THRESHOLD) return -1; // Not enough signal

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        if (r1 == SIZE / 2) r1 = 0;
        for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        if (r2 == SIZE -1) r2 = SIZE;
        const bufSlice = buf.slice(r1, r2);

        const NEW_SIZE = bufSlice.length;
        if (NEW_SIZE < 4) return -1;

        const c = new Float32Array(NEW_SIZE).fill(0);
        for (let i = 0; i < NEW_SIZE; i++) { for (let j = 0; j < NEW_SIZE - i; j++) { c[i] = c[i] + bufSlice[j] * bufSlice[j + i]; } }

        let d = 0; while (d < NEW_SIZE -1 && c[d] > c[d + 1]) { d++; } // Check d < NEW_SIZE - 1
        if (d === NEW_SIZE -1) return -1; // Prevent reading c[d+1] out of bounds

        let maxval = -1, maxpos = -1;
        for (let i = d; i < NEW_SIZE; i++) {
            if (i > 0 && i < NEW_SIZE - 1) { // Ensure we can access i-1 and i+1
                if (c[i-1] <= c[i] && c[i] >= c[i+1]){ if (c[i] > maxval) { maxval = c[i]; maxpos = i; } }
            } else if (i === d && c[i] >= c[i+1]) { // Handle start edge case
                 if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
            } else if (i === NEW_SIZE - 1 && c[i-1] <= c[i]) { // Handle end edge case
                 if (c[i] > maxval) { maxval = c[i]; maxpos = i; }
            }
        }

        if (maxpos === -1) { // Fallback if no clear peak found
            maxpos = d; for(let i = d+1; i < NEW_SIZE; i++){ if(c[i] > c[maxpos]){ maxpos = i; } }
        }

        let T0 = maxpos;
        if (T0 === undefined || T0 <= 0) return -1; // Check T0 validity

        // Parabolic interpolation
        if (T0 > 0 && T0 < NEW_SIZE - 1) {
            const x1 = c[T0 - 1], x2 = c[T0], x3 = c[T0 + 1];
            const a = (x1 + x3 - 2 * x2) / 2; const b = (x3 - x1) / 2;
            if (Math.abs(a) > 1e-6) { const extremum = -b / (2 * a); if (Math.abs(extremum) < 1) { T0 += extremum; } }
        }

        if (T0 <= 0) return -1;

        const fundamentalFrequency = sampleRate / T0;
        if (fundamentalFrequency < MIN_DETECT_FREQ || fundamentalFrequency > MAX_DETECT_FREQ || !Number.isFinite(fundamentalFrequency)) { return -1; }
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
            let nextIndex = (currentIndex + 1) % instrumentOrder.length;
            currentInstrumentKey = instrumentOrder[nextIndex];

            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            if (instrumentSelectHidden) instrumentSelectHidden.value = currentInstrumentKey;

            stringTunedStatus = {}; stringStableCounters = {}; stableCounter = 0;
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
        lastPlayedNote = null;
        stringStableCounters = {};

        if (!targetNotes) { console.error(`No target notes for instrument: ${currentInstrumentKey}`); return; }

        for (const noteName in targetNotes) {
            stringStableCounters[noteName] = 0;
            const span = document.createElement('span');
            span.classList.add('string-note');
            span.textContent = noteName;
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) { span.classList.add('tuned'); } // Apply persistent state
            stringStatusContainer.appendChild(span);
        }
    }

    function flashStringIndicator(noteName) {
        const targetElement = stringStatusContainer.querySelector(`.string-note[data-note="${noteName}"]`);
        if (targetElement) {
            targetElement.classList.add('flash-tune');
            targetElement.addEventListener('animationend', () => { targetElement.classList.remove('flash-tune'); }, { once: true });
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
        currentPitch = autoCorrelate(buf, audioContext.sampleRate);
        let pitchDetected = currentPitch !== -1;

        let noteName = "--"; let displayFrequency = 0; let displayCents = 0; let detectedTargetNote = null; let isInTune = false;

        // --- Pitch Analysis ---
        if (pitchDetected) {
            displayFrequency = currentPitch;
            const { note, cents } = noteFromPitch(currentPitch);
            if (note !== -1) {
                const currentNoteName = noteStrings[note % 12]; const octave = Math.floor(note / 12) - 1; noteName = `${currentNoteName}${octave}`; currentCents = cents; displayCents = cents;
                const targetNotes = instruments[currentInstrumentKey].notes;
                if (targetNotes) {
                    let minDiff = Infinity; let closestTarget = null; let closestTargetFreq = 0;
                    for (const targetNote in targetNotes) { const targetFreq = targetNotes[targetNote]; const diff = Math.abs(currentPitch - targetFreq); if (diff < minDiff) { minDiff = diff; closestTarget = targetNote; closestTargetFreq = targetFreq; } }
                    const centsFromClosestTarget = 1200 * Math.log2(currentPitch / closestTargetFreq);
                    if (Math.abs(centsFromClosestTarget) < 50) { // Is pitch close enough to ID as a target string?
                        detectedTargetNote = closestTarget;
                        if (Math.abs(currentCents) < IN_TUNE_THRESHOLD_CENTS) { isInTune = true; } // Check if that target string is in tune
                    }
                }
            } else { currentCents = 0; }
        } else { currentCents = 0; }

        // --- Update Pointer ---
        let rotation = (currentCents / 50) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        if (pointer) {
            pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
            if (isInTune && detectedTargetNote) { pointer.classList.add('in-tune'); } else { pointer.classList.remove('in-tune'); }
        }

        // --- Update Meter Header Text ---
        frequencyDisplay.textContent = `${displayFrequency.toFixed(1)} Hz`;
        centsDisplay.textContent = `${displayCents.toFixed(0)} cents`;
        noteNameDisplay.textContent = noteName;

        // --- Handle String Status & Feedback ---
        if (detectedTargetNote) {
            stringStableCounters[detectedTargetNote] = (stringStableCounters[detectedTargetNote] || 0) + 1;
            if (isInTune) {
                // Flash and mark persistent state only when it *first* becomes tuned and stable
                if (!stringTunedStatus[detectedTargetNote] && stringStableCounters[detectedTargetNote] >= STRING_FLASH_FRAMES) {
                    stringTunedStatus[detectedTargetNote] = true;
                    flashStringIndicator(detectedTargetNote);
                    // Ensure .tuned class is definitely added after potential flash delay
                    const targetElement = stringStatusContainer.querySelector(`.string-note[data-note="${detectedTargetNote}"]`);
                    if(targetElement) targetElement.classList.add('tuned');
                } else if (stringTunedStatus[detectedTargetNote]) {
                     // If already marked tuned, ensure class is applied (covers edge cases)
                     const targetElement = stringStatusContainer.querySelector(`.string-note[data-note="${detectedTargetNote}"]`);
                     if(targetElement) targetElement.classList.add('tuned');
                }

                // Meter flash / sound check (general stability)
                stableCounter++;
                if (stableCounter === STABILITY_THRESHOLD_FRAMES && gainNode && audioContext && meterFrame) {
                    const now = audioContext.currentTime; gainNode.gain.cancelScheduledValues(now); gainNode.gain.setValueAtTime(0.1, now); gainNode.gain.linearRampToValueAtTime(0, now + 0.05);
                    meterFrame.classList.add('flash-green'); meterFrame.addEventListener('animationend', () => { meterFrame.classList.remove('flash-green'); }, { once: true });
                }
                // Update status text
                if (statusDisplay) { statusDisplay.textContent = `${detectedTargetNote} In Tune ✓`; statusDisplay.className = 'status-message in-tune'; }
            } else { // Detected target note but not in tune
                stableCounter = 0; stringStableCounters[detectedTargetNote] = 0; // Reset stability counters
                // Update status text based on flat/sharp (DO NOT remove .tuned class here for persistence)
                if (statusDisplay) {
                    if (currentCents > IN_TUNE_THRESHOLD_CENTS) { statusDisplay.textContent = `${detectedTargetNote} Tune Down ↓`; statusDisplay.className = 'status-message sharp'; }
                    else if (currentCents < -IN_TUNE_THRESHOLD_CENTS) { statusDisplay.textContent = `${detectedTargetNote} Tune Up ↑`; statusDisplay.className = 'status-message flat'; }
                    else { statusDisplay.textContent = `${detectedTargetNote} Getting closer...`; statusDisplay.className = 'status-message'; }
                }
            }
        } else { // No specific target string detected
            stableCounter = 0;
            if (statusDisplay) { statusDisplay.textContent = pitchDetected ? "Aim for a string..." : "Play a note..."; statusDisplay.className = 'status-message'; }
        }
        // Reset stability counters for strings NOT currently detected
        for (const note in stringStableCounters) { if (note !== detectedTargetNote) { stringStableCounters[note] = 0; } }

        rafId = requestAnimationFrame(updateTuner);
    }

    // ==========================================================================
    // Event Listeners
    // ==========================================================================
    document.addEventListener('visibilitychange', () => {
        if (!audioContext) return;
        if (document.hidden) {
            if (audioContext.state === 'running') { audioContext.suspend().catch(e=>console.error("Suspend failed", e)); }
            if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
        } else {
            if (audioContext.state === 'suspended') { audioContext.resume().then(() => { if (!rafId) { updateTuner(); } }).catch(e => console.error("Resume failed", e)); }
            else if (!rafId && audioContext.state === 'running') { updateTuner(); }
        }
    });

    // ==========================================================================
    // Start Everything
    // ==========================================================================
    initAudio(); // Starts microphone request

}); // End DOMContentLoaded