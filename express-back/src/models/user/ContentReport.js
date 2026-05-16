const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const ContentReport = sequelize.define(
    'ContentReport',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        biz_type: {
            type: DataTypes.ENUM('post', 'task'),
            allowNull: false,
            comment: '举报对象类型',
        },
        biz_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '举报对象ID',
        },
        reporter_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '举报人ID',
        },
        reported_user_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '被举报对象作者/发布者ID',
        },
        reason_type: {
            type: DataTypes.STRING(40),
            allowNull: false,
            comment: '举报原因分类',
        },
        reason_text: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '举报补充说明',
        },
        status: {
            type: DataTypes.ENUM('pending', 'accepted', 'dismissed'),
            allowNull: false,
            defaultValue: 'pending',
            comment: '举报处理状态',
        },
        handle_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '处理说明',
        },
        handled_by: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '处理管理员ID',
        },
        handled_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '处理时间',
        },
        snapshot: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '举报时的内容快照',
        },
    },
    {
        tableName: 'content_reports',
        comment: '帖子/任务举报表',
        indexes: [
            { fields: ['biz_type', 'biz_id'] },
            { fields: ['reporter_id'] },
            { fields: ['reported_user_id'] },
            { fields: ['status'] },
            { fields: ['created_at'] },
        ],
    }
);

module.exports = ContentReport;
