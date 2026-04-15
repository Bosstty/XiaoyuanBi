const { SystemSetting } = require('../../models');
const { responseUtils } = require('../../utils');

class SystemSettingsController {
    // 获取所有系统设置
    static async getSettings(req, res) {
        try {
            // 只获取或创建第一条记录（所有设置存在一条记录中）
            let setting = await SystemSetting.findOne();

            // 如果不存在，则创建默认设置
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
            }

            // 转换为前端需要的格式
            const result = {
                basic: {
                    siteName: setting.site_name,
                    siteDescription: setting.site_description,
                    contactEmail: setting.contact_email,
                    servicePhone: setting.service_phone,
                    logoUrl: setting.logo_url,
                    maintenanceMode: setting.maintenance_mode,
                    maintenanceMessage: setting.maintenance_message,
                },
                user: {
                    defaultCredits: setting.default_credits,
                    dailySignInCredits: setting.daily_sign_in_credits,
                    allowGuestAccess: setting.allow_guest_access,
                    requireApproval: setting.require_approval,
                    requireEmailVerification: setting.require_email_verification,
                    requirePhoneVerification: setting.require_phone_verification,
                    passwordComplexity: setting.password_complexity,
                },
                order: {
                    autoCancelHours: setting.auto_cancel_hours,
                    platformFeeRate: parseFloat(setting.platform_fee_rate),
                    minOrderAmount: parseFloat(setting.min_order_amount),
                    maxOrderAmount: parseFloat(setting.max_order_amount),
                    deliveryFeeType: setting.delivery_fee_type,
                    fixedDeliveryFee: parseFloat(setting.fixed_delivery_fee),
                    perKmFee: parseFloat(setting.per_km_fee),
                },
                payment: {
                    enabledMethods: setting.payment_enabled_methods || [
                        'wechat',
                        'alipay',
                        'balance',
                    ],
                    wechat: {
                        appId: setting.wechat_app_id || '',
                        mchId: setting.wechat_mch_id || '',
                        apiKey: setting.wechat_api_key || '',
                    },
                    alipay: {
                        appId: setting.alipay_app_id || '',
                        privateKey: setting.alipay_private_key || '',
                    },
                    creditExchangeRate: setting.credit_exchange_rate,
                },
                notification: {
                    emailEnabled: setting.email_enabled,
                    smtp: {
                        host: setting.smtp_host || '',
                        port: setting.smtp_port,
                        username: setting.smtp_username || '',
                        password: setting.smtp_password || '',
                    },
                    smsEnabled: setting.sms_enabled,
                    smsProvider: setting.sms_provider,
                    pushEnabled: setting.push_enabled,
                },
                security: {
                    maxLoginAttempts: setting.max_login_attempts,
                    lockoutDuration: setting.lockout_duration,
                    sessionTimeout: setting.session_timeout,
                    ipWhitelist: setting.ip_whitelist || '',
                    twoFactorEnabled: setting.two_factor_enabled,
                    apiRateLimit: setting.api_rate_limit,
                },
                moderation: {
                    contentAutoReviewEnabled: setting.content_auto_review_enabled,
                    taskAutoReviewEnabled: setting.task_auto_review_enabled,
                    contentReviewWords: setting.content_review_words || '',
                    contentRejectWords: setting.content_reject_words || '',
                },
            };

            res.json(responseUtils.success(result, '获取系统设置成功'));
        } catch (error) {
            console.error('获取系统设置失败:', error);
            res.status(500).json(responseUtils.error('获取系统设置失败'));
        }
    }

    // 获取单个分类的设置
    static async getSettingsByCategory(req, res) {
        try {
            const { category } = req.params;

            const setting = await SystemSetting.findOne();
            if (!setting) {
                return res.status(404).json(responseUtils.error('系统设置不存在'));
            }

            const result = formatCategorySettings(setting, category);
            res.json(responseUtils.success(result, '获取设置成功'));
        } catch (error) {
            console.error('获取设置失败:', error);
            res.status(500).json(responseUtils.error('获取设置失败'));
        }
    }

    // 更新系统设置
    static async updateSettings(req, res) {
        try {
            const { basic, user, order, payment, notification, security, moderation } = req.body;

            // 获取现有设置
            let setting = await SystemSetting.findOne();

            // 如果不存在，则创建
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
            }

            // 更新基础设置
            if (basic) {
                setting.site_name =
                    basic.siteName !== undefined ? basic.siteName : setting.site_name;
                setting.site_description =
                    basic.siteDescription !== undefined
                        ? basic.siteDescription
                        : setting.site_description;
                setting.contact_email =
                    basic.contactEmail !== undefined ? basic.contactEmail : setting.contact_email;
                setting.service_phone =
                    basic.servicePhone !== undefined ? basic.servicePhone : setting.service_phone;
                setting.logo_url = basic.logoUrl !== undefined ? basic.logoUrl : setting.logo_url;
                setting.maintenance_mode =
                    basic.maintenanceMode !== undefined
                        ? basic.maintenanceMode
                        : setting.maintenance_mode;
                setting.maintenance_message =
                    basic.maintenanceMessage !== undefined
                        ? basic.maintenanceMessage
                        : setting.maintenance_message;
            }

            // 更新用户设置
            if (user) {
                setting.default_credits =
                    user.defaultCredits !== undefined
                        ? user.defaultCredits
                        : setting.default_credits;
                setting.daily_sign_in_credits =
                    user.dailySignInCredits !== undefined
                        ? user.dailySignInCredits
                        : setting.daily_sign_in_credits;
                setting.allow_guest_access =
                    user.allowGuestAccess !== undefined
                        ? user.allowGuestAccess
                        : setting.allow_guest_access;
                setting.require_approval =
                    user.requireApproval !== undefined
                        ? user.requireApproval
                        : setting.require_approval;
                setting.require_email_verification =
                    user.requireEmailVerification !== undefined
                        ? user.requireEmailVerification
                        : setting.require_email_verification;
                setting.require_phone_verification =
                    user.requirePhoneVerification !== undefined
                        ? user.requirePhoneVerification
                        : setting.require_phone_verification;
                setting.password_complexity =
                    user.passwordComplexity || setting.password_complexity;
            }

            // 更新订单设置
            if (order) {
                setting.auto_cancel_hours =
                    order.autoCancelHours !== undefined
                        ? order.autoCancelHours
                        : setting.auto_cancel_hours;
                setting.platform_fee_rate =
                    order.platformFeeRate !== undefined
                        ? order.platformFeeRate
                        : setting.platform_fee_rate;
                setting.min_order_amount =
                    order.minOrderAmount !== undefined
                        ? order.minOrderAmount
                        : setting.min_order_amount;
                setting.max_order_amount =
                    order.maxOrderAmount !== undefined
                        ? order.maxOrderAmount
                        : setting.max_order_amount;
                setting.delivery_fee_type = order.deliveryFeeType || setting.delivery_fee_type;
                setting.fixed_delivery_fee =
                    order.fixedDeliveryFee !== undefined
                        ? order.fixedDeliveryFee
                        : setting.fixed_delivery_fee;
                setting.per_km_fee =
                    order.perKmFee !== undefined ? order.perKmFee : setting.per_km_fee;
            }

            // 更新支付设置
            if (payment) {
                setting.payment_enabled_methods =
                    payment.enabledMethods || setting.payment_enabled_methods;
                if (payment.wechat) {
                    setting.wechat_app_id =
                        payment.wechat.appId !== undefined
                            ? payment.wechat.appId
                            : setting.wechat_app_id;
                    setting.wechat_mch_id =
                        payment.wechat.mchId !== undefined
                            ? payment.wechat.mchId
                            : setting.wechat_mch_id;
                    setting.wechat_api_key =
                        payment.wechat.apiKey !== undefined
                            ? payment.wechat.apiKey
                            : setting.wechat_api_key;
                }
                if (payment.alipay) {
                    setting.alipay_app_id =
                        payment.alipay.appId !== undefined
                            ? payment.alipay.appId
                            : setting.alipay_app_id;
                    setting.alipay_private_key =
                        payment.alipay.privateKey !== undefined
                            ? payment.alipay.privateKey
                            : setting.alipay_private_key;
                }
                setting.credit_exchange_rate =
                    payment.creditExchangeRate !== undefined
                        ? payment.creditExchangeRate
                        : setting.credit_exchange_rate;
            }

            // 更新通知设置
            if (notification) {
                setting.email_enabled =
                    notification.emailEnabled !== undefined
                        ? notification.emailEnabled
                        : setting.email_enabled;
                if (notification.smtp) {
                    setting.smtp_host =
                        notification.smtp.host !== undefined
                            ? notification.smtp.host
                            : setting.smtp_host;
                    setting.smtp_port =
                        notification.smtp.port !== undefined
                            ? notification.smtp.port
                            : setting.smtp_port;
                    setting.smtp_username =
                        notification.smtp.username !== undefined
                            ? notification.smtp.username
                            : setting.smtp_username;
                    setting.smtp_password =
                        notification.smtp.password !== undefined
                            ? notification.smtp.password
                            : setting.smtp_password;
                }
                setting.sms_enabled =
                    notification.smsEnabled !== undefined
                        ? notification.smsEnabled
                        : setting.sms_enabled;
                setting.sms_provider = notification.smsProvider || setting.sms_provider;
                setting.push_enabled =
                    notification.pushEnabled !== undefined
                        ? notification.pushEnabled
                        : setting.push_enabled;
            }

            // 更新安全设置
            if (security) {
                setting.max_login_attempts =
                    security.maxLoginAttempts !== undefined
                        ? security.maxLoginAttempts
                        : setting.max_login_attempts;
                setting.lockout_duration =
                    security.lockoutDuration !== undefined
                        ? security.lockoutDuration
                        : setting.lockout_duration;
                setting.session_timeout =
                    security.sessionTimeout !== undefined
                        ? security.sessionTimeout
                        : setting.session_timeout;
                setting.ip_whitelist =
                    security.ipWhitelist !== undefined
                        ? security.ipWhitelist
                        : setting.ip_whitelist;
                setting.two_factor_enabled =
                    security.twoFactorEnabled !== undefined
                        ? security.twoFactorEnabled
                        : setting.two_factor_enabled;
                setting.api_rate_limit =
                    security.apiRateLimit !== undefined
                        ? security.apiRateLimit
                        : setting.api_rate_limit;
            }

            if (moderation) {
                setting.content_auto_review_enabled =
                    moderation.contentAutoReviewEnabled !== undefined
                        ? moderation.contentAutoReviewEnabled
                        : setting.content_auto_review_enabled;
                setting.task_auto_review_enabled =
                    moderation.taskAutoReviewEnabled !== undefined
                        ? moderation.taskAutoReviewEnabled
                        : setting.task_auto_review_enabled;
                setting.content_review_words =
                    moderation.contentReviewWords !== undefined
                        ? moderation.contentReviewWords
                        : setting.content_review_words;
                setting.content_reject_words =
                    moderation.contentRejectWords !== undefined
                        ? moderation.contentRejectWords
                        : setting.content_reject_words;
            }

            await setting.save();

            res.json(responseUtils.success(setting, '更新系统设置成功'));
        } catch (error) {
            console.error('更新系统设置失败:', error);
            res.status(500).json(responseUtils.error('更新系统设置失败'));
        }
    }

    // 更新单个分类的设置
    static async updateSettingsByCategory(req, res) {
        try {
            const { category } = req.params;
            const { settings } = req.body;

            if (!settings) {
                return res.status(400).json(responseUtils.error('设置内容不能为空'));
            }

            // 获取现有设置
            let setting = await SystemSetting.findOne();
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
            }

            // 根据分类更新对应字段
            switch (category) {
                case 'basic':
                    setting.site_name =
                        settings.siteName !== undefined ? settings.siteName : setting.site_name;
                    setting.site_description =
                        settings.siteDescription !== undefined
                            ? settings.siteDescription
                            : setting.site_description;
                    setting.contact_email =
                        settings.contactEmail !== undefined
                            ? settings.contactEmail
                            : setting.contact_email;
                    setting.service_phone =
                        settings.servicePhone !== undefined
                            ? settings.servicePhone
                            : setting.service_phone;
                    setting.logo_url =
                        settings.logoUrl !== undefined ? settings.logoUrl : setting.logo_url;
                    setting.maintenance_mode =
                        settings.maintenanceMode !== undefined
                            ? settings.maintenanceMode
                            : setting.maintenance_mode;
                    setting.maintenance_message =
                        settings.maintenanceMessage !== undefined
                            ? settings.maintenanceMessage
                            : setting.maintenance_message;
                    break;
                case 'user':
                    setting.default_credits =
                        settings.defaultCredits !== undefined
                            ? settings.defaultCredits
                            : setting.default_credits;
                    setting.daily_sign_in_credits =
                        settings.dailySignInCredits !== undefined
                            ? settings.dailySignInCredits
                            : setting.daily_sign_in_credits;
                    setting.allow_guest_access =
                        settings.allowGuestAccess !== undefined
                            ? settings.allowGuestAccess
                            : setting.allow_guest_access;
                    setting.require_approval =
                        settings.requireApproval !== undefined
                            ? settings.requireApproval
                            : setting.require_approval;
                    setting.require_email_verification =
                        settings.requireEmailVerification !== undefined
                            ? settings.requireEmailVerification
                            : setting.require_email_verification;
                    setting.require_phone_verification =
                        settings.requirePhoneVerification !== undefined
                            ? settings.requirePhoneVerification
                            : setting.require_phone_verification;
                    setting.password_complexity =
                        settings.passwordComplexity || setting.password_complexity;
                    break;
                case 'order':
                    setting.auto_cancel_hours =
                        settings.autoCancelHours !== undefined
                            ? settings.autoCancelHours
                            : setting.auto_cancel_hours;
                    setting.platform_fee_rate =
                        settings.platformFeeRate !== undefined
                            ? settings.platformFeeRate
                            : setting.platform_fee_rate;
                    setting.min_order_amount =
                        settings.minOrderAmount !== undefined
                            ? settings.minOrderAmount
                            : setting.min_order_amount;
                    setting.max_order_amount =
                        settings.maxOrderAmount !== undefined
                            ? settings.maxOrderAmount
                            : setting.max_order_amount;
                    setting.delivery_fee_type =
                        settings.deliveryFeeType || setting.delivery_fee_type;
                    setting.fixed_delivery_fee =
                        settings.fixedDeliveryFee !== undefined
                            ? settings.fixedDeliveryFee
                            : setting.fixed_delivery_fee;
                    setting.per_km_fee =
                        settings.perKmFee !== undefined ? settings.perKmFee : setting.per_km_fee;
                    break;
                case 'payment':
                    setting.payment_enabled_methods =
                        settings.enabledMethods || setting.payment_enabled_methods;
                    if (settings.wechat) {
                        setting.wechat_app_id =
                            settings.wechat.appId !== undefined
                                ? settings.wechat.appId
                                : setting.wechat_app_id;
                        setting.wechat_mch_id =
                            settings.wechat.mchId !== undefined
                                ? settings.wechat.mchId
                                : setting.wechat_mch_id;
                        setting.wechat_api_key =
                            settings.wechat.apiKey !== undefined
                                ? settings.wechat.apiKey
                                : setting.wechat_api_key;
                    }
                    if (settings.alipay) {
                        setting.alipay_app_id =
                            settings.alipay.appId !== undefined
                                ? settings.alipay.appId
                                : setting.alipay_app_id;
                        setting.alipay_private_key =
                            settings.alipay.privateKey !== undefined
                                ? settings.alipay.privateKey
                                : setting.alipay_private_key;
                    }
                    setting.credit_exchange_rate =
                        settings.creditExchangeRate !== undefined
                            ? settings.creditExchangeRate
                            : setting.credit_exchange_rate;
                    break;
                case 'notification':
                    setting.email_enabled =
                        settings.emailEnabled !== undefined
                            ? settings.emailEnabled
                            : setting.email_enabled;
                    if (settings.smtp) {
                        setting.smtp_host =
                            settings.smtp.host !== undefined
                                ? settings.smtp.host
                                : setting.smtp_host;
                        setting.smtp_port =
                            settings.smtp.port !== undefined
                                ? settings.smtp.port
                                : setting.smtp_port;
                        setting.smtp_username =
                            settings.smtp.username !== undefined
                                ? settings.smtp.username
                                : setting.smtp_username;
                        setting.smtp_password =
                            settings.smtp.password !== undefined
                                ? settings.smtp.password
                                : setting.smtp_password;
                    }
                    setting.sms_enabled =
                        settings.smsEnabled !== undefined
                            ? settings.smsEnabled
                            : setting.sms_enabled;
                    setting.sms_provider = settings.smsProvider || setting.sms_provider;
                    setting.push_enabled =
                        settings.pushEnabled !== undefined
                            ? settings.pushEnabled
                            : setting.push_enabled;
                    break;
                case 'security':
                    setting.max_login_attempts =
                        settings.maxLoginAttempts !== undefined
                            ? settings.maxLoginAttempts
                            : setting.max_login_attempts;
                    setting.lockout_duration =
                        settings.lockoutDuration !== undefined
                            ? settings.lockoutDuration
                            : setting.lockout_duration;
                    setting.session_timeout =
                        settings.sessionTimeout !== undefined
                            ? settings.sessionTimeout
                            : setting.session_timeout;
                    setting.ip_whitelist =
                        settings.ipWhitelist !== undefined
                            ? settings.ipWhitelist
                            : setting.ip_whitelist;
                    setting.two_factor_enabled =
                        settings.twoFactorEnabled !== undefined
                            ? settings.twoFactorEnabled
                            : setting.two_factor_enabled;
                    setting.api_rate_limit =
                        settings.apiRateLimit !== undefined
                            ? settings.apiRateLimit
                            : setting.api_rate_limit;
                    break;
                case 'moderation':
                    setting.content_auto_review_enabled =
                        settings.contentAutoReviewEnabled !== undefined
                            ? settings.contentAutoReviewEnabled
                            : setting.content_auto_review_enabled;
                    setting.task_auto_review_enabled =
                        settings.taskAutoReviewEnabled !== undefined
                            ? settings.taskAutoReviewEnabled
                            : setting.task_auto_review_enabled;
                    setting.content_review_words =
                        settings.contentReviewWords !== undefined
                            ? settings.contentReviewWords
                            : setting.content_review_words;
                    setting.content_reject_words =
                        settings.contentRejectWords !== undefined
                            ? settings.contentRejectWords
                            : setting.content_reject_words;
                    break;
                default:
                    return res.status(400).json(responseUtils.error('无效的设置分类'));
            }

            await setting.save();

            const result = formatCategorySettings(setting, category);
            res.json(responseUtils.success(result, '更新设置成功'));
        } catch (error) {
            console.error('更新设置失败:', error);
            res.status(500).json(responseUtils.error('更新设置失败'));
        }
    }

    // 重置设置到默认值
    static async resetSettings(req, res) {
        try {
            const { category } = req.body;

            let setting = await SystemSetting.findOne();
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
                return res.json(
                    responseUtils.success(
                        formatCategorySettings(setting, category || 'all'),
                        '重置设置成功'
                    )
                );
            }

            const defaults = getDefaultSettings();

            if (category) {
                // 重置单个分类
                switch (category) {
                    case 'basic':
                        Object.assign(setting, {
                            site_name: defaults.site_name,
                            site_description: defaults.site_description,
                            contact_email: defaults.contact_email,
                            service_phone: defaults.service_phone,
                            logo_url: defaults.logo_url,
                            maintenance_mode: defaults.maintenance_mode,
                            maintenance_message: defaults.maintenance_message,
                        });
                        break;
                    case 'user':
                        Object.assign(setting, {
                            default_credits: defaults.default_credits,
                            daily_sign_in_credits: defaults.daily_sign_in_credits,
                            allow_guest_access: defaults.allow_guest_access,
                            require_approval: defaults.require_approval,
                            require_email_verification: defaults.require_email_verification,
                            require_phone_verification: defaults.require_phone_verification,
                            password_complexity: defaults.password_complexity,
                        });
                        break;
                    case 'order':
                        Object.assign(setting, {
                            auto_cancel_hours: defaults.auto_cancel_hours,
                            platform_fee_rate: defaults.platform_fee_rate,
                            min_order_amount: defaults.min_order_amount,
                            max_order_amount: defaults.max_order_amount,
                            delivery_fee_type: defaults.delivery_fee_type,
                            fixed_delivery_fee: defaults.fixed_delivery_fee,
                            per_km_fee: defaults.per_km_fee,
                        });
                        break;
                    case 'payment':
                        Object.assign(setting, {
                            payment_enabled_methods: defaults.payment_enabled_methods,
                            wechat_app_id: defaults.wechat_app_id,
                            wechat_mch_id: defaults.wechat_mch_id,
                            wechat_api_key: defaults.wechat_api_key,
                            alipay_app_id: defaults.alipay_app_id,
                            alipay_private_key: defaults.alipay_private_key,
                            credit_exchange_rate: defaults.credit_exchange_rate,
                        });
                        break;
                    case 'notification':
                        Object.assign(setting, {
                            email_enabled: defaults.email_enabled,
                            smtp_host: defaults.smtp_host,
                            smtp_port: defaults.smtp_port,
                            smtp_username: defaults.smtp_username,
                            smtp_password: defaults.smtp_password,
                            sms_enabled: defaults.sms_enabled,
                            sms_provider: defaults.sms_provider,
                            push_enabled: defaults.push_enabled,
                        });
                        break;
                    case 'security':
                        Object.assign(setting, {
                            max_login_attempts: defaults.max_login_attempts,
                            lockout_duration: defaults.lockout_duration,
                            session_timeout: defaults.session_timeout,
                            ip_whitelist: defaults.ip_whitelist,
                            two_factor_enabled: defaults.two_factor_enabled,
                            api_rate_limit: defaults.api_rate_limit,
                        });
                        break;
                    case 'moderation':
                        Object.assign(setting, {
                            content_auto_review_enabled: defaults.content_auto_review_enabled,
                            task_auto_review_enabled: defaults.task_auto_review_enabled,
                            content_review_words: defaults.content_review_words,
                            content_reject_words: defaults.content_reject_words,
                        });
                        break;
                    default:
                        return res.status(400).json(responseUtils.error('无效的设置分类'));
                }
            } else {
                // 重置所有设置
                Object.assign(setting, defaults);
            }

            await setting.save();

            res.json(
                responseUtils.success(
                    formatCategorySettings(setting, category || 'all'),
                    '重置设置成功'
                )
            );
        } catch (error) {
            console.error('重置设置失败:', error);
            res.status(500).json(responseUtils.error('重置设置失败'));
        }
    }

    // 导出设置
    static async exportSettings(req, res) {
        try {
            let setting = await SystemSetting.findOne();
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
            }

            const allSettings = {
                basic: formatCategorySettings(setting, 'basic'),
                user: formatCategorySettings(setting, 'user'),
                order: formatCategorySettings(setting, 'order'),
                payment: formatCategorySettings(setting, 'payment'),
                notification: formatCategorySettings(setting, 'notification'),
                security: formatCategorySettings(setting, 'security'),
                moderation: formatCategorySettings(setting, 'moderation'),
            };

            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=system-settings.json');
            res.json(allSettings);
        } catch (error) {
            console.error('导出设置失败:', error);
            res.status(500).json(responseUtils.error('导出设置失败'));
        }
    }

    // 导入设置
    static async importSettings(req, res) {
        try {
            const settings = req.body;

            if (!settings || typeof settings !== 'object') {
                return res.status(400).json(responseUtils.error('无效的设置数据'));
            }

            let setting = await SystemSetting.findOne();
            if (!setting) {
                setting = await SystemSetting.create(getDefaultSettings());
            }

            // 更新所有分类
            if (settings.basic) {
                const basic = settings.basic;
                setting.site_name =
                    basic.siteName !== undefined ? basic.siteName : setting.site_name;
                setting.site_description =
                    basic.siteDescription !== undefined
                        ? basic.siteDescription
                        : setting.site_description;
                setting.contact_email =
                    basic.contactEmail !== undefined ? basic.contactEmail : setting.contact_email;
                setting.service_phone =
                    basic.servicePhone !== undefined ? basic.servicePhone : setting.service_phone;
                setting.logo_url = basic.logoUrl !== undefined ? basic.logoUrl : setting.logo_url;
                setting.maintenance_mode =
                    basic.maintenanceMode !== undefined
                        ? basic.maintenanceMode
                        : setting.maintenance_mode;
                setting.maintenance_message =
                    basic.maintenanceMessage !== undefined
                        ? basic.maintenanceMessage
                        : setting.maintenance_message;
            }

            if (settings.user) {
                const user = settings.user;
                setting.default_credits =
                    user.defaultCredits !== undefined
                        ? user.defaultCredits
                        : setting.default_credits;
                setting.daily_sign_in_credits =
                    user.dailySignInCredits !== undefined
                        ? user.dailySignInCredits
                        : setting.daily_sign_in_credits;
                setting.allow_guest_access =
                    user.allowGuestAccess !== undefined
                        ? user.allowGuestAccess
                        : setting.allow_guest_access;
                setting.require_approval =
                    user.requireApproval !== undefined
                        ? user.requireApproval
                        : setting.require_approval;
                setting.require_email_verification =
                    user.requireEmailVerification !== undefined
                        ? user.requireEmailVerification
                        : setting.require_email_verification;
                setting.require_phone_verification =
                    user.requirePhoneVerification !== undefined
                        ? user.requirePhoneVerification
                        : setting.require_phone_verification;
                setting.password_complexity =
                    user.passwordComplexity || setting.password_complexity;
            }

            if (settings.order) {
                const order = settings.order;
                setting.auto_cancel_hours =
                    order.autoCancelHours !== undefined
                        ? order.autoCancelHours
                        : setting.auto_cancel_hours;
                setting.platform_fee_rate =
                    order.platformFeeRate !== undefined
                        ? order.platformFeeRate
                        : setting.platform_fee_rate;
                setting.min_order_amount =
                    order.minOrderAmount !== undefined
                        ? order.minOrderAmount
                        : setting.min_order_amount;
                setting.max_order_amount =
                    order.maxOrderAmount !== undefined
                        ? order.maxOrderAmount
                        : setting.max_order_amount;
                setting.delivery_fee_type = order.deliveryFeeType || setting.delivery_fee_type;
                setting.fixed_delivery_fee =
                    order.fixedDeliveryFee !== undefined
                        ? order.fixedDeliveryFee
                        : setting.fixed_delivery_fee;
                setting.per_km_fee =
                    order.perKmFee !== undefined ? order.perKmFee : setting.per_km_fee;
            }

            if (settings.payment) {
                const payment = settings.payment;
                setting.payment_enabled_methods =
                    payment.enabledMethods || setting.payment_enabled_methods;
                if (payment.wechat) {
                    setting.wechat_app_id =
                        payment.wechat.appId !== undefined
                            ? payment.wechat.appId
                            : setting.wechat_app_id;
                    setting.wechat_mch_id =
                        payment.wechat.mchId !== undefined
                            ? payment.wechat.mchId
                            : setting.wechat_mch_id;
                    setting.wechat_api_key =
                        payment.wechat.apiKey !== undefined
                            ? payment.wechat.apiKey
                            : setting.wechat_api_key;
                }
                if (payment.alipay) {
                    setting.alipay_app_id =
                        payment.alipay.appId !== undefined
                            ? payment.alipay.appId
                            : setting.alipay_app_id;
                    setting.alipay_private_key =
                        payment.alipay.privateKey !== undefined
                            ? payment.alipay.privateKey
                            : setting.alipay_private_key;
                }
                setting.credit_exchange_rate =
                    payment.creditExchangeRate !== undefined
                        ? payment.creditExchangeRate
                        : setting.credit_exchange_rate;
            }

            if (settings.notification) {
                const notification = settings.notification;
                setting.email_enabled =
                    notification.emailEnabled !== undefined
                        ? notification.emailEnabled
                        : setting.email_enabled;
                if (notification.smtp) {
                    setting.smtp_host =
                        notification.smtp.host !== undefined
                            ? notification.smtp.host
                            : setting.smtp_host;
                    setting.smtp_port =
                        notification.smtp.port !== undefined
                            ? notification.smtp.port
                            : setting.smtp_port;
                    setting.smtp_username =
                        notification.smtp.username !== undefined
                            ? notification.smtp.username
                            : setting.smtp_username;
                    setting.smtp_password =
                        notification.smtp.password !== undefined
                            ? notification.smtp.password
                            : setting.smtp_password;
                }
                setting.sms_enabled =
                    notification.smsEnabled !== undefined
                        ? notification.smsEnabled
                        : setting.sms_enabled;
                setting.sms_provider = notification.smsProvider || setting.sms_provider;
                setting.push_enabled =
                    notification.pushEnabled !== undefined
                        ? notification.pushEnabled
                        : setting.push_enabled;
            }

            if (settings.security) {
                const security = settings.security;
                setting.max_login_attempts =
                    security.maxLoginAttempts !== undefined
                        ? security.maxLoginAttempts
                        : setting.max_login_attempts;
                setting.lockout_duration =
                    security.lockoutDuration !== undefined
                        ? security.lockoutDuration
                        : setting.lockout_duration;
                setting.session_timeout =
                    security.sessionTimeout !== undefined
                        ? security.sessionTimeout
                        : setting.session_timeout;
                setting.ip_whitelist =
                    security.ipWhitelist !== undefined
                        ? security.ipWhitelist
                        : setting.ip_whitelist;
                setting.two_factor_enabled =
                    security.twoFactorEnabled !== undefined
                        ? security.twoFactorEnabled
                        : setting.two_factor_enabled;
                setting.api_rate_limit =
                    security.apiRateLimit !== undefined
                        ? security.apiRateLimit
                        : setting.api_rate_limit;
            }

            if (settings.moderation) {
                const moderation = settings.moderation;
                setting.content_auto_review_enabled =
                    moderation.contentAutoReviewEnabled !== undefined
                        ? moderation.contentAutoReviewEnabled
                        : setting.content_auto_review_enabled;
                setting.task_auto_review_enabled =
                    moderation.taskAutoReviewEnabled !== undefined
                        ? moderation.taskAutoReviewEnabled
                        : setting.task_auto_review_enabled;
                setting.content_review_words =
                    moderation.contentReviewWords !== undefined
                        ? moderation.contentReviewWords
                        : setting.content_review_words;
                setting.content_reject_words =
                    moderation.contentRejectWords !== undefined
                        ? moderation.contentRejectWords
                        : setting.content_reject_words;
            }

            await setting.save();

            res.json(responseUtils.success(null, '导入设置成功'));
        } catch (error) {
            console.error('导入设置失败:', error);
            res.status(500).json(responseUtils.error('导入设置失败'));
        }
    }
}

// 格式化单个分类的设置
function formatCategorySettings(setting, category) {
    switch (category) {
        case 'basic':
            return {
                siteName: setting.site_name,
                siteDescription: setting.site_description,
                contactEmail: setting.contact_email,
                servicePhone: setting.service_phone,
                logoUrl: setting.logo_url,
                maintenanceMode: setting.maintenance_mode,
                maintenanceMessage: setting.maintenance_message,
            };
        case 'user':
            return {
                defaultCredits: setting.default_credits,
                dailySignInCredits: setting.daily_sign_in_credits,
                allowGuestAccess: setting.allow_guest_access,
                requireApproval: setting.require_approval,
                requireEmailVerification: setting.require_email_verification,
                requirePhoneVerification: setting.require_phone_verification,
                passwordComplexity: setting.password_complexity,
            };
        case 'order':
            return {
                autoCancelHours: setting.auto_cancel_hours,
                platformFeeRate: parseFloat(setting.platform_fee_rate),
                minOrderAmount: parseFloat(setting.min_order_amount),
                maxOrderAmount: parseFloat(setting.max_order_amount),
                deliveryFeeType: setting.delivery_fee_type,
                fixedDeliveryFee: parseFloat(setting.fixed_delivery_fee),
                perKmFee: parseFloat(setting.per_km_fee),
            };
        case 'payment':
            return {
                enabledMethods: setting.payment_enabled_methods || ['wechat', 'alipay', 'balance'],
                wechat: {
                    appId: setting.wechat_app_id || '',
                    mchId: setting.wechat_mch_id || '',
                    apiKey: setting.wechat_api_key || '',
                },
                alipay: {
                    appId: setting.alipay_app_id || '',
                    privateKey: setting.alipay_private_key || '',
                },
                creditExchangeRate: setting.credit_exchange_rate,
            };
        case 'notification':
            return {
                emailEnabled: setting.email_enabled,
                smtp: {
                    host: setting.smtp_host || '',
                    port: setting.smtp_port,
                    username: setting.smtp_username || '',
                    password: setting.smtp_password || '',
                },
                smsEnabled: setting.sms_enabled,
                smsProvider: setting.sms_provider,
                pushEnabled: setting.push_enabled,
            };
        case 'security':
            return {
                maxLoginAttempts: setting.max_login_attempts,
                lockoutDuration: setting.lockout_duration,
                sessionTimeout: setting.session_timeout,
                ipWhitelist: setting.ip_whitelist || '',
                twoFactorEnabled: setting.two_factor_enabled,
                apiRateLimit: setting.api_rate_limit,
            };
        case 'moderation':
            return {
                contentAutoReviewEnabled: setting.content_auto_review_enabled,
                taskAutoReviewEnabled: setting.task_auto_review_enabled,
                contentReviewWords: setting.content_review_words || '',
                contentRejectWords: setting.content_reject_words || '',
            };
        default:
            return {};
    }
}

// 获取默认设置
function getDefaultSettings() {
    return {
        site_name: '哈尔滨学院校园综合服务平台',
        site_description: '为哈尔滨学院学生提供便捷的校园生活服务',
        contact_email: 'support@campus.edu.cn',
        service_phone: '400-123-4567',
        logo_url: '',
        maintenance_mode: false,
        maintenance_message: '系统维护中，请稍后再试',
        default_credits: 100,
        daily_sign_in_credits: 5,
        allow_guest_access: true,
        require_approval: false,
        require_email_verification: true,
        require_phone_verification: false,
        password_complexity: 'medium',
        auto_cancel_hours: 24,
        platform_fee_rate: 5.0,
        min_order_amount: 1.0,
        max_order_amount: 500.0,
        delivery_fee_type: 'fixed',
        fixed_delivery_fee: 3.0,
        per_km_fee: 2.0,
        payment_enabled_methods: ['wechat', 'alipay', 'balance'],
        wechat_app_id: '',
        wechat_mch_id: '',
        wechat_api_key: '',
        alipay_app_id: '',
        alipay_private_key: '',
        credit_exchange_rate: 100,
        email_enabled: true,
        smtp_host: '',
        smtp_port: 587,
        smtp_username: '',
        smtp_password: '',
        sms_enabled: false,
        sms_provider: 'aliyun',
        push_enabled: true,
        max_login_attempts: 5,
        lockout_duration: 15,
        session_timeout: 120,
        ip_whitelist: '',
        two_factor_enabled: false,
        api_rate_limit: 1000,
        content_auto_review_enabled: true,
        task_auto_review_enabled: true,
        content_review_words:
            '代写,代考,刷单,兼职刷,高价收,低价出,外挂,破解,翻墙,vpn,加微信,vx,qq,返利,套现',
        content_reject_words: '毒品,枪支,办证,假证,裸聊,招嫖,约炮,赌博,私彩,洗钱,发票',
    };
}

module.exports = SystemSettingsController;
