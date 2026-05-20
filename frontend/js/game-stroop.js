/**
 * 专注力星球 - 色彩Stroop游戏
 * 抑制控制与认知灵活性训练
 */

const COLORS = {
    red: { name: '红', hex: '#e74c3c' },
    blue: { name: '蓝', hex: '#3498db' },
    green: { name: '绿', hex: '#27ae60' },
    yellow: { name: '黄', hex: '#f39c12' }
};

const WORDS = ['红', '蓝', '绿', '黄'];

let gameState = {
    level: 1,
    totalTrials: 20,
    currentTrial: 0,
    currentWord: null,
    currentColor: null,
    startTime: null,
    trialStartTime: null,
    timerInterval: null,
    isPlaying: false,
    isPaused: false,
    sessionId: null,
    correctCount: 0,
    wrongCount: 0,
    records: []
};

function selectLevel(level) {
    gameState.level = level;
    gameState.totalTrials = level * 10;

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
}

function generateTrial() {
    const wordKeys = Object.keys(COLORS);
    let word, color;

    do {
        word = WORDS[Math.floor(Math.random() * WORDS.length)];
        color = wordKeys[Math.floor(Math.random() * wordKeys.length)];
    } while (COLORS[color].name === word && Math.random() > 0.3);

    return { word, color };
}

function displayTrial() {
    const trial = generateTrial();
    gameState.currentWord = trial.word;
    gameState.currentColor = trial.color;
    gameState.trialStartTime = Date.now();

    const stimulus = document.getElementById('stimulus');
    stimulus.textContent = trial.word;
    stimulus.style.color = COLORS[trial.color].hex;
}

async function handleResponse(response) {
    if (!gameState.isPlaying || gameState.isPaused) return;

    const reactionTime = Date.now() - gameState.trialStartTime;
    const isCorrect = response === gameState.currentColor;

    if (isCorrect) {
        gameState.correctCount++;
        showFeedback('✓', '#27ae60');
    } else {
        gameState.wrongCount++;
        showFeedback('✗', '#e74c3c');
    }

    // 记录操作
    if (gameState.sessionId) {
        try {
            await fetch(`/api/games/${gameState.sessionId}/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    trial_number: gameState.currentTrial + 1,
                    stimulus: { word: gameState.currentWord, color: gameState.currentColor },
                    response: response,
                    is_correct: isCorrect,
                    reaction_time: reactionTime
                })
            });
        } catch (e) {
            console.log('记录已本地保存');
        }
    }

    gameState.currentTrial++;
    document.getElementById('currentQuestion').textContent = gameState.currentTrial + 1;
    document.getElementById('correctCount').textContent = gameState.correctCount;

    const progress = (gameState.currentTrial / gameState.totalTrials) * 100;
    document.getElementById('progressFill').style.width = `${progress}%`;

    if (gameState.currentTrial >= gameState.totalTrials) {
        endGame();
    } else {
        setTimeout(() => displayTrial(), 300);
    }
}

function showFeedback(text, color) {
    const feedback = document.getElementById('feedback');
    feedback.textContent = text;
    feedback.style.color = color;
    feedback.classList.remove('show');
    void feedback.offsetWidth;
    feedback.classList.add('show');
}

async function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('pause-overlay').classList.remove('show');

    gameState.currentTrial = 0;
    gameState.correctCount = 0;
    gameState.wrongCount = 0;
    gameState.startTime = Date.now();
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.records = [];

    document.getElementById('currentQuestion').textContent = '1';
    document.getElementById('correctCount').textContent = '0';
    document.getElementById('timer').textContent = '0.0s';
    document.getElementById('progressFill').style.width = '0%';

    displayTrial();

    gameState.timerInterval = setInterval(() => {
        if (!gameState.isPaused) {
            const elapsed = (Date.now() - gameState.startTime) / 1000;
            document.getElementById('timer').textContent = elapsed.toFixed(1) + 's';
        }
    }, 100);

    await startSession();
}

function togglePause() {
    if (!gameState.isPlaying) return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        document.getElementById('pause-overlay').classList.add('show');
    } else {
        document.getElementById('pause-overlay').classList.remove('show');
        displayTrial();
    }
}

function confirmExit() {
    if (confirm('确定要退出游戏吗？当前进度将不会保存。')) {
        gameState.isPlaying = false;
        clearInterval(gameState.timerInterval);
        window.location.href = 'index.html';
    }
}

async function startSession() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/games/stroop/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                difficulty: gameState.level,
                config: { totalTrials: gameState.totalTrials }
            })
        });

        const data = await response.json();
        if (data.success) {
            gameState.sessionId = data.data.sessionId;
        }
    } catch (e) {
        console.log('会话将在本地记录');
    }
}

async function endGame() {
    gameState.isPlaying = false;
    clearInterval(gameState.timerInterval);

    const totalTime = (Date.now() - gameState.startTime) / 1000;
    const accuracy = gameState.correctCount / gameState.totalTrials;

    if (gameState.sessionId) {
        try {
            await fetch(`/api/games/${gameState.sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    score: calculateScore(accuracy, totalTime),
                    accuracy: accuracy,
                    avg_reaction_time: (totalTime * 1000) / gameState.totalTrials
                })
            });
        } catch (e) {
            console.log('结果已本地保存');
        }
    }

    document.getElementById('finalAccuracy').textContent = Math.round(accuracy * 100);
    document.getElementById('finalTime').textContent = totalTime.toFixed(1);
    document.getElementById('finalGrade').textContent = getGrade(accuracy, gameState.level);

    document.getElementById('overlay').classList.add('show');
    document.getElementById('resultMessage').classList.add('show');
}

function calculateScore(accuracy, time) {
    const baseScore = 1000;
    const accuracyBonus = accuracy * 800;
    const timeBonus = Math.max(0, 500 - time * 5);
    return Math.round(baseScore + accuracyBonus + timeBonus);
}

function getGrade(accuracy, level) {
    if (accuracy >= 0.95) return '🌟 天才抑制者';
    if (accuracy >= 0.85) return '⭐ 优秀';
    if (accuracy >= 0.70) return '👍 良好';
    if (accuracy >= 0.50) return '💪 继续努力';
    return '📚 需要加强抑制控制';
}

function restartGame() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('resultMessage').classList.remove('show');
    startGame();
}

function getToken() {
    return localStorage.getItem('token');
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState.isPlaying) {
        e.preventDefault();
        togglePause();
    }
});
