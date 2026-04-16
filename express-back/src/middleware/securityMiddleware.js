const { requestUtils } = require('../utils');

class SecurityMiddleware {
    static decodeUrlSafely(url) {
        let decoded = String(url || '');

        for (let i = 0; i < 3; i++) {
            try {
                const nextDecoded = decodeURIComponent(decoded);
                if (nextDecoded === decoded) {
                    break;
                }
                decoded = nextDecoded;
            } catch (_error) {
                break;
            }
        }

        return decoded;
    }

    static normalizePath(url) {
        return SecurityMiddleware.decodeUrlSafely(url)
            .replace(/\\/g, '/')
            .replace(/\/{2,}/g, '/')
            .toLowerCase();
    }

    static isSuspiciousRequest(req) {
        const normalizedUrl = SecurityMiddleware.normalizePath(req.originalUrl || req.url || '');

        const blockedPatterns = [
            '/../',
            '/..',
            '../',
            '/.env',
            '/.git',
            '/.svn',
            '/.ds_store',
            '/etc/passwd',
            '/proc/self/environ',
            '/wp-admin',
            '/wp-login',
            '/phpmyadmin',
            '/cgi-bin/',
            '/vendor/phpunit',
            '/server-status',
            '/actuator',
            '/swagger-ui',
            '/swagger-resources',
            '/boaform',
            '/login.action',
            '/config.',
        ];

        return blockedPatterns.some(pattern => normalizedUrl.includes(pattern));
    }

    static attachSecurityHeaders(req, res, next) {
        res.removeHeader('X-Powered-By');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
    }

    static blockSuspiciousRequests(req, res, next) {
        if (!SecurityMiddleware.isSuspiciousRequest(req)) {
            return next();
        }

        console.warn('拦截可疑请求:', {
            ip: requestUtils.getClientIp(req),
            method: req.method,
            url: req.originalUrl || req.url,
            userAgent: req.get('User-Agent'),
        });

        return res.status(404).json({
            success: false,
            message: '请求的资源不存在',
        });
    }
}

module.exports = SecurityMiddleware;
