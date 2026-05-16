const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');
const User = require('@/models/user/User');
const Deliverer = require('@/models/deliverer/Deliverer');

const ChatConversation = sequelize.define('ChatConversation', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
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
    order_id: {
        type: DataTypes.INTEGER
    },
    type: {
        type: DataTypes.ENUM('user_service', 'deliverer_service', 'user_deliverer'),
        defaultValue: 'user_service'
    },
    status: {
        type: DataTypes.ENUM('open', 'closed'),
        defaultValue: 'open'
    },
    last_message: {
        type: DataTypes.TEXT
    },
    last_message_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'chat_conversations',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// 关联
ChatConversation.belongsTo(User, { as: 'user', foreignKey: 'user_id' });
ChatConversation.belongsTo(Deliverer, { as: 'deliverer', foreignKey: 'deliverer_id' });

module.exports = ChatConversation;
