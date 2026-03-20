const { PickupOrder, Wallet, Transaction, User } = require('../../models');
const { Op } = require('sequelize');

class ServiceOrderController {
    // 获取售后订单列表
    async getAfterSalesOrders(req, res) {
        try {
            const { status, payment_status, page = 1, limit = 10 } = req.query;
            const where = {};

            // 订单状态筛选（已完成/已取消/退款后的订单可申请售后）
            if (status) {
                where.status = status;
            } else {
                // 默认获取已完成和已取消的订单（这些可以申请售后）
                where.status = {
                    [Op.in]: ['completed', 'cancelled'],
                };
            }

            // 支付状态筛选
            if (payment_status) {
                where.payment_status = payment_status;
            }

            const { count, rows } = await PickupOrder.findAndCountAll({
                where,
                include: [{ model: User, as: 'user', attributes: ['id', 'username', 'phone'] }],
                order: [['updated_at', 'DESC']],
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
                    total_pages: Math.ceil(count / limit),
                },
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取售后订单列表失败',
                error: error.message,
            });
        }
    }

    // 获取订单详情
    async getOrderDetail(req, res) {
        try {
            const order = await PickupOrder.findByPk(req.params.id, {
                include: [{ model: User, as: 'user', attributes: ['id', 'username', 'phone'] }],
            });

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            res.json({
                success: true,
                data: order,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取订单详情失败',
                error: error.message,
            });
        }
    }

    // 处理订单状态
    async handleOrderStatus(req, res) {
        try {
            const { status, reason } = req.body;
            const order = await PickupOrder.findByPk(req.params.id);

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: '订单不存在',
                });
            }

            order.status = status;
            order.service_remark = reason;
            await order.save();

            res.json({
                success: true,
                message: '订单状态更新成功',
                data: order,
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '处理订单失败',
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

module.exports = new ServiceOrderController();
