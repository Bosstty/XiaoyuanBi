const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Task = sequelize.define(
    'Task',
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        task_no: {
            type: DataTypes.STRING(32),
            allowNull: false,
            unique: true,
            comment: '任务号',
        },
        publisher_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            comment: '发布者ID',
        },
        assignee_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '接受者ID',
        },
        category: {
            type: DataTypes.ENUM('study', 'design', 'tech', 'writing', 'life'),
            allowNull: false,
            comment: '任务分类：学习、设计、技术、文案、生活',
        },
        title: {
            type: DataTypes.STRING(200),
            allowNull: false,
            comment: '任务标题',
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: false,
            comment: '任务描述',
        },
        requirements: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '任务要求',
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '标签',
        },
        skills_required: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '所需技能',
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            comment: '任务价格',
        },
        location: {
            type: DataTypes.STRING(200),
            allowNull: true,
            comment: '任务地点',
        },
        start_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '开始时间',
        },
        deadline: {
            type: DataTypes.DATE,
            allowNull: false,
            comment: '截止时间',
        },
        estimated_duration: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '预计耗时(小时)',
        },
        max_applicants: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            comment: '最大申请人数',
        },
        urgent: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否紧急',
        },
        remote_work: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否可远程',
        },
        status: {
            type: DataTypes.ENUM('pending', 'published', 'in_progress', 'completed', 'cancelled', 'expired'),
            defaultValue: 'pending',
            comment: '任务状态：pending待审核, published已发布, in_progress进行中, completed已完成, cancelled已取消, expired已过期',
        },
        payment_status: {
            type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
            defaultValue: 'unpaid',
            comment: '支付状态',
        },
        images: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '任务图片',
        },
        attachments: {
            type: DataTypes.JSON,
            allowNull: true,
            comment: '附件',
        },
        rating: {
            type: DataTypes.INTEGER,
            allowNull: true,
            validate: {
                min: 1,
                max: 5,
            },
            comment: '评分',
        },
        rating_comment: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '评价内容',
        },
        accept_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '接受时间',
        },
        submit_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '提交时间',
        },
        complete_time: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '完成时间',
        },
        cancel_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '取消原因',
        },
        view_count: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '浏览次数',
        },
    },
    {
        tableName: 'tasks',
        comment: '任务表',
        indexes: [
            {
                fields: ['task_no'],
            },
            {
                fields: ['publisher_id'],
            },
            {
                fields: ['assignee_id'],
            },
            {
                fields: ['category'],
            },
            {
                fields: ['status'],
            },
            {
                fields: ['deadline'],
            },
            {
                fields: ['created_at'],
            },
        ],
    }
);

module.exports = Task;
