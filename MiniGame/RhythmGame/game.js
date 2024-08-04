document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    let score = 0;
    let lives = 3;
    let highScore = 0;
    let gameInterval;
    let gameSpeed = 2000;
    const minGameSpeed = 200;
    const speedIncreaseInterval = 2000;
    const speedIncreaseFactor = 0.9791;
    let speedIncreaseTimer;
    let hitTolerance = 50; // milliseconds
    let audioContext;

    // DOM elements
    const leftLane = document.getElementById('left-lane');
    const rightLane = document.getElementById('right-lane');
    const leftHit = document.getElementById('left-hit');
    const rightHit = document.getElementById('right-hit');
    const scoreElement = document.getElementById('score');
    const livesElement = document.getElementById('lives');
    const highScoreElement = document.getElementById('high-score');
    const startButton = document.getElementById('start-button');
    const restartButton = document.getElementById('restart-button');
    const startGameModal = new bootstrap.Modal(document.getElementById('start-game-modal'), {
        backdrop: 'static',
        keyboard: false
    });
    const gameOverModal = new bootstrap.Modal(document.getElementById('game-over-modal'), {
        backdrop: 'static',
        keyboard: false
    });
    const modalHighScore = document.getElementById('modal-high-score');
    const modalHighScoreEnd = document.getElementById('modal-high-score-end');
    const settingsButton = document.getElementById('settings-button');
    const settingsButtonsModal = document.querySelectorAll('#settings-button-modal');
    const settingsModal = new bootstrap.Modal(document.getElementById('settings-modal'), {
        backdrop: 'static',
        keyboard: false
    });
    const gameArea = document.querySelector('.game-area');
    const gameAreaHeightInput = document.getElementById('game-area-height');
    const currentHeight = document.getElementById('current-height');
    const saveSettingsButton = document.getElementById('save-settings');
    const resetHighScoreButton = document.getElementById('reset-high-score');
    const resetDynamicHeightButton = document.getElementById('reset-dynamic-height');

    document.addEventListener('click', initAudio, { once: true });
    document.addEventListener('keydown', initAudio, { once: true });

    settingsButton.addEventListener('click', () => {
        currentHeight.textContent = gameArea.offsetHeight + 'px';
        settingsModal.show();
    });

    settingsButtonsModal.forEach(button => {
        button.addEventListener('click', () => {
            currentHeight.textContent = gameArea.offsetHeight + 'px';
            settingsModal.show();
        });
    });

    saveSettingsButton.addEventListener('click', () => {
        const newHeight = gameAreaHeightInput.value;
        if (newHeight) {
            gameArea.style.height = newHeight + 'px';
        }
        settingsModal.hide();
    });

    resetHighScoreButton.addEventListener('click', () => {
        localStorage.setItem('highScore', 0);
        highScore = 0;
        updateHighScore();
    });

    resetDynamicHeightButton.addEventListener('click', () => {
        gameArea.style.height = 'calc(100vh - 80px)';
        settingsModal.hide();
    });

    // Block types
    const BLOCK_TYPES = {
        NORMAL: 'black',
        REVERSE: 'red',
        TRAP: 'orange'
    };

    // Event listeners
    restartButton.addEventListener('click', startGame);
    startButton.addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyPress);
    leftHit.addEventListener('click', () => handleHit('left'));
    rightHit.addEventListener('click', () => handleHit('right'));
    saveSettingsButton.addEventListener('click', saveSettings);
    resetHighScoreButton.addEventListener('click', resetHighScore);

    updateHighScore();
    startGameModal.show();

    function saveSettings() {
        const newHeight = gameAreaHeightInput.value;
        if (newHeight) {
            gameArea.style.height = `${newHeight}px`;
        }
        bootstrap.Modal.getInstance(document.getElementById('settings-modal')).hide();
    }

    function resetHighScore() {
        highScore = 0;
        localStorage.setItem('highScore', highScore);
        updateHighScore();
    }

    function updateHighScore() {
        highScore = localStorage.getItem('highScore') || 0;
        highScoreElement.textContent = highScore;
        modalHighScore.textContent = highScore;
        modalHighScoreEnd.textContent = highScore;
    }

    function startGame() {
        score = 0;
        lives = 3;
        gameSpeed = 2000;
        updateDisplay();
        startGameModal.hide();
        gameOverModal.hide();

        gameInterval = setInterval(spawnBlock, gameSpeed);
        speedIncreaseTimer = setInterval(increaseSpeed, speedIncreaseInterval);
    }

    function spawnBlock() {
        const lane = Math.random() < 0.5 ? leftLane : rightLane;
        const blockType = getRandomBlockType();
        const block = createBlock(blockType);
        lane.appendChild(block);

        block.style.width = `${lane.offsetWidth}px`;
        animateBlock(block);
    }

    function getRandomBlockType() {
        const rand = Math.random();
        if (rand < 0.7) return BLOCK_TYPES.NORMAL;
        if (rand < 0.9) return BLOCK_TYPES.REVERSE;
        return BLOCK_TYPES.TRAP;
    }

    function createBlock(type) {
        const block = document.createElement('div');
        block.className = 'block';
        block.style.backgroundColor = type;
        block.dataset.type = type;
        return block;
    }

    function increaseSpeed() {
        if (gameSpeed > minGameSpeed) {
            gameSpeed *= speedIncreaseFactor;
            if (gameSpeed < minGameSpeed) {
                gameSpeed = minGameSpeed;
            }
            //console.log(`Speed increased. New interval: ${gameSpeed}ms`);

            clearInterval(gameInterval);
            gameInterval = setInterval(spawnBlock, gameSpeed);
        }
    }

    function initAudio() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    function playSuccessSound() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(660, audioContext.currentTime); // 高音
        oscillator.frequency.exponentialRampToValueAtTime(880, audioContext.currentTime + 0.1); // 上升

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.3);
    }

    function playMissSound() {
        if (!audioContext) return;

        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // 低音
        oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.2); // 下降

        gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + 0.2);
    }

    function animateBlock(block) {
        const gameAreaHeight = document.querySelector('.game-area').offsetHeight;
        //console.log(`Animating block. Type: ${block.dataset.type}`);
        const animation = block.animate([
            { top: '0px' },
            { top: `${gameAreaHeight}px` }
        ], {
            duration: gameSpeed * 1.5,
            easing: 'linear'
        });

        animation.onfinish = () => {
            //console.log(`Block animation finished. Type: ${block.dataset.type}`);
            if (block.parentNode) {
                if (block.dataset.type !== BLOCK_TYPES.TRAP && block.dataset.hit !== 'true') {
                    //console.log('Non-trap block missed. Deducting life.');
                    missBlock();
                } else if (block.dataset.type === BLOCK_TYPES.TRAP) {
                    //console.log('Trap block passed without interaction.');
                } else {
                    //console.log('Block was already hit, no action needed.');
                }
                block.remove();
            } else {
                //console.log('Block was already removed, no action needed.');
            }
        };
    }

    function handleKeyPress(event) {
        if (event.key === 'ArrowLeft') {
            handleHit('left');
        } else if (event.key === 'ArrowRight') {
            handleHit('right');
        }
    }

    function handleHit(side) {
        //console.log(`Handling hit on ${side} side`);
        const lane = side === 'left' ? leftLane : rightLane;
        const oppositeLane = side === 'left' ? rightLane : leftLane;
        const blocks = lane.querySelectorAll('.block');
        const oppositeBlocks = oppositeLane.querySelectorAll('.block');
        const hitBlock = Array.from(blocks).find(block => isInHitArea(block, side));
        const oppositeHitBlock = Array.from(oppositeBlocks).find(block => isInHitArea(block, side));

        //console.log(`Blocks in hit area: ${hitBlock ? 'Yes' : 'No'}`);
        //console.log(`Opposite blocks in hit area: ${oppositeHitBlock ? 'Yes' : 'No'}`);

        let handled = false;

        if (hitBlock) {
            //console.log(`Hit block found in same lane. Type: ${hitBlock.dataset.type}`);
            handleBlockHit(hitBlock, side, false);
            handled = true;
        } else if (oppositeHitBlock && oppositeHitBlock.dataset.type === BLOCK_TYPES.REVERSE) {
            //console.log(`Hit block found in opposite lane. Type: ${oppositeHitBlock.dataset.type}`);
            handleBlockHit(oppositeHitBlock, side, true);
            handled = true;
        }

        if (!handled) {
            //console.log('No valid hit block found. Missing.');
            missBlock();
            playHitEffect(side, 'error');
            playMissSound();
        }

        if (hitBlock) hitBlock.remove();
        if (oppositeHitBlock) oppositeHitBlock.remove();

        updateDisplay();
        checkGameOver();
    }

    function handleBlockHit(block, side, isOpposite) {
        const blockType = block.dataset.type;
        //console.log(`Handling block hit. Type: ${blockType}, Side: ${side}, IsOpposite: ${isOpposite}`);

        switch (blockType) {
            case BLOCK_TYPES.NORMAL:
                if (!isOpposite) {
                    //console.log('Correct hit on normal block');
                    score++;
                    block.dataset.hit = 'true';
                    block.remove();
                    playHitEffect(side, 'success');
                    playSuccessSound();
                } else {
                    //console.log('Incorrect hit on normal block');
                    missBlock();
                    playHitEffect(side, 'error');
                    playMissSound();
                }
                break;
            case BLOCK_TYPES.REVERSE:
                if (isOpposite) {
                    //console.log('Correct hit on reverse block');
                    score += 2;
                    block.dataset.hit = 'true';
                    block.remove();
                    playHitEffect(side, 'success');
                    playSuccessSound();
                } else {
                    //console.log('Incorrect hit on reverse block');
                    missBlock();
                    playHitEffect(side, 'error');
                    playMissSound();
                }
                break;
            case BLOCK_TYPES.TRAP:
                //console.log('Hit on trap block');
                missBlock();
                playHitEffect(side, 'error');
                playMissSound();
                break;
        }
        gameSpeed-=5;
        //console.log(`After hit - Score: ${score}, Lives: ${lives}`);
        //console.log(`Game speed: ${gameSpeed}`);
    }

    function missBlock() {
        //console.log('Missing block. Deducting life.');
        lives--;
        updateDisplay();
        //console.log(`Lives remaining: ${lives}`);
        checkGameOver();
        playMissSound();
    }

    function isInHitArea(block, side) {
        const rect = block.getBoundingClientRect();
        const hitAreaRect = (side === 'left' ? leftHit : rightHit).getBoundingClientRect();
        //return Math.abs(rect.bottom - hitAreaRect.top) < hitTolerance;
        return rect.bottom >= hitAreaRect.top && rect.top <= hitAreaRect.bottom;
    }

    function playHitEffect(side, type) {
        const hitArea = side === 'left' ? leftHit : rightHit;

        hitArea.classList.add('hit-effect');

        if (type === 'success') {
            hitArea.classList.add('success-effect');
        } else {
            hitArea.classList.add('miss-effect');
        }

        setTimeout(() => {
            hitArea.classList.remove('hit-effect', 'success-effect', 'miss-effect');
        }, 500);
    }

    function updateDisplay() {
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            highScoreElement.textContent = highScore;
        }
    }

    function checkGameOver() {
        if (lives <= 0) {
            clearInterval(gameInterval);
            clearInterval(speedIncreaseTimer);
            document.getElementById('final-score').textContent = score;
            document.getElementById('modal-high-score-end').textContent = highScore;
            gameOverModal.show();
        }
    }
});
