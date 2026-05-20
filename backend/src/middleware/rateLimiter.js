/**
 * 专注力星球 - 速率限制中间件
 */

const rateLimit = require('express-rate-limit');

/**
 * 默认速率限制器 - 适用于大多数API
 * 100次请求 / 15分钟
 */
const defaultLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 100, // 100次请求
    message: {
        success: false,
        message: '请求过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        console.warn(`速率限制触发 - IP: ${req.ip}, 路径: ${req.path}`);
        res.status(429).json(options.message);
    }
});

/**
 * 认证相关API速率限制器 - 更严格的限制
 * 10次请求 / 15分钟
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15分钟
    max: 10, // 仅10次请求
    message: {
        success: false,
        message: '登录尝试过于频繁，请15分钟后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: false,
    handler: (req, res, next, options) => {
        console.warn(`认证速率限制触发 - IP: ${req.ip}, 尝试路径: ${req.path}`);
        res.status(429).json(options.message);
    }
});

/**
 * AI API速率限制器 - 防止API滥用
 * 20次请求 / 1小时
 */
const aiApiLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1小时
    max: 20, // 20次请求
    message: {
        success: false,
        message: 'AI接口调用过于频繁，请稍后再试'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next, options) => {
        console.warn(`AI API速率限制触发 - 用户ID: ${req.userId || '匿名'}, 路径: ${req.path}`);
        res.status(429).json(options.message);
    }
});

/**
 * 创建自定义速率限制器
 * @param {Object} options - 配置选项
 * @param {number} options.windowMs - 时间窗口（毫秒）
 * @param {number} options.max - 最大请求数
 * @param {string} options.message - 限制消息
 */
const createLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000,
        max: options.max || 100,
        message: {
            success: false,
            message: options.message || '请求过于频繁'
        },
        standardHeaders: true,
        legacyHeaders: false
    });
};

module.exports = {
    defaultLimiter,
    authLimiter,
    aiApiLimiter,
    createLimiter
};
