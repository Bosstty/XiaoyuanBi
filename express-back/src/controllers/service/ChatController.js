const { ChatConversation, ChatMessage, User, Deliverer, PickupOrder } = require('../../models');

class ServiceChatController {
    // 创建会话（用户/配送员发起）
    async createConversation(req, res) {
        try {
            const { user_id, deliverer_id, order_id, type, initial_message } = req.body;
            const service_id = req.user?.id || 1; // 默认客服ID

            // 检查是否已存在相同会话
            let conversation = await ChatConversation.findOne({
                where: {
                    user_id: user_id || null,
                    deliverer_id: deliverer_id || null,
                    service_id: service_id,
                    status: 'open'
                }
            });

            if (!conversation) {
                // 创建新会话
                conversation = await ChatConversation.create({
                    user_id: user_id || null,
                    deliverer_id: deliverer_id || null,
                    service_id: service_id,
                    order_id: order_id || null,
                    type: type || (deliverer_id ? 'deliverer_service' : 'user_service'),
                    status: 'open',
                    last_message: initial_message || '您好，有什么可以帮助您的？',
                    last_message_at: new Date()
                });
            }

            // 如果有初始消息，创建消息记录
            if (initial_message) {
                await ChatMessage.create({
                    conversation_id: conversation.id,
                    sender_id: user_id || deliverer_id,
                    sender_type: user_id ? 'user' : 'deliverer',
                    receiver_type: 'service',
                    content: initial_message,
                    type: 'text',
                    is_read: false
                });
            }

            res.status(201).json({
                success: true,
                message: '会话创建成功',
                data: conversation
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '创建会话失败',
                error: error.message
            });
        }
    }

    // 获取会话列表
    async getConversations(req, res) {
        try {
            const { status, page = 1, limit = 20 } = req.query;
            const serviceId = req.user?.id || 1;

            const { count, rows } = await ChatConversation.findAndCountAll({
                where: { service_id: serviceId },
                order: [['last_message_at', 'DESC']],
                limit: parseInt(limit),
                offset: (page - 1) * parseInt(limit),
            });

            // 获取每个会话的对方信息
            const conversations = await Promise.all(
                rows.map(async conv => {
                    const convData = conv.toJSON();
                    if (conv.user_id) {
                        const user = await User.findByPk(conv.user_id, {
                            attributes: ['id', 'username', 'avatar', 'real_name'],
                        });
                        convData.user = user;
                    }
                    if (conv.deliverer_id) {
                        const deliverer = await Deliverer.findByPk(conv.deliverer_id, {
                            attributes: ['id', 'real_name'],
                        });
                        convData.deliverer = deliverer;
                    }
                    return convData;
                })
            );

            res.json({
                success: true,
                data: conversations,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
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

    // 获取会话详情
    async getConversationDetail(req, res) {
        try {
            const conversation = await ChatConversation.findByPk(req.params.id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [
                            'id', 'username', 'avatar', 'real_name', 'phone',
                            'student_id', 'created_at', 'status'
                        ]
                    },
                    {
                        model: Deliverer,
                        as: 'deliverer',
                        attributes: ['id', 'real_name', 'phone', 'status']
                    },
                ],
            });

            if (!conversation) {
                return res.status(404).json({
                    success: false,
                    message: '会话不存在',
                });
            }

            // 获取消息列表
            const messages = await ChatMessage.findAll({
                where: { conversation_id: req.params.id },
                order: [['created_at', 'ASC']],
                limit: 50,
            });

            res.json({
                success: true,
                data: {
                    ...conversation.toJSON(),
                    messages: messages
                },
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

    // 获取消息列表
    async getMessages(req, res) {
        try {
            const { conversation_id, page = 1, limit = 50 } = req.query;

            const { count, rows } = await ChatMessage.findAndCountAll({
                where: { conversation_id },
                order: [['created_at', 'ASC']],
                limit: parseInt(limit),
                offset: (page - 1) * limit,
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count,
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取消息列表失败',
                error: error.message,
            });
        }
    }

    // 发送消息
    async sendMessage(req, res) {
        try {
            const { conversation_id, content, receiver_type } = req.body;
            const serviceId = req.user?.id || 1;

            const message = await ChatMessage.create({
                conversation_id,
                sender_id: serviceId,
                sender_type: 'service',
                receiver_type,
                content,
                is_read: false,
            });

            // 更新会话最后消息时间
            await ChatConversation.update(
                { last_message_at: new Date(), last_message: content },
                { where: { id: conversation_id } }
            );

            res.status(201).json({
                success: true,
                message: '消息发送成功',
                data: message,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '发送消息失败',
                error: error.message,
            });
        }
    }

    // 标记消息为已读
    async markAsRead(req, res) {
        try {
            const { conversation_id } = req.body;

            if (!conversation_id) {
                return res.status(400).json({
                    success: false,
                    message: '会话ID不能为空',
                });
            }

            await ChatMessage.update(
                { is_read: true },
                {
                    where: {
                        conversation_id,
                        is_read: false,
                        receiver_type: req.user?.role || 'service'
                    }
                }
            );

            res.json({
                success: true,
                message: '消息已标记为已读'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '标记已读失败',
                error: error.message,
            });
        }
    }

    // 获取用户/配送员的会话列表（用户端使用）
    async getMyConversations(req, res) {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: '未登录',
                });
            }

            const where = {};
            if (role === 'user') {
                where.user_id = userId;
            } else if (role === 'deliverer') {
                where.deliverer_id = userId;
            } else {
                return res.status(403).json({
                    success: false,
                    message: '无权限',
                });
            }

            const conversations = await ChatConversation.findAll({
                where,
                order: [['last_message_at', 'DESC']],
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'real_name']
                    },
                    {
                        model: Deliverer,
                        as: 'deliverer',
                        attributes: ['id', 'real_name']
                    }
                ]
            });

            // 获取每个会话的未读数
            const result = await Promise.all(
                conversations.map(async conv => {
                    const convData = conv.toJSON();
                    const unreadCount = await ChatMessage.count({
                        where: {
                            conversation_id: conv.id,
                            is_read: false,
                            receiver_type: role
                        }
                    });
                    convData.unread_count = unreadCount;
                    return convData;
                })
            );

            res.json({
                success: true,
                data: result
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取会话列表失败',
                error: error.message,
            });
        }
    }

    // 获取用户统计信息
    async getUserStats(req, res) {
        try {
            const { userId } = req.params;

            if (!userId) {
                return res.status(400).json({
                    success: false,
                    message: '用户ID不能为空',
                });
            }

            // 获取用户基本信息
            const user = await User.findByPk(userId, {
                attributes: ['id', 'username', 'avatar', 'real_name', 'phone', 'student_id', 'created_at', 'status']
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在',
                });
            }

            // 获取订单统计
            const totalOrders = await PickupOrder.count({ where: { user_id: userId } });

            // 获取投诉次数（这里需要Report模型，暂时返回0）
            const complaintCount = 0;

            // 获取历史会话数
            const historyChats = await ChatConversation.count({
                where: { user_id: userId }
            });

            res.json({
                success: true,
                data: {
                    ...user.toJSON(),
                    total_orders: totalOrders,
                    complaint_count: complaintCount,
                    history_chats_count: historyChats
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取用户统计失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceChatController();
