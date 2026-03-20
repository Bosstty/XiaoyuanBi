const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const RolePermission = sequelize.define(
    'RolePermission',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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
        permission_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'permissions',
                key: 'id',
            },
            comment: '权限ID',
        },
    },
    {
        tableName: 'role_permissions',
        comment: '角色权限关联表',
        indexes: [
            {
                fields: ['role_id', 'permission_id'],
                unique: true,
            },
            {
                fields: ['role_id'],
            },
            {
                fields: ['permission_id'],
            },
        ],
    }
);

module.exports = RolePermission;