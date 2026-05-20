/**
 * 专注力星球 - 后端服务入口
 * v1.6 认知训练与评估系统 - 安全增强版
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const apiRoutes = require('./routes/api');
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const gamesRoutes = require('./routes/games');
const assessmentsRoutes = require('./routes/assessments');
const parentRoutes = require('./routes/parent');
const { sequelize, Achievement } = require('./database/models');
const { defaultLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3000;

// 安全头部配置 - 启用更多安全功能
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "'unsafe-hashes'", "cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// CORS配置 - 生产环境必须明确配置来源
const getCorsOptions = () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    
    if (process.env.NODE_ENV === 'production' && allowedOrigins.length === 0) {
        console.warn('⚠️ 警告: 生产环境未配置 ALLOWED_ORIGINS，默认拒绝所有跨域请求');
    }
    
    return {
        origin: allowedOrigins.length > 0 ? allowedOrigins : false,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: true
    };
};

app.use(cors(getCorsOptions()));

// 日志配置
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
} else if (process.env.NODE_ENV === 'production') {
    app.use(morgan('combined'));
} else {
    app.use(morgan('combined'));
}

app.use(compression());

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(express.static(path.join(__dirname, '../../frontend')));

// 应用全局速率限制
app.use('/api', defaultLimiter);

// API路由
app.use('/api', apiRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/assessments', assessmentsRoutes);
app.use('/api/parent', parentRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend/index.html'));
});

// 404处理
app.use(notFoundHandler);

// 全局错误处理
app.use(errorHandler);

async function seedAchievements() {
    const achievements = [
        { code: 'TRAINING_001', name: '初次训练', description: '完成第一次训练', icon: 'star', category: 'training', requirement: { sessions: 1 } },
        { code: 'TRAINING_010', name: '训练新星', description: '累计完成10次训练', icon: 'star', category: 'training', requirement: { sessions: 10 } },
        { code: 'TRAINING_050', name: '训练达人', description: '累计完成50次训练', icon: 'star', category: 'training', requirement: { sessions: 50 } },
        { code: 'TRAINING_100', name: '训练大师', description: '累计完成100次训练', icon: 'star', category: 'training', requirement: { sessions: 100 } },
        { code: 'TRAINING_500', name: '专注王者', description: '累计完成500次训练', icon: 'crown', category: 'training', requirement: { sessions: 500 } },
        { code: 'STREAK_007', name: '一周坚持', description: '连续训练7天', icon: 'fire', category: 'streak', requirement: { streak_days: 7 } },
        { code: 'STREAK_030', name: '月度坚持', description: '连续训练30天', icon: 'fire', category: 'streak', requirement: { streak_days: 30 } },
        { code: 'STREAK_100', name: '百日挑战', description: '连续训练100天', icon: 'fire', category: 'streak', requirement: { streak_days: 100 } },
        { code: 'ASSESS_BASELINE', name: '自我认知', description: '完成基线评估', icon: 'chart', category: 'training', requirement: { assessments: 1 } },
        { code: 'ASSESS_PRO', name: '定期检测', description: '完成5次认知评估', icon: 'chart', category: 'training', requirement: { assessments: 5 } }
    ];

    for (const achievement of achievements) {
        await Achievement.findOrCreate({
            where: { code: achievement.code },
            defaults: achievement
        });
    }
}

async function initializeDatabase() {
    try {
        console.log('初始化数据库...');
        await sequelize.authenticate();
        await sequelize.sync();
        await seedAchievements();
        console.log('数据库初始化完成 ✓');
        return true;
    } catch (error) {
        console.error('数据库初始化失败:', error);
        return false;
    }
}

async function startServer() {
    await initializeDatabase();

    app.listen(PORT, () => {
        console.log('===========================================');
        console.log('专注力星球 v1.6 - 认知训练与评估系统（安全增强版）');
        console.log('===========================================');
        console.log(`服务器地址: http://localhost:${PORT}`);
        console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
        console.log(`数据库: ${process.env.DB_DIALECT === 'sqlite' ? 'SQLite' : (process.env.DB_HOST || 'localhost') + ':' + (process.env.DB_PORT || 5432)}`);
        console.log(`API Key: ${process.env.DEEPSEEK_API_KEY ? '已配置 ✓' : '未配置 ✗'}`);
        console.log('===========================================');
        console.log('\nAPI端点:');
        console.log(`  GET  http://localhost:${PORT}/api/health - 健康检查`);
        console.log(`  POST http://localhost:${PORT}/api/decompose - 任务分解`);
        console.log(`  POST http://localhost:${PORT}/api/report - 生成报告`);
        console.log(`\n用户认证:`);
        console.log(`  POST http://localhost:${PORT}/api/auth/register - 用户注册`);
        console.log(`  POST http://localhost:${PORT}/api/auth/login - 用户登录`);
        console.log(`  GET  http://localhost:${PORT}/api/auth/me - 用户信息`);
        console.log(`\n游戏系统:`);
        console.log(`  GET  http://localhost:${PORT}/api/games - 游戏列表`);
        console.log(`  POST http://localhost:${PORT}/api/games/:type/start - 开始游戏`);
        console.log(`  POST http://localhost:${PORT}/api/games/:id/records - 记录操作`);
        console.log(`  POST http://localhost:${PORT}/api/games/:id/complete - 完成游戏`);
        console.log(`  GET  http://localhost:${PORT}/api/games/history - 游戏历史`);
        console.log(`  GET  http://localhost:${PORT}/api/games/stats - 游戏统计`);
        console.log(`\n认知评估:`);
        console.log(`  GET  http://localhost:${PORT}/api/assessments - 评估配置`);
        console.log(`  POST http://localhost:${PORT}/api/assessments/start - 开始评估`);
        console.log(`  POST http://localhost:${PORT}/api/assessments/:id/complete - 完成评估`);
        console.log(`  GET  http://localhost:${PORT}/api/assessments/history - 评估历史`);
        console.log(`  GET  http://localhost:${PORT}/api/assessments/progress - 进步趋势`);
        console.log('\n服务已启动!\n');
    });
}

startServer();

module.exports = app;
