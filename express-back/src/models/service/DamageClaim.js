const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const DamageClaim = sequelize.define(
    'DamageClaim',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '关联订单ID',
        },
        ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '关联工单ID',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '用户ID',
        },
        deliverer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '配送员档案ID',
        },
        deliverer_user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '配送员用户ID',
        },
        claim_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '赔付追偿金额',
        },
        refund_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '退还给用户的订单金额',
        },
        frozen_deduct_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '从配送员冻结收益扣除金额',
        },
        balance_deduct_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '从配送员可用余额扣除金额',
        },
        deliverer_deduct_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '配送员共承担金额',
        },
        platform_advance_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '平台垫付金额',
        },
        debt_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '生成欠款金额',
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'settled'),
            defaultValue: 'approved',
            comment: '赔付状态',
        },
        reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '赔付原因',
        },
        processed_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '处理人ID',
        },
        processed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '处理时间',
        },
        extra_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '扩展数据',
        },
    },
    {
        tableName: 'damage_claims',
        comment: '订单损坏赔付记录表',
        indexes: [
            { fields: ['order_id'] },
            { fields: ['ticket_id'] },
            { fields: ['user_id'] },
            { fields: ['deliverer_id'] },
            { fields: ['deliverer_user_id'] },
            { fields: ['status'] },
        ],
    }
);

module.exports = DamageClaim;
