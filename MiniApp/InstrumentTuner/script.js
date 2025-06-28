document.addEventListener('DOMContentLoaded', () => {
    // DOM Element references
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
    const allTunedYesBtn = document.getElementById('all-tuned-yes');
    const allTunedNoBtn = document.getElementById('all-tuned-no');
    
    // Audio processing variables
    // --- FIX: Removed beepOsc and beepGain from global scope. They will be created on demand.
    let audioContext, analyser, mediaStreamSource, stream, buf, rafId, bandpassFilter;

    // App state
    let isListening = false;
    let A4 = 440;
    let IN_TUNE_THRESHOLD_CENTS = 5;
    const NOTE_STRINGS = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const MAX_POINTER_ROTATION = 80;
    const POINTER_SENSITIVITY_CENTS = 30;
    const RMS_THRESHOLD = 0.01;
    const IN_TUNE_STABILITY_FRAMES = 5;

    const instruments = {
        guitar: { name: "Guitar", notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], frequencies: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }, range: [80, 1000] },
        ukulele: { name: "Ukulele", notes: ['G4', 'C4', 'E4', 'A4'], frequencies: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }, range: [250, 800] }
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';

    let stringTunedStatus = {}, stableInTuneCounter = 0;
    const centsBuffer = [];
    const SMOOTHING_BUFFER_SIZE = 5;
    let isNoiseFilterOn = false, isAutoAdvanceOn = false, isWakeLockEnabled = false;
    let wakeLock = null;
    let currentTargetStringIndex = 0;
    let autoAdvanceTimer = null;
    
    let statusUpdateTimer = null;
    let lastStatus = "";

    // App initialization
    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        setupControls();
        updateStringIndicators(); // Initial population of string indicators
        drawMeter(0); // Draw initial meter state
    }

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        drawMeter(0); // Redraw after resize
    }
    
    // --- REVISED: Start/Stop Logic ---
    async function startTuning() {
        if (isListening) return;
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            updateStatusMessage("error", "Browser not supported.");
            return;
        }
        try {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }});
            
            isListening = true;
            startStopBtn.classList.add('listening');
            updateStatusMessage("listening");

            mediaStreamSource = audioContext.createMediaStreamSource(stream);
            bandpassFilter = audioContext.createBiquadFilter();
            bandpassFilter.type = 'bandpass';
            updateBandpassFilter();
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 2048;
            buf = new Float32Array(analyser.fftSize);
            mediaStreamSource.connect(bandpassFilter).connect(analyser);
            
            // --- FIX: Removed the persistent beep oscillator creation. It will now be created on-demand. ---

            if (isWakeLockEnabled) await requestWakeLock();
            if (!rafId) updateTuner();

        } catch (err) {
            console.error(err);
            updateStatusMessage("error", "Mic access denied.");
        }
    }

    function stopTuning() {
        if (!isListening) return;
        
        if (stream) stream.getTracks().forEach(track => track.stop());
        if (audioContext && audioContext.state !== 'closed') audioContext.close();
        cancelAnimationFrame(rafId);

        // --- FIX: Nullify audio components so they are recreated on next start ---
        rafId = null;
        audioContext = null;

        isListening = false;
        startStopBtn.classList.remove('listening');
        if (isWakeLockEnabled) releaseWakeLock();
        
        resetUIDisplay();
    }

    // Pitch detection algorithm
    function autoCorrelate(buf, sampleRate) {
        const SIZE = buf.length;
        const rms = Math.sqrt(buf.reduce((s, v) => s + v * v, 0) / SIZE);
        if (rms < (isNoiseFilterOn ? 0.025 : RMS_THRESHOLD)) return -1;

        const C = new Float32Array(SIZE).map((_, i) => {
            let sum = 0;
            for (let j = 0; j < SIZE - i; j++) sum += buf[j] * buf[j + i];
            return sum;
        });

        let d = 0; while (d < C.length - 1 && C[d] > C[d + 1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < C.length; i++) {
            if (C[i] > maxval) { maxval = C[i]; maxpos = i; }
        }
        let T0 = maxpos;
        if (maxpos > 0 && maxpos < C.length - 1) {
            const x1 = C[maxpos - 1], x2 = C[maxpos], x3 = C[maxpos + 1];
            const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
            if (a) T0 -= b / (2 * a);
        }
        const freq = sampleRate / T0;
        const instrumentRange = instruments[currentInstrumentKey].range;
        return (freq > instrumentRange[0] && freq < instrumentRange[1]) ? freq : -1;
    }

    function noteFromPitch(f) { return Math.round(12 * Math.log2(f / A4)) + 69; }
    function centsOffFromPitch(f, n) { return Math.floor(1200 * Math.log2(f / (A4 * Math.pow(2, (n - 69) / 12)))); }

    // Setup event listeners for UI controls
    function setupControls() {
        startStopBtn.addEventListener('click', () => isListening ? stopTuning() : startTuning());
        
        instrumentSwitcher.addEventListener('click', () => {
            if (isListening) return;
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            resetTunerState();
        });

        toggleNoiseFilterBtn.addEventListener('click', () => { isNoiseFilterOn = !isNoiseFilterOn; toggleNoiseFilterBtn.classList.toggle('toggled-on', isNoiseFilterOn); });
        toggleAutoAdvanceBtn.addEventListener('click', () => { isAutoAdvanceOn = !isAutoAdvanceOn; toggleAutoAdvanceBtn.classList.toggle('toggled-on', isAutoAdvanceOn); resetTunerState(); });
        toggleWakeLockBtn.addEventListener('click', async () => { 
            isWakeLockEnabled = !isWakeLockEnabled;
            toggleWakeLockBtn.classList.toggle('toggled-on', isWakeLockEnabled);
            if (isListening) {
                isWakeLockEnabled ? await requestWakeLock() : await releaseWakeLock();
            }
        });
        
        settingsBtn.addEventListener('click', () => { settingsDialog.showModal(); });
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            A4 = parseFloat(concertAInput.value) || 440;
            IN_TUNE_THRESHOLD_CENTS = parseInt(toleranceInput.value) || 5;
            resetTunerState();
            settingsDialog.close();
        });
        settingsForm.addEventListener('reset', () => settingsDialog.close());

        allTunedYesBtn.addEventListener('click', () => {
             stopTuning();
             toggleAutoAdvanceBtn.classList.remove('toggled-on');
             isAutoAdvanceOn = false;
        });
        allTunedNoBtn.addEventListener('click', () => {
            resetTunerState(); // Allows for re-tuning
        });
    }

    function resetUIDisplay() {
        noteNameDisplay.textContent = '--';
        frequencyDisplay.textContent = '-- Hz';
        centsDisplay.textContent = '-- cents';
        drawMeter(0);
        updateStatusMessage("idle");
    }

    function resetTunerState() {
        stringTunedStatus = {};
        currentTargetStringIndex = 0;
        updateStringIndicators();
        resetUIDisplay();
    }
    
    function updateBandpassFilter() {
        if (!audioContext) return;
        const instrument = instruments[currentInstrumentKey];
        const [low, high] = instrument.range;
        const centerFreq = Math.sqrt(low * high);
        const q = centerFreq / (high - low);
        bandpassFilter.frequency.setTargetAtTime(centerFreq, audioContext.currentTime, 0.01);
        bandpassFilter.Q.setTargetAtTime(q, audioContext.currentTime, 0.01);
    }
    
    function updateStringIndicators() {
        const instrument = instruments[currentInstrumentKey];
        const notes = instrument.notes;
        stringStatusContainer.innerHTML = '';
        notes.forEach((noteName, index) => {
            const span = document.createElement('span');
            span.className = 'string-note';
            span.textContent = noteName.slice(0,-1);
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) span.classList.add('tuned');
            if (isAutoAdvanceOn && index === currentTargetStringIndex) span.classList.add('targeted');
            stringStatusContainer.appendChild(span);
        });
    }

    function drawMeter(cents) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        const inTuneZoneWidth = width * 0.12;
        ctx.fillStyle = 'rgba(255, 140, 0, 0.2)'; // Flat/Sharp zone color
        ctx.fillRect(0, 0, (width - inTuneZoneWidth) / 2, height);
        ctx.fillRect((width + inTuneZoneWidth) / 2, 0, (width - inTuneZoneWidth) / 2, height);
        ctx.fillStyle = 'rgba(0, 204, 0, 0.25)'; // In-tune zone color
        ctx.fillRect((width - inTuneZoneWidth) / 2, 0, inTuneZoneWidth, height);
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)'; // Center line
        ctx.fillRect(width / 2 - 1, 0, 2, height * 0.35);

        let rotation = (cents / POINTER_SENSITIVITY_CENTS) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        
        ctx.save();
        ctx.translate(width / 2, height);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height * 0.95);
        ctx.strokeStyle = (Math.abs(cents) < IN_TUNE_THRESHOLD_CENTS) ? 'var(--in-tune-color, #00CC00)' : 'var(--pointer-color, #FF4500)';
        ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    }

    // Main update loop
    function updateTuner() {
        if (!isListening) return;
        analyser.getFloatTimeDomainData(buf);
        const pitch = autoCorrelate(buf, audioContext.sampleRate);

        let noteName = '--', currentCents = 0, detectedTargetNote = null;
        const pitchDetected = pitch !== -1;
        
        if (pitchDetected) {
            const instrument = instruments[currentInstrumentKey];
            let closestTarget = null;

            if (isAutoAdvanceOn) {
                const targetNoteName = instrument.notes[currentTargetStringIndex];
                const targetFreq = instrument.frequencies[targetNoteName];
                // Check if the detected pitch is reasonably close to the target string (e.g., within ~1.5 semitones)
                if (Math.abs(pitch - targetFreq) < targetFreq * 0.12) {
                    closestTarget = targetNoteName;
                }
            } else {
                let minDiff = Infinity;
                for (const target in instrument.frequencies) {
                    const diff = Math.abs(pitch - instrument.frequencies[target]);
                    if (diff < minDiff) { minDiff = diff; closestTarget = target; }
                }
            }
            
            // Check if the closest note is within 50 cents to be considered the target
            if (closestTarget && Math.abs(1200 * Math.log2(pitch / instrument.frequencies[closestTarget])) < 50) {
                detectedTargetNote = closestTarget;
                const noteNumber = noteFromPitch(instrument.frequencies[closestTarget]);
                currentCents = centsOffFromPitch(pitch, noteNumber);
                noteName = detectedTargetNote;
            }
        }
        
        centsBuffer.push(currentCents);
        if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) centsBuffer.shift();
        const smoothedCents = pitchDetected ? centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length : 0;
        
        drawMeter(smoothedCents);
        frequencyDisplay.textContent = `${pitchDetected ? pitch.toFixed(1) : '--'} Hz`;
        centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
        noteNameDisplay.textContent = noteName;
        
        const isInTune = Math.abs(smoothedCents) < IN_TUNE_THRESHOLD_CENTS;
        handleTuningLogic(detectedTargetNote, isInTune, smoothedCents);
        
        rafId = requestAnimationFrame(updateTuner);
    }

    function updateStatusMessage(state, text1 = "", text2 = "") {
        let newStatus = state + text1 + text2;
        if (newStatus === lastStatus) return; // Avoid unnecessary DOM updates
        
        statusDisplay.className = 'status-message';
        let content = "";

        switch(state) {
            case "idle": content = `<span>Tap Start to Tune</span>`; break;
            case "listening": content = `<span>${text1 || 'Listening...'}</span>`; break;
            case "stabilizing": content = `<span>${text1}</span><span>Hold steady...</span>`; break;
            case "result":
                content = `<span>${text1}</span>`;
                if(text2) content += `<span>${text2}</span>`;
                statusDisplay.classList.add(text2.includes('Up') ? 'flat' : text2.includes('Down') ? 'sharp' : 'in-tune');
                break;
            case "error":
                content = `<span>${text1}</span>`;
                statusDisplay.classList.add('sharp'); // Using 'sharp' style for error
                break;
        }
        statusDisplay.innerHTML = content;
        lastStatus = newStatus;
    }

    // --- REVISED: Tuning logic with improved stability checks ---
    function handleTuningLogic(detectedTargetNote, isInTune, cents) {
        clearTimeout(statusUpdateTimer);

        if (detectedTargetNote) {
            // Give a small delay before updating status to avoid flickering
            statusUpdateTimer = setTimeout(() => {
                if (isInTune) {
                    stableInTuneCounter++;
                    if (stableInTuneCounter >= IN_TUNE_STABILITY_FRAMES) {
                        updateStatusMessage("result", `${detectedTargetNote}`, "In Tune ✓");
                        if (!stringTunedStatus[detectedTargetNote]) {
                            playInTuneBeep();
                            stringTunedStatus[detectedTargetNote] = true;
                            updateStringIndicators();
                            if (isAutoAdvanceOn) {
                                clearTimeout(autoAdvanceTimer);
                                autoAdvanceTimer = setTimeout(advanceToNextString, 500);
                            }
                        }
                    } else {
                        updateStatusMessage("stabilizing", detectedTargetNote);
                    }
                } else {
                    stableInTuneCounter = 0;
                    const directionText = cents > IN_TUNE_THRESHOLD_CENTS ? 'Tune Down ↓' : 'Tune Up ↑';
                    updateStatusMessage("result", `${detectedTargetNote}`, directionText);
                }
            }, 150); // Delay for stability
        } else {
            stableInTuneCounter = 0;
            // Delay before showing "Listening..." to avoid flashing when switching notes
            statusUpdateTimer = setTimeout(() => {
                let msg = isAutoAdvanceOn 
                    ? `Tune ${instruments[currentInstrumentKey].notes[currentTargetStringIndex]}...`
                    : null;
                updateStatusMessage("listening", msg);
            }, 500);
        }
    }

    // --- FIX: On-demand beep sound generation ---
    function playInTuneBeep() {
        if (!audioContext || audioContext.state !== 'running') return;
        
        // Create a new oscillator and gain for each beep to ensure it's clean
        const now = audioContext.currentTime;
        const beepOsc = audioContext.createOscillator();
        const beepGain = audioContext.createGain();

        beepOsc.connect(beepGain);
        beepGain.connect(audioContext.destination);

        // Configure the beep sound
        beepOsc.frequency.setValueAtTime(880, now); // A pleasant A5 note
        beepGain.gain.setValueAtTime(0, now);
        
        // Create a short sound envelope
        beepGain.gain.linearRampToValueAtTime(0.3, now + 0.02); // Quick attack
        beepGain.gain.linearRampToValueAtTime(0, now + 0.2);   // Decay

        // Start and stop the oscillator to play the sound and then clean it up
        beepOsc.start(now);
        beepOsc.stop(now + 0.2);

        // Trigger the visual flash feedback
        meterFrame.classList.add('flash-green');
        meterFrame.addEventListener('animationend', () => meterFrame.classList.remove('flash-green'), { once: true });
    }

    function advanceToNextString() {
        const notes = instruments[currentInstrumentKey].notes;
        const allTuned = notes.every(note => stringTunedStatus[note]);
        if(allTuned) {
            allTunedDialog.showModal();
            return;
        }

        // Find the next untuned string
        for (let i = 1; i <= notes.length; i++) {
            const nextIndex = (currentTargetStringIndex + i) % notes.length;
            if (!stringTunedStatus[notes[nextIndex]]) {
                currentTargetStringIndex = nextIndex;
                updateStringIndicators();
                return;
            }
        }
    }

    // Wake Lock API
    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
            } catch (err) { console.error(`${err.name}, ${err.message}`); }
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) { await wakeLock.release(); wakeLock = null; }
    }
    
    document.addEventListener('visibilitychange', () => {
        if(isWakeLockEnabled && isListening) {
             document.visibilityState === 'visible' ? requestWakeLock() : releaseWakeLock();
        }
    });

    init();
});
