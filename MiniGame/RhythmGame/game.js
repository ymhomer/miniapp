
document.addEventListener('DOMContentLoaded', () => {
    // Game variables
    let score = 0;
    let lives = 3;
    let highScore = 0;
    let gameInterval;
    let gameSpeed = 2000; // milliseconds per beat
    let hitTolerance = 100; // milliseconds

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
    const gameOverModal = new bootstrap.Modal(document.getElementById('game-over-modal'));
    const startGameModal = new bootstrap.Modal(document.getElementById('start-game-modal'));
    const modalHighScore = document.getElementById('modal-high-score');
    const modalHighScoreEnd = document.getElementById('modal-high-score-end');

    // Block types
    const BLOCK_TYPES = {
        NORMAL: 'black',
        REVERSE: 'red',
        TRAP: 'orange'
    };

    // Event listeners
    restartButton.addEventListener('click', startGame);
    document.getElementById('start-button').addEventListener('click', startGame);
    document.addEventListener('keydown', handleKeyPress);
    leftHit.addEventListener('click', () => handleHit('left'));
    rightHit.addEventListener('click', () => handleHit('right'));

    updateHighScore();
    startGameModal.show();

    function updateHighScore() {
        highScore = localStorage.getItem('highScore') || 0;
        highScoreElement.textContent = highScore;
        modalHighScore.textContent = highScore;
        modalHighScoreEnd.textContent = highScore;
    }

    function startGame() {
        // Reset game state
        score = 0;
        lives = 3;
        updateDisplay();
        startGameModal.hide();

        // Start spawning blocks
        gameInterval = setInterval(spawnBlock, gameSpeed);
    }

    function spawnBlock() {
        const lane = Math.random() < 0.5 ? leftLane : rightLane;
        const blockType = getRandomBlockType();
        const block = createBlock(blockType);
        lane.appendChild(block);
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

    function animateBlock(block) {
        console.log(`Animating block. Type: ${block.dataset.type}`);
        const animation = block.animate([
            { top: '-50px' },
            { top: '600px' }
        ], {
            duration: 3000,
            easing: 'linear'
        });

        animation.onfinish = () => {
            console.log(`Block animation finished. Type: ${block.dataset.type}`);
            if (block.parentNode) { // 检查方块是否还在 DOM 中
                if (block.dataset.type !== BLOCK_TYPES.TRAP && block.dataset.hit !== 'true') {
                    console.log('Non-trap block missed. Deducting life.');
                    missBlock();
                } else if (block.dataset.type === BLOCK_TYPES.TRAP) {
                    console.log('Trap block passed without interaction.');
                } else {
                    console.log('Block was already hit, no action needed.');
                }
                block.remove();
            } else {
                console.log('Block was already removed, no action needed.');
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
        console.log(`Handling hit on ${side} side`);
        const lane = side === 'left' ? leftLane : rightLane;
        const oppositeLane = side === 'left' ? rightLane : leftLane;
        const blocks = lane.querySelectorAll('.block');
        const oppositeBlocks = oppositeLane.querySelectorAll('.block');
        const hitBlock = Array.from(blocks).find(block => isInHitArea(block, side));
        const oppositeHitBlock = Array.from(oppositeBlocks).find(block => isInHitArea(block, side));

        console.log(`Blocks in hit area: ${hitBlock ? 'Yes' : 'No'}`);
        console.log(`Opposite blocks in hit area: ${oppositeHitBlock ? 'Yes' : 'No'}`);

        if (hitBlock) {
            console.log(`Hit block found in same lane. Type: ${hitBlock.dataset.type}`);
            handleBlockHit(hitBlock, side, false);
        } else if (oppositeHitBlock && oppositeHitBlock.dataset.type === BLOCK_TYPES.REVERSE) {
            console.log(`Hit block found in opposite lane. Type: ${oppositeHitBlock.dataset.type}`);
            handleBlockHit(oppositeHitBlock, side, true);
        } else {
            console.log('No valid hit block found. Missing.');
            missBlock();
            playHitEffect(side, 'error');
        }

        updateDisplay();
        checkGameOver();
    }

    function handleBlockHit(block, side, isOpposite) {
        const blockType = block.dataset.type;
        console.log(`Handling block hit. Type: ${blockType}, Side: ${side}, IsOpposite: ${isOpposite}`);

        switch (blockType) {
            case BLOCK_TYPES.NORMAL:
                if (!isOpposite) {
                    console.log('Correct hit on normal block');
                    score++;
                    block.dataset.hit = 'true';
                    block.remove(); // 只在成功击中时移除
                    playHitEffect(side, 'success');
                } else {
                    console.log('Incorrect hit on normal block');
                    missBlock();
                    playHitEffect(side, 'error');
                }
                break;
            case BLOCK_TYPES.REVERSE:
                if (isOpposite) {
                    console.log('Correct hit on reverse block');
                    score += 2;
                    block.dataset.hit = 'true';
                    block.remove(); // 只在成功击中时移除
                    playHitEffect(side, 'success');
                } else {
                    console.log('Incorrect hit on reverse block');
                    missBlock();
                    playHitEffect(side, 'error');
                }
                break;
            case BLOCK_TYPES.TRAP:
                console.log('Hit on trap block');
                missBlock();
                playHitEffect(side, 'error');
                break;
        }
        console.log(`After hit - Score: ${score}, Lives: ${lives}`);
    }

    function missBlock() {
        console.log('Missing block. Deducting life.');
        lives--;
        updateDisplay(); // 确保这里调用了 updateDisplay
        console.log(`Lives remaining: ${lives}`);
        checkGameOver(); // 检查是否游戏结束
    }

    function isInHitArea(block, side) {
        const rect = block.getBoundingClientRect();
        const hitAreaRect = (side === 'left' ? leftHit : rightHit).getBoundingClientRect();
        return Math.abs(rect.bottom - hitAreaRect.top) < hitTolerance;
    }

    function playHitEffect(side, type) {
        const hitArea = side === 'left' ? leftHit : rightHit;
        hitArea.style.backgroundColor = type === 'success' ? 'rgba(0,255,0,0.5)' : 'rgba(255,0,0,0.5)';
        setTimeout(() => {
            hitArea.style.backgroundColor = 'rgba(0,0,0,0.1)';
        }, 100);
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
            document.getElementById('final-score').textContent = score;
            updateHighScore();
            gameOverModal.show();
        }
    }
});

