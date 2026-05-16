const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');
const bcrypt = require('bcryptjs');

const Admin = sequelize.define(
    'Admin',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            unique: true,
            comment: '管理员用户名',
        },
        email: {
            type: DataTypes.STRING(100),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true,
            },
            comment: '邮箱',
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: false,
            comment: '密码',
        },
        name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '管理员姓名',
        },
        avatar: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '头像URL',
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '手机号',
        },
        role: {
            type: DataTypes.ENUM('super_admin', 'admin', 'moderator', 'service'),
            defaultValue: 'admin',
            comment: '角色：超级管理员、管理员、版主、客服',
        },
        permissions: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '权限列表',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'banned'),
            defaultValue: 'active',
            comment: '状态',
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最后登录时间',
        },
        last_login_ip: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '最后登录IP',
        },
        login_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '登录次数',
        },
        department: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '部门',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '备注',
        },
    },
    {
        tableName: 'admins',
        comment: '管理员表',
        indexes: [
            {
                fields: ['username'],
            },
            {
                fields: ['email'],
            },
            {
                fields: ['role'],
            },
            {
                fields: ['status'],
            },
        ],
    }
);

// 密码加密钩子
Admin.beforeCreate(async admin => {
    if (admin.password) {
        admin.password = await bcrypt.hash(admin.password, 12);
    }
});

Admin.beforeUpdate(async admin => {
    if (admin.changed('password')) {
        admin.password = await bcrypt.hash(admin.password, 12);
    }
});

// 实例方法
Admin.prototype.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

Admin.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

module.exports = Admin;
