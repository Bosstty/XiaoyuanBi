const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const Role = sequelize.define(
    'Role',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: '角色名称',
        },
        code: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: '角色代码',
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: '角色描述',
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '角色等级，数值越大权限越高',
        },
        is_system: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否系统角色（不可删除）',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
            comment: '角色状态',
        },
    },
    {
        tableName: 'roles',
        comment: '角色表',
        indexes: [
            {
                fields: ['code'],
                unique: true,
            },
            {
                fields: ['status'],
            },
        ],
    }
);

module.exports = Role;
