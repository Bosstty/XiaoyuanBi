const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const PickupOrderItem = sequelize.define(
    'PickupOrderItem',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '所属订单ID',
        },
        item_index: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 1,
            comment: '同一订单内第几件快递',
        },
        pickup_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '取件码',
        },
        phone_tail: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '手机尾号',
        },
        weight: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: true,
            comment: '重量(kg)',
        },
        size: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: '尺寸',
        },
    },
    {
        tableName: 'pickup_order_items',
        comment: '快递代取订单明细表',
        indexes: [
            {
                fields: ['order_id'],
            },
            {
                fields: ['order_id', 'item_index'],
            },
        ],
    }
);

module.exports = PickupOrderItem;
