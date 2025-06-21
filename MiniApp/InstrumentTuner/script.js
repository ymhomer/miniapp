document.addEventListener('DOMContentLoaded', () => {
    // --- DOM 元素 ---
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

    // --- 音訊設定 ---
    let audioContext, analyser, mediaStreamSource, buf, rafId, beepOsc, beepGain, bandpassFilter;

    // --- 調音常數 ---
    const A4 = 440;
    const noteStrings = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
    const IN_TUNE_THRESHOLD_CENTS = 5;
    const MAX_POINTER_ROTATION = 80;
    const POINTER_SENSITIVITY_CENTS = 30; // 靈敏度設定：±30音分即可擺動到最大角度
    const DEFAULT_RMS_THRESHOLD = 0.01;
    const FILTERED_RMS_THRESHOLD = 0.025;
    const IN_TUNE_STABILITY_FRAMES = 5;

    // --- 樂器定義 ---
    const instruments = {
        guitar: { name: "Guitar", notes: ['E4', 'B3', 'G3', 'D3', 'A2', 'E2'], frequencies: { 'E2': 82.41, 'A2': 110.00, 'D3': 146.83, 'G3': 196.00, 'B3': 246.94, 'E4': 329.63 }, range: [80, 1000] },
        ukulele: { name: "Ukulele", notes: ['A4', 'E4', 'C4', 'G4'], frequencies: { 'G4': 392.00, 'C4': 261.63, 'E4': 329.63, 'A4': 440.00 }, range: [250, 800] }
    };
    const instrumentOrder = ['guitar', 'ukulele'];
    let currentInstrumentKey = 'guitar';

    // --- 狀態變數 ---
    let stringTunedStatus = {}, stringStableCounters = {}, stableInTuneCounter = 0;
    const centsBuffer = [], pointerHistory = []; // 用於歷史軌跡
    const SMOOTHING_BUFFER_SIZE = 5;
    let isNoiseFilterOn = false, isAutoAdvanceOn = false, isWakeLockEnabled = false;
    let stablePitchCounter = 0, PITCH_STABILITY_THRESHOLD = 2, lastDetectedPitch = -1;
    let wakeLock = null;
    let currentTargetStringIndex = 0; // 用於自動跳轉
    let autoAdvanceTimer = null;

    // ==========================================================================
    // 初始化
    // ==========================================================================
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
                
                // 1. 音訊來源
                mediaStreamSource = audioContext.createMediaStreamSource(stream);

                // 2. 帶通濾波器 (核心準確性升級)
                bandpassFilter = audioContext.createBiquadFilter();
                bandpassFilter.type = 'bandpass';
                updateBandpassFilter(); // 根據預設樂器設定濾波器

                // 3. 分析器
                analyser = audioContext.createAnalyser();
                analyser.fftSize = 2048;
                buf = new Float32Array(analyser.fftSize);
                analyser.smoothingTimeConstant = 0.1;

                // 4. 連接音訊圖： Source -> Filter -> Analyser
                mediaStreamSource.connect(bandpassFilter);
                bandpassFilter.connect(analyser);

                // 設定提示音
                beepGain = audioContext.createGain();
                beepGain.gain.setValueAtTime(0, audioContext.currentTime);
                beepGain.connect(audioContext.destination);
                beepOsc = audioContext.createOscillator();
                beepOsc.type = 'sine';
                beepOsc.frequency.setValueAtTime(880, audioContext.currentTime);
                beepOsc.connect(beepGain);
                try { beepOsc.start(); } catch (e) {}
                
                statusDisplay.textContent = "Microphone active";
                setupControls();
                updateStringIndicators();

                if (audioContext.state === 'suspended') audioContext.resume();
                if (!rafId) updateTuner();
            })
            .catch(err => {
                statusDisplay.textContent = "Error: Microphone access denied.";
                console.error("Mic access error:", err);
            });
    }

    // ==========================================================================
    // 核心演算法與計算
    // ==========================================================================
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

    // ==========================================================================
    // 控制與 UI 設定
    // ==========================================================================
    function setupControls() {
        instrumentSwitcher.addEventListener('click', () => {
            let currentIndex = instrumentOrder.indexOf(currentInstrumentKey);
            currentInstrumentKey = instrumentOrder[(currentIndex + 1) % instrumentOrder.length];
            instrumentDisplay.textContent = instruments[currentInstrumentKey].name;
            resetTunerState();
            updateBandpassFilter();
        });
        toggleNoiseFilterBtn.addEventListener('click', () => { isNoiseFilterOn = !isNoiseFilterOn; toggleNoiseFilterBtn.classList.toggle('toggled-on', isNoiseFilterOn); });
        toggleAutoAdvanceBtn.addEventListener('click', () => { 
            isAutoAdvanceOn = !isAutoAdvanceOn; 
            toggleAutoAdvanceBtn.classList.toggle('toggled-on', isAutoAdvanceOn);
            // 啟用時，立即更新一次目標指示器
            if(isAutoAdvanceOn) updateStringIndicators(); 
        });
        toggleWakeLockBtn.addEventListener('click', async () => { isWakeLockEnabled = !toggleWakeLockBtn.classList.contains('toggled-on'); isWakeLockEnabled ? await requestWakeLock() : await releaseWakeLock(); });
    }

    function resetTunerState() {
        stringTunedStatus = {}; stringStableCounters = {}; centsBuffer.length = 0; pointerHistory.length = 0;
        currentTargetStringIndex = 0;
        clearTimeout(autoAdvanceTimer);
        updateStringIndicators();
        noteNameDisplay.textContent = '--'; statusDisplay.textContent = 'Play a note...';
    }

    function updateBandpassFilter() {
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
        stringStableCounters = {};
        notes.forEach((noteName, index) => {
            stringStableCounters[noteName] = 0;
            const span = document.createElement('span');
            span.className = 'string-note';
            span.textContent = noteName;
            span.dataset.note = noteName;
            if (stringTunedStatus[noteName]) span.classList.add('tuned');
            // 僅在自動跳轉模式開啟時，才標示當前目標
            if (isAutoAdvanceOn && index === currentTargetStringIndex) span.classList.add('targeted');
            stringStatusContainer.appendChild(span);
        });
    }

    // ==========================================================================
    // Canvas 繪圖 (視覺互動升級)
    // ==========================================================================
    function drawMeter(cents) {
        const dpr = window.devicePixelRatio || 1;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        // 1. 繪製背景參考格
        const inTuneZoneWidth = width * 0.12;
        const flatSharpWidth = (width - inTuneZoneWidth) / 2;
        ctx.fillStyle = 'rgba(255, 140, 0, 0.2)';
        ctx.fillRect(0, 0, flatSharpWidth, height);
        ctx.fillRect(flatSharpWidth + inTuneZoneWidth, 0, flatSharpWidth, height);
        ctx.fillStyle = 'rgba(0, 204, 0, 0.25)';
        ctx.fillRect(flatSharpWidth, 0, inTuneZoneWidth, height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
        ctx.fillRect(width / 2 - 1, 0, 2, height * 0.35);

        // 2. 計算指針角度
        let rotation = (cents / POINTER_SENSITIVITY_CENTS) * MAX_POINTER_ROTATION;
        rotation = Math.max(-MAX_POINTER_ROTATION, Math.min(MAX_POINTER_ROTATION, rotation));
        
        // 3. 更新並繪製歷史軌跡
        pointerHistory.push(rotation);
        if (pointerHistory.length > 15) pointerHistory.shift();
        
        ctx.lineCap = 'round';
        for (let i = 0; i < pointerHistory.length - 1; i++) {
            const rot = pointerHistory[i];
            const alpha = (i / pointerHistory.length) * 0.5;
            ctx.save();
            ctx.translate(width / 2, height);
            ctx.rotate(rot * Math.PI / 180);
            ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height * 0.95);
            ctx.strokeStyle = `rgba(51, 51, 51, ${alpha})`;
            ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
        }
        
        // 4. 繪製主指針
        ctx.save();
        ctx.translate(width / 2, height);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -height * 0.95);
        ctx.strokeStyle = (Math.abs(cents) < IN_TUNE_THRESHOLD_CENTS) ? '#00cc00' : '#333';
        ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
    }

    // ==========================================================================
    // 主更新循環
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
            
            const targetNotes = instruments[currentInstrumentKey].frequencies;
            let minDiff = Infinity, closestTarget = null;
            for (const target in targetNotes) {
                const diff = Math.abs(pitch - targetNotes[target]);
                if (diff < minDiff) { minDiff = diff; closestTarget = target; }
            }
            if (Math.abs(1200 * Math.log2(pitch / targetNotes[closestTarget])) < 50) { detectedTargetNote = closestTarget; }
        }
        
        centsBuffer.push(currentCents);
        if (centsBuffer.length > SMOOTHING_BUFFER_SIZE) centsBuffer.shift();
        const smoothedCents = centsBuffer.reduce((a, b) => a + b, 0) / centsBuffer.length;
        
        drawMeter(smoothedCents);

        frequencyDisplay.textContent = `${pitchDetected ? pitch.toFixed(1) : '--'} Hz`;
        centsDisplay.textContent = `${pitchDetected ? smoothedCents.toFixed(0) : '--'} cents`;
        noteNameDisplay.textContent = noteName;

        Object.keys(stringStableCounters).forEach(note => { if (note !== detectedTargetNote) stringStableCounters[note] = 0; });
        if (detectedTargetNote) {
            stringStableCounters[detectedTargetNote]++;
            statusDisplay.className = 'status-message';
            if (isInTune) {
                stableInTuneCounter++;
                statusDisplay.textContent = `${detectedTargetNote} In Tune ✓`; statusDisplay.classList.add('in-tune');
                
                if (stableInTuneCounter === IN_TUNE_STABILITY_FRAMES) {
                    const now = audioContext.currentTime;
                    beepGain.gain.cancelScheduledValues(now); beepGain.gain.setValueAtTime(0.2, now).linearRampToValueAtTime(0, now + 0.1);
                    meterFrame.classList.add('flash-green');
                    meterFrame.addEventListener('animationend', () => meterFrame.classList.remove('flash-green'), {once: true});
                }
                if (!stringTunedStatus[detectedTargetNote] && stringStableCounters[detectedTargetNote] >= 3) {
                    stringTunedStatus[detectedTargetNote] = true;
                    updateStringIndicators();
                    if (isAutoAdvanceOn) {
                        clearTimeout(autoAdvanceTimer);
                        autoAdvanceTimer = setTimeout(() => advanceToNextString(), 1500);
                    }
                }
            } else {
                stableInTuneCounter = 0; clearTimeout(autoAdvanceTimer);
                statusDisplay.textContent = currentCents > IN_TUNE_THRESHOLD_CENTS ? `${detectedTargetNote} Tune Down ↓` : `${detectedTargetNote} Tune Up ↑`;
                statusDisplay.classList.add(currentCents > 0 ? 'sharp' : 'flat');
            }
        } else {
            stableInTuneCounter = 0; clearTimeout(autoAdvanceTimer);
            statusDisplay.className = 'status-message';
            statusDisplay.textContent = pitchDetected ? "Aim for a string..." : "Play a note...";
        }

        rafId = requestAnimationFrame(updateTuner);
    }
    
    function advanceToNextString() {
        const notes = instruments[currentInstrumentKey].notes;
        const currentTargetNoteName = notes[currentTargetStringIndex];
        
        // 標記當前弦為已調準
        stringTunedStatus[currentTargetNoteName] = true;

        // 尋找下一根未調準的弦
        let nextIndex = (currentTargetStringIndex + 1) % notes.length;
        let allTuned = true;
        for (let i = 0; i < notes.length; i++) {
            if (!stringTunedStatus[notes[i]]) {
                allTuned = false;
            }
            if (i > currentTargetStringIndex && !stringTunedStatus[notes[i]]) {
                nextIndex = i;
                break;
            }
             // 如果繞了一圈回到開頭
            if (i === notes.length - 1) {
                 for(let j=0; j < currentTargetStringIndex; j++){
                     if(!stringTunedStatus[notes[j]]){
                         nextIndex = j;
                         break;
                     }
                 }
            }
        }

        if (allTuned) {
            // 如果全部調完，可以選擇重置或停在最後一根
            console.log("All strings are in tune!");
        }

        currentTargetStringIndex = nextIndex;
        updateStringIndicators();
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
        if (document.hidden) { if (audioContext.state === 'running') audioContext.suspend(); await releaseWakeLock(); } 
        else { if (audioContext.state === 'suspended') audioContext.resume(); if (isWakeLockEnabled) await requestWakeLock(); }
    });

    init();
});

