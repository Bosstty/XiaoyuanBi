const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const path = require('path');
require('dotenv').config();

const app = express();

// 导入主路由
const mainRouter = require('./src/routes/main');

// 导入数据库配置
const { testConnection } = require('./src/config/database');

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(
            null,
            Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
        );
    },
});
const upload = multer({ storage: storage });

// 全局中间件3
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// 请求日志中间件
app.use((req, res, next) => {
    console.log(`收到请求: ${req.method} ${req.path}`);
    next();
});

// 根路由
app.get('/', (req, res) => {
    res.json({
        message: '哈尔滨学院校园综合服务平台 API',
        version: '1.0.0',
        status: 'running',
        docs: '/api/docs',
        health: '/health',
    });
});

// 健康检查接口
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'API服务运行正常',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: 'connected',
    });
});

// API文档路由
app.get('/api/docs', (req, res) => {
    res.json({
        title: '哈尔滨学院校园综合服务平台',
        version: '1.0.0',
        baseUrl: `http://localhost:${process.env.PORT || 3000}/api`,
        description: '校园综合服务平台 API 文档，包含用户、骑手、管理员、客服等全部接口',
        endpoints: {
            // ==================== 公共接口 ====================
            public: {
                'GET /api/public/health': '健康检查',
                'GET /api/public/status': '服务状态',
                'POST /api/public/upload/single': '单文件上传 (最大10MB)',
                'POST /api/public/upload/multiple': '多文件上传 (最多5个)',
            },

            // ==================== 用户端接口 (/api/user) ====================
            user_auth: {
                'POST /api/user/auth/register': '用户注册',
                'POST /api/user/auth/login': '用户登录',
                'POST /api/user/auth/wechat-login': '微信登录',
                'POST /api/user/auth/wechat-oauth': '微信OAuth',
                'POST /api/user/auth/send-verification-code': '发送验证码',
                'POST /api/user/auth/verify-code': '验证验证码',
                'POST /api/user/auth/forgot-password': '忘记密码',
                'GET /api/user/auth/reset-password/:token': '验证重置令牌',
                'POST /api/user/auth/reset-password': '重置密码',
                'GET /api/user/auth/profile': '获取用户信息',
                'PUT /api/user/auth/profile': '更新用户信息',
                'POST /api/user/auth/change-password': '修改密码',
                'POST /api/user/auth/upload-avatar': '上传头像',
                'POST /api/user/auth/logout': '用户登出',
                'DELETE /api/user/auth/account': '注销账号',
                'GET /api/user/auth/stats': '获取用户统计',
                'GET /api/user/auth/devices': '获取登录设备',
                'POST /api/user/auth/logout-device/:device_id': '退出指定设备',
            },
            user_profile: {
                'GET /api/user/profile': '获取个人资料',
                'PUT /api/user/profile': '更新个人资料',
                'POST /api/user/profile/avatar': '上传头像',
                'GET /api/user/profile/stats': '获取用户统计',
            },
            user_orders: {
                'POST /api/user/orders': '创建订单',
                'GET /api/user/orders/my-orders': '获取我的订单',
                'GET /api/user/orders/stats': '获取订单统计',
                'GET /api/user/orders/nearby-deliverers': '获取附近骑手',
                'GET /api/user/orders/:id': '获取订单详情',
                'POST /api/user/orders/:id/cancel': '取消订单',
                'POST /api/user/orders/:id/confirm': '确认订单完成',
                'POST /api/user/orders/:id/rate': '评价订单',
                'POST /api/user/orders/:id/refund': '申请退款',
            },
            user_tasks: {
                'GET /api/user/tasks': '获取任务列表',
                'GET /api/user/tasks/:id': '获取任务详情',
                'POST /api/user/tasks': '创建任务',
                'PUT /api/user/tasks/:id': '更新任务',
                'DELETE /api/user/tasks/:id': '删除任务',
                'POST /api/user/tasks/:id/apply': '申请任务',
                'GET /api/user/tasks/:id/applications': '获取申请列表',
                'PATCH /api/user/tasks/:id/applications/:applicationId': '处理申请',
                'POST /api/user/tasks/:id/complete': '完成任务',
                'GET /api/user/tasks/my/tasks': '获取我的任务',
            },
            user_forum: {
                'GET /api/user/forum': '获取帖子列表',
                'GET /api/user/forum/hot': '获取热门帖子',
                'GET /api/user/forum/:id': '获取帖子详情',
                'GET /api/user/forum/:id/comments': '获取评论列表',
                'POST /api/user/forum': '创建帖子',
                'PUT /api/user/forum/:id': '更新帖子',
                'DELETE /api/user/forum/:id': '删除帖子',
                'POST /api/user/forum/:id/like': '点赞帖子',
                'POST /api/user/forum/:id/comments': '创建评论',
                'POST /api/user/forum/comments/:commentId/like': '点赞评论',
                'GET /api/user/forum/my/posts': '获取我的帖子',
            },
            user_messages: {
                'POST /api/user/messages/send': '发送消息',
                'GET /api/user/messages/list': '获取消息列表',
                'POST /api/user/messages/mark-read': '标记已读',
                'DELETE /api/user/messages/:message_id': '删除消息',
                'GET /api/user/messages/unread-count': '获取未读数量',
                'GET /api/user/messages/settings': '获取通知设置',
                'PUT /api/user/messages/settings': '更新通知设置',
                'POST /api/user/messages/register-device': '注册设备Token',
            },

            // ==================== 骑手端接口 (/api/deliverer) ====================
            deliverer_auth: {
                'POST /api/deliverer/auth/login': '骑手登录',
                'GET /api/deliverer/auth/profile': '获取骑手信息',
                'PUT /api/deliverer/auth/profile': '更新骑手信息',
                'POST /api/deliverer/auth/logout': '骑手登出',
            },
            deliverer_application: {
                'POST /api/deliverer/application/submit': '提交骑手申请',
                'GET /api/deliverer/application/status': '获取申请状态',
                'PUT /api/deliverer/application/update': '更新申请信息',
            },
            deliverer_orders: {
                'GET /api/deliverer/orders/available': '获取可接订单',
                'GET /api/deliverer/orders/nearby': '获取附近订单',
                'POST /api/deliverer/orders/:id/accept': '接受订单',
                'GET /api/deliverer/orders/my-orders': '获取我的订单',
                'GET /api/deliverer/orders/:id': '获取订单详情',
                'PUT /api/deliverer/orders/:id/status': '更新订单状态',
                'POST /api/deliverer/orders/:id/start-pickup': '开始取货',
                'POST /api/deliverer/orders/:id/confirm-pickup': '确认取货',
                'POST /api/deliverer/orders/:id/start-delivery': '开始配送',
                'POST /api/deliverer/orders/:id/confirm-delivery': '确认送达',
                'POST /api/deliverer/orders/:id/upload-proof': '上传配送凭证',
                'POST /api/deliverer/orders/:id/request-cancel': '申请取消订单',
                'GET /api/deliverer/orders/stats/overview': '获取配送统计',
                'GET /api/deliverer/orders/today/orders': '获取今日订单',
                'GET /api/deliverer/orders/history/orders': '获取历史订单',
            },
            deliverer_status: {
                'POST /api/deliverer/status/update': '更新状态(在线/离线)',
                'POST /api/deliverer/status/location': '更新位置',
                'GET /api/deliverer/status': '获取当前状态',
            },
            deliverer_earnings: {
                'GET /api/deliverer/earnings': '获取收益',
                'GET /api/deliverer/earnings/detail': '获取收益明细',
            },
            deliverer_messages: {
                'GET /api/deliverer/messages': '获取消息列表',
                'POST /api/deliverer/messages/send': '发送消息',
                'PATCH /api/deliverer/messages/:id/read': '标记已读',
            },

            // ==================== 管理员端接口 (/api/admin) ====================
            admin_auth: {
                'POST /api/admin/auth/login': '管理员登录',
                'GET /api/admin/auth/profile': '获取管理员信息',
                'PUT /api/admin/auth/profile': '更新管理员信息',
                'POST /api/admin/auth/change-password': '修改密码',
                'POST /api/admin/auth/logout': '管理员登出',
                'GET /api/admin/auth/permissions': '获取权限列表',
            },
            admin_users: {
                'GET /api/admin/users': '获取用户列表',
                'GET /api/admin/users/stats': '获取用户统计',
                'GET /api/admin/users/export': '导出用户',
                'POST /api/admin/users/batch-update': '批量更新用户',
                'GET /api/admin/users/:id': '获取用户详情',
                'PUT /api/admin/users/:id/status': '更新用户状态',
                'PUT /api/admin/users/:id/verify': '验证学生身份',
                'POST /api/admin/users/:id/reset-password': '重置用户密码',
                'GET /api/admin/users/:id/activity-log': '获取用户活动日志',
            },
            admin_orders: {
                'GET /api/admin/orders': '获取订单列表',
                'GET /api/admin/orders/:id': '获取订单详情',
                'PATCH /api/admin/orders/:id/status': '更新订单状态',
                'POST /api/admin/orders/batch-assign': '批量分配订单',
                'DELETE /api/admin/orders/:id': '取消订单',
                'GET /api/admin/orders/stats/overview': '获取订单统计',
            },
            admin_tasks: {
                'GET /api/admin/tasks': '获取任务列表',
                'GET /api/admin/tasks/:id': '获取任务详情',
                'PATCH /api/admin/tasks/:id/status': '更新任务状态',
                'DELETE /api/admin/tasks/:id': '删除任务',
                'GET /api/admin/tasks/stats/overview': '获取任务统计',
            },
            admin_deliverers: {
                'GET /api/admin/deliverers': '获取骑手列表',
                'GET /api/admin/deliverers/:id': '获取骑手详情',
                'PATCH /api/admin/deliverers/:id/verify': '验证骑手',
                'PATCH /api/admin/deliverers/:id/status': '更新骑手状态',
                'DELETE /api/admin/deliverers/:id': '删除/封禁骑手',
                'GET /api/admin/deliverers/stats/overview': '获取骑手统计',
            },
            admin_forum: {
                'GET /api/admin/forum/posts': '获取帖子列表',
                'GET /api/admin/forum/posts/:id': '获取帖子详情',
                'PATCH /api/admin/forum/posts/:id/moderate': '审核帖子',
                'DELETE /api/admin/forum/posts/:id': '删除帖子',
                'GET /api/admin/forum/comments': '获取评论列表',
                'DELETE /api/admin/forum/comments/:id': '删除评论',
                'GET /api/admin/forum/reports': '获取举报列表',
                'PATCH /api/admin/forum/reports/:id': '处理举报',
            },
            admin_analytics: {
                'GET /api/admin/analytics/dashboard': '平台概览',
                'GET /api/admin/analytics/user-behavior': '用户行为分析',
                'GET /api/admin/analytics/service-quality': '服务质量指标',
                'GET /api/admin/analytics/revenue': '收益分析',
                'GET /api/admin/analytics/revenue/details': '收益明细',
                'GET /api/admin/analytics/realtime': '实时数据',
                'GET /api/admin/analytics/alerts/abnormal-orders': '异常订单告警',
            },
            admin_audit: {
                'GET /api/admin/audit': '获取审计日志',
                'GET /api/admin/audit/stats': '获取审计统计',
                'GET /api/admin/audit/operators': '获取操作人员',
                'GET /api/admin/audit/high-risk': '获取高风险日志',
                'GET /api/admin/audit/:id': '获取审计详情',
                'DELETE /api/admin/audit': '删除审计日志',
                'POST /api/admin/audit/delete': '删除审计日志',
            },
            admin_settings: {
                'GET /api/admin/settings': '获取系统设置',
                'PUT /api/admin/settings': '更新系统设置',
                'GET /api/admin/settings/export': '导出设置',
                'POST /api/admin/settings/import': '导入设置',
                'POST /api/admin/settings/reset': '重置设置',
                'GET /api/admin/settings/:category': '按分类获取设置',
                'PUT /api/admin/settings/:category': '按分类更新设置',
            },

            // ==================== 客服端接口 (/api/service) ====================
            service_auth: {
                'POST /api/service/auth/login': '客服登录',
                'GET /api/service/auth/profile': '获取客服信息',
                'PUT /api/service/auth/profile': '更新客服信息',
                'POST /api/service/auth/logout': '客服登出',
            },
            service_tickets: {
                'GET /api/service/tickets': '获取工单列表',
                'GET /api/service/tickets/:id': '获取工单详情',
                'POST /api/service/tickets': '创建工单',
                'PATCH /api/service/tickets/:id/status': '更新工单状态',
                'POST /api/service/tickets/:id/assign': '分配工单',
            },
            service_chat: {
                'POST /api/service/chat/conversations': '创建会话',
                'GET /api/service/chat/conversations': '获取会话列表(客服)',
                'GET /api/service/chat/my/conversations': '获取我的会话(用户)',
                'GET /api/service/chat/conversations/:id': '获取会话详情',
                'GET /api/service/chat/messages': '获取消息列表',
                'POST /api/service/chat/messages': '发送消息',
                'POST /api/service/chat/messages/read': '标记已读',
                'GET /api/service/chat/users/:userId/stats': '获取用户统计',
            },
            service_orders: {
                'GET /api/service/orders': '获取售后订单',
                'GET /api/service/orders/:id': '获取订单详情',
                'PATCH /api/service/orders/:id/status': '处理订单状态',
                'POST /api/service/orders/:id/refund': '处理退款',
                'POST /api/service/orders/:id/compensate': '处理赔偿',
            },
            service_users: {
                'GET /api/service/users': '获取用户列表',
                'GET /api/service/users/:id': '获取用户详情',
                'POST /api/service/users/:id/ban': '封禁用户',
            },
            service_deliverers: {
                'GET /api/service/deliverers': '获取骑手列表',
                'GET /api/service/deliverers/:id': '获取骑手详情',
                'PATCH /api/service/deliverers/:id/status': '更新骑手状态',
            },
        },
    });
});

// 测试路由
app.get('/api/test', (req, res) => {
    res.json({
        success: true,
        message: '测试路由工作正常！',
        timestamp: new Date().toISOString(),
    });
});

// 注册主路由
app.use('/', mainRouter);

// 404处理
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        message: '请求的资源不存在',
        path: req.originalUrl,
    });
});

// 错误处理中间件
app.use((err, req, res, next) => {
    console.error('服务器错误:', err);
    res.status(500).json({
        success: false,
        message: '服务器内部错误',
        error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
});

const PORT = process.env.PORT || 3000;

// 启动服务器
async function start() {
    try {
        await testConnection();

        app.listen(PORT, () => {
            console.log(` 服务地址: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(' 服务启动失败:', error);
        process.exit(1);
    }
}

start();

module.exports = app;
