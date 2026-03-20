const { Message, NotificationSetting, User } = require('../../models');
const { responseUtils } = require('../../utils');
const { Op } = require('sequelize');

class MessageController {
    // 发送站内消息
    static async sendMessage(req, res) {
        try {
            const {
                receiver_id,
                type,
                title,
                content,
                related_type,
                related_id,
                priority = 'normal',
            } = req.body;

            const sender = req.user;

            // 检查接收者是否存在
            const receiver = await User.findByPk(receiver_id);
            if (!receiver) {
                return res.status(404).json(responseUtils.error('接收者不存在'));
            }

            // 创建消息
            const message = await Message.create({
                sender_id: sender ? sender.id : null,
                receiver_id,
                type,
                title,
                content,
                related_type,
                related_id,
                priority,
                status: 'active',
            });

            // 发送实时通知
            await MessageController.sendRealtimeNotification(receiver_id, {
                type: 'new_message',
                message: {
                    id: message.id,
                    title,
                    content,
                    type,
                    priority,
                    sender: sender ? { id: sender.id, username: sender.username } : null,
                    created_at: message.created_at,
                },
            });

            res.json(responseUtils.success(message, '消息发送成功'));
        } catch (error) {
            console.error('发送消息失败:', error);
            res.status(500).json(responseUtils.error('发送消息失败'));
        }
    }

    // 发送系统消息
    static async sendSystemMessage(
        receiverId,
        title,
        content,
        type = 'system',
        relatedType = null,
        relatedId = null
    ) {
        try {
            const message = await Message.create({
                sender_id: null,
                receiver_id: receiverId,
                type,
                title,
                content,
                related_type: relatedType,
                related_id: relatedId,
                priority: 'normal',
                status: 'active',
            });

            // 发送实时通知
            await MessageController.sendRealtimeNotification(receiverId, {
                type: 'new_message',
                message: {
                    id: message.id,
                    title,
                    content,
                    type,
                    priority: 'normal',
                    sender: null,
                    created_at: message.created_at,
                },
            });

            return message;
        } catch (error) {
            console.error('发送系统消息失败:', error);
            throw error;
        }
    }

    // 批量发送系统消息
    static async sendBulkSystemMessage(req, res) {
        try {
            const { user_ids, title, content, type = 'system', priority = 'normal' } = req.body;

            if (!user_ids || user_ids.length === 0) {
                return res.status(400).json(responseUtils.error('接收者列表不能为空'));
            }

            const messages = [];
            for (const userId of user_ids) {
                const message = await Message.create({
                    sender_id: null,
                    receiver_id: userId,
                    type,
                    title,
                    content,
                    priority,
                    status: 'active',
                });

                messages.push(message);

                // 发送实时通知
                await MessageController.sendRealtimeNotification(userId, {
                    type: 'new_message',
                    message: {
                        id: message.id,
                        title,
                        content,
                        type,
                        priority,
                        sender: null,
                        created_at: message.created_at,
                    },
                });
            }

            res.json(
                responseUtils.success(
                    {
                        sent_count: messages.length,
                        messages,
                    },
                    '批量消息发送成功'
                )
            );
        } catch (error) {
            console.error('批量发送消息失败:', error);
            res.status(500).json(responseUtils.error('批量发送消息失败'));
        }
    }

    // 获取消息列表
    static async getMessages(req, res) {
        try {
            const user = req.user;
            const { page = 1, limit = 20, type, is_read, priority } = req.query;
            const offset = (page - 1) * limit;

            const where = {
                receiver_id: user.id,
                status: 'active',
            };

            if (type) where.type = type;
            if (is_read !== undefined) where.is_read = is_read === 'true';
            if (priority) where.priority = priority;

            const { count, rows } = await Message.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'sender',
                        attributes: ['id', 'username', 'avatar'],
                        required: false,
                    },
                ],
                offset,
                limit: parseInt(limit),
                order: [['created_at', 'DESC']],
            });

            res.json(
                responseUtils.success({
                    list: rows,
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    pages: Math.ceil(count / limit),
                })
            );
        } catch (error) {
            console.error('获取消息列表失败:', error);
            res.status(500).json(responseUtils.error('获取消息列表失败'));
        }
    }

    // 标记消息为已读
    static async markAsRead(req, res) {
        try {
            const user = req.user;
            const { message_ids } = req.body;

            if (!message_ids || message_ids.length === 0) {
                return res.status(400).json(responseUtils.error('消息ID列表不能为空'));
            }

            const result = await Message.update(
                {
                    is_read: true,
                    read_at: new Date(),
                },
                {
                    where: {
                        id: message_ids,
                        receiver_id: user.id,
                        is_read: false,
                    },
                }
            );

            res.json(
                responseUtils.success(
                    {
                        updated_count: result[0],
                    },
                    '消息已标记为已读'
                )
            );
        } catch (error) {
            console.error('标记消息已读失败:', error);
            res.status(500).json(responseUtils.error('标记消息已读失败'));
        }
    }

    // 删除消息
    static async deleteMessage(req, res) {
        try {
            const user = req.user;
            const { message_id } = req.params;

            const message = await Message.findOne({
                where: {
                    id: message_id,
                    receiver_id: user.id,
                },
            });

            if (!message) {
                return res.status(404).json(responseUtils.error('消息不存在'));
            }

            await message.update({ status: 'deleted' });

            res.json(responseUtils.success(null, '消息删除成功'));
        } catch (error) {
            console.error('删除消息失败:', error);
            res.status(500).json(responseUtils.error('删除消息失败'));
        }
    }

    // 获取未读消息数量
    static async getUnreadCount(req, res) {
        try {
            const user = req.user;

            const counts = await Message.findAll({
                where: {
                    receiver_id: user.id,
                    is_read: false,
                    status: 'active',
                },
                attributes: [
                    'type',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                group: ['type'],
                raw: true,
            });

            const unreadCounts = {
                total: 0,
                by_type: {},
            };

            counts.forEach(item => {
                const count = parseInt(item.count);
                unreadCounts.by_type[item.type] = count;
                unreadCounts.total += count;
            });

            res.json(responseUtils.success(unreadCounts));
        } catch (error) {
            console.error('获取未读消息数量失败:', error);
            res.status(500).json(responseUtils.error('获取未读消息数量失败'));
        }
    }

    // 获取通知设置
    static async getNotificationSettings(req, res) {
        try {
            const user = req.user;

            let settings = await NotificationSetting.findOne({
                where: { user_id: user.id },
            });

            if (!settings) {
                // 创建默认设置
                settings = await NotificationSetting.create({
                    user_id: user.id,
                });
            }

            res.json(responseUtils.success(settings));
        } catch (error) {
            console.error('获取通知设置失败:', error);
            res.status(500).json(responseUtils.error('获取通知设置失败'));
        }
    }

    // 更新通知设置
    static async updateNotificationSettings(req, res) {
        try {
            const user = req.user;
            const settingsData = req.body;

            let settings = await NotificationSetting.findOne({
                where: { user_id: user.id },
            });

            if (!settings) {
                settings = await NotificationSetting.create({
                    user_id: user.id,
                    ...settingsData,
                });
            } else {
                await settings.update(settingsData);
            }

            res.json(responseUtils.success(settings, '通知设置更新成功'));
        } catch (error) {
            console.error('更新通知设置失败:', error);
            res.status(500).json(responseUtils.error('更新通知设置失败'));
        }
    }

    // 注册设备推送令牌
    static async registerDeviceToken(req, res) {
        try {
            const user = req.user;
            const { device_type, token } = req.body; // device_type: ios, android, web

            let settings = await NotificationSetting.findOne({
                where: { user_id: user.id },
            });

            if (!settings) {
                settings = await NotificationSetting.create({
                    user_id: user.id,
                    device_tokens: { [device_type]: token },
                });
            } else {
                const deviceTokens = settings.device_tokens || {};
                deviceTokens[device_type] = token;
                await settings.update({ device_tokens: deviceTokens });
            }

            res.json(responseUtils.success(null, '设备令牌注册成功'));
        } catch (error) {
            console.error('注册设备令牌失败:', error);
            res.status(500).json(responseUtils.error('注册设备令牌失败'));
        }
    }

    // 发送实时通知（WebSocket）
    static async sendRealtimeNotification(userId, data) {
        try {
            // TODO: 实现WebSocket推送
            // const io = require('../config/socket');
            // io.to(`user_${userId}`).emit('notification', data);
            console.log(`实时通知发送给用户 ${userId}:`, data);
        } catch (error) {
            console.error('发送实时通知失败:', error);
        }
    }

    // 发送推送通知
    static async sendPushNotification(userId, title, content, data = {}) {
        try {
            const settings = await NotificationSetting.findOne({
                where: { user_id: userId },
            });

            if (!settings || !settings.device_tokens) {
                return;
            }

            // TODO: 实现真实的推送通知
            // 这里可以集成 Firebase FCM, Apple APNS 等服务
            console.log(`推送通知发送给用户 ${userId}:`, { title, content, data });
        } catch (error) {
            console.error('发送推送通知失败:', error);
        }
    }

    // 发送邮件通知
    static async sendEmailNotification(userId, subject, content, type = 'system') {
        try {
            const user = await User.findByPk(userId);
            if (!user || !user.email) {
                return;
            }

            const settings = await NotificationSetting.findOne({
                where: { user_id: userId },
            });

            // 检查用户是否允许接收该类型的邮件
            const emailKey = `email_${type}`;
            if (settings && settings[emailKey] === false) {
                return;
            }

            // TODO: 实现真实的邮件发送
            // 这里可以使用 nodemailer 或其他邮件服务
            console.log(`邮件通知发送给 ${user.email}:`, { subject, content });
        } catch (error) {
            console.error('发送邮件通知失败:', error);
        }
    }

    // 发送短信通知
    static async sendSMSNotification(userId, content, type = 'system') {
        try {
            const user = await User.findByPk(userId);
            if (!user || !user.phone) {
                return;
            }

            const settings = await NotificationSetting.findOne({
                where: { user_id: userId },
            });

            // 检查用户是否允许接收该类型的短信
            const smsKey = `sms_${type}`;
            if (settings && settings[smsKey] === false) {
                return;
            }

            // TODO: 实现真实的短信发送
            // 这里可以集成阿里云短信、腾讯云短信等服务
            console.log(`短信通知发送给 ${user.phone}:`, content);
        } catch (error) {
            console.error('发送短信通知失败:', error);
        }
    }

    // 综合通知发送（根据用户设置选择通知方式）
    static async sendNotification(userId, options) {
        const {
            title,
            content,
            type = 'system',
            priority = 'normal',
            relatedType = null,
            relatedId = null,
            sendMessage = true,
            sendPush = true,
            sendEmail = false,
            sendSMS = false,
        } = options;

        try {
            // 发送站内消息
            if (sendMessage) {
                await MessageController.sendSystemMessage(
                    userId,
                    title,
                    content,
                    type,
                    relatedType,
                    relatedId
                );
            }

            // 发送推送通知
            if (sendPush) {
                await MessageController.sendPushNotification(userId, title, content, {
                    type,
                    related_type: relatedType,
                    related_id: relatedId,
                });
            }

            // 发送邮件通知
            if (sendEmail) {
                await MessageController.sendEmailNotification(userId, title, content, type);
            }

            // 发送短信通知
            if (sendSMS) {
                await MessageController.sendSMSNotification(userId, content, type);
            }
        } catch (error) {
            console.error('发送综合通知失败:', error);
        }
    }
}

module.exports = MessageController;
