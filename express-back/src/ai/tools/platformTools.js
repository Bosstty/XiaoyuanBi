const { Op } = require('sequelize');
const {
    User,
    PickupOrder,
    Task,
    Transaction,
    Wallet,
    ChatConversation,
    ChatMessage,
    ForumPost,
    Deliverer,
    ServiceTicket,
} = require('@/models');
const emailService = require('../../../services/emailService');

const PERIOD_DAYS_MAP = {
    day: 1,
    week: 7,
    month: 30,
    two_months: 60,
    quarter: 90,
    half_year: 180,
};

const PERIOD_LABEL_MAP = {
    day: '近 1 天',
    week: '近 7 天',
    month: '近 30 天',
    two_months: '近 60 天',
    quarter: '近 90 天',
    half_year: '近 180 天',
};

const ORDER_ACTIVE_STATUSES = ['pending', 'accepted', 'picking', 'delivering'];
const TASK_ACTIVE_STATUSES = ['pending', 'published', 'in_progress'];
const USER_EXPENSE_TYPES = ['payment', 'withdraw', 'commission_deduct', 'penalty', 'transfer_out'];
const USER_INCOME_TYPES = [
    'refund',
    'earn_pickup',
    'earn_task',
    'bonus',
    'transfer_in',
    'recharge',
];
const TOOL_DISPLAY_LABELS = {
    get_platform_overview: '查询平台概览',
    compare_platform_periods: '对比平台周期数据',
    get_my_account_snapshot: '查询账户概况',
    get_my_order_stats: '统计订单数据',
    get_my_recent_orders: '查询最近订单',
    get_order_detail: '查询订单详情',
    get_my_task_stats: '统计任务数据',
    get_my_recent_tasks: '查询最近任务',
    get_task_detail: '查询任务详情',
    get_my_wallet_transactions: '查询钱包流水',
    get_income_expense_summary: '汇总收入支出',
    get_my_support_ticket_summary: '查询工单概况',
    draft_support_ticket: '生成工单草稿',
    send_analysis_email: '发送分析邮件',
};

const normalizePeriod = period => {
    const safePeriod = PERIOD_DAYS_MAP[String(period || 'week')] ? String(period) : 'week';
    const now = new Date();
    return {
        period: safePeriod,
        label: PERIOD_LABEL_MAP[safePeriod] || safePeriod,
        startDate: new Date(now.getTime() - PERIOD_DAYS_MAP[safePeriod] * 24 * 60 * 60 * 1000),
    };
};

const normalizeLimit = (limit, max = 10, fallback = 5) =>
    Math.min(max, Math.max(1, Number(limit) || fallback));

const formatCurrency = value => Number(value || 0).toFixed(2);

const toNumber = value => Number(value || 0);

const formatDate = value => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const countOpenConversations = async userId =>
    ChatConversation.count({
        where: {
            user_id: userId,
            status: 'open',
        },
    });

const getConversationIds = async userId => {
    const rows = await ChatConversation.findAll({
        where: { user_id: userId },
        attributes: ['id'],
        raw: true,
    });
    return rows.map(item => Number(item.id)).filter(Boolean);
};

const getUnreadMessagesCount = async userId => {
    const conversationIds = await getConversationIds(userId);
    if (!conversationIds.length) return 0;

    return ChatMessage.count({
        where: {
            receiver_type: 'user',
            is_read: false,
            conversation_id: {
                [Op.in]: conversationIds,
            },
        },
    });
};

const sumField = async (Model, field, where = {}) => toNumber(await Model.sum(field, { where }));

const normalizeEmail = value =>
    String(value || '')
        .trim()
        .toLowerCase();

const createAssistantToolDefinitions = userId => [
    {
        scopes: ['admin'],
        name: 'get_platform_overview',
        description:
            '获取平台概览统计。适合回答平台订单量、用户增长、活跃任务、论坛活跃度、平台佣金收入等总览问题。',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter', 'half_year'],
                    description: '统计周期',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ period = 'week' } = {}) => {
            const { period: safePeriod, label, startDate } = normalizePeriod(period);

            const [
                totalUsers,
                newUsers,
                totalOrders,
                completedOrders,
                activeTasks,
                totalPosts,
                approvedDeliverers,
                totalRevenue,
            ] = await Promise.all([
                User.count({ where: { status: 'active' } }),
                User.count({
                    where: {
                        status: 'active',
                        created_at: { [Op.gte]: startDate },
                    },
                }),
                PickupOrder.count({
                    where: {
                        created_at: { [Op.gte]: startDate },
                    },
                }),
                PickupOrder.count({
                    where: {
                        status: 'completed',
                        created_at: { [Op.gte]: startDate },
                    },
                }),
                Task.count({
                    where: {
                        status: {
                            [Op.in]: TASK_ACTIVE_STATUSES,
                        },
                    },
                }),
                ForumPost.count({
                    where: {
                        created_at: { [Op.gte]: startDate },
                    },
                }),
                Deliverer.count({
                    where: {
                        application_status: 'approved',
                    },
                }),
                sumField(Transaction, 'commission_amount', {
                    status: 'success',
                    commission_amount: { [Op.gt]: 0 },
                    created_at: { [Op.gte]: startDate },
                }),
            ]);

            return {
                period: safePeriod,
                period_label: label,
                date_range_start: startDate.toISOString(),
                overview: {
                    total_users: totalUsers,
                    new_users: newUsers,
                    orders_in_period: totalOrders,
                    completed_orders_in_period: completedOrders,
                    active_tasks: activeTasks,
                    forum_posts_in_period: totalPosts,
                    approved_deliverers: approvedDeliverers,
                    commission_revenue_in_period: totalRevenue,
                },
                highlights: [
                    { label: '活跃用户总数', value: totalUsers, unit: '人' },
                    { label: '周期新增用户', value: newUsers, unit: '人' },
                    { label: '周期订单数', value: totalOrders, unit: '单' },
                    { label: '周期完成订单', value: completedOrders, unit: '单' },
                    { label: '当前活跃任务', value: activeTasks, unit: '个' },
                    { label: '周期论坛发帖', value: totalPosts, unit: '篇' },
                    { label: '已认证配送员', value: approvedDeliverers, unit: '人' },
                    { label: '周期平台佣金收入', value: formatCurrency(totalRevenue), unit: '元' },
                ],
            };
        },
    },
    {
        scopes: ['admin'],
        name: 'compare_platform_periods',
        description:
            '对比平台两个时间周期的订单、任务、用户与佣金变化。适合回答本周对比上周、本月对比上月这类问题。',
        parameters: {
            type: 'object',
            properties: {
                current_period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter'],
                    description: '当前统计周期',
                },
                previous_period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter'],
                    description: '对比统计周期',
                },
            },
            required: ['current_period', 'previous_period'],
            additionalProperties: false,
        },
        execute: async ({ current_period = 'week', previous_period = 'month' } = {}) => {
            const currentRange = normalizePeriod(current_period);
            const previousRange = normalizePeriod(previous_period);

            const buildPeriodSnapshot = async startDate => {
                const [orders, completedOrders, newUsers, revenue, activeTasks] = await Promise.all(
                    [
                        PickupOrder.count({ where: { created_at: { [Op.gte]: startDate } } }),
                        PickupOrder.count({
                            where: {
                                status: 'completed',
                                created_at: { [Op.gte]: startDate },
                            },
                        }),
                        User.count({
                            where: {
                                status: 'active',
                                created_at: { [Op.gte]: startDate },
                            },
                        }),
                        sumField(Transaction, 'commission_amount', {
                            status: 'success',
                            commission_amount: { [Op.gt]: 0 },
                            created_at: { [Op.gte]: startDate },
                        }),
                        Task.count({
                            where: {
                                status: {
                                    [Op.in]: TASK_ACTIVE_STATUSES,
                                },
                                created_at: { [Op.gte]: startDate },
                            },
                        }),
                    ]
                );

                return {
                    orders,
                    completed_orders: completedOrders,
                    new_users: newUsers,
                    commission_revenue: revenue,
                    active_tasks_created: activeTasks,
                };
            };

            const [current, previous] = await Promise.all([
                buildPeriodSnapshot(currentRange.startDate),
                buildPeriodSnapshot(previousRange.startDate),
            ]);

            const buildDelta = (currentValue, previousValue) => ({
                current: currentValue,
                previous: previousValue,
                delta: currentValue - previousValue,
            });

            return {
                comparison: {
                    current_period: currentRange.period,
                    current_period_label: currentRange.label,
                    previous_period: previousRange.period,
                    previous_period_label: previousRange.label,
                },
                metrics: {
                    orders: buildDelta(current.orders, previous.orders),
                    completed_orders: buildDelta(
                        current.completed_orders,
                        previous.completed_orders
                    ),
                    new_users: buildDelta(current.new_users, previous.new_users),
                    commission_revenue: buildDelta(
                        current.commission_revenue,
                        previous.commission_revenue
                    ),
                    active_tasks_created: buildDelta(
                        current.active_tasks_created,
                        previous.active_tasks_created
                    ),
                },
                highlights: [
                    {
                        label: '订单变化',
                        value: current.orders - previous.orders,
                        unit: '单',
                    },
                    {
                        label: '完成订单变化',
                        value: current.completed_orders - previous.completed_orders,
                        unit: '单',
                    },
                    {
                        label: '新增用户变化',
                        value: current.new_users - previous.new_users,
                        unit: '人',
                    },
                    {
                        label: '佣金收入变化',
                        value: formatCurrency(
                            current.commission_revenue - previous.commission_revenue
                        ),
                        unit: '元',
                    },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_account_snapshot',
        description:
            '获取当前登录用户的订单、任务、钱包和聊天概况。适合先做总览，再决定是否继续查询订单或钱包明细。',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
            additionalProperties: false,
        },
        execute: async () => {
            const [wallet, myOrders, pendingOrders, myTasks, unreadMessages, openConversations] =
                await Promise.all([
                    Wallet.findOne({
                        where: { user_id: userId },
                        attributes: ['balance', 'points'],
                        raw: true,
                    }),
                    PickupOrder.count({ where: { user_id: userId } }),
                    PickupOrder.count({
                        where: {
                            user_id: userId,
                            status: {
                                [Op.in]: ORDER_ACTIVE_STATUSES,
                            },
                        },
                    }),
                    Task.count({ where: { publisher_id: userId } }),
                    getUnreadMessagesCount(userId),
                    countOpenConversations(userId),
                ]);

            return {
                user_id: userId,
                snapshot: {
                    wallet_balance: toNumber(wallet?.balance),
                    wallet_points: toNumber(wallet?.points),
                    my_orders_count: myOrders,
                    pending_orders_count: pendingOrders,
                    published_tasks_count: myTasks,
                    unread_chat_messages: unreadMessages,
                    open_chat_conversations: openConversations,
                },
                highlights: [
                    { label: '钱包余额', value: formatCurrency(wallet?.balance || 0), unit: '元' },
                    { label: '积分余额', value: toNumber(wallet?.points), unit: '分' },
                    { label: '我的订单数', value: myOrders, unit: '单' },
                    { label: '待处理订单', value: pendingOrders, unit: '单' },
                    { label: '已发布任务', value: myTasks, unit: '个' },
                    { label: '未读聊天消息', value: unreadMessages, unit: '条' },
                    { label: '进行中会话', value: openConversations, unit: '个' },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_order_stats',
        description:
            '统计当前用户在指定周期内的订单情况，包括订单数、完成数、待处理数、总支出、退款和紧急单数量。',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter', 'half_year'],
                    description: '统计周期',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ period = 'month' } = {}) => {
            const { period: safePeriod, label, startDate } = normalizePeriod(period);
            const baseWhere = {
                user_id: userId,
                created_at: { [Op.gte]: startDate },
            };

            const [
                totalOrders,
                completedOrders,
                activeOrders,
                urgentOrders,
                totalSpend,
                refundedAmount,
            ] = await Promise.all([
                PickupOrder.count({ where: baseWhere }),
                PickupOrder.count({
                    where: {
                        ...baseWhere,
                        status: 'completed',
                    },
                }),
                PickupOrder.count({
                    where: {
                        ...baseWhere,
                        status: {
                            [Op.in]: ORDER_ACTIVE_STATUSES,
                        },
                    },
                }),
                PickupOrder.count({
                    where: {
                        ...baseWhere,
                        urgent: true,
                    },
                }),
                sumField(PickupOrder, 'price', baseWhere),
                sumField(PickupOrder, 'refund_amount', baseWhere),
            ]);

            return {
                user_id: userId,
                period: safePeriod,
                period_label: label,
                summary: {
                    total_orders: totalOrders,
                    completed_orders: completedOrders,
                    active_orders: activeOrders,
                    urgent_orders: urgentOrders,
                    total_spend_amount: totalSpend,
                    refunded_amount: refundedAmount,
                },
                highlights: [
                    { label: '周期订单数', value: totalOrders, unit: '单' },
                    { label: '完成订单', value: completedOrders, unit: '单' },
                    { label: '待处理订单', value: activeOrders, unit: '单' },
                    { label: '订单总支出', value: formatCurrency(totalSpend), unit: '元' },
                    { label: '退款金额', value: formatCurrency(refundedAmount), unit: '元' },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_recent_orders',
        description:
            '查询当前用户最近的订单列表。适合在总览之后下钻查看最近订单的状态、金额和时间。',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    description: '返回记录数',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ limit = 5 } = {}) => {
            const safeLimit = normalizeLimit(limit, 10, 5);
            const orders = await PickupOrder.findAll({
                where: { user_id: userId },
                attributes: [
                    'id',
                    'order_no',
                    'title',
                    'status',
                    'price',
                    'payment_status',
                    'pickup_location',
                    'delivery_location',
                    'created_at',
                ],
                order: [['created_at', 'DESC']],
                limit: safeLimit,
                raw: true,
            });

            return {
                user_id: userId,
                total: orders.length,
                summary: {
                    total_orders: orders.length,
                    latest_order_no: orders[0]?.order_no || null,
                },
                orders: orders.map(order => ({
                    order_no: order.order_no,
                    title: order.title,
                    status: order.status,
                    payment_status: order.payment_status,
                    price: formatCurrency(order.price || 0),
                    pickup_location: order.pickup_location,
                    delivery_location: order.delivery_location,
                    created_at: formatDate(order.created_at),
                })),
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_order_detail',
        description:
            '查询当前用户单个订单的详细信息。适合在用户提到具体订单号、退款、配送状态、金额时调用。',
        parameters: {
            type: 'object',
            properties: {
                order_no: {
                    type: 'string',
                    description: '订单号，优先使用订单号查询',
                },
            },
            required: ['order_no'],
            additionalProperties: false,
        },
        execute: async ({ order_no } = {}) => {
            const order = await PickupOrder.findOne({
                where: {
                    user_id: userId,
                    order_no: String(order_no || '').trim(),
                },
                attributes: [
                    'order_no',
                    'title',
                    'status',
                    'payment_status',
                    'settlement_status',
                    'price',
                    'tip',
                    'refund_amount',
                    'pickup_location',
                    'delivery_location',
                    'pickup_time',
                    'delivery_time',
                    'urgent',
                    'created_at',
                ],
                raw: true,
            });

            if (!order) {
                return {
                    found: false,
                    order_no: String(order_no || '').trim(),
                    message: '未找到该订单，可能订单号有误，或该订单不属于当前用户。',
                };
            }

            return {
                found: true,
                order: {
                    order_no: order.order_no,
                    title: order.title,
                    status: order.status,
                    payment_status: order.payment_status,
                    settlement_status: order.settlement_status,
                    price: formatCurrency(order.price || 0),
                    tip: formatCurrency(order.tip || 0),
                    refund_amount: formatCurrency(order.refund_amount || 0),
                    pickup_location: order.pickup_location,
                    delivery_location: order.delivery_location,
                    pickup_time: formatDate(order.pickup_time),
                    delivery_time: formatDate(order.delivery_time),
                    urgent: Boolean(order.urgent),
                    created_at: formatDate(order.created_at),
                },
                highlights: [
                    { label: '订单金额', value: formatCurrency(order.price || 0), unit: '元' },
                    {
                        label: '退款金额',
                        value: formatCurrency(order.refund_amount || 0),
                        unit: '元',
                    },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_task_stats',
        description:
            '统计当前用户在指定周期内的任务情况，包括发布任务、承接任务、总支出、总收入与完成数。',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter', 'half_year'],
                    description: '统计周期',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ period = 'month' } = {}) => {
            const { period: safePeriod, label, startDate } = normalizePeriod(period);
            const publisherWhere = {
                publisher_id: userId,
                created_at: { [Op.gte]: startDate },
            };
            const assigneeWhere = {
                assignee_id: userId,
                created_at: { [Op.gte]: startDate },
            };

            const [
                publishedTasks,
                publishedCompletedTasks,
                assignedTasks,
                assignedCompletedTasks,
                totalTaskSpend,
                totalTaskIncome,
            ] = await Promise.all([
                Task.count({ where: publisherWhere }),
                Task.count({
                    where: {
                        ...publisherWhere,
                        status: 'completed',
                    },
                }),
                Task.count({ where: assigneeWhere }),
                Task.count({
                    where: {
                        ...assigneeWhere,
                        status: 'completed',
                    },
                }),
                sumField(Task, 'price', publisherWhere),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'earn_task',
                    created_at: { [Op.gte]: startDate },
                }),
            ]);

            return {
                user_id: userId,
                period: safePeriod,
                period_label: label,
                summary: {
                    published_tasks: publishedTasks,
                    published_completed_tasks: publishedCompletedTasks,
                    assigned_tasks: assignedTasks,
                    assigned_completed_tasks: assignedCompletedTasks,
                    total_task_spend: totalTaskSpend,
                    total_task_income: totalTaskIncome,
                },
                highlights: [
                    { label: '发布任务数', value: publishedTasks, unit: '个' },
                    { label: '已完成发布任务', value: publishedCompletedTasks, unit: '个' },
                    { label: '承接任务数', value: assignedTasks, unit: '个' },
                    { label: '已完成承接任务', value: assignedCompletedTasks, unit: '个' },
                    { label: '任务总支出', value: formatCurrency(totalTaskSpend), unit: '元' },
                    { label: '任务总收入', value: formatCurrency(totalTaskIncome), unit: '元' },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_recent_tasks',
        description:
            '查询当前用户最近的任务列表，包含我发布和我承接的任务，适合继续下钻查看最近任务进展。',
        parameters: {
            type: 'object',
            properties: {
                role: {
                    type: 'string',
                    enum: ['publisher', 'assignee', 'all'],
                    description: '任务视角：我发布、我承接或全部',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    description: '返回记录数',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ role = 'all', limit = 5 } = {}) => {
            const safeLimit = normalizeLimit(limit, 10, 5);
            const safeRole = ['publisher', 'assignee', 'all'].includes(role) ? role : 'all';
            const where =
                safeRole === 'publisher'
                    ? { publisher_id: userId }
                    : safeRole === 'assignee'
                      ? { assignee_id: userId }
                      : {
                            [Op.or]: [{ publisher_id: userId }, { assignee_id: userId }],
                        };

            const tasks = await Task.findAll({
                where,
                attributes: [
                    'task_no',
                    'title',
                    'status',
                    'price',
                    'publisher_id',
                    'assignee_id',
                    'deadline',
                    'created_at',
                ],
                order: [['created_at', 'DESC']],
                limit: safeLimit,
                raw: true,
            });

            return {
                user_id: userId,
                role: safeRole,
                total: tasks.length,
                tasks: tasks.map(task => ({
                    task_no: task.task_no,
                    title: task.title,
                    status: task.status,
                    price: formatCurrency(task.price || 0),
                    perspective:
                        Number(task.publisher_id) === Number(userId) ? 'publisher' : 'assignee',
                    deadline: formatDate(task.deadline),
                    created_at: formatDate(task.created_at),
                })),
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_task_detail',
        description:
            '查询当前用户相关的单个任务详情。适合处理具体任务号、任务状态、金额、截止时间、取消/退款相关问题。',
        parameters: {
            type: 'object',
            properties: {
                task_no: {
                    type: 'string',
                    description: '任务号',
                },
            },
            required: ['task_no'],
            additionalProperties: false,
        },
        execute: async ({ task_no } = {}) => {
            const task = await Task.findOne({
                where: {
                    task_no: String(task_no || '').trim(),
                    [Op.or]: [{ publisher_id: userId }, { assignee_id: userId }],
                },
                attributes: [
                    'task_no',
                    'title',
                    'status',
                    'price',
                    'payment_status',
                    'refund_amount',
                    'deadline',
                    'cancel_reason',
                    'cancellation_status',
                    'location',
                    'publisher_id',
                    'assignee_id',
                    'created_at',
                ],
                raw: true,
            });

            if (!task) {
                return {
                    found: false,
                    task_no: String(task_no || '').trim(),
                    message: '未找到该任务，可能任务号有误，或该任务与当前用户无关联。',
                };
            }

            return {
                found: true,
                task: {
                    task_no: task.task_no,
                    title: task.title,
                    status: task.status,
                    payment_status: task.payment_status,
                    refund_amount: formatCurrency(task.refund_amount || 0),
                    cancellation_status: task.cancellation_status,
                    cancel_reason: task.cancel_reason,
                    price: formatCurrency(task.price || 0),
                    location: task.location,
                    perspective:
                        Number(task.publisher_id) === Number(userId) ? 'publisher' : 'assignee',
                    deadline: formatDate(task.deadline),
                    created_at: formatDate(task.created_at),
                },
                highlights: [
                    { label: '任务金额', value: formatCurrency(task.price || 0), unit: '元' },
                    {
                        label: '已退款金额',
                        value: formatCurrency(task.refund_amount || 0),
                        unit: '元',
                    },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_wallet_transactions',
        description:
            '查询当前用户指定周期的钱包流水，支持收入、支出和全部三种视角。适合解释最近花了多少钱、赚了多少钱。',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['day', 'week', 'month', 'two_months', 'quarter', 'half_year'],
                    description: '统计周期',
                },
                direction: {
                    type: 'string',
                    enum: ['all', 'in', 'out'],
                    description: '流水方向',
                },
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    description: '返回记录数',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ period = 'month', direction = 'all', limit = 5 } = {}) => {
            const { period: safePeriod, label, startDate } = normalizePeriod(period);
            const safeDirection = ['all', 'in', 'out'].includes(direction) ? direction : 'all';
            const safeLimit = normalizeLimit(limit, 10, 5);
            const where = {
                user_id: userId,
                status: 'success',
                created_at: { [Op.gte]: startDate },
                ...(safeDirection === 'all' ? {} : { direction: safeDirection }),
            };

            const [transactions, incomeAmount, expenseAmount] = await Promise.all([
                Transaction.findAll({
                    where,
                    attributes: [
                        'transaction_no',
                        'type',
                        'direction',
                        'amount',
                        'description',
                        'created_at',
                    ],
                    order: [['created_at', 'DESC']],
                    limit: safeLimit,
                    raw: true,
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    direction: 'in',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    direction: 'out',
                    created_at: { [Op.gte]: startDate },
                }),
            ]);

            return {
                user_id: userId,
                period: safePeriod,
                period_label: label,
                direction: safeDirection,
                summary: {
                    income_amount: incomeAmount,
                    expense_amount: expenseAmount,
                    net_amount: incomeAmount - expenseAmount,
                    returned_records: transactions.length,
                },
                transactions: transactions.map(item => ({
                    transaction_no: item.transaction_no,
                    type: item.type,
                    direction: item.direction,
                    amount: formatCurrency(item.amount || 0),
                    description: item.description,
                    created_at: formatDate(item.created_at),
                })),
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_income_expense_summary',
        description:
            '汇总当前用户指定周期的收入与支出，区分接单收入、任务收入、任务/订单支出、提现和退款，适合做综合财务分析。',
        parameters: {
            type: 'object',
            properties: {
                period: {
                    type: 'string',
                    enum: ['week', 'month', 'two_months', 'quarter', 'half_year'],
                    description: '统计周期',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ period = 'two_months' } = {}) => {
            const { period: safePeriod, label, startDate } = normalizePeriod(period);

            const [
                pickupIncome,
                taskIncome,
                bonusIncome,
                refundIncome,
                orderSpend,
                taskSpend,
                withdrawAmount,
                otherExpense,
            ] = await Promise.all([
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'earn_pickup',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'earn_task',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'bonus',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'refund',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(PickupOrder, 'price', {
                    user_id: userId,
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Task, 'price', {
                    publisher_id: userId,
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: 'withdraw',
                    created_at: { [Op.gte]: startDate },
                }),
                sumField(Transaction, 'amount', {
                    user_id: userId,
                    status: 'success',
                    type: { [Op.in]: ['commission_deduct', 'penalty', 'transfer_out'] },
                    created_at: { [Op.gte]: startDate },
                }),
            ]);

            const totalIncome = pickupIncome + taskIncome + bonusIncome + refundIncome;
            const totalExpense = orderSpend + taskSpend + withdrawAmount + otherExpense;

            return {
                user_id: userId,
                period: safePeriod,
                period_label: label,
                summary: {
                    total_income: totalIncome,
                    total_expense: totalExpense,
                    net_income: totalIncome - totalExpense,
                },
                breakdown: {
                    pickup_income: pickupIncome,
                    task_income: taskIncome,
                    bonus_income: bonusIncome,
                    refund_income: refundIncome,
                    order_spend: orderSpend,
                    task_spend: taskSpend,
                    withdraw_amount: withdrawAmount,
                    other_expense: otherExpense,
                },
                highlights: [
                    { label: '总收入', value: formatCurrency(totalIncome), unit: '元' },
                    { label: '总支出', value: formatCurrency(totalExpense), unit: '元' },
                    {
                        label: '净额',
                        value: formatCurrency(totalIncome - totalExpense),
                        unit: '元',
                    },
                    { label: '接单收入', value: formatCurrency(pickupIncome), unit: '元' },
                    { label: '任务发布支出', value: formatCurrency(taskSpend), unit: '元' },
                ],
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'get_my_support_ticket_summary',
        description:
            '查询当前用户相关客服工单概况，包括总数、处理中数量和最近工单状态。适合回答投诉、退款、纠纷处理进展。',
        parameters: {
            type: 'object',
            properties: {
                limit: {
                    type: 'integer',
                    minimum: 1,
                    maximum: 10,
                    description: '返回最近工单条数',
                },
            },
            required: [],
            additionalProperties: false,
        },
        execute: async ({ limit = 5 } = {}) => {
            const safeLimit = normalizeLimit(limit, 10, 5);
            const [ticketCount, processingCount, recentTickets] = await Promise.all([
                ServiceTicket.count({ where: { user_id: userId } }),
                ServiceTicket.count({
                    where: {
                        user_id: userId,
                        status: { [Op.in]: ['pending', 'processing'] },
                    },
                }),
                ServiceTicket.findAll({
                    where: { user_id: userId },
                    attributes: ['ticket_no', 'type', 'title', 'priority', 'status', 'created_at'],
                    order: [['created_at', 'DESC']],
                    limit: safeLimit,
                    raw: true,
                }),
            ]);

            return {
                user_id: userId,
                summary: {
                    total_tickets: ticketCount,
                    processing_tickets: processingCount,
                    recent_ticket_count: recentTickets.length,
                },
                tickets: recentTickets.map(ticket => ({
                    ticket_no: ticket.ticket_no,
                    type: ticket.type,
                    title: ticket.title,
                    priority: ticket.priority,
                    status: ticket.status,
                    created_at: formatDate(ticket.created_at),
                })),
            };
        },
    },
    {
        scopes: ['user', 'admin'],
        name: 'draft_support_ticket',
        description:
            '生成客服工单草稿建议，用于投诉、退款、纠纷、建议等场景。适合在查询订单/任务详情后继续调用。',
        parameters: {
            type: 'object',
            properties: {
                issue_type: {
                    type: 'string',
                    enum: ['complaint', 'refund', 'dispute', 'suggestion', 'other'],
                },
                summary: {
                    type: 'string',
                    description: '问题摘要',
                },
            },
            required: ['issue_type', 'summary'],
            additionalProperties: false,
        },
        execute: async ({ issue_type, summary } = {}) => ({
            user_id: userId,
            issue_type,
            summary,
            next_step:
                '这是工单草稿预演结果，当前未实际创建工单。后续可在此处接入 ServiceTicket 创建逻辑。',
            recommended_fields: ['问题详情', '关联订单号/任务号', '期望处理方式', '截图或证据'],
        }),
    },
    {
        scopes: ['user', 'admin'],
        name: 'send_analysis_email',
        description:
            '将当前分析结论或汇总结果发送到用户绑定邮箱。适合在生成订单、任务、钱包或客服分析摘要后调用。',
        parameters: {
            type: 'object',
            properties: {
                subject: {
                    type: 'string',
                    description: '邮件主题',
                },
                summary_markdown: {
                    type: 'string',
                    description: '要发送的摘要正文，建议使用 Markdown 结构化文本。',
                },
                intro: {
                    type: 'string',
                    description: '邮件开头的一句话说明，可选。',
                },
                to_email: {
                    type: 'string',
                    description: '可选，默认发送到当前用户绑定邮箱。',
                },
            },
            required: ['subject', 'summary_markdown'],
            additionalProperties: false,
        },
        execute: async ({ subject, summary_markdown, intro, to_email } = {}) => {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'email', 'email_verified', 'username', 'real_name'],
                raw: true,
            });

            if (!user) {
                return {
                    success: false,
                    message: '当前用户不存在，无法发送邮件。',
                };
            }

            const targetEmail = normalizeEmail(to_email || user.email);
            if (!targetEmail) {
                return {
                    success: false,
                    message: '当前账号未绑定邮箱，请先在个人资料中完善邮箱。',
                };
            }

            const safeSubject = String(subject || '').trim() || 'AI 分析汇总';
            const safeSummary = String(summary_markdown || '').trim();
            if (!safeSummary) {
                return {
                    success: false,
                    message: '邮件正文为空，无法发送分析结果。',
                };
            }

            try {
                const sent = await emailService.sendAiAnalysisReport(targetEmail, {
                    subject: safeSubject,
                    title: safeSubject,
                    intro:
                        String(intro || '').trim() ||
                        '这是你刚刚在智能助手中生成的分析汇总，请查收。',
                    summaryMarkdown: safeSummary,
                });

                if (!sent) {
                    return {
                        success: false,
                        sent_to: targetEmail,
                        message:
                            '邮件服务当前未正确配置，或当前账号未绑定可用邮箱，暂时无法发送分析汇总。',
                    };
                }
            } catch (error) {
                return {
                    success: false,
                    sent_to: targetEmail,
                    message: `邮件发送失败：${error.message || '未知错误'}`,
                };
            }

            return {
                success: true,
                sent_to: targetEmail,
                subject: safeSubject,
                email_verified: Boolean(user.email_verified),
                recipient_name: user.real_name || user.username || `用户#${user.id}`,
                message: '分析汇总已发送到邮箱。',
            };
        },
    },
];

const createAssistantTools = ({ userId, scope = 'user' } = {}) =>
    createAssistantToolDefinitions(userId)
        .filter(tool => Array.isArray(tool.scopes) && tool.scopes.includes(scope))
        .map(({ scopes, ...tool }) => ({
            ...tool,
            display_name: TOOL_DISPLAY_LABELS[tool.name] || tool.name,
        }));

module.exports = {
    createAssistantTools,
    USER_EXPENSE_TYPES,
    USER_INCOME_TYPES,
};
