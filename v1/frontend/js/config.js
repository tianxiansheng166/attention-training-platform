/**
 * 前端配置文件 - 专注力星球
 */

const CONFIG = {
    // API配置
    API_BASE: window.location.hostname === 'localhost' 
        ? 'http://localhost:3000' 
        : window.location.origin,
    
    API_TIMEOUT: 10000,

    // 认知科学配置
    COGNITIVE: {
        // N-back任务配置
        NBACK: {
            MIN_LEVEL: 1,
            MAX_LEVEL: 5,
            TRIALS_PER_LEVEL: 20,
            STIMULUS_DURATION: 500,
            INTER_STIMULUS_INTERVAL: 2500,
            ACCURACY_THRESHOLD: 0.70
        },

        // Stop Signal任务配置
        STOP: {
            BLOCKS: 5,
            TRIALS_PER_BLOCK: 32,
            STOP_TRIAL_PROPORTION: 0.25,
            INITIAL_SSD: 250,
            SSD_INCREMENT: 50,
            MIN_SSD: 100,
            MAX_SSD: 500
        },

        // 舒尔特方格配置
        SCHULTE: {
            GRID_SIZES: [5, 6, 7],
            GRID_NAMES: ['5×5', '6×6', '7×7']
        },

        // Stroop任务配置
        STROOP: {
            TRIALS: { easy: 20, medium: 30, hard: 40 },
            COLORS: ['red', 'blue', 'green', 'yellow'],
            WORDS: ['红', '蓝', '绿', '黄']
        },

        // 听觉任务配置
        AUDITORY: {
            MIN_LENGTH: 4,
            MAX_LENGTH: 9,
            SPEAK_RATE: 600,
            LEVELS: { easy: 4, medium: 6, hard: 9 }
        },

        // 双任务配置
        DUAL: {
            LEVELS: {
                1: { questions: 5, time: 30 },
                2: { questions: 10, time: 60 },
                3: { questions: 15, time: 90 }
            }
        }
    },

    // 游戏维度映射
    GAME_DIMENSIONS: {
        nback: 'workingMemory',
        stop: 'inhibitoryControl',
        search: 'visualSearch',
        vigil: 'sustainedAttention',
        schulte: 'visualSearch',
        stroop: 'inhibitoryControl',
        auditory: 'workingMemory',
        dual: 'executive'
    },

    // 成就配置
    ACHIEVEMENTS: {
        FIRST_TRAINING: { id: 'first', name: '初次训练', icon: '🌟', condition: 'trainingCount >= 1' },
        WEEK_STREAK: { id: 'week7', name: '连续7天', icon: '🔥', condition: 'streak >= 7' },
        SCORE_90: { id: 'score90', name: '90分达成', icon: '💯', condition: 'maxScore >= 90' },
        MASTER: { id: 'master', name: '游戏大师', icon: '🏆', condition: 'allGamesPlayed' },
        LEGEND: { id: 'legend', name: '专注传奇', icon: '👑', condition: 'focusScore >= 95' },
        PERFECTIONIST: { id: 'perfect', name: '完美主义者', icon: '💎', condition: 'accuracy >= 95' }
    },

    // 存储键名
    STORAGE_KEYS: {
        AUTH_TOKEN: 'authToken',
        USER_INFO: 'userInfo',
        USER_LEVEL: 'userLevel',
        SESSION_ID: 'currentSessionId',
        OFFLINE_DATA: 'offline_data',
        SETTINGS: 'app_settings',
        LAST_SYNC: 'last_sync'
    },

    // 家长端配置
    PARENT: {
        REPORT_PERIODS: ['week', 'month', 'quarter'],
        ALLOWED_GAME_COUNT: 8,
        DEFAULT_DAILY_LIMIT: 30,
        DEFAULT_REMINDER_INTERVAL: 30
    }
};

// 游戏类型定义
const GAME_TYPES = {
    nback: {
        id: 'nback',
        name: '时空密码',
        icon: '🧩',
        dimension: 'workingMemory',
        description: '训练位置和颜色的双重记忆能力'
    },
    stop: {
        id: 'stop',
        name: '星际拦截',
        icon: '🛑',
        dimension: 'inhibitoryControl',
        description: '学会在干扰中保持冷静和专注'
    },
    search: {
        id: 'search',
        name: '密林寻踪',
        icon: '🦜',
        dimension: 'visualSearch',
        description: '在复杂场景中找到目标生物'
    },
    vigil: {
        id: 'vigil',
        name: '要塞守望',
        icon: '📡',
        dimension: 'sustainedAttention',
        description: '长时间保持警觉，发现隐藏信号'
    },
    schulte: {
        id: 'schulte',
        name: '舒尔特方格',
        icon: '🎯',
        dimension: 'visualSearch',
        description: '按顺序快速点击数字格训练视野'
    },
    stroop: {
        id: 'stroop',
        name: '色彩Stroop',
        icon: '🎨',
        dimension: 'inhibitoryControl',
        description: '说出文字显示的颜色而非文字'
    },
    auditory: {
        id: 'auditory',
        name: '听觉追踪',
        icon: '👂',
        dimension: 'workingMemory',
        description: '听数字序列回忆指定位置'
    },
    dual: {
        id: 'dual',
        name: '双任务训练',
        icon: '🧠',
        dimension: 'executive',
        description: '同时处理多个任务训练大脑效率'
    }
};

// 认知维度定义
const COGNITIVE_DIMENSIONS = {
    workingMemory: {
        name: '工作记忆',
        description: '暂时存储和操作信息的能力',
        games: ['nback', 'auditory'],
        icon: '🧠'
    },
    inhibitoryControl: {
        name: '抑制控制',
        description: '抑制自动反应的能力',
        games: ['stop', 'stroop'],
        icon: '🛑'
    },
    visualSearch: {
        name: '视觉搜索',
        description: '在复杂场景中寻找目标的能力',
        games: ['search', 'schulte'],
        icon: '🔍'
    },
    sustainedAttention: {
        name: '持续注意',
        description: '长时间保持专注的能力',
        games: ['vigil'],
        icon: '📡'
    },
    executive: {
        name: '执行功能',
        description: '协调多个认知过程的能力',
        games: ['dual'],
        icon: '🎯'
    }
};
