const { ServiceTicket, User, PickupOrder, Wallet, Transaction } = require('../../models');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

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
                    { model: User, as: 'user', attributes: ['id', 'username', 'phone'] },
                    { model: PickupOrder, as: 'order' },
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
            const { amount, reason } = req.body;
            const order = await PickupOrder.findByPk(req.params.id, {
                include: [{ model: Wallet, as: 'wallet' }],
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            // 退还金额到用户钱包
            await Wallet.update(
                { balance: require('sequelize').literal('balance + ' + amount) },
                { where: { user_id: order.user_id } }
            );

            // 创建交易记录
            await Transaction.create({
                user_id: order.user_id,
                type: 'refund',
                amount: amount,
                status: 'completed',
                description: `售后退款: ${reason}`,
            });

            order.payment_status = 'refunded';
            order.refund_amount = amount;
            order.refund_reason = reason;
            await order.save();

            res.json({
                success: true,
                message: '退款处理成功',
                data: order,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '退款处理失败',
                error: error.message,
            });
        }
    }

    // 补偿处理
    async processCompensate(req, res) {
        try {
            const { amount, reason } = req.body;
            const order = await PickupOrder.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            // 创建补偿记录（实际项目中可能需要额外的补偿表）
            await Transaction.create({
                user_id: order.user_id,
                type: 'compensation',
                amount: amount,
                status: 'completed',
                description: `订单补偿: ${reason}`,
            });

            order.compensation_amount = amount;
            order.compensation_reason = reason;
            await order.save();

            res.json({
                success: true,
                message: '补偿处理成功',
                data: order,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '补偿处理失败',
                error: error.message,
            });
        }
    }
}

module.exports = new ServiceTicketController();
