const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');
const User = require('@/models/user/User');
const Deliverer = require('@/models/deliverer/Deliverer');
const PickupOrder = require('@/models/user/PickupOrder');
const Task = require('@/models/user/Task');

const ServiceTicket = sequelize.define('ServiceTicket', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    ticket_no: {
        type: DataTypes.STRING(20),
        unique: true
    },
    type: {
        type: DataTypes.ENUM('complaint', 'refund', 'dispute', 'suggestion', 'other'),
        allowNull: false
    },
    title: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT
    },
    priority: {
        type: DataTypes.ENUM('low', 'medium', 'high', 'urgent'),
        defaultValue: 'medium'
    },
    status: {
        type: DataTypes.ENUM('pending', 'processing', 'resolved', 'closed'),
        defaultValue: 'pending'
    },
    order_id: {
        type: DataTypes.INTEGER
    },
    task_id: {
        type: DataTypes.INTEGER
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: { model: 'users', key: 'id' }
    },
    deliverer_id: {
        type: DataTypes.INTEGER,
        references: { model: 'deliverers', key: 'id' }
    },
    service_id: {
        type: DataTypes.INTEGER
    },
    solution: {
        type: DataTypes.TEXT
    },
    resolved_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'service_tickets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// 关联
ServiceTicket.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
ServiceTicket.belongsTo(Deliverer, { as: 'deliverer', foreignKey: 'deliverer_id' });
ServiceTicket.belongsTo(PickupOrder, { as: 'order', foreignKey: 'order_id' });
ServiceTicket.belongsTo(Task, { as: 'task', foreignKey: 'task_id' });

module.exports = ServiceTicket;
