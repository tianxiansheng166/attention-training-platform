/**
 * 专注力星球 - 认知评估路由
 * v1.5 认知能力评估
 */

const express = require('express');
const router = express.Router();
const { Assessment, GameSession } = require('../database/models');
const { authenticate } = require('../middleware/auth');
const { Op } = require('sequelize');
const sequelize = require('../database/config');

/**
 * 评估配置
 */
const ASSESSMENT_CONFIG = {
    baseline: {
        name: '基线评估',
        description: '初次认知能力评估，建立训练基准',
        duration: 10,
        games: ['nback', 'stop', 'schulte', 'stroop']
    },
    followup: {
        name: '跟踪评估',
        description: '简短评估，检测训练效果',
        duration: 5,
        games: ['nback', 'stop']
    },
    full: {
        name: '全面评估',
        description: '完整认知能力评估',
        duration: 20,
        games: ['nback', 'stop', 'search', 'schulte', 'stroop', 'auditory']
    }
};

/**
 * GET /api/assessments
 * 获取评估配置
 */
router.get('/', authenticate, async (req, res) => {
    try {
        // 获取用户最近的评估
        const latestAssessment = await Assessment.findOne({
            where: { user_id: req.user.id },
            order: [['created_at', 'DESC']]
        });

        // 获取用户完成的评估次数
        const assessmentCount = await Assessment.count({
            where: { user_id: req.user.id }
        });

        res.json({
            success: true,
            data: {
                config: ASSESSMENT_CONFIG,
                latestAssessment: latestAssessment ? {
                    id: latestAssessment.id,
                    type: latestAssessment.assessment_type,
                    scores: {
                        attention: latestAssessment.attention_score,
                        workingMemory: latestAssessment.working_memory_score,
                        inhibition: latestAssessment.inhibition_score,
                        visualSearch: latestAssessment.visual_search_score,
                        sustainedAttention: latestAssessment.sustained_attention_score,
                        taskSwitching: latestAssessment.task_switching_score
                    },
                    overallLevel: latestAssessment.overall_level,
                    completedAt: latestAssessment.completed_at
                } : null,
                assessmentCount
            }
        });
    } catch (error) {
        console.error('获取评估配置错误:', error);
        res.status(500).json({
            success: false,
            message: '获取评估信息失败'
        });
    }
});

/**
 * POST /api/assessments/start
 * 开始评估
 */
router.post('/start', authenticate, async (req, res) => {
    try {
        const { type = 'baseline' } = req.body;

        if (!ASSESSMENT_CONFIG[type]) {
            return res.status(400).json({
                success: false,
                message: '不支持的评估类型'
            });
        }

        // 检查是否有未完成的评估
        const existingAssessment = await Assessment.findOne({
            where: {
                user_id: req.user.id,
                completed_at: null
            }
        });

        if (existingAssessment) {
            return res.status(400).json({
                success: false,
                message: '您有未完成的评估，请先完成'
            });
        }

        const assessment = await Assessment.create({
            user_id: req.user.id,
            assessment_type: type
        });

        res.status(201).json({
            success: true,
            message: '评估已开始',
            data: {
                assessmentId: assessment.id,
                type,
                config: ASSESSMENT_CONFIG[type]
            }
        });
    } catch (error) {
        console.error('开始评估错误:', error);
        res.status(500).json({
            success: false,
            message: '开始评估失败'
        });
    }
});

/**
 * POST /api/assessments/:id/complete
 * 完成评估
 */
router.post('/:id/complete', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const {
            attention_score,
            working_memory_score,
            inhibition_score,
            visual_search_score,
            sustained_attention_score,
            task_switching_score,
            recommendations
        } = req.body;

        const assessment = await Assessment.findOne({
            where: { id, user_id: req.user.id }
        });

        if (!assessment) {
            return res.status(404).json({
                success: false,
                message: '评估不存在'
            });
        }

        // 计算综合等级（1-10）
        const scores = [
            attention_score,
            working_memory_score,
            inhibition_score,
            visual_search_score,
            sustained_attention_score,
            task_switching_score
        ].filter(s => s != null);

        let overallLevel = 5;
        if (scores.length > 0) {
            const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
            overallLevel = Math.min(10, Math.max(1, Math.round(avgScore)));
        }

        await assessment.update({
            attention_score: attention_score || null,
            working_memory_score: working_memory_score || null,
            inhibition_score: inhibition_score || null,
            visual_search_score: visual_search_score || null,
            sustained_attention_score: sustained_attention_score || null,
            task_switching_score: task_switching_score || null,
            overall_level: overallLevel,
            recommendations: recommendations || [],
            completed_at: new Date()
        });

        // 获取历史评估对比
        const previousAssessment = await Assessment.findOne({
            where: {
                user_id: req.user.id,
                id: { [Op.ne]: id },
                completed_at: { [Op.ne]: null }
            },
            order: [['completed_at', 'DESC']]
        });

        res.json({
            success: true,
            message: '评估已完成',
            data: {
                assessment: {
                    id: assessment.id,
                    type: assessment.assessment_type,
                    scores: {
                        attention: attention_score,
                        workingMemory: working_memory_score,
                        inhibition: inhibition_score,
                        visualSearch: visual_search_score,
                        sustainedAttention: sustained_attention_score,
                        taskSwitching: task_switching_score
                    },
                    overallLevel,
                    completedAt: assessment.completed_at
                },
                comparison: previousAssessment ? {
                    previousLevel: previousAssessment.overall_level,
                    improvement: overallLevel - previousAssessment.overall_level
                } : null
            }
        });
    } catch (error) {
        console.error('完成评估错误:', error);
        res.status(500).json({
            success: false,
            message: '保存评估结果失败'
        });
    }
});

/**
 * GET /api/assessments/history
 * 获取评估历史
 */
router.get('/history', authenticate, async (req, res) => {
    try {
        const assessments = await Assessment.findAll({
            where: {
                user_id: req.user.id,
                completed_at: { [Op.ne]: null }
            },
            order: [['completed_at', 'DESC']],
            limit: 20
        });

        const history = assessments.map(a => ({
            id: a.id,
            type: a.assessment_type,
            typeName: ASSESSMENT_CONFIG[a.assessment_type]?.name || a.assessment_type,
            scores: {
                attention: a.attention_score,
                workingMemory: a.working_memory_score,
                inhibition: a.inhibition_score,
                visualSearch: a.visual_search_score,
                sustainedAttention: a.sustained_attention_score,
                taskSwitching: a.task_switching_score
            },
            overallLevel: a.overall_level,
            completedAt: a.completed_at
        }));

        res.json({
            success: true,
            data: { history }
        });
    } catch (error) {
        console.error('获取评估历史错误:', error);
        res.status(500).json({
            success: false,
            message: '获取评估历史失败'
        });
    }
});

/**
 * GET /api/assessments/progress
 * 获取能力提升趋势
 */
router.get('/progress', authenticate, async (req, res) => {
    try {
        const assessments = await Assessment.findAll({
            where: {
                user_id: req.user.id,
                completed_at: { [Op.ne]: null }
            },
            order: [['completed_at', 'ASC']]
        });

        if (assessments.length < 2) {
            return res.json({
                success: true,
                data: {
                    progress: [],
                    summary: assessments.length === 1 ? {
                        message: '需要至少2次评估才能显示趋势',
                        currentLevel: assessments[0].overall_level
                    } : {
                        message: '请先完成基线评估'
                    }
                }
            });
        }

        const latestAssessment = assessments[assessments.length - 1];
        const firstAssessment = assessments[0];

        const progress = assessments.map(a => ({
            date: a.completed_at,
            level: a.overall_level,
            scores: {
                attention: a.attention_score,
                workingMemory: a.working_memory_score,
                inhibition: a.inhibition_score,
                visualSearch: a.visual_search_score
            }
        }));

        // 计算各维度提升
        const improvements = {};
        const dimensions = ['attention_score', 'working_memory_score', 'inhibition_score', 'visual_search_score'];

        dimensions.forEach(dim => {
            const first = firstAssessment[dim];
            const last = latestAssessment[dim];
            if (first && last) {
                improvements[dim] = last - first;
            }
        });

        res.json({
            success: true,
            data: {
                progress,
                summary: {
                    currentLevel: latestAssessment.overall_level,
                    startLevel: firstAssessment.overall_level,
                    overallImprovement: latestAssessment.overall_level - firstAssessment.overall_level,
                    assessmentCount: assessments.length,
                    dimensionImprovements: improvements
                }
            }
        });
    } catch (error) {
        console.error('获取进步趋势错误:', error);
        res.status(500).json({
            success: false,
            message: '获取进步趋势失败'
        });
    }
});

module.exports = router;
