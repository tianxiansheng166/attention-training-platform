/**
 * 专注力星球 - 听觉追踪游戏
 * 听觉工作记忆与选择性注意训练
 */

let gameState = {
    level: 1,
    sequenceLength: 5,
    totalRounds: 5,
    currentRound: 0,
    sequence: [],
    targetPosition: 1,
    isPlaying: false,
    sessionId: null,
    correctCount: 0,
    totalScore: 0,
    records: []
};

const SPEAK_RATE = 600;

function selectLevel(level) {
    gameState.level = level;
    gameState.sequenceLength = level === 1 ? 5 : level === 2 ? 7 : 9;

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.level) === level);
    });
}

function generateSequence() {
    const sequence = [];
    for (let i = 0; i < gameState.sequenceLength; i++) {
        sequence.push(Math.floor(Math.random() * 10));
    }
    return sequence;
}

function speakNumber(num) {
    return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(num.toString());
        utterance.lang = 'zh-CN';
        utterance.rate = 1.2;
        utterance.onend = resolve;
        setTimeout(resolve, SPEAK_RATE);
    });
}

async function playSequence() {
    gameState.sequence = generateSequence();
    gameState.targetPosition = Math.floor(Math.random() * gameState.sequenceLength) + 1;

    document.getElementById('startBtn').style.display = 'none';
    document.getElementById('trialPhase').textContent = '请仔细听...';
    document.getElementById('sequenceDisplay').textContent = '';
    document.getElementById('listenIndicator').style.display = 'block';
    document.getElementById('numberButtons').style.display = 'none';

    await new Promise(resolve => setTimeout(resolve, 1000));

    document.getElementById('listenIndicator').style.display = 'none';

    for (let i = 0; i < gameState.sequence.length; i++) {
        const display = document.getElementById('sequenceDisplay');
        display.textContent = '';
        for (let j = 0; j < gameState.sequence.length; j++) {
            display.textContent += j === i ? `[${gameState.sequence[j]}]` : ` ${gameState.sequence[j]} `;
        }
        display.textContent = gameState.sequence[i];

        await speakNumber(gameState.sequence[i]);
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    document.getElementById('trialPhase').textContent = `第 ${gameState.targetPosition} 个数字是什么？`;
    document.getElementById('sequenceDisplay').textContent = '?';
    document.getElementById('listenIndicator').style.display = 'none';
    document.getElementById('numberButtons').style.display = 'grid';

    gameState.currentRound++;
    document.getElementById('currentRound').textContent = gameState.currentRound;
}

async function selectNumber(num) {
    if (gameState.isPlaying) return;

    document.getElementById('numberButtons').style.display = 'none';
    document.getElementById('trialPhase').textContent = num === gameState.sequence[gameState.targetPosition - 1] ? '✓ 正确！' : '✗ 错误';
    document.getElementById('sequenceDisplay').textContent = gameState.sequence.join(' ');

    const isCorrect = num === gameState.sequence[gameState.targetPosition - 1];

    if (isCorrect) {
        gameState.correctCount++;
        gameState.totalScore += 100 * gameState.level;
    }

    document.getElementById('correctCount').textContent = gameState.correctCount;
    document.getElementById('totalScore').textContent = gameState.totalScore;

    if (gameState.sessionId) {
        try {
            await fetch(`/api/games/${gameState.sessionId}/records`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    trial_number: gameState.currentRound,
                    stimulus: {
                        sequence: gameState.sequence,
                        targetPosition: gameState.targetPosition
                    },
                    response: num.toString(),
                    is_correct: isCorrect,
                    reaction_time: 0
                })
            });
        } catch (e) {
            console.log('记录已本地保存');
        }
    }

    await new Promise(resolve => setTimeout(resolve, 2000));

    if (gameState.currentRound >= gameState.totalRounds) {
        endGame();
    } else {
        document.getElementById('trialPhase').textContent = '准备下一题...';
        document.getElementById('startBtn').style.display = 'inline-block';
        document.getElementById('startBtn').textContent = '下一题';
    }
}

async function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';

    gameState.currentRound = 0;
    gameState.correctCount = 0;
    gameState.totalScore = 0;
    gameState.isPlaying = true;
    gameState.records = [];

    document.getElementById('currentRound').textContent = '0';
    document.getElementById('correctCount').textContent = '0';
    document.getElementById('totalScore').textContent = '0';

    await startSession();
}

async function startSession() {
    const token = getToken();
    if (!token) return;

    try {
        const response = await fetch('/api/games/auditory/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                difficulty: gameState.level,
                config: {
                    sequenceLength: gameState.sequenceLength,
                    totalRounds: gameState.totalRounds
                }
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

    const accuracy = gameState.correctCount / gameState.totalRounds;

    if (gameState.sessionId) {
        try {
            await fetch(`/api/games/${gameState.sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    score: gameState.totalScore,
                    accuracy: accuracy,
                    avg_reaction_time: 0
                })
            });
        } catch (e) {
            console.log('结果已本地保存');
        }
    }

    document.getElementById('finalAccuracy').textContent = Math.round(accuracy * 100);
    document.getElementById('finalScore').textContent = gameState.totalScore;
    document.getElementById('finalGrade').textContent = getGrade(accuracy, gameState.level);

    document.getElementById('overlay').classList.add('show');
    document.getElementById('resultMessage').classList.add('show');
}

function getGrade(accuracy, level) {
    const threshold = 0.6 + level * 0.1;
    if (accuracy >= threshold) return '🌟 天才听觉';
    if (accuracy >= threshold - 0.2) return '⭐ 优秀';
    if (accuracy >= threshold - 0.4) return '👍 良好';
    return '📚 继续练习';
}

function restartGame() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('resultMessage').classList.remove('show');
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
    document.getElementById('startBtn').textContent = '开始播放';
}

function getToken() {
    return localStorage.getItem('token');
}
