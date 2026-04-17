const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const Message = sequelize.define(
    'Message',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        sender_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '发送者ID，null表示系统消息',
        },
        receiver_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '接收者ID',
        },
        type: {
            type: DataTypes.ENUM(
                'system',           // 系统消息
                'order',            // 订单相关
                'task',             // 任务相关
                'payment',          // 支付相关
                'verification',     // 认证相关
                'forum',            // 论坛相关
                'chat',             // 私聊消息
                'notice',           // 公告通知
                'reminder'          // 提醒消息
            ),
            allowNull: false,
            comment: '消息类型',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: '消息标题',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '消息内容',
        },
        related_type: {
            type: DataTypes.ENUM('pickup_order', 'task', 'forum_post', 'transaction', 'user'),
            allowNull: true,
            comment: '关联业务类型',
        },
        related_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '关联业务ID',
        },
        is_read: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否已读',
        },
        read_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '读取时间',
        },
        priority: {
            type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
            defaultValue: 'normal',
            comment: '消息优先级',
        },
        status: {
            type: DataTypes.ENUM('active', 'deleted', 'archived'),
            defaultValue: 'active',
            comment: '消息状态',
        },
        extra_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '扩展数据',
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '过期时间',
        },
    },
    {
        tableName: 'messages',
        comment: '消息表',
        indexes: [
            {
                fields: ['receiver_id'],
            },
            {
                fields: ['sender_id'],
            },
            {
                fields: ['type'],
            },
            {
                fields: ['is_read'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['related_type', 'related_id'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

module.exports = Message;