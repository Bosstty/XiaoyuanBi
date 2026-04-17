const Redis = require('ioredis');
const { responseUtils, requestUtils } = require('@/utils');

// Redis 客户端 (假设已配置)
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class RateLimitMiddleware {
    // 基础限流中间件
    static createRateLimit(options = {}) {
        const {
            windowMs = 60 * 1000, // 1分钟
            maxRequests = 100,    // 最大请求数
            message = '请求过于频繁，请稍后再试',
            keyGenerator = req => requestUtils.getClientIp(req) || 'unknown',
            skipSuccessfulRequests = false,
            skipFailedRequests = false
        } = options;

        return async (req, res, next) => {
            try {
                const key = `rate_limit:${keyGenerator(req)}`;
                const currentCount = await redis.incr(key);

                if (currentCount === 1) {
                    await redis.expire(key, Math.ceil(windowMs / 1000));
                }

                if (currentCount > maxRequests) {
                    const ttl = await redis.ttl(key);
                    return res.status(429).json(responseUtils.error(message, {
                        retry_after: ttl
                    }));
                }

                // 添加响应头
                res.set({
                    'X-RateLimit-Limit': maxRequests,
                    'X-RateLimit-Remaining': Math.max(0, maxRequests - currentCount),
                    'X-RateLimit-Reset': Date.now() + (await redis.ttl(key)) * 1000
                });

                next();
            } catch (error) {
                console.error('限流中间件错误:', error);
                next(); // 限流失败时允许通过
            }
        };
    }

    // 登录限流
    static loginRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 15 * 60 * 1000, // 15分钟
        maxRequests: 5,           // 最多5次登录尝试
        message: '登录尝试过于频繁，请15分钟后再试',
        keyGenerator: req =>
            `login:${requestUtils.getClientIp(req) || 'unknown'}:${req.body.email || req.body.phone || req.body.username}`
    });

    // 注册限流
    static registerRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 60 * 1000, // 1小时
        maxRequests: 3,           // 最多3次注册
        message: '注册过于频繁，请1小时后再试',
        keyGenerator: req => `register:${requestUtils.getClientIp(req) || 'unknown'}`
    });

    // SMS验证码限流
    static smsRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 1000,  // 1分钟
        maxRequests: 1,       // 1分钟内只能发送1次
        message: '验证码发送过于频繁，请1分钟后再试',
        keyGenerator: (req) => `sms:${req.body.phone}`
    });

    // 邮件验证码限流
    static emailRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 1000,  // 1分钟
        maxRequests: 1,       // 1分钟内只能发送1次
        message: '邮件发送过于频繁，请1分钟后再试',
        keyGenerator: (req) => `email:${req.body.email}`
    });

    // 支付限流
    static paymentRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 1000,  // 1分钟
        maxRequests: 10,      // 1分钟最多10次支付请求
        message: '支付请求过于频繁，请稍后再试',
        keyGenerator: (req) => `payment:${req.user.id}`
    });

    // 上传文件限流
    static uploadRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 1000,  // 1分钟
        maxRequests: 20,      // 1分钟最多20次上传
        message: '文件上传过于频繁，请稍后再试',
        keyGenerator: req =>
            `upload:${req.user ? req.user.id : requestUtils.getClientIp(req) || 'unknown'}`
    });

    // API总体限流
    static generalRateLimit = RateLimitMiddleware.createRateLimit({
        windowMs: 60 * 1000,  // 1分钟
        maxRequests: 1000,    // 1分钟最多1000次请求
        message: 'API请求过于频繁，请稍后再试',
        keyGenerator: req =>
            req.user ? `user:${req.user.id}` : `ip:${requestUtils.getClientIp(req) || 'unknown'}`
    });
}

module.exports = RateLimitMiddleware;
