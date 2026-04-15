const { Op } = require('sequelize');
const { ChatConversation, ChatMessage, User, Deliverer, PickupOrder, Service, ServiceTicket } = require('../../models');
const { emitConversationEvent } = require('../../../config/socket');

const DIRECT_CHAT_TYPE = 'user_deliverer';
const getCurrentRole = req => req.userRole || 'user';

const normalizeUserPair = (leftId, rightId) =>
    Number(leftId) <= Number(rightId) ? [Number(leftId), Number(rightId)] : [Number(rightId), Number(leftId)];

const hasConversationAccess = (conversation, userId, userRole = 'user') => {
    if (!conversation) return false;

    if (userRole === 'service') {
        return (
            (conversation.type === 'user_service' || conversation.type === 'deliverer_service') &&
            (conversation.service_id === null ||
                conversation.service_id === undefined ||
                Number(conversation.service_id) === Number(userId))
        );
    }

    if (!userId) return false;

    if (conversation.type === DIRECT_CHAT_TYPE) {
        return conversation.user_id === userId || conversation.service_id === userId;
    }

    return conversation.user_id === userId;
};

const getSenderType = req => (getCurrentRole(req) === 'service' ? 'service' : 'user');
const getServiceScopeId = req =>
    getCurrentRole(req) === 'service' ? Number(req.serviceScopeId || req.user?.id || 0) || null : null;

const normalizeServiceTicketTypes = ticketTypes =>
    Array.isArray(ticketTypes)
        ? ticketTypes
              .map(type => String(type || '').trim())
              .filter(Boolean)
        : [];

const pickLeastBusyService = async services => {
    if (!Array.isArray(services) || services.length === 0) return null;

    const serviceIds = services.map(service => Number(service.id)).filter(Boolean);
    if (serviceIds.length === 0) return null;

    const openConversations = await ChatConversation.findAll({
        where: {
            service_id: { [Op.in]: serviceIds },
            type: { [Op.in]: ['user_service', 'deliverer_service'] },
            status: 'open',
        },
        attributes: ['service_id'],
    });

    const loadMap = new Map(serviceIds.map(id => [Number(id), 0]));
    openConversations.forEach(conversation => {
        const serviceId = Number(conversation.service_id || 0);
        if (serviceId) {
            loadMap.set(serviceId, (loadMap.get(serviceId) || 0) + 1);
        }
    });

    return [...services].sort((left, right) => {
        const leftLoad = loadMap.get(Number(left.id)) || 0;
        const rightLoad = loadMap.get(Number(right.id)) || 0;

        if (leftLoad !== rightLoad) return leftLoad - rightLoad;

        const leftLogin = left.last_login_at ? new Date(left.last_login_at).getTime() : 0;
        const rightLogin = right.last_login_at ? new Date(right.last_login_at).getTime() : 0;
        if (leftLogin !== rightLogin) return rightLogin - leftLogin;

        return Number(left.id) - Number(right.id);
    })[0];
};

const findAssignableService = async (preferredId, ticketType = 'other') => {
    if (preferredId) {
        const preferredService = await Service.findOne({
            where: { id: preferredId, status: 'active' },
            attributes: ['id', 'username', 'name', 'avatar', 'ticket_types', 'last_login_at'],
        });
        if (preferredService) {
            return preferredService;
        }
    }

    const services = await Service.findAll({
        where: { status: 'active' },
        attributes: ['id', 'username', 'name', 'avatar', 'ticket_types', 'last_login_at'],
        order: [
            ['last_login_at', 'DESC'],
            ['id', 'ASC'],
        ],
    });

    if (!services.length) return null;

    const normalizedTicketType = String(ticketType || '').trim() || 'other';
    const matchedServices = services.filter(service =>
        normalizeServiceTicketTypes(service.ticket_types).includes(normalizedTicketType)
    );

    return pickLeastBusyService(matchedServices.length ? matchedServices : services);
};

const getReceiverType = (conversation, req) => {
    if (getCurrentRole(req) === 'service') {
        return conversation.type === 'deliverer_service' ? 'deliverer' : 'user';
    }

    if (conversation.type === 'user_service' || conversation.type === 'deliverer_service') {
        return 'service';
    }

    return 'user';
};

const loadServiceProfile = async serviceId => {
    if (!serviceId) return null;

    const service = await Service.findByPk(serviceId, {
        attributes: ['id', 'username', 'name', 'avatar', 'role', 'status'],
    });

    if (!service) return null;

    return {
        id: service.id,
        username: service.username,
        name: service.name || service.username || `客服 #${service.id}`,
        avatar: service.avatar || null,
        role: service.role,
        status: service.status,
        staff_code: `KF-${String(service.id).padStart(3, '0')}`,
    };
};

const getServiceDisplayName = service =>
    service?.name || service?.username || (service?.id ? `客服 #${service.id}` : '在线客服');

const resolvePartnerInfo = async (conversation, currentUserId, currentUserRole = 'user') => {
    if (currentUserRole === 'service') {
        if (conversation.type === 'deliverer_service' && conversation.deliverer_id) {
            const deliverer = await Deliverer.findByPk(conversation.deliverer_id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                ],
            });

            if (deliverer) {
                return {
                    id: deliverer.user?.id || deliverer.id,
                    name:
                        deliverer.user?.real_name ||
                        deliverer.user?.username ||
                        deliverer.real_name ||
                        '配送员',
                    avatar: deliverer.user?.avatar || null,
                    role: '配送员',
                };
            }
        }

        if (conversation.user_id) {
            const user = await User.findByPk(conversation.user_id, {
                attributes: ['id', 'username', 'real_name', 'avatar'],
            });

            if (user) {
                return {
                    id: user.id,
                    name: user.real_name || user.username || '用户',
                    avatar: user.avatar || null,
                    role: '用户',
                };
            }
        }
    }

    if (conversation.type === 'user_service' || conversation.type === 'deliverer_service') {
        const service = conversation.service_id
            ? await Service.findByPk(conversation.service_id, {
                  attributes: ['id', 'username', 'name', 'avatar'],
              })
            : await findAssignableService(null, 'other');

        return {
            id: service?.id || null,
            name: service?.name || service?.username || '在线客服',
            avatar: service?.avatar || null,
            role: '客服',
        };
    }

    if (conversation.deliverer_id) {
        const deliverer = await Deliverer.findByPk(conversation.deliverer_id, {
            include: [
                {
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'real_name', 'avatar'],
                },
            ],
        });

        if (deliverer) {
            return {
                id: deliverer.user?.id || deliverer.id,
                name: deliverer.user?.real_name || deliverer.user?.username || deliverer.real_name || '配送员',
                avatar: deliverer.user?.avatar || null,
                role: '配送员',
            };
        }
    }

    const partnerUserId =
        Number(conversation.user_id) === Number(currentUserId)
            ? Number(conversation.service_id)
            : Number(conversation.user_id);

    if (!partnerUserId) {
        return {
            id: null,
            name: '未知联系人',
            avatar: null,
            role: '用户',
        };
    }

    const partner = await User.findByPk(partnerUserId, {
        attributes: ['id', 'username', 'real_name', 'avatar'],
    });

    if (!partner) {
        return {
            id: partnerUserId,
            name: '未知联系人',
            avatar: null,
            role: '用户',
        };
    }

    const delivererProfile = await Deliverer.findOne({
        where: {
            user_id: partner.id,
            application_status: 'approved',
            status: 'active',
            isDeleted: false,
        },
        attributes: ['id'],
    });

    return {
        id: partner.id,
        name: partner.real_name || partner.username || '用户',
        avatar: partner.avatar || null,
        role: delivererProfile ? '配送员' : '用户',
    };
};

const decorateConversation = async (conversation, currentUserId, currentUserRole = 'user') => {
    const conversationData = conversation.toJSON();
    conversationData.service = await loadServiceProfile(conversationData.service_id);
    conversationData.partner = await resolvePartnerInfo(
        conversationData,
        currentUserId,
        currentUserRole
    );
    return conversationData;
};

class ServiceChatController {
    async createConversation(req, res) {
        try {
            const currentUserId = req.user?.id;
            const {
                peer_user_id,
                user_id,
                deliverer_id,
                order_id,
                task_id,
                type,
                initial_message,
                ticket_type,
            } = req.body;

            if (!currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: '未登录',
                });
            }

            let conversation;
            const trimmedMessage = initial_message ? String(initial_message).trim() : '';
            const serviceId = getServiceScopeId(req);

            if (getCurrentRole(req) === 'service') {
                const targetUserId = Number(user_id || peer_user_id || 0);
                const targetDelivererId = Number(deliverer_id || 0);

                if (targetDelivererId) {
                    const deliverer = await Deliverer.findByPk(targetDelivererId, {
                        attributes: ['id'],
                    });

                    if (!deliverer) {
                        return res.status(404).json({
                            success: false,
                            message: '配送员不存在',
                        });
                    }

                    conversation = await ChatConversation.findOne({
                        where: {
                            type: 'deliverer_service',
                            deliverer_id: targetDelivererId,
                            service_id: serviceId,
                            status: 'open',
                        },
                    });

                    if (!conversation) {
                        conversation = await ChatConversation.create({
                            user_id: null,
                            deliverer_id: targetDelivererId,
                            service_id: serviceId,
                            order_id: order_id || null,
                            type: 'deliverer_service',
                            status: 'open',
                            last_message: trimmedMessage || '您好，这里是在线客服。',
                            last_message_at: new Date(),
                        });
                    }
                } else if (targetUserId) {
                    const targetUser = await User.findByPk(targetUserId, {
                        attributes: ['id'],
                    });

                    if (!targetUser) {
                        return res.status(404).json({
                            success: false,
                            message: '用户不存在',
                        });
                    }

                    conversation = await ChatConversation.findOne({
                        where: {
                            type: 'user_service',
                            user_id: targetUserId,
                            service_id: serviceId,
                            status: 'open',
                        },
                    });

                    if (!conversation) {
                        conversation = await ChatConversation.create({
                            user_id: targetUserId,
                            service_id: serviceId,
                            order_id: order_id || task_id || null,
                            type: 'user_service',
                            status: 'open',
                            last_message: trimmedMessage || '您好，这里是在线客服。',
                            last_message_at: new Date(),
                        });
                    }
                } else {
                    return res.status(400).json({
                        success: false,
                        message: '请指定要联系的用户或配送员',
                    });
                }
            } else if (type === 'user_service' || (!peer_user_id && !deliverer_id)) {
                conversation = await ChatConversation.findOne({
                    where: {
                        type: 'user_service',
                        user_id: currentUserId,
                        status: 'open',
                    },
                });

                if (!conversation) {
                    const assignedService = await findAssignableService(null, ticket_type || 'other');

                    if (!assignedService) {
                        return res.status(503).json({
                            success: false,
                            message: '当前暂无可用客服，请稍后再试',
                        });
                    }

                    conversation = await ChatConversation.create({
                        user_id: currentUserId,
                        service_id: assignedService.id,
                        order_id: order_id || null,
                        type: 'user_service',
                        status: 'open',
                        last_message: trimmedMessage || '您好，我想咨询一下。',
                        last_message_at: new Date(),
                    });
                }
            } else {
                let peerUserId = Number(peer_user_id || 0);

                if (!peerUserId && deliverer_id) {
                    const deliverer = await Deliverer.findByPk(Number(deliverer_id), {
                        attributes: ['id', 'user_id'],
                    });

                    if (!deliverer) {
                        return res.status(404).json({
                            success: false,
                            message: '配送员不存在',
                        });
                    }

                    peerUserId = Number(deliverer.user_id || 0);
                }

                if (!peerUserId || peerUserId === Number(currentUserId)) {
                    return res.status(400).json({
                        success: false,
                        message: '聊天对象不正确',
                    });
                }

                const peerUser = await User.findByPk(peerUserId, {
                    attributes: ['id'],
                });

                if (!peerUser) {
                    return res.status(404).json({
                        success: false,
                        message: '聊天对象不存在',
                    });
                }

                const [userA, userB] = normalizeUserPair(currentUserId, peerUserId);

                conversation = await ChatConversation.findOne({
                    where: {
                        type: DIRECT_CHAT_TYPE,
                        user_id: userA,
                        service_id: userB,
                        status: 'open',
                    },
                });

                if (!conversation) {
                    conversation = await ChatConversation.create({
                        user_id: userA,
                        service_id: userB,
                        order_id: order_id || task_id || null,
                        type: DIRECT_CHAT_TYPE,
                        status: 'open',
                        last_message: trimmedMessage || '您好，我想和您沟通一下细节。',
                        last_message_at: new Date(),
                    });
                }
            }

            if (trimmedMessage) {
                const createdMessage = await ChatMessage.create({
                    conversation_id: conversation.id,
                    sender_id: currentUserId,
                    sender_type: getSenderType(req),
                    receiver_type: getReceiverType(conversation, req),
                    content: trimmedMessage,
                    type: 'text',
                    is_read: false,
                });

                await conversation.update({
                    last_message: trimmedMessage,
                    last_message_at: new Date(),
                });

                emitConversationEvent(conversation, 'chat:message:new', {
                    conversation_id: conversation.id,
                    message: createdMessage.toJSON(),
                });
            }

            const data = await decorateConversation(conversation, currentUserId, getCurrentRole(req));

            emitConversationEvent(conversation, 'chat:conversation:updated', {
                conversation_id: conversation.id,
                conversation: data,
            });

            res.status(201).json({
                success: true,
                message: '会话创建成功',
                data,
            });
        } catch (error) {
            console.error('创建会话失败:', error);
            res.status(500).json({
                success: false,
                message: '创建会话失败',
                error: error.message,
            });
        }
    }

    async getConversations(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const currentRole = getCurrentRole(req);
            const currentServiceId = getServiceScopeId(req);
            const where = {
                type: {
                    [Op.in]: ['user_service', 'deliverer_service'],
                },
            };

            if (currentRole === 'service' && currentServiceId) {
                where.service_id = currentServiceId;
            }

            const { count, rows } = await ChatConversation.findAndCountAll({
                where,
                order: [['last_message_at', 'DESC']],
                limit: parseInt(limit, 10),
                offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            });

            const conversations = await Promise.all(
                rows.map(async conversation => {
                    const data = await decorateConversation(
                        conversation,
                        getServiceScopeId(req),
                        getCurrentRole(req)
                    );
                    data.unread_count = await ChatMessage.count({
                        where: {
                            conversation_id: conversation.id,
                            is_read: false,
                            receiver_type: 'service',
                        },
                    });
                    return data;
                })
            );

            res.json({
                success: true,
                data: conversations,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: count,
                },
            });
        } catch (error) {
            console.error('获取会话列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取会话列表失败',
                error: error.message,
            });
        }
    }

    async getConversationDetail(req, res) {
        try {
            const conversation = await ChatConversation.findByPk(req.params.id);
            const currentUserId = req.user?.id;
            const currentRole = getCurrentRole(req);

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            if (!hasConversationAccess(conversation, currentUserId, currentRole)) {
                return res.status(403).json({
                    success: false,
                    message: '无权限查看该会话',
                });
            }

            const messages = await ChatMessage.findAll({
                where: { conversation_id: conversation.id },
                order: [['created_at', 'ASC']],
                limit: 100,
            });

            const data = await decorateConversation(conversation, currentUserId, currentRole);
            data.messages = messages;

            res.json({
                success: true,
                data,
            });
        } catch (error) {
            console.error('获取会话详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取会话详情失败',
                error: error.message,
            });
        }
    }

    async getAvailableServices(req, res) {
        try {
            if (getCurrentRole(req) !== 'service') {
                return res.status(403).json({
                    success: false,
                    message: '无权限获取客服列表',
                });
            }

            const services = await Service.findAll({
                where: { status: 'active' },
                attributes: ['id', 'username', 'name', 'avatar', 'role', 'status'],
                order: [
                    ['last_login_at', 'DESC'],
                    ['id', 'ASC'],
                ],
            });

            res.json({
                success: true,
                data: services.map(service => ({
                    id: service.id,
                    username: service.username,
                    name: getServiceDisplayName(service),
                    avatar: service.avatar || null,
                    role: service.role,
                    status: service.status,
                    staff_code: `KF-${String(service.id).padStart(3, '0')}`,
                })),
            });
        } catch (error) {
            console.error('获取客服列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取客服列表失败',
                error: error.message,
            });
        }
    }

    async getMessages(req, res) {
        try {
            const { conversation_id, page = 1, limit = 50 } = req.query;
            const conversation = await ChatConversation.findByPk(conversation_id);
            const currentUserId = req.user?.id;
            const currentRole = getCurrentRole(req);

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            if (!hasConversationAccess(conversation, currentUserId, currentRole)) {
                return res.status(403).json({
                    success: false,
                    message: '无权限查看该会话消息',
                });
            }

            const { count, rows } = await ChatMessage.findAndCountAll({
                where: { conversation_id },
                order: [['created_at', 'ASC']],
                limit: parseInt(limit, 10),
                offset: (parseInt(page, 10) - 1) * parseInt(limit, 10),
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page, 10),
                    per_page: parseInt(limit, 10),
                    total: count,
                },
            });
        } catch (error) {
            console.error('获取消息列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取消息列表失败',
                error: error.message,
            });
        }
    }

    async sendMessage(req, res) {
        try {
            const { conversation_id, content, type = 'text' } = req.body;
            const currentUserId = req.user?.id;
            const currentRole = getCurrentRole(req);

            if (!currentUserId) {
                return res.status(401).json({
                    success: false,
                    message: '未登录',
                });
            }

            if (!content || !String(content).trim()) {
                return res.status(400).json({
                    success: false,
                    message: '消息内容不能为空',
                });
            }

            const conversation = await ChatConversation.findByPk(conversation_id);

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            if (!hasConversationAccess(conversation, currentUserId, currentRole)) {
                return res.status(403).json({
                    success: false,
                    message: '无权限发送该会话消息',
                });
            }

            const message = await ChatMessage.create({
                conversation_id,
                sender_id: currentUserId,
                sender_type: getSenderType(req),
                receiver_type: getReceiverType(conversation, req),
                content: String(content).trim(),
                type,
                is_read: false,
            });

            await conversation.update({
                last_message_at: new Date(),
                last_message: String(content).trim(),
            });

            const decoratedConversation = await decorateConversation(
                conversation,
                currentUserId,
                currentRole
            );

            emitConversationEvent(conversation, 'chat:message:new', {
                conversation_id: Number(conversation_id),
                message: message.toJSON(),
            });
            emitConversationEvent(conversation, 'chat:conversation:updated', {
                conversation_id: Number(conversation_id),
                conversation: decoratedConversation,
            });

            res.status(201).json({
                success: true,
                message: '消息发送成功',
                data: message,
            });
        } catch (error) {
            console.error('发送消息失败:', error);
            res.status(500).json({
                success: false,
                message: '发送消息失败',
                error: error.message,
            });
        }
    }

    async transferConversation(req, res) {
        try {
            const currentUserId = Number(req.user?.id || 0);
            const currentRole = getCurrentRole(req);
            const conversationId = Number(req.params.id || 0);
            const targetServiceId = Number(req.body.target_service_id || req.body.service_id || 0);
            const notifyUser = req.body.notify_user !== false;

            if (currentRole !== 'service' || !currentUserId) {
                return res.status(403).json({
                    success: false,
                    message: '无权限转接会话',
                });
            }

            if (!conversationId) {
                return res.status(400).json({
                    success: false,
                    message: '会话ID不正确',
                });
            }

            if (!targetServiceId) {
                return res.status(400).json({
                    success: false,
                    message: '请选择转接客服',
                });
            }

            const conversation = await ChatConversation.findByPk(conversationId);

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            if (!hasConversationAccess(conversation, currentUserId, currentRole)) {
                return res.status(403).json({
                    success: false,
                    message: '无权限操作该会话',
                });
            }

            if (
                conversation.type !== 'user_service' &&
                conversation.type !== 'deliverer_service'
            ) {
                return res.status(400).json({
                    success: false,
                    message: '当前会话类型不支持转接',
                });
            }

            if (Number(conversation.service_id || 0) !== Number(currentUserId)) {
                return res.status(403).json({
                    success: false,
                    message: '只有当前负责人可以转接会话',
                });
            }

            if (Number(conversation.service_id || 0) === targetServiceId) {
                return res.status(400).json({
                    success: false,
                    message: '目标客服不能与当前负责人相同',
                });
            }

            const [fromService, targetService] = await Promise.all([
                Service.findByPk(currentUserId, {
                    attributes: ['id', 'username', 'name'],
                }),
                Service.findOne({
                    where: { id: targetServiceId, status: 'active' },
                    attributes: ['id', 'username', 'name', 'avatar', 'role', 'status'],
                }),
            ]);

            if (!targetService) {
                return res.status(404).json({
                    success: false,
                    message: '目标客服不存在或已停用',
                });
            }

            const fromName = getServiceDisplayName(fromService);
            const targetName = getServiceDisplayName(targetService);
            const systemMessageText = notifyUser
                ? `当前会话已由${fromName}转交给${targetName}，接下来由${targetName}继续为您服务。`
                : `当前会话已由${fromName}转交给${targetName}。`;

            await conversation.update({
                service_id: targetService.id,
                last_message: systemMessageText,
                last_message_at: new Date(),
            });

            const systemMessage = await ChatMessage.create({
                conversation_id: conversation.id,
                sender_id: targetService.id,
                sender_type: 'service',
                receiver_type: conversation.type === 'deliverer_service' ? 'deliverer' : 'user',
                content: systemMessageText,
                type: 'system',
                is_read: false,
            });

            const decoratedConversation = await decorateConversation(
                conversation,
                currentUserId,
                currentRole
            );

            emitConversationEvent(conversation, 'chat:message:new', {
                conversation_id: conversation.id,
                message: systemMessage.toJSON(),
            });
            emitConversationEvent(conversation, 'chat:conversation:updated', {
                conversation_id: conversation.id,
                conversation: decoratedConversation,
            });

            res.json({
                success: true,
                message: '会话转接成功',
                data: decoratedConversation,
            });
        } catch (error) {
            console.error('转接会话失败:', error);
            res.status(500).json({
                success: false,
                message: '转接会话失败',
                error: error.message,
            });
        }
    }

    async markAsRead(req, res) {
        try {
            const { conversation_id } = req.body;
            const currentUserId = req.user?.id;
            const currentRole = getCurrentRole(req);

            if (!conversation_id) {
                return res.status(400).json({
                    success: false,
                    message: '会话ID不能为空',
                });
            }

            const conversation = await ChatConversation.findByPk(conversation_id);

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            if (!hasConversationAccess(conversation, currentUserId, currentRole)) {
                return res.status(403).json({
                    success: false,
                    message: '无权限操作该会话',
                });
            }

            await ChatMessage.update(
                { is_read: true },
                {
                    where: {
                        conversation_id,
                        is_read: false,
                        sender_id: { [Op.ne]: currentUserId },
                    },
                }
            );

            emitConversationEvent(conversation, 'chat:message:read', {
                conversation_id: Number(conversation_id),
                reader_id: currentUserId,
                reader_role: currentRole,
                read_at: new Date().toISOString(),
            });

            res.json({
                success: true,
                message: '消息已标记为已读',
            });
        } catch (error) {
            console.error('标记已读失败:', error);
            res.status(500).json({
                success: false,
                message: '标记已读失败',
                error: error.message,
            });
        }
    }

    async getMyConversations(req, res) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: '未登录',
                });
            }

            const conversations = await ChatConversation.findAll({
                where: {
                    [Op.or]: [
                        { user_id: userId },
                        {
                            [Op.and]: [{ type: DIRECT_CHAT_TYPE }, { service_id: userId }],
                        },
                    ],
                },
                order: [['last_message_at', 'DESC']],
            });

            const result = await Promise.all(
                conversations.map(async conversation => {
                    const data = await decorateConversation(conversation, userId, req.userRole);
                    data.unread_count = await ChatMessage.count({
                        where: {
                            conversation_id: conversation.id,
                            is_read: false,
                            sender_id: { [Op.ne]: userId },
                        },
                    });
                    return data;
                })
            );

            res.json({
                success: true,
                data: result,
            });
        } catch (error) {
            console.error('获取会话列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取会话列表失败',
                error: error.message,
            });
        }
    }

    async getUserStats(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID不能为空',
                });
            }

            const user = await User.findByPk(userId, {
                attributes: ['id', 'username', 'avatar', 'real_name', 'phone', 'student_id', 'created_at', 'status'],
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在',
                });
            }

            const totalOrders = await PickupOrder.count({ where: { user_id: userId } });
            const historyChats = await ChatConversation.count({
                where: {
                    [Op.or]: [
                        { user_id: userId },
                        {
                            [Op.and]: [{ type: DIRECT_CHAT_TYPE }, { service_id: userId }],
                        },
                    ],
                },
            });
            const unresolvedTickets = await ServiceTicket.count({
                where: {
                    user_id: userId,
                    status: {
                        [Op.in]: ['pending', 'processing'],
                    },
                },
            });

            res.json({
                success: true,
                data: {
                    ...user.toJSON(),
                    total_orders: totalOrders,
                    complaint_count: 0,
                    history_chats_count: historyChats,
                    unresolved_ticket_count: unresolvedTickets,
                },
            });
        } catch (error) {
            console.error('获取用户统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取用户统计失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceChatController();
