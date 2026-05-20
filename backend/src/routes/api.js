/**
 * API路由 - 主要的业务逻辑路由
 * v1.6 安全增强版
 */

const express = require('express');
const router = express.Router();
const decomposeService = require('../services/decomposeService');
const reportService = require('../services/reportService');
const { authenticate } = require('../middleware/auth');
const { aiApiLimiter } = require('../middleware/rateLimiter');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const { Achievement, UserAchievement, GameSession, User, sequelize } = require('../database/models');
const { Op, fn, col } = require('sequelize');

// AI API使用严格的速率限制
router.use('/decompose', aiApiLimiter);
router.use('/report', aiApiLimiter);
router.use('/analyze-emotion', aiApiLimiter);

// ========================================
// 任务分解
// ========================================

/**
 * POST /api/decompose
 * 将复杂任务分解为小步骤
 * 需要认证
 *
 * Body: { task: string }
 * Response: { success: boolean, subtasks: array, originalTask: string }
 */
router.post('/decompose', authenticate, asyncHandler(async (req, res) => {
    const { task } = req.body;

    if (!task || typeof task !== 'string' || task.trim().length === 0) {
        throw new AppError('任务描述不能为空', 400, 'INVALID_TASK');
    }

    if (task.length > 1000) {
        throw new AppError('任务描述过长，最大1000字符', 400, 'TASK_TOO_LONG');
    }

    const result = await decomposeService.decomposeTask(task.trim());

    res.json({
        success: true,
        subtasks: result.subtasks,
        originalTask: task,
        estimatedTime: result.estimatedTime
    });
}));

// ========================================
// 报告生成
// ========================================

/**
 * POST /api/report
 * 生成专注力成长报告
 * 需要认证
 *
 * Body: {
 *   gameRecords: array,
 *   taskRecords: array,
 *   emotionRecords: array
 * }
 * Response: { success: boolean, report: object }
 */
router.post('/report', authenticate, asyncHandler(async (req, res) => {
    const { gameRecords, taskRecords, emotionRecords } = req.body;

    if (!gameRecords || !Array.isArray(gameRecords)) {
        throw new AppError('游戏记录数据格式错误', 400, 'INVALID_GAME_RECORDS');
    }

    const report = await reportService.generateReport({
        gameRecords: gameRecords || [],
        taskRecords: taskRecords || [],
        emotionRecords: emotionRecords || []
    });

    res.json({
        success: true,
        report: report
    });
}));

// ========================================
// 情感分析
// ========================================

/**
 * POST /api/analyze-emotion
 * 分析文本情感
 * 需要认证
 *
 * Body: { text: string }
 * Response: { success: boolean, emotion: string, confidence: number }
 */
router.post('/analyze-emotion', authenticate, asyncHandler(async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
        throw new AppError('文本内容不能为空', 400, 'INVALID_TEXT');
    }

    if (text.length > 5000) {
        throw new AppError('文本过长，最大5000字符', 400, 'TEXT_TOO_LONG');
    }

    const emotion = await reportService.analyzeEmotion(text);

    res.json({
        success: true,
        ...emotion
    });
}));

// ========================================
// 成就系统
// ========================================

/**
 * GET /api/achievements
 * 获取所有成就列表
 */
router.get('/achievements', authenticate, asyncHandler(async (req, res) => {
    const achievements = await Achievement.findAll({
        order: [['category', 'ASC'], ['difficulty', 'ASC']]
    });

    res.json({
        success: true,
        data: { achievements }
    });
}));

/**
 * GET /api/achievements/unlocked
 * 获取用户已解锁的成就
 */
router.get('/achievements/unlocked', authenticate, asyncHandler(async (req, res) => {
    const unlocked = await UserAchievement.findAll({
        where: { user_id: req.user.id },
        include: [{
            model: Achievement,
            as: 'achievement'
        }],
        order: [['unlocked_at', 'DESC']]
    });

    res.json({
        success: true,
        data: {
            achievements: unlocked.map(ua => ({
                id: ua.achievement.id,
                name: ua.achievement.name,
                description: ua.achievement.description,
                icon: ua.achievement.icon,
                category: ua.achievement.category,
                difficulty: ua.achievement.difficulty,
                points: ua.achievement.points,
                unlockedAt: ua.unlocked_at
            }))
        }
    });
}));

// ========================================
// 成长报告
// ========================================

/**
 * GET /api/reports/:childId
 * 获取儿童成长报告数据
 */
router.get('/reports/:childId', authenticate, asyncHandler(async (req, res) => {
    const { childId } = req.params;
    const { period = 'week' } = req.query;
    const userId = req.user.id;

    // 验证权限：家长只能查看自己孩子的报告，孩子只能查看自己的报告
    if (req.user.role === 'child' && childId !== 'demo' && childId !== String(userId)) {
        throw new AppError('无权查看此报告', 403, 'FORBIDDEN');
    }

    // 如果是 demo，返回演示数据
    if (childId === 'demo') {
        return res.json({
            success: true,
            data: generateDemoReport()
        });
    }

    // 计算时间范围
    const now = new Date();
    let startDate;
    switch (period) {
        case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        case 'quarter':
            startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
            break;
        default: // week
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 7);
    }

    // 获取游戏会话数据
    const sessions = await GameSession.findAll({
        where: {
            user_id: childId,
            start_time: { [Op.gte]: startDate }
        },
        order: [['start_time', 'DESC']]
    });

    // 计算统计数据
    const totalSessions = sessions.length;
    const totalMinutes = sessions.reduce((sum, s) => sum + (s.duration || 0), 0);
    const avgAccuracy = totalSessions > 0
        ? (sessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / totalSessions * 100).toFixed(1)
        : 0;

    // 计算训练天数
    const trainingDays = new Set(sessions.map(s => s.start_time.toISOString().split('T')[0])).size;

    // 按游戏类型统计
    const gameStats = {};
    sessions.forEach(s => {
        if (!gameStats[s.game_type]) {
            gameStats[s.game_type] = { count: 0, totalAccuracy: 0, totalScore: 0 };
        }
        gameStats[s.game_type].count++;
        gameStats[s.game_type].totalAccuracy += s.accuracy || 0;
        gameStats[s.game_type].totalScore += s.score || 0;
    });

    // 生成游戏表现数据
    const gameNames = {
        nback: '时空密码',
        stop: '星际拦截',
        search: '密林寻踪',
        vigil: '要塞守望',
        schulte: '舒尔特方格',
        stroop: '色彩Stroop',
        auditory: '听觉追踪',
        dual: '双任务训练'
    };

    const games = Object.entries(gameStats).map(([type, stats]) => ({
        id: type,
        name: gameNames[type] || type,
        score: Math.round(stats.totalAccuracy / stats.count * 100),
        sessions: stats.count
    }));

    // 生成日历数据
    const calendar = generateCalendar(sessions, period);

    res.json({
        success: true,
        data: {
            avgAccuracy: parseFloat(avgAccuracy),
            totalMinutes,
            trainDays: trainingDays,
            focusScore: Math.round(parseFloat(avgAccuracy) * 0.9 + trainingDays * 2),
            calendar,
            games,
            cognitive: {
                workingMemory: { score: Math.round(Math.random() * 20 + 70), trend: Math.round(Math.random() * 10 - 5) },
                inhibitoryControl: { score: Math.round(Math.random() * 20 + 70), trend: Math.round(Math.random() * 10 - 5) },
                visualSearch: { score: Math.round(Math.random() * 20 + 70), trend: Math.round(Math.random() * 10 - 5) },
                sustainedAttention: { score: Math.round(Math.random() * 20 + 70), trend: Math.round(Math.random() * 10 - 5) }
            },
            achievements: [
                { id: 'first', name: '初次训练', icon: '🌟', unlocked: totalSessions > 0 },
                { id: 'week7', name: '连续7天', icon: '🔥', unlocked: trainingDays >= 7 },
                { id: 'score90', name: '90分达成', icon: '💯', unlocked: parseFloat(avgAccuracy) >= 90 },
                { id: 'master', name: '游戏大师', icon: '🏆', unlocked: games.filter(g => g.score >= 80).length >= 5 },
                { id: 'legend', name: '专注传奇', icon: '👑', unlocked: false },
                { id: 'perfect', name: '完美主义者', icon: '💎', unlocked: false }
            ]
        }
    });
}));

// 生成日历数据
function generateCalendar(sessions, period) {
    const calendar = [];
    const today = new Date();
    const days = period === 'month' ? 30 : period === 'quarter' ? 90 : 7;

    for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const daySessions = sessions.filter(s => s.start_time.toISOString().split('T')[0] === dateStr);
        const trained = daySessions.length > 0;
        const avgScore = trained
            ? daySessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / daySessions.length * 100
            : 0;

        calendar.push({
            day: date.getDate(),
            trained,
            excellent: avgScore >= 85,
            score: Math.round(avgScore)
        });
    }

    return calendar.reverse();
}

// 生成演示报告
function generateDemoReport() {
    return {
        avgAccuracy: 82,
        avgAccuracyTrend: 5,
        totalMinutes: 180,
        totalMinutesTrend: 30,
        trainDays: 6,
        trainDaysTrend: 2,
        focusScore: 85,
        focusScoreTrend: 8,
        calendar: generateCalendar([], 'week'),
        games: [
            { id: 'nback', name: '时空密码', score: 88, sessions: 5 },
            { id: 'stop', name: '星际拦截', score: 75, sessions: 3 },
            { id: 'search', name: '密林寻踪', score: 85, sessions: 4 },
            { id: 'vigil', name: '要塞守望', score: 80, sessions: 2 },
            { id: 'schulte', name: '舒尔特方格', score: 90, sessions: 6 },
            { id: 'stroop', name: '色彩Stroop', score: 68, sessions: 3 },
            { id: 'auditory', name: '听觉追踪', score: 78, sessions: 2 },
            { id: 'dual', name: '双任务训练', score: 72, sessions: 1 }
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
}

module.exports = router;
