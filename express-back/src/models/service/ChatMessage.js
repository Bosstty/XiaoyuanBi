const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');
const ChatConversation = require('./ChatConversation');

const ChatMessage = sequelize.define('ChatMessage', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    conversation_id: {
        type: DataTypes.INTEGER,
        references: { model: 'chat_conversations', key: 'id' }
    },
    sender_id: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sender_type: {
        type: DataTypes.ENUM('user', 'deliverer', 'service', 'admin'),
        allowNull: false
    },
    receiver_type: {
        type: DataTypes.ENUM('user', 'deliverer', 'service', 'admin')
    },
    content: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    type: {
        type: DataTypes.ENUM('text', 'image', 'file', 'system'),
        defaultValue: 'text'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    tableName: 'chat_messages',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// 关联
ChatMessage.belongsTo(ChatConversation, { foreignKey: 'conversation_id' });

module.exports = ChatMessage;
