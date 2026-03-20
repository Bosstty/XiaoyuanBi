const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const AuditLog = sequelize.define(
    'AuditLog',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '操作用户ID',
        },
        admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'admins',
                key: 'id',
            },
            comment: '操作管理员ID',
        },
        action: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '操作动作',
        },
        resource_type: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '资源类型',
        },
        resource_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '资源ID',
        },
        method: {
            type: DataTypes.ENUM('GET', 'POST', 'PUT', 'DELETE', 'PATCH'),
            allowNull: false,
            comment: 'HTTP方法',
        },
        url: {
            type: DataTypes.STRING(500),
            allowNull: false,
            comment: '请求URL',
        },
        ip_address: {
            type: DataTypes.STRING(45),
            allowNull: false,
            comment: 'IP地址',
        },
        user_agent: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '用户代理',
        },
        request_body: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '请求参数（脱敏后）',
        },
        response_status: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '响应状态码',
        },
        response_body: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '响应内容（脱敏后）',
        },
        duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '请求耗时（毫秒）',
        },
        session_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '会话ID',
        },
        risk_level: {
            type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
            defaultValue: 'low',
            comment: '风险等级',
        },
        success: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            comment: '操作是否成功',
        },
        error_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '错误信息',
        },
        extra_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '扩展数据',
        },
    },
    {
        tableName: 'audit_logs',
        comment: '审计日志表',
        indexes: [
            {
                fields: ['user_id'],
            },
            {
                fields: ['admin_id'],
            },
            {
                fields: ['action'],
            },
            {
                fields: ['resource_type', 'resource_id'],
            },
            {
                fields: ['ip_address'],
            },
            {
                fields: ['risk_level'],
            },
            {
                fields: ['success'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

module.exports = AuditLog;