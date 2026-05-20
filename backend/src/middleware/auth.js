/**
 * 专注力星球 - JWT认证中间件
 */

const jwt = require('jsonwebtoken');
const { User } = require('../database/models');

// JWT密钥配置 - 生产环境必须设置
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    
    // 生产环境必须设置JWT_SECRET
    if (process.env.NODE_ENV === 'production') {
        if (!secret) {
            throw new Error('生产环境必须设置 JWT_SECRET 环境变量');
        }
        if (secret.length < 32) {
            throw new Error('JWT_SECRET 长度必须至少为32个字符');
        }
    }
    
    // 开发环境使用安全的默认密钥（但会警告）
    if (!secret) {
        console.warn('⚠️ 警告: 使用默认JWT密钥，请仅在开发环境使用');
        return 'dev-secret-key-not-for-production-use';
    }
    
    return secret;
};

const JWT_SECRET = getJwtSecret();

/**
 * 验证JWT令牌
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌'
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findByPk(decoded.userId);

            if (!user || !user.is_active) {
                return res.status(401).json({
                    success: false,
                    message: '用户不存在或已被禁用'
                });
            }

            req.user = user;
            req.userId = decoded.userId;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    message: '令牌已过期，请重新登录'
                });
            }
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌'
            });
        }
    } catch (error) {
        console.error('认证中间件错误:', error);
        return res.status(500).json({
            success: false,
            message: '服务器内部错误'
        });
    }
};

/**
 * 可选认证（不强制登录也能访问）
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            const user = await User.findByPk(decoded.userId);

            if (user && user.is_active) {
                req.user = user;
                req.userId = decoded.userId;
            }
        } catch (e) {
            // 忽略错误，继续执行
        }

        next();
    } catch (error) {
        next();
    }
};

/**
 * 验证家长权限
 */
const requireParent = async (req, res, next) => {
    if (req.user.role !== 'parent') {
        return res.status(403).json({
            success: false,
            message: '需要家长账号权限'
        });
    }
    next();
};

/**
 * 生成JWT令牌
 */
const generateToken = (userId) => {
    return jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

module.exports = {
    authenticate,
    optionalAuth,
    requireParent,
    generateToken,
    JWT_SECRET
};
