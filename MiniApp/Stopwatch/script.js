let is12HourFormat = true;
let stopwatchRunning = false;
let stopwatchPaused = false;
let stopwatchTime = 0;
let stopwatchInterval;
let stopwatchStartTime;
let wakeLock = null;


const keepAwakeCheckbox = document.getElementById('keep-awake');
const fullscreenCheckbox = document.getElementById('fullscreen');
const brightnessRange = document.getElementById('brightness-range');

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
        stopwatchPaused = false;
        stopwatchTime = 0;
        document.getElementById('stopwatch').innerHTML = `0:00<span class="milliseconds">00</span>`;
    } else if (stopwatchPaused) {
        stopwatchPaused = false;
        stopwatchTime = 0;
        document.getElementById('stopwatch').innerHTML = `0:00<span class="milliseconds">00</span>`;
    } else {
        stopwatchRunning = true;
        startStopwatch();
    }
}

function startStopwatch() {
    stopwatchStartTime = Date.now() - stopwatchTime;
    stopwatchInterval = setInterval(() => {
        stopwatchTime = Date.now() - stopwatchStartTime;
        updateStopwatchDisplay();
    }, 10);
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
    let hours = Math.floor(stopwatchTime / 3600000);
    let minutes = Math.floor((stopwatchTime % 3600000) / 60000);
    let seconds = Math.floor((stopwatchTime % 60000) / 1000);
    let milliseconds = Math.floor((stopwatchTime % 1000) / 10); // 取两位毫秒数

    let timeDisplay = '';

    if (hours > 0) {
        timeDisplay = `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    } else {
        timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    document.getElementById('stopwatch').innerHTML = `${timeDisplay}<span class="milliseconds">${String(milliseconds).padStart(2, '0')}</span>`;
}

function initializeSettings() {
    keepAwakeCheckbox.checked = true;
    requestWakeLock();
    
    if ('wakeLock' in navigator) {
        navigator.wakeLock.request('screen');
    }

    keepAwakeCheckbox.addEventListener('change', function () {
        if (this.checked) {
            requestWakeLock();
        } else {
            releaseWakeLock();
        }
    });

    
    fullscreenCheckbox.addEventListener('change', function () {
        if (this.checked) {
            enterFullscreen();
        } else {
            exitFullscreen();
        }
    });

    brightnessRange.addEventListener('input', function () {
        adjustBrightness(this.value);
    });
    /*
    function enterFullscreen() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }
    }

    function exitFullscreen() {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { // Firefox
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }

    document.getElementById('fullscreen').addEventListener('change', function () {
        if (this.checked) {
            if (document.fullscreenElement) {
                document.exitFullscreen();
            } else {
                document.documentElement.requestFullscreen();
            }
        }
    });*/
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('msfullscreenchange', handleFullscreenChange);
}

function handleFullscreenChange() {
    const isFullscreen = !!document.fullscreenElement || 
                         !!document.mozFullScreenElement || 
                         !!document.webkitFullscreenElement || 
                         !!document.msFullscreenElement;
                         
    fullscreenCheckbox.checked = isFullscreen;
}

async function requestWakeLock() {
    try {
        if ('wakeLock' in navigator && wakeLock === null) {
            wakeLock = await navigator.wakeLock.request('screen');
            wakeLock.addEventListener('release', () => {
                console.log('Wake Lock was released');
                updateKeepAwakeCheckbox(false);
            });
            console.log('Wake Lock is active');
        }
    } catch (err) {
        console.error(`${err.name}, ${err.message}`);
    }
}

function releaseWakeLock() {
    if (wakeLock !== null) {
        wakeLock.release().then(() => {
            wakeLock = null;
            console.log('Wake Lock released manually');
        });
    }
}

function updateKeepAwakeCheckbox(isLocked) {
    const keepAwakeCheckbox = document.getElementById('keep-awake');
    keepAwakeCheckbox.checked = isLocked;
}

function updateKeepAwakeCheckbox(isLocked) {
    const keepAwakeCheckbox = document.getElementById('keep-awake');
    keepAwakeCheckbox.checked = isLocked;
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
}function updateKeepAwakeCheckbox(isLocked) {
    const keepAwakeCheckbox = document.getElementById('keep-awake');
    keepAwakeCheckbox.checked = isLocked;
}

function enterFullscreen() {
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen();
    } else if (elem.mozRequestFullScreen) { // Firefox
        elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
        elem.webkitRequestFullscreen();
    } else if (elem.msRequestFullscreen) { // IE/Edge
        elem.msRequestFullscreen();
    }
}

function exitFullscreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
}

function adjustBrightness(brightness) {
    const brightnessValue = brightness / 100;
    document.body.style.color = `rgba(255, 255, 255, ${brightnessValue})`;
}

function openSettingsDialog() {
    const dialog = document.getElementById('settings-dialog');
    dialog.showModal();
}

setInterval(updateTime, 1000);
updateTime();
initializeSettings();
