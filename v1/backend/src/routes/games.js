/**
 * 专注力星球 - 游戏记录路由
 * v1.5 游戏数据核心
 */

const express = require('express');
const router = express.Router();
const { GameSession, GameRecord, User, sequelize } = require('../database/models');
const { authenticate, optionalAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

/**
 * 游戏类型配置
 */
const GAME_CONFIG = {
    nback: {
        name: '时空密码',
        cognitiveDimensions: ['working_memory', 'visual_spatial'],
        description: '工作记忆与视觉空间训练'
    },
    stop: {
        name: '星际拦截',
        cognitiveDimensions: ['inhibition', 'response_inhibition'],
        description: '抑制控制与反应抑制训练'
    },
    search: {
        name: '密林寻踪',
        cognitiveDimensions: ['visual_search', 'selective_attention'],
        description: '视觉搜索与选择性注意训练'
    },
    vigil: {
        name: '要塞守望',
        cognitiveDimensions: ['sustained_attention', 'vigilance'],
        description: '持续注意与警觉性训练'
    },
    schulte: {
        name: '舒尔特方格',
        cognitiveDimensions: ['visual_search', 'attention_span'],
        description: '视觉广度与注意力训练'
    },
    stroop: {
        name: '色彩Stroop',
        cognitiveDimensions: ['inhibition', 'cognitive_flexibility'],
        description: '抑制控制与认知灵活性训练'
    },
    auditory: {
        name: '听觉追踪',
        cognitiveDimensions: ['auditory_memory', 'selective_attention'],
        description: '听觉记忆与选择性注意训练'
    },
    dual: {
        name: '双任务训练',
        cognitiveDimensions: ['divided_attention', 'task_coordination'],
        description: '分散注意与任务协调训练'
    }
};

/**
 * GET /api/games
 * 获取所有游戏列表
 */
router.get('/', optionalAuth, (req, res) => {
    const games = Object.entries(GAME_CONFIG).map(([key, config]) => ({
        id: key,
        ...config,
        status: 'available'
    }));

    res.json({
        success: true,
        data: { games }
    });
});

/**
 * POST /api/games/:gameType/start
 * 开始游戏会话
 */
router.post('/:gameType/start', authenticate, async (req, res) => {
    try {
        const { gameType } = req.params;
        const { difficulty, config } = req.body;

        if (!GAME_CONFIG[gameType]) {
            return res.status(400).json({
                success: false,
                message: '不支持的游戏类型'
            });
        }

        const user = req.user;

        // 检查今日训练时长限制
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todaySessions = await GameSession.sum('duration', {
            where: {
                user_id: user.id,
                start_time: { [Op.gte]: today }
            }
        });

        const todayMinutes = Math.floor((todaySessions || 0) / 60);

        if (todayMinutes >= user.daily_training_limit) {
            return res.status(400).json({
                success: false,
                message: `今日训练时长已达上限（${user.daily_training_limit}分钟），请明天再继续训练！`,
                code: 'TRAINING_LIMIT_REACHED'
            });
        }

        // 创建游戏会话
        const session = await GameSession.create({
            user_id: user.id,
            game_type: gameType,
            difficulty: difficulty || 1,
            start_time: new Date(),
            config: config || {}
        });

        res.status(201).json({
            success: true,
            message: '游戏会话已创建',
            data: {
                sessionId: session.id,
                gameType,
                gameName: GAME_CONFIG[gameType].name,
                cognitiveDimensions: GAME_CONFIG[gameType].cognitiveDimensions,
                difficulty: session.difficulty,
                remainingMinutes: user.daily_training_limit - todayMinutes
            }
        });
    } catch (error) {
        console.error('开始游戏错误:', error);
        res.status(500).json({
            success: false,
            message: '创建游戏会话失败'
        });
    }
});

/**
 * POST /api/games/:sessionId/records
 * 记录游戏操作
 */
router.post('/:sessionId/records', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { trial_number, stimulus, response, is_correct, reaction_time } = req.body;

        const session = await GameSession.findOne({
            where: { id: sessionId, user_id: req.user.id }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: '游戏会话不存在'
            });
        }

        const record = await GameRecord.create({
            session_id: sessionId,
            trial_number,
            stimulus,
            response,
            is_correct,
            reaction_time
        });

        // 更新会话统计
        const totalTrials = await GameRecord.count({
            where: { session_id: sessionId }
        });
        const correctTrials = await GameRecord.count({
            where: { session_id: sessionId, is_correct: true }
        });

        await session.update({
            total_trials: totalTrials,
            correct_trials: correctTrials,
            accuracy: correctTrials / totalTrials
        });

        res.status(201).json({
            success: true,
            data: { record }
        });
    } catch (error) {
        console.error('记录游戏操作错误:', error);
        res.status(500).json({
            success: false,
            message: '记录失败'
        });
    }
});

/**
 * POST /api/games/:sessionId/complete
 * 完成游戏会话
 */
router.post('/:sessionId/complete', authenticate, async (req, res) => {
    try {
        const { sessionId } = req.params;
        const { score, accuracy, avg_reaction_time } = req.body;

        const session = await GameSession.findOne({
            where: { id: sessionId, user_id: req.user.id }
        });

        if (!session) {
            return res.status(404).json({
                success: false,
                message: '游戏会话不存在'
            });
        }

        const endTime = new Date();
        const duration = Math.floor((endTime - session.start_time) / 1000);

        await session.update({
            end_time: endTime,
            duration,
            score: score || session.correct_trials * 10,
            accuracy: accuracy || (session.correct_trials / session.total_trials),
            avg_reaction_time: avg_reaction_time
        });

        // 获取今日训练统计
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const todayStats = await GameSession.findAll({
            where: {
                user_id: req.user.id,
                start_time: { [Op.gte]: today }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'sessionCount'],
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
                [sequelize.fn('AVG', sequelize.col('accuracy')), 'avgAccuracy']
            ],
            raw: true
        });

        res.json({
            success: true,
            message: '游戏会话已完成',
            data: {
                session: {
                    id: session.id,
                    duration,
                    score: score || session.correct_trials * 10,
                    accuracy: session.accuracy,
                    avgReactionTime: avg_reaction_time
                },
                todayStats: {
                    sessions: todayStats[0]?.sessionCount || 0,
                    totalMinutes: Math.floor((todayStats[0]?.totalDuration || 0) / 60),
                    avgAccuracy: todayStats[0]?.avgAccuracy || 0
                }
            }
        });
    } catch (error) {
        console.error('完成游戏会话错误:', error);
        res.status(500).json({
            success: false,
            message: '保存失败'
        });
    }
});

/**
 * GET /api/games/history
 * 获取游戏历史记录
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const { game_type, start_date, end_date, limit = 20, offset = 0 } = req.query;

        const where = { user_id: req.user.id };

        if (game_type) {
            where.game_type = game_type;
        }

        if (start_date || end_date) {
            where.start_time = {};
            if (start_date) where.start_time[Op.gte] = new Date(start_date);
            if (end_date) where.start_time[Op.lte] = new Date(end_date);
        }

        const { count, rows: sessions } = await GameSession.findAndCountAll({
            where,
            order: [['start_time', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            include: [{
                model: GameRecord,
                as: 'records',
                attributes: ['id', 'trial_number', 'is_correct', 'reaction_time']
            }]
        });

        // 格式化数据
        const history = sessions.map(session => ({
            id: session.id,
            gameType: session.game_type,
            gameName: GAME_CONFIG[session.game_type]?.name || session.game_type,
            difficulty: session.difficulty,
            startTime: session.start_time,
            duration: session.duration,
            score: session.score,
            accuracy: session.accuracy,
            avgReactionTime: session.avg_reaction_time,
            totalTrials: session.total_trials,
            correctTrials: session.correct_trials,
            records: session.records
        }));

        res.json({
            success: true,
            data: {
                history,
                pagination: {
                    total: count,
                    limit: parseInt(limit),
                    offset: parseInt(offset),
                    hasMore: offset + limit < count
                }
            }
        });
    } catch (error) {
        console.error('获取游戏历史错误:', error);
        res.status(500).json({
            success: false,
            message: '获取历史记录失败'
        });
    }
});

/**
 * GET /api/games/stats
 * 获取游戏统计数据
 */
router.get('/stats', authenticate, async (req, res) => {
    try {
        const { period = 'week' } = req.query;

        let startDate = new Date();

        switch (period) {
            case 'day':
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'week':
                startDate.setDate(startDate.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(startDate.getMonth() - 1);
                break;
            case 'all':
                startDate = new Date(0);
                break;
        }

        // 按游戏类型汇总
        const gameStats = await GameSession.findAll({
            where: {
                user_id: req.user.id,
                start_time: { [Op.gte]: startDate }
            },
            attributes: [
                'game_type',
                [sequelize.fn('COUNT', sequelize.col('GameSession.id')), 'sessionCount'],
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
                [sequelize.fn('AVG', sequelize.col('accuracy')), 'avgAccuracy'],
                [sequelize.fn('AVG', sequelize.col('avg_reaction_time')), 'avgReactionTime'],
                [sequelize.fn('SUM', sequelize.col('score')), 'totalScore']
            ],
            group: ['game_type'],
            raw: true
        });

        // 总体统计
        const overallStats = await GameSession.findOne({
            where: {
                user_id: req.user.id,
                start_time: { [Op.gte]: startDate }
            },
            attributes: [
                [sequelize.fn('COUNT', sequelize.col('id')), 'totalSessions'],
                [sequelize.fn('SUM', sequelize.col('duration')), 'totalDuration'],
                [sequelize.fn('AVG', sequelize.col('accuracy')), 'avgAccuracy']
            ],
            raw: true
        });

        // 最近7天的每日统计
        const dailyStats = await GameSession.findAll({
            where: {
                user_id: req.user.id,
                start_time: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
            },
            attributes: [
                [sequelize.fn('DATE', sequelize.col('start_time')), 'date'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'sessions'],
                [sequelize.fn('SUM', sequelize.col('duration')), 'duration'],
                [sequelize.fn('AVG', sequelize.col('accuracy')), 'accuracy']
            ],
            group: [sequelize.fn('DATE', sequelize.col('start_time'))],
            order: [[sequelize.fn('DATE', sequelize.col('start_time')), 'ASC']],
            raw: true
        });

        const stats = {
            period,
            overall: {
                totalSessions: parseInt(overallStats?.totalSessions) || 0,
                totalMinutes: Math.floor((overallStats?.totalDuration || 0) / 60),
                avgAccuracy: parseFloat((overallStats?.avgAccuracy || 0).toFixed(4))
            },
            byGame: gameStats.map(stat => ({
                gameType: stat.game_type,
                gameName: GAME_CONFIG[stat.game_type]?.name || stat.game_type,
                sessions: parseInt(stat.sessionCount) || 0,
                totalMinutes: Math.floor((stat.totalDuration || 0) / 60),
                avgAccuracy: parseFloat((stat.avgAccuracy || 0).toFixed(4)),
                avgReactionTime: Math.round(stat.avgReactionTime) || 0,
                totalScore: parseInt(stat.totalScore) || 0
            })),
            daily: dailyStats.map(stat => ({
                date: stat.date,
                sessions: parseInt(stat.sessions) || 0,
                minutes: Math.floor((stat.duration || 0) / 60),
                accuracy: parseFloat((stat.accuracy || 0).toFixed(4))
            }))
        };

        res.json({
            success: true,
            data: { stats }
        });
    } catch (error) {
        console.error('获取统计数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取统计数据失败'
        });
    }
});

module.exports = router;
