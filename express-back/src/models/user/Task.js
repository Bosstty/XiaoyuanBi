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
        original_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '任务原始应付金额',
        },
        cash_paid_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '实际现金支付金额',
        },
        points_discount_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '积分抵扣金额',
        },
        platform_subsidy_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '平台承担补贴金额',
        },
        refunded_cash_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '已退回现金金额',
        },
        points_used: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '使用积分数',
        },
        returned_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '已退回积分数',
        },
        reward_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '任务奖励积分数',
        },
        reverted_reward_points: {
            type: DataTypes.INTEGER,
            defaultValue: 0,
            comment: '已扣回奖励积分数',
        },
        reward_points_granted: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            comment: '是否已发放奖励积分',
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
            type: DataTypes.ENUM(
                'pending',
                'published',
                'in_progress',
                'completed',
                'cancelled',
                'expired'
            ),
            defaultValue: 'pending',
            comment:
                '任务状态：pending待审核, published已发布, in_progress进行中, completed已完成, cancelled已取消, expired已过期',
        },
        payment_status: {
            type: DataTypes.ENUM('unpaid', 'paid', 'refunded'),
            defaultValue: 'unpaid',
            comment: '支付状态',
        },
        refund_amount: {
            type: DataTypes.DECIMAL(10, 2),
            defaultValue: 0,
            comment: '已退款金额',
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
        cancellation_status: {
            type: DataTypes.ENUM('none', 'pending', 'rejected', 'accepted', 'disputed'),
            defaultValue: 'none',
            comment: '取消协商状态',
        },
        cancellation_initiator_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '取消协商发起人ID',
        },
        cancellation_reason: {
            type: DataTypes.TEXT,
            allowNull: true,
            comment: '取消协商原因',
        },
        cancellation_compensation: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true,
            comment: '取消协商赔偿金额',
        },
        cancellation_requested_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '取消协商发起时间',
        },
        cancellation_expires_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '取消协商截止时间',
        },
        cancellation_responded_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: '取消协商响应时间',
        },
        cancellation_ticket_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            comment: '取消协商争议工单ID',
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
