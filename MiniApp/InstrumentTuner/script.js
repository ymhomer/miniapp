document.addEventListener('DOMContentLoaded', () => {
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
    const toggleNoiseFilterBtn = document.getElementById('toggle-noise-filter');
    const toggleAutoAdvanceBtn = document.getElementById('toggle-auto-advance');
    const toggleWakeLockBtn = document.getElementById('toggle-wakelock');
    const settingsBtn = document.getElementById('settings-btn');
    const settingsDialog = document.getElementById('settings-dialog');
    const settingsForm = settingsDialog.querySelector('form');
    const concertAInput = document.getElementById('concert-a');
    const toleranceInput = document.getElementById('tolerance');

    let audioContext, analyser, mediaStreamSource, buf, rafId, beepOsc, beepGain, bandpassFilter;

    let A4 = 440;
    let IN_TUNE_THRESHOLD_CENTS = 5;

    const noteStrings = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const MAX_POINTER_ROTATION = 80;
    const POINTER_SENSITIVITY_CENTS = 30;
    const DEFAULT_RMS_THRESHOLD = 0.01;
    const FILTERED_RMS_THRESHOLD = 0.025;
    const IN_TUNE_STABILITY_FRAMES = 5;

    // --- FIX START: Reversed the note order for conventional display (low to high). ---
    const instruments = {
        guitar: { name: "Guitar", notes: ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'], frequencies: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }, range: [80, 1000] },
        ukulele: { name: "Ukulele", notes: ['G4', 'C4', 'E4', 'A4'], frequencies: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }, range: [250, 800] }
    };
    // --- FIX END ---
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';

    let stringTunedStatus = {}, stringStableCounters = {}, stableInTuneCounter = 0;
    const centsBuffer = [];
    const SMOOTHING_BUFFER_SIZE = 5;
    let isNoiseFilterOn = false, isAutoAdvanceOn = false, isWakeLockEnabled = false;
    let stablePitchCounter = 0, PITCH_STABILITY_THRESHOLD = 2, lastDetectedPitch = -1;
    let wakeLock = null;
    let currentTargetStringIndex = 0;
    let autoAdvanceTimer = null;

    function init() {
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        initAudio();
    }

    function resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
    }

    function initAudio() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            statusDisplay.textContent = "Error: Browser not supported.";
            return;
        }
        statusDisplay.textContent = "Requesting microphone access...";
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                bandpassFilter = audioContext.createBiquadFilter();
                bandpassFilter.type = 'bandpass';
                updateBandpassFilter();
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                buf = new Float32Array(analyser.fftSize);
                mediaStreamSource.connect(bandpassFilter);
                bandpassFilter.connect(analyser);
                beepGain = audioContext.createGain();
                beepGain.gain.setValueAtTime(0, audioContext.currentTime);
                beepGain.connect(audioContext.destination);
                beepOsc = audioContext.createOscillator();
                beepOsc.frequency.setValueAtTime(880, audioContext.currentTime);
                beepOsc.connect(beepGain);
                try { beepOsc.start(); } catch (e) {}
                statusDisplay.textContent = "Microphone active";
                setupControls();
                updateStringIndicators();
                if (audioContext.state === 'suspended') audioContext.resume();
                if (!rafId) updateTuner();
            })
            .catch(err => { console.error(err); statusDisplay.textContent = "Mic access denied."; });
    }

    function autoCorrelate(buf, sampleRate, rmsThreshold) {
        const SIZE = buf.length, rms = Math.sqrt(buf.reduce((s, v) => s + v*v, 0) / SIZE);
        if (rms < rmsThreshold) return -1;
        let r1 = 0, r2 = SIZE - 1;
        for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < 0.2) { r1 = i; break; }
        for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < 0.2) { r2 = SIZE - i; break; }
        const bufSlice = buf.slice(r1, r2);
        const C = new Float32Array(bufSlice.length).map((_, i) => {
            let sum = 0;
            for (let j = 0; j < bufSlice.length - i; j++) sum += bufSlice[j] * bufSlice[j+i];
            return sum;
        });
        let d = 0; while (d < C.length - 1 && C[d] > C[d+1]) d++;
        let maxval = -1, maxpos = -1;
        for (let i = d; i < C.length; i++) if (C[i] > maxval) { maxval = C[i]; maxpos = i; }
        let T0 = maxpos;
        if (T0 > 0 && T0 < C.length -1) {
             const x1 = C[T0-1], x2 = C[T0], x3 = C[T0+1];
             const a = (x1+x3-2*x2)/2, b = (x3-x1)/2;
             if (a) T0 -= b/(2*a);
        }
        const freq = sampleRate/T0;
        return (freq > 60 && freq < 1400) ? freq : -1;
    }

    function noteFromPitch(f) { return Math.round(12 * Math.log2(f / A4)) + 69; }
    function centsOffFromPitch(f, n) { return Math.floor(1200 * Math.log2(f / (A4 * Math.pow(2, (n-69)/12)))); }

    function setupControls() {
        instrumentSwitcher.addEventListener('click', () => {
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            resetTunerState();
            updateBandpassFilter();
        });
        toggleNoiseFilterBtn.addEventListener('click', () => { isNoiseFilterOn = !isNoiseFilterOn; toggleNoiseFilterBtn.classList.toggle('toggled-on', isNoiseFilterOn); });
        toggleAutoAdvanceBtn.addEventListener('click', () => { isAutoAdvanceOn = !isAutoAdvanceOn; toggleAutoAdvanceBtn.classList.toggle('toggled-on', isAutoAdvanceOn); updateStringIndicators(); });
        toggleWakeLockBtn.addEventListener('click', async () => { isWakeLockEnabled = !toggleWakeLockBtn.classList.contains('toggled-on'); isWakeLockEnabled ? await requestWakeLock() : await releaseWakeLock(); });
        
        settingsBtn.addEventListener('click', () => {
            concertAInput.value = A4;
            toleranceInput.value = IN_TUNE_THRESHOLD_CENTS;
            settingsDialog.showModal();
        });
        settingsForm.addEventListener('submit', (e) => {
            e.preventDefault();
            A4 = parseFloat(concertAInput.value) || 440;
            IN_TUNE_THRESHOLD_CENTS = parseInt(toleranceInput.value) || 5;
            settingsDialog.close();
            resetTunerState();
        });
        settingsForm.addEventListener('reset', () => settingsDialog.close());
    }

        function resetTunerState() {
            stringTunedStatus = {}; 
            stringStableCounters = {}; 
            centsBuffer.length = 0; 
            // --- FIX START: Removed line that caused script error because pointerHistory is not defined ---
            // pointerHistory.length = 0; 
            // --- FIX END ---
            currentTargetStringIndex = 0;
            clearTimeout(autoAdvanceTimer);
            updateStringIndicators(); // This function will now be called correctly.
            noteNameDisplay.textContent = '--'; 
            statusDisplay.textContent = 'Play a note...';
        }

    function updateBandpassFilter() {
        const instrument = instruments[currentInstrumentKey];
        const [low, high] = instrument.range;
        const centerFreq = Math.sqrt(low * high);
        const bandwidth = Math.log2(high/low);
        bandpassFilter.frequency.setTargetAtTime(centerFreq, audioContext.currentTime, 0.01);
        bandpassFilter.Q.setTargetAtTime(1 / bandwidth, audioContext.currentTime, 0.01);
    }
    
    function updateStringIndicators() {
        const instrument = instruments[currentInstrumentKey];
        const notes = instrument.notes;
        stringStatusContainer.innerHTML = '';
        stringStableCounters = {};
        notes.forEach((noteName, index) => {
            stringStableCounters[noteName] = 0;
            const span = document.createElement('span');
            span.className = 'string-note';
            span.textContent = noteName;
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) span.classList.add('tuned');
            if (isAutoAdvanceOn && index === currentTargetStringIndex) span.classList.add('targeted');
            stringStatusContainer.appendChild(span);
        });
    }
    
    // ==========================================================================
    // Canvas Drawing
    // ==========================================================================
    function drawMeter(cents) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        const inTuneZoneWidth = width * 0.12;
        const flatSharpWidth = (width - inTuneZoneWidth) / 2;
        ctx.fillStyle = 'rgba(255, 140, 0, 0.2)';
        ctx.fillRect(0, 0, flatSharpWidth, height);
        ctx.fillRect(flatSharpWidth + inTuneZoneWidth, 0, flatSharpWidth, height);
        ctx.fillStyle = 'rgba(0, 204, 0, 0.25)';
        ctx.fillRect(flatSharpWidth, 0, inTuneZoneWidth, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(width / 2 - 1, 0, 2, height * 0.35);

        let rotation = (cents / POINTER_SENSITIVITY_CENTS) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        
        ctx.save();
        ctx.translate(width / 2, height);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height * 0.95);
        ctx.strokeStyle = (Math.abs(cents) < IN_TUNE_THRESHOLD_CENTS) ? '#00cc00' : '#333';
        ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.stroke(); ctx.restore();
    }

    // ==========================================================================
    // Main Update Loop
    // ==========================================================================
    function updateTuner() {
        if (!audioContext || !analyser) { rafId = requestAnimationFrame(updateTuner); return; }

        analyser.getFloatTimeDomainData(buf);
        const currentRmsThreshold = isNoiseFilterOn ? FILTERED_RMS_THRESHOLD : DEFAULT_RMS_THRESHOLD;
        const rawPitch = autoCorrelate(buf, audioContext.sampleRate, currentRmsThreshold);
        let pitch = -1;

        if (isNoiseFilterOn) {
            if (rawPitch !== -1 && (lastDetectedPitch === -1 || Math.abs(rawPitch - lastDetectedPitch) < 15)) { stablePitchCounter++; lastDetectedPitch = rawPitch; } 
            else { stablePitchCounter = 0; lastDetectedPitch = -1; }
            if (stablePitchCounter >= PITCH_STABILITY_THRESHOLD) pitch = lastDetectedPitch;
        } else { pitch = rawPitch; }

        const pitchDetected = pitch !== -1;
        let noteName = '--', currentCents = 0, detectedTargetNote = null, isInTune = false;

        if (pitchDetected) {
            const note = noteFromPitch(pitch);
            noteName = noteStrings[note % 12] + (Math.floor(note / 12) - 1);
            currentCents = centsOffFromPitch(pitch, note);
            isInTune = Math.abs(currentCents) < IN_TUNE_THRESHOLD_CENTS;
            
            let closestTarget = null;
            const instrument = instruments[currentInstrumentKey];

            if (isAutoAdvanceOn) {
                const targetNoteName = instrument.notes[currentTargetStringIndex];
                const targetFreq = instrument.frequencies[targetNoteName];
                if (Math.abs(pitch - targetFreq) < targetFreq * 0.06) {
                    closestTarget = targetNoteName;
                }
            } else {
                let minDiff = Infinity;
                for (const target in instrument.frequencies) {
                    const diff = Math.abs(pitch - instrument.frequencies[target]);
                    if (diff < minDiff) { minDiff = diff; closestTarget = target; }
                }
            }
            
            if (closestTarget && Math.abs(1200 * Math.log2(pitch / instrument.frequencies[closestTarget])) < 50) {
                detectedTargetNote = closestTarget;
            }
        }
        
        centsBuffer.push(currentCents);
        if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) centsBuffer.shift();
        const smoothedCents = centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length;
        
        drawMeter(smoothedCents);

        frequencyDisplay.textContent = `${pitchDetected ? pitch.toFixed(1) : '--'} Hz`;
        centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
        noteNameDisplay.textContent = noteName;

        Object.keys(stringStableCounters).forEach(note => { if (note !== detectedTargetNote) stringStableCounters[note] = 0; });
        
        statusDisplay.className = 'status-message'; // Reset classes
        if (detectedTargetNote) {
            stringStableCounters[detectedTargetNote]++;
            if (isInTune) {
                stableInTuneCounter++;
                statusDisplay.textContent = `${detectedTargetNote} In Tune ✓`; 
                statusDisplay.classList.add('in-tune');

                if (stableInTuneCounter === IN_TUNE_STABILITY_FRAMES) {
                    const now = audioContext.currentTime;
                    beepGain.gain.cancelScheduledValues(now); beepGain.gain.setValueAtTime(0.2, now).linearRampToValueAtTime(0, now + 0.1);
                    meterFrame.classList.add('flash-green');
                    meterFrame.addEventListener('animationend', () => meterFrame.classList.remove('flash-green'), {once: true});
                }
                
                if (!stringTunedStatus[detectedTargetNote] && stringStableCounters[detectedTargetNote] >= IN_TUNE_STABILITY_FRAMES) {
                    stringTunedStatus[detectedTargetNote] = true;
                    if (isAutoAdvanceOn) {
                        clearTimeout(autoAdvanceTimer);
                        autoAdvanceTimer = setTimeout(() => advanceToNextString(), 1500);
                    }
                    updateStringIndicators();
                }
            } else {
                stableInTuneCounter = 0; 
                clearTimeout(autoAdvanceTimer);
                const direction = currentCents > IN_TUNE_THRESHOLD_CENTS ? 'Tune Down ↓' : 'Tune Up ↑';
                statusDisplay.textContent = `${detectedTargetNote} ${direction}`;
                statusDisplay.classList.add(currentCents > 0 ? 'sharp' : 'flat');
            }
        } else {
            stableInTuneCounter = 0; 
            clearTimeout(autoAdvanceTimer);
            statusDisplay.textContent = pitchDetected ? "Aim for a string..." : "Play a note...";
        }

        rafId = requestAnimationFrame(updateTuner);
    }

    function advanceToNextString() {
        const notes = instruments[currentInstrumentKey].notes;
        const allNotesCount = notes.length;
        
        for (let i = 1; i <= allNotesCount; i++) {
            const nextIndex = (currentTargetStringIndex + i) % allNotesCount;
            const nextNoteName = notes[nextIndex];
            if (!stringTunedStatus[nextNoteName]) {
                currentTargetStringIndex = nextIndex;
                updateStringIndicators();
                return;
            }
        }
        
        console.log("All strings are in tune!");
        statusDisplay.textContent = "All strings are in tune!";
    }

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                toggleWakeLockBtn.classList.add('toggled-on');
                wakeLock.addEventListener('release', () => { isWakeLockEnabled = false; wakeLock = null; toggleWakeLockBtn.classList.remove('toggled-on'); });
            } catch (err) {
                isWakeLockEnabled = false; toggleWakeLockBtn.classList.add('toggled-on');
                setTimeout(() => toggleWakeLockBtn.classList.remove('toggled-on'), 300);
            }
        } else {
            isWakeLockEnabled = false; toggleWakeLockBtn.classList.add('toggled-on');
            setTimeout(() => toggleWakeLockBtn.classList.remove('toggled-on'), 300);
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) { await wakeLock.release(); wakeLock = null; }
        toggleWakeLockBtn.classList.remove('toggled-on'); isWakeLockEnabled = false;
    }
    
    document.addEventListener('visibilitychange', async () => {
        if (!audioContext) return;
        if (document.hidden) { 
            if (audioContext.state === 'running') audioContext.suspend(); 
            if (isWakeLockEnabled) await releaseWakeLock(); 
        } else { 
            if (audioContext.state === 'suspended') audioContext.resume(); 
            if (isWakeLockEnabled) await requestWakeLock(); 
        }
    });

    init();
});
