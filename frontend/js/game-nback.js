/**
 * 时空密码 - 工作记忆训练游戏
 * 双N-Back范式
 */

const GAME_CONFIG = {
    gridSize: 5,
    colors: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#E91E63'],
    gameDuration: 300, // 5分钟
    interval: 2000, // 2秒显示间隔
    correctScore: 10,
    streakBonus: 5,
    speedBonus: 3,
    errorPenalty: 5,
    nBackIncreaseStreak: 5,
    nBackDecreaseErrors: 3
};

let gameState = {
    isRunning: false,
    isPaused: false,
    history: [],
    currentN: 1,
    nStreak: 0,
    nErrors: 0,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    incorrect: 0,
    total: 0,
    timer: null,
    intervalId: null,
    shown: false,
    currentCell: null,
    currentColor: null,
    remainingTime: 300
};

let timer = null;
let scoreManager = null;

function initGame() {
    scoreManager = new ScoreManager({
        onScoreChange: updateScoreDisplay,
        onComboChange: updateComboDisplay
    });
    createGrid();
    resetGameState();
}

function createGrid() {
    const grid = document.getElementById('game-grid');
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${GAME_CONFIG.gridSize}, 1fr)`;

    for (let i = 0; i < GAME_CONFIG.gridSize * GAME_CONFIG.gridSize; i++) {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        grid.appendChild(cell);
    }
}

function resetGameState() {
    gameState = {
        isRunning: false,
        isPaused: false,
        history: [],
        currentN: 1,
        nStreak: 0,
        nErrors: 0,
        score: 0,
        combo: 0,
        maxCombo: 0,
        correct: 0,
        incorrect: 0,
        total: 0,
        timer: null,
        intervalId: null,
        shown: false,
        currentCell: null,
        currentColor: null,
        remainingTime: GAME_CONFIG.gameDuration
    };

    updateNDisplay();
    updateScoreDisplay({ score: 0 });
    updateComboDisplay({ combo: 0 });
    hideFeedback();
    hidePauseOverlay();
}

function startGame() {
    document.querySelector('.game-instructions').classList.add('hidden');
    document.getElementById('game-area').classList.remove('hidden');
    document.getElementById('result-area').classList.add('hidden');

    resetGameState();
    gameState.isRunning = true;

    // 初始化计时器
    timer = new Timer({
        duration: gameState.remainingTime,
        onTick: function(remaining) {
            gameState.remainingTime = remaining;
            updateTimerDisplay(remaining);
        },
        onComplete: endGame
    });

    timer.start();

    // 开始显示序列
    showNextItem();
}

function togglePause() {
    if (!gameState.isRunning) return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        timer.pause();
        clearTimeout(gameState.timeoutId);
        showPauseOverlay();
    } else {
        timer.resume();
        hidePauseOverlay();
        showNextItem();
    }
}

function showPauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
        overlay.classList.remove('hidden');
    }
}

function hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
    }
}

function confirmExit() {
    if (confirm('确定要退出游戏吗？当前进度将不会保存。')) {
        gameState.isRunning = false;
        timer.stop();
        clearTimeout(gameState.timeoutId);
        goHome();
    }
}

function showNextItem() {
    if (!gameState.isRunning || gameState.isPaused) return;

    // 清除当前显示
    clearCurrentDisplay();

    // 生成新的位置和颜色
    const cellIndex = Math.floor(Math.random() * GAME_CONFIG.gridSize * GAME_CONFIG.gridSize);
    const colorIndex = Math.floor(Math.random() * GAME_CONFIG.colors.length);

    // 保存到历史
    gameState.history.push({
        cell: cellIndex,
        color: colorIndex
    });

    // 如果历史太长，移除最早的
    if (gameState.history.length > gameState.currentN + 5) {
        gameState.history.shift();
    }

    // 显示
    gameState.currentCell = cellIndex;
    gameState.currentColor = colorIndex;
    gameState.shown = true;

    const cell = document.querySelector(`[data-index="${cellIndex}"]`);
    cell.classList.add('active', `color-${colorIndex}`);
    cell.textContent = '⭐';

    // 启动响应超时计时器
    gameState.timeoutId = setTimeout(() => {
        if (gameState.shown && gameState.isRunning && !gameState.isPaused) {
            // 超时未响应，视为错误
            handleTimeout();
        }
    }, 2000);
}

function clearCurrentDisplay() {
    const cells = document.querySelectorAll('.grid-cell');
    cells.forEach(cell => {
        cell.className = 'grid-cell';
        cell.textContent = '';
    });
    gameState.shown = false;
    if (gameState.timeoutId) {
        clearTimeout(gameState.timeoutId);
    }
}

function handleCellClick(index) {
    if (!gameState.isRunning || !gameState.shown || gameState.isPaused) return;
}

function handleResponse(type) {
    if (!gameState.isRunning || !gameState.shown || gameState.isPaused) return;

    clearTimeout(gameState.timeoutId);
    gameState.shown = false;
    gameState.total++;

    // 检查是否正确
    const current = gameState.history[gameState.history.length - 1];
    const target = gameState.history[gameState.history.length - 1 - gameState.currentN];

    let positionCorrect = (current.cell === target.cell) === (type === 'position-match');
    let colorCorrect = (current.color === target.color) === (type === 'color-match');

    // 简化：正确响应时加分，错误时扣分
    if (type === 'position-match' || type === 'position-no') {
        if (current.cell === target.cell) {
            if (type === 'position-match') {
                showFeedback(true);
                addScore(true);
                gameState.nStreak++;
                gameState.nErrors = 0;
            } else {
                showFeedback(false);
                addScore(false);
                gameState.nStreak = 0;
                gameState.nErrors++;
            }
        } else {
            if (type === 'position-no') {
                showFeedback(true);
                addScore(true);
                gameState.nStreak++;
                gameState.nErrors = 0;
            } else {
                showFeedback(false);
                addScore(false);
                gameState.nStreak = 0;
                gameState.nErrors++;
            }
        }
    } else {
        if (current.color === target.color) {
            if (type === 'color-match') {
                showFeedback(true);
                addScore(true);
                gameState.nStreak++;
                gameState.nErrors = 0;
            } else {
                showFeedback(false);
                addScore(false);
                gameState.nStreak = 0;
                gameState.nErrors++;
            }
        } else {
            if (type === 'color-no') {
                showFeedback(true);
                addScore(true);
                gameState.nStreak++;
                gameState.nErrors = 0;
            } else {
                showFeedback(false);
                addScore(false);
                gameState.nStreak = 0;
                gameState.nErrors++;
            }
        }
    }

    // 检查是否调整N值
    checkNAdjustment();

    // 继续下一轮
    setTimeout(() => {
        if (gameState.isRunning) {
            showNextItem();
        }
    }, 500);
}

function handleTimeout() {
    gameState.total++;
    gameState.nErrors++;
    gameState.nStreak = 0;
    showFeedback(false, '超时未响应');
    checkNAdjustment();

    setTimeout(() => {
        if (gameState.isRunning) {
            showNextItem();
        }
    }, 500);
}

function addScore(isCorrect) {
    if (isCorrect) {
        let points = GAME_CONFIG.correctScore;
        if (gameState.currentN >= 2) {
            points += gameState.currentN * GAME_CONFIG.streakBonus;
        }
        gameState.score += points;
        gameState.correct++;
        gameState.combo++;
        gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);

        if (gameState.combo >= 5) {
            const comboPoints = (gameState.combo - 4) * GAME_CONFIG.streakBonus;
            gameState.score += comboPoints;
        }
    } else {
        gameState.score = Math.max(0, gameState.score - GAME_CONFIG.errorPenalty);
        gameState.combo = 0;
        gameState.incorrect++;
    }

    updateScoreDisplay({ score: gameState.score });
    updateComboDisplay({ combo: gameState.combo });
}

function checkNAdjustment() {
    if (gameState.nStreak >= GAME_CONFIG.nBackIncreaseStreak && gameState.currentN < 5) {
        gameState.currentN++;
        gameState.nStreak = 0;
        showNChange(true);
    } else if (gameState.nErrors >= GAME_CONFIG.nBackDecreaseErrors && gameState.currentN > 1) {
        gameState.currentN--;
        gameState.nErrors = 0;
        showNChange(false);
    }
    updateNDisplay();
}

function showNChange(increased) {
    const nDisplay = document.getElementById('n-value');
    nDisplay.style.animation = 'none';
    nDisplay.offsetHeight;
    nDisplay.style.animation = 'bounce 0.5s ease';
    nDisplay.style.color = increased ? '#4CAF50' : '#F44336';
    setTimeout(() => {
        nDisplay.style.color = '';
    }, 1000);
}

function showFeedback(isCorrect, message = null) {
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = message || (isCorrect ? '✓ 正确！' : '✗ 错误');
    feedback.classList.add('shake');
    setTimeout(() => feedback.classList.remove('shake'), 300);
}

function hideFeedback() {
    const feedback = document.getElementById('feedback');
    feedback.classList.add('hidden');
}

function updateScoreDisplay(data) {
    document.getElementById('score').textContent = data.score;
}

function updateComboDisplay(data) {
    document.getElementById('combo').textContent = data.combo;
}

function updateNDisplay() {
    document.getElementById('n-value').textContent = gameState.currentN;
}

function updateTimerDisplay(remaining) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    document.getElementById('timer').textContent =
        `${mins}:${secs.toString().padStart(2, '0')}`;
}

function endGame() {
    gameState.isRunning = false;
    clearTimeout(gameState.intervalId);
    clearCurrentDisplay();

    // 保存记录
    const record = {
        score: gameState.score,
        maxN: gameState.currentN,
        maxCombo: gameState.maxCombo,
        correct: gameState.correct,
        incorrect: gameState.incorrect,
        total: gameState.total,
        accuracy: gameState.total > 0
            ? Math.round((gameState.correct / gameState.total) * 100)
            : 0
    };

    Storage.saveGameRecord('nback', record);

    // 显示结果
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('result-area').classList.remove('hidden');

    document.getElementById('final-score').textContent = record.score;
    document.getElementById('final-n').textContent = record.maxN;
    document.getElementById('final-combo').textContent = record.maxCombo;
    document.getElementById('final-accuracy').textContent = `${record.accuracy}%`;
}

function restartGame() {
    startGame();
}

function goHome() {
    window.location.href = 'index.html';
}

// 键盘事件监听
document.addEventListener('keydown', (e) => {
    if (!gameState.isRunning) return;

    switch (e.key) {
        case 'ArrowLeft':
            if (!gameState.isPaused && gameState.shown) {
                e.preventDefault();
                handleResponse('position-match');
            }
            break;
        case 'ArrowRight':
            if (!gameState.isPaused && gameState.shown) {
                e.preventDefault();
                handleResponse('position-no');
            }
            break;
        case 'ArrowUp':
            if (!gameState.isPaused && gameState.shown) {
                e.preventDefault();
                handleResponse('color-match');
            }
            break;
        case 'ArrowDown':
            if (!gameState.isPaused && gameState.shown) {
                e.preventDefault();
                handleResponse('color-no');
            }
            break;
        case 'Escape':
            e.preventDefault();
            togglePause();
            break;
    }
});

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
