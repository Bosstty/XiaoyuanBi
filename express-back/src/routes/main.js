const express = require('express');
const router = express.Router();

// 导入中间件
const { authMiddleware, adminAuthMiddleware } = require('../middleware');
const { serviceAuth } = require('../middleware/serviceAuth');
const { generalRateLimit } = require('../middleware/rateLimitMiddleware');
const { createAuditMiddleware } = require('../middleware/auditMiddleware');
const permissionMiddleware = require('../middleware/permissionMiddleware');

// 应用全局中间件
router.use(generalRateLimit); // 全局限流
router.use(createAuditMiddleware({
    excludePaths: ['/health', '/metrics', '/analytics/realtime']
})); // 审计日志

// ==============================
// 用户端 API (User Client)
// ==============================
const userRoutes = express.Router();

// 用户认证相关 - /api/user/auth/*
userRoutes.use('/auth', require('./user/auth'));

// 用户个人中心 - /api/user/profile/*
userRoutes.use('/profile', authMiddleware, require('./user/profile'));

// 订单相关 - 用户端 - /api/user/orders/*
userRoutes.use('/orders', authMiddleware, require('./user/orders'));

// 任务相关 - 用户端 - /api/user/tasks/*
userRoutes.use('/tasks', authMiddleware, require('./user/tasks'));

// 论坛相关 - /api/user/forum/*
userRoutes.use('/forum', authMiddleware, require('./user/forum'));

// 消息相关 - /api/user/messages/*
userRoutes.use('/messages', authMiddleware, require('./user/messages'));

// 客服聊天 - /api/user/chat/*
userRoutes.use('/chat', authMiddleware, require('./service/chat'));

// 钱包相关 - /api/user/wallet/*
userRoutes.use('/wallet', authMiddleware, require('./user/wallet'));

// 挂载用户端路由
router.use('/api/user', userRoutes);

// ==============================
// 配送员端 API (Deliverer Client)
// ==============================
const delivererRoutes = express.Router();

// 配送员认证 - /api/deliverer/auth/*
delivererRoutes.use('/auth', require('./deliverer/auth'));

// 配送员申请和认证 - /api/deliverer/application/*
delivererRoutes.use('/application', authMiddleware, require('./deliverer/application'));

// 订单相关 - 配送员端 - /api/deliverer/orders/*
delivererRoutes.use(
    '/orders',
    authMiddleware,
    permissionMiddleware.checkRole(['deliverer', 'admin']),
    require('./deliverer/orders')
);

// 配送员位置和状态 - /api/deliverer/status/*
delivererRoutes.use(
    '/status',
    authMiddleware,
    permissionMiddleware.checkRole(['deliverer', 'admin']),
    require('./deliverer/status')
);

// 配送员收入和统计 - /api/deliverer/earnings/*
delivererRoutes.use(
    '/earnings',
    authMiddleware,
    permissionMiddleware.checkRole(['deliverer', 'admin']),
    require('./deliverer/earnings')
);

// 配送员消息 - /api/deliverer/messages/*
delivererRoutes.use(
    '/messages',
    authMiddleware,
    permissionMiddleware.checkRole(['deliverer', 'admin']),
    require('./deliverer/messages')
);

// 挂载配送员端路由
router.use('/api/deliverer', delivererRoutes);

// ==============================
// 管理后台 API (Admin Client)
// ==============================
const adminRoutes = express.Router();

// 管理员认证 - /api/admin/auth/*
adminRoutes.use('/auth', require('./admin/auth'));

// 用户管理 - /api/admin/users/*
adminRoutes.use(
    '/users',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('user', 'admin_read'),
    require('./admin/users')
);

// 管理员管理 - /api/admin/admins/*
adminRoutes.use('/admins', adminAuthMiddleware, require('./admin/admins'));

// 客服管理 - /api/admin/services/*
adminRoutes.use('/services', adminAuthMiddleware, require('./admin/services'));

// 订单管理 - /api/admin/orders/*
adminRoutes.use(
    '/orders',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('order', 'admin'),
    require('./admin/orders')
);

// 任务管理 - /api/admin/tasks/*
adminRoutes.use(
    '/tasks',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('task', 'admin'),
    require('./admin/tasks')
);

// 配送员管理 - /api/admin/deliverers/*
adminRoutes.use(
    '/deliverers',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('deliverer', 'admin'),
    require('./admin/deliverers')
);

// 论坛管理 - /api/admin/forum/*
adminRoutes.use(
    '/forum',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('forum', 'moderate'),
    require('./admin/forum')
);

// 审核工作台 - /api/admin/reviews/*
adminRoutes.use('/reviews', adminAuthMiddleware, require('./admin/reviews'));

// 数据分析统计 - /api/admin/analytics/*
adminRoutes.use(
    '/analytics',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('analytics', 'read'),
    require('./admin/analytics')
);

// 财务管理 - /api/admin/finance/*
adminRoutes.use(
    '/finance',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('analytics', 'read'),
    require('./admin/finance')
);

// 审计日志 - /api/admin/audit/*
adminRoutes.use(
    '/audit',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('audit', 'read'),
    require('./admin/audit')
);

// 系统设置 - /api/admin/settings/*
adminRoutes.use(
    '/settings',
    adminAuthMiddleware,
    permissionMiddleware.checkPermission('system', 'manage'),
    require('./admin/systemSettings')
);

// 挂载管理端路由
router.use('/api/admin', adminRoutes);

// ==============================
// 客服端 API (Service Client)
// ==============================
const serviceRoutes = express.Router();

// 客服认证 - /api/service/auth/*
serviceRoutes.use('/auth', require('./service/auth'));

// 客服工单 - /api/service/tickets/*
serviceRoutes.use('/tickets', serviceAuth, require('./service/tickets'));

// 客服聊天 - /api/service/chat/*
serviceRoutes.use('/chat', serviceAuth, require('./service/chat'));

// 客服订单处理 - /api/service/orders/*
serviceRoutes.use('/orders', serviceAuth, require('./service/orders'));

// 客服用户管理 - /api/service/users/*
serviceRoutes.use('/users', serviceAuth, require('./service/users'));

// 客服配送员管理 - /api/service/deliverers/*
serviceRoutes.use('/deliverers', serviceAuth, require('./service/deliverers'));

// 挂载客服端路由
router.use('/api/service', serviceRoutes);

// ==============================
// 公共 API (无需认证或特殊权限)
// ==============================
const publicRoutes = express.Router();

// 邮箱验证码认证接口 - /api/auth/*
router.use('/api/auth', require('../../routes/auth'));

// 文件上传 - /api/public/upload/*
publicRoutes.use('/upload', require('./public/upload'));

// 健康检查 - /api/public/health
publicRoutes.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 服务状态 - /api/public/status
publicRoutes.get('/status', (req, res) => {
    res.json({
        service: '哈尔滨学院校园综合服务平台',
        version: '1.0.0',
        status: 'running',
        timestamp: new Date().toISOString(),
    });
});

// 挂载公共路由
router.use('/api/public', publicRoutes);

// ==============================
// 旧版本兼容性路由（如果需要）
// ==============================
// 如果前端暂时还在使用旧的路由，可以添加重定向
// router.use('/auth/*', (req, res) => {
//     res.status(301).redirect('/api/user' + req.originalUrl);
// });

// ==============================
// 错误处理中间件
// ==============================
router.use((err, req, res, next) => {
    console.error('路由错误:', err);

    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            errors: err.details,
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            message: '未授权访问',
        });
    }

    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: '登录已过期，请重新登录',
        });
    }

    res.status(500).json({
        success: false,
        message: '服务器内部错误',
    });
});

// 404 处理
router.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: `接口不存在: ${req.method} ${req.originalUrl}`,
        suggestion: '请检查API路径是否正确，所有接口都应以 /api/ 开头',
    });
});

module.exports = router;
