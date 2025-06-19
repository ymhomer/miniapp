document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const noteNameDisplay = document.getElementById('meter-note');
    const frequencyDisplay = document.getElementById('meter-hz');
    const centsDisplay = document.getElementById('meter-cents');
    const statusDisplay = document.getElementById('status');
    const stringStatusContainer = document.getElementById('string-status');
    const pointer = document.getElementById('pointer');
    const meterFrame = document.querySelector('.tuner-meter-frame');
    const instrumentSwitcher = document.getElementById('instrument-switcher');
    const instrumentDisplay = document.getElementById('instrument-display');
    const toggleNoiseFilterBtn = document.getElementById('toggle-noise-filter');
    const toggleWakeLockBtn = document.getElementById('toggle-wakelock');

    // --- Audio Setup ---
    let audioContext;
    let analyser;
    let mediaStreamSource;
    let buf;
    let rafId;

    // --- Tuning Constants ---
    const A4 = 440;
    const noteStrings = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const IN_TUNE_THRESHOLD_CENTS = 5;
    const MAX_POINTER_ROTATION = 80;
    const DEFAULT_RMS_THRESHOLD = 0.01;
    const FILTERED_RMS_THRESHOLD = 0.025; // Higher threshold when filter is on

    // --- Instrument Definitions ---
    const instruments = {
        guitar: { name: "Guitar", notes: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }},
        ukulele: { name: "Ukulele", notes: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }}
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';

    // --- State Variables ---
    let stringTunedStatus = {};
    const centsBuffer = [];
    const SMOOTHING_BUFFER_SIZE = 5;
    let frameCount = 0;

    // --- Feature State Variables ---
    let isNoiseFilterOn = false;
    let stablePitchCounter = 0;
    const PITCH_STABILITY_THRESHOLD = 2; // Require 2 consecutive stable frames
    let lastDetectedPitch = -1;
    let wakeLock = null;
    let isWakeLockEnabled = false;

    // ==========================================================================
    // Initialization
    // ==========================================================================
    function initAudio() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             statusDisplay.textContent = "Error: Browser not supported.";
             alert("Error: Your browser does not support the necessary features for microphone input.");
             return;
        }

        statusDisplay.textContent = "Requesting microphone access...";
        navigator.mediaDevices.getUserMedia({ audio: true, video: false })
            .then(stream => {
                audioContext = new (window.AudioContext || window.webkitAudioContext)();
                
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                buf = new Float32Array(analyser.fftSize);
                analyser.smoothingTimeConstant = 0.1;
                mediaStreamSource = audioContext.createMediaStreamSource(stream);
                mediaStreamSource.connect(analyser);
                
                statusDisplay.textContent = "Microphone active";
                setupInstrumentSwitcher();
                setupFeatureToggles();
                updateStringIndicators();

                if (audioContext.state === 'suspended') audioContext.resume();
                if (!rafId) updateTuner();
            })
            .catch(err => {
                console.error("Microphone access error:", err);
                statusDisplay.textContent = "Error: Microphone access denied.";
                alert('Microphone access was denied or unavailable. Please grant permission and refresh.');
            });
    }

    // ==========================================================================
    // Pitch Detection
    // ==========================================================================
    function autoCorrelate(buf, sampleRate, rmsThreshold) {
        const SIZE = buf.length;
        let rms = 0;
        for (let i = 0; i < SIZE; i++) { rms += buf[i] * buf[i]; }
        rms = Math.sqrt(rms / SIZE);
        if (rms < rmsThreshold) return -1;

        let r1 = 0, r2 = SIZE - 1, thres = 0.2;
        for (let i = 0; i < SIZE / 2; i++) if (Math.abs(buf[i]) < thres) { r1 = i; break; }
        for (let i = 1; i < SIZE / 2; i++) if (Math.abs(buf[SIZE - i]) < thres) { r2 = SIZE - i; break; }
        const bufSlice = buf.slice(r1, r2);
        const C = new Float32Array(bufSlice.length);
        for (let i = 0; i < bufSlice.length; i++) { for (let j = 0; j < bufSlice.length - i; j++) { C[i] = C[i] + bufSlice[j] * bufSlice[j + i]; } }
        let d = 0; while (d < C.length - 1 && C[d] > C[d + 1]) { d++; }
        let maxval = -1, maxpos = -1;
        for (let i = d; i < bufSlice.length; i++) { if (C[i] > maxval) { maxval = C[i]; maxpos = i; } }
        let T0 = maxpos;
        if (T0 > 0 && T0 < C.length -1) {
             const x1 = C[T0 - 1], x2 = C[T0], x3 = C[T0 + 1];
             const a = (x1 + x3 - 2 * x2) / 2, b = (x3 - x1) / 2;
             if (a) T0 = T0 - b / (2 * a);
        }
        const freq = sampleRate / T0;
        if (freq > 60 && freq < 1400) return freq;
        return -1;
    }

    function noteFromPitch(frequency) { return Math.round(12 * (Math.log(frequency / A4) / Math.log(2))) + 69; }
    function centsOffFromPitch(frequency, note) { return Math.floor(1200 * Math.log(frequency / (A4 * Math.pow(2, (note - 69) / 12))) / Math.log(2)); }

    // ==========================================================================
    // UI Setup Functions
    // ==========================================================================
    function setupInstrumentSwitcher() {
        instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
        instrumentSwitcher.addEventListener('click', () => {
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            stringTunedStatus = {}; centsBuffer.length = 0;
            updateStringIndicators();
            pointer.style.transform = `translateX(-50%) rotate(0deg)`;
            pointer.classList.remove('in-tune');
            noteNameDisplay.textContent = '--';
            statusDisplay.textContent = 'Play a note...';
        });
    }

    function updateStringIndicators() {
        const targetNotes = instruments[currentInstrumentKey].notes;
        stringStatusContainer.innerHTML = '';
        if (!targetNotes) return;
        for (const noteName in targetNotes) {
            const span = document.createElement('span');
            span.className = 'string-note';
            span.textContent = noteName;
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) span.classList.add('tuned');
            stringStatusContainer.appendChild(span);
        }
    }

    function setupFeatureToggles() {
        // Noise Filter Toggle
        toggleNoiseFilterBtn.addEventListener('click', () => {
            isNoiseFilterOn = !isNoiseFilterOn;
            toggleNoiseFilterBtn.classList.toggle('toggled-on', isNoiseFilterOn);
        });

        // Screen Wake Lock Toggle
        toggleWakeLockBtn.addEventListener('click', async () => {
            isWakeLockEnabled = !toggleWakeLockBtn.classList.contains('toggled-on');
            if (isWakeLockEnabled) {
                await requestWakeLock();
            } else {
                await releaseWakeLock();
            }
        });
    }

    async function requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                wakeLock = await navigator.wakeLock.request('screen');
                toggleWakeLockBtn.classList.add('toggled-on');
                wakeLock.addEventListener('release', () => {
                    isWakeLockEnabled = false;
                    wakeLock = null;
                    toggleWakeLockBtn.classList.remove('toggled-on');
                });
            } catch (err) {
                console.error(`${err.name}, ${err.message}`);
                isWakeLockEnabled = false;
                toggleWakeLockBtn.classList.add('toggled-on');
                setTimeout(() => {
                    toggleWakeLockBtn.classList.remove('toggled-on');
                }, 300);
            }
        } else {
            console.warn("Screen Wake Lock API not supported.");
            isWakeLockEnabled = false;
            toggleWakeLockBtn.classList.add('toggled-on');
            setTimeout(() => {
                toggleWakeLockBtn.classList.remove('toggled-on');
            }, 300);
        }
    }

    async function releaseWakeLock() {
        if (wakeLock) {
            await wakeLock.release();
            wakeLock = null;
        }
        toggleWakeLockBtn.classList.remove('toggled-on');
        isWakeLockEnabled = false;
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
            if (rawPitch !== -1 && (lastDetectedPitch === -1 || Math.abs(rawPitch - lastDetectedPitch) < 15)) {
                stablePitchCounter++;
                lastDetectedPitch = rawPitch;
            } else {
                stablePitchCounter = 0;
                lastDetectedPitch = -1;
            }
            if (stablePitchCounter >= PITCH_STABILITY_THRESHOLD) {
                pitch = lastDetectedPitch;
            }
        } else {
            pitch = rawPitch;
        }

        const pitchDetected = pitch !== -1;
        let noteName = '--';
        let currentCents = 0;

        if (pitchDetected) {
            const note = noteFromPitch(pitch);
            noteName = noteStrings[note % 12];
            currentCents = centsOffFromPitch(pitch, note);
        }
        
        centsBuffer.push(currentCents);
        if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) centsBuffer.shift();
        const smoothedCents = centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length;
        
        const isInTune = pitchDetected && Math.abs(currentCents) < IN_TUNE_THRESHOLD_CENTS;

        // Update Pointer
        let rotation = (smoothedCents / 50) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        pointer.style.transform = `translateX(-50%) rotate(${rotation}deg)`;
        pointer.classList.toggle('in-tune', isInTune);

        // Update Text
        frameCount++;
        if (frameCount % 3 === 0) {
            frequencyDisplay.textContent = `${pitchDetected ? pitch.toFixed(1) : '--'} Hz`;
            centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
            noteNameDisplay.textContent = noteName;
            
            statusDisplay.className = 'status-message';
            if (isInTune) {
                statusDisplay.textContent = 'In Tune ✓';
                statusDisplay.classList.add('in-tune');
            } else if (pitchDetected && currentCents > 0) {
                statusDisplay.textContent = 'Tune Down ↓';
                statusDisplay.classList.add('sharp');
            } else if (pitchDetected && currentCents < 0) {
                statusDisplay.textContent = 'Tune Up ↑';
                statusDisplay.classList.add('flat');
            } else {
                 statusDisplay.textContent = 'Play a note...';
            }
        }
        
        rafId = requestAnimationFrame(updateTuner);
    }

    // ==========================================================================
    // Event Listeners & Startup
    // ==========================================================================
    document.addEventListener('visibilitychange', async () => {
        if (!audioContext) return;
        if (document.hidden) {
            if (audioContext.state === 'running') audioContext.suspend();
            await releaseWakeLock();
        } else {
            if (audioContext.state === 'suspended') audioContext.resume();
            if (isWakeLockEnabled) await requestWakeLock();
        }
    });

    initAudio();
});

