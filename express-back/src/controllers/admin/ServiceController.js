const { Service, ServiceTicket } = require('../../models');
const { Op } = require('sequelize');

const ALLOWED_TICKET_TYPES = ['complaint', 'refund', 'dispute', 'suggestion', 'other'];

const normalizeTicketTypes = value => {
    const list = Array.isArray(value)
        ? value
        : typeof value === 'string' && value.trim()
          ? value
                .split(',')
                .map(item => item.trim())
                .filter(Boolean)
          : [];

    return [...new Set(list)].filter(item => ALLOWED_TICKET_TYPES.includes(item)).slice(0, 2);
};

const releaseOpenTicketsForService = async serviceId => {
    if (!serviceId) return;

    await ServiceTicket.update(
        {
            service_id: null,
            status: 'pending',
        },
        {
            where: {
                service_id: serviceId,
                status: {
                    [Op.in]: ['pending', 'processing'],
                },
            },
        }
    );
};

class AdminServiceController {
    async getServices(req, res) {
        try {
            const services = await Service.findAll({
                attributes: { exclude: ['password'] },
                order: [['created_at', 'DESC']],
            });

            res.json({
                success: true,
                data: services.map(service => ({
                    ...service.toJSON(),
                    ticket_types: normalizeTicketTypes(service.ticket_types),
                })),
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取客服列表失败',
                error: error.message,
            });
        }
    }

    async createService(req, res) {
        try {
            const { username, password, name, phone, email, role, ticket_types } = req.body;

            if (!username || !password || !name) {
                return res.status(400).json({
                    success: false,
                    message: '用户名、密码和姓名不能为空',
                });
            }

            const normalizedTicketTypes = normalizeTicketTypes(ticket_types);
            if ((Array.isArray(ticket_types) ? ticket_types.length : normalizedTicketTypes.length) > 2) {
                return res.status(400).json({
                    success: false,
                    message: '每个客服最多配置2种工单类型',
                });
            }

            const exists = await Service.findOne({ where: { username } });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: '客服账号已存在',
                });
            }

            const service = await Service.create({
                username,
                password,
                name,
                phone: phone || null,
                email: email || null,
                role: role || 'service',
                status: 'active',
                ticket_types: normalizedTicketTypes,
            });

            const data = service.toJSON();
            delete data.password;

            res.status(201).json({
                success: true,
                message: '客服账号创建成功',
                data,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '创建客服账号失败',
                error: error.message,
            });
        }
    }

    async updateService(req, res) {
        try {
            const service = await Service.findByPk(req.params.id);

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在',
                });
            }

            const { name, phone, email, role, password, ticket_types } = req.body;
            const normalizedTicketTypes = ticket_types === undefined ? null : normalizeTicketTypes(ticket_types);

            if (Array.isArray(ticket_types) && ticket_types.length > 2) {
                return res.status(400).json({
                    success: false,
                    message: '每个客服最多配置2种工单类型',
                });
            }

            await service.update({
                name: name ?? service.name,
                phone: phone ?? service.phone,
                email: email ?? service.email,
                role: role ?? service.role,
                ...(password ? { password } : {}),
                ...(normalizedTicketTypes ? { ticket_types: normalizedTicketTypes } : {}),
            });

            const data = service.toJSON();
            delete data.password;

            res.json({
                success: true,
                message: '客服信息更新成功',
                data,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '更新客服信息失败',
                error: error.message,
            });
        }
    }

    async updateServiceStatus(req, res) {
        try {
            const { status } = req.body;
            const service = await Service.findByPk(req.params.id);

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在',
                });
            }

            if (!['active', 'inactive', 'banned'].includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: '客服状态不正确',
                });
            }

            await service.update({ status });

            if (status !== 'active') {
                await releaseOpenTicketsForService(service.id);
            }

            res.json({
                success: true,
                message: '客服状态更新成功',
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '更新客服状态失败',
                error: error.message,
            });
        }
    }
}

module.exports = new AdminServiceController();
