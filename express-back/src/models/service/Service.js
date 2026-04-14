const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');
const bcrypt = require('bcryptjs');

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
    ticket_types: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: []
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

Service.beforeCreate(async service => {
    if (service.password && !String(service.password).startsWith('$2')) {
        service.password = await bcrypt.hash(service.password, 12);
    }
});

Service.beforeUpdate(async service => {
    if (service.changed('password') && service.password && !String(service.password).startsWith('$2')) {
        service.password = await bcrypt.hash(service.password, 12);
    }
});

Service.prototype.comparePassword = async function (password) {
    const currentPassword = String(this.password || '');
    if (!currentPassword) return false;

    if (currentPassword.startsWith('$2')) {
        return bcrypt.compare(String(password || ''), currentPassword);
    }

    return currentPassword === String(password || '');
};

module.exports = Service;
