/**
 * 专注力星球 - 统一错误处理中间件
 */

/**
 * 自定义应用错误类
 */
class AppError extends Error {
    constructor(message, statusCode, code = 'INTERNAL_ERROR') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * 开发环境错误响应
 */
const sendErrorDev = (err, res) => {
    res.status(err.statusCode || 500).json({
        success: false,
        code: err.code || 'ERROR',
        message: err.message,
        error: err,
        stack: err.stack
    });
};

/**
 * 生产环境错误响应
 */
const sendErrorProd = (err, res) => {
    // 已知操作错误 - 返回给客户端
    if (err.isOperational) {
        res.status(err.statusCode || 500).json({
            success: false,
            code: err.code || 'ERROR',
            message: err.message
        });
    } else {
        // 未知编程错误 - 不泄漏详情
        console.error('💥 未预期的错误:', err);
        res.status(500).json({
            success: false,
            code: 'INTERNAL_ERROR',
            message: '服务器内部错误，请稍后再试'
        });
    }
};

/**
 * 处理特定类型错误
 */
const handleValidationError = (err) => {
    const errors = Object.values(err.errors).map(el => el.message);
    return new AppError(`输入验证失败: ${errors.join(', ')}`, 400, 'VALIDATION_ERROR');
};

const handleDuplicateFieldsError = (err) => {
    const value = err.errmsg?.match(/(["'])(\\?.)*?\1/)[0];
    return new AppError(
        `字段值重复: ${value} 已存在`,
        400,
        'DUPLICATE_ERROR'
    );
};

const handleJWTError = () => {
    return new AppError('无效的认证令牌', 401, 'INVALID_TOKEN');
};

const handleJWTExpiredError = () => {
    return new AppError('令牌已过期，请重新登录', 401, 'TOKEN_EXPIRED');
};

/**
 * 全局错误处理中间件
 */
const errorHandler = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.code = err.code || 'INTERNAL_ERROR';

    const isProduction = process.env.NODE_ENV === 'production';
    const isDevelopment = process.env.NODE_ENV === 'development';

    // 处理特定错误类型
    if (err.name === 'ValidationError') {
        err = handleValidationError(err);
    }
    if (err.code === 11000) {
        err = handleDuplicateFieldsError(err);
    }
    if (err.name === 'JsonWebTokenError') {
        err = handleJWTError();
    }
    if (err.name === 'TokenExpiredError') {
        err = handleJWTExpiredError();
    }

    // 根据环境返回不同详细程度的错误信息
    if (isDevelopment) {
        sendErrorDev(err, res);
    } else if (isProduction) {
        sendErrorProd(err, res);
    } else {
        // 默认行为 - 类似生产环境
        sendErrorProd(err, res);
    }
};

/**
 * 处理404错误
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(`路由 ${req.originalUrl} 不存在`, 404, 'NOT_FOUND');
    next(error);
};

/**
 * 异步错误包装器
 * 自动捕获async函数中的错误
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

module.exports = {
    AppError,
    errorHandler,
    notFoundHandler,
    asyncHandler
};
