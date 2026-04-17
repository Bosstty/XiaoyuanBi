const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const Wallet = sequelize.define(
    'Wallet',
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
        balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '余额',
        },
        frozen_balance: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '冻结余额',
        },
        total_income: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '总收入',
        },
        total_expense: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '总支出',
        },
        points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '积分余额',
        },
        status: {
            type: DataTypes.ENUM('active', 'frozen', 'suspended'),
            defaultValue: 'active',
            comment: '钱包状态',
        },
        payment_password: {
            type: DataTypes.STRING(255),
            allowNull: true,
            comment: '支付密码',
        },
        payment_password_set: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否设置支付密码',
        },
        last_transaction_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最后交易时间',
        },
    },
    {
        tableName: 'wallets',
        comment: '用户钱包表',
        indexes: [
            {
                fields: ['user_id'],
                unique: true,
            },
            {
                fields: ['status'],
            },
        ],
    }
);

module.exports = Wallet;
