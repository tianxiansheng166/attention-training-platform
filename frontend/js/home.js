/**
 * 专注力星球 - 首页逻辑
 * 专注力初始测试
 */

// ========================================
// 初始定级测试
// ========================================

let testState = {
    isRunning: false,
    testStartTime: null,
    trials: [],
    currentTrial: 0,
    totalTrials: 15,
    timeoutId: null,
    startTime: null
};

async function startInitialTest() {
    const container = document.getElementById('test-container');
    const testInfo = document.getElementById('test-info');
    const circle = document.getElementById('test-circle');

    // 显示测试容器
    container.classList.remove('hidden');

    // 重置状态
    testState = {
        isRunning: true,
        trials: [],
        currentTrial: 0,
        totalTrials: 15
    };

    testInfo.textContent = '准备开始...';
    circle.className = 'test-circle';

    // 延迟开始
    await delay(1000);

    // 开始测试
    runNextTrial();
}

function runNextTrial() {
    if (testState.currentTrial >= testState.totalTrials) {
        finishTest();
        return;
    }

    const testInfo = document.getElementById('test-info');
    const circle = document.getElementById('test-circle');

    testInfo.textContent = `测试进行中 (${testState.currentTrial + 1}/${testState.totalTrials})`;

    // 随机决定绿色还是红色（70%绿色，30%红色）
    const isGreen = Math.random() < 0.7;
    const trialDuration = 1000 + Math.random() * 1000; // 1-2秒

    // 随机延迟
    const delayTime = 500 + Math.random() * 1500; // 0.5-2秒

    testState.timeoutId = setTimeout(() => {
        // 显示圆圈
        circle.className = isGreen ? 'test-circle green' : 'test-circle red';
        testState.startTime = Date.now();

        // 记录试次
        testState.currentTrial++;

        // 设置消失时间
        testState.timeoutId = setTimeout(() => {
            circle.className = 'test-circle';

            // 记录结果（如果没有点击）
            if (isGreen) {
                testState.trials.push({
                    type: 'green',
                    responded: false,
                    correct: false,
                    reactionTime: null
                });
            } else {
                // 红色没反应是正确的
                testState.trials.push({
                    type: 'red',
                    responded: false,
                    correct: true,
                    reactionTime: null
                });
            }

            // 下一个试次
            runNextTrial();
        }, trialDuration);
    }, delayTime);
}

function handleTestClick() {
    if (!testState.isRunning || !testState.startTime) return;

    const circle = document.getElementById('test-circle');
    const reactionTime = Date.now() - testState.startTime;

    clearTimeout(testState.timeoutId);

    // 安全获取当前试次，如果不存在则创建一个
    let currentTrial = testState.trials[testState.trials.length - 1];
    if (!currentTrial) {
        currentTrial = {
            type: circle.classList.contains('green') ? 'green' : 'red',
            responded: false,
            correct: false,
            reactionTime: null
        };
        testState.trials.push(currentTrial);
    }

    if (circle.classList.contains('green')) {
        // 绿色点击是正确的
        currentTrial.responded = true;
        currentTrial.correct = true;
        currentTrial.reactionTime = reactionTime;
    } else {
        // 红色点击是错误的
        currentTrial.responded = true;
        currentTrial.correct = false;
        currentTrial.reactionTime = reactionTime;
    }

    // 隐藏圆圈并继续
    circle.className = 'test-circle';
    testState.startTime = null;

    // 如果还没到当前试次，继续
    if (testState.currentTrial < testState.totalTrials) {
        setTimeout(() => runNextTrial(), 500);
    } else {
        finishTest();
    }
}

function finishTest() {
    testState.isRunning = false;
    const testInfo = document.getElementById('test-info');

    // 计算结果
    const results = calculateTestResults();

    // 保存等级
    const level = determineLevel(results.accuracy, results.averageReactionTime);
    Storage.setUserLevel(level);

    // 显示结果
    showTestResult(level, results);

    // 隐藏测试容器
    document.getElementById('test-container').classList.add('hidden');
}

function calculateTestResults() {
    const correct = testState.trials.filter(t => t.correct).length;
    const accuracy = Math.round((correct / testState.totalTrials) * 100);

    const reactionTimes = testState.trials
        .filter(t => t.reactionTime !== null)
        .map(t => t.reactionTime);

    const averageReactionTime = reactionTimes.length > 0
        ? Math.round(reactionTimes.reduce((a, b) => a + b, 0) / reactionTimes.length)
        : 0;

    return {
        accuracy,
        averageReactionTime,
        correct,
        total: testState.totalTrials
    };
}

function determineLevel(accuracy, reactionTime) {
    // 简单的等级判定
    if (accuracy >= 80 && reactionTime < 600) {
        return '高级';
    } else if (accuracy >= 60 && reactionTime < 800) {
        return '中级';
    } else {
        return '初级';
    }
}

function showTestResult(level, results) {
    // 更新等级显示
    const levelDisplay = document.getElementById('user-level-display');
    levelDisplay.textContent = `等级: ${level}`;
    levelDisplay.className = `level-badge ${level}`;

    // 显示结果消息
    const msg = document.createElement('div');
    msg.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: linear-gradient(135deg, #4CAF50, #45a049);
        color: white;
        padding: 40px 60px;
        border-radius: 20px;
        font-size: 1.3rem;
        text-align: center;
        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        z-index: 1000;
        animation: slideDown 0.3s ease-out;
        max-width: 500px;
    `;

    msg.innerHTML = `
        <h2 style="margin-bottom: 20px; font-size: 2rem;">🎉 定级成功！</h2>
        <p style="margin-bottom: 15px; font-size: 1.5rem; font-weight: 700;">你的专注力等级：<strong>${level}</strong></p>
        <div style="background: rgba(255,255,255,0.2); padding: 20px; border-radius: 10px; margin-top: 20px; text-align: left;">
            <p style="margin: 8px 0;">✓ 正确率: ${results.accuracy}%</p>
            <p style="margin: 8px 0;">⚡ 平均反应时间: ${results.averageReactionTime}ms</p>
            <p style="margin: 8px 0;">📊 正确次数: ${results.correct}/${results.total}</p>
        </div>
        <p style="margin-top: 20px; font-size: 0.95rem; opacity: 0.9;">页面将自动跳转...</p>
    `;

    document.body.appendChild(msg);

    // 自动关闭
    setTimeout(() => {
        msg.style.animation = 'slideUp 0.3s ease-in';
        setTimeout(() => msg.remove(), 300);
    }, 4000);
}

// ========================================
// 辅助函数
// ========================================

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ========================================
// 事件监听
// ========================================

// 键盘事件
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        if (testState.isRunning) {
            handleTestClick();
        }
    }
});

// 点击事件
document.getElementById('test-circle')?.addEventListener('click', () => {
    if (testState.isRunning) {
        handleTestClick();
    }
});

// ========================================
// 初始化
// ========================================

function updateAuthUI() {
    const userInfo = document.getElementById('user-info');
    const loginLink = document.getElementById('login-link');
    const registerLink = document.getElementById('register-link');
    const logoutBtn = document.getElementById('logout-btn');
    const levelDisplay = document.getElementById('user-level-display');
    const parentLink = document.getElementById('parent-link');

    if (api.isLoggedIn()) {
        const user = api.getCurrentUser();
        userInfo.textContent = user.name || user.email.split('@')[0];
        userInfo.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        loginLink.classList.add('hidden');
        registerLink.classList.add('hidden');
        levelDisplay.classList.remove('hidden');
        
        // 添加个人中心链接
        if (user.role !== 'parent') {
            let profileLink = document.getElementById('profile-link');
            if (!profileLink) {
                profileLink = document.createElement('a');
                profileLink.id = 'profile-link';
                profileLink.href = 'profile.html';
                profileLink.className = 'nav-link';
                profileLink.textContent = '👤 个人中心';
                registerLink.parentNode.insertBefore(profileLink, registerLink);
            } else {
                profileLink.classList.remove('hidden');
            }
            
            // 儿童登录时隐藏家长链接
            if (parentLink) {
                parentLink.classList.add('hidden');
            }
        } else {
            // 家长登录时显示家长链接
            if (parentLink) {
                parentLink.classList.remove('hidden');
            }
        }
    } else {
        userInfo.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        loginLink.classList.remove('hidden');
        registerLink.classList.remove('hidden');
        levelDisplay.classList.add('hidden');
        
        const profileLink = document.getElementById('profile-link');
        if (profileLink) {
            profileLink.classList.add('hidden');
        }
        
        // 未登录时显示家长链接
        if (parentLink) {
            parentLink.classList.remove('hidden');
        }
    }
}

function handleParentLinkClick(event) {
    if (api.isLoggedIn()) {
        const user = api.getCurrentUser();
        if (user && user.role === 'child') {
            // 儿童用户点击家长链接，跳转到登录页面
            event.preventDefault();
            window.location.href = 'login.html';
            return false;
        }
    }
    // 未登录或家长用户，正常跳转到 parent.html
    event.target.href = 'parent.html';
    return true;
}

function handleLogout() {
    api.clearAuth();
    updateAuthUI();
    window.location.href = 'index.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // 更新认证UI
    updateAuthUI();

    // 退出登录按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 更新等级显示
    const currentLevel = Storage.getUserLevel();
    const levelDisplay = document.getElementById('user-level-display');

    if (levelDisplay && currentLevel !== '未定级') {
        levelDisplay.textContent = `等级: ${currentLevel}`;
        levelDisplay.className = `level-badge ${currentLevel}`;
    }

    // 如果已定级，隐藏测试部分
    const testSection = document.getElementById('initial-test-section');
    if (testSection && currentLevel !== '未定级') {
        testSection.style.display = 'none';
    }
});
