document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Element References ---
    const noteNameDisplay = document.getElementById('meter-note');
    const frequencyDisplay = document.getElementById('meter-hz');
    const centsDisplay = document.getElementById('meter-cents');
    const statusDisplay = document.getElementById('status');
    const stringStatusContainer = document.getElementById('string-status');
    const meterFrame = document.querySelector('.tuner-meter-frame');
    const instrumentSwitcher = document.getElementById('instrument-switcher');
    const instrumentDisplay = document.getElementById('instrument-display');
    const canvas = document.getElementById('tuner-canvas');
    const ctx = canvas.getContext('2d');
    const startStopBtn = document.getElementById('start-stop-btn');
    const toggleNoiseFilterBtn = document.getElementById('toggle-noise-filter');
    const toggleAutoAdvanceBtn = document.getElementById('toggle-auto-advance');
    const toggleWakeLockBtn = document.getElementById('toggle-wakelock');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDialog = document.getElementById('settings-dialog');
    const settingsForm = settingsDialog.querySelector('form');
    const concertAInput = document.getElementById('concert-a');
    const toleranceInput = document.getElementById('tolerance');
    const allTunedDialog = document.getElementById('all-tuned-dialog');

    // --- Audio Processing & State ---
    let audioContext, analyser, mediaStreamSource, stream, buffer, rafId, bandpassFilter;
    let isListening = false;
    let wakeLock = null;

    // --- Tuner Settings ---
    let concertA = 440; // A4 frequency
    let inTuneThreshold = 5; // Cents
    let isNoiseFilterOn = false;
    let isAutoAdvanceOn = false;
    let isWakeLockEnabled = false;

    // --- RESTRUCTURED: Centralized Note & Instrument Data ---
    const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

    // A master list of notes. Frequencies will be calculated dynamically.
    const ALL_NOTES = {
        'E2': { name: 'E2', freq: 82.41 }, 'A2': { name: 'A2', freq: 110.00 },
        'D3': { name: 'D3', freq: 146.83 }, 'G3': { name: 'G3', freq: 196.00 },
        'B3': { name: 'B3', freq: 246.94 }, 'E4': { name: 'E4', freq: 329.63 },
        'A4': { name: 'A4', freq: 440.00 }, 'G4': { name: 'G4', freq: 392.00 },
        'C4': { name: 'C4', freq: 261.63 }
    };

    const INSTRUMENTS = {
        guitar: { name: "Guitar", tuning: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], range: [80, 1000] },
        ukulele: { name: "Ukulele", tuning: ['G4', 'C4', 'E4', 'A4'], range: [250, 800] }
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';
    
    // --- Tuning Logic State ---
    let stringTunedStatus = {};
    let currentTargetStringIndex = 0;
    let stableInTuneCounter = 0;
    const IN_TUNE_STABILITY_FRAMES = 5; // Needs 5 consecutive frames to be considered stable
    const centsBuffer = [];
    const SMOOTHING_BUFFER_SIZE = 5;
    let autoAdvanceTimer = null;
    let statusUpdateTimer = null;
    let lastStatusKey = "";

    // --- Constants ---
    const MAX_POINTER_ROTATION = 80; // Degrees
    const POINTER_SENSITIVITY_CENTS = 40; // Cents for full deflection
    const RMS_THRESHOLD = 0.01; // Minimum volume to start detecting

    // ===================================================================
    // INITIALIZATION
    // ===================================================================
    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setupEventListeners();
        updateNoteFrequencies(); // Calculate initial frequencies based on default Concert A
        resetTunerState(); // Set up the initial UI state
        drawMeter(0); // Draw initial meter state
    }

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        drawMeter(0); // Redraw meter after resize
    }

    // ===================================================================
    // AUDIO PROCESSING & CORE TUNER LOOP
    // ===================================================================
    async function startTuning() {
        if (isListening) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatusMessage("error", "Browser not supported.");
            return;
        }
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false } });
            
            isListening = true;
            startStopBtn.classList.add('listening');
            updateStatusMessage("listening");

            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            bandpassFilter = audioContext.createBiquadFilter();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 4096; // Increased for better low-frequency resolution
            buffer = new Float32Array(analyser.fftSize);

            // Setup audio graph
            mediaStreamSource.connect(bandpassFilter);
            bandpassFilter.connect(analyser);
            updateBandpassFilter();

            if (isWakeLockEnabled) await requestWakeLock();
            if (!rafId) updateTunerLoop();

        } catch (err) {
            console.error("Error starting audio:", err);
            updateStatusMessage("error", "Mic access denied.");
            stopTuning(); // Clean up on error
        }
    }

    function stopTuning() {
        if (!isListening && !audioContext) return;
        
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') audioContext.close().catch(console.error);
        
        cancelAnimationFrame(rafId);
        rafId = null;
        audioContext = null;
        isListening = false;
        
        startStopBtn.classList.remove('listening');
        if (isWakeLockEnabled) releaseWakeLock();
        
        resetUIDisplay();
    }

    function updateTunerLoop() {
        if (!isListening) return;

        analyser.getFloatTimeDomainData(buffer);
        const pitch = autoCorrelate(buffer, audioContext.sampleRate);

        let noteName = '--';
        let currentCents = 0;
        let detectedTargetNoteKey = null;
        const pitchDetected = pitch !== -1;
        
        if (pitchDetected) {
            const instrument = INSTRUMENTS[currentInstrumentKey];
            let closestNoteInfo = findClosestTargetNote(pitch, instrument);
            
            // Only process if the detected pitch is reasonably close to a target string (within 50 cents)
            if (closestNoteInfo && Math.abs(closestNoteInfo.cents) < 50) {
                detectedTargetNoteKey = closestNoteInfo.key;
                const standardNoteNumber = getNoteNumber(ALL_NOTES[detectedTargetNoteKey].freq);
                currentCents = calculateCents(pitch, standardNoteNumber);
                noteName = detectedTargetNoteKey;
            }
        }
        
        // Smooth the cents value for a more stable pointer
        centsBuffer.push(currentCents);
        if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) centsBuffer.shift();
        const smoothedCents = pitchDetected ? centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length : 0;
        
        // Update UI
        drawMeter(smoothedCents);
        frequencyDisplay.textContent = `${pitchDetected ? pitch.toFixed(1) : '--'} Hz`;
        centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
        noteNameDisplay.textContent = noteName;
        
        const isInTune = Math.abs(smoothedCents) < inTuneThreshold;
        handleTuningLogic(detectedTargetNoteKey, isInTune, smoothedCents);
        
        rafId = requestAnimationFrame(updateTunerLoop);
    }
    
    // ===================================================================
    // PITCH DETECTION & ANALYSIS
    // ===================================================================
    function autoCorrelate(buf, sampleRate) {
        const SIZE = buf.length;
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / SIZE);
        if (rms < (isNoiseFilterOn ? 0.02 : RMS_THRESHOLD)) return -1; // Exit if signal is too weak

        const C = new Float32Array(SIZE).fill(0);
        for (let i = 0; i < SIZE; i++) {
            for (let j = 0; j < SIZE - i; j++) {
                C[i] = C[i] + buf[j] * buf[j+i];
            }
        }

        let d = 0; while (d < SIZE && C[d] > C[d+1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < SIZE; i++) {
            if (C[i] > maxval) { maxval = C[i]; maxpos = i; }
        }
        
        let T0 = maxpos;
        if (maxpos > 0 && maxpos < SIZE - 1) {
            const y1 = C[maxpos - 1], y2 = C[maxpos], y3 = C[maxpos + 1];
            const a = (y1 + y3 - 2 * y2) / 2;
            const b = (y3 - y1) / 2;
            if (a !== 0) T0 = T0 - b / (2 * a);
        }

        if (T0 === 0) return -1;
        const freq = sampleRate / T0;
        const instrumentRange = INSTRUMENTS[currentInstrumentKey].range;
        return (freq >= instrumentRange[0] && freq <= instrumentRange[1]) ? freq : -1;
    }

    function findClosestTargetNote(pitch, instrument) {
        let closestTarget = { key: null, cents: Infinity };

        if (isAutoAdvanceOn) {
            // In auto-advance, only focus on the current target string
            const targetKey = instrument.tuning[currentTargetStringIndex];
            const targetFreq = ALL_NOTES[targetKey].freq;
            const centsDiff = 1200 * Math.log2(pitch / targetFreq);
            closestTarget = { key: targetKey, cents: centsDiff };
        } else {
            // In manual mode, find the closest of all strings
            instrument.tuning.forEach(noteKey => {
                const targetFreq = ALL_NOTES[noteKey].freq;
                const centsDiff = 1200 * Math.log2(pitch / targetFreq);
                if (Math.abs(centsDiff) < Math.abs(closestTarget.cents)) {
                    closestTarget = { key: noteKey, cents: centsDiff };
                }
            });
        }
        return closestTarget;
    }

    // ===================================================================
    // UI & STATE MANAGEMENT
    // ===================================================================

    function handleTuningLogic(detectedNoteKey, isInTune, cents) {
        clearTimeout(statusUpdateTimer);
    
        if (detectedNoteKey) {
            // Wait a moment to ensure the detected note is stable before updating the message
            statusUpdateTimer = setTimeout(() => {
                if (isInTune) {
                    stableInTuneCounter++;
                    if (stableInTuneCounter >= IN_TUNE_STABILITY_FRAMES) {
                        // --- CORRECTLY TUNED LOGIC ---
                        updateStatusMessage("result-in-tune", detectedNoteKey);
                        if (!stringTunedStatus[detectedNoteKey]) {
                            stringTunedStatus[detectedNoteKey] = true;
                            playInTuneFeedback(detectedNoteKey); // Visual and audio feedback
                            if (isAutoAdvanceOn) {
                                clearTimeout(autoAdvanceTimer);
                                autoAdvanceTimer = setTimeout(advanceToNextString, 500);
                            }
                        }
                    } else {
                        // Note is in the tune zone, but not yet stable
                        updateStatusMessage("stabilizing", detectedNoteKey);
                    }
                } else {
                    // Note is detected, but out of tune
                    stableInTuneCounter = 0;
                    const direction = cents > 0 ? 'Tune Down ↓' : 'Tune Up ↑';
                    updateStatusMessage("result-out-of-tune", detectedNoteKey, direction);
                }
            }, 100); // 100ms delay for stability check
        } else {
            // No valid note detected
            stableInTuneCounter = 0;
            statusUpdateTimer = setTimeout(() => {
                let msg = isAutoAdvanceOn 
                    ? `Tune ${INSTRUMENTS[currentInstrumentKey].tuning[currentTargetStringIndex]}...`
                    : null;
                updateStatusMessage("listening", msg);
            }, 300);
        }
    }
    
    function updateStatusMessage(state, text1 = "", text2 = "") {
        const statusKey = state + text1 + text2;
        if (statusKey === lastStatusKey) return; // Avoid redundant DOM updates
    
        statusDisplay.className = 'status-message'; // Reset classes
        let content = "";
    
        switch(state) {
            case "idle": content = `<span>Tap Start to Tune</span>`; break;
            case "listening": content = `<span>${text1 || 'Listening...'}</span>`; break;
            case "stabilizing": content = `<span>${text1}</span><span>Hold steady...</span>`; break;
            case "result-in-tune":
                content = `<span>${text1}</span><span>In Tune ✓</span>`;
                statusDisplay.classList.add('in-tune');
                break;
            case "result-out-of-tune":
                content = `<span>${text1}</span><span>${text2}</span>`;
                statusDisplay.classList.add(text2.includes('Up') ? 'flat' : 'sharp');
                break;
            case "error":
                content = `<span>${text1}</span>`;
                statusDisplay.classList.add('error');
                break;
        }
        statusDisplay.innerHTML = content;
        lastStatusKey = statusKey;
    }
    
    function resetTunerState() {
        stringTunedStatus = {};
        currentTargetStringIndex = 0;
        stableInTuneCounter = 0;
        centsBuffer.length = 0;
        updateStringIndicators();
        resetUIDisplay();
        if (isListening) {
            updateBandpassFilter();
        }
    }

    function resetUIDisplay() {
        noteNameDisplay.textContent = '--';
        frequencyDisplay.textContent = '-- Hz';
        centsDisplay.textContent = '-- cents';
        meterFrame.classList.remove('flash-green');
        drawMeter(0);
        updateStatusMessage("idle");
    }

    function updateStringIndicators() {
        const instrument = INSTRUMENTS[currentInstrumentKey];
        const tuning = instrument.tuning;
        stringStatusContainer.innerHTML = '';
        tuning.forEach((noteKey, index) => {
            const span = document.createElement('span');
            span.className = 'string-note';
            // Display only the note name (e.g., 'E' from 'E2')
            span.textContent = noteKey.replace(/[0-9]/g, ''); 
            span.dataset.note = noteKey;
            
            if (stringTunedStatus[noteKey]) {
                span.classList.add('tuned');
            }
            if (isAutoAdvanceOn && index === currentTargetStringIndex) {
                span.classList.add('targeted');
            }
            stringStatusContainer.appendChild(span);
        });
    }

    function advanceToNextString() {
        const tuning = INSTRUMENTS[currentInstrumentKey].tuning;
        const allTuned = tuning.every(noteKey => stringTunedStatus[noteKey]);
        if (allTuned) {
            allTunedDialog.showModal();
            return;
        }

        // Find the next untuned string, wrapping around if necessary
        let nextIndex = currentTargetStringIndex;
        for (let i = 0; i < tuning.length; i++) {
            nextIndex = (currentTargetStringIndex + 1 + i) % tuning.length;
            if (!stringTunedStatus[tuning[nextIndex]]) {
                currentTargetStringIndex = nextIndex;
                updateStringIndicators();
                return;
            }
        }
    }

    // ===================================================================
    // EVENT LISTENERS & CONTROLS
    // ===================================================================
    function setupEventListeners() {
        startStopBtn.addEventListener('click', () => isListening ? stopTuning() : startTuning());
        
        instrumentSwitcher.addEventListener('click', () => {
            if (isListening) return;
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = INSTRUMENTS[currentInstrumentKey].name;
            resetTunerState();
        });

        // Toggle buttons
        toggleNoiseFilterBtn.addEventListener('click', () => { 
            isNoiseFilterOn = !isNoiseFilterOn; 
            toggleNoiseFilterBtn.classList.toggle('toggled-on', isNoiseFilterOn); 
        });
        toggleAutoAdvanceBtn.addEventListener('click', () => { 
            isAutoAdvanceOn = !isAutoAdvanceOn; 
            toggleAutoAdvanceBtn.classList.toggle('toggled-on', isAutoAdvanceOn);
            resetTunerState(); // Reset to apply mode change
        });
        toggleWakeLockBtn.addEventListener('click', async () => { 
            isWakeLockEnabled = !isWakeLockEnabled;
            toggleWakeLockBtn.classList.toggle('toggled-on', isWakeLockEnabled);
            if (isListening) {
                isWakeLockEnabled ? await requestWakeLock() : await releaseWakeLock();
            }
        });
        
        // Settings Dialog
        settingsBtn.addEventListener('click', () => settingsDialog.showModal());
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            concertA = parseFloat(concertAInput.value) || 440;
            inTuneThreshold = parseInt(toleranceInput.value) || 5;
            updateNoteFrequencies();
            resetTunerState();
            settingsDialog.close();
        });
        settingsForm.addEventListener('reset', () => settingsDialog.close());

        // "All Tuned" Dialog
        allTunedDialog.addEventListener('close', () => {
            if (allTunedDialog.returnValue === 'yes') {
                stopTuning();
                isAutoAdvanceOn = false;
                toggleAutoAdvanceBtn.classList.remove('toggled-on');
            }
            resetTunerState(); // Reset to allow re-tuning
        });
    }

    // ===================================================================
    // HELPERS & UTILITIES
    // ===================================================================
    function updateNoteFrequencies() {
        for (const noteKey in ALL_NOTES) {
            const noteNumber = getNoteNumber(ALL_NOTES[noteKey].freq, 440); // Get standard number
            ALL_NOTES[noteKey].freq = concertA * Math.pow(2, (noteNumber - 69) / 12);
        }
    }
    
    function updateBandpassFilter() {
        if (!audioContext) return;
        const instrument = INSTRUMENTS[currentInstrumentKey];
        const [low, high] = instrument.range;
        const centerFreq = Math.sqrt(low * high);
        const q = centerFreq / (high - low);
        bandpassFilter.frequency.setTargetAtTime(centerFreq, audioContext.currentTime, 0.01);
        bandpassFilter.Q.setTargetAtTime(q, audioContext.currentTime, 0.01);
    }

    function getNoteNumber(freq, baseA4 = concertA) { return Math.round(12 * Math.log2(freq / baseA4)) + 69; }
    function calculateCents(freq, noteNum) { return Math.floor(1200 * Math.log2(freq / (concertA * Math.pow(2, (noteNum - 69) / 12)))); }

    function playInTuneFeedback(noteKey) {
        // 1. Flash the meter frame green
        meterFrame.classList.add('flash-green');
        meterFrame.addEventListener('animationend', () => meterFrame.classList.remove('flash-green'), { once: true });

        // 2. Update the specific string indicator to be green
        updateStringIndicators();

        // 3. Play a subtle beep sound
        if (!audioContext || audioContext.state !== 'running') return;
        const now = audioContext.currentTime;
        const beepOsc = audioContext.createOscillator();
        const beepGain = audioContext.createGain();
        beepOsc.connect(beepGain).connect(audioContext.destination);
        
        beepOsc.frequency.setValueAtTime(ALL_NOTES[noteKey].freq * 2, now); // Beep one octave higher
        beepGain.gain.setValueAtTime(0, now);
        beepGain.gain.linearRampToValueAtTime(0.2, now + 0.02); // Quick attack
        beepGain.gain.linearRampToValueAtTime(0, now + 0.2);   // Short decay

        beepOsc.start(now);
        beepOsc.stop(now + 0.25);
    }

    // --- Wake Lock API ---
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) { console.error(`Wake Lock Error: ${err.name}, ${err.message}`); }
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) { 
            await wakeLock.release(); 
            wakeLock = null; 
        }
    }
    
    document.addEventListener('visibilitychange', () => {
        if (isWakeLockEnabled && isListening && document.visibilityState === 'visible') {
            requestWakeLock();
        }
    });

    // --- Start the application ---
    init();
});

