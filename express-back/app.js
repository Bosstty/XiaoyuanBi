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
        endpoints: {
            auth: {
                'POST /auth/register': '用户注册',
                'POST /auth/login': '用户登录',
                'GET /auth/profile': '获取用户信息',
                'PUT /auth/profile': '更新用户信息',
                'POST /auth/change-password': '修改密码',
                'POST /auth/logout': '用户登出',
            },
            user: {
                'GET /user/profile': '获取个人资料',
                'PUT /user/profile': '更新个人资料',
                'POST /user/avatar': '上传头像',
                'GET /user/stats': '获取用户统计',
            },
            admin_auth: {
                'POST /admin/auth/login': '管理员登录',
                'GET /admin/auth/profile': '获取管理员信息',
                'POST /admin/auth/logout': '管理员登出',
            },
            admin: {
                'GET /admin/stats/dashboard': '仪表板统计',
                'GET /admin/stats': '系统统计',
                'GET /admin/users': '获取用户列表',
                'GET /admin/users/:id': '获取用户详情',
                'PATCH /admin/users/:id/status': '更新用户状态',
                'GET /admin/orders': '获取订单列表',
                'GET /admin/tasks': '获取任务列表',
                'GET /admin/posts': '获取帖子列表',
                'PATCH /admin/posts/:id/moderate': '审核帖子',
            },
            pickup: {
                'GET /pickup/orders': '获取代取订单列表',
                'POST /pickup/orders': '创建代取订单',
                'GET /pickup/orders/:id': '获取订单详情',
                'POST /pickup/orders/:id/accept': '接受订单',
                'PATCH /pickup/orders/:id/status': '更新订单状态',
                'DELETE /pickup/orders/:id': '取消订单',
                'GET /pickup/my/orders': '获取我的订单',
            },
            tasks: {
                'GET /tasks': '获取任务列表',
                'POST /tasks': '创建任务',
                'GET /tasks/:id': '获取任务详情',
                'PUT /tasks/:id': '更新任务',
                'DELETE /tasks/:id': '删除任务',
                'POST /tasks/:id/apply': '申请任务',
                'GET /tasks/:id/applications': '获取申请列表',
                'PATCH /tasks/:id/applications/:applicationId': '处理申请',
                'POST /tasks/:id/complete': '完成任务',
                'GET /tasks/my/tasks': '获取我的任务',
            },
            forum: {
                'GET /forum/posts': '获取帖子列表',
                'POST /forum/posts': '创建帖子',
                'GET /forum/posts/hot': '获取热门帖子',
                'GET /forum/posts/:id': '获取帖子详情',
                'PUT /forum/posts/:id': '更新帖子',
                'DELETE /forum/posts/:id': '删除帖子',
                'POST /forum/posts/:id/like': '点赞帖子',
                'GET /forum/posts/:id/comments': '获取评论列表',
                'POST /forum/posts/:id/comments': '创建评论',
                'POST /forum/comments/:commentId/like': '点赞评论',
                'GET /forum/my/posts': '获取我的帖子',
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
