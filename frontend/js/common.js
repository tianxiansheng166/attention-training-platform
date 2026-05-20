/**
 * 专注力星球 - 通用工具函数
 * 提供计分器、计时器、数据存储等通用功能
 */

// 使用 config.js 中统一的 API 配置
const API_BASE_URL = typeof CONFIG !== 'undefined' ? CONFIG.API_BASE : (window.location.hostname === 'localhost'
    ? 'http://localhost:3000'
    : `http://${window.location.host}`);

// ========================================
// 存储服务
// ========================================

const Storage = {
    // 保存数据到 LocalStorage
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Storage set error:', e);
            return false;
        }
    },

    // 从 LocalStorage 获取数据
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch (e) {
            console.error('Storage get error:', e);
            return defaultValue;
        }
    },

    // 删除数据
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (e) {
            console.error('Storage remove error:', e);
            return false;
        }
    },

    // 获取用户等级
    getUserLevel() {
        const data = this.get('userLevel', { level: '未定级', timestamp: null });
        return data.level;
    },

    // 保存用户等级
    setUserLevel(level) {
        return this.set('userLevel', {
            level,
            timestamp: new Date().toISOString()
        });
    },

    // 保存游戏记录
    saveGameRecord(gameName, record) {
        const records = this.get('gameRecords', {});
        if (!records[gameName]) {
            records[gameName] = [];
        }
        records[gameName].push({
            ...record,
            timestamp: new Date().toISOString()
        });

        // 保留最近30条记录
        if (records[gameName].length > 30) {
            records[gameName] = records[gameName].slice(-30);
        }

        return this.set('gameRecords', records);
    },

    // 获取游戏记录
    getGameRecords(gameName = null) {
        const records = this.get('gameRecords', {});
        return gameName ? (records[gameName] || []) : records;
    },

    // 保存任务
    saveTask(task) {
        const tasks = this.get('tasks', []);
        tasks.push({
            ...task,
            id: Date.now(),
            createdAt: new Date().toISOString()
        });
        return this.set('tasks', tasks);
    },

    // 获取任务列表
    getTasks() {
        return this.get('tasks', []);
    },

    // 更新任务状态
    updateTask(taskId, updates) {
        const tasks = this.get('tasks', []);
        const index = tasks.findIndex(t => t.id === taskId);
        if (index !== -1) {
            tasks[index] = { ...tasks[index], ...updates };
            return this.set('tasks', tasks);
        }
        return false;
    },

    // 删除任务
    deleteTask(taskId) {
        const tasks = this.get('tasks', []);
        const filtered = tasks.filter(t => t.id !== taskId);
        return this.set('tasks', filtered);
    },

    // 保存情绪记录
    saveEmotionRecord(record) {
        const records = this.get('emotionRecords', []);
        records.push({
            ...record,
            timestamp: new Date().toISOString()
        });

        // 保留最近100条记录
        if (records.length > 100) {
            records.splice(0, records.length - 100);
        }

        return this.set('emotionRecords', records);
    },

    // 获取情绪记录
    getEmotionRecords(limit = 30) {
        const records = this.get('emotionRecords', []);
        return records.slice(-limit);
    }
};

// ========================================
// 计时器服务
// ========================================

class Timer {
    constructor(options = {}) {
        this.duration = options.duration || 60; // 默认60秒
        this.onTick = options.onTick || (() => {});
        this.onComplete = options.onComplete || (() => {});
        this.onStart = options.onStart || (() => {});
        this.onStop = options.onStop || (() => {});

        this.remaining = this.duration;
        this.intervalId = null;
        this.isRunning = false;
    }

    start() {
        if (this.isRunning) return;

        this.isRunning = true;
        this.onStart(this.remaining);

        this.intervalId = setInterval(() => {
            this.remaining--;
            this.onTick(this.remaining);

            if (this.remaining <= 0) {
                this.complete();
            }
        }, 1000);
    }

    stop() {
        if (!this.isRunning) return;

        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;
        this.onStop(this.remaining);
    }

    pause() {
        if (!this.isRunning) return;
        clearInterval(this.intervalId);
        this.intervalId = null;
        this.isRunning = false;
    }

    resume() {
        if (this.isRunning || this.remaining <= 0) return;
        this.isRunning = true;
        this.intervalId = setInterval(() => {
            this.remaining--;
            this.onTick(this.remaining);
            if (this.remaining <= 0) {
                this.complete();
            }
        }, 1000);
    }

    reset() {
        this.stop();
        this.remaining = this.duration;
    }

    complete() {
        this.stop();
        this.onComplete();
    }

    getRemaining() {
        return this.remaining;
    }

    setDuration(seconds) {
        this.duration = seconds;
        if (!this.isRunning) {
            this.remaining = seconds;
        }
    }
}

// ========================================
// 计分器服务
// ========================================

class ScoreManager {
    constructor(options = {}) {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = {
            correct: 0,
            incorrect: 0,
            total: 0,
            reactionTimes: []
        };

        this.onScoreChange = options.onScoreChange || (() => {});
        this.onComboChange = options.onComboChange || (() => {});
    }

    // 添加分数
    addScore(points, isCorrect = true) {
        if (isCorrect) {
            this.combo++;
            this.maxCombo = Math.max(this.maxCombo, this.combo);

            // 连击加成
            if (this.combo >= 5) {
                this.multiplier = Math.min(3, 1 + (this.combo - 5) * 0.1);
            }

            const finalPoints = Math.floor(points * this.multiplier);
            this.score += finalPoints;
            this.stats.correct++;

            this.onScoreChange({
                score: this.score,
                points: finalPoints,
                multiplier: this.multiplier,
                combo: this.combo
            });

            this.onComboChange({
                combo: this.combo,
                multiplier: this.multiplier
            });
        } else {
            this.combo = 0;
            this.multiplier = 1;
            this.stats.incorrect++;

            this.onComboChange({
                combo: 0,
                multiplier: 1
            });
        }

        this.stats.total++;
    }

    // 添加反应时间记录
    addReactionTime(time) {
        this.stats.reactionTimes.push(time);
    }

    // 获取平均反应时间
    getAverageReactionTime() {
        if (this.stats.reactionTimes.length === 0) return 0;
        const sum = this.stats.reactionTimes.reduce((a, b) => a + b, 0);
        return Math.round(sum / this.stats.reactionTimes.length);
    }

    // 获取统计数据
    getStats() {
        return {
            score: this.score,
            maxCombo: this.maxCombo,
            correct: this.stats.correct,
            incorrect: this.stats.incorrect,
            total: this.stats.total,
            accuracy: this.stats.total > 0
                ? Math.round((this.stats.correct / this.stats.total) * 100)
                : 0,
            averageReactionTime: this.getAverageReactionTime()
        };
    }

    // 重置
    reset() {
        this.score = 0;
        this.multiplier = 1;
        this.combo = 0;
        this.maxCombo = 0;
        this.stats = {
            correct: 0,
            incorrect: 0,
            total: 0,
            reactionTimes: []
        };
    }
}

// ========================================
// API 服务（使用统一的 api.js 客户端）
// ========================================

const API = {
    // 任务分解
    async decomposeTask(task) {
        if (typeof window.api !== 'undefined') {
            return window.api.request('/api/decompose', {
                method: 'POST',
                body: JSON.stringify({ task })
            });
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/decompose`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ task })
            });

            if (!response.ok) {
                throw new Error('任务分解失败');
            }

            return await response.json();
        } catch (error) {
            console.error('API decomposeTask error:', error);
            throw error;
        }
    },

    // 生成报告
    async generateReport(data) {
        if (typeof window.api !== 'undefined') {
            return window.api.request('/api/report', {
                method: 'POST',
                body: JSON.stringify(data)
            });
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/report`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error('报告生成失败');
            }

            return await response.json();
        } catch (error) {
            console.error('API generateReport error:', error);
            throw error;
        }
    },

    // 健康检查
    async healthCheck() {
        if (typeof window.api !== 'undefined') {
            return window.api.request('/api/health').catch(error => {
                console.error('API healthCheck error:', error);
                return { status: 'error', message: error.message };
            });
        }
        try {
            const response = await fetch(`${API_BASE_URL}/api/health`);
            return await response.json();
        } catch (error) {
            console.error('API healthCheck error:', error);
            return { status: 'error', message: error.message };
        }
    }
};

// ========================================
// UI 工具
// ========================================

const UI = {
    // 显示消息
    showMessage(message, type = 'info', duration = 3000) {
        const colors = {
            success: '#4CAF50',
            error: '#F44336',
            warning: '#FF9800',
            info: '#2196F3'
        };

        const msg = document.createElement('div');
        msg.textContent = message;
        msg.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${colors[type]};
            color: white;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 1rem;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 10000;
            animation: slideDown 0.3s ease-out;
        `;
        document.body.appendChild(msg);

        setTimeout(() => {
            msg.style.animation = 'slideUp 0.3s ease-in';
            setTimeout(() => msg.remove(), 300);
        }, duration);
    },

    // 显示加载中
    showLoading(element) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        element.innerHTML = '<div style="text-align:center;padding:40px;"><div class="loading-spinner"></div><p>加载中...</p></div>';
    },

    // 隐藏加载
    hideLoading(element, originalContent) {
        if (typeof element === 'string') {
            element = document.querySelector(element);
        }
        element.innerHTML = originalContent;
    },

    // 格式化时间
    formatTime(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // 创建确认对话框
    confirm(message) {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white;
                padding: 30px;
                border-radius: 15px;
                max-width: 400px;
                text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            `;

            dialog.innerHTML = `
                <p style="margin-bottom:20px;font-size:1.1rem;">${message}</p>
                <div style="display:flex;gap:10px;justify-content:center;">
                    <button id="confirm-yes" style="padding:10px 30px;background:#4CAF50;color:white;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">确定</button>
                    <button id="confirm-no" style="padding:10px 30px;background:#ccc;color:#333;border:none;border-radius:8px;cursor:pointer;font-size:1rem;">取消</button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            document.getElementById('confirm-yes').onclick = () => {
                overlay.remove();
                resolve(true);
            };

            document.getElementById('confirm-no').onclick = () => {
                overlay.remove();
                resolve(false);
            };
        });
    }
};

// ========================================
// 导出到全局
// ========================================

window.Storage = Storage;
window.Timer = Timer;
window.ScoreManager = ScoreManager;
window.API = API;
window.UI = UI;
window.API_BASE_URL = API_BASE_URL;
