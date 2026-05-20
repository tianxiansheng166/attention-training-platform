/**
 * 专注力星球 - 舒尔特方格游戏
 * 视觉搜索与注意力广度训练
 */

let gameState = {
    gridSize: 5,
    numbers: [],
    currentTarget: 1,
    startTime: null,
    timerInterval: null,
    isPlaying: false,
    isPaused: false,
    sessionId: null,
    records: [],
    correctCount: 0,
    wrongCount: 0,
    totalNumbers: 25
};

function selectDifficulty(size) {
    gameState.gridSize = size;
    gameState.totalNumbers = size * size;

    document.querySelectorAll('.difficulty-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
    });

    document.getElementById('maxNumber').textContent = gameState.totalNumbers;
}

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateNumbers() {
    const numbers = [];
    for (let i = 1; i <= gameState.totalNumbers; i++) {
        numbers.push(i);
    }
    return shuffleArray(numbers);
}

function renderGrid() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';

    grid.className = `grid-container size-${gameState.gridSize}`;

    gameState.numbers.forEach((num, index) => {
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.textContent = num;
        cell.dataset.number = num;
        cell.onclick = () => handleCellClick(num, cell);
        grid.appendChild(cell);
    });

    highlightNextTarget();
}

function highlightNextTarget() {
    document.querySelectorAll('.grid-cell').forEach(cell => {
        cell.classList.remove('next-hint');
    });

    if (gameState.currentTarget <= gameState.totalNumbers) {
        const nextCell = document.querySelector(`[data-number="${gameState.currentTarget}"]`);
        if (nextCell) {
            nextCell.classList.add('next-hint');
        }
    }
}

async function handleCellClick(number, cell) {
    if (!gameState.isPlaying || gameState.isPaused || cell.classList.contains('correct')) return;

    const reactionTime = Date.now() - gameState.startTime;

    if (number === gameState.currentTarget) {
        cell.classList.add('correct');
        cell.classList.remove('next-hint');
        gameState.correctCount++;
        gameState.currentTarget++;

        document.getElementById('currentTarget').textContent =
            gameState.currentTarget > gameState.totalNumbers ? '完成!' : gameState.currentTarget;
        document.getElementById('completed').textContent = gameState.correctCount;

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
                        trial_number: gameState.correctCount,
                        stimulus: { target: number, gridSize: gameState.gridSize },
                        response: 'click',
                        is_correct: true,
                        reaction_time: reactionTime
                    })
                });
            } catch (e) {
                console.log('记录已本地保存');
            }
        }

        highlightNextTarget();

        if (gameState.currentTarget > gameState.totalNumbers) {
            endGame();
        }
    } else {
        cell.classList.add('wrong');
        setTimeout(() => cell.classList.remove('wrong'), 300);
        gameState.wrongCount++;

        // 记录错误
        if (gameState.sessionId) {
            try {
                await fetch(`/api/games/${gameState.sessionId}/records`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        trial_number: gameState.wrongCount,
                        stimulus: { target: number, expected: gameState.currentTarget },
                        response: 'wrong_click',
                        is_correct: false,
                        reaction_time: reactionTime
                    })
                });
            } catch (e) {
                console.log('记录已本地保存');
            }
        }
    }
}

function startGame() {
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameArea').style.display = 'block';
    document.getElementById('pause-overlay').classList.remove('show');

    gameState.numbers = generateNumbers();
    gameState.currentTarget = 1;
    gameState.startTime = Date.now();
    gameState.isPlaying = true;
    gameState.isPaused = false;
    gameState.correctCount = 0;
    gameState.wrongCount = 0;

    document.getElementById('currentTarget').textContent = '1';
    document.getElementById('completed').textContent = '0';
    document.getElementById('timer').textContent = '0.0s';

    renderGrid();

    gameState.timerInterval = setInterval(() => {
        if (!gameState.isPaused) {
            const elapsed = (Date.now() - gameState.startTime) / 1000;
            document.getElementById('timer').textContent = elapsed.toFixed(1) + 's';
        }
    }, 100);

    startSession();
}

function togglePause() {
    if (!gameState.isPlaying) return;
    
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        document.getElementById('pause-overlay').classList.add('show');
    } else {
        document.getElementById('pause-overlay').classList.remove('show');
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
        const response = await fetch('/api/games/schulte/start', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                difficulty: gameState.gridSize - 4,
                config: { gridSize: gameState.gridSize }
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
    const accuracy = gameState.totalNumbers / (gameState.correctCount + gameState.wrongCount || 1);

    // 完成游戏会话
    if (gameState.sessionId) {
        try {
            await fetch(`/api/games/${gameState.sessionId}/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({
                    score: calculateScore(totalTime, accuracy),
                    accuracy: accuracy,
                    avg_reaction_time: totalTime * 1000 / gameState.totalNumbers
                })
            });
        } catch (e) {
            console.log('结果已本地保存');
        }
    }

    // 显示结果
    document.getElementById('finalTime').textContent = totalTime.toFixed(1);
    document.getElementById('finalAccuracy').textContent = Math.round(accuracy * 100);
    document.getElementById('finalGrade').textContent = getGrade(totalTime, gameState.gridSize);

    document.getElementById('overlay').classList.add('show');
    document.getElementById('resultMessage').classList.add('show');
}

function calculateScore(time, accuracy) {
    const baseScore = 1000;
    const timeBonus = Math.max(0, 1000 - time * 10);
    const accuracyBonus = accuracy * 500;
    return Math.round(baseScore + timeBonus + accuracyBonus);
}

function getGrade(time, gridSize) {
    const targetTime = gridSize * gridSize * 0.5;

    if (time < targetTime * 0.6) return '🌟 天才';
    if (time < targetTime * 0.8) return '⭐ 优秀';
    if (time < targetTime) return '👍 良好';
    if (time < targetTime * 1.5) return '💪 合格';
    return '📚 继续努力';
}

function restartGame() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('resultMessage').classList.remove('show');
    startGame();
}

function showStart() {
    document.getElementById('overlay').classList.remove('show');
    document.getElementById('resultMessage').classList.remove('show');
    document.getElementById('gameArea').style.display = 'none';
    document.getElementById('startScreen').style.display = 'block';
}

function getToken() {
    return localStorage.getItem('token');
}

window.addEventListener('beforeunload', () => {
    if (gameState.isPlaying && gameState.sessionId) {
        endGame();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && gameState.isPlaying) {
        e.preventDefault();
        togglePause();
    }
});
