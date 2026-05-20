/**
 * 专注力星球 - 家长端路由
 * v1.5 家长控制面板
 */

const express = require('express');
const router = express.Router();
const { User, ParentChildRelation, GameSession, Assessment, GrowthReport, Achievement, UserAchievement } = require('../database/models');
const { authenticate } = require('../middleware/auth');
const { Op, fn, col, literal } = require('sequelize');

/**
 * POST /api/parent/bind-child
 * 通过邀请码绑定孩子
 */
router.post('/bind-child', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { inviteCode } = req.body;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        if (!inviteCode) {
            return res.status(400).json({
                success: false,
                message: '请输入邀请码'
            });
        }

        // 查找孩子
        const child = await User.findOne({
            where: { invite_code: inviteCode, role: 'child' }
        });

        if (!child) {
            return res.status(404).json({
                success: false,
                message: '邀请码无效或孩子账号不存在'
            });
        }

        // 检查是否已绑定
        const existingRelation = await ParentChildRelation.findOne({
            where: { parent_id: parent.id, child_id: child.id }
        });

        if (existingRelation) {
            if (existingRelation.is_active) {
                return res.status(400).json({
                    success: false,
                    message: '该孩子已绑定'
                });
            } else {
                // 重新激活
                await existingRelation.update({ is_active: true });
                return res.json({
                    success: true,
                    message: '绑定成功',
                    data: { child: child.toJSON() }
                });
            }
        }

        // 创建新绑定
        await ParentChildRelation.create({
            parent_id: parent.id,
            child_id: child.id,
            is_active: true
        });

        res.json({
            success: true,
            message: '绑定成功',
            data: { child: child.toJSON() }
        });
    } catch (error) {
        console.error('绑定孩子错误:', error);
        res.status(500).json({
            success: false,
            message: '绑定失败'
        });
    }
});

/**
 * DELETE /api/parent/unbind-child/:childId
 * 解绑孩子
 */
router.delete('/unbind-child/:childId', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        const relation = await ParentChildRelation.findOne({
            where: { parent_id: parent.id, child_id: childId, is_active: true }
        });

        if (!relation) {
            return res.status(404).json({
                success: false,
                message: '未找到绑定关系'
            });
        }

        await relation.update({ is_active: false });

        res.json({
            success: true,
            message: '解绑成功'
        });
    } catch (error) {
        console.error('解绑孩子错误:', error);
        res.status(500).json({
            success: false,
            message: '解绑失败'
        });
    }
});

/**
 * GET /api/parent/children
 * 获取绑定的儿童列表
 */
router.get('/children', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        
        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        const childrenRelations = await ParentChildRelation.findAll({
            where: { parent_id: parent.id, is_active: true },
            include: [{
                model: User,
                as: 'child',
                attributes: ['id', 'username', 'age', 'avatar', 'daily_training_limit', 'login_streak', 'last_login', 'is_active']
            }]
        });

        const children = childrenRelations.map(r => r.child);

        res.json({
            success: true,
            data: { children }
        });
    } catch (error) {
        console.error('获取儿童列表错误:', error);
        res.status(500).json({
            success: false,
            message: '获取儿童列表失败'
        });
    }
});

/**
 * GET /api/parent/:childId/today-summary
 * 获取儿童今日训练摘要
 */
router.get('/:childId/today-summary', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const todaySessions = await GameSession.findAll({
            where: {
                user_id: childId,
                start_time: { [Op.gte]: today, [Op.lt]: tomorrow }
            },
            order: [['start_time', 'DESC']]
        });

        const totalTimeToday = todaySessions.reduce((sum, s) => sum + (s.duration || 0), 0);
        const sessionsCount = todaySessions.length;
        const avgAccuracy = todaySessions.length > 0 
            ? (todaySessions.reduce((sum, s) => sum + (s.accuracy || 0), 0) / todaySessions.length * 100).toFixed(1)
            : 0;

        res.json({
            success: true,
            data: {
                totalTime: totalTimeToday,
                sessionsCount,
                avgAccuracy,
                sessions: todaySessions
            }
        });
    } catch (error) {
        console.error('获取今日摘要错误:', error);
        res.status(500).json({
            success: false,
            message: '获取今日摘要失败'
        });
    }
});

/**
 * GET /api/parent/:childId/weekly
 * 获取儿童周度数据
 */
router.get('/:childId/weekly', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        const weekSessions = await GameSession.findAll({
            where: {
                user_id: childId,
                start_time: { [Op.gte]: weekAgo }
            },
            order: [['start_time', 'DESC']]
        });

        // 按天统计
        const dailyStats = {};
        for (let i = 0; i < 7; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split('T')[0];
            dailyStats[dateKey] = { time: 0, sessions: 0, accuracy: 0 };
        }

        weekSessions.forEach(session => {
            const dateKey = session.start_time.toISOString().split('T')[0];
            if (dailyStats[dateKey]) {
                dailyStats[dateKey].time += session.duration || 0;
                dailyStats[dateKey].sessions += 1;
                if (session.accuracy) {
                    dailyStats[dateKey].accuracy += session.accuracy;
                }
            }
        });

        // 计算平均准确率
        Object.keys(dailyStats).forEach(date => {
            if (dailyStats[date].sessions > 0) {
                dailyStats[date].accuracy = (dailyStats[date].accuracy / dailyStats[date].sessions * 100).toFixed(1);
            }
        });

        res.json({
            success: true,
            data: { dailyStats }
        });
    } catch (error) {
        console.error('获取周度数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取周度数据失败'
        });
    }
});

/**
 * GET /api/parent/:childId/cognitive
 * 获取儿童认知能力数据
 */
router.get('/:childId/cognitive', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        // 获取最新评估
        const latestAssessment = await Assessment.findOne({
            where: { user_id: childId },
            order: [['completed_at', 'DESC']]
        });

        // 获取游戏统计
        const gameStats = await GameSession.findAll({
            where: { user_id: childId },
            attributes: [
                'game_type',
                [fn('AVG', col('accuracy')), 'avg_accuracy'],
                [fn('COUNT', col('id')), 'total_sessions'],
                [fn('AVG', col('score')), 'avg_score']
            ],
            group: ['game_type'],
            raw: true
        });

        res.json({
            success: true,
            data: {
                latestAssessment,
                gameStats
            }
        });
    } catch (error) {
        console.error('获取认知数据错误:', error);
        res.status(500).json({
            success: false,
            message: '获取认知数据失败'
        });
    }
});

/**
 * GET /api/parent/:childId/history
 * 获取儿童训练历史
 */
router.get('/:childId/history', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;
        const { limit = 20, offset = 0 } = req.query;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const { count, rows } = await GameSession.findAndCountAll({
            where: { user_id: childId },
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['start_time', 'DESC']]
        });

        res.json({
            success: true,
            data: {
                sessions: rows,
                total: count,
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });
    } catch (error) {
        console.error('获取训练历史错误:', error);
        res.status(500).json({
            success: false,
            message: '获取训练历史失败'
        });
    }
});

/**
 * GET /api/parent/:childId/report
 * 获取成长报告
 */
router.get('/:childId/report', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;
        const { period = 'week' } = req.query;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const reports = await GrowthReport.findAll({
            where: { 
                user_id: childId,
                period_type: period
            },
            order: [['period_start', 'DESC']],
            limit: 10
        });

        res.json({
            success: true,
            data: { reports }
        });
    } catch (error) {
        console.error('获取成长报告错误:', error);
        res.status(500).json({
            success: false,
            message: '获取成长报告失败'
        });
    }
});

/**
 * PUT /api/parent/:childId/settings
 * 更新儿童设置
 */
router.put('/:childId/settings', authenticate, async (req, res) => {
    try {
        const parent = req.user;
        const { childId } = req.params;
        const { daily_training_limit, is_active } = req.body;

        if (parent.role !== 'parent') {
            return res.status(403).json({
                success: false,
                message: '需要家长权限'
            });
        }

        // 验证亲子关系
        const relation = await ParentChildRelation.findOne({
            where: { child_id: childId, parent_id: parent.id, is_active: true }
        });

        if (!relation) {
            return res.status(403).json({
                success: false,
                message: '未找到该儿童的关联关系'
            });
        }

        const child = await User.findByPk(childId);

        const updateData = {};
        if (daily_training_limit !== undefined) {
            updateData.daily_training_limit = daily_training_limit;
        }
        if (is_active !== undefined) {
            updateData.is_active = is_active;
        }

        await child.update(updateData);

        res.json({
            success: true,
            message: '设置更新成功',
            data: { child: child.toJSON() }
        });
    } catch (error) {
        console.error('更新设置错误:', error);
        res.status(500).json({
            success: false,
            message: '更新设置失败'
        });
    }
});

module.exports = router;
