const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Service = sequelize.define('Service', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    username: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    phone: {
        type: DataTypes.STRING(20)
    },
    email: {
        type: DataTypes.STRING(100)
    },
    avatar: {
        type: DataTypes.STRING(255)
    },
    role: {
        type: DataTypes.ENUM('service', 'senior_service', 'manager'),
        defaultValue: 'service'
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive', 'banned'),
        defaultValue: 'active'
    },
    last_login_at: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'services',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

module.exports = Service;
