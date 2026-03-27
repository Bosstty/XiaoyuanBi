const { ServiceTicket, User, PickupOrder, PickupOrderItem, Deliverer } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const PickupSettlementService = require('../../services/PickupSettlementService');

class ServiceTicketController {
    // 获取工单列表
    async getTickets(req, res) {
        try {
            const {
                status,
                type,
                priority,
                page = 1,
                limit = 10,
                pageSize,
                start_date,
                end_date,
                startDate,
                endDate,
            } = req.query;
            const where = status ? { status } : {};
            const actualLimit = pageSize || limit;
            const rangeStart = start_date || startDate;
            const rangeEnd = end_date || endDate;

            if (type) {
                where.type = type;
            }

            if (priority) {
                where.priority = priority;
            }

            if (rangeStart || rangeEnd) {
                where.created_at = {};
                if (rangeStart) where.created_at[Op.gte] = new Date(rangeStart);
                if (rangeEnd) where.created_at[Op.lte] = new Date(`${rangeEnd} 23:59:59`);
            }

            const { count, rows } = await ServiceTicket.findAndCountAll({
                where,
                include: [{ model: User, as: 'user', attributes: ['id', 'username', 'phone'] }],
                order: [['created_at', 'DESC']],
                limit: parseInt(actualLimit),
                offset: (page - 1) * actualLimit,
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(actualLimit),
                    total: count,
                    total_pages: Math.ceil(count / actualLimit),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取工单列表失败',
                error: error.message,
            });
        }
    }

    // 获取工单详情
    async getTicketDetail(req, res) {
        try {
            const ticket = await ServiceTicket.findByPk(req.params.id, {
                include: [
                    { model: User, as: 'user', attributes: ['id', 'username', 'phone', 'avatar'] },
                    {
                        model: PickupOrder,
                        as: 'order',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'username', 'phone', 'avatar'],
                            },
                            {
                                model: PickupOrderItem,
                                as: 'items',
                                attributes: [
                                    'id',
                                    'order_id',
                                    'item_index',
                                    'pickup_code',
                                    'phone_tail',
                                    'weight',
                                    'size',
                                ],
                                required: false,
                            },
                            {
                                model: Deliverer,
                                as: 'delivererInfo',
                                attributes: ['id', 'user_id', 'real_name', 'phone'],
                                required: false,
                                include: [
                                    {
                                        model: User,
                                        as: 'user',
                                        attributes: ['id', 'username', 'real_name', 'phone', 'avatar'],
                                    },
                                ],
                            },
                        ],
                    },
                ],
            });

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            res.json({
                success: true,
                data: ticket,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取工单详情失败',
                error: error.message,
            });
        }
    }

    // 创建工单
    async createTicket(req, res) {
        try {
            const { type, order_id, title, description, priority } = req.body;

            const ticket = await ServiceTicket.create({
                type,
                order_id,
                user_id: req.user.id,
                title,
                description,
                priority,
                status: 'pending',
                service_id: null,
            });

            res.status(201).json({
                success: true,
                message: '工单创建成功',
                data: ticket,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '创建工单失败',
                error: error.message,
            });
        }
    }

    // 更新工单状态
    async updateTicketStatus(req, res) {
        try {
            const { status, solution } = req.body;
            const performUpdate = async () => {
                const ticket = await ServiceTicket.findByPk(req.params.id);

                if (!ticket) {
                    return null;
                }

                ticket.status = status;
                ticket.solution = solution;
                ticket.service_id = req.user.id;
                ticket.resolved_at = status === 'resolved' ? new Date() : null;
                await ticket.save();

                return ticket;
            };

            let ticket;

            try {
                ticket = await performUpdate();
            } catch (error) {
                if (error?.code !== 'ECONNRESET') {
                    throw error;
                }

                console.error('工单状态更新遇到数据库断连，正在重试:', error);
                await sequelize.authenticate();
                ticket = await performUpdate();
            }

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            res.json({
                success: true,
                message: '工单状态更新成功',
                data: ticket,
            });
        } catch (error) {
            console.error('更新工单状态失败详情:', error);
            res.status(500).json({
                success: false,
                message: '更新工单状态失败',
                error: error.message,
            });
        }
    }

    // 分配工单
    async assignTicket(req, res) {
        try {
            const { service_id } = req.body;
            const ticket = await ServiceTicket.findByPk(req.params.id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            ticket.service_id = service_id;
            ticket.status = 'processing';
            await ticket.save();

            res.json({
                success: true,
                message: '工单分配成功',
                data: ticket,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '分配工单失败',
                error: error.message,
            });
        }
    }

    // 处理退款
    async processRefund(req, res) {
        try {
            const { reason } = req.body;
            const dbTransaction = await PickupOrder.sequelize.transaction();
            let order;

            try {
                order = await PickupOrder.findByPk(req.params.id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!order) {
                    await dbTransaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: '订单不存在',
                    });
                }

                const result =
                    order.status === 'completed'
                        ? await PickupSettlementService.processRefund(
                              order,
                              order.deliverer_frozen_amount,
                              reason,
                              dbTransaction
                          )
                        : await PickupSettlementService.refundUncompletedOrder(
                              order,
                              reason,
                              dbTransaction
                          );

                await dbTransaction.commit();

                return res.json({
                    success: true,
                    message:
                        result.mode === 'release_user_frozen'
                            ? '订单未完成，已退款并解冻用户冻结金额'
                            : '退款处理成功',
                    data: {
                        order,
                        result,
                    },
                });
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || '退款处理失败',
                error: error.message,
            });
        }
    }

    // 补偿处理
    async processCompensate(req, res) {
        try {
            const { amount, reason } = req.body;
            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                const order = await PickupOrder.findByPk(req.params.id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!order) {
                    await dbTransaction.rollback();
                    return res.status(404).json({
                        success: false,
                        message: '订单不存在',
                    });
                }

                if (order.status !== 'completed') {
                    await dbTransaction.rollback();
                    return res.status(400).json({
                        success: false,
                        message: '订单尚未完成，请先结束订单，随后再处理补偿工单',
                    });
                }

                const result = await PickupSettlementService.processCompensation(
                    order,
                    amount,
                    reason,
                    dbTransaction
                );

                await dbTransaction.commit();

                return res.json({
                    success: true,
                    message:
                        result.offline_amount > 0
                            ? '补偿已部分处理，超出部分需配送员线下赔付'
                            : '补偿处理成功',
                    data: {
                        order,
                        result,
                    },
                });
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || '补偿处理失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceTicketController();
