let pixelsPerCm;
    let isDragging = false;
    let currentX;
    let startX;

    const ruler = document.getElementById('ruler');
    const marker = document.getElementById('marker');
    const measurementLength = document.getElementById('measurementLength');
    const calibrationCode = document.getElementById('calibrationCode');
    const calibrationCodeDisplay = document.getElementById('calibrationCodeDisplay');
    const codeType = document.getElementById('codeType');

    ruler.addEventListener('mousedown', dragStart);
    ruler.addEventListener('mouseup', dragEnd);
    ruler.addEventListener('mousemove', drag);

    ruler.addEventListener('touchstart', function(e) {
        e.preventDefault();  // 防止触屏滚动等预设行为
        isDragging = true;
        startX = e.touches[0].clientX - marker.offsetLeft;  // 使用第一个触点的位置
        drawTicks();
    });

    ruler.addEventListener('touchmove', function(e) {
        if (!isDragging) return;
        e.preventDefault();  // 防止触屏滚动等预设行为
        currentX = e.touches[0].clientX - startX;
        if (currentX < 0) currentX = 0; // 防止移动到初始位置的更前面
        marker.style.left = currentX + 'px';
        if (pixelsPerCm) {
            measurementLength.innerHTML = (currentX / pixelsPerCm).toFixed(1);
        }
        drawTicks();
    });

    ruler.addEventListener('touchend', function(e) {
        isDragging = false;
    });

    function dragStart(e) {
        isDragging = true;
        startX = e.clientX - marker.offsetLeft;
        drawTicks();
    }

    function dragEnd() {
        isDragging = false;
    }

    function drag(e) {
        if (!isDragging) return;
        e.preventDefault();
        currentX = e.clientX - startX;
        if (currentX < 0) currentX = 0; // 防止移动到初始位置的更前面
        marker.style.left = currentX + 'px';
        if (pixelsPerCm) {
            measurementLength.innerHTML = (currentX / pixelsPerCm).toFixed(1);
        }
        drawTicks();
    }

    function calibrate() {
        let calibrationLength;
        const customLength = document.getElementById('customLength');
        const calibrationItem = document.getElementById('calibrationItem');
        if (customLength && customLength.value !== '') {
            calibrationLength = parseFloat(customLength.value);
            if (isNaN(calibrationLength) || calibrationLength <= 0) {
                alert('请输入有效的长度值!');
                return;
            }
        } else if (calibrationItem) {
            calibrationLength = parseFloat(calibrationItem.value);
        }
        pixelsPerCm = marker.offsetLeft / calibrationLength;
        measurementLength.innerHTML = calibrationLength.toFixed(1);

        // 生成校准码
        const numericCalibrationCodeValue = generateNumericCalibrationCode(pixelsPerCm);
        const base64CalibrationCodeValue = generateBase64CalibrationCode(pixelsPerCm);

        // 更新校准码显示
        document.getElementById('numericCalibrationCode').textContent = `数字校准码: ${numericCalibrationCodeValue}`;
        document.getElementById('base64CalibrationCode').textContent = `Base64校准码: ${base64CalibrationCodeValue}`;

        drawTicks();
    }

    function loadCalibration() {
        pixelsPerCm = 1; // 初始假设1像素 = 1厘米
    }

    function loadCalibrationCode() {
        const enteredCode = calibrationCode.value;
        let pixelsPerCmFromCode;
        if (codeType.value === 'numeric') {
            pixelsPerCmFromCode = decodeNumericCalibrationCode(enteredCode);
        } else {
            pixelsPerCmFromCode = decodeBase64CalibrationCode(enteredCode);
        }
        if (pixelsPerCmFromCode !== null) {
            pixelsPerCm = pixelsPerCmFromCode;
            measurementLength.innerHTML = (marker.offsetLeft / pixelsPerCm).toFixed(1);
            drawTicks();
        } else {
            alert('无效的校准码!');
        }
    }

    function generateNumericCalibrationCode(pixelsPerCm) {
        return Math.round(pixelsPerCm * 1000000);
    }

    function decodeNumericCalibrationCode(code) {
        const decoded = parseInt(code) / 1000000;
        if (!isNaN(decoded)) {
            return decoded;
        } else {
            return null;
        }
    }

    function generateBase64CalibrationCode(pixelsPerCm) {
        const encoded = encodeFloat(pixelsPerCm);
        return encoded;
    }

    function decodeBase64CalibrationCode(encoded) {
        const decoded = atob(encoded);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        return new Float64Array(bytes.buffer)[0];
    }

    function encodeFloat(float) {
        const bits = new Uint8Array(new Float64Array([float]).buffer);
        let encoded = '';
        for (let i = 0; i < bits.length; i++) {
            encoded += String.fromCharCode(bits[i]);
        }
        return btoa(encoded);
    }

    function decodeFloat(encoded) {
        const decoded = atob(encoded);
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        return new Float64Array(bytes.buffer)[0];
    }

    function drawTicks() {
        const rulerWidth = ruler.offsetWidth;
        const tickContainer = document.createElement('div');
        tickContainer.style.position = 'absolute';
        tickContainer.style.top = '0';
        tickContainer.style.left = '0';
        tickContainer.style.width = `${rulerWidth}px`;
        tickContainer.style.height = '50px';
        ruler.appendChild(tickContainer);

        const numTicks = Math.floor(rulerWidth / pixelsPerCm) + 1;
        for (let i = 0; i <= numTicks; i++) {
            const tick = document.createElement('div');
            tick.className = 'tick';
            if (i % 10 === 0) {
                tick.classList.add('major');
                const label = document.createElement('div');
                label.className = 'tick-label';
                label.textContent = `${i} cm`;
                label.style.left = `${i * pixelsPerCm - 5}px`;
                tickContainer.appendChild(label);
            }
            tick.style.left = `${i * pixelsPerCm}px`;
            tickContainer.appendChild(tick);
        }

        const existingTicks = ruler.querySelectorAll('.tick, .tick-label');
        existingTicks.forEach(tick => tick.remove());
    }

    const calibrationItem = document.getElementById('calibrationItem');
    calibrationItem.addEventListener('change', function() {
        if (this.value === 'custom') {
            customLength.style.display = 'inline-block';
        } else {
            customLength.style.display = 'none';
        }
    });

    codeType.addEventListener('change', function() {
        if (this.value === 'numeric') {
            calibrationCode.type = 'text';
            calibrationCode.pattern = '\\d+';
        } else {
            calibrationCode.type = 'text';
            calibrationCode.pattern = '[A-Za-z0-9+/=]+';
        }
        calibrationCode.value = '';
    });

    document.getElementById('numericCalibrationCode').addEventListener('click', function() {
        navigator.clipboard.writeText(this.textContent.replace('数字校准码: ', '')).then(() => {
            alert('数字校准码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    });

    document.getElementById('base64CalibrationCode').addEventListener('click', function() {
        navigator.clipboard.writeText(this.textContent.replace('Base64校准码: ', '')).then(() => {
            alert('Base64校准码已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    });

    calibrationItem.addEventListener('change', function() {
        console.log('Selected item:', this.value); // 输出选择的值看是否正确
        if (this.value === 'custom') {
            console.log('Displaying custom length input'); // 确认逻辑分支被执行
            customLengthContainer.style.display = 'block';
        } else {
            console.log('Hiding custom length input'); // 确认逻辑分支被执行
            customLengthContainer.style.display = 'none';
        }
    });

    document.addEventListener('DOMContentLoaded', function() {
        const calibrationItem = document.getElementById('calibrationItem');
        const customLengthContainer = document.getElementById('customLengthContainer');

        calibrationItem.addEventListener('change', function() {
            if (this.value === 'custom') {
                customLengthContainer.style.display = 'block'; // 确保此处为block
            } else {
                customLengthContainer.style.display = 'none';
            }
        });
    });