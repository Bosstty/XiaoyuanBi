const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const NotificationSetting = sequelize.define(
    'NotificationSetting',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            unique: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '用户ID',
        },
        // 站内消息设置
        system_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '系统消息',
        },
        order_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '订单消息',
        },
        task_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '任务消息',
        },
        payment_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '支付消息',
        },
        forum_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '论坛消息',
        },
        chat_message: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '私聊消息',
        },
        // 推送通知设置
        push_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '系统推送',
        },
        push_order: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '订单推送',
        },
        push_task: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '任务推送',
        },
        push_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '支付推送',
        },
        push_forum: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '论坛推送',
        },
        push_chat: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '私聊推送',
        },
        // 邮件通知设置
        email_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '系统邮件',
        },
        email_order: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '订单邮件',
        },
        email_task: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '任务邮件',
        },
        email_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '支付邮件',
        },
        // 短信通知设置
        sms_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '系统短信',
        },
        sms_order: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '订单短信',
        },
        sms_task: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '任务短信',
        },
        sms_payment: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '支付短信',
        },
        // 免打扰设置
        do_not_disturb: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '免打扰模式',
        },
        dnd_start_time: {
            type: DataTypes.TIME,
            defaultValue: '22:00:00',
            comment: '免打扰开始时间',
        },
        dnd_end_time: {
            type: DataTypes.TIME,
            defaultValue: '08:00:00',
            comment: '免打扰结束时间',
        },
        // 设备推送token
        device_tokens: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '设备推送令牌',
        },
    },
    {
        tableName: 'notification_settings',
        comment: '通知设置表',
        indexes: [
            {
                fields: ['user_id'],
                unique: true,
            },
        ],
    }
);

module.exports = NotificationSetting;