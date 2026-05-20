/**
 * 成长报告 JavaScript
 */

const growthReport = {
    state: {
        period: 'week',
        data: null,
        childId: null
    },

    // 初始化
    init() {
        this.state.childId = localStorage.getItem('currentChildId') || 'demo';
        this.setupEventListeners();
        this.loadReportData();
    },

    // 设置事件监听
    setupEventListeners() {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.state.period = btn.dataset.period;
                this.loadReportData();
            });
        });
    },

    // 加载报告数据
    async loadReportData() {
        try {
            const data = await this.fetchReportData();
            this.state.data = data;
            this.renderReport(data);
        } catch (error) {
            this.loadDemoData();
        }
    },

    // 获取报告数据
    async fetchReportData() {
        try {
            const result = await api.request(`/api/reports/${this.state.childId}?period=${this.state.period}`);
            if (result.success && result.data) {
                return result.data;
            }
            throw new Error('获取数据失败');
        } catch {
            throw new Error('获取数据失败');
        }
    },

    // 演示数据
    loadDemoData() {
        const demoData = {
            avgAccuracy: 82,
            avgAccuracyTrend: 5,
            totalMinutes: 180,
            totalMinutesTrend: 30,
            trainDays: 6,
            trainDaysTrend: 2,
            focusScore: 85,
            focusScoreTrend: 8,
            calendar: this.generateDemoCalendar(),
            games: [
                { id: 'nback', name: '时空密码', icon: '🧠', score: 88, trend: 5 },
                { id: 'stop', name: '星际拦截', icon: '🚀', score: 75, trend: -3 },
                { id: 'search', name: '密林寻踪', icon: '🔍', score: 85, trend: 8 },
                { id: 'vigil', name: '要塞守望', icon: '🏰', score: 80, trend: 2 },
                { id: 'schulte', name: '舒尔特方格', icon: '🎯', score: 90, trend: 12 },
                { id: 'stroop', name: '色彩Stroop', icon: '🎨', score: 68, trend: -5 },
                { id: 'auditory', name: '听觉追踪', icon: '👂', score: 78, trend: 0 },
                { id: 'dual', name: '双任务训练', icon: '🧠', score: 72, trend: 10 }
            ],
            cognitive: {
                workingMemory: { score: 75, trend: 5 },
                inhibitoryControl: { score: 68, trend: -3 },
                visualSearch: { score: 85, trend: 8 },
                sustainedAttention: { score: 78, trend: 2 }
            },
            achievements: [
                { id: 'first', name: '初次训练', icon: '🌟', unlocked: true },
                { id: 'week7', name: '连续7天', icon: '🔥', unlocked: true },
                { id: 'score90', name: '90分达成', icon: '💯', unlocked: true },
                { id: 'master', name: '游戏大师', icon: '🏆', unlocked: false },
                { id: 'legend', name: '专注传奇', icon: '👑', unlocked: false },
                { id: 'perfect', name: '完美主义者', icon: '💎', unlocked: false }
            ]
        };
        
        this.state.data = demoData;
        this.renderReport(demoData);
    },

    // 生成演示日历
    generateDemoCalendar() {
        const calendar = [];
        const today = new Date();
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + i);
            
            const day = date.getDate();
            const trained = Math.random() > 0.3;
            const excellent = trained && Math.random() > 0.6;
            
            calendar.push({
                day,
                trained,
                excellent,
                score: trained ? Math.floor(Math.random() * 30 + 70) : 0
            });
        }
        
        return calendar;
    },

    // 渲染报告
    renderReport(data) {
        this.renderCoreMetrics(data);
        this.renderCalendar(data.calendar);
        this.renderGamePerformance(data.games);
        this.renderCognitiveTrend(data.cognitive);
        this.renderAchievements(data.achievements);
        this.renderComparison(data);
    },

    // 渲染核心指标
    renderCoreMetrics(data) {
        document.getElementById('avgAccuracy').textContent = `${data.avgAccuracy}%`;
        document.getElementById('totalMinutes').textContent = data.totalMinutes;
        document.getElementById('trainDays').textContent = data.trainDays;
        document.getElementById('focusScore').textContent = data.focusScore;
        
        this.updateTrend('avgAccuracy', data.avgAccuracyTrend);
        this.updateTrend('totalMinutes', data.totalMinutesTrend);
        this.updateTrend('trainDays', data.trainDaysTrend);
        this.updateTrend('focusScore', data.focusScoreTrend);
    },

    // 更新趋势
    updateTrend(elementId, trend) {
        const el = document.getElementById(elementId).parentElement.querySelector('.metric-trend');
        if (el) {
            el.className = `metric-trend ${trend >= 0 ? 'up' : 'down'}`;
            el.textContent = `${trend >= 0 ? '↑' : '↓'} ${Math.abs(trend)}%`;
        }
    },

    // 渲染日历
    renderCalendar(calendar) {
        const grid = document.getElementById('calendarGrid');
        const days = ['一', '二', '三', '四', '五', '六', '日'];
        
        grid.innerHTML = days.map((day, i) => `
            <div class="calendar-day ${calendar[i]?.trained ? (calendar[i].excellent ? 'excellent' : 'trained') : ''}">
                <span class="day-num">${calendar[i]?.day || ''}</span>
                <span class="day-label">${day}</span>
            </div>
        `).join('');
    },

    // 渲染游戏表现
    renderGamePerformance(games) {
        const list = document.getElementById('performanceList');
        const icons = {
            nback: '🧠', stop: '🚀', search: '🔍', vigil: '🏰',
            schulte: '🎯', stroop: '🎨', auditory: '👂', dual: '🧠'
        };
        
        list.innerHTML = games.map(game => `
            <div class="performance-item">
                <div class="performance-icon">${icons[game.id] || '🎮'}</div>
                <div class="performance-info">
                    <div class="performance-name">${game.name}</div>
                    <div class="performance-bar">
                        <div class="performance-fill" style="width: ${game.score}%"></div>
                    </div>
                </div>
                <div class="performance-score">${game.score}</div>
            </div>
        `).join('');
    },

    // 渲染认知趋势
    renderCognitiveTrend(cognitive) {
        this.drawTrendChart(cognitive);
        
        document.getElementById('wmTrend').textContent = `${cognitive.workingMemory.score}% (${this.formatTrend(cognitive.workingMemory.trend)})`;
        document.getElementById('icTrend').textContent = `${cognitive.inhibitoryControl.score}% (${this.formatTrend(cognitive.inhibitoryControl.trend)})`;
        document.getElementById('vsTrend').textContent = `${cognitive.visualSearch.score}% (${this.formatTrend(cognitive.visualSearch.trend)})`;
        document.getElementById('saTrend').textContent = `${cognitive.sustainedAttention.score}% (${this.formatTrend(cognitive.sustainedAttention.trend)})`;
    },

    // 格式化趋势
    formatTrend(trend) {
        return trend >= 0 ? `+${trend}%` : `${trend}%`;
    },

    // 绘制趋势图
    drawTrendChart(cognitive) {
        const canvas = document.getElementById('trendCanvas');
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const padding = 30;
        
        ctx.clearRect(0, 0, width, height);
        
        const labels = ['工作记忆', '抑制控制', '视觉搜索', '持续注意'];
        const values = [
            cognitive.workingMemory.score,
            cognitive.inhibitoryControl.score,
            cognitive.visualSearch.score,
            cognitive.sustainedAttention.score
        ];
        const colors = ['#667eea', '#f5576c', '#10b981', '#f59e0b'];
        
        const chartWidth = width - padding * 2;
        const chartHeight = height - padding * 2;
        
        // 绘制网格线
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = padding + (chartHeight / 4) * i;
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width - padding, y);
            ctx.stroke();
        }
        
        // 绘制数据点和连接线
        const pointSpacing = chartWidth / (labels.length - 1);
        
        labels.forEach((label, i) => {
            const x = padding + pointSpacing * i;
            const y = padding + chartHeight - (values[i] / 100) * chartHeight;
            
            // 绘制点
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fillStyle = colors[i];
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 绘制标签
            ctx.fillStyle = '#6b7280';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(label, x, height - 8);
        });
    },

    // 渲染成就
    renderAchievements(achievements) {
        const grid = document.getElementById('achievementGrid');
        
        grid.innerHTML = achievements.map(achievement => `
            <div class="achievement-badge">
                <div class="achievement-icon" style="${!achievement.unlocked ? 'opacity: 0.3; filter: grayscale(100%);' : ''}">
                    ${achievement.icon}
                </div>
                <div class="achievement-name">${achievement.name}</div>
            </div>
        `).join('');
    },

    // 渲染对比
    renderComparison(data) {
        const percent = Math.min(100, Math.max(0, data.focusScore + 5));
        const bar = document.querySelector('.comparison-bar.self');
        if (bar) {
            bar.style.width = `${data.focusScore}%`;
        }
    },

    // 刷新分析
    async refreshAnalysis() {
        const btn = document.querySelector('.btn-refresh-analysis');
        btn.textContent = '分析中...';
        btn.disabled = true;
        
        try {
            // 模拟API调用
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // 更新分析内容
            const newAnalysis = this.generateAnalysis(this.state.data);
            this.updateAnalysisContent(newAnalysis);
        } catch (error) {
            console.error('分析刷新失败:', error);
        } finally {
            btn.textContent = '🔄 重新生成分析';
            btn.disabled = false;
        }
    },

    // 生成分析
    generateAnalysis(data) {
        const strengths = [];
        const weaknesses = [];
        
        // 分析游戏表现
        const sortedGames = [...data.games].sort((a, b) => b.score - a.score);
        const topGame = sortedGames[0];
        const bottomGame = sortedGames[sortedGames.length - 1];
        
        if (topGame.score >= 85) {
            strengths.push(`${topGame.name}表现优秀，正确率达到${topGame.score}%`);
        }
        
        if (bottomGame.score < 70) {
            weaknesses.push(`${bottomGame.name}需要加强，当前正确率${bottomGame.score}%`);
        }
        
        // 分析认知能力
        const cognitiveEntries = Object.entries(data.cognitive).sort((a, b) => b[1].score - a[1].score);
        const bestCognitive = cognitiveEntries[0];
        const worstCognitive = cognitiveEntries[cognitiveEntries.length - 1];
        
        strengths.push(`${this.getCognitiveName(bestCognitive[0])}能力较强`);
        if (worstCognitive[1].score < 70) {
            weaknesses.push(`${this.getCognitiveName(worstCognitive[0])}需要重点训练`);
        }
        
        return {
            strengths,
            weaknesses,
            suggestions: this.generateSuggestions(data)
        };
    },

    // 获取认知维度名称
    getCognitiveName(key) {
        const names = {
            workingMemory: '工作记忆',
            inhibitoryControl: '抑制控制',
            visualSearch: '视觉搜索',
            sustainedAttention: '持续注意'
        };
        return names[key] || key;
    },

    // 生成建议
    generateSuggestions(data) {
        const suggestions = [];
        
        if (data.cognitive.inhibitoryControl.score < 75) {
            suggestions.push({
                title: '加强抑制控制训练',
                desc: '每天进行3-5分钟的色彩Stroop任务，有助于提升抑制自动反应的能力。'
            });
        }
        
        if (data.trainDays < 5) {
            suggestions.push({
                title: '保持训练规律性',
                desc: '建议固定每天的训练时间，形成良好的训练习惯，提高训练效果。'
            });
        }
        
        if (data.cognitive.workingMemory.score < 75) {
            suggestions.push({
                title: '提升工作记忆',
                desc: '时空密码和听觉追踪训练可以有效提升工作记忆能力。'
            });
        }
        
        return suggestions.slice(0, 3);
    },

    // 更新分析内容
    updateAnalysisContent(analysis) {
        const overallEl = document.getElementById('overallAnalysis');
        const pointsEl = document.getElementById('keyPoints');
        const suggestionListEl = document.getElementById('suggestionList');
        
        if (analysis.strengths.length > 0) {
            overallEl.innerHTML = `孩子在训练中展现了<span style="color: #059669; font-weight: 600;">${analysis.strengths[0]}</span>。${analysis.weaknesses.length > 0 ? analysis.weaknesses[0] + '。' : ''}`;
        }
        
        pointsEl.innerHTML = analysis.weaknesses.map(w => `<li>${w}</li>`).join('');
        
        suggestionListEl.innerHTML = analysis.suggestions.map((s, i) => `
            <div class="suggestion-item">
                <span class="suggestion-num">${i + 1}</span>
                <div class="suggestion-content">
                    <strong>${s.title}</strong>
                    <p>${s.desc}</p>
                </div>
            </div>
        `).join('');
    },

    // 分享报告
    shareReport() {
        if (navigator.share) {
            navigator.share({
                title: '专注力星球 - 成长报告',
                text: `我的专注力指数达到${this.state.data?.focusScore || '--'}分！`,
                url: window.location.href
            });
        } else {
            // 复制链接
            navigator.clipboard.writeText(window.location.href);
            alert('报告链接已复制到剪贴板！');
        }
    },

    // 导出PDF
    exportPDF() {
        alert('PDF导出功能开发中...');
    },

    // 导出数据
    exportData() {
        const dataStr = JSON.stringify(this.state.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `growth-report-${this.state.period}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    growthReport.init();
});
