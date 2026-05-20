/**
 * 星际拦截 - 抑制控制训练游戏
 * Go/No-Go范式
 */

const GAME_CONFIG = {
    trialDuration: 1500,
    intervalMin: 800,
    intervalMax: 2000,
    goRatio: 0.7,
    correctScore: 10,
    streakBonus: 3,
    errorPenalty: 15,
    phaseLength: 15,
    totalPhases: 5
};

let gameState = {
    isRunning: false,
    isPaused: false,
    phase: 1,
    score: 0,
    combo: 0,
    maxCombo: 0,
    correct: 0,
    incorrect: 0,
    miss: 0,
    total: 0,
    currentSignal: null,
    timeoutId: null,
    intervalId: null,
    phaseCorrect: 0,
    phaseTotal: 0,
    isGoSignal: false
};

function startGame() {
    document.querySelector('.game-instructions').classList.add('hidden');
    document.getElementById('game-area').classList.remove('hidden');
    document.getElementById('result-area').classList.add('hidden');

    resetGameState();
    gameState.isRunning = true;

    updateDisplay();
    showSignal();
}

function resetGameState() {
    gameState = {
        isRunning: false,
        isPaused: false,
        phase: 1,
        score: 0,
        combo: 0,
        maxCombo: 0,
        correct: 0,
        incorrect: 0,
        miss: 0,
        total: 0,
        currentSignal: null,
        phaseCorrect: 0,
        phaseTotal: 0
    };
    updateDisplay();
    setRuleDisplay();
    hidePauseOverlay();
}

function showSignal() {
    if (!gameState.isRunning || gameState.isPaused) return;

    const indicator = document.getElementById('go-indicator');
    indicator.className = 'go-indicator waiting';
    indicator.textContent = '⏳';

    const isGo = Math.random() < GAME_CONFIG.goRatio;
    gameState.isGoSignal = isGo;

    const delay = GAME_CONFIG.intervalMin +
        Math.random() * (GAME_CONFIG.intervalMax - GAME_CONFIG.intervalMin);

    gameState.timeoutId = setTimeout(() => {
        if (gameState.isPaused) return;
        
        if (isGo) {
            if (gameState.phase === 1) {
                indicator.className = 'go-indicator go';
                indicator.textContent = '🚀';
                gameState.currentSignal = 'go-green';
            } else if (gameState.phase === 2) {
                indicator.className = 'go-indicator go';
                indicator.textContent = '🚀';
                gameState.currentSignal = 'go-green';
            } else if (gameState.phase === 3) {
                indicator.className = 'go-indicator nogo';
                indicator.textContent = '🚀';
                gameState.currentSignal = 'nogo-red';
            } else {
                indicator.className = 'go-indicator go';
                indicator.textContent = '🚀';
                gameState.currentSignal = 'go-green';
            }
        } else {
            indicator.className = 'go-indicator nogo';
            indicator.textContent = '🛑';
            gameState.currentSignal = 'nogo-red';
        }

        indicator.classList.add('flash');

        gameState.intervalId = setTimeout(() => {
            if (gameState.isRunning && !gameState.isPaused) {
                handleTimeout();
            }
        }, GAME_CONFIG.trialDuration);

    }, delay);
}

function togglePause() {
    if (!gameState.isRunning) return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        clearTimeout(gameState.timeoutId);
        clearTimeout(gameState.intervalId);
        showPauseOverlay();
    } else {
        hidePauseOverlay();
        showSignal();
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
        clearTimeout(gameState.timeoutId);
        clearTimeout(gameState.intervalId);
        goHome();
    }
}

function handleResponse() {
    if (!gameState.isRunning || gameState.isPaused) return;

    clearTimeout(gameState.intervalId);
    gameState.total++;

    const signal = gameState.currentSignal;

    if (signal === 'go-green') {
        addScore(true);
        gameState.correct++;
        gameState.phaseCorrect++;
        gameState.phaseTotal++;
        showFeedback(true, '✓ 正确拦截！');
    } else if (signal === 'nogo-red') {
        addScore(false);
        gameState.incorrect++;
        gameState.phaseTotal++;
        showFeedback(false, '✗ 错误！不应拦截');
    }

    checkPhaseChange();
    updateDisplay();

    setTimeout(() => {
        if (gameState.isRunning && !gameState.isPaused) {
            showSignal();
        }
    }, 1000);
}

function handleTimeout() {
    gameState.total++;
    gameState.phaseTotal++;

    const signal = gameState.currentSignal;

    if (signal === 'go-green') {
        // 应该响应但没有，超时
        addScore(false);
        gameState.miss++;
        showFeedback(false, '✗ 超时！');
    } else if (signal === 'nogo-red') {
        // 正确没有响应
        gameState.correct++;
        gameState.phaseCorrect++;
        addScore(true);
        showFeedback(true, '✓ 保持冷静！');
    }

    checkPhaseChange();
    updateDisplay();

    // 继续下一轮
    setTimeout(() => {
        if (gameState.isRunning) {
            showSignal();
        }
    }, 1000);
}

function addScore(isCorrect) {
    if (isCorrect) {
        gameState.score += GAME_CONFIG.correctScore;
        gameState.combo++;
        gameState.maxCombo = Math.max(gameState.maxCombo, gameState.combo);

        if (gameState.combo > 1) {
            gameState.score += gameState.combo * GAME_CONFIG.streakBonus;
        }
    } else {
        gameState.score = Math.max(0, gameState.score - GAME_CONFIG.errorPenalty);
        gameState.combo = 0;
    }
}

function checkPhaseChange() {
    if (gameState.phaseTotal >= GAME_CONFIG.phaseLength) {
        const accuracy = (gameState.phaseCorrect / gameState.phaseTotal) * 100;

        if (accuracy >= 70 && gameState.phase < GAME_CONFIG.totalPhases) {
            gameState.phase++;
            gameState.phaseCorrect = 0;
            gameState.phaseTotal = 0;
            setRuleDisplay();
            showPhaseChange();
        } else if (accuracy < 50 && gameState.phase > 1) {
            gameState.phase--;
            gameState.phaseCorrect = 0;
            gameState.phaseTotal = 0;
            setRuleDisplay();
            showPhaseChange();
        }
    }
}

function setRuleDisplay() {
    const rules = [
        '绿色时拦截',
        '红色时拦截',
        '蓝色时拦截',
        '注意规则反转！',
        '保持最高专注！'
    ];
    document.getElementById('current-rule').textContent = rules[gameState.phase - 1] || rules[0];
}

function showPhaseChange() {
    showFeedback(true, `🎉 进入第${gameState.phase}阶段！`);
}

function showFeedback(isCorrect, message) {
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = message;
}

function updateDisplay() {
    document.getElementById('phase').textContent = gameState.phase;
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('combo').textContent = gameState.combo;

    const accuracy = gameState.total > 0
        ? Math.round((gameState.correct / gameState.total) * 100)
        : 0;
    document.getElementById('accuracy').textContent = `${accuracy}%`;
}

function endGame() {
    gameState.isRunning = false;
    clearTimeout(gameState.timeoutId);
    clearTimeout(gameState.intervalId);

    const record = {
        score: gameState.score,
        phase: gameState.phase,
        maxCombo: gameState.maxCombo,
        correct: gameState.correct,
        incorrect: gameState.incorrect,
        miss: gameState.miss,
        total: gameState.total,
        accuracy: gameState.total > 0
            ? Math.round((gameState.correct / gameState.total) * 100)
            : 0
    };

    Storage.saveGameRecord('stop', record);

    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('result-area').classList.remove('hidden');

    document.getElementById('final-score').textContent = record.score;
    document.getElementById('final-phase').textContent = record.phase;
    document.getElementById('final-combo').textContent = record.maxCombo;
    document.getElementById('final-accuracy').textContent = `${record.accuracy}%`;
}

function restartGame() {
    startGame();
}

function goHome() {
    window.location.href = 'index.html';
}

// 事件监听
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && gameState.isRunning && !gameState.isPaused) {
        e.preventDefault();
        handleResponse();
    }
    if (e.key === 'Escape' && gameState.isRunning) {
        e.preventDefault();
        togglePause();
    }
});

document.getElementById('go-indicator')?.addEventListener('click', () => {
    if (gameState.isRunning && !gameState.isPaused) {
        handleResponse();
    }
});
