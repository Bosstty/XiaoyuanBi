const { PickupOrder, User, Deliverer } = require('../../models');
const { responseUtils, paginationUtils } = require('../../utils');
const { Op } = require('sequelize');
const SecurityService = require('../../services/SecurityService');

class DelivererOrderController {
    // 获取可接单列表
    static async getAvailableOrders(req, res) {
        try {
            const delivererId = req.user.deliverer_id;
            const {
                page = 1,
                limit = 10,
                type,
                min_price,
                max_price,
                urgent,
                distance
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = {
                status: 'pending',
                deliverer_id: null
            };

            if (type) where.type = type;
            if (min_price) where.price = { [Op.gte]: min_price };
            if (max_price) where.price = { ...where.price, [Op.lte]: max_price };
            if (urgent === 'true') where.urgent = true;

            const { count, rows } = await PickupOrder.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatar', 'rating']
                }],
                order: [
                    ['urgent', 'DESC'],
                    ['tip', 'DESC'],
                    ['created_at', 'ASC']
                ],
                offset,
                limit: queryLimit,
            });

            const pagination = paginationUtils.formatPaginatedResponse(rows, page, limit, count);

            res.json(
                responseUtils.paginated(pagination.data, pagination.pagination, '获取可接单列表成功')
            );
        } catch (error) {
            console.error('获取可接单列表失败:', error);
            res.status(500).json(responseUtils.error('获取可接单列表失败'));
        }
    }

    // 根据位置获取附近订单
    static async getNearbyOrders(req, res) {
        try {
            const { latitude, longitude, radius = 5 } = req.query;

            if (!latitude || !longitude) {
                return res.status(400).json(responseUtils.error('请提供位置信息'));
            }

            const orders = await PickupOrder.findAll({
                where: {
                    status: 'pending',
                    deliverer_id: null
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatar', 'rating']
                }],
                order: [
                    ['urgent', 'DESC'],
                    ['tip', 'DESC'],
                    ['created_at', 'ASC']
                ],
                limit: 50
            });

            // 这里应该根据实际的位置计算距离
            // 暂时返回所有订单
            const nearbyOrders = orders.map(order => ({
                ...order.toJSON(),
                distance: Math.random() * radius // 模拟距离
            })).filter(order => order.distance <= radius);

            res.json(responseUtils.success(nearbyOrders, '获取附近订单成功'));
        } catch (error) {
            console.error('获取附近订单失败:', error);
            res.status(500).json(responseUtils.error('获取附近订单失败'));
        }
    }

    // 接受订单
    static async acceptOrder(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.status !== 'pending') {
                return res.status(400).json(responseUtils.error('订单状态不允许接单'));
            }

            if (order.deliverer_id) {
                return res.status(400).json(responseUtils.error('订单已被其他配送员接受'));
            }

            // 检查配送员是否有其他进行中的订单
            const activeOrder = await PickupOrder.findOne({
                where: {
                    deliverer_id: delivererId,
                    status: { [Op.in]: ['accepted', 'picking_up', 'delivering'] }
                }
            });

            if (activeOrder) {
                return res.status(400).json(responseUtils.error('您还有其他订单在进行中'));
            }

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(userId, 'accept_order', {
                order_id: id,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            await order.update({
                deliverer_id: delivererId,
                status: 'accepted',
                accepted_time: new Date()
            });

            const updatedOrder = await PickupOrder.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone']
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone']
                    }
                ]
            });

            res.json(responseUtils.success(updatedOrder, '订单接受成功'));
        } catch (error) {
            console.error('接受订单失败:', error);
            res.status(500).json(responseUtils.error('接受订单失败'));
        }
    }

    // 获取我的订单列表
    static async getMyOrders(req, res) {
        try {
            const delivererId = req.user.deliverer_id;
            const {
                page = 1,
                limit = 10,
                status
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = { deliverer_id: delivererId };
            if (status) where.status = status;

            const { count, rows } = await PickupOrder.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatar', 'rating', 'phone']
                }],
                order: [['created_at', 'DESC']],
                offset,
                limit: queryLimit,
            });

            const pagination = paginationUtils.formatPaginatedResponse(rows, page, limit, count);

            res.json(
                responseUtils.paginated(pagination.data, pagination.pagination, '获取我的订单成功')
            );
        } catch (error) {
            console.error('获取我的订单失败:', error);
            res.status(500).json(responseUtils.error('获取我的订单失败'));
        }
    }

    // 获取订单详情
    static async getOrderDetail(req, res) {
        try {
            const { id } = req.params;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone']
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone']
                    }
                ]
            });

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限查看此订单'));
            }

            res.json(responseUtils.success(order, '获取订单详情成功'));
        } catch (error) {
            console.error('获取订单详情失败:', error);
            res.status(500).json(responseUtils.error('获取订单详情失败'));
        }
    }

    // 更新订单状态
    static async updateOrderStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            const allowedTransitions = {
                'accepted': ['picking_up', 'cancelled'],
                'picking_up': ['delivering', 'cancelled'],
                'delivering': ['completed', 'cancelled']
            };

            if (!allowedTransitions[order.status]?.includes(status)) {
                return res.status(400).json(responseUtils.error('订单状态变更不合法'));
            }

            const updateData = { status, notes };

            // 根据状态更新时间字段
            switch (status) {
                case 'picking_up':
                    updateData.pickup_start_time = new Date();
                    break;
                case 'delivering':
                    updateData.pickup_complete_time = new Date();
                    break;
                case 'completed':
                    updateData.delivery_complete_time = new Date();
                    break;
                case 'cancelled':
                    updateData.cancel_time = new Date();
                    break;
            }

            await order.update(updateData);

            res.json(responseUtils.success(order, '订单状态更新成功'));
        } catch (error) {
            console.error('更新订单状态失败:', error);
            res.status(500).json(responseUtils.error('更新订单状态失败'));
        }
    }

    // 开始取货
    static async startPickup(req, res) {
        try {
            const { id } = req.params;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            if (order.status !== 'accepted') {
                return res.status(400).json(responseUtils.error('订单状态不正确'));
            }

            await order.update({
                status: 'picking_up',
                pickup_start_time: new Date()
            });

            res.json(responseUtils.success(order, '开始取货'));
        } catch (error) {
            console.error('开始取货失败:', error);
            res.status(500).json(responseUtils.error('开始取货失败'));
        }
    }

    // 确认取货
    static async confirmPickup(req, res) {
        try {
            const { id } = req.params;
            const { pickup_code } = req.body;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            if (order.status !== 'picking_up') {
                return res.status(400).json(responseUtils.error('订单状态不正确'));
            }

            // 验证取货码（如果需要）
            if (order.pickup_code && pickup_code !== order.pickup_code) {
                return res.status(400).json(responseUtils.error('取货码错误'));
            }

            await order.update({
                status: 'delivering',
                pickup_complete_time: new Date()
            });

            res.json(responseUtils.success(order, '取货确认成功'));
        } catch (error) {
            console.error('确认取货失败:', error);
            res.status(500).json(responseUtils.error('确认取货失败'));
        }
    }

    // 开始配送
    static async startDelivery(req, res) {
        try {
            const { id } = req.params;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            if (order.status !== 'delivering') {
                return res.status(400).json(responseUtils.error('订单状态不正确'));
            }

            res.json(responseUtils.success(order, '开始配送'));
        } catch (error) {
            console.error('开始配送失败:', error);
            res.status(500).json(responseUtils.error('开始配送失败'));
        }
    }

    // 确认送达
    static async confirmDelivery(req, res) {
        try {
            const { id } = req.params;
            const { delivery_code, delivery_photo } = req.body;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            if (order.status !== 'delivering') {
                return res.status(400).json(responseUtils.error('订单状态不正确'));
            }

            await order.update({
                status: 'delivered',
                delivery_complete_time: new Date(),
                delivery_photo
            });

            res.json(responseUtils.success(order, '送达确认成功'));
        } catch (error) {
            console.error('确认送达失败:', error);
            res.status(500).json(responseUtils.error('确认送达失败'));
        }
    }

    // 上传配送照片
    static async uploadDeliveryProof(req, res) {
        try {
            const { id } = req.params;
            const file = req.files?.proof;

            if (!file) {
                return res.status(400).json(responseUtils.error('请上传配送照片'));
            }

            // 这里应该实现文件上传逻辑
            const photoUrl = `/uploads/delivery/${id}_${Date.now()}.jpg`;

            res.json(responseUtils.success({ url: photoUrl }, '配送照片上传成功'));
        } catch (error) {
            console.error('上传配送照片失败:', error);
            res.status(500).json(responseUtils.error('上传配送照片失败'));
        }
    }

    // 申请取消订单
    static async requestCancel(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const delivererId = req.user.deliverer_id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.deliverer_id !== delivererId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            if (!['accepted', 'picking_up'].includes(order.status)) {
                return res.status(400).json(responseUtils.error('当前订单状态不允许取消'));
            }

            await order.update({
                status: 'cancelled',
                cancel_reason: reason,
                cancel_time: new Date(),
                deliverer_id: null
            });

            res.json(responseUtils.success(order, '订单取消申请成功'));
        } catch (error) {
            console.error('申请取消订单失败:', error);
            res.status(500).json(responseUtils.error('申请取消订单失败'));
        }
    }

    // 获取配送统计
    static async getDeliveryStats(req, res) {
        try {
            const delivererId = req.user.deliverer_id;

            const stats = await Promise.all([
                PickupOrder.count({ where: { deliverer_id: delivererId } }),
                PickupOrder.count({ where: { deliverer_id: delivererId, status: 'completed' } }),
                PickupOrder.count({ where: { deliverer_id: delivererId, status: { [Op.in]: ['accepted', 'picking_up', 'delivering'] } } }),
                PickupOrder.sum('price', { where: { deliverer_id: delivererId, status: 'completed' } }) || 0,
                PickupOrder.sum('tip', { where: { deliverer_id: delivererId, status: 'completed' } }) || 0,
            ]);

            const result = {
                total_orders: stats[0],
                completed_orders: stats[1],
                active_orders: stats[2],
                total_earnings: stats[3] + stats[4],
                base_earnings: stats[3],
                tip_earnings: stats[4]
            };

            res.json(responseUtils.success(result, '获取配送统计成功'));
        } catch (error) {
            console.error('获取配送统计失败:', error);
            res.status(500).json(responseUtils.error('获取配送统计失败'));
        }
    }

    // 获取今日订单
    static async getTodayOrders(req, res) {
        try {
            const delivererId = req.user.deliverer_id;
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const orders = await PickupOrder.findAll({
                where: {
                    deliverer_id: delivererId,
                    created_at: { [Op.gte]: today }
                },
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatar']
                }],
                order: [['created_at', 'DESC']]
            });

            res.json(responseUtils.success(orders, '获取今日订单成功'));
        } catch (error) {
            console.error('获取今日订单失败:', error);
            res.status(500).json(responseUtils.error('获取今日订单失败'));
        }
    }

    // 获取历史订单
    static async getHistoryOrders(req, res) {
        try {
            const delivererId = req.user.deliverer_id;
            const {
                page = 1,
                limit = 10,
                start_date,
                end_date
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = { deliverer_id: delivererId };

            if (start_date && end_date) {
                where.created_at = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const { count, rows } = await PickupOrder.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'user',
                    attributes: ['id', 'username', 'avatar']
                }],
                order: [['created_at', 'DESC']],
                offset,
                limit: queryLimit,
            });

            const pagination = paginationUtils.formatPaginatedResponse(rows, page, limit, count);

            res.json(
                responseUtils.paginated(pagination.data, pagination.pagination, '获取历史订单成功')
            );
        } catch (error) {
            console.error('获取历史订单失败:', error);
            res.status(500).json(responseUtils.error('获取历史订单失败'));
        }
    }
}

module.exports = DelivererOrderController;