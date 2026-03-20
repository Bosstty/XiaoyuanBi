const Redis = require('ioredis');
const { AuditLog, User, PickupOrder, Task, Transaction } = require('../models');
const { Op } = require('sequelize');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class SecurityService {
    // 异常行为检测
    static async detectAnomalousActivity(userId, action, metadata = {}) {
        try {
            const anomalies = [];

            // 检测1: 短时间内大量操作
            const rapidFireAnomalies = await SecurityService.detectRapidFire(userId, action);
            anomalies.push(...rapidFireAnomalies);

            // 检测2: 异常时间操作
            const timeAnomalies = await SecurityService.detectUnusualTimeActivity(userId, action);
            anomalies.push(...timeAnomalies);

            // 检测3: 异常地理位置
            const locationAnomalies = await SecurityService.detectLocationAnomaly(
                userId,
                metadata.ip
            );
            anomalies.push(...locationAnomalies);

            // 检测4: 异常设备访问
            const deviceAnomalies = await SecurityService.detectDeviceAnomaly(
                userId,
                metadata.userAgent
            );
            anomalies.push(...deviceAnomalies);

            // 检测5: 业务逻辑异常
            const businessAnomalies = await SecurityService.detectBusinessLogicAnomaly(
                userId,
                action,
                metadata
            );
            anomalies.push(...businessAnomalies);

            if (anomalies.length > 0) {
                await SecurityService.handleAnomalies(userId, action, anomalies, metadata);
            }

            return anomalies;
        } catch (error) {
            console.error('异常检测失败:', error);
            return [];
        }
    }

    // 检测短时间内大量操作
    static async detectRapidFire(userId, action) {
        const anomalies = [];
        const key = `rapid_fire:${userId}:${action}`;
        const timeWindow = 60; // 1分钟
        const threshold = {
            login: 10,
            create_order: 20,
            payment: 15,
            message_send: 50,
            default: 30,
        };

        try {
            const count = await redis.incr(key);
            if (count === 1) {
                await redis.expire(key, timeWindow);
            }

            const limit = threshold[action] || threshold.default;
            if (count > limit) {
                anomalies.push({
                    type: 'rapid_fire',
                    level: 'high',
                    message: `用户在${timeWindow}秒内执行${action}操作${count}次，超过阈值${limit}`,
                    data: { count, limit, timeWindow },
                });
            }
        } catch (error) {
            console.error('快速操作检测失败:', error);
        }

        return anomalies;
    }

    // 检测异常时间活动
    static async detectUnusualTimeActivity(userId, action) {
        const anomalies = [];
        const now = new Date();
        const hour = now.getHours();

        // 深夜时间（0-6点）进行敏感操作
        const sensitiveActions = ['payment', 'withdraw', 'change_password', 'delete_account'];
        if (hour >= 0 && hour <= 6 && sensitiveActions.includes(action)) {
            anomalies.push({
                type: 'unusual_time',
                level: 'medium',
                message: `用户在深夜${hour}点执行敏感操作${action}`,
                data: { hour, action },
            });
        }

        // 检查用户历史活动模式
        try {
            const userPattern = await SecurityService.getUserActivityPattern(userId);
            if (userPattern && SecurityService.isOutsideNormalPattern(hour, userPattern)) {
                anomalies.push({
                    type: 'unusual_time_pattern',
                    level: 'low',
                    message: `用户在非常规时间${hour}点活动`,
                    data: { hour, pattern: userPattern },
                });
            }
        } catch (error) {
            console.error('时间模式检测失败:', error);
        }

        return anomalies;
    }

    // 检测地理位置异常
    static async detectLocationAnomaly(userId, currentIP) {
        const anomalies = [];

        try {
            // 获取用户最近的IP地址记录
            const recentIPs = await redis.lrange(`user_ips:${userId}`, 0, 9);

            if (recentIPs.length > 0 && !recentIPs.includes(currentIP)) {
                // 新IP地址，检查是否来自异常地理位置
                const locationInfo = await SecurityService.getIPLocation(currentIP);

                if (locationInfo.isProxy || locationInfo.isVPN || locationInfo.isTor) {
                    anomalies.push({
                        type: 'proxy_access',
                        level: 'high',
                        message: '用户使用代理/VPN/Tor访问',
                        data: locationInfo,
                    });
                }

                // 检查地理位置跳跃
                if (recentIPs.length > 0) {
                    const lastIP = recentIPs[0];
                    const lastLocation = await SecurityService.getIPLocation(lastIP);
                    const distance = SecurityService.calculateDistance(
                        locationInfo.latitude,
                        locationInfo.longitude,
                        lastLocation.latitude,
                        lastLocation.longitude
                    );

                    // 如果距离超过1000公里且时间间隔小于1小时
                    if (distance > 1000) {
                        const lastLoginTime = await redis.get(`last_login:${userId}`);
                        const timeDiff = Date.now() - parseInt(lastLoginTime || 0);
                        if (timeDiff < 60 * 60 * 1000) {
                            // 1小时
                            anomalies.push({
                                type: 'impossible_travel',
                                level: 'critical',
                                message: `用户在短时间内从${lastLocation.city}移动到${locationInfo.city}`,
                                data: { distance, timeDiff: timeDiff / 1000 / 60 },
                            });
                        }
                    }
                }

                // 更新IP记录
                await redis.lpush(`user_ips:${userId}`, currentIP);
                await redis.ltrim(`user_ips:${userId}`, 0, 9);
            }

            // 更新最后登录时间
            await redis.set(`last_login:${userId}`, Date.now());
        } catch (error) {
            console.error('地理位置检测失败:', error);
        }

        return anomalies;
    }

    // 检测设备异常
    static async detectDeviceAnomaly(userId, userAgent) {
        const anomalies = [];

        try {
            const deviceKey = `user_devices:${userId}`;
            const deviceHash = SecurityService.hashUserAgent(userAgent);
            const devices = await redis.smembers(deviceKey);

            if (devices.length > 0 && !devices.includes(deviceHash)) {
                // 新设备登录
                anomalies.push({
                    type: 'new_device',
                    level: 'medium',
                    message: '用户使用新设备登录',
                    data: { userAgent: userAgent.substring(0, 100) },
                });

                // 添加新设备
                await redis.sadd(deviceKey, deviceHash);
                await redis.expire(deviceKey, 30 * 24 * 60 * 60); // 30天过期
            }

            // 检查设备数量
            const deviceCount = await redis.scard(deviceKey);
            if (deviceCount > 10) {
                anomalies.push({
                    type: 'too_many_devices',
                    level: 'high',
                    message: `用户设备数量过多: ${deviceCount}`,
                    data: { deviceCount },
                });
            }
        } catch (error) {
            console.error('设备检测失败:', error);
        }

        return anomalies;
    }

    // 检测业务逻辑异常
    static async detectBusinessLogicAnomaly(userId, action, metadata) {
        const anomalies = [];

        try {
            switch (action) {
                case 'create_order':
                    await SecurityService.detectOrderAnomalies(userId, metadata, anomalies);
                    break;
                case 'payment':
                    await SecurityService.detectPaymentAnomalies(userId, metadata, anomalies);
                    break;
                case 'task_application':
                    await SecurityService.detectTaskAnomalies(userId, metadata, anomalies);
                    break;
                case 'rating':
                    await SecurityService.detectRatingAnomalies(userId, metadata, anomalies);
                    break;
            }
        } catch (error) {
            console.error('业务逻辑检测失败:', error);
        }

        return anomalies;
    }

    // 检测订单异常
    static async detectOrderAnomalies(userId, metadata, anomalies) {
        // 检查短时间内创建大量订单
        const recentOrders = await PickupOrder.count({
            where: {
                user_id: userId,
                created_at: {
                    [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24小时内
                },
            },
        });

        if (recentOrders > 20) {
            anomalies.push({
                type: 'excessive_orders',
                level: 'high',
                message: `用户24小时内创建${recentOrders}个订单`,
                data: { orderCount: recentOrders },
            });
        }

        // 检查异常金额
        if (metadata.amount && metadata.amount > 1000) {
            anomalies.push({
                type: 'high_value_order',
                level: 'medium',
                message: `用户创建高金额订单: ¥${metadata.amount}`,
                data: { amount: metadata.amount },
            });
        }
    }

    // 检测支付异常
    static async detectPaymentAnomalies(userId, metadata, anomalies) {
        // 检查频繁失败的支付
        const failedPayments = await Transaction.count({
            where: {
                user_id: userId,
                type: 'payment',
                status: 'failed',
                created_at: {
                    [Op.gte]: new Date(Date.now() - 60 * 60 * 1000), // 1小时内
                },
            },
        });

        if (failedPayments > 5) {
            anomalies.push({
                type: 'frequent_payment_failures',
                level: 'high',
                message: `用户1小时内支付失败${failedPayments}次`,
                data: { failureCount: failedPayments },
            });
        }

        // 检查大额支付
        if (metadata.amount && metadata.amount > 5000) {
            anomalies.push({
                type: 'large_payment',
                level: 'high',
                message: `用户发起大额支付: ¥${metadata.amount}`,
                data: { amount: metadata.amount },
            });
        }
    }

    // 处理异常情况
    static async handleAnomalies(userId, action, anomalies, metadata) {
        try {
            const criticalAnomalies = anomalies.filter(a => a.level === 'critical');
            const highAnomalies = anomalies.filter(a => a.level === 'high');

            // 记录安全事件
            await SecurityService.logSecurityEvent(userId, action, anomalies, metadata);

            // 关键异常 - 立即冻结账户
            if (criticalAnomalies.length > 0) {
                await SecurityService.freezeAccount(userId, 'critical_security_event');
                await SecurityService.notifySecurityTeam(userId, 'critical', anomalies);
            }
            // 高风险异常 - 增加安全措施
            else if (highAnomalies.length > 0) {
                await SecurityService.increaseSecurityLevel(userId);
                await SecurityService.notifySecurityTeam(userId, 'high', anomalies);
            }
            // 中低风险 - 记录和监控
            else {
                await SecurityService.increaseMonitoringLevel(userId);
            }
        } catch (error) {
            console.error('处理异常情况失败:', error);
        }
    }

    // 辅助方法
    static hashUserAgent(userAgent) {
        const crypto = require('crypto');
        return crypto
            .createHash('md5')
            .update(userAgent || '')
            .digest('hex');
    }

    static async getIPLocation(ip) {
        // TODO: 集成真实的IP地理位置服务
        return {
            country: 'CN',
            city: '北京',
            latitude: 39.9042,
            longitude: 116.4074,
            isProxy: false,
            isVPN: false,
            isTor: false,
        };
    }

    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半径
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    static async getUserActivityPattern(userId) {
        // TODO: 分析用户历史活动模式
        return { normalHours: [9, 10, 11, 14, 15, 16, 17, 18, 20, 21] };
    }

    static isOutsideNormalPattern(hour, pattern) {
        return !pattern.normalHours.includes(hour);
    }

    static async logSecurityEvent(userId, action, anomalies, metadata) {
        console.log('安全事件:', { userId, action, anomalies, metadata });
        // TODO: 记录到专门的安全事件表
    }

    static async freezeAccount(userId, reason) {
        await User.update({ status: 'banned' }, { where: { id: userId } });
        console.log(`账户已冻结: 用户${userId}, 原因: ${reason}`);
    }

    static async increaseSecurityLevel(userId) {
        await redis.setex(`security_level:${userId}`, 24 * 60 * 60, 'high');
        console.log(`提高用户${userId}安全等级`);
    }

    static async increaseMonitoringLevel(userId) {
        await redis.setex(`monitoring:${userId}`, 60 * 60, 'enhanced');
        console.log(`增强用户${userId}监控`);
    }

    static async notifySecurityTeam(userId, level, anomalies) {
        console.log(`通知安全团队: 用户${userId}, 等级${level}`, anomalies);
        // TODO: 发送邮件或短信通知安全团队
    }
}

module.exports = SecurityService;
