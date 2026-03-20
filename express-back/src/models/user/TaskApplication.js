const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const TaskApplication = sequelize.define(
    'TaskApplication',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        task_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '任务ID',
        },
        applicant_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '申请者ID',
        },
        message: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '申请留言',
        },
        expected_completion_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '期望完成时间',
        },
        proposed_price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: '建议价格',
        },
        portfolio: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '作品集',
        },
        experience: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '相关经验',
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'rejected', 'withdrawn'),
            defaultValue: 'pending',
            comment: '申请状态',
        },
        response_message: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '回复消息',
        },
        response_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '回复时间',
        },
    },
    {
        tableName: 'task_applications',
        comment: '任务申请表',
        indexes: [
            {
                fields: ['task_id'],
            },
            {
                fields: ['applicant_id'],
            },
            {
                fields: ['status'],
            },
            {
                unique: true,
                fields: ['task_id', 'applicant_id'],
            },
        ],
    }
);

module.exports = TaskApplication;
