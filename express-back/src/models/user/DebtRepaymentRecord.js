const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const DebtRepaymentRecord = sequelize.define(
    'DebtRepaymentRecord',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        debt_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '欠款ID',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '配送员用户ID',
        },
        source_transaction_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '触发抵扣的收入流水ID',
        },
        deduction_transaction_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '抵扣流水ID',
        },
        deduct_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '本次抵扣金额',
        },
        balance_before: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '抵扣前余额',
        },
        balance_after: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '抵扣后余额',
        },
        remark: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '备注',
        },
    },
    {
        tableName: 'debt_repayment_records',
        comment: '欠款抵扣明细表',
        indexes: [
            { fields: ['debt_id'] },
            { fields: ['user_id'] },
            { fields: ['source_transaction_id'] },
            { fields: ['deduction_transaction_id'] },
        ],
    }
);

module.exports = DebtRepaymentRecord;
