const { ServiceTicket, User, PickupOrder } = require('../../models');
const { Op } = require('sequelize');

class ServiceTicketController {
    // 获取工单列表
    async getTickets(req, res) {
        try {
            const {
                status,
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
            const ticket = await ServiceTicket.findByPk(req.params.id);

            if (!ticket) {
                return res.status(404).json({
                    success: false,
                    message: '工单不存在',
                });
            }

            ticket.status = status;
            ticket.solution = solution;
            ticket.service_id = req.user.id;
            ticket.resolved_at = status === 'resolved' ? new Date() : null;
            await ticket.save();

            res.json({
                success: true,
                message: '工单状态更新成功',
                data: ticket,
            });
        } catch (error) {
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
}

module.exports = new ServiceTicketController();
