const { Message, User } = require('@/models');
const { Op } = require('sequelize');

class DelivererMessageController {
    // 获取配送员消息列表
    static async getMessages(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, status } = req.query;
            const offset = (page - 1) * limit;

            const where = {
                [Op.or]: [{ sender_id: userId }, { recipient_id: userId }],
            };

            if (status) {
                where.status = status;
            }

            const { count, rows } = await Message.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset,
                include: [
                    { model: User, as: 'sender', attributes: ['id', 'username'] },
                    { model: User, as: 'recipient', attributes: ['id', 'username'] },
                ],
                order: [['created_at', 'DESC']],
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count,
                    total_pages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            console.error('获取配送员消息列表失败:', error);
            res.status(500).json({
                success: false,
                message: '获取消息列表失败',
                error: error.message,
            });
        }
    }

    // 发送消息
    static async sendMessage(req, res) {
        try {
            const senderId = req.user.id;
            const { recipient_id, content, type = 'text' } = req.body;

            const message = await Message.create({
                sender_id: senderId,
                recipient_id,
                content,
                type,
                status: 'unread',
            });

            res.json({
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

    // 标记消息为已读
    static async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const message = await Message.findOne({
                where: { id, recipient_id: userId },
            });

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: '消息不存在',
                });
            }

            await message.update({ status: 'read', read_at: new Date() });

            res.json({
                success: true,
                message: '已标记为已读',
            });
        } catch (error) {
            console.error('标记消息为已读失败:', error);
            res.status(500).json({
                success: false,
                message: '标记消息为已读失败',
                error: error.message,
            });
        }
    }
}

module.exports = DelivererMessageController;
