const jwt = require('jsonwebtoken');
const { User, Admin } = require('../models');

// JWT认证中间件
const auth = (type = 'user') => {
    return async (req, res, next) => {
        try {
            // 添加调试日志
            console.log(`  认证检查: ${req.method} ${req.path}, 类型: ${type}`);

            const token = req.headers.authorization?.replace('Bearer ', '');

            if (!token) {
                console.log('  未提供token');
                return res.status(401).json({
                    success: false,
                    message: '未提供认证令牌',
                    code: 'NO_TOKEN',
                });
            }

            console.log(`  收到token: ${token.substring(0, 20)}...`);

            // 验证JWT
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log(`  Token解码:`, decoded);

            let user;
            if (type === 'admin') {
                user = await Admin.findByPk(decoded.id);
                console.log(`  查询管理员: ${decoded.id}, 结果:`, user ? '找到' : '未找到');

                if (!user || user.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        message: '管理员账号无效或已被禁用',
                        code: 'ADMIN_INVALID',
                    });
                }
            } else {
                user = await User.findByPk(decoded.id);
                console.log(` 查询用户: ${decoded.id}, 结果:`, user ? '找到' : '未找到');

                if (!user || user.status !== 'active') {
                    return res.status(401).json({
                        success: false,
                        message: '用户账号无效或已被禁用',
                        code: 'USER_INVALID',
                    });
                }
            }

            // 将用户信息添加到请求对象
            if (type === 'admin') {
                req.admin = user; // 区分管理员，方便审计日志写入 admin_id
            }
            req.user = user;
            req.userId = user.id;
            console.log(`  认证成功: ${user.username || user.email}`);

            next();
        } catch (error) {
            console.error('  认证错误:', error.name, error.message);

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
            } else {
                console.error('认证中间件未知错误:', error);
                return res.status(500).json({
                    success: false,
                    message: '认证失败',
                    code: 'AUTH_FAILED',
                });
            }
        }
    };
};

// 权限检查中间件 - 添加调试信息
const permission = requiredPermissions => {
    return async (req, res, next) => {
        try {
            console.log(`  权限检查: ${req.method} ${req.path}, 所需权限:`, requiredPermissions);

            const user = req.user;

            if (!user) {
                console.log('  权限检查: 未认证用户');
                return res.status(401).json({
                    success: false,
                    message: '未认证用户',
                    code: 'UNAUTHENTICATED',
                });
            }

            // 检查管理员权限
            if (user.permissions) {
                const userPermissions = user.permissions || [];
                console.log(` 用户权限:`, userPermissions);

                // 超级管理员或拥有所有权限
                if (userPermissions.includes('all')) {
                    console.log('  权限检查: 超级管理员');
                    return next();
                }

                // 检查是否有所需权限
                const hasPermission = requiredPermissions.some(permission =>
                    userPermissions.includes(permission)
                );

                if (!hasPermission) {
                    console.log('  权限检查: 权限不足');
                    return res.status(403).json({
                        success: false,
                        message: '权限不足',
                        code: 'PERMISSION_DENIED',
                        required: requiredPermissions,
                        current: userPermissions,
                    });
                }
            } else {
                console.log('  权限检查: 用户无权限字段');
            }

            console.log('  权限检查通过');
            next();
        } catch (error) {
            console.error('  权限检查错误:', error);
            return res.status(500).json({
                success: false,
                message: '权限检查失败',
                code: 'PERMISSION_CHECK_FAILED',
            });
        }
    };
};

// 可选认证中间件 - 添加调试信息
const optionalAuth = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');

        if (token) {
            try {
                console.log(`  可选认证: 检测到token`);
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                const user = await User.findByPk(decoded.id);

                if (user && user.status === 'active') {
                    req.user = user;
                    req.userId = user.id;
                    console.log(`  可选认证: 用户 ${user.username || user.email} 已设置`);
                } else {
                    console.log('  可选认证: 用户无效或未激活');
                }
            } catch (error) {
                console.log('  可选认证: token验证失败', error.message);
                // 忽略token错误，继续执行
            }
        } else {
            console.log('  可选认证: 无token，继续执行');
        }

        next();
    } catch (error) {
        console.error('  可选认证错误:', error);
        next();
    }
};

module.exports = {
    auth,
    permission,
    optionalAuth,
};
