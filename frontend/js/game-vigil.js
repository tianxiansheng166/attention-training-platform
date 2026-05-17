/**
 * 要塞守望 - 持续性注意力训练游戏
 * 警觉任务范式
 */

const VIGIL_CONFIG = {
    gameDuration: 300,
    signalTypes: [
        { type: 'normal', icon: '🟢', name: '普通信号', color: '#4CAF50', action: 'click', points: 10, weight: 40 },
        { type: 'subtle', icon: '🔵', name: '微弱信号', color: '#2196F3', action: 'click', points: 15, weight: 25 },
        { type: 'double', icon: '🟡', name: '复合信号', color: '#FF9800', action: 'double', points: 25, weight: 20 },
        { type: 'avoid', icon: '🟣', name: '紧急信号', color: '#9C27B0', action: 'avoid', points: 0, weight: 15 }
    ],
    signalDuration: 2000,
    minInterval: 1500,
    maxInterval: 4000,
    energyDecay: 0.5,
    energyRecharge: 5,
    clickPenalty: 10,
    correctBonus: 3,
    missPenalty: 15,
    containerWidth: 800,
    containerHeight: 500
};

let vigilState = {
    isRunning: false,
    score: 0,
    correct: 0,
    missed: 0,
    falseAlarms: 0,
    energy: 100,
    timer: null,
    signalTimer: null,
    nextSignalTimeout: null,
    currentSignal: null,
    startTime: null,
    clickCount: 0,
    lastClickTime: 0
};

function initGame() {
    setupEventListeners();
}

function setupEventListeners() {
    const container = document.getElementById('vigilance-container');
    
    container.addEventListener('click', handleContainerClick);
    container.addEventListener('dblclick', handleContainerDoubleClick);
}

function handleContainerClick(e) {
    if (!vigilState.isRunning) return;
    
    const now = Date.now();
    const timeSinceLastClick = now - vigilState.lastClickTime;
    
    if (timeSinceLastClick < 300) {
        return;
    }
    
    vigilState.clickCount++;
    vigilState.lastClickTime = now;
    
    if (vigilState.currentSignal) {
        if (vigilState.currentSignal.action === 'click') {
            handleCorrectClick();
        } else if (vigilState.currentSignal.action === 'double') {
            showFeedback(false, '这是复合信号！需要双击');
        } else if (vigilState.currentSignal.action === 'avoid') {
            handleFalseAlarm();
        }
    } else {
        handleFalseAlarm();
    }
}

function handleContainerDoubleClick(e) {
    if (!vigilState.isRunning) return;
    
    if (vigilState.currentSignal && vigilState.currentSignal.action === 'double') {
        handleCorrectClick();
    } else {
        handleFalseAlarm();
    }
}

function startGame() {
    document.querySelector('.game-instructions').classList.add('hidden');
    document.getElementById('game-area').classList.remove('hidden');
    document.getElementById('result-area').classList.add('hidden');
    
    resetGameState();
    vigilState.isRunning = true;
    vigilState.startTime = Date.now();
    
    vigilState.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - vigilState.startTime) / 1000);
        const remaining = VIGIL_CONFIG.gameDuration - elapsed;
        
        if (remaining <= 0) {
            endGame();
        } else {
            updateTimerDisplay(remaining);
        }
        
        updateEnergyDecay();
    }, 100);
    
    scheduleNextSignal();
}

function resetGameState() {
    clearTimeout(vigilState.nextSignalTimeout);
    clearTimeout(vigilState.signalTimer);
    
    const container = document.getElementById('vigilance-container');
    const existingSignal = container.querySelector('.signal');
    if (existingSignal) {
        existingSignal.remove();
    }
    
    vigilState = {
        isRunning: false,
        score: 0,
        correct: 0,
        missed: 0,
        falseAlarms: 0,
        energy: 100,
        timer: null,
        signalTimer: null,
        nextSignalTimeout: null,
        currentSignal: null,
        startTime: null,
        clickCount: 0,
        lastClickTime: 0
    };
    
    updateScoreDisplay({ score: 0 });
    updateCorrectDisplay();
    updateEnergyDisplay();
    updateTimerDisplay(VIGIL_CONFIG.gameDuration);
    hideFeedback();
}

function updateEnergyDecay() {
    if (!vigilState.isRunning) return;
    
    const wasLowEnergy = vigilState.energy < 30;
    vigilState.energy = Math.max(0, vigilState.energy - VIGIL_CONFIG.energyDecay / 10);
    updateEnergyDisplay();
    
    if (vigilState.energy < 30 && !wasLowEnergy) {
        showWarning('能量过低！请集中注意力');
    }
}

function selectSignalType() {
    const rand = Math.random() * 100;
    let cumulative = 0;
    
    for (const signal of VIGIL_CONFIG.signalTypes) {
        cumulative += signal.weight;
        if (rand <= cumulative) {
            return signal;
        }
    }
    
    return VIGIL_CONFIG.signalTypes[0];
}

function scheduleNextSignal() {
    if (!vigilState.isRunning) return;
    
    const delay = VIGIL_CONFIG.minInterval + 
        Math.random() * (VIGIL_CONFIG.maxInterval - VIGIL_CONFIG.minInterval);
    
    vigilState.nextSignalTimeout = setTimeout(() => {
        showSignal();
    }, delay);
}

function showSignal() {
    if (!vigilState.isRunning) return;
    
    clearTimeout(vigilState.nextSignalTimeout);
    
    const signal = selectSignalType();
    vigilState.currentSignal = signal;
    
    const container = document.getElementById('vigilance-container');
    const existingSignal = container.querySelector('.signal');
    if (existingSignal) {
        existingSignal.remove();
    }
    
    const signalEl = document.createElement('div');
    signalEl.className = 'signal';
    signalEl.innerHTML = signal.icon;
    
    const x = 100 + Math.random() * (VIGIL_CONFIG.containerWidth - 150);
    const y = 50 + Math.random() * (VIGIL_CONFIG.containerHeight - 150);
    
    signalEl.style.left = x + 'px';
    signalEl.style.top = y + 'px';
    signalEl.style.background = signal.color;
    signalEl.style.boxShadow = `0 0 30px ${signal.color}`;
    
    if (signal.type === 'subtle') {
        signalEl.style.opacity = '0.4';
        signalEl.style.transform = 'scale(0.7)';
    }
    
    container.appendChild(signalEl);
    
    signalEl.classList.add('flash');
    
    vigilState.signalTimer = setTimeout(() => {
        if (vigilState.currentSignal && vigilState.currentSignal.type === signal.type) {
            handleMiss();
        }
    }, VIGIL_CONFIG.signalDuration);
}

function handleCorrectClick() {
    const signal = vigilState.currentSignal;
    
    clearTimeout(vigilState.signalTimer);
    
    vigilState.correct++;
    vigilState.score += signal.points;
    vigilState.energy = Math.min(100, vigilState.energy + VIGIL_CONFIG.energyRecharge);
    
    if (vigilState.clickCount > 1) {
        vigilState.score += VIGIL_CONFIG.correctBonus;
    }
    
    showFeedback(true, `正确！+ ${signal.points}`);
    
    const container = document.getElementById('vigilance-container');
    const signalEl = container.querySelector('.signal');
    if (signalEl) {
        signalEl.style.transform = 'scale(1.5)';
        signalEl.style.opacity = '0';
        setTimeout(() => signalEl.remove(), 200);
    }
    
    vigilState.currentSignal = null;
    vigilState.clickCount = 0;
    
    updateScoreDisplay({ score: vigilState.score });
    updateCorrectDisplay();
    updateEnergyDisplay();
    
    scheduleNextSignal();
}

function handleFalseAlarm() {
    vigilState.falseAlarms++;
    vigilState.score = Math.max(0, vigilState.score - VIGIL_CONFIG.clickPenalty);
    vigilState.energy = Math.max(0, vigilState.energy - VIGIL_CONFIG.clickPenalty / 2);
    
    showFeedback(false, `误报！- ${VIGIL_CONFIG.clickPenalty}`);
    
    updateScoreDisplay({ score: vigilState.score });
    updateEnergyDisplay();
}

function handleMiss() {
    vigilState.missed++;
    vigilState.score = Math.max(0, vigilState.score - VIGIL_CONFIG.missPenalty);
    vigilState.energy = Math.max(0, vigilState.energy - VIGIL_CONFIG.missPenalty / 2);
    
    const container = document.getElementById('vigilance-container');
    const signalEl = container.querySelector('.signal');
    if (signalEl) {
        signalEl.style.opacity = '0';
        setTimeout(() => signalEl.remove(), 200);
    }
    
    vigilState.currentSignal = null;
    
    showFeedback(false, `漏报！- ${VIGIL_CONFIG.missPenalty}`);
    
    updateScoreDisplay({ score: vigilState.score });
    updateEnergyDisplay();
    
    scheduleNextSignal();
}

function showFeedback(isCorrect, message) {
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = message;
    feedback.classList.add('shake');
    setTimeout(() => feedback.classList.remove('shake'), 300);
    
    setTimeout(() => {
        if (!feedback.classList.contains('correct') && !feedback.classList.contains('incorrect')) {
            return;
        }
        feedback.classList.add('hidden');
    }, 1500);
}

function hideFeedback() {
    const feedback = document.getElementById('feedback');
    feedback.classList.add('hidden');
}

function showWarning(message) {
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    feedback.style.background = 'rgba(255, 193, 7, 0.2)';
    feedback.style.borderColor = '#FFC107';
    feedback.style.color = '#FFC107';
    feedback.textContent = message;
}

function updateScoreDisplay(data) {
    document.getElementById('score').textContent = data.score;
}

function updateCorrectDisplay() {
    document.getElementById('correct').textContent = vigilState.correct;
}

function updateEnergyDisplay() {
    document.getElementById('energy').textContent = Math.round(vigilState.energy) + '%';
    document.getElementById('energy-fill').style.width = vigilState.energy + '%';
    
    const fill = document.getElementById('energy-fill');
    if (vigilState.energy > 60) {
        fill.style.background = 'linear-gradient(90deg, #4CAF50, #8BC34A)';
    } else if (vigilState.energy > 30) {
        fill.style.background = 'linear-gradient(90deg, #FF9800, #FFC107)';
    } else {
        fill.style.background = 'linear-gradient(90deg, #F44336, #FF5722)';
    }
}

function updateTimerDisplay(remaining) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    document.getElementById('timer').textContent = 
        `${mins}:${secs.toString().padStart(2, '0')}`;
}

function endGame() {
    vigilState.isRunning = false;
    clearInterval(vigilState.timer);
    clearTimeout(vigilState.nextSignalTimeout);
    clearTimeout(vigilState.signalTimer);
    
    const totalSignals = vigilState.correct + vigilState.missed + vigilState.falseAlarms;
    
    const record = {
        score: vigilState.score,
        correct: vigilState.correct,
        missed: vigilState.missed,
        falseAlarms: vigilState.falseAlarms,
        accuracy: totalSignals > 0 
            ? Math.round((vigilState.correct / totalSignals) * 100) 
            : 0,
        avgEnergy: vigilState.energy,
        duration: Math.floor((Date.now() - vigilState.startTime) / 1000)
    };
    
    Storage.saveGameRecord('vigil', record);
    
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('result-area').classList.remove('hidden');
    
    document.getElementById('final-score').textContent = record.score;
    document.getElementById('final-correct').textContent = record.correct;
    document.getElementById('final-missed').textContent = record.missed;
    document.getElementById('final-false').textContent = record.falseAlarms;
}

function restartGame() {
    startGame();
}

function goHome() {
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
