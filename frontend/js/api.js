/**
 * API 客户端 - 专注力星球
 */

const api = {
    baseURL: CONFIG.API_BASE,

    // 检查是否已登录
    isLoggedIn() {
        const token = localStorage.getItem('authToken');
        return !!token;
    },

    // 获取当前用户信息
    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    },

    // 获取认证Token
    getToken() {
        return localStorage.getItem('authToken');
    },

    // 设置认证信息
    setAuth(token, user) {
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(user));
    },

    // 清除认证信息
    clearAuth() {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
    },

    // 通用请求方法
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = localStorage.getItem('authToken');

        const headers = {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
            ...options.headers
        };

        console.log(`[API] ${options.method || 'GET'} ${endpoint}`, { hasToken: !!token });

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log(`[API] Response: ${response.status} ${response.statusText}`);

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                console.error(`[API] Error:`, error);
                
                if (response.status === 401) {
                    console.warn('[API] Token expired or invalid, clearing auth...');
                    this.clearAuth();
                }
                
                throw new Error(error.message || `请求失败: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    // 认证相关API
    auth: {
        async login(email, password) {
            const result = await api.request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            // 兼容两种返回格式
            return {
                token: result.token || (result.data && result.data.token),
                user: result.user || (result.data && result.data.user)
            };
        },

        async register(data) {
            const result = await api.request('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            // 兼容两种返回格式
            return {
                token: result.token || (result.data && result.data.token),
                user: result.user || (result.data && result.data.user)
            };
        },

        async getProfile() {
            return api.request('/api/auth/me');
        },

        async updateProfile(data) {
            return api.request('/api/auth/profile', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
        },

        async bindParent(parentCode) {
            return api.request('/api/auth/bind-parent', {
                method: 'POST',
                body: JSON.stringify({ parentCode })
            });
        },

        async getChildSettings() {
            return api.request('/api/auth/child-settings');
        },

        async updateChildSettings(settings) {
            return api.request('/api/auth/child-settings', {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
        },
        
        async bindByCode(inviteCode) {
            return api.request('/api/auth/bind-by-code', {
                method: 'POST',
                body: JSON.stringify({ invite_code: inviteCode })
            });
        }
    },

    // 游戏相关API
    game: {
        async startSession(gameType) {
            return api.request(`/api/games/${gameType}/start`, {
                method: 'POST'
            });
        },

        async saveRecord(sessionId, gameType, record) {
            return api.request(`/api/games/${sessionId}/records`, {
                method: 'POST',
                body: JSON.stringify({
                    gameType,
                    ...record
                })
            });
        },

        async completeSession(sessionId, summary) {
            return api.request(`/api/games/${sessionId}/complete`, {
                method: 'POST',
                body: JSON.stringify(summary)
            });
        },

        async getHistory(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/api/games/history${query ? '?' + query : ''}`);
        },

        async getStats(params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/api/games/stats${query ? '?' + query : ''}`);
        }
    },

    // 评估相关API
    assessment: {
        async start(type = 'baseline') {
            return api.request('/api/assessments/start', {
                method: 'POST',
                body: JSON.stringify({ type })
            });
        },

        async saveAnswer(assessmentId, data) {
            return api.request(`/api/assessments/${assessmentId}/answer`, {
                method: 'POST',
                body: JSON.stringify(data)
            });
        },

        async complete(assessmentId, results) {
            return api.request(`/api/assessments/${assessmentId}/complete`, {
                method: 'POST',
                body: JSON.stringify(results)
            });
        },

        async getHistory() {
            return api.request('/api/assessments/history');
        },

        async getProgress() {
            return api.request('/api/assessments/progress');
        }
    },

    // 家长端API
    parent: {
        async getChildren() {
            return api.request('/api/parent/children');
        },

        async getTodaySummary(childId) {
            return api.request(`/api/parent/${childId}/today-summary`);
        },

        async getWeeklyData(childId) {
            return api.request(`/api/parent/${childId}/weekly`);
        },

        async getCognitiveData(childId) {
            return api.request(`/api/parent/${childId}/cognitive`);
        },

        async getTrainingHistory(childId, params = {}) {
            const query = new URLSearchParams(params).toString();
            return api.request(`/api/parent/${childId}/history${query ? '?' + query : ''}`);
        },

        async updateSettings(childId, settings) {
            return api.request(`/api/parent/${childId}/settings`, {
                method: 'PUT',
                body: JSON.stringify(settings)
            });
        },

        async getReports(childId, period = 'week') {
            return api.request(`/api/parent/${childId}/report?period=${period}`);
        },

        async generateAIAnalysis(childId) {
            return api.request(`/api/parent/${childId}/analysis`, {
                method: 'POST'
            });
        },

        async bindChild(inviteCode) {
            return api.request('/api/parent/bind-child', {
                method: 'POST',
                body: JSON.stringify({ inviteCode })
            });
        },

        async unbindChild(childId) {
            return api.request(`/api/parent/unbind-child/${childId}`, {
                method: 'DELETE'
            });
        }
    },

    // 成就相关API
    achievement: {
        async getAll() {
            return api.request('/api/achievements');
        },

        async getUnlocked() {
            return api.request('/api/achievements/unlocked');
        }
    },

    // 离线存储管理器
    offline: {
        STORAGE_KEY: 'offline_data',

        save(key, data) {
            const offline = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            offline[key] = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offline));
        },

        load(key) {
            const offline = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            return offline[key]?.data || null;
        },

        async sync() {
            const offline = JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '{}');
            const keys = Object.keys(offline);

            for (const key of keys) {
                const item = offline[key];
                if (item.synced) continue;

                try {
                    // 根据数据类型决定同步到哪个API
                    if (key.startsWith('game_record_')) {
                        const sessionId = key.replace('game_record_', '');
                        await api.game.saveRecord(sessionId, 'nback', item.data);
                    }
                    item.synced = true;
                } catch (error) {
                    console.error(`同步失败: ${key}`, error);
                }
            }

            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(offline));
        },

        clear() {
            localStorage.removeItem(this.STORAGE_KEY);
        }
    }
};

// 网络状态监听
window.addEventListener('online', () => {
    console.log('网络已连接，正在同步离线数据...');
    api.offline.sync();
});

window.addEventListener('offline', () => {
    console.log('网络已断开，数据将暂存本地');
});

// 将 API 客户端暴露到全局，供 common.js 使用
window.api = api;
