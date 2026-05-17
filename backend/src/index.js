/**
 * 专注力星球 - 后端服务入口
 * 基于Express.js的Node.js服务器
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

// 导入路由
const apiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3000;

// ========================================
// 中间件配置
// ========================================

// 安全头
app.use(helmet({
    contentSecurityPolicy: false
}));

// CORS配置
app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 请求日志
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else {
    app.use(morgan('combined'));
}

// 响应压缩
app.use(compression());

// 请求体解析
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ========================================
// 静态文件服务
// ========================================

// 提供前端静态文件
app.use(express.static(path.join(__dirname, '../../frontend')));

// ========================================
// API路由
// ========================================

app.use('/api', apiRoutes);
app.use('/api/health', healthRoutes);

// ========================================
// 根路由
// ========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// ========================================
// 错误处理
// ========================================

// 404处理
app.use((req, res, next) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在'
    });
});

// 全局错误处理
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);

    const statusCode = err.statusCode || 500;
    const message = err.message || '服务器内部错误';

    res.status(statusCode).json({
        success: false,
        message: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
});

// ========================================
// 启动服务器
// ========================================

app.listen(PORT, () => {
    console.log('===========================================');
    console.log('专注力星球后端服务');
    console.log('===========================================');
    console.log(`服务器地址: http://localhost:${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Key: ${process.env.DEEPSEEK_API_KEY ? '已配置 ✓' : '未配置 ✗'}`);
    console.log('===========================================');

    // 健康检查
    console.log('\n健康检查端点:');
    console.log(`  GET http://localhost:${PORT}/api/health`);
    console.log('\n主要API端点:');
    console.log(`  POST http://localhost:${PORT}/api/decompose - 任务分解`);
    console.log(`  POST http://localhost:${PORT}/api/report - 生成报告');
    console.log('\n服务已启动!\n');
});

module.exports = app;
