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

const ALLOWED_TICKET_TYPES = ['complaint', 'refund', 'dispute', 'suggestion', 'other'];

const normalizeTicketTypes = value =>
    Array.isArray(value) ? value.filter(item => ALLOWED_TICKET_TYPES.includes(item)) : [];

const canServiceHandleType = (service, ticketType) => {
    if (!service) return false;
    return normalizeTicketTypes(service.ticket_types).includes(ticketType);
};

async function ensureOrderReadyForCompensation(order, transaction) {
    if (!['accepted', 'picking', 'delivering', 'completed'].includes(order.status)) {
        throw new Error('当前订单状态不支持直接处理赔付');
    }

    if (!order.deliverer_id) {
        throw new Error('订单缺少配送员信息，无法处理赔付');
    }

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
    async getOrderDetail(req, res) {
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
                        attributes: ['id', 'username', 'real_name', 'avatar', 'phone', 'student_id'],
                    },
                    {
                        model: Deliverer,
                        as: 'delivererInfo',
                        attributes: ['id', 'real_name', 'phone', 'rating', 'status'],
                    },
                    {
                        model: PickupOrderItem,
                        as: 'items',
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
            console.error('获取客服订单详情失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取订单详情失败',
                error: error.message,
            });
        }
    }

    async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body || {};

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

            return res.json({
                success: true,
                message: '订单状态更新成功',
                data: order,
            });
        } catch (error) {
            console.error('客服更新订单状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '更新订单状态失败',
                error: error.message,
            });
        }
    }

    // 获取工单列表
    async getTickets(req, res) {
        try {
            const {
                status,
                type,
                priority,
                user_id,
                userId,
                include_all_user_tickets,
                includeAllUserTickets: includeAllUserTicketsQuery,
                unresolved_only,
                unresolvedOnly,
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

            const targetUserId = Number(user_id || userId || 0);
            if (targetUserId) {
                where.user_id = targetUserId;
            }

            const unresolvedOnlyEnabled =
                unresolved_only === '1' ||
                unresolved_only === 'true' ||
                unresolvedOnly === '1' ||
                unresolvedOnly === 'true';

            if (unresolvedOnlyEnabled) {
                where.status = {
                    [Op.in]: ['pending', 'processing'],
                };
            }

            const includeAllUserTickets =
                include_all_user_tickets === '1' ||
                include_all_user_tickets === 'true' ||
                includeAllUserTicketsQuery === '1' ||
                includeAllUserTicketsQuery === 'true';

            if (req.userRole === 'service' && req.user?.id && !includeAllUserTickets) {
                const availableTicketTypes = normalizeTicketTypes(req.user.ticket_types);
                if (!availableTicketTypes.length) {
                    return res.json({
                        success: true,
                        data: [],
                        pagination: {
                            current_page: parseInt(page),
                            per_page: parseInt(actualLimit),
                            total: 0,
                            total_pages: 0,
                        },
                    });
                }

                if (type && !availableTicketTypes.includes(type)) {
                    return res.json({
                        success: true,
                        data: [],
                        pagination: {
                            current_page: parseInt(page),
                            per_page: parseInt(actualLimit),
                            total: 0,
                            total_pages: 0,
                        },
                    });
                }

                where.type = type
                    ? type
                    : {
                          [Op.in]: availableTicketTypes,
                      };
                where[Op.or] = [{ service_id: null }, { service_id: req.user.id }];
            }

            if (rangeStart || rangeEnd) {
                where.created_at = {};
                if (rangeStart) where.created_at[Op.gte] = new Date(rangeStart);
                if (rangeEnd) where.created_at[Op.lte] = new Date(`${rangeEnd} 23:59:59`);
            }

            const { count, rows } = await ServiceTicket.findAndCountAll({
                where,
                include: [
                    { model: User, as: 'user', attributes: ['id', 'username', 'phone'] },
                    {
                        model: Service,
                        as: 'service',
                        attributes: ['id', 'username', 'name'],
                        required: false,
                    },
                ],
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

            if (
                req.userRole === 'service' &&
                !canServiceHandleType(req.user, ticket.type) &&
                Number(ticket.service_id || 0) !== Number(req.user?.id || 0)
            ) {
                return res.status(403).json({
                    success: false,
                    message: '当前客服无权查看该类型工单',
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

                if (req.userRole === 'service') {
                    if (
                        !canServiceHandleType(req.user, ticket.type) &&
                        Number(ticket.service_id || 0) !== Number(req.user?.id || 0)
                    ) {
                        throw new Error('当前客服无权处理该类型工单');
                    }

                    if (status === 'processing' && Number(ticket.service_id || 0) !== Number(req.user.id)) {
                        throw new Error('请使用开始处理功能领取工单');
                    }

                    if (['resolved', 'closed'].includes(status)) {
                        if (!ticket.service_id || Number(ticket.service_id || 0) !== Number(req.user.id)) {
                            throw new Error('请先点击开始处理，锁定工单后再继续操作');
                        }
                    }
                }

                ticket.status = status;
                ticket.solution = solution;
                if (req.userRole === 'service') {
                    ticket.service_id = req.user.id;
                }
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

    async claimTicket(req, res) {
        try {
            const ticket = await ServiceTicket.findByPk(req.params.id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            if (!canServiceHandleType(req.user, ticket.type)) {
                return res.status(403).json({
                    success: false,
                    message: '当前客服不能处理该类型工单',
                });
            }

            if (ticket.service_id && Number(ticket.service_id || 0) !== Number(req.user.id)) {
                return res.status(409).json({
                    success: false,
                    message: '工单已被其他客服领取',
                });
            }

            ticket.service_id = req.user.id;
            ticket.status = 'processing';
            await ticket.save();

            res.json({
                success: true,
                message: '已开始处理工单',
                data: ticket,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || '开始处理失败',
            });
        }
    }

    async releaseTicket(req, res) {
        try {
            const ticket = await ServiceTicket.findByPk(req.params.id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            if (Number(ticket.service_id || 0) !== Number(req.user.id)) {
                return res.status(403).json({
                    success: false,
                    message: '只能释放自己领取的工单',
                });
            }

            ticket.service_id = null;
            ticket.status = 'pending';
            await ticket.save();

            res.json({
                success: true,
                message: '工单已释放',
                data: ticket,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || '释放工单失败',
            });
        }
    }

    async updateTicketType(req, res) {
        try {
            const ticket = await ServiceTicket.findByPk(req.params.id);
            const nextType = String(req.body.type || '').trim();

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            if (!ALLOWED_TICKET_TYPES.includes(nextType)) {
                return res.status(400).json({
                    success: false,
                    message: '工单类型不正确',
                });
            }

            if (req.userRole === 'service') {
                if (
                    ticket.service_id &&
                    Number(ticket.service_id || 0) !== Number(req.user.id)
                ) {
                    return res.status(403).json({
                        success: false,
                        message: '当前工单已由其他客服处理，无法修改类型',
                    });
                }

                if (
                    !canServiceHandleType(req.user, ticket.type) &&
                    Number(ticket.service_id || 0) !== Number(req.user.id)
                ) {
                    return res.status(403).json({
                        success: false,
                        message: '当前客服无权修改该类型工单',
                    });
                }

                if (canServiceHandleType(req.user, nextType)) {
                    return res.status(400).json({
                        success: false,
                        message: '只能改成自己负责范围外的工单类型',
                    });
                }
            }

            ticket.type = nextType;
            ticket.service_id = null;
            ticket.status = 'pending';
            await ticket.save();

            res.json({
                success: true,
                message: '工单类型已更新，等待对应客服处理',
                data: ticket,
            });
        } catch (error) {
            res.status(400).json({
                success: false,
                message: error.message || '修改工单类型失败',
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
                attributes: ['id', 'ticket_types'],
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在或已停用',
                });
            }

            if (!canServiceHandleType(service, ticket.type)) {
                return res.status(400).json({
                    success: false,
                    message: '目标客服不能处理该类型工单',
                });
            }

            const previousServiceId = ticket.service_id;
            ticket.service_id = service.id;
            ticket.status = 'pending';
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

    // 投诉赔偿处理
    async processCompensation(req, res) {
        try {
            const { amount, reason, ticket_id: ticketId } = req.body;
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

                const result = await PickupSettlementService.processCompensation(
                    order,
                    amount,
                    reason,
                    dbTransaction
                );

                await resolveTicketAfterOrderAction(
                    ticketId,
                    order.id,
                    `投诉赔偿处理完成：补偿${Number(result.processed_amount || 0).toFixed(2)}元。${
                        Number(result.offline_amount || 0) > 0
                            ? `另有${Number(result.offline_amount).toFixed(2)}元需线下处理。`
                            : ''
                    }${reason || '客服确认赔偿'}`,
                    req.user?.id || null,
                    dbTransaction
                );

                await dbTransaction.commit();

                return res.json({
                    success: true,
                    message:
                        Number(result.offline_amount || 0) > 0
                            ? '赔偿已处理，超出系统可处理部分需线下处理'
                            : '赔偿处理成功',
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
            console.error('处理投诉赔偿失败详情:', error);
            res.status(400).json({
                success: false,
                message: error.message || '赔偿处理失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceTicketController();
