const { PickupOrder, User } = require('../../models');
const { orderUtils, responseUtils, paginationUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const SecurityService = require('../../services/SecurityService');

class UserOrderController {
    // 创建代取订单
    static async createOrder(req, res) {
        try {
            const userId = req.user.id;
            const {
                type,
                title,
                description,
                pickup_location,
                delivery_location,
                pickup_time,
                delivery_time,
                contact_name,
                contact_phone,
                pickup_code,
                weight,
                size,
                price,
                tip,
                urgent,
                fragile,
                images,
                notes,
            } = req.body;

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(userId, 'create_order', {
                amount: price,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            // 生成订单号
            const orderNo = orderUtils.generateOrderNo('PO');

            // 创建订单
            const order = await PickupOrder.create({
                order_no: orderNo,
                user_id: userId,
                type,
                title,
                description,
                pickup_location,
                delivery_location,
                pickup_time,
                delivery_time,
                contact_name,
                contact_phone,
                pickup_code,
                weight,
                size,
                price,
                tip: tip || 0,
                urgent: urgent || false,
                fragile: fragile || false,
                images,
                notes,
                status: 'pending',
            });

            // 获取完整的订单信息（包含用户信息）
            const fullOrder = await PickupOrder.findByPk(order.id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating'],
                    },
                ],
            });

            res.json(responseUtils.success(fullOrder, '订单创建成功'));
        } catch (error) {
            console.error('创建订单失败:', error);
            res.status(500).json(responseUtils.error('创建订单失败'));
        }
    }

    // 获取我的订单
    static async getMyOrders(req, res) {
        try {
            const userId = req.user.id;
            const {
                page = 1,
                limit = 10,
                type = 'all', // all, published, accepted
                status,
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = {};

            if (type === 'published') {
                where.user_id = userId;
            } else if (type === 'accepted') {
                where.deliverer_id = userId;
            } else {
                where[Op.or] = [{ user_id: userId }, { deliverer_id: userId }];
            }

            if (status) {
                where.status = status;
            }

            const { count, rows } = await PickupOrder.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating'],
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['id', 'username', 'avatar', 'rating'],
                        required: false,
                    },
                ],
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
            const userId = req.user.id;

            const order = await PickupOrder.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone'],
                    },
                    {
                        model: User,
                        as: 'deliverer',
                        attributes: ['id', 'username', 'avatar', 'rating', 'phone'],
                        required: false,
                    },
                ],
            });

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            // 检查权限：只有订单相关用户可以查看详情
            if (order.user_id !== userId && order.deliverer_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限查看此订单'));
            }

            res.json(responseUtils.success(order, '获取订单详情成功'));
        } catch (error) {
            console.error('获取订单详情失败:', error);
            res.status(500).json(responseUtils.error('获取订单详情失败'));
        }
    }

    // 取消订单
    static async cancelOrder(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user.id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            // 检查权限：只有订单发布者可以取消订单
            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限取消此订单'));
            }

            // 检查订单状态：只有pending和accepted状态的订单可以取消
            if (!['pending', 'accepted'].includes(order.status)) {
                return res.status(400).json(responseUtils.error('当前订单状态不允许取消'));
            }

            await order.update({
                status: 'cancelled',
                cancel_reason: reason,
                cancel_time: new Date(),
            });

            res.json(responseUtils.success(order, '订单取消成功'));
        } catch (error) {
            console.error('取消订单失败:', error);
            res.status(500).json(responseUtils.error('取消订单失败'));
        }
    }

    // 确认订单完成
    static async confirmOrder(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            // 检查权限：只有订单发布者可以确认完成
            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            // 检查订单状态
            if (order.status !== 'delivering') {
                return res.status(400).json(responseUtils.error('订单状态不正确'));
            }

            await order.update({
                status: 'completed',
                delivery_complete_time: new Date(),
            });

            // 更新配送员完成订单数
            if (order.deliverer_id) {
                await User.increment('completed_orders', {
                    where: { id: order.deliverer_id },
                });
            }

            res.json(responseUtils.success(order, '订单确认完成'));
        } catch (error) {
            console.error('确认订单完成失败:', error);
            res.status(500).json(responseUtils.error('确认订单完成失败'));
        }
    }

    // 评价订单
    static async rateOrder(req, res) {
        try {
            const { id } = req.params;
            const { rating, comment } = req.body;
            const userId = req.user.id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            // 检查权限：只有订单发布者可以评价
            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限评价此订单'));
            }

            // 检查订单状态：只有已完成的订单可以评价
            if (order.status !== 'completed') {
                return res.status(400).json(responseUtils.error('只有已完成的订单才能评价'));
            }

            // 检查是否已经评价过
            if (order.rating) {
                return res.status(400).json(responseUtils.error('该订单已经评价过了'));
            }

            await order.update({
                rating,
                rating_comment: comment,
            });

            // 更新配送员评分
            if (order.deliverer_id) {
                const deliverer = await User.findByPk(order.deliverer_id);
                const avgRating = await PickupOrder.findOne({
                    where: {
                        deliverer_id: order.deliverer_id,
                        status: 'completed',
                        rating: { [Op.not]: null },
                    },
                    attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
                });

                if (avgRating && avgRating.dataValues.avgRating) {
                    await deliverer.update({
                        rating: parseFloat(avgRating.dataValues.avgRating).toFixed(2),
                    });
                }
            }

            res.json(responseUtils.success(order, '评价成功'));
        } catch (error) {
            console.error('评价订单失败:', error);
            res.status(500).json(responseUtils.error('评价订单失败'));
        }
    }

    // 申请退款
    static async requestRefund(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user.id;

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            // 检查权限
            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限操作此订单'));
            }

            // 检查订单状态
            if (!['completed', 'cancelled'].includes(order.status)) {
                return res.status(400).json(responseUtils.error('该订单不支持退款'));
            }

            // TODO: 创建退款记录
            // await RefundRecord.create({...});

            res.json(responseUtils.success(null, '退款申请已提交'));
        } catch (error) {
            console.error('申请退款失败:', error);
            res.status(500).json(responseUtils.error('申请退款失败'));
        }
    }

    // 获取订单统计
    static async getOrderStats(req, res) {
        try {
            const userId = req.user.id;

            const stats = await Promise.all([
                // 发布的订单统计
                PickupOrder.count({ where: { user_id: userId } }),
                PickupOrder.count({ where: { user_id: userId, status: 'pending' } }),
                PickupOrder.count({ where: { user_id: userId, status: 'completed' } }),

                // 接受的订单统计
                PickupOrder.count({ where: { deliverer_id: userId } }),
                PickupOrder.count({ where: { deliverer_id: userId, status: 'in_progress' } }),
                PickupOrder.count({ where: { deliverer_id: userId, status: 'completed' } }),
            ]);

            const result = {
                published: {
                    total: stats[0],
                    pending: stats[1],
                    completed: stats[2],
                },
                accepted: {
                    total: stats[3],
                    in_progress: stats[4],
                    completed: stats[5],
                },
            };

            res.json(responseUtils.success(result, '获取订单统计成功'));
        } catch (error) {
            console.error('获取订单统计失败:', error);
            res.status(500).json(responseUtils.error('获取订单统计失败'));
        }
    }

    // 搜索附近的配送员
    static async findNearbyDeliverers(req, res) {
        try {
            const { latitude, longitude, radius = 5 } = req.query;
            const { Deliverer } = require('../../models');

            const deliverers = await Deliverer.findAll({
                where: {
                    application_status: 'approved',
                    status: 'active',
                    is_online: true,
                    current_latitude: { [Op.not]: null },
                    current_longitude: { [Op.not]: null },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['username', 'avatar', 'rating'],
                    },
                ],
                order: [['rating', 'DESC']],
                limit: 20,
            });

            // 计算距离并过滤
            const nearbyDeliverers = deliverers
                .filter(deliverer => {
                    const distance = this.calculateDistance(
                        parseFloat(latitude),
                        parseFloat(longitude),
                        parseFloat(deliverer.current_latitude),
                        parseFloat(deliverer.current_longitude)
                    );
                    return distance <= radius;
                })
                .map(deliverer => {
                    const distance = this.calculateDistance(
                        parseFloat(latitude),
                        parseFloat(longitude),
                        parseFloat(deliverer.current_latitude),
                        parseFloat(deliverer.current_longitude)
                    );
                    return {
                        ...deliverer.toJSON(),
                        distance: distance.toFixed(2),
                    };
                })
                .sort((a, b) => a.distance - b.distance);

            res.json(responseUtils.success(nearbyDeliverers));
        } catch (error) {
            console.error('查找附近配送员失败:', error);
            res.status(500).json(responseUtils.error('查找附近配送员失败'));
        }
    }

    // 辅助方法：计算距离
    static calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // 地球半径（公里）
        const dLat = ((lat2 - lat1) * Math.PI) / 180;
        const dLon = ((lon2 - lon1) * Math.PI) / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((lat1 * Math.PI) / 180) *
                Math.cos((lat2 * Math.PI) / 180) *
                Math.sin(dLon / 2) *
                Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }
}

module.exports = UserOrderController;
