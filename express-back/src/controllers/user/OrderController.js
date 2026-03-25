const { PickupOrder, User, Deliverer, Wallet, Transaction } = require('../../models');
const { orderUtils, responseUtils, paginationUtils, cryptoUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const SecurityService = require('../../services/SecurityService');

const parseAmount = value => Number.parseFloat(value || 0) || 0;

async function getLockedUserAndWallet(userId, transaction) {
    const user = await User.findByPk(userId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!user) {
        throw new Error('用户不存在');
    }

    let wallet = await Wallet.findOne({
        where: { user_id: user.id },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!wallet) {
        wallet = await Wallet.create(
            {
                user_id: user.id,
                balance: parseAmount(user.balance),
            },
            { transaction }
        );

        wallet = await Wallet.findOne({
            where: { user_id: user.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
    }

    return { user, wallet };
}

async function freezePickupFunds(userId, amount, paymentPassword, transaction) {
    const { user, wallet } = await getLockedUserAndWallet(userId, transaction);
    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);

    if (!wallet.payment_password_set || !wallet.payment_password) {
        throw new Error('请先设置支付密码');
    }

    if (!paymentPassword || !String(paymentPassword).trim()) {
        throw new Error('请输入支付密码');
    }

    const encryptedPassword = cryptoUtils.sha256(String(paymentPassword).trim());
    if (wallet.payment_password !== encryptedPassword) {
        throw new Error('支付密码错误');
    }

    if (availableBalance < amount) {
        throw new Error('余额不足，请先充值后再创建订单');
    }

    const nextAvailableBalance = availableBalance - amount;

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: frozenBalance + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await user.update(
        {
            balance: nextAvailableBalance,
        },
        { transaction }
    );
}

async function releasePickupFunds(order, transaction, remark = '订单取消，冻结金额已退回余额') {
    const amount = parseAmount(order.price) + parseAmount(order.tip);
    if (amount <= 0) {
        return;
    }

    const { user, wallet } = await getLockedUserAndWallet(order.user_id, transaction);
    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);

    if (frozenBalance < amount) {
        throw new Error('冻结金额不足，无法退回订单金额');
    }

    const nextAvailableBalance = availableBalance + amount;

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: frozenBalance - amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await user.update(
        {
            balance: nextAvailableBalance,
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
            user_id: user.id,
            type: 'refund',
            amount,
            direction: 'in',
            balance_before: availableBalance,
            balance_after: nextAvailableBalance,
            status: 'success',
            related_type: 'pickup_order',
            related_id: order.id,
            payment_method: 'balance',
            description: `订单退款返还：${order.title}`,
            remark,
            completed_at: new Date(),
        },
        { transaction }
    );
}

async function settlePickupPayment(order, transaction) {
    const amount = parseAmount(order.price) + parseAmount(order.tip);
    const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
        order.user_id,
        transaction
    );

    const publisherFrozenBalance = parseAmount(publisherWallet.frozen_balance);
    if (publisherFrozenBalance < amount) {
        throw new Error('冻结金额不足，无法完成订单结算');
    }

    await publisherWallet.update(
        {
            frozen_balance: publisherFrozenBalance - amount,
            total_expense: parseAmount(publisherWallet.total_expense) + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
            user_id: publisher.id,
            type: 'payment',
            amount,
            direction: 'out',
            balance_before: parseAmount(publisherWallet.balance),
            balance_after: parseAmount(publisherWallet.balance),
            status: 'success',
            related_type: 'pickup_order',
            related_id: order.id,
            payment_method: 'balance',
            description: `代取订单支出：${order.title}`,
            completed_at: new Date(),
        },
        { transaction }
    );

    if (!order.deliverer_id) {
        return;
    }

    const delivererProfile = await Deliverer.findByPk(order.deliverer_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!delivererProfile?.user_id) {
        throw new Error('配送员信息不存在，无法完成结算');
    }

    const { user: delivererUser, wallet: delivererWallet } = await getLockedUserAndWallet(
        delivererProfile.user_id,
        transaction
    );

    const delivererBalanceBefore = parseAmount(delivererWallet.balance);
    const delivererBalanceAfter = delivererBalanceBefore + amount;

    await delivererWallet.update(
        {
            balance: delivererBalanceAfter,
            total_income: parseAmount(delivererWallet.total_income) + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await delivererUser.update(
        {
            balance: delivererBalanceAfter,
            completed_orders: Number(delivererUser.completed_orders || 0) + 1,
        },
        { transaction }
    );

    await delivererProfile.update(
        {
            completed_orders: Number(delivererProfile.completed_orders || 0) + 1,
            total_earnings: parseAmount(delivererProfile.total_earnings) + amount,
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
            user_id: delivererUser.id,
            type: 'earn_pickup',
            amount,
            direction: 'in',
            balance_before: delivererBalanceBefore,
            balance_after: delivererBalanceAfter,
            status: 'success',
            related_type: 'pickup_order',
            related_id: order.id,
            payment_method: 'balance',
            description: `配送收入：${order.title}`,
            completed_at: new Date(),
        },
        { transaction }
    );
}

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
                payment_password,
            } = req.body;

            const minimumPriceMap = {
                express: 2,
                food: 3,
                medicine: 5,
                daily: 3,
            };

            const minimumPrice = minimumPriceMap[type];
            if (!minimumPrice) {
                return res.status(400).json(responseUtils.error('订单类型不正确'));
            }

            if (Number(price) < minimumPrice) {
                return res
                    .status(400)
                    .json(responseUtils.error(`该类型订单金额不能低于${minimumPrice}元`));
            }

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(userId, 'create_order', {
                amount: price,
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            const totalAmount = parseAmount(price) + parseAmount(tip);
            const dbTransaction = await PickupOrder.sequelize.transaction();

            let order;

            try {
                await freezePickupFunds(userId, totalAmount, payment_password, dbTransaction);

                const orderNo = orderUtils.generateOrderNo('PO');

                order = await PickupOrder.create(
                    {
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
                        pickup_code: type === 'express' ? pickup_code : null,
                        weight,
                        size,
                        price,
                        tip: tip || 0,
                        urgent: urgent || false,
                        fragile: fragile || false,
                        images,
                        notes,
                        status: 'pending',
                        payment_status: 'unpaid',
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

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

            res.json(
                responseUtils.success(fullOrder, `订单创建成功，已冻结 ¥${totalAmount.toFixed(2)}`)
            );
        } catch (error) {
            console.error('创建订单失败:', error);
            const knownErrors = ['请先设置支付密码', '请输入支付密码', '支付密码错误', '余额不足'];
            if (knownErrors.some(item => error.message?.includes(item))) {
                return res.status(400).json(responseUtils.error(error.message));
            }
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
                    {
                        model: Deliverer,
                        as: 'delivererInfo',
                        attributes: ['id', 'user_id', 'real_name', 'phone'],
                        required: false,
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                            },
                        ],
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
                    {
                        model: Deliverer,
                        as: 'delivererInfo',
                        attributes: ['id', 'user_id', 'real_name', 'phone'],
                        required: false,
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                            },
                        ],
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

            // 待接单订单可直接取消；已接单后必须先与配送员协商，由配送员侧发起取消
            if (order.status === 'accepted') {
                return res
                    .status(400)
                    .json(responseUtils.error('订单已被接单，请先联系配送员协商，待对方同意后再取消'));
            }

            if (order.status !== 'pending') {
                return res.status(400).json(responseUtils.error('当前订单状态不允许取消'));
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                await releasePickupFunds(order, dbTransaction);

                await order.update(
                    {
                        status: 'cancelled',
                        cancel_reason: reason,
                        cancel_time: new Date(),
                        payment_status: 'refunded',
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

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

            if (!order.delivery_photo) {
                return res.status(400).json(responseUtils.error('配送员尚未提交送达照片'));
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                await settlePickupPayment(order, dbTransaction);

                await order.update(
                    {
                        status: 'completed',
                        delivery_complete_time: new Date(),
                        payment_status: 'paid',
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            res.json(responseUtils.success(order, '订单确认完成，款项已结算给配送员'));
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
