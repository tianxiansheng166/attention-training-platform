/**
 * 家长控制台 JavaScript
 */

const parentPanel = {
    state: {
        currentChildId: null,
        childData: null,
        weeklyData: [],
        cognitiveData: {
            workingMemory: 0,
            inhibitoryControl: 0,
            visualSearch: 0,
            sustainedAttention: 0
        }
    },

    // 初始化
    init() {
        this.checkAuth();
        this.setTodayDate();
        this.loadChildData();
        this.loadWeeklyData();
        this.loadCognitiveData();
        this.loadSettings();
    },

    // 检查认证
    checkAuth() {
        console.log('[Parent] 检查认证状态...');
        console.log('[Parent] isLoggedIn:', api.isLoggedIn());
        console.log('[Parent] currentUser:', api.getCurrentUser());
        
        if (!api.isLoggedIn()) {
            console.warn('[Parent] 未登录，跳转到登录页');
            window.location.href = 'login.html';
            return;
        }
        
        const user = api.getCurrentUser();
        if (!user) {
            console.warn('[Parent] 用户信息不存在，跳转到登录页');
            window.location.href = 'login.html';
            return;
        }
        
        if (user.role !== 'parent') {
            console.warn('[Parent] 不是家长账号，角色:', user.role);
            if (user.role === 'child') {
                window.location.href = 'index.html';
            } else {
                window.location.href = 'login.html';
            }
            return;
        }
        
        console.log('[Parent] 认证通过，用户:', user.username);
    },

    // 设置今日日期
    setTodayDate() {
        const today = new Date();
        const options = { month: 'long', day: 'numeric', weekday: 'long' };
        document.getElementById('todayDate').textContent = today.toLocaleDateString('zh-CN', options);
    },

    // 加载孩子数据
    async loadChildData() {
        try {
            // 尝试从API加载
            const result = await api.parent.getChildren();
            // 兼容两种返回格式
            const children = result.data || result;
            
            if (children && children.length > 0) {
                const firstChild = children[0];
                this.state.currentChildId = firstChild.id;
                this.state.childData = firstChild;
                this.updateChildUI(firstChild);
                this.loadTodaySummary();
                this.loadWeeklyData();
                this.loadCognitiveData();
            } else {
                this.showNoChildrenMessage();
            }
        } catch (error) {
            console.error('加载孩子数据失败:', error);
            this.useDemoData();
        }
    },

    // 更新孩子UI
    updateChildUI(child) {
        document.getElementById('childName').textContent = child.name || '孩子账号';
        document.getElementById('weeklyTrainings').textContent = child.weeklyTrainings || 0;
        document.getElementById('focusScore').textContent = child.focusScore ? `${child.focusScore}分` : '--';
    },

    // 显示没有孩子的提示
    showNoChildrenMessage() {
        document.getElementById('todaySummary').innerHTML = `
            <div class="summary-empty">
                <div class="empty-icon">👶</div>
                <p>还没有绑定孩子账号</p>
                <p style="font-size: 0.8rem;">请先让孩子注册账号，然后绑定到您的账号</p>
            </div>
        `;
    },

    // 使用演示数据
    useDemoData() {
        const demoChild = {
            name: '小明',
            avatar: '👶',
            weeklyTrainings: 5,
            focusScore: 78
        };
        
        this.state.childData = demoChild;
        this.state.currentChildId = 'demo-child';
        this.updateChildUI(demoChild);
        
        // 加载演示今日数据
        this.loadDemoTodaySummary();
    },

    // 加载今日摘要
    async loadTodaySummary() {
        if (!this.state.currentChildId || this.state.currentChildId === 'demo-child') {
            this.loadDemoTodaySummary();
            return;
        }
        
        try {
            const result = await api.parent.getTodaySummary(this.state.currentChildId);
            // 兼容两种返回格式
            const summary = result.data || result;
            this.renderTodaySummary(summary);
        } catch (error) {
            console.error('加载今日摘要失败:', error);
            this.loadDemoTodaySummary();
        }
    },

    // 演示今日摘要
    loadDemoTodaySummary() {
        const demoSummary = {
            trainingCount: 2,
            totalMinutes: 25,
            avgScore: 82,
            games: [
                { name: '时空密码', score: 85, minutes: 10 },
                { name: '舒尔特方格', score: 79, minutes: 15 }
            ]
        };
        this.renderTodaySummary(demoSummary);
    },

    // 渲染今日摘要
    renderTodaySummary(summary) {
        const container = document.getElementById('todaySummary');
        
        if (summary.trainingCount === 0) {
            container.innerHTML = `
                <div class="summary-empty">
                    <div class="empty-icon">📝</div>
                    <p>今天还没有开始训练</p>
                    <p style="font-size: 0.8rem;">鼓励孩子开始今天的专注力训练吧！</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="summary-stats">
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.trainingCount}</div>
                    <div class="summary-stat-label">训练次数</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.totalMinutes}</div>
                    <div class="summary-stat-label">总时长(分钟)</div>
                </div>
                <div class="summary-stat">
                    <div class="summary-stat-value">${summary.avgScore || '--'}</div>
                    <div class="summary-stat-label">平均得分</div>
                </div>
            </div>
        `;
    },

    // 加载周数据
    async loadWeeklyData() {
        if (!this.state.currentChildId || this.state.currentChildId === 'demo-child') {
            this.loadDemoWeeklyData();
            return;
        }
        
        try {
            const result = await api.parent.getWeeklyData(this.state.currentChildId);
            // 兼容两种返回格式
            const data = result.data || result;
            this.state.weeklyData = data;
            this.renderWeeklyChart(data);
        } catch (error) {
            console.error('加载周数据失败:', error);
            this.loadDemoWeeklyData();
        }
    },

    // 演示周数据
    loadDemoWeeklyData() {
        const demoWeekly = [
            { day: '周一', minutes: 20, score: 75 },
            { day: '周二', minutes: 30, score: 80 },
            { day: '周三', minutes: 15, score: 72 },
            { day: '周四', minutes: 25, score: 85 },
            { day: '周五', minutes: 30, score: 78 },
            { day: '周六', minutes: 45, score: 88 },
            { day: '周日', minutes: 0, score: 0 }
        ];
        this.state.weeklyData = demoWeekly;
        this.renderWeeklyChart(demoWeekly);
    },

    // 渲染周趋势图
    renderWeeklyChart(data) {
        const maxMinutes = Math.max(...data.map(d => d.minutes), 1);
        
        const bars = document.querySelectorAll('.chart-bar');
        let trainDays = 0;
        let totalMinutes = 0;
        let totalScore = 0;
        let scoreCount = 0;

        data.forEach((d, i) => {
            const height = d.minutes > 0 ? (d.minutes / maxMinutes) * 100 : 0;
            bars[i].style.setProperty('--height', `${height}%`);
            
            if (d.minutes > 0) {
                trainDays++;
                totalMinutes += d.minutes;
                totalScore += d.score;
                scoreCount++;
            }
        });

        document.getElementById('trainDays').textContent = `${trainDays}/7`;
        document.getElementById('avgDuration').textContent = 
            trainDays > 0 ? `${Math.round(totalMinutes / trainDays)}分钟` : '--分钟';
        document.getElementById('avgScore').textContent = 
            scoreCount > 0 ? `${Math.round(totalScore / scoreCount)}分` : '--分';
    },

    // 加载认知数据
    async loadCognitiveData() {
        if (!this.state.currentChildId || this.state.currentChildId === 'demo-child') {
            this.loadDemoCognitiveData();
            return;
        }
        
        try {
            const result = await api.parent.getCognitiveData(this.state.currentChildId);
            // 兼容两种返回格式
            const data = result.data || result;
            this.state.cognitiveData = data;
            this.drawRadarChart(data);
        } catch (error) {
            console.error('加载认知数据失败:', error);
            this.loadDemoCognitiveData();
        }
    },

    // 演示认知数据
    loadDemoCognitiveData() {
        const demoData = {
            workingMemory: 75,
            inhibitoryControl: 68,
            visualSearch: 82,
            sustainedAttention: 70
        };
        this.state.cognitiveData = demoData;
        this.drawRadarChart(demoData);
    },

    // 绘制雷达图
    drawRadarChart(data) {
        const canvas = document.getElementById('radarCanvas');
        const ctx = canvas.getContext('2d');
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = 100;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const labels = ['工作记忆', '抑制控制', '视觉搜索', '持续注意'];
        const values = [data.workingMemory, data.inhibitoryControl, data.visualSearch, data.sustainedAttention];
        const colors = ['#667eea', '#f5576c', '#10b981', '#f59e0b'];
        
        // 绘制背景网格
        ctx.strokeStyle = '#e5e7eb';
        ctx.lineWidth = 1;
        
        for (let level = 1; level <= 5; level++) {
            ctx.beginPath();
            const r = (radius / 5) * level;
            for (let i = 0; i <= 4; i++) {
                const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
                const x = centerX + r * Math.cos(angle);
                const y = centerY + r * Math.sin(angle);
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.closePath();
            ctx.stroke();
        }

        // 绘制轴线
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.lineTo(centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle));
            ctx.stroke();
        }

        // 绘制数据区域
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
            const value = (values[i] / 100) * radius;
            const x = centerX + value * Math.cos(angle);
            const y = centerY + value * Math.sin(angle);
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.closePath();
        
        // 渐变填充
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
        gradient.addColorStop(0, 'rgba(102, 126, 234, 0.3)');
        gradient.addColorStop(1, 'rgba(102, 126, 234, 0.1)');
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 绘制数据点
        for (let i = 0; i < 4; i++) {
            const angle = (Math.PI * 2 / 4) * i - Math.PI / 2;
            const value = (values[i] / 100) * radius;
            const x = centerX + value * Math.cos(angle);
            const y = centerY + value * Math.sin(angle);
            
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, Math.PI * 2);
            ctx.fillStyle = colors[i];
            ctx.fill();
        }
    },

    // 刷新认知数据
    refreshCognitiveData() {
        this.loadCognitiveData();
    },

    // 加载设置
    loadSettings() {
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        
        document.getElementById('dailyTimeLimit').textContent = 
            settings.dailyMinutes ? `${settings.dailyMinutes}分钟` : '未设置';
        document.getElementById('bedtimeSetting').textContent = 
            settings.bedtime ? settings.bedtime : '未设置';
    },

    // 时间设置
    adjustTime(delta) {
        const input = document.getElementById('dailyMinutes');
        let value = parseInt(input.value) || 30;
        value = Math.max(10, Math.min(120, value + delta));
        input.value = value;
    },

    saveTimeSettings() {
        const dailyMinutes = document.getElementById('dailyMinutes').value;
        const reminderFreq = document.getElementById('reminderFreq').value;
        
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        settings.dailyMinutes = dailyMinutes;
        settings.reminderFreq = reminderFreq;
        localStorage.setItem('parentSettings', JSON.stringify(settings));
        
        this.loadSettings();
        this.closeModal('timeModal');
    },

    editDailyTime() {
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        document.getElementById('dailyMinutes').value = settings.dailyMinutes || 30;
        document.getElementById('reminderFreq').value = settings.reminderFreq || '30';
        document.getElementById('timeModal').classList.add('active');
    },

    // 游戏设置
    editAllowedGames() {
        const games = [
            { id: 'nback', name: '时空密码', icon: '🧠' },
            { id: 'stop', name: '星际拦截', icon: '🚀' },
            { id: 'search', name: '密林寻踪', icon: '🔍' },
            { id: 'vigil', name: '要塞守望', icon: '🏰' },
            { id: 'schulte', name: '舒尔特方格', icon: '🎯' },
            { id: 'stroop', name: '色彩Stroop', icon: '🎨' },
            { id: 'auditory', name: '听觉追踪', icon: '👂' },
            { id: 'dual', name: '双任务训练', icon: '🧠' }
        ];
        
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        const allowedGames = settings.allowedGames || games.map(g => g.id);
        
        const container = document.getElementById('gameToggles');
        container.innerHTML = games.map(game => `
            <div class="game-toggle">
                <div class="game-toggle-info">
                    <span class="game-toggle-icon">${game.icon}</span>
                    <span class="game-toggle-name">${game.name}</span>
                </div>
                <label class="toggle-switch">
                    <input type="checkbox" value="${game.id}" 
                        ${allowedGames.includes(game.id) ? 'checked' : ''}>
                    <span class="toggle-slider"></span>
                </label>
            </div>
        `).join('');
        
        document.getElementById('gamesModal').classList.add('active');
    },

    saveGameSettings() {
        const checkboxes = document.querySelectorAll('#gameToggles input:checked');
        const allowedGames = Array.from(checkboxes).map(cb => cb.value);
        
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        settings.allowedGames = allowedGames;
        localStorage.setItem('parentSettings', JSON.stringify(settings));
        
        document.getElementById('allowedGames').textContent = 
            allowedGames.length === 8 ? '全部' : `${allowedGames.length}个游戏`;
        this.closeModal('gamesModal');
    },

    // 切换孩子
    switchChild() {
        const children = [
            { id: 'child1', name: '小明', status: '在线' },
            { id: 'child2', name: '小红', status: '离线' }
        ];
        
        const container = document.getElementById('childrenList');
        container.innerHTML = children.map(child => `
            <div class="child-item ${child.id === this.state.currentChildId ? 'active' : ''}" 
                 onclick="parentPanel.selectChild('${child.id}')">
                <div class="child-item-avatar">${child.name[0]}</div>
                <div class="child-item-info">
                    <div class="child-item-name">${child.name}</div>
                    <div class="child-item-status">${child.status}</div>
                </div>
            </div>
        `).join('');
        
        document.getElementById('switchChildModal').classList.add('active');
    },

    selectChild(childId) {
        this.state.currentChildId = childId;
        this.loadChildData();
        this.loadWeeklyData();
        this.loadCognitiveData();
        this.closeModal('switchChildModal');
    },

    // 导航功能
    showTrainingHistory() {
        location.href = 'parent-report.html';
    },

    showGrowthReport() {
        location.href = 'parent-report.html';
    },

    showTimeSettings() {
        this.editDailyTime();
    },

    showContentFilter() {
        this.editAllowedGames();
    },

    manageChildren() {
        this.switchChild();
    },

    showAddChild() {
        this.closeModal('switchChildModal');
        document.getElementById('bindChildModal').classList.add('active');
        document.getElementById('inviteCodeInput').value = '';
        document.getElementById('bindResult').innerHTML = '';
    },

    async bindChildByCode() {
        const inviteCode = document.getElementById('inviteCodeInput').value.trim().toUpperCase();
        const resultDiv = document.getElementById('bindResult');
        const bindBtn = document.getElementById('bindChildBtn');
        
        if (!inviteCode || inviteCode.length < 6) {
            resultDiv.innerHTML = '<p style="color: #ef4444;">请输入正确的邀请码</p>';
            return;
        }
        
        bindBtn.disabled = true;
        bindBtn.textContent = '绑定中...';
        
        try {
            const result = await api.auth.bindByCode(inviteCode);
            if (result.success) {
                resultDiv.innerHTML = '<p style="color: #10b981;">✓ 绑定成功！正在刷新...</p>';
                setTimeout(() => {
                    this.closeModal('bindChildModal');
                    this.loadChildData();
                }, 1500);
            } else {
                resultDiv.innerHTML = `<p style="color: #ef4444;">✗ ${result.message || '绑定失败'}</p>`;
            }
        } catch (error) {
            resultDiv.innerHTML = `<p style="color: #ef4444;">✗ ${error.message || '绑定失败，请稍后重试'}</p>`;
        } finally {
            bindBtn.disabled = false;
            bindBtn.textContent = '绑定账号';
        }
    },

    showNotifications() {
        alert('暂无新通知');
    },

    // 登出
    logout() {
        if (confirm('确定要退出登录吗？')) {
            api.clearAuth();
            location.href = 'login.html';
        }
    },

    // 模态框
    closeModal(modalId) {
        document.getElementById(modalId).classList.remove('active');
    },

    editBedtime() {
        const bedtimes = ['20:00', '21:00', '21:30', '22:00', '22:30'];
        const current = JSON.parse(localStorage.getItem('parentSettings') || '{}').bedtime;
        
        const html = `
            <div class="form-group">
                <label>设置宵禁时间</label>
                <select id="bedtimeSelect" class="form-control">
                    <option value="">不设置</option>
                    ${bedtimes.map(t => `<option value="${t}" ${t === current ? 'selected' : ''}>${t}</option>`).join('')}
                </select>
            </div>
            <button class="btn-save" onclick="parentPanel.saveBedtime()">保存</button>
        `;
        
        this.showCustomModal('宵禁设置', html);
    },

    saveBedtime() {
        const bedtime = document.getElementById('bedtimeSelect').value;
        const settings = JSON.parse(localStorage.getItem('parentSettings') || '{}');
        settings.bedtime = bedtime;
        localStorage.setItem('parentSettings', JSON.stringify(settings));
        
        document.getElementById('bedtimeSetting').textContent = bedtime || '未设置';
        this.closeCustomModal();
    },

    showCustomModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'customModal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="modal-close" onclick="parentPanel.closeCustomModal()">×</button>
                </div>
                <div class="modal-body">${content}</div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    closeCustomModal() {
        const modal = document.getElementById('customModal');
        if (modal) modal.remove();
    },

    // 显示绑定孩子弹窗
    showBindChildModal() {
        this.showCustomModal('绑定孩子账号', `
            <div class="bind-child-form">
                <p style="margin-bottom: 15px; color: #666;">请输入孩子账号的邀请码进行绑定</p>
                <div class="form-group">
                    <label>邀请码</label>
                    <input type="text" id="bindInviteCode" placeholder="请输入8位邀请码" maxlength="8" style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 8px; font-size: 16px; text-transform: uppercase;">
                </div>
                <p style="font-size: 12px; color: #999; margin-top: 10px;">
                    💡 提示：邀请码可在孩子的个人主页中查看
                </p>
                <button onclick="parentPanel.bindChild()" style="width: 100%; padding: 12px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; margin-top: 15px;">
                    确认绑定
                </button>
            </div>
        `);
    },

    // 绑定孩子
    async bindChild() {
        const inviteCode = document.getElementById('bindInviteCode').value.trim().toUpperCase();
        
        if (!inviteCode || inviteCode.length < 6) {
            alert('请输入正确的邀请码');
            return;
        }

        console.log('[Parent] 开始绑定孩子，邀请码:', inviteCode);
        console.log('[Parent] 当前用户:', api.getCurrentUser());
        console.log('[Parent] Token 存在:', !!api.getToken());

        try {
            const result = await api.parent.bindChild(inviteCode);
            console.log('[Parent] 绑定结果:', result);
            
            if (result.success) {
                alert('绑定成功！');
                this.closeCustomModal();
                this.loadChildData();
            } else {
                alert(result.message || '绑定失败');
            }
        } catch (error) {
            console.error('绑定孩子失败:', error);
            
            if (error.message.includes('401') || error.message.includes('未授权') || error.message.includes('过期')) {
                alert('登录已过期，请重新登录');
                api.clearAuth();
                window.location.href = 'login.html';
                return;
            }
            
            alert(error.message || '绑定失败，请重试');
        }
    },

    // 解绑孩子
    async unbindChild(childId) {
        if (!confirm('确定要解绑这个孩子账号吗？')) return;

        try {
            const result = await api.parent.unbindChild(childId);
            if (result.success) {
                alert('解绑成功');
                this.loadChildData();
            } else {
                alert(result.message || '解绑失败');
            }
        } catch (error) {
            console.error('解绑孩子失败:', error);
            alert(error.message || '解绑失败');
        }
    }
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', () => {
    parentPanel.init();
});

// 全局函数别名 - 供 HTML onclick 调用
function switchChild() { parentPanel.switchChild(); }
function showTrainingHistory() { parentPanel.showTrainingHistory(); }
function showGrowthReport() { parentPanel.showGrowthReport(); }
function showTimeSettings() { parentPanel.showTimeSettings(); }
function showContentFilter() { parentPanel.showContentFilter(); }
function showNotifications() { parentPanel.showNotifications(); }
function logout() { parentPanel.logout(); }
function closeModal(modalId) { parentPanel.closeModal(modalId); }
function adjustTime(delta) { parentPanel.adjustTime(delta); }
function saveTimeSettings() { parentPanel.saveTimeSettings(); }
function editDailyTime() { parentPanel.editDailyTime(); }
function editBedtime() { parentPanel.editBedtime(); }
function editAllowedGames() { parentPanel.editAllowedGames(); }
function saveGameSettings() { parentPanel.saveGameSettings(); }
function refreshCognitiveData() { parentPanel.refreshCognitiveData(); }
function showBindChildModal() { parentPanel.showBindChildModal(); }
function bindChild() { parentPanel.bindChild(); }
function unbindChild(childId) { parentPanel.unbindChild(childId); }
