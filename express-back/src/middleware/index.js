const { auth, permission, optionalAuth } = require('./auth');

// 导出常用的中间件别名
const authMiddleware = auth('user');
const adminAuthMiddleware = auth('admin');

module.exports = {
    auth,
    permission,
    optionalAuth,
    authMiddleware,
    adminAuthMiddleware,
};
