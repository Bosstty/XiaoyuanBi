const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Transaction = sequelize.define(
    'Transaction',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        transaction_no: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            comment: '交易流水号',
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
        type: {
            type: DataTypes.ENUM(
                'recharge', // 充值
                'withdraw', // 提现
                'payment', // 支付
                'refund', // 退款
                'earn_pickup', // 代取收入
                'earn_task', // 任务收入
                'commission_deduct', // 平台佣金
                'penalty', // 违约金
                'bonus', // 奖励
                'transfer_in', // 转入
                'transfer_out', // 转出
                'debt_deduct' // 欠款抵扣
            ),
            allowNull: false,
            comment: '交易类型',
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '交易金额',
        },
        direction: {
            type: DataTypes.ENUM('in', 'out'),
            allowNull: false,
            comment: '交易方向 in-收入 out-支出',
        },
        balance_before: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '交易前余额',
        },
        balance_after: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '交易后余额',
        },
        status: {
            type: DataTypes.ENUM('pending', 'success', 'failed', 'cancelled'),
            defaultValue: 'pending',
            comment: '交易状态',
        },
        related_type: {
            type: DataTypes.ENUM(
                'pickup_order',
                'task',
                'recharge',
                'withdraw',
                'transfer',
                'damage_claim',
                'deliverer_debt'
            ),
            allowNull: true,
            comment: '关联业务类型',
        },
        related_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '关联业务ID',
        },
        third_party_no: {
            type: DataTypes.STRING(64),
            allowNull: true,
            comment: '第三方支付流水号',
        },
        payment_method: {
            type: DataTypes.ENUM('balance', 'wechat', 'alipay', 'bank_card'),
            allowNull: true,
            comment: '支付方式',
        },
        commission_rate: {
            type: DataTypes.DECIMAL(5, 4),
            allowNull: true,
            comment: '佣金费率',
        },
        commission_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: '佣金金额',
        },
        description: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: '交易描述',
        },
        remark: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '备注',
        },
        completed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '完成时间',
        },
        expired_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '过期时间',
        },
        extra_data: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '扩展数据',
        },
    },
    {
        tableName: 'transactions',
        comment: '交易记录表',
        indexes: [
            {
                fields: ['transaction_no'],
                unique: true,
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['type'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['related_type', 'related_id'],
            },
            {
                fields: ['created_at'],
            },
            {
                fields: ['completed_at'],
            },
        ],
    }
);

module.exports = Transaction;
