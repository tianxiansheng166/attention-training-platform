/**
 * API路由 - 主要的业务逻辑路由
 */

const express = require('express');
const router = express.Router();
const decomposeService = require('../services/decomposeService');
const reportService = require('../services/reportService');

// ========================================
// 任务分解
// ========================================

/**
 * POST /api/decompose
 * 将复杂任务分解为小步骤
 *
 * Body: { task: string }
 * Response: { success: boolean, subtasks: array, originalTask: string }
 */
router.post('/decompose', async (req, res, next) => {
    try {
        const { task } = req.body;

        if (!task || typeof task !== 'string' || task.trim().length === 0) {
            return res.status(400).json({
                success: false,
                message: '任务描述不能为空'
            });
        }

        const result = await decomposeService.decomposeTask(task.trim());

        res.json({
            success: true,
            subtasks: result.subtasks,
            originalTask: task,
            estimatedTime: result.estimatedTime
        });

    } catch (error) {
        next(error);
    }
});

// ========================================
// 报告生成
// ========================================

/**
 * POST /api/report
 * 生成专注力成长报告
 *
 * Body: {
 *   gameRecords: array,
 *   taskRecords: array,
 *   emotionRecords: array
 * }
 * Response: { success: boolean, report: object }
 */
router.post('/report', async (req, res, next) => {
    try {
        const { gameRecords, taskRecords, emotionRecords } = req.body;

        if (!gameRecords || !Array.isArray(gameRecords)) {
            return res.status(400).json({
                success: false,
                message: '游戏记录数据格式错误'
            });
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

    } catch (error) {
        next(error);
    }
});

// ========================================
// 情感分析
// ========================================

/**
 * POST /api/analyze-emotion
 * 分析文本情感
 *
 * Body: { text: string }
 * Response: { success: boolean, emotion: string, confidence: number }
 */
router.post('/analyze-emotion', async (req, res, next) => {
    try {
        const { text } = req.body;

        if (!text || typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: '文本内容不能为空'
            });
        }

        const emotion = await reportService.analyzeEmotion(text);

        res.json({
            success: true,
            ...emotion
        });

    } catch (error) {
        next(error);
    }
});

module.exports = router;
