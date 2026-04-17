const jwt = require('jsonwebtoken');
const { Service } = require('@/models');

// 客服认证中间件
const serviceAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({
                success: false,
                message: '未提供认证令牌',
                code: 'NO_TOKEN',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        if (decoded.role !== 'service') {
            return res.status(401).json({
                success: false,
                message: '无效的客服令牌',
                code: 'INVALID_SERVICE_TOKEN',
            });
        }

        const service = await Service.findByPk(decoded.id);

        if (!service || service.status !== 'active') {
            return res.status(401).json({
                success: false,
                message: '客服账号无效或已被禁用',
                code: 'SERVICE_INVALID',
            });
        }

        req.user = service;
        req.userId = service.id;
        req.userRole = 'service';
        req.serviceScopeId = service.id;

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                success: false,
                message: '无效的认证令牌',
                code: 'TOKEN_INVALID',
            });
        } else if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                success: false,
                message: '认证令牌已过期',
                code: 'TOKEN_EXPIRED',
            });
        }
        return res.status(500).json({
            success: false,
            message: '认证失败',
            code: 'AUTH_FAILED',
        });
    }
};

module.exports = { serviceAuth };
