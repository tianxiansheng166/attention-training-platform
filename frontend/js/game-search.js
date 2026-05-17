/**
 * 密林寻踪 - 选择性注意力训练游戏
 * 视觉搜索范式
 */

const SEARCH_CONFIG = {
    gameDuration: 120,
    targetCount: 10,
    distractorsCount: 15,
    shapes: ['🐰', '🦊', '🐿️', '🦉', '🐻'],
    colors: [
        { name: '棕色', class: 'brown', hex: '#8B4513' },
        { name: '灰色', class: 'gray', hex: '#808080' },
        { name: '白色', class: 'white', hex: '#F5F5F5' },
        { name: '橙色', class: 'orange', hex: '#FFA500' },
        { name: '黑色', class: 'black', hex: '#333333' }
    ],
    correctScore: 10,
    incorrectPenalty: 5,
    comboBonus: 3,
    speedBonus: 2,
    containerWidth: 700,
    containerHeight: 500,
    itemSize: 50
};

let searchState = {
    isRunning: false,
    score: 0,
    combo: 0,
    maxCombo: 0,
    found: 0,
    clicked: 0,
    target: null,
    items: [],
    timer: null,
    startTime: null
};

function initGame() {
    createTarget();
}

function createTarget() {
    const shapeIndex = Math.floor(Math.random() * SEARCH_CONFIG.shapes.length);
    const colorIndex = Math.floor(Math.random() * SEARCH_CONFIG.colors.length);
    
    searchState.target = {
        shape: SEARCH_CONFIG.shapes[shapeIndex],
        color: SEARCH_CONFIG.colors[colorIndex],
        colorIndex: colorIndex
    };
    
    const targetDisplay = document.getElementById('target-display');
    targetDisplay.innerHTML = `
        <span style="display: inline-block; padding: 10px 20px; 
              background: ${SEARCH_CONFIG.colors[colorIndex].hex}; 
              border-radius: 10px;
              color: ${colorIndex >= 3 ? '#333' : '#fff'};">
            ${SEARCH_CONFIG.shapes[shapeIndex]}
        </span>
    `;
}

function startGame() {
    document.querySelector('.game-instructions').classList.add('hidden');
    document.getElementById('game-area').classList.remove('hidden');
    document.getElementById('result-area').classList.add('hidden');
    
    resetGameState();
    searchState.isRunning = true;
    searchState.startTime = Date.now();
    
    searchState.timer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - searchState.startTime) / 1000);
        const remaining = SEARCH_CONFIG.gameDuration - elapsed;
        
        if (remaining <= 0) {
            endGame();
        } else {
            updateTimerDisplay(remaining);
        }
    }, 1000);
    
    generateItems();
    renderItems();
}

function resetGameState() {
    searchState = {
        isRunning: false,
        score: 0,
        combo: 0,
        maxCombo: 0,
        found: 0,
        clicked: 0,
        target: null,
        items: [],
        timer: null,
        startTime: null
    };
    
    updateScoreDisplay({ score: 0 });
    updateComboDisplay({ combo: 0 });
    updateFoundDisplay();
    updateTimerDisplay(SEARCH_CONFIG.gameDuration);
    hideFeedback();
}

function generateItems() {
    searchState.items = [];
    const container = document.getElementById('search-container');
    const width = container.offsetWidth - SEARCH_CONFIG.itemSize;
    const height = container.offsetHeight - SEARCH_CONFIG.itemSize - 100;
    
    const targetCount = Math.min(2, Math.floor(Math.random() * 2) + 1);
    const distractorCount = SEARCH_CONFIG.distractorsCount;
    
    const positions = [];
    
    for (let i = 0; i < targetCount + distractorCount; i++) {
        let x, y, attempts = 0;
        do {
            x = Math.floor(Math.random() * (width / 60)) * 60 + 10;
            y = Math.floor(Math.random() * (height / 60)) * 60 + 80;
            attempts++;
        } while (attempts < 50 && isOverlapping(x, y, positions));
        
        positions.push({ x, y });
        
        let isTarget = i < targetCount;
        let shapeIndex, colorIndex;
        
        if (isTarget) {
            shapeIndex = SEARCH_CONFIG.shapes.indexOf(searchState.target.shape);
            colorIndex = searchState.target.colorIndex;
        } else {
            do {
                shapeIndex = Math.floor(Math.random() * SEARCH_CONFIG.shapes.length);
                colorIndex = Math.floor(Math.random() * SEARCH_CONFIG.colors.length);
            } while (shapeIndex === SEARCH_CONFIG.shapes.indexOf(searchState.target.shape) && 
                     colorIndex === searchState.target.colorIndex);
        }
        
        searchState.items.push({
            id: i,
            x: x,
            y: y,
            shape: SEARCH_CONFIG.shapes[shapeIndex],
            color: SEARCH_CONFIG.colors[colorIndex],
            colorIndex: colorIndex,
            isTarget: isTarget,
            found: false
        });
    }
}

function isOverlapping(x, y, positions) {
    const minDistance = 60;
    return positions.some(pos => {
        const dx = pos.x - x;
        const dy = pos.y - y;
        return Math.sqrt(dx * dx + dy * dy) < minDistance;
    });
}

function renderItems() {
    const container = document.getElementById('search-container');
    const existingItems = container.querySelectorAll('.search-item');
    existingItems.forEach(item => item.remove());
    
    searchState.items.forEach(item => {
        if (!item.found) {
            const div = document.createElement('div');
            div.className = 'search-item';
            div.dataset.id = item.id;
            div.style.left = item.x + 'px';
            div.style.top = item.y + 'px';
            div.style.background = item.color.hex;
            div.style.color = item.colorIndex >= 3 ? '#333' : '#fff';
            div.textContent = item.shape;
            div.addEventListener('click', () => handleItemClick(item.id));
            container.appendChild(div);
        }
    });
}

function handleItemClick(id) {
    if (!searchState.isRunning) return;
    
    const item = searchState.items.find(i => i.id === id);
    if (!item || item.found) return;
    
    searchState.clicked++;
    
    if (item.isTarget) {
        item.found = true;
        searchState.found++;
        searchState.combo++;
        searchState.maxCombo = Math.max(searchState.maxCombo, searchState.combo);
        
        let points = SEARCH_CONFIG.correctScore;
        if (searchState.combo > 1) {
            points += (searchState.combo - 1) * SEARCH_CONFIG.comboBonus;
        }
        searchState.score += points;
        
        showFeedback(true, '太棒了！+ ' + points);
        
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.style.transform = 'scale(1.5)';
            element.style.opacity = '0';
            setTimeout(() => element.remove(), 300);
        }
        
        updateScoreDisplay({ score: searchState.score });
        updateComboDisplay({ combo: searchState.combo });
        updateFoundDisplay();
        
        if (searchState.found >= SEARCH_CONFIG.targetCount) {
            endGame();
        } else if (searchState.found >= 3 && searchState.found % 3 === 0) {
            setTimeout(() => {
                if (searchState.isRunning) {
                    createNewTarget();
                }
            }, 500);
        }
    } else {
        searchState.combo = 0;
        searchState.score = Math.max(0, searchState.score - SEARCH_CONFIG.incorrectPenalty);
        
        showFeedback(false, '找错了！- ' + SEARCH_CONFIG.incorrectPenalty);
        
        updateScoreDisplay({ score: searchState.score });
        updateComboDisplay({ combo: 0 });
        
        const element = document.querySelector(`[data-id="${id}"]`);
        if (element) {
            element.style.animation = 'shake 0.3s ease';
            setTimeout(() => element.style.animation = '', 300);
        }
    }
}

function createNewTarget() {
    createTarget();
    generateItems();
    renderItems();
}

function showFeedback(isCorrect, message) {
    const feedback = document.getElementById('feedback');
    feedback.classList.remove('hidden', 'correct', 'incorrect');
    feedback.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedback.textContent = message;
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

function updateFoundDisplay() {
    document.getElementById('found').textContent = 
        `${searchState.found}/${SEARCH_CONFIG.targetCount}`;
}

function updateTimerDisplay(remaining) {
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    document.getElementById('timer').textContent = 
        `${mins}:${secs.toString().padStart(2, '0')}`;
}

function endGame() {
    searchState.isRunning = false;
    clearInterval(searchState.timer);
    
    const record = {
        score: searchState.score,
        found: searchState.found,
        maxCombo: searchState.maxCombo,
        accuracy: searchState.clicked > 0 
            ? Math.round((searchState.found / searchState.clicked) * 100) 
            : 0,
        duration: Math.floor((Date.now() - searchState.startTime) / 1000)
    };
    
    Storage.saveGameRecord('search', record);
    
    document.getElementById('game-area').classList.add('hidden');
    document.getElementById('result-area').classList.remove('hidden');
    
    document.getElementById('final-score').textContent = record.score;
    document.getElementById('final-found').textContent = record.found;
    document.getElementById('final-combo').textContent = record.maxCombo;
    document.getElementById('final-accuracy').textContent = record.accuracy + '%';
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
