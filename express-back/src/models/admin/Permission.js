const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const Permission = sequelize.define(
    'Permission',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(100),
            allowNull: false,
            comment: '权限名称',
        },
        code: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            comment: '权限代码',
        },
        resource: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '资源名称',
        },
        action: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '操作类型',
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: '权限描述',
        },
        group: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '权限分组',
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否系统权限（不可删除）',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
            comment: '权限状态',
        },
    },
    {
        tableName: 'permissions',
        comment: '权限表',
        indexes: [
            {
                fields: ['code'],
                unique: true,
            },
            {
                fields: ['resource', 'action'],
            },
            {
                fields: ['group'],
            },
            {
                fields: ['status'],
            },
        ],
    }
);

module.exports = Permission;
