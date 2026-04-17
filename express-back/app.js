require('./register-alias');
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const app = express();
const { APP_ROOT, getUploadRoot } = require('./src/utils/uploads');
const { createHttpServer, initSocket } = require('./config/socket');
const { swaggerSpec } = require('./src/config/swagger');
const SecurityMiddleware = require('./src/middleware/securityMiddleware');

// 信任本机/内网反向代理，确保 req.ip 能正确读取 X-Forwarded-For
app.set('trust proxy', process.env.TRUST_PROXY || 'loopback, linklocal, uniquelocal');
app.disable('x-powered-by');

// 导入主路由
const mainRouter = require('./src/routes/main');

// 导入数据库配置
const { testConnection } = require('./src/config/database');

const uploadsDir = getUploadRoot();
const legacyUploadsDir = path.join(APP_ROOT, 'uploads');

// 全局中间件3
app.use(cors());
app.use(morgan('combined'));
app.use(SecurityMiddleware.attachSecurityHeaders);
app.use(SecurityMiddleware.blockSuspiciousRequests);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec, {
        explorer: true,
        swaggerOptions: {
            persistAuthorization: true,
        },
    })
);
app.get('/api/docs.json', (req, res) => {
    res.json(swaggerSpec);
});
app.use(
    '/uploads',
    express.static(uploadsDir, {
        maxAge: '7d',
        etag: true,
        immutable: true,
        setHeaders(res, filePath) {
            const ext = path.extname(filePath).toLowerCase();
            if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
                res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
            }
        },
    })
);
if (path.resolve(legacyUploadsDir) !== path.resolve(uploadsDir)) {
    app.use(
        '/uploads',
        express.static(legacyUploadsDir, {
            maxAge: '7d',
            etag: true,
            immutable: true,
            setHeaders(res, filePath) {
                const ext = path.extname(filePath).toLowerCase();
                if (['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) {
                    res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
                }
            },
        })
    );
}

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
        const server = createHttpServer(app);
        initSocket(server);

        server.listen(PORT, () => {
            console.log(` 服务地址: http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error(' 服务启动失败:', error);
        process.exit(1);
    }
}

start();

module.exports = app;
