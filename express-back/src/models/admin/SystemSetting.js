const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const SystemSetting = sequelize.define(
    'SystemSetting',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        // 基础设置
        site_name: {
            type: DataTypes.STRING(100),
            allowNull: true,
            defaultValue: '哈尔滨学院校园综合服务平台',
            comment: '网站名称',
        },
        site_description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '网站描述',
        },
        contact_email: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '联系邮箱',
        },
        service_phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '客服电话',
        },
        logo_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '网站Logo URL',
        },
        maintenance_mode: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '系统维护模式',
        },
        maintenance_message: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '维护提示信息',
        },

        // 用户设置
        default_credits: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
            comment: '新用户默认积分',
        },
        daily_sign_in_credits: {
            type: DataTypes.INTEGER,
            defaultValue: 5,
            comment: '每日签到积分',
        },
        allow_guest_access: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '允许游客访问',
        },
        require_approval: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '用户注册审核',
        },
        require_email_verification: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '邮箱验证',
        },
        require_phone_verification: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '手机验证',
        },
        password_complexity: {
            type: DataTypes.ENUM('simple', 'medium', 'complex'),
            defaultValue: 'medium',
            comment: '密码复杂度',
        },

        // 订单设置
        auto_cancel_hours: {
            type: DataTypes.INTEGER,
            defaultValue: 24,
            comment: '自动取消时间(小时)',
        },
        platform_fee_rate: {
            type: DataTypes.DECIMAL(5, 2),
            defaultValue: 5.0,
            comment: '平台手续费率(%)',
        },
        min_order_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 1.0,
            comment: '最低订单金额(元)',
        },
        max_order_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 500.0,
            comment: '最高订单金额(元)',
        },
        delivery_fee_type: {
            type: DataTypes.ENUM('fixed', 'distance', 'free'),
            defaultValue: 'fixed',
            comment: '配送费计算方式',
        },
        fixed_delivery_fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 3.0,
            comment: '固定配送费(元)',
        },
        per_km_fee: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 2.0,
            comment: '每公里费用(元/公里)',
        },

        // 支付设置 - 启用方式 (JSON存储)
        payment_enabled_methods: {
            type: DataTypes.JSON,
            defaultValue: ['wechat', 'alipay', 'balance'],
            comment: '启用的支付方式',
        },
        // 微信支付配置
        wechat_app_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '微信AppID',
        },
        wechat_mch_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '微信商户号',
        },
        wechat_api_key: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '微信API密钥',
        },
        // 支付宝配置
        alipay_app_id: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '支付宝AppID',
        },
        alipay_private_key: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '支付宝应用私钥',
        },
        // 积分配置
        credit_exchange_rate: {
            type: DataTypes.INTEGER,
            defaultValue: 100,
            comment: '积分兑换比例(积分=1元)',
        },

        // 通知设置
        email_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '邮件通知',
        },
        smtp_host: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'SMTP服务器',
        },
        smtp_port: {
            type: DataTypes.INTEGER,
            defaultValue: 587,
            comment: 'SMTP端口',
        },
        smtp_username: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'SMTP用户名',
        },
        smtp_password: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: 'SMTP密码',
        },
        sms_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '短信通知',
        },
        sms_provider: {
            type: DataTypes.ENUM('aliyun', 'tencent', 'huawei'),
            defaultValue: 'aliyun',
            comment: '短信服务商',
        },
        push_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '推送通知',
        },

        // 安全设置
        max_login_attempts: {
            type: DataTypes.INTEGER,
            defaultValue: 5,
            comment: '登录失败限制次数',
        },
        lockout_duration: {
            type: DataTypes.INTEGER,
            defaultValue: 15,
            comment: '锁定时长(分钟)',
        },
        session_timeout: {
            type: DataTypes.INTEGER,
            defaultValue: 120,
            comment: '会话超时(分钟)',
        },
        ip_whitelist: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: 'IP白名单(每行一个)',
        },
        two_factor_enabled: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '启用两步验证',
        },
        api_rate_limit: {
            type: DataTypes.INTEGER,
            defaultValue: 1000,
            comment: 'API访问限制(次/小时)',
        },
    },
    {
        tableName: 'system_settings',
        comment: '系统设置表',
        timestamps: true,
        indexes: [
            {
                fields: ['site_name'],
            },
        ],
    }
);

module.exports = SystemSetting;
