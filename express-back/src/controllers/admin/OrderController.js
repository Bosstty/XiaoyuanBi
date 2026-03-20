const { PickupOrder, User, Deliverer } = require('../../models');
const { Op } = require('sequelize');

/**
 * 订单管理控制器
 * Order Management Controller
 */
class OrderController {
    /**
     * 获取订单列表
     * Get orders list with pagination and filters
     */
    static async getOrders(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                type,
                userId,
                delivererId,
                startDate,
                endDate,
                keyword,
            } = req.query;

            const offset = (page - 1) * limit;
            const where = {};

            // 构建查询条件
            if (status) where.status = status;
            if (type) where.type = type;
            if (userId) where.user_id = userId;
            if (delivererId) where.deliverer_id = delivererId;

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at[Op.gte] = new Date(startDate);
                if (endDate) where.created_at[Op.lte] = new Date(endDate);
            }

            if (keyword) {
                where[Op.or] = [
                    { order_no: { [Op.like]: `%${keyword}%` } },
                    { title: { [Op.like]: `%${keyword}%` } },
                    { description: { [Op.like]: `%${keyword}%` } },
                ];
            }

            const { count, rows: orders } = await PickupOrder.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                    },
                    {
                        model: Deliverer,
                        as: 'delivererInfo',
                        attributes: ['id', 'real_name', 'phone', 'application_status', 'status'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return res.json({
                success: true,
                message: '获取订单列表成功',
                data: {
                    orders,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit),
                    },
                },
            });
        } catch (error) {
            console.error('Get orders error:', error);
            return res.status(500).json({
                success: false,
                message: '获取订单列表失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取订单详情
     * Get order detail by ID
     */
    static async getOrderDetail(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '订单ID不能为空',
                });
            }

            const order = await PickupOrder.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'phone',
                            'student_id',
                        ],
                    },
                    {
                        model: Deliverer,
                        as: 'delivererInfo',
                        attributes: ['id', 'real_name', 'phone', 'rating', 'status'],
                    },
                ],
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            return res.json({
                success: true,
                message: '获取订单详情成功',
                data: order,
            });
        } catch (error) {
            console.error('Get order detail error:', error);
            return res.status(500).json({
                success: false,
                message: '获取订单详情失败',
                error: error.message,
            });
        }
    }

    /**
     * 更新订单状态
     * Update order status
     */
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason, remark } = req.body;
            const adminUser = req.user;

            if (!id || !status) {
                return res.status(400).json({
                    success: false,
                    message: '订单ID和状态不能为空',
                });
            }

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            // 验证状态转换是否合法
            const allowedTransitions = {
                pending: ['accepted', 'cancelled'],
                accepted: ['picking', 'cancelled'],
                picking: ['delivering', 'cancelled'],
                delivering: ['completed', 'cancelled'],
                completed: [],
                cancelled: [],
            };

            if (!allowedTransitions[order.status]?.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `订单状态不能从 ${order.status} 转换为 ${status}`,
                });
            }

            // 更新订单状态
            order.status = status;
            if (reason) {
                order.cancel_reason = reason;
            }

            if (status === 'cancelled') {
                order.cancel_time = new Date();
            } else if (status === 'accepted') {
                order.accept_time = new Date();
            } else if (status === 'picking') {
                order.pickup_complete_time = new Date();
            } else if (status === 'completed') {
                order.delivery_complete_time = new Date();
            }

            await order.save();

            // TODO: 发送通知给用户和配送员

            return res.json({
                success: true,
                message: '订单状态更新成功',
                data: order,
            });
        } catch (error) {
            console.error('Update order status error:', error);
            return res.status(500).json({
                success: false,
                message: '更新订单状态失败',
                error: error.message,
            });
        }
    }

    /**
     * 批量分配订单
     * Batch assign orders to deliverer
     */
    static async batchAssignOrders(req, res) {
        try {
            const { orderIds, delivererId } = req.body;
            const adminUser = req.user;

            if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: '订单ID列表不能为空',
                });
            }

            if (!delivererId) {
                return res.status(400).json({
                    success: false,
                    message: '配送员ID不能为空',
                });
            }

            // 验证配送员是否存在且状态正常
            const deliverer = await Deliverer.findByPk(delivererId);
            if (!deliverer || deliverer.status !== 'active') {
                return res.status(400).json({
                    success: false,
                    message: '配送员不存在或状态异常',
                });
            }

            // 批量更新订单
            const [updatedCount] = await PickupOrder.update(
                {
                    deliverer_id: delivererId,
                    status: 'accepted',
                    accept_time: new Date(),
                },
                {
                    where: {
                        id: orderIds,
                        status: 'pending',
                    },
                }
            );

            if (updatedCount === 0) {
                return res.status(400).json({
                    success: false,
                    message: '没有可分配的订单，请检查订单状态',
                });
            }

            // TODO: 发送通知给配送员

            return res.json({
                success: true,
                message: `成功分配 ${updatedCount} 个订单`,
                data: {
                    assignedCount: updatedCount,
                    delivererId,
                },
            });
        } catch (error) {
            console.error('Batch assign orders error:', error);
            return res.status(500).json({
                success: false,
                message: '批量分配订单失败',
                error: error.message,
            });
        }
    }

    /**
     * 取消订单
     * Cancel order
     */
    static async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const adminUser = req.user;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '订单ID不能为空',
                });
            }

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: '取消原因不能为空',
                });
            }

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            if (['completed', 'cancelled'].includes(order.status)) {
                return res.status(400).json({
                    success: false,
                    message: '该状态的订单不能取消',
                });
            }

            // 更新订单状态为已取消
            order.status = 'cancelled';
            order.cancel_reason = reason;
            order.cancel_time = new Date();

            await order.save();

            // TODO: 处理退款逻辑
            // TODO: 发送通知给用户和配送员

            return res.json({
                success: true,
                message: '订单已取消',
                data: order,
            });
        } catch (error) {
            console.error('Cancel order error:', error);
            return res.status(500).json({
                success: false,
                message: '取消订单失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取订单统计
     * Get order statistics
     */
    static async getOrderStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const where = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at[Op.gte] = new Date(startDate);
                if (endDate) where.created_at[Op.lte] = new Date(endDate);
            }

            // 订单状态统计
            const statusStats = await PickupOrder.findAll({
                where,
                attributes: [
                    'status',
                    [PickupOrder.sequelize.fn('COUNT', PickupOrder.sequelize.col('id')), 'count'],
                    [
                        PickupOrder.sequelize.fn('SUM', PickupOrder.sequelize.col('price')),
                        'totalAmount',
                    ],
                ],
                group: ['status'],
            });

            // 订单类型统计
            const typeStats = await PickupOrder.findAll({
                where,
                attributes: [
                    'type',
                    [PickupOrder.sequelize.fn('COUNT', PickupOrder.sequelize.col('id')), 'count'],
                    [
                        PickupOrder.sequelize.fn('SUM', PickupOrder.sequelize.col('price')),
                        'totalAmount',
                    ],
                ],
                group: ['type'],
            });

            // 总体统计
            const totalOrders = await PickupOrder.count({ where });
            const totalAmount = (await PickupOrder.sum('price', { where })) || 0;
            const avgAmount = totalOrders > 0 ? totalAmount / totalOrders : 0;

            // 今日统计
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayOrders = await PickupOrder.count({
                where: {
                    ...where,
                    created_at: { [Op.gte]: today },
                },
            });

            return res.json({
                success: true,
                message: '获取订单统计成功',
                data: {
                    statusStats,
                    typeStats,
                    overview: {
                        totalOrders,
                        totalAmount,
                        avgAmount,
                        todayOrders,
                    },
                },
            });
        } catch (error) {
            console.error('Get order stats error:', error);
            return res.status(500).json({
                success: false,
                message: '获取订单统计失败',
                error: error.message,
            });
        }
    }
}

module.exports = OrderController;
