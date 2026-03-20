const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const UserRole = sequelize.define(
    'UserRole',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '用户ID',
        },
        role_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'roles',
                key: 'id',
            },
            comment: '角色ID',
        },
        assigned_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'users',
                key: 'id',
            },
            comment: '分配者ID',
        },
        assigned_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW,
            comment: '分配时间',
        },
        expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '过期时间',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive'),
            defaultValue: 'active',
            comment: '状态',
        },
    },
    {
        tableName: 'user_roles',
        comment: '用户角色关联表',
        indexes: [
            {
                fields: ['user_id', 'role_id'],
                unique: true,
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['role_id'],
            },
            {
                fields: ['status'],
            },
        ],
    }
);

module.exports = UserRole;
