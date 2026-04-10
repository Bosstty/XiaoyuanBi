const {
    ServiceTicket,
    User,
    PickupOrder,
    PickupOrderItem,
    Deliverer,
    Service,
    ChatConversation,
    ChatMessage,
} = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const PickupSettlementService = require('../../services/PickupSettlementService');
const DamageCompensationService = require('../../services/DamageCompensationService');
const { emitConversationEvent } = require('../../../config/socket');

async function ensureOrderReadyForCompensation(order, transaction) {
    if (order.status === 'completed') {
        return order;
    }

    if (!['accepted', 'picking', 'delivering'].includes(order.status)) {
        throw new Error('当前订单状态不支持直接处理赔付');
    }

    if (!order.deliverer_id) {
        throw new Error('订单缺少配送员信息，无法处理赔付');
    }

    await PickupSettlementService.holdOrderSettlement(order, transaction, new Date());
    return order;
}

async function resolveTicketAfterOrderAction(ticketId, orderId, solution, operatorId, transaction) {
    if (ticketId === undefined || ticketId === null) {
        return null;
    }

    const ticket = await ServiceTicket.findByPk(ticketId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!ticket) {
        throw new Error('关联工单不存在');
    }

    if (Number(ticket.order_id) !== Number(orderId)) {
        throw new Error('工单与订单不匹配，无法自动完成工单');
    }

    await ticket.update(
        {
            status: 'resolved',
            solution,
            service_id: operatorId || ticket.service_id || null,
            resolved_at: new Date(),
        },
        { transaction }
    );

    return ticket;
}

async function buildConversationPayload(conversation) {
    const service = conversation.service_id
        ? await Service.findByPk(conversation.service_id, {
              attributes: ['id', 'username', 'name', 'avatar', 'role', 'status'],
          })
        : null;

    return {
        ...conversation.toJSON(),
        service: service
            ? {
                  id: service.id,
                  username: service.username,
                  name: service.name || service.username || `客服 #${service.id}`,
                  avatar: service.avatar || null,
                  role: service.role,
                  status: service.status,
                  staff_code: `KF-${String(service.id).padStart(3, '0')}`,
              }
            : null,
    };
}

async function transferTicketConversations(ticket, fromServiceId, toServiceId) {
    if (!ticket || !toServiceId || Number(fromServiceId) === Number(toServiceId)) {
        return;
    }

    const [fromService, toService] = await Promise.all([
        fromServiceId
            ? Service.findByPk(fromServiceId, {
                  attributes: ['id', 'username', 'name'],
              })
            : null,
        Service.findByPk(toServiceId, {
            attributes: ['id', 'username', 'name'],
        }),
    ]);

    if (!toService) {
        return;
    }

    const conversationWhere = {
        [Op.or]: [],
    };

    if (ticket.order_id) {
        conversationWhere[Op.or].push({ order_id: ticket.order_id });
    }

    if (ticket.user_id) {
        conversationWhere[Op.or].push({
            type: 'user_service',
            user_id: ticket.user_id,
        });
    }

    if (ticket.deliverer_id) {
        conversationWhere[Op.or].push({
            type: 'deliverer_service',
            deliverer_id: ticket.deliverer_id,
        });
    }

    if (!conversationWhere[Op.or].length) {
        return;
    }

    const conversations = await ChatConversation.findAll({
        where: conversationWhere,
    });

    if (!conversations.length) {
        return;
    }

    const systemMessageText = fromService
        ? `当前会话已由 ${fromService.name || fromService.username} 转交给 ${toService.name || toService.username}`
        : `当前会话已分配给 ${toService.name || toService.username}`;

    for (const conversation of conversations) {
        if (
            Number(conversation.service_id || 0) &&
            Number(conversation.service_id || 0) !== Number(fromServiceId || 0)
        ) {
            continue;
        }

        await conversation.update({
            service_id: toService.id,
            last_message: systemMessageText,
            last_message_at: new Date(),
        });

        const systemMessage = await ChatMessage.create({
            conversation_id: conversation.id,
            sender_id: toService.id,
            sender_type: 'service',
            receiver_type: conversation.type === 'deliverer_service' ? 'deliverer' : 'user',
            content: systemMessageText,
            type: 'system',
            is_read: false,
        });

        emitConversationEvent(conversation, 'chat:message:new', {
            conversation_id: conversation.id,
            message: systemMessage.toJSON(),
        });

        emitConversationEvent(conversation, 'chat:conversation:updated', {
            conversation_id: conversation.id,
            conversation: await buildConversationPayload(conversation),
        });
    }
}

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

            if (req.userRole === 'service' && req.user?.id) {
                where[Op.or] = [{ service_id: null }, { service_id: req.user.id }];
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
            const serviceId = Number(req.body.service_id || req.body.assignee_id || 0);
            const ticket = await ServiceTicket.findByPk(req.params.id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            if (!serviceId) {
                return res.status(400).json({
                    success: false,
                    message: '请选择要分配的客服',
                });
            }

            const service = await Service.findOne({
                where: { id: serviceId, status: 'active' },
                attributes: ['id'],
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在或已停用',
                });
            }

            const previousServiceId = ticket.service_id;
            ticket.service_id = service.id;
            ticket.status = 'processing';
            await ticket.save();

            await transferTicketConversations(ticket, previousServiceId, service.id);

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
            const { reason, ticket_id: ticketId } = req.body;
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

                await resolveTicketAfterOrderAction(
                    ticketId,
                    order.id,
                    `退款处理完成：${reason || '客服确认退款'}`,
                    req.user?.id || null,
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
            console.error('处理退款失败详情:', error);
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

                await ensureOrderReadyForCompensation(order, dbTransaction);

                const result = await DamageCompensationService.processOrderDamageClaim(
                    order,
                    {
                        amount,
                        reason,
                        ticketId:
                            req.body.ticket_id === undefined || req.body.ticket_id === null
                                ? null
                                : Number(req.body.ticket_id),
                        processedBy: req.user?.id || null,
                    },
                    dbTransaction
                );

                await resolveTicketAfterOrderAction(
                    req.body.ticket_id,
                    order.id,
                    `损坏赔付处理完成：退款${Number(result.refund_amount || 0).toFixed(2)}元，额外赔付${Number(
                        result.claim_amount || 0
                    ).toFixed(2)}元。${reason || '客服确认损坏赔付'}`,
                    req.user?.id || null,
                    dbTransaction
                );

                await dbTransaction.commit();

                return res.json({
                    success: true,
                    message:
                        result.platform_advance_amount > 0
                            ? '损坏赔付已处理，平台已为不足部分垫付并生成欠款'
                            : '损坏赔付处理成功',
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
            console.error('处理损坏赔付失败详情:', error);
            res.status(400).json({
                success: false,
                message: error.message || '补偿处理失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceTicketController();
