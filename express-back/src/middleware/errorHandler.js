const winston = require('winston');
const { requestUtils } = require('../utils');

// 配置日志记录器
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'campus-api' },
    transports: [
        new winston.transports.File({ filename: './logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: './logs/combined.log' }),
    ],
});

// 在开发环境下同时输出到控制台
if (process.env.NODE_ENV !== 'production') {
    logger.add(
        new winston.transports.Console({
            format: winston.format.simple(),
        })
    );
}

// 错误处理中间件
const errorHandler = (error, req, res, next) => {
    // 记录错误日志
    logger.error({
        message: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        ip: requestUtils.getClientIp(req),
        userAgent: req.headers['user-agent'],
        userId: req.userId,
    });

    // 根据错误类型设置响应
    let status = 500;
    let message = '服务器内部错误';

    if (error.name === 'ValidationError') {
        status = 400;
        message = '数据验证失败';
    } else if (error.name === 'SequelizeValidationError') {
        status = 400;
        message = error.errors?.[0]?.message || '数据验证失败';
    } else if (error.name === 'SequelizeUniqueConstraintError') {
        status = 400;
        message = '数据已存在';
    } else if (error.name === 'SequelizeForeignKeyConstraintError') {
        status = 400;
        message = '关联数据不存在';
    } else if (error.status) {
        status = error.status;
        message = error.message;
    }

    res.status(status).json({
        success: false,
        message,
        ...(process.env.NODE_ENV === 'development' && {
            stack: error.stack,
            error: error.message,
        }),
    });
};

// 404处理中间件
const notFound = (req, res, next) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在',
    });
};

module.exports = {
    errorHandler,
    notFound,
    logger,
};
