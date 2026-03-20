const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const ForumPost = sequelize.define(
    'ForumPost',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        author_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '作者ID',
        },
        category: {
            type: DataTypes.ENUM('academic', 'life', 'campus', 'task', 'skill'),
            allowNull: false,
            comment: '帖子分类：学术、生活、校园、任务、技能',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: '帖子标题',
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '帖子内容',
        },
        summary: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: '内容摘要',
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '标签',
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '图片',
        },
        attachments: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '附件',
        },
        is_anonymous: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否匿名',
        },
        is_pinned: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否置顶',
        },
        is_hot: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否热门',
        },
        status: {
            type: DataTypes.ENUM('published', 'draft', 'pending_review', 'rejected', 'hidden'),
            defaultValue: 'published',
            comment: '状态',
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '浏览次数',
        },
        like_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '点赞数',
        },
        comment_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '评论数',
        },
        share_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '分享数',
        },
        last_comment_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '最后评论时间',
        },
        reject_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '拒绝原因',
        },
    },
    {
        tableName: 'forum_posts',
        comment: '论坛帖子表',
        indexes: [
            {
                fields: ['author_id'],
            },
            {
                fields: ['category'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['is_pinned'],
            },
            {
                fields: ['is_hot'],
            },
            {
                fields: ['created_at'],
            },
            {
                fields: ['last_comment_time'],
            },
        ],
    }
);

module.exports = ForumPost;
