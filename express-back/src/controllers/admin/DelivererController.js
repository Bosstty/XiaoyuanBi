const { Deliverer, User, PickupOrder } = require('../../models');
const { Op } = require('sequelize');

/**
 * 配送员管理控制器
 * Deliverer Management Controller
 */
class DelivererController {
    /**
     * 获取配送员列表
     * Get deliverers list with pagination and filters
     */
    static async getDeliverers(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                pageSize, // 兼容前端参数
                status,
                verified,
                keyword,
                name, // 兼容前端参数
                phone, // 兼容前端参数
                startDate,
                endDate,
            } = req.query;

            // 使用 pageSize 如果 limit 未提供
            const actualLimit = pageSize || limit;
            const offset = (page - 1) * actualLimit;
            const where = {};

            // 构建查询条件
            if (status) where.status = status;
            if (verified !== undefined && verified !== '') where.verified = verified === 'true';

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) where.createdAt[Op.lte] = new Date(endDate);
            }

            // 兼容 name, phone, keyword 参数
            const searchKeyword = keyword || name || phone;
            if (searchKeyword) {
                where[Op.or] = [
                    { real_name: { [Op.like]: `%${searchKeyword}%` } },
                    { phone: { [Op.like]: `%${searchKeyword}%` } },
                    { id_card: { [Op.like]: `%${searchKeyword}%` } },
                ];
            }

            const { count, rows: deliverers } = await Deliverer.findAndCountAll({
                where,
                limit: parseInt(actualLimit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'phone',
                            'student_id',
                        ],
                    },
                ],
                order: [['createdAt', 'DESC']],
            });

            return res.json({
                success: true,
                message: '获取配送员列表成功',
                data: {
                    deliverers,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(actualLimit),
                        totalPages: Math.ceil(count / actualLimit),
                    },
                },
            });
        } catch (error) {
            console.error('Get deliverers error:', error);
            return res.status(500).json({
                success: false,
                message: '获取配送员列表失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取配送员详情
     * Get deliverer detail by ID
     */
    static async getDelivererDetail(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '配送员ID不能为空',
                });
            }

            const deliverer = await Deliverer.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'phone',
                            'student_id',
                        ],
                    },
                    {
                        model: PickupOrder,
                        as: 'orders',
                        separate: true,
                        limit: 10,
                        order: [['createdAt', 'DESC']],
                        attributes: ['id', 'order_no', 'status', 'price', 'createdAt'],
                    },
                ],
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            // 获取配送员统计数据
            const stats = {
                totalOrders: await PickupOrder.count({ where: { deliverer_id: id } }),
                completedOrders: await PickupOrder.count({
                    where: { deliverer_id: id, status: 'completed' },
                }),
                cancelledOrders: await PickupOrder.count({
                    where: { deliverer_id: id, status: 'cancelled' },
                }),
                totalRevenue:
                    (await PickupOrder.sum('price', {
                        where: { deliverer_id: id, status: 'completed' },
                    })) || 0,
            };

            return res.json({
                success: true,
                message: '获取配送员详情成功',
                data: {
                    ...deliverer.toJSON(),
                    stats,
                },
            });
        } catch (error) {
            console.error('Get deliverer detail error:', error);
            return res.status(500).json({
                success: false,
                message: '获取配送员详情失败',
                error: error.message,
            });
        }
    }

    /**
     * 审核配送员申请
     * Verify deliverer application
     */
    static async verifyDeliverer(req, res) {
        try {
            const { id } = req.params;
            const { approved, reason, remark } = req.body;
            const adminUser = req.user;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '配送员ID不能为空',
                });
            }

            if (approved === undefined) {
                return res.status(400).json({
                    success: false,
                    message: '审核结果不能为空',
                });
            }

            const deliverer = await Deliverer.findByPk(id);

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            if (deliverer.verified) {
                return res.status(400).json({
                    success: false,
                    message: '该配送员已经审核过了',
                });
            }

            // 更新审核状态
            deliverer.verified = approved;
            deliverer.verifyReason = reason;
            deliverer.verifyRemark = remark;
            deliverer.verifiedAt = new Date();
            deliverer.verifiedBy = adminUser.id;

            if (approved) {
                deliverer.status = 'active';
            } else {
                deliverer.status = 'rejected';
            }

            await deliverer.save();

            // TODO: 发送通知给配送员

            return res.json({
                success: true,
                message: approved ? '配送员审核通过' : '配送员审核未通过',
                data: deliverer,
            });
        } catch (error) {
            console.error('Verify deliverer error:', error);
            return res.status(500).json({
                success: false,
                message: '审核配送员失败',
                error: error.message,
            });
        }
    }

    /**
     * 更新配送员状态
     * Update deliverer status
     */
    static async updateDelivererStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            const adminUser = req.user;

            if (!id || !status) {
                return res.status(400).json({
                    success: false,
                    message: '配送员ID和状态不能为空',
                });
            }

            const deliverer = await Deliverer.findByPk(id);

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            const allowedStatuses = ['active', 'inactive', 'suspended', 'banned'];
            if (!allowedStatuses.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: '无效的状态值',
                });
            }

            // 更新状态
            const oldStatus = deliverer.status;
            deliverer.status = status;
            deliverer.statusReason = reason;
            deliverer.statusUpdatedAt = new Date();
            deliverer.statusUpdatedBy = adminUser.id;

            if (status === 'suspended' || status === 'banned') {
                deliverer.suspendedAt = new Date();
                deliverer.suspendedBy = adminUser.id;
            }

            await deliverer.save();

            // TODO: 发送通知给配送员
            // TODO: 如果状态变为suspended/banned，需要处理该配送员的进行中订单

            return res.json({
                success: true,
                message: `配送员状态已从 ${oldStatus} 更新为 ${status}`,
                data: deliverer,
            });
        } catch (error) {
            console.error('Update deliverer status error:', error);
            return res.status(500).json({
                success: false,
                message: '更新配送员状态失败',
                error: error.message,
            });
        }
    }

    /**
     * 删除/封禁配送员
     * Delete/Ban deliverer (soft delete)
     */
    static async deleteDeliverer(req, res) {
        try {
            const { id } = req.params;
            const { reason, permanent } = req.body;
            const adminUser = req.user;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '配送员ID不能为空',
                });
            }

            if (!reason) {
                return res.status(400).json({
                    success: false,
                    message: '删除/封禁原因不能为空',
                });
            }

            const deliverer = await Deliverer.findByPk(id);

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员不存在',
                });
            }

            // 检查是否有进行中的订单
            const ongoingOrders = await PickupOrder.count({
                where: {
                    deliverer_id: id,
                    status: { [Op.in]: ['confirmed', 'processing'] },
                },
            });

            if (ongoingOrders > 0) {
                return res.status(400).json({
                    success: false,
                    message: `该配送员还有 ${ongoingOrders} 个进行中的订单，无法删除/封禁`,
                });
            }

            // 软删除或永久封禁
            if (permanent) {
                deliverer.status = 'suspended';
                deliverer.application_status = 'banned';
                deliverer.verified = false;
                deliverer.bannedAt = new Date();
                deliverer.bannedBy = adminUser.id;
            } else {
                deliverer.deletedAt = new Date();
                deliverer.deletedBy = adminUser.id;
                deliverer.isDeleted = true;
            }

            deliverer.deleteReason = reason;
            await deliverer.save();

            // TODO: 发送通知给配送员

            return res.json({
                success: true,
                message: permanent ? '配送员已永久封禁' : '配送员已删除',
                data: deliverer,
            });
        } catch (error) {
            console.error('Delete deliverer error:', error);
            return res.status(500).json({
                success: false,
                message: '删除/封禁配送员失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取配送员统计
     * Get deliverer statistics
     */
    static async getDelivererStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const where = { isDeleted: false };

            if (startDate || endDate) {
                where.createdAt = {};
                if (startDate) where.createdAt[Op.gte] = new Date(startDate);
                if (endDate) where.createdAt[Op.lte] = new Date(endDate);
            }

            // 状态统计
            const statusStats = await Deliverer.findAll({
                where,
                attributes: [
                    'status',
                    [Deliverer.sequelize.fn('COUNT', Deliverer.sequelize.col('id')), 'count'],
                ],
                group: ['status'],
            });

            // 认证统计
            const verifiedStats = await Deliverer.findAll({
                where,
                attributes: [
                    'verified',
                    [Deliverer.sequelize.fn('COUNT', Deliverer.sequelize.col('id')), 'count'],
                ],
                group: ['verified'],
            });

            // 总体统计
            const totalDeliverers = await Deliverer.count({ where });
            const activeDeliverers = await Deliverer.count({
                where: { ...where, status: 'active' },
            });
            const pendingVerification = await Deliverer.count({
                where: { ...where, verified: false, application_status: 'pending' },
            });

            // 今日新增
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayNew = await Deliverer.count({
                where: {
                    ...where,
                    createdAt: { [Op.gte]: today },
                },
            });

            // 评分分布
            const ratingDistribution = await Deliverer.findAll({
                where: { ...where, rating: { [Op.ne]: null } },
                attributes: [
                    [
                        Deliverer.sequelize.fn('FLOOR', Deliverer.sequelize.col('rating')),
                        'ratingRange',
                    ],
                    [Deliverer.sequelize.fn('COUNT', Deliverer.sequelize.col('id')), 'count'],
                ],
                group: ['ratingRange'],
            });

            // 平均评分
            const avgRating = await Deliverer.findOne({
                where: { ...where, rating: { [Op.ne]: null } },
                attributes: [
                    [Deliverer.sequelize.fn('AVG', Deliverer.sequelize.col('rating')), 'avgRating'],
                ],
            });

            return res.json({
                success: true,
                message: '获取配送员统计成功',
                data: {
                    statusStats,
                    verifiedStats,
                    ratingDistribution,
                    overview: {
                        totalDeliverers,
                        activeDeliverers,
                        pendingVerification,
                        todayNew,
                        avgRating: avgRating?.dataValues?.avgRating || 0,
                    },
                },
            });
        } catch (error) {
            console.error('Get deliverer stats error:', error);
            return res.status(500).json({
                success: false,
                message: '获取配送员统计失败',
                error: error.message,
            });
        }
    }
}

module.exports = DelivererController;
