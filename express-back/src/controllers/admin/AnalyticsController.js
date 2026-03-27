const {
    User,
    PickupOrder,
    Task,
    Transaction,
    ForumPost,
    Deliverer,
    Message,
    AuditLog,
} = require('../../models');
const { responseUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

class AnalyticsController {
    // 获取平台概览统计
    static async getPlatformOverview(req, res) {
        try {
            const { period = 'year' } = req.query;
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);
            const dateRangeWhere = { created_at: { [Op.between]: dateRange } };
            const commissionWhere = AnalyticsController.getCommissionWhere(dateRange);

            const stats = await Promise.all([
                // 用户统计
                User.count({ where: { status: 'active' } }),
                User.count({
                    where: {
                        status: 'active',
                        created_at: { [Op.between]: dateRange },
                    },
                }),

                // 订单统计
                PickupOrder.count({
                    where: dateRangeWhere,
                }),
                PickupOrder.count({
                    where: dateRangeWhere,
                }),
                PickupOrder.count({
                    where: {
                        status: 'completed',
                        ...dateRangeWhere,
                    },
                }),

                // 任务统计
                Task.count({
                    where: dateRangeWhere,
                }),
                Task.count({
                    where: dateRangeWhere,
                }),

                // 交易统计
                Transaction.sum('commission_amount', {
                    where: commissionWhere,
                }),

                // 配送员统计
                Deliverer.count({
                    where: { application_status: 'approved' },
                }),
                Deliverer.count({
                    where: {
                        is_online: true,
                        application_status: 'approved',
                    },
                }),
            ]);

            const overview = {
                users: {
                    total: stats[0],
                    new: stats[1],
                },
                orders: {
                    total: stats[2],
                    new: stats[3],
                    completed: stats[4],
                },
                tasks: {
                    total: stats[5],
                    new: stats[6],
                },
                revenue: stats[7] || 0,
                deliverers: {
                    total: stats[8],
                    online: stats[9],
                },
                period,
            };

            res.json(responseUtils.success(overview));
        } catch (error) {
            console.error('获取平台概览失败:', error);
            res.status(500).json(responseUtils.error('获取平台概览失败'));
        }
    }

    // 用户行为分析
    static async getUserBehaviorAnalytics(req, res) {
        try {
            const { period = 'year' } = req.query;
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);

            // 用户活跃度分析
            const userActivity = await AuditLog.findAll({
                where: {
                    created_at: { [Op.between]: dateRange },
                    user_id: { [Op.not]: null },
                },
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [
                        sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('user_id'))),
                        'active_users',
                    ],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'total_actions'],
                ],
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true,
            });

            // 最受欢迎的功能
            const popularActions = await AuditLog.findAll({
                where: {
                    created_at: { [Op.between]: dateRange },
                    user_id: { [Op.not]: null },
                },
                attributes: ['action', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['action'],
                order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
                limit: 10,
                raw: true,
            });

            // 用户留存分析
            const retention = await AnalyticsController.calculateUserRetention(dateRange);

            res.json(
                responseUtils.success({
                    user_activity: userActivity,
                    popular_actions: popularActions,
                    retention: retention,
                    period,
                })
            );
        } catch (error) {
            console.error('用户行为分析失败:', error);
            res.status(500).json(responseUtils.error('用户行为分析失败'));
        }
    }

    // 服务质量监控
    static async getServiceQualityMetrics(req, res) {
        try {
            const { period = 'year' } = req.query;
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);

            // 订单完成率
            const orderMetrics = await PickupOrder.findAll({
                where: { created_at: { [Op.between]: dateRange } },
                attributes: ['status', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['status'],
                raw: true,
            });

            // 平均配送时间
            const avgDeliveryTime = await PickupOrder.findOne({
                where: {
                    status: 'completed',
                    created_at: { [Op.between]: dateRange },
                    delivery_complete_time: { [Op.not]: null },
                },
                attributes: [
                    [
                        sequelize.fn(
                            'AVG',
                            sequelize.literal(
                                'TIMESTAMPDIFF(MINUTE, created_at, delivery_complete_time)'
                            )
                        ),
                        'avg_delivery_minutes',
                    ],
                ],
                raw: true,
            });

            // 用户评分分布
            const ratingDistribution = await PickupOrder.findAll({
                where: {
                    rating: { [Op.not]: null },
                    created_at: { [Op.between]: dateRange },
                },
                attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
                group: ['rating'],
                order: [['rating', 'ASC']],
                raw: true,
            });

            // 投诉统计
            const complaints = await Message.count({
                where: {
                    type: 'complaint',
                    created_at: { [Op.between]: dateRange },
                },
            });

            // 配送员绩效
            const delivererPerformance = await Deliverer.findAll({
                attributes: [
                    'id',
                    'rating',
                    'completed_orders',
                    'total_orders',
                    [
                        sequelize.literal(
                            '`Deliverer`.`completed_orders` / `Deliverer`.`total_orders` * 100'
                        ),
                        'completion_rate',
                    ],
                ],
                where: {
                    total_orders: { [Op.gt]: 0 },
                },
                order: [['rating', 'DESC']],
                limit: 10,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username'],
                    },
                ],
            });

            res.json(
                responseUtils.success({
                    order_metrics: orderMetrics,
                    avg_delivery_time: avgDeliveryTime?.avg_delivery_minutes || 0,
                    rating_distribution: ratingDistribution,
                    complaints,
                    deliverer_performance: delivererPerformance,
                    period,
                })
            );
        } catch (error) {
            console.error('服务质量监控失败:', error);
            res.status(500).json(responseUtils.error('服务质量监控失败'));
        }
    }

    // 收入分析报表
    static async getRevenueAnalytics(req, res) {
        try {
            const { period = 'year' } = req.query;
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);
            const commissionWhere = AnalyticsController.getCommissionWhere(dateRange);

            // 收入趋势
            const revenueTrend = await Transaction.findAll({
                where: commissionWhere,
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'revenue'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'transaction_count'],
                ],
                group: [sequelize.fn('DATE', sequelize.col('created_at'))],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
                raw: true,
            });

            // 收入来源分析
            const revenueByType = await Transaction.findAll({
                where: commissionWhere,
                attributes: [
                    ['related_type', 'type'],
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'amount'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: ['related_type'],
                order: [[sequelize.fn('SUM', sequelize.col('commission_amount')), 'DESC']],
                raw: true,
            });

            // 佣金统计
            const commissionStats = await Transaction.findOne({
                where: commissionWhere,
                attributes: [
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'total_commission'],
                    [sequelize.fn('AVG', sequelize.col('commission_rate')), 'avg_commission_rate'],
                ],
                raw: true,
            });

            // 提现方式分布
            const withdrawMethodDistribution = await Transaction.findAll({
                where: {
                    status: 'success',
                    related_type: 'withdraw',
                    payment_method: {
                        [Op.in]: ['alipay', 'bank_card'],
                    },
                    created_at: { [Op.between]: dateRange },
                },
                attributes: [
                    'payment_method',
                    [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                ],
                group: ['payment_method'],
                order: [[sequelize.fn('SUM', sequelize.col('amount')), 'DESC']],
                raw: true,
            });

            // 收入明细
            const revenueDetails = await Transaction.findAll({
                where: commissionWhere,
                attributes: [
                    [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
                    ['related_type', 'type'],
                    'payment_method',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                    [sequelize.fn('SUM', sequelize.col('commission_amount')), 'amount'],
                    [sequelize.fn('AVG', sequelize.col('commission_rate')), 'avg_commission_rate'],
                ],
                group: [
                    sequelize.fn('DATE', sequelize.col('created_at')),
                    'related_type',
                    'payment_method',
                ],
                order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'DESC']],
                limit: 50,
                raw: true,
            });

            res.json(
                responseUtils.success({
                    revenue_trend: revenueTrend,
                    revenue_by_type: revenueByType,
                    commission_stats: commissionStats,
                    withdraw_method_distribution: withdrawMethodDistribution,
                    revenue_details: revenueDetails,
                    period,
                })
            );
        } catch (error) {
            console.error('收入分析失败:', error);
            res.status(500).json(responseUtils.error('收入分析失败'));
        }
    }

    static async getRevenueDetailItems(req, res) {
        try {
            const { date, type, payment_method } = req.query;
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);
            const commissionWhere = AnalyticsController.getCommissionWhere(dateRange);
            const where = { ...commissionWhere };

            if (date) {
                where.created_at = {
                    [Op.between]: [new Date(date), new Date(`${date}T23:59:59.999`)],
                };
            }

            if (type) where.related_type = type;
            if (payment_method) where.payment_method = payment_method;

            const transactions = await Transaction.findAll({
                where,
                attributes: [
                    'id',
                    'transaction_no',
                    'amount',
                    'related_id',
                    'related_type',
                    'payment_method',
                    'commission_rate',
                    'commission_amount',
                    'created_at',
                ],
                order: [['created_at', 'DESC']],
                raw: true,
            });

            const orderIds = transactions
                .filter(item => item.related_type === 'pickup_order' && item.related_id)
                .map(item => item.related_id);
            const taskIds = transactions
                .filter(item => item.related_type === 'task' && item.related_id)
                .map(item => item.related_id);

            const [orders, tasks] = await Promise.all([
                orderIds.length
                    ? PickupOrder.findAll({
                          where: { id: orderIds },
                          attributes: ['id', 'order_no', 'title', 'price', 'status'],
                          include: [
                              {
                                  model: User,
                                  as: 'user',
                                  attributes: ['username'],
                              },
                          ],
                      })
                    : Promise.resolve([]),
                taskIds.length
                    ? Task.findAll({
                          where: { id: taskIds },
                          attributes: ['id', 'task_no', 'title', 'price', 'status'],
                          include: [
                              {
                                  model: User,
                                  as: 'publisher',
                                  attributes: ['username'],
                              },
                          ],
                      })
                    : Promise.resolve([]),
            ]);

            const orderMap = new Map(orders.map(item => [item.id, item]));
            const taskMap = new Map(tasks.map(item => [item.id, item]));

            const items = transactions.map(item => {
                const related =
                    item.related_type === 'pickup_order'
                        ? orderMap.get(item.related_id)
                        : taskMap.get(item.related_id);

                return {
                    id: item.id,
                    transaction_no: item.transaction_no,
                    business_type: item.related_type,
                    business_no:
                        item.related_type === 'pickup_order'
                            ? related?.order_no || `订单ID:${item.related_id}`
                            : related?.task_no || `任务ID:${item.related_id}`,
                    title: related?.title || '-',
                    amount: parseFloat(item.amount) || 0,
                    commission_amount: parseFloat(item.commission_amount) || 0,
                    commission_rate: parseFloat(item.commission_rate) || 0,
                    payment_method: item.payment_method,
                    owner_name:
                        item.related_type === 'pickup_order'
                            ? related?.user?.username || '-'
                            : related?.publisher?.username || '-',
                    status: related?.status || '-',
                    created_at: item.created_at,
                };
            });

            res.json(responseUtils.success({ items }));
        } catch (error) {
            console.error('收入明细详情获取失败:', error);
            res.status(500).json(responseUtils.error('收入明细详情获取失败'));
        }
    }

    // 异常订单预警
    static async getAbnormalOrderAlerts(req, res) {
        try {
            const dateRange = AnalyticsController.getDateRangeFromQuery(req.query);
            const recentStartDate = dateRange[0];
            const alerts = [];

            // 超时未完成的订单
            const overdueOrders = await PickupOrder.findAll({
                where: {
                    status: ['accepted', 'picking', 'delivering'],
                    delivery_time: { [Op.lt]: new Date() },
                    created_at: { [Op.between]: dateRange },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username', 'phone'],
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['username', 'phone'],
                    },
                ],
                limit: 50,
            });

            if (overdueOrders.length > 0) {
                alerts.push({
                    type: 'overdue_orders',
                    level: 'high',
                    count: overdueOrders.length,
                    message: `有${overdueOrders.length}个订单超时未完成`,
                    data: overdueOrders,
                });
            }

            // 频繁取消的用户
            const frequentCancellers = await PickupOrder.findAll({
                where: {
                    status: 'cancelled',
                    created_at: { [Op.between]: dateRange },
                },
                attributes: [
                    'user_id',
                    [sequelize.fn('COUNT', sequelize.col('PickupOrder.id')), 'cancel_count'],
                ],
                group: ['user_id'],
                having: sequelize.literal('`cancel_count` > 3'),
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username', 'phone'],
                    },
                ],
                raw: false,
            });

            if (frequentCancellers.length > 0) {
                alerts.push({
                    type: 'frequent_cancellers',
                    level: 'medium',
                    count: frequentCancellers.length,
                    message: `发现${frequentCancellers.length}个用户频繁取消订单`,
                    data: frequentCancellers,
                });
            }

            // 低评分订单
            const lowRatedOrders = await PickupOrder.findAll({
                where: {
                    rating: { [Op.lte]: 2 },
                    created_at: { [Op.between]: dateRange },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username'],
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['username'],
                    },
                ],
                limit: 20,
            });

            if (lowRatedOrders.length > 0) {
                alerts.push({
                    type: 'low_rated_orders',
                    level: 'medium',
                    count: lowRatedOrders.length,
                    message: `当前时间范围内有${lowRatedOrders.length}个低评分订单`,
                    data: lowRatedOrders,
                });
            }

            // 异常高价订单
            const highValueOrders = await PickupOrder.findAll({
                where: {
                    price: { [Op.gt]: 500 },
                    created_at: { [Op.between]: dateRange },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username', 'phone'],
                    },
                ],
                limit: 10,
            });

            if (highValueOrders.length > 0) {
                alerts.push({
                    type: 'high_value_orders',
                    level: 'low',
                    count: highValueOrders.length,
                    message: `发现${highValueOrders.length}个高价值订单`,
                    data: highValueOrders,
                });
            }

            res.json(
                responseUtils.success({
                    total_alerts: alerts.length,
                    alerts: alerts,
                    start_date: recentStartDate,
                    end_date: dateRange[1],
                    generated_at: new Date(),
                })
            );
        } catch (error) {
            console.error('异常订单预警失败:', error);
            res.status(500).json(responseUtils.error('异常订单预警失败'));
        }
    }

    // 实时数据监控
    static async getRealTimeMetrics(req, res) {
        try {
            const now = new Date();
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

            const metrics = await Promise.all([
                // 在线用户数（近1小时活跃）
                AuditLog.count({
                    distinct: true,
                    col: 'user_id',
                    where: {
                        created_at: { [Op.gte]: oneHourAgo },
                        user_id: { [Op.not]: null },
                    },
                }),

                // 在线配送员数
                Deliverer.count({
                    where: { is_online: true },
                }),

                // 待处理订单数
                PickupOrder.count({
                    where: { status: 'pending' },
                }),

                // 进行中订单数
                PickupOrder.count({
                    where: { status: ['accepted', 'picking', 'delivering'] },
                }),

                // 近1小时新订单数
                PickupOrder.count({
                    where: { created_at: { [Op.gte]: oneHourAgo } },
                }),

                // 近1小时完成订单数
                PickupOrder.count({
                    where: {
                        status: 'completed',
                        delivery_complete_time: { [Op.gte]: oneHourAgo },
                    },
                }),

                // 系统负载（API调用次数）
                AuditLog.count({
                    where: { created_at: { [Op.gte]: oneHourAgo } },
                }),
            ]);

            const realTimeMetrics = {
                online_users: metrics[0],
                online_deliverers: metrics[1],
                pending_orders: metrics[2],
                active_orders: metrics[3],
                new_orders_last_hour: metrics[4],
                completed_orders_last_hour: metrics[5],
                api_calls_last_hour: metrics[6],
                system_health: 'normal', // 可以根据实际指标计算
                timestamp: now,
            };

            res.json(responseUtils.success(realTimeMetrics));
        } catch (error) {
            console.error('实时监控数据获取失败:', error);
            res.status(500).json(responseUtils.error('实时监控数据获取失败'));
        }
    }

    // 辅助方法：获取日期范围
    static getDateRange(period) {
        const now = new Date();
        let startDate;

        switch (period) {
            case 'day':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'quarter':
                const quarter = Math.floor(now.getMonth() / 3);
                startDate = new Date(now.getFullYear(), quarter * 3, 1);
                break;
            case 'year':
                startDate = new Date(now.getFullYear(), 0, 1);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        return [startDate, now];
    }

    static getDateRangeFromQuery(query = {}) {
        const { start_date, end_date, period = 'year' } = query;

        if (start_date || end_date) {
            const now = new Date();
            const startDate = start_date ? new Date(start_date) : new Date(0);
            const endDate = end_date ? new Date(`${end_date}T23:59:59.999`) : now;

            if (!Number.isNaN(startDate.getTime()) && !Number.isNaN(endDate.getTime())) {
                return [startDate, endDate];
            }
        }

        return AnalyticsController.getDateRange(period);
    }

    static getCommissionWhere(dateRange) {
        return {
            status: 'success',
            commission_amount: {
                [Op.not]: null,
                [Op.gt]: 0,
            },
            created_at: { [Op.between]: dateRange },
        };
    }

    // 计算用户留存率
    static async calculateUserRetention(dateRange) {
        try {
            // 简化的留存计算，实际项目中可能需要更复杂的逻辑
            const newUsers = await User.findAll({
                where: {
                    created_at: { [Op.between]: dateRange },
                },
                attributes: ['id', 'created_at'],
            });

            const retention = {
                day_1: 0,
                day_7: 0,
                day_30: 0,
            };

            if (newUsers.length > 0) {
                for (const user of newUsers) {
                    const userId = user.id;
                    const registrationDate = user.created_at;

                    // 检查1天后是否还活跃
                    const day1Activity = await AuditLog.count({
                        where: {
                            user_id: userId,
                            created_at: {
                                [Op.between]: [
                                    new Date(registrationDate.getTime() + 24 * 60 * 60 * 1000),
                                    new Date(registrationDate.getTime() + 48 * 60 * 60 * 1000),
                                ],
                            },
                        },
                    });

                    if (day1Activity > 0) retention.day_1++;

                    // 检查7天后是否还活跃
                    const day7Activity = await AuditLog.count({
                        where: {
                            user_id: userId,
                            created_at: {
                                [Op.between]: [
                                    new Date(registrationDate.getTime() + 7 * 24 * 60 * 60 * 1000),
                                    new Date(registrationDate.getTime() + 8 * 24 * 60 * 60 * 1000),
                                ],
                            },
                        },
                    });

                    if (day7Activity > 0) retention.day_7++;

                    // 检查30天后是否还活跃
                    const day30Activity = await AuditLog.count({
                        where: {
                            user_id: userId,
                            created_at: {
                                [Op.between]: [
                                    new Date(registrationDate.getTime() + 30 * 24 * 60 * 60 * 1000),
                                    new Date(registrationDate.getTime() + 31 * 24 * 60 * 60 * 1000),
                                ],
                            },
                        },
                    });

                    if (day30Activity > 0) retention.day_30++;
                }

                // 计算百分比
                retention.day_1 = ((retention.day_1 / newUsers.length) * 100).toFixed(2);
                retention.day_7 = ((retention.day_7 / newUsers.length) * 100).toFixed(2);
                retention.day_30 = ((retention.day_30 / newUsers.length) * 100).toFixed(2);
            }

            return retention;
        } catch (error) {
            console.error('计算用户留存失败:', error);
            return { day_1: 0, day_7: 0, day_30: 0 };
        }
    }
}

module.exports = AnalyticsController;
