const { AuditLog } = require('../models');
const { requestUtils } = require('../utils');

class AuditMiddleware {
    static decodeUrlSafely(url) {
        try {
            return decodeURIComponent(url || '');
        } catch (_error) {
            return String(url || '');
        }
    }

    static isNoiseScanRequest(req, res) {
        if (res.statusCode !== 404) {
            return false;
        }

        if (req.user || req.admin) {
            return false;
        }

        const rawUrl = req.originalUrl || req.url || '';
        const normalizedUrl = AuditMiddleware.decodeUrlSafely(rawUrl).toLowerCase();

        const suspiciousPatterns = [
            '/../',
            '..\\',
            '/.env',
            '/etc/passwd',
            '/wp-admin',
            '/wp-login',
            '/phpmyadmin',
            '/cgi-bin',
            '/vendor/phpunit',
            '/actuator',
            '/boaform',
            '/login.action',
            '/swagger',
            '/config.',
        ];

        const isSuspiciousProbe = suspiciousPatterns.some(pattern => normalizedUrl.includes(pattern));
        const isNonApiPath = !normalizedUrl.startsWith('/api/');

        return isSuspiciousProbe || isNonApiPath;
    }

    // 数据脱敏函数
    static sanitizeData(data, sensitiveFields = []) {
        if (!data || typeof data !== 'object') return data;

        const defaultSensitiveFields = [
            'password',
            'payment_password',
            'token',
            'access_token',
            'refresh_token',
            'id_card',
            'phone',
            'email',
            'bank_card',
            'credit_card',
        ];

        const allSensitiveFields = [...defaultSensitiveFields, ...sensitiveFields];
        const sanitized = JSON.parse(JSON.stringify(data));

        function recursiveSanitize(obj) {
            if (Array.isArray(obj)) {
                return obj.map(item => recursiveSanitize(item));
            }

            if (obj && typeof obj === 'object') {
                const result = {};
                for (const [key, value] of Object.entries(obj)) {
                    if (
                        allSensitiveFields.some(field =>
                            key.toLowerCase().includes(field.toLowerCase())
                        )
                    ) {
                        result[key] = '***';
                    } else {
                        result[key] = recursiveSanitize(value);
                    }
                }
                return result;
            }

            return obj;
        }

        return recursiveSanitize(sanitized);
    }

    // 确定风险等级
    static determineRiskLevel(req, res) {
        let riskLevel = 'low';

        // 高风险操作
        const highRiskActions = [
            'delete',
            'transfer',
            'withdraw',
            'payment',
            'admin_login',
            'change_password',
            'reset_password',
            'ban_user',
        ];

        // 中风险操作
        const mediumRiskActions = ['login', 'register', 'upload', 'create_order', 'update_profile'];

        const action = req.route?.path || req.path;
        const method = req.method;

        if (
            method === 'DELETE' ||
            highRiskActions.some(action_type => action.includes(action_type))
        ) {
            riskLevel = 'high';
        } else if (
            method === 'POST' ||
            method === 'PUT' ||
            mediumRiskActions.some(action_type => action.includes(action_type))
        ) {
            riskLevel = 'medium';
        }

        // 根据响应状态调整风险等级
        if (res.statusCode >= 400) {
            if (riskLevel === 'low') riskLevel = 'medium';
            else if (riskLevel === 'medium') riskLevel = 'high';
        }

        return riskLevel;
    }

    // 创建审计日志中间件
    static createAuditMiddleware(options = {}) {
        const {
            logRequests = true,
            logResponses = false,
            sensitiveFields = [],
            excludePaths = ['/health', '/metrics'],
            onlyLogErrors = false,
        } = options;

        return (req, res, next) => {
            const startTime = Date.now();
            const clientIp = requestUtils.getClientIp(req);

            // 检查是否需要跳过日志
            if (excludePaths.some(path => req.path.startsWith(path))) {
                return next();
            }

            // 保存原始的res.json方法
            const originalJson = res.json;
            let responseBody = null;

            // 重写res.json方法以捕获响应内容
            res.json = function (body) {
                responseBody = body;
                return originalJson.call(this, body);
            };

            // 在响应结束后记录日志
            res.on('finish', async () => {
                try {
                    const duration = Date.now() - startTime;
                    const success = res.statusCode < 400;

                    // 如果只记录错误且当前请求成功，则跳过
                    if (onlyLogErrors && success) {
                        return;
                    }

                    // 忽略公网常见的未登录 404 探测请求，避免污染管理审计列表
                    if (AuditMiddleware.isNoiseScanRequest(req, res)) {
                        return;
                    }

                    const logData = {
                        // 管理员请求应写入 admin_id，避免把管理员ID写到 user_id 触发外键
                        user_id: req.admin ? null : req.user?.id || null,
                        admin_id: req.admin?.id || null,
                        action: `${req.method} ${req.route?.path || req.path}`,
                        resource_type: req.params?.resource_type || null,
                        resource_id: req.params?.id || req.params?.resource_id || null,
                        method: req.method,
                        url: req.originalUrl || req.url,
                        ip_address: clientIp,
                        user_agent: req.get('User-Agent'),
                        request_body: logRequests
                            ? AuditMiddleware.sanitizeData(req.body, sensitiveFields)
                            : null,
                        response_status: res.statusCode,
                        response_body:
                            logResponses && responseBody
                                ? AuditMiddleware.sanitizeData(responseBody, sensitiveFields)
                                : null,
                        duration,
                        session_id: req.sessionID || null,
                        risk_level: AuditMiddleware.determineRiskLevel(req, res),
                        success,
                        error_message: success ? null : responseBody?.message || null,
                        extra_data: {
                            query: req.query,
                            params: req.params,
                            headers: AuditMiddleware.sanitizeData(req.headers, [
                                'authorization',
                                'cookie',
                            ]),
                        },
                    };

                    await AuditLog.create(logData);
                } catch (error) {
                    console.error('审计日志记录失败:', error);
                }
            });

            next();
        };
    }

    // 手动记录审计日志
    static async logAction(options) {
        try {
            const {
                userId = null,
                adminId = null,
                action,
                resourceType = null,
                resourceId = null,
                ipAddress,
                success = true,
                riskLevel = 'low',
                extraData = null,
                errorMessage = null,
            } = options;

            await AuditLog.create({
                user_id: userId,
                admin_id: adminId,
                action,
                resource_type: resourceType,
                resource_id: resourceId,
                method: 'MANUAL',
                url: 'manual_log',
                ip_address: ipAddress,
                risk_level: riskLevel,
                success,
                error_message: errorMessage,
                extra_data: extraData,
            });
        } catch (error) {
            console.error('手动记录审计日志失败:', error);
        }
    }

    // 批量清理过期日志
    static async cleanupOldLogs(daysToKeep = 90) {
        try {
            const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

            const deletedCount = await AuditLog.destroy({
                where: {
                    created_at: {
                        [require('sequelize').Op.lt]: cutoffDate,
                    },
                    risk_level: ['low', 'medium'], // 保留高风险日志更长时间
                },
            });

            console.log(`清理了 ${deletedCount} 条过期审计日志`);
            return deletedCount;
        } catch (error) {
            console.error('清理审计日志失败:', error);
            throw error;
        }
    }
}

module.exports = AuditMiddleware;
