const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const DelivererDebt = sequelize.define(
    'DelivererDebt',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '欠款配送员用户ID',
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '关联订单ID',
        },
        claim_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '关联赔付单ID',
        },
        source: {
            type: DataTypes.ENUM('damage_compensation'),
            defaultValue: 'damage_compensation',
            comment: '欠款来源',
        },
        principal_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '欠款本金',
        },
        remaining_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '剩余待抵扣金额',
        },
        status: {
            type: DataTypes.ENUM('active', 'partial', 'cleared'),
            defaultValue: 'active',
            comment: '欠款状态',
        },
        remark: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '备注',
        },
        cleared_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '清偿时间',
        },
    },
    {
        tableName: 'deliverer_debts',
        comment: '配送员欠款表',
        indexes: [
            { fields: ['user_id'] },
            { fields: ['order_id'] },
            { fields: ['claim_id'] },
            { fields: ['status'] },
            { fields: ['source'] },
        ],
    }
);

module.exports = DelivererDebt;
