/**
 * 专注力星球 - 数据模型定义
 * v1.6 核心数据模型 - 安全增强版
 */

const { DataTypes } = require('sequelize');
const sequelize = require('./config');
const bcrypt = require('bcryptjs');

// 根据数据库类型选择 JSON 字段类型
const JSON_TYPE = process.env.DB_DIALECT === 'sqlite' ? DataTypes.JSON : DataTypes.JSONB;

/**
 * 用户模型
 * 支持儿童用户和家长用户
 */
const User = sequelize.define('User', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING(255),
        unique: true,
        allowNull: true,
        validate: {
            isEmail: true
        }
    },
    password: {
        type: DataTypes.STRING(255),
        allowNull: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    role: {
        type: DataTypes.ENUM('child', 'parent'),
        defaultValue: 'child'
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
            min: 3,
            max: 18
        }
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: true
    },
    avatar: {
        type: DataTypes.STRING(255),
        defaultValue: 'default'
    },
    parent_phone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    daily_training_limit: {
        type: DataTypes.INTEGER,
        defaultValue: 30,
        comment: '每日训练时长限制（分钟）'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    last_login: {
        type: DataTypes.DATE,
        allowNull: true
    },
    login_streak: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '连续登录天数'
    },
    invite_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
        comment: '儿童用户邀请码，用于家长绑定',
        unique: true
    }
}, {
    tableName: 'users',
    hooks: {
        beforeCreate: async (user) => {
            if (user.password) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        },
        beforeUpdate: async (user) => {
            if (user.changed('password')) {
                user.password = await bcrypt.hash(user.password, 10);
            }
        }
    },
    indexes: [
        {
            fields: ['email']
        },
        {
            fields: ['role']
        },
        {
            fields: ['invite_code']
        }
    ]
});

User.prototype.validatePassword = async function(password) {
    return bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function() {
    const values = { ...this.get() };
    delete values.password;
    return values;
};

/**
 * 家长-儿童关联模型
 */
const ParentChildRelation = sequelize.define('ParentChildRelation', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    parent_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    child_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    relation: {
        type: DataTypes.STRING(50),
        defaultValue: 'parent',
        comment: '关系：parent, guardian'
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    }
}, {
    tableName: 'parent_child_relations',
    indexes: [
        {
            fields: ['parent_id']
        },
        {
            fields: ['child_id']
        },
        {
            fields: ['parent_id', 'child_id']
        }
    ]
});

/**
 * 游戏会话模型
 */
const GameSession = sequelize.define('GameSession', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    game_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'nback, stop, search, vigil, schulte, stroop, auditory, dual'
    },
    difficulty: {
        type: DataTypes.INTEGER,
        defaultValue: 1,
        comment: '难度等级 1-10'
    },
    start_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    end_time: {
        type: DataTypes.DATE,
        allowNull: true
    },
    duration: {
        type: DataTypes.INTEGER,
        comment: '训练时长（秒）'
    },
    score: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '本轮得分'
    },
    accuracy: {
        type: DataTypes.FLOAT,
        comment: '准确率 0-1'
    },
    avg_reaction_time: {
        type: DataTypes.FLOAT,
        comment: '平均反应时间（毫秒）'
    },
    total_trials: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '总试次数'
    },
    correct_trials: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        comment: '正确次数'
    },
    config: {
        type: JSON_TYPE,
        defaultValue: {},
        comment: '游戏配置参数'
    }
}, {
    tableName: 'game_sessions'
});

/**
 * 游戏记录详情模型
 */
const GameRecord = sequelize.define('GameRecord', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    session_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    trial_number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '试次编号'
    },
    stimulus: {
        type: JSON_TYPE,
        comment: '刺激物数据'
    },
    response: {
        type: DataTypes.STRING(50),
        comment: '用户响应'
    },
    is_correct: {
        type: DataTypes.BOOLEAN,
        comment: '是否正确'
    },
    reaction_time: {
        type: DataTypes.INTEGER,
        comment: '反应时间（毫秒）'
    },
    timestamp: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'game_records'
});

/**
 * 认知评估记录模型
 */
const Assessment = sequelize.define('Assessment', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    assessment_type: {
        type: DataTypes.ENUM('baseline', 'followup', 'full'),
        defaultValue: 'baseline',
        comment: '评估类型'
    },
    attention_score: {
        type: DataTypes.FLOAT,
        comment: '注意力综合得分'
    },
    working_memory_score: {
        type: DataTypes.FLOAT,
        comment: '工作记忆得分'
    },
    inhibition_score: {
        type: DataTypes.FLOAT,
        comment: '抑制控制得分'
    },
    visual_search_score: {
        type: DataTypes.FLOAT,
        comment: '视觉搜索得分'
    },
    sustained_attention_score: {
        type: DataTypes.FLOAT,
        comment: '持续注意得分'
    },
    task_switching_score: {
        type: DataTypes.FLOAT,
        comment: '任务切换得分'
    },
    overall_level: {
        type: DataTypes.INTEGER,
        comment: '综合等级 1-10'
    },
    recommendations: {
        type: JSON_TYPE,
        comment: '个性化建议'
    },
    completed_at: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'assessments'
});

/**
 * 成长报告模型
 */
const GrowthReport = sequelize.define('GrowthReport', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    period_type: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly'),
        defaultValue: 'weekly'
    },
    period_start: {
        type: DataTypes.DATE,
        allowNull: false
    },
    period_end: {
        type: DataTypes.DATE,
        allowNull: false
    },
    total_training_time: {
        type: DataTypes.INTEGER,
        comment: '总训练时长（分钟）'
    },
    total_sessions: {
        type: DataTypes.INTEGER,
        comment: '训练次数'
    },
    game_stats: {
        type: JSON_TYPE,
        comment: '各游戏统计数据'
    },
    improvement_rate: {
        type: DataTypes.FLOAT,
        comment: '提升率'
    },
    ai_insights: {
        type: DataTypes.TEXT,
        comment: 'AI生成的洞察'
    },
    content: {
        type: JSON_TYPE,
        comment: '报告完整内容'
    }
}, {
    tableName: 'growth_reports'
});

/**
 * 成就/勋章模型
 */
const Achievement = sequelize.define('Achievement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    code: {
        type: DataTypes.STRING(50),
        unique: true,
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.STRING(255)
    },
    icon: {
        type: DataTypes.STRING(100)
    },
    category: {
        type: DataTypes.STRING(50),
        comment: '类别：training, streak, mastery'
    },
    requirement: {
        type: JSON_TYPE,
        comment: '解锁条件'
    }
}, {
    tableName: 'achievements',
    timestamps: false
});

/**
 * 用户成就记录
 */
const UserAchievement = sequelize.define('UserAchievement', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    achievement_id: {
        type: DataTypes.UUID,
        allowNull: false
    },
    unlocked_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'user_achievements'
});

// 定义模型关系
User.hasMany(GameSession, { foreignKey: 'user_id', as: 'sessions' });
GameSession.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

GameSession.hasMany(GameRecord, { foreignKey: 'session_id', as: 'records' });
GameRecord.belongsTo(GameSession, { foreignKey: 'session_id', as: 'session' });

User.hasMany(Assessment, { foreignKey: 'user_id', as: 'assessments' });
Assessment.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(GrowthReport, { foreignKey: 'user_id', as: 'reports' });
GrowthReport.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(UserAchievement, { foreignKey: 'user_id', as: 'achievements' });
UserAchievement.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
UserAchievement.belongsTo(Achievement, { foreignKey: 'achievement_id', as: 'achievement' });

// 家长-儿童关系
User.hasMany(ParentChildRelation, { foreignKey: 'child_id', as: 'parentRelations' });
User.hasMany(ParentChildRelation, { foreignKey: 'parent_id', as: 'childRelations' });
ParentChildRelation.belongsTo(User, { foreignKey: 'parent_id', as: 'parent' });
ParentChildRelation.belongsTo(User, { foreignKey: 'child_id', as: 'child' });

module.exports = {
    sequelize,
    User,
    ParentChildRelation,
    GameSession,
    GameRecord,
    Assessment,
    GrowthReport,
    Achievement,
    UserAchievement
};
