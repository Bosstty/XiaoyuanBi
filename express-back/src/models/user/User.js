const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define(
    'User',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        student_id: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            comment: '学号',
        },
        username: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '用户名',
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
        phone: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '手机号',
        },
        real_name: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '真实姓名',
        },
        avatar: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '头像URL',
        },
        gender: {
            type: DataTypes.ENUM('male', 'female', 'other'),
            allowNull: true,
            comment: '性别',
        },
        birthday: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '生日',
        },
        college: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '学院',
        },
        major: {
            type: DataTypes.STRING(100),
            allowNull: true,
            comment: '专业',
        },
        grade: {
            type: DataTypes.STRING(10),
            allowNull: true,
            comment: '年级',
        },
        dormitory: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '宿舍',
        },
        bio: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '个人简介',
        },
        skills: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '技能标签',
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '积分',
        },
        level: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '等级',
        },
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '余额',
        },
        rating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 5.0,
            comment: '评分',
        },
        completed_orders: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '完成订单数',
        },
        completed_tasks: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '完成任务数',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'banned'),
            defaultValue: 'active',
            comment: '状态',
        },
        email_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '邮箱验证状态',
        },
        phone_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '手机验证状态',
        },
        student_verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '学生是否认证',
        },
        student_verified_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '学生认证通过时间',
        },
        verification_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '学生认证相关数据',
        },
        wechat_openid: {
            type: DataTypes.STRING(100),
            allowNull: true,
            unique: true,
            comment: '微信OpenID',
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
    },
    {
        tableName: 'users',
        comment: '用户表',
        indexes: [
            {
                fields: ['student_id'],
            },
            {
                fields: ['email'],
            },
            {
                fields: ['phone'],
            },
            {
                fields: ['status'],
            },
        ],
    }
);

// 密码加密钩子
User.beforeCreate(async user => {
    if (user.password) {
        user.password = await bcrypt.hash(user.password, 12);
    }
});

User.beforeUpdate(async user => {
    if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 12);
    }
});

// 实例方法
User.prototype.comparePassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

User.prototype.toJSON = function () {
    const values = Object.assign({}, this.get());
    delete values.password;
    return values;
};

module.exports = User;
