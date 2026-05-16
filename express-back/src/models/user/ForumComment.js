const { DataTypes } = require('sequelize');
const { sequelize } = require('@/config/database');

const ForumComment = sequelize.define(
    'ForumComment',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        post_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '帖子ID',
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '评论者ID',
        },
        parent_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '父评论ID',
        },
        reply_to_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '回复目标用户ID',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '评论内容',
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '图片',
        },
        is_anonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否匿名',
        },
        like_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '点赞数',
        },
        reply_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '回复数',
        },
        status: {
            type: DataTypes.ENUM('published', 'pending_review', 'rejected', 'hidden'),
            defaultValue: 'published',
            comment: '状态',
        },
        reject_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '拒绝原因',
        },
        ip_address: {
            type: DataTypes.STRING(50),
            allowNull: true,
            comment: 'IP地址',
        },
    },
    {
        tableName: 'forum_comments',
        comment: '论坛评论表',
        indexes: [
            {
                fields: ['post_id'],
            },
            {
                fields: ['author_id'],
            },
            {
                fields: ['parent_id'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

module.exports = ForumComment;
