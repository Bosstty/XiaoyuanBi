const path = require('path');
const { Sequelize } = require('sequelize');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const sequelize = new Sequelize(
    process.env.DB_NAME || 'campus_platform',
    process.env.DB_USER || 'root',
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        timezone: '+08:00',
        dialectOptions: {
            connectTimeout: 10000,
            enableKeepAlive: true,
            keepAliveInitialDelay: 0,
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000,
            evict: 1000,
        },
        retry: {
            max: 2,
            match: [/ECONNRESET/i, /SequelizeConnection/i, /SequelizeConnectionAcquireTimeoutError/i],
        },
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true,
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
        },
    }
);

// 测试连接
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('数据库连接成功');
    } catch (error) {
        console.error('数据库连接失败:', error);
    }
}

module.exports = {
    sequelize,
    testConnection,
};
