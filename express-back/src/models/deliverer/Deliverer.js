const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const Deliverer = sequelize.define(
    'Deliverer',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
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
        real_name: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '真实姓名',
        },
        phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '手机号',
        },
        id_card: {
            type: DataTypes.STRING(18),
            allowNull: false,
            comment: '身份证号',
        },
        vehicle_type: {
            type: DataTypes.ENUM('bike', 'electric', 'walk', 'car'),
            allowNull: false,
            comment: '交通工具类型',
        },
        vehicle_number: {
            type: DataTypes.STRING(20),
            allowNull: true,
            comment: '车牌号或车辆编号',
        },
        emergency_contact_name: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '紧急联系人姓名',
        },
        emergency_contact_phone: {
            type: DataTypes.STRING(20),
            allowNull: false,
            comment: '紧急联系人电话',
        },
        service_areas: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '服务区域列表',
        },
        available_hours: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '可服务时间',
        },
        id_card_front: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '身份证正面照片',
        },
        id_card_back: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '身份证背面照片',
        },
        health_certificate: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '健康证照片',
        },
        vehicle_license: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '行驶证照片',
        },
        application_status: {
            type: DataTypes.ENUM('pending', 'approved', 'rejected', 'banned'),
            defaultValue: 'pending',
            comment: '申请状态',
        },
        verified: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否认证',
        },
        verifiedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '认证时间',
        },
        verifiedBy: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '认证管理员ID',
        },
        approval_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '审核时间',
        },
        approval_admin_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '审核管理员ID',
        },
        rejection_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '拒绝原因',
        },
        rating: {
            type: DataTypes.DECIMAL(3, 2),
            defaultValue: 5.0,
            comment: '配送员评分',
        },
        total_orders: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '总订单数',
        },
        completed_orders: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '完成订单数',
        },
        cancelled_orders: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '取消订单数',
        },
        total_earnings: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0.0,
            comment: '总收入',
        },
        current_latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
            comment: '当前纬度',
        },
        current_longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
            comment: '当前经度',
        },
        location_updated_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '位置更新时间',
        },
        is_online: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否在线',
        },
        last_online_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最后在线时间',
        },
        certificate_expiry: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '证件到期时间',
        },
        status: {
            type: DataTypes.ENUM('active', 'inactive', 'suspended'),
            defaultValue: 'active',
            comment: '配送员状态',
        },
        isDeleted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否已删除',
        },
    },
    {
        tableName: 'deliverers',
        comment: '配送员表',
        indexes: [
            {
                fields: ['user_id'],
                unique: true,
            },
            {
                fields: ['application_status'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['is_online'],
            },
            {
                fields: ['current_latitude', 'current_longitude'],
            },
        ],
    }
);

// 关联关系
Deliverer.associate = function (models) {
    Deliverer.belongsTo(models.User, {
        foreignKey: 'user_id',
        as: 'user',
    });

    Deliverer.hasMany(models.PickupOrder, {
        foreignKey: 'deliverer_id',
        as: 'orders',
    });
};

module.exports = Deliverer;
