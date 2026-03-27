const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const PickupOrder = sequelize.define(
    'PickupOrder',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        order_no: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            comment: '订单号',
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '用户ID',
        },
        deliverer_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '配送员ID',
        },
        type: {
            type: DataTypes.ENUM('express', 'food', 'medicine', 'daily'),
            allowNull: false,
            comment: '订单类型：快递、外卖、药品、生活用品',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: '订单标题',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '订单描述',
        },
        pickup_location: {
            type: DataTypes.STRING(500),
            allowNull: false,
            comment: '取货地点',
        },
        delivery_location: {
            type: DataTypes.STRING(500),
            allowNull: false,
            comment: '送达地点',
        },
        pickup_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '期望取货时间',
        },
        delivery_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '期望送达时间',
        },
        contact_name: {
            type: DataTypes.STRING(50),
            allowNull: false,
            comment: '联系人姓名',
        },
        contact_phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '联系人电话',
        },
        pickup_code: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '取货码',
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
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '订单金额',
        },
        tip: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '小费',
        },
        urgent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否紧急',
        },
        fragile: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否易碎',
        },

        status: {
            type: DataTypes.ENUM(
                'pending',
                'accepted',
                'picking',
                'delivering',
                'completed',
                'cancelled'
            ),
            defaultValue: 'pending',
            comment: '订单状态',
        },
        payment_status: {
            type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
            defaultValue: 'unpaid',
            comment: '支付状态',
        },
        settlement_status: {
            type: DataTypes.ENUM(
                'none',
                'holding',
                'settled',
                'partial_refunded',
                'refunded',
                'partial_compensated',
                'compensated'
            ),
            defaultValue: 'none',
            comment: '结算状态',
        },
        settlement_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '订单待结算基准金额',
        },
        deliverer_frozen_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '当前冻结在配送员账户内的金额',
        },
        refund_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '已退款金额',
        },
        compensation_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '系统内已补偿金额',
        },
        offline_compensation_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '需线下赔付的补偿金额',
        },
        settlement_started_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '进入担保结算时间',
        },
        settlement_hold_until: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '担保结算截止时间',
        },
        settled_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最终结算时间',
        },
        platform_commission_rate: {
            type: DataTypes.DECIMAL(5, 4),
            allowNull: true,
            comment: '平台抽成费率',
        },
        platform_commission_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '平台抽成金额',
        },
        platform_commission_settled_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '平台抽成入账时间',
        },
        settlement_note: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '结算备注',
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '订单评价图片',
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '备注',
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 1,
                max: 5,
            },
            comment: '评分',
        },
        rating_comment: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '评价内容',
        },
        accept_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '接单时间',
        },
        pickup_complete_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '取货完成时间',
        },
        pickup_photo: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '取货/代购完成照片',
        },
        delivery_complete_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '送达完成时间',
        },
        delivery_photo: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '送达照片',
        },
        cancel_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '取消原因',
        },
        cancel_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '取消时间',
        },
    },
    {
        tableName: 'pickup_orders',
        comment: '代取订单表',
        indexes: [
            {
                fields: ['order_no'],
            },
            {
                fields: ['user_id'],
            },
            {
                fields: ['deliverer_id'],
            },
            {
                fields: ['type'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

module.exports = PickupOrder;
