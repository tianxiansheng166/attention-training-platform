/**
 * 报告生成服务
 * 生成专注力成长报告
 */

const axios = require('axios');

// DeepSeek API配置
const API_URL = 'https://api.deepseek.com/chat/completions';

/**
 * 生成专注力成长报告
 * @param {Object} data - 包含游戏记录、任务记录、情绪记录
 * @returns {Promise<Object>}
 */
async function generateReport(data) {
    const { gameRecords, taskRecords, emotionRecords } = data;

    // 计算统计数据
    const stats = calculateStats(gameRecords, taskRecords);

    // 如果有AI API密钥，生成AI评语
    if (process.env.DEEPSEEK_API_KEY) {
        try {
            const aiComment = await generateAIComment(stats);
            return {
                ...stats,
                aiComment: aiComment,
                generatedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('AI评语生成失败:', error.message);
            return {
                ...stats,
                aiComment: generateFallbackComment(stats),
                generatedAt: new Date().toISOString()
            };
        }
    }

    // 没有API密钥，返回基础报告
    return {
        ...stats,
        aiComment: generateFallbackComment(stats),
        generatedAt: new Date().toISOString()
    };
}

/**
 * 计算统计数据
 */
function calculateStats(gameRecords, taskRecords) {
    const allGameRecords = Object.values(gameRecords || {}).flat();
    const totalGames = allGameRecords.length;

    // 游戏统计
    const totalScore = allGameRecords.reduce((sum, r) => sum + (r.score || 0), 0);
    const avgScore = totalGames > 0 ? Math.round(totalScore / totalGames) : 0;
    const avgAccuracy = totalGames > 0
        ? Math.round(allGameRecords.reduce((sum, r) => sum + (r.accuracy || 0), 0) / totalGames)
        : 0;

    // 各维度统计
    const dimensionStats = {};
    for (const [game, records] of Object.entries(gameRecords || {})) {
        if (records.length > 0) {
            const lastRecord = records[records.length - 1];
            dimensionStats[game] = {
                timesPlayed: records.length,
                latestScore: lastRecord.score || 0,
                latestAccuracy: lastRecord.accuracy || 0,
                trend: calculateTrend(records.map(r => r.accuracy || 0))
            };
        }
    }

    // 任务统计
    const completedTasks = (taskRecords || []).filter(t => t.completed).length;
    const totalTasks = (taskRecords || []).length;
    const taskCompletionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // 综合评分（基于多个维度）
    const overallScore = Math.round(
        (avgAccuracy * 0.4) +
        (avgScore / 100 * 0.3) +
        (taskCompletionRate * 0.3)
    );

    return {
        overallScore: Math.min(100, overallScore),
        gameStats: {
            totalGames,
            avgScore,
            avgAccuracy,
            dimensionStats
        },
        taskStats: {
            totalTasks,
            completedTasks,
            taskCompletionRate
        },
        recommendations: generateRecommendations(dimensionStats, avgAccuracy)
    };
}

/**
 * 计算趋势
 */
function calculateTrend(values) {
    if (values.length < 2) return 'stable';

    const recent = values.slice(-3);
    const first = recent[0];
    const last = recent[recent.length - 1];
    const diff = last - first;

    if (diff > 10) return 'improving';
    if (diff < -10) return 'declining';
    return 'stable';
}

/**
 * 生成AI评语
 */
async function generateAIComment(stats) {
    const systemPrompt = `你是一个专注力训练专家，根据用户的训练数据提供个性化评语。

请遵循以下原则：
1. 积极正向，鼓励为主
2. 具体指出做得好的地方
3. 给出可操作的改进建议
4. 语言亲切，适合青少年
5. 评语长度控制在100-200字`;

    const userPrompt = `请为以下专注力训练数据生成评语：

综合得分：${stats.overallScore}分
游戏训练次数：${stats.gameStats.totalGames}
平均正确率：${stats.gameStats.avgAccuracy}%
任务完成率：${stats.taskStats.taskCompletionRate}%

请给出具体的评语和建议。`;

    try {
        const response = await axios.post(API_URL, {
            model: 'deepseek-chat',
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            temperature: 0.7,
            max_tokens: 500
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`
            },
            timeout: 15000
        });

        return response.data.choices[0].message.content;

    } catch (error) {
        throw error;
    }
}

/**
 * 生成备用评语（无API时）
 */
function generateFallbackComment(stats) {
    const { overallScore, gameStats } = stats;

    if (overallScore >= 80) {
        return `太棒了！你的专注力训练表现非常出色！继续保持这样积极的学习态度，相信你一定能在学习和生活中取得更大的进步！记得每天坚持训练哦！`;
    } else if (overallScore >= 60) {
        return `做得不错！你已经展现出了不错的专注力。继续加油，每天进步一点点，你会发现自己的专注力在不断提升！建议多尝试不同的训练游戏，挑战自己！`;
    } else if (overallScore >= 40) {
        return `开始得不错！专注力就像肌肉一样，需要不断练习才能变得更强。不要气馁，每天坚持训练，慢慢地你就会看到自己的进步！`;
    } else {
        return `别担心，每个人开始时都会这样！专注力是可以训练的。重要的是你愿意迈出第一步。给自己一些耐心，每天坚持几分钟，你会发现变化在悄然发生！`;
    }
}

/**
 * 生成建议
 */
function generateRecommendations(dimensionStats, avgAccuracy) {
    const recommendations = [];

    // 基于正确率的建议
    if (avgAccuracy < 50) {
        recommendations.push({
            type: '基础',
            content: '建议从简单的训练开始，逐步增加难度'
        });
    } else if (avgAccuracy > 80) {
        recommendations.push({
            type: '进阶',
            content: '你已经具备了不错的基础，可以尝试更高难度的挑战'
        });
    }

    // 基于游戏维度的建议
    if (dimensionStats.nback) {
        if (dimensionStats.nback.trend === 'declining') {
            recommendations.push({
                type: '工作记忆',
                content: '工作记忆训练表现有波动，注意保持规律练习'
            });
        }
    }

    if (dimensionStats.stop) {
        if (dimensionStats.stop.avgAccuracy < 70) {
            recommendations.push({
                type: '抑制控制',
                content: '在干扰中保持专注需要更多练习，多尝试星际拦截游戏'
            });
        }
    }

    // 通用建议
    recommendations.push({
        type: '习惯',
        content: '建议每天固定时间训练，形成良好的习惯'
    });

    recommendations.push({
        type: '休息',
        content: '训练之余要注意休息，保持充足的睡眠'
    });

    return recommendations;
}

/**
 * 简单情感分析
 */
async function analyzeEmotion(text) {
    // 简单的关键词匹配
    const positive = ['开心', '高兴', '快乐', '满意', '成功', '完成', '进步', '好', '棒', '不错'];
    const negative = ['困难', '失败', '沮丧', '累', '无聊', '烦躁', '焦虑', '担心'];

    let score = 0;

    for (const word of positive) {
        if (text.includes(word)) score += 1;
    }

    for (const word of negative) {
        if (text.includes(word)) score -= 1;
    }

    if (score > 0) {
        return { emotion: 'positive', confidence: Math.min(0.9, 0.5 + score * 0.1) };
    } else if (score < 0) {
        return { emotion: 'negative', confidence: Math.min(0.9, 0.5 - score * 0.1) };
    }

    return { emotion: 'neutral', confidence: 0.5 };
}

module.exports = {
    generateReport,
    analyzeEmotion
};
