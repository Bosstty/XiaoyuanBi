const { sequelize } = require('../../config/database');
const models = require('../../models');

async function migrate() {
    try {
        console.log('开始数据库迁移...');

        // 创建所有表
        await sequelize.sync({ force: false, alter: true });

        console.log('数据库迁移完成！');
    } catch (error) {
        console.error('数据库迁移失败:', error);
        process.exit(1);
    }
}

// 如果直接运行此文件，执行迁移
if (require.main === module) {
    migrate().then(() => {
        console.log('迁移成功完成');
        process.exit(0);
    });
}

module.exports = migrate;
