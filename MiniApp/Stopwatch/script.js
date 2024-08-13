let is12HourFormat = true;
let stopwatchRunning = false;
let stopwatchPaused = false;
let stopwatchTime = 0;
let stopwatchInterval;

function updateTime() {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();
    let ampm = '';

    if (is12HourFormat) {
        ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
    }

    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
    document.getElementById('am-pm').textContent = ampm;

    const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('date').textContent = now.toLocaleDateString('en-US', dateOptions);
}

function toggleTimeFormat() {
    is12HourFormat = !is12HourFormat;
    updateTime();
}

function toggleStopwatch() {
    if (stopwatchRunning) {
        clearInterval(stopwatchInterval);
        stopwatchRunning = false;
        stopwatchTime = 0;
        document.getElementById('stopwatch').textContent = '0:00';
    } else if (!stopwatchRunning && stopwatchTime > 0) {
        return;
    } else {
        stopwatchRunning = true;
        startStopwatch();
    }
}

function startStopwatch() {
    stopwatchInterval = setInterval(() => {
        stopwatchTime++;
        updateStopwatchDisplay();
    }, 1000);
}

function pauseResumeStopwatch() {
    if (stopwatchRunning) {
        clearInterval(stopwatchInterval);
        stopwatchRunning = false;
        stopwatchPaused = true;
    } else if (stopwatchPaused) {
        startStopwatch();
        stopwatchRunning = true;
        stopwatchPaused = false;
    }
}

function updateStopwatchDisplay() {
    let hours = Math.floor(stopwatchTime / 3600);
    let minutes = Math.floor((stopwatchTime % 3600) / 60);
    let seconds = stopwatchTime % 60;

    if (hours > 0) {
        document.getElementById('stopwatch').textContent = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        document.getElementById('stopwatch').textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }
}

function initializeSettings() {
    const keepAwakeCheckbox = document.getElementById('keep-awake');
    keepAwakeCheckbox.checked = true; // 默认开启屏幕常亮
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen');
    }

    keepAwakeCheckbox.addEventListener('change', function () {
        if (this.checked) {
            if ('wakeLock' in navigator) {
                navigator.wakeLock.request('screen');
            }
        } else {
            if ('wakeLock' in navigator) {
                navigator.wakeLock.release();
            }
        }
    });

    document.getElementById('fullscreen').addEventListener('change', function () {
        if (this.checked) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        }
    });
}

setInterval(updateTime, 1000);
updateTime();
initializeSettings(); // 初始化设置
