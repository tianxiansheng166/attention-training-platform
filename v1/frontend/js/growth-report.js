/**
 * 成长报告页面
 */

let trendChart = null;

async function loadReport() {
    const loadingState = document.getElementById('loading-state');
    const reportContent = document.getElementById('report-content');
    const noDataState = document.getElementById('no-data-state');

    // 获取游戏记录
    const gameRecords = Storage.getGameRecords();

    // 检查是否有数据
    const hasData = Object.keys(gameRecords).some(key => gameRecords[key]?.length > 0);

    if (!hasData) {
        loadingState.classList.add('hidden');
        noDataState.classList.remove('hidden');
        return;
    }

    try {
        // 调用API生成报告
        const response = await API.generateReport({
            gameRecords,
            taskRecords: Storage.getTasks(),
            emotionRecords: Storage.getEmotionRecords()
        });

        if (response.success) {
            displayReport(response.report);
            loadingState.classList.add('hidden');
            reportContent.classList.remove('hidden');
        } else {
            throw new Error('报告生成失败');
        }
    } catch (error) {
        console.error('报告生成失败:', error);
        // 使用本地数据生成基础报告
        displayLocalReport(gameRecords);
        loadingState.classList.add('hidden');
        reportContent.classList.remove('hidden');
    }
}

function displayReport(report) {
    // 设置日期
    const now = new Date();
    document.getElementById('report-date').textContent =
        `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 成长报告`;

    // 设置综合得分
    document.getElementById('overall-score').textContent = report.overallScore || 0;

    // 设置统计数据
    document.getElementById('total-games').textContent = report.gameStats?.totalGames || 0;
    document.getElementById('avg-accuracy').textContent =
        `${report.gameStats?.avgAccuracy || 0}%`;
    document.getElementById('avg-score').textContent = report.gameStats?.avgScore || 0;

    // 设置AI评语
    if (report.aiComment) {
        document.getElementById('ai-comment').innerHTML = `
            <strong>✨ AI评语：</strong><br>
            ${report.aiComment}
        `;
    }

    // 绘制图表
    drawChart(report.gameStats);

    // 显示建议
    displayRecommendations(report.recommendations);
}

function displayLocalReport(gameRecords) {
    // 计算本地统计数据
    const allRecords = Object.values(gameRecords).flat();
    const totalGames = allRecords.length;
    const avgAccuracy = totalGames > 0
        ? Math.round(allRecords.reduce((sum, r) => sum + (r.accuracy || 0), 0) / totalGames)
        : 0;
    const avgScore = totalGames > 0
        ? Math.round(allRecords.reduce((sum, r) => sum + (r.score || 0), 0) / totalGames)
        : 0;

    const overallScore = Math.min(100, Math.round(avgAccuracy * 0.6 + (avgScore / 10) * 0.4));

    // 设置日期
    const now = new Date();
    document.getElementById('report-date').textContent =
        `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 成长报告`;

    // 设置统计数据
    document.getElementById('overall-score').textContent = overallScore;
    document.getElementById('total-games').textContent = totalGames;
    document.getElementById('avg-accuracy').textContent = `${avgAccuracy}%`;
    document.getElementById('avg-score').textContent = avgScore;

    // 生成基础评语
    let comment = '';
    if (overallScore >= 80) {
        comment = '太棒了！你的专注力表现非常出色！继续保持这样积极的学习态度！';
    } else if (overallScore >= 60) {
        comment = '做得不错！你已经展现出了不错的专注力。继续加油，每天进步一点点！';
    } else if (overallScore >= 40) {
        comment = '开始得不错！专注力就像肌肉一样，需要不断练习才能变得更强。';
    } else {
        comment = '别担心，每个人开始时都会这样！重要的是你愿意迈出第一步。';
    }

    document.getElementById('ai-comment').innerHTML = `
        <strong>✨ 评语：</strong><br>
        ${comment}
    `;

    // 绘制图表
    drawLocalChart(gameRecords);

    // 显示建议
    displayLocalRecommendations(avgAccuracy);
}

function drawChart(gameStats) {
    const ctx = document.getElementById('trend-chart').getContext('2d');

    // 准备数据
    const datasets = [];
    const labels = [];
    const colors = ['#667eea', '#4CAF50', '#FF9800', '#9C27B0'];

    let index = 0;
    for (const [game, records] of Object.entries(gameStats.dimensionStats || {})) {
        const data = records.slice(-7).map((r, i) => r.accuracy || 0);
        const gameLabels = records.slice(-7).map((r, i) => `第${i + 1}次`);

        datasets.push({
            label: getGameName(game),
            data: data,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length] + '33',
            tension: 0.4,
            fill: true
        });

        if (index === 0) {
            labels.push(...gameLabels);
        }

        index++;
    }

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length > 0 ? labels : ['暂无数据'],
            datasets: datasets.length > 0 ? datasets : [{
                label: '暂无数据',
                data: [0],
                borderColor: '#ccc',
                backgroundColor: '#f0f0f0',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '正确率 (%)'
                    }
                }
            }
        }
    });
}

function drawLocalChart(gameRecords) {
    const ctx = document.getElementById('trend-chart').getContext('2d');

    const allRecords = Object.values(gameRecords).flat();
    const recentRecords = allRecords.slice(-10);

    const labels = recentRecords.map((r, i) => `第${i + 1}次`);
    const scores = recentRecords.map(r => r.score || 0);
    const accuracies = recentRecords.map(r => r.accuracy || 0);

    if (trendChart) {
        trendChart.destroy();
    }

    trendChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: '得分',
                    data: scores,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y'
                },
                {
                    label: '正确率 (%)',
                    data: accuracies,
                    borderColor: '#4CAF50',
                    backgroundColor: 'rgba(76, 175, 80, 0.1)',
                    tension: 0.4,
                    yAxisID: 'y1'
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    position: 'top'
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    display: true,
                    position: 'left',
                    title: {
                        display: true,
                        text: '得分'
                    }
                },
                y1: {
                    type: 'linear',
                    display: true,
                    position: 'right',
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: '正确率 (%)'
                    },
                    grid: {
                        drawOnChartArea: false
                    }
                }
            }
        }
    });
}

function displayRecommendations(recommendations) {
    const container = document.getElementById('recommendations-list');
    container.innerHTML = '';

    recommendations.forEach(rec => {
        const item = document.createElement('div');
        item.className = 'recommendation-item';
        item.innerHTML = `
            <span class="recommendation-type">${rec.type}</span>
            <p>${rec.content}</p>
        `;
        container.appendChild(item);
    });
}

function displayLocalRecommendations(avgAccuracy) {
    const recommendations = [];

    if (avgAccuracy < 50) {
        recommendations.push({
            type: '基础',
            content: '建议从简单的训练开始，逐步增加难度。每天坚持训练10-15分钟。'
        });
    } else if (avgAccuracy > 80) {
        recommendations.push({
            type: '进阶',
            content: '你已经具备了不错的基础，可以尝试更高难度的挑战！'
        });
    }

    recommendations.push({
        type: '习惯',
        content: '建议每天固定时间训练，形成良好的习惯。'
    });

    recommendations.push({
        type: '休息',
        content: '训练之余要注意休息，保持充足的睡眠。'
    });

    displayRecommendations(recommendations);
}

function getGameName(game) {
    const names = {
        nback: '时空密码',
        stop: '星际拦截',
        search: '密林寻踪',
        vigil: '要塞守望'
    };
    return names[game] || game;
}

// 页面加载时生成报告
document.addEventListener('DOMContentLoaded', loadReport);
