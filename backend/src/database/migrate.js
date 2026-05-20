/**
 * 专注力星球 - 数据库迁移脚本
 * v1.5 数据库初始化
 */

require('dotenv').config();
const { sequelize, User, ParentChildRelation, GameSession, GameRecord, Assessment, GrowthReport, Achievement, UserAchievement } = require('./models');

async function migrate() {
    console.log('===========================================');
    console.log('专注力星球 v1.5 - 数据库迁移');
    console.log('===========================================\n');

    try {
        // 测试数据库连接
        console.log('1. 连接数据库...');
        await sequelize.authenticate();
        console.log('   数据库连接成功 ✓\n');

        // 同步所有模型
        console.log('2. 同步数据模型...');
        await sequelize.sync({ force: process.env.FORCE_SYNC === 'true' });
        console.log('   数据模型同步完成 ✓\n');

        // 创建默认成就
        console.log('3. 创建默认成就系统...');
        await seedAchievements();
        console.log('   成就系统初始化完成 ✓\n');

        console.log('===========================================');
        console.log('数据库迁移完成！');
        console.log('===========================================');
        console.log('\n注意：');
        console.log('- 如果需要重建所有表，请设置 FORCE_SYNC=true');
        console.log('- 默认成就已创建，可用于激励系统\n');

        process.exit(0);
    } catch (error) {
        console.error('迁移失败:', error);
        process.exit(1);
    }
}

async function seedAchievements() {
    const achievements = [
        // 训练类成就
        { code: 'TRAINING_001', name: '初次训练', description: '完成第一次训练', icon: 'star', category: 'training', requirement: { sessions: 1 } },
        { code: 'TRAINING_010', name: '训练新星', description: '累计完成10次训练', icon: 'star', category: 'training', requirement: { sessions: 10 } },
        { code: 'TRAINING_050', name: '训练达人', description: '累计完成50次训练', icon: 'star', category: 'training', requirement: { sessions: 50 } },
        { code: 'TRAINING_100', name: '训练大师', description: '累计完成100次训练', icon: 'star', category: 'training', requirement: { sessions: 100 } },
        { code: 'TRAINING_500', name: '专注王者', description: '累计完成500次训练', icon: 'crown', category: 'training', requirement: { sessions: 500 } },

        // 连击类成就
        { code: 'STREAK_007', name: '一周坚持', description: '连续训练7天', icon: 'fire', category: 'streak', requirement: { streak_days: 7 } },
        { code: 'STREAK_030', name: '月度坚持', description: '连续训练30天', icon: 'fire', category: 'streak', requirement: { streak_days: 30 } },
        { code: 'STREAK_100', name: '百日挑战', description: '连续训练100天', icon: 'fire', category: 'streak', requirement: { streak_days: 100 } },

        // 游戏专精成就
        { code: 'MASTERY_NBACK', name: '记忆大师', description: '时空密码达到10级', icon: 'brain', category: 'mastery', requirement: { game: 'nback', level: 10 } },
        { code: 'MASTERY_STOP', name: '反应冠军', description: '星际拦截达到10级', icon: 'target', category: 'mastery', requirement: { game: 'stop', level: 10 } },
        { code: 'MASTERY_SEARCH', name: '火眼金睛', description: '密林寻踪达到10级', icon: 'eye', category: 'mastery', requirement: { game: 'search', level: 10 } },
        { code: 'MASTERY_VIGIL', name: '警觉猎手', description: '要塞守望达到10级', icon: 'shield', category: 'mastery', requirement: { game: 'vigil', level: 10 } },
        { code: 'MASTERY_SCHULTE', name: '舒尔特专家', description: '舒尔特方格达到10级', icon: 'grid', category: 'mastery', requirement: { game: 'schulte', level: 10 } },
        { code: 'MASTERY_STROOP', name: '色彩大师', description: '色彩Stroop达到10级', icon: 'palette', category: 'mastery', requirement: { game: 'stroop', level: 10 } },

        // 时间类成就
        { code: 'TIME_060', name: '专注一小时', description: '累计训练满60分钟', icon: 'clock', category: 'training', requirement: { total_minutes: 60 } },
        { code: 'TIME_600', name: '专注十小时', description: '累计训练满600分钟', icon: 'clock', category: 'training', requirement: { total_minutes: 600 } },
        { code: 'TIME_3600', name: '专注达人', description: '累计训练满3600分钟', icon: 'clock', category: 'training', requirement: { total_minutes: 3600 } },

        // 评估类成就
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

migrate();
