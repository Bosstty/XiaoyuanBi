const { Deliverer, PickupOrder, Transaction } = require('../../models');
const { Op } = require('sequelize');

class DelivererEarningsController {
    // 获取收入统计
    static async getEarnings(req, res) {
        try {
            const userId = req.user.id;
            const { startDate, endDate, period = 'all' } = req.query;

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            // 构建时间过滤条件
            let where = {
                deliverer_id: deliverer.id,
                status: 'completed',
            };

            if (startDate && endDate) {
                where.completed_at = {
                    [Op.between]: [new Date(startDate), new Date(endDate)],
                };
            } else if (period === 'today') {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                where.completed_at = { [Op.gte]: today };
            } else if (period === 'week') {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                where.completed_at = { [Op.gte]: weekAgo };
            } else if (period === 'month') {
                const monthAgo = new Date();
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                where.completed_at = { [Op.gte]: monthAgo };
            }

            // 计算总收入
            const orders = await PickupOrder.findAll({
                where,
                attributes: ['price', 'tip', 'completed_at'],
            });

            const totalEarnings = orders.reduce((sum, order) => sum + order.price + (order.tip || 0), 0);
            const orderCount = orders.length;

            res.json({
                success: true,
                data: {
                    total_earnings: totalEarnings,
                    order_count: orderCount,
                    average_per_order: orderCount > 0 ? totalEarnings / orderCount : 0,
                    orders,
                },
            });
        } catch (error) {
            console.error('获取配送员收入统计失败:', error);
            res.status(500).json({
                success: false,
                message: '获取配送员收入统计失败',
                error: error.message,
            });
        }
    }

    // 获取收入详情（按天/周/月）
    static async getEarningsDetail(req, res) {
        try {
            const userId = req.user.id;
            const { groupBy = 'day' } = req.query; // day, week, month

            const deliverer = await Deliverer.findOne({
                where: { user_id: userId },
            });

            if (!deliverer) {
                return res.status(404).json({
                    success: false,
                    message: '配送员信息不存在',
                });
            }

            // TODO: 实现按时间分组的收入统计
            res.json({
                success: true,
                message: '收入详情功能开发中',
                data: {},
            });
        } catch (error) {
            console.error('获取收入详情失败:', error);
            res.status(500).json({
                success: false,
                message: '获取收入详情失败',
                error: error.message,
            });
        }
    }
}

module.exports = DelivererEarningsController;
