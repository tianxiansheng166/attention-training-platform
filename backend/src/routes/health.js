/**
 * 健康检查路由
 */

const express = require('express');
const router = express.Router();

/**
 * GET /api/health
 * 服务健康检查
 */
router.get('/', (req, res) => {
    const healthcheck = {
        uptime: process.uptime(),
        message: '服务运行正常',
        timestamp: Date.now(),
        environment: process.env.NODE_ENV || 'development',
        services: {
            api: process.env.DEEPSEEK_API_KEY ? 'configured' : 'not_configured'
        }
    };

    try {
        res.status(200).json(healthcheck);
    } catch (error) {
        healthcheck.message = error.message;
        res.status(503).json(healthcheck);
    }
});

module.exports = router;
