const { sequelize } = require('../../config/database');
const models = require('../../models');

function getRunnableModels() {
    return Object.values(models).filter(model => {
        return model && typeof model.getTableName === 'function' && typeof model.sync === 'function';
    });
}

function buildColumnDefinition(attribute) {
    return {
        type: attribute.type,
        allowNull: attribute.allowNull,
        defaultValue: attribute.defaultValue,
        comment: attribute.comment,
        unique: attribute.unique,
        references: attribute.references,
        onUpdate: attribute.onUpdate,
        onDelete: attribute.onDelete,
    };
}

function isMissingTableError(error) {
    const message = error?.message || '';
    const originalCode = error?.original?.code;
    const parentCode = error?.parent?.code;

    return (
        originalCode === 'ER_NO_SUCH_TABLE' ||
        parentCode === 'ER_NO_SUCH_TABLE' ||
        message.includes('No description found for') ||
        message.includes("doesn't exist")
    );
}

async function syncMissingColumns(model, queryInterface) {
    const tableName = model.getTableName();
    const tableLabel = typeof tableName === 'string' ? tableName : tableName.tableName;

    try {
        const tableDefinition = await queryInterface.describeTable(tableName);
        const attributes = model.getAttributes();
        const missingColumns = [];

        for (const [attributeName, attribute] of Object.entries(attributes)) {
            if (attribute.type?.key === 'VIRTUAL') {
                continue;
            }

            const columnName = attribute.field || attributeName;
            if (tableDefinition[columnName]) {
                continue;
            }

            await queryInterface.addColumn(
                tableName,
                columnName,
                buildColumnDefinition(attribute)
            );
            missingColumns.push(columnName);
        }

        if (missingColumns.length > 0) {
            console.log(`表 ${tableLabel} 新增字段: ${missingColumns.join(', ')}`);
        } else {
            console.log(`表 ${tableLabel} 无需新增字段`);
        }
    } catch (error) {
        if (!isMissingTableError(error)) {
            throw error;
        }

        console.log(`表 ${tableLabel} 不存在，开始创建`);
        await model.sync();
        console.log(`表 ${tableLabel} 创建完成`);
    }
}

async function migrate() {
    try {
        console.log('开始数据库安全迁移...');

        const queryInterface = sequelize.getQueryInterface();
        const runnableModels = getRunnableModels();

        for (const model of runnableModels) {
            await syncMissingColumns(model, queryInterface);
        }

        console.log('数据库安全迁移完成');
    } catch (error) {
        console.error('数据库迁移失败:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    migrate().then(() => {
        console.log('迁移成功完成');
        process.exit(0);
    });
}

module.exports = migrate;
