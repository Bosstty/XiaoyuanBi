const {
    PickupOrder,
    PickupOrderItem,
    ServiceTicket,
    Task,
    User,
    Deliverer,
    Wallet,
    Transaction,
    SystemSetting,
} = require('@/models');
const { orderUtils, responseUtils, paginationUtils, cryptoUtils, requestUtils } = require('@/utils');
const { Op } = require('sequelize');
const { sequelize } = require('@/config/database');
const SecurityService = require('@/services/SecurityService');
const FinanceAccountService = require('@/services/FinanceAccountService');
const PickupSettlementService = require('@/services/PickupSettlementService');
const PointsService = require('@/services/PointsService');
const ContentModerationService = require('@/services/ContentModerationService');

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number(parseAmount(value).toFixed(2));
const roundRating = value => Number(Number(value || 0).toFixed(2));

function buildPickupOrderModerationPayload(payload = {}, expressItems = []) {
    const expressItemTexts = Array.isArray(expressItems)
        ? expressItems.map(item =>
              [item.pickup_code, item.phone_tail, item.size]
                  .filter(value => value !== null && value !== undefined && String(value).trim())
                  .join(' ')
          )
        : [];

    return {
        title: payload.title,
        description: payload.description,
        requirements: payload.notes,
        location: [payload.pickup_location, payload.delivery_location].filter(Boolean).join(' '),
        tags: expressItemTexts,
    };
}

async function findActiveDamageTicket(orderId, transaction) {
    return ServiceTicket.findOne({
        where: {
            order_id: orderId,
            status: { [Op.in]: ['pending', 'processing'] },
            type: { [Op.in]: ['refund', 'dispute'] },
        },
        order: [['created_at', 'DESC']],
        transaction,
        lock: transaction?.LOCK?.UPDATE,
    });
}

async function getPlatformCommissionRate(transaction) {
    const setting = await SystemSetting.findOne({
        transaction,
        lock: transaction?.LOCK?.SHARE,
    });
    const rawRate = parseAmount(setting?.platform_fee_rate);

    if (rawRate <= 0) {
        return 0;
    }

    return rawRate > 1 ? rawRate / 100 : rawRate;
}

async function calculateSettlementBreakdown(grossAmount, transaction) {
    const amount = roundMoney(grossAmount);
    const commissionRate = await getPlatformCommissionRate(transaction);
    const commissionAmount = roundMoney(amount * commissionRate);
    const payoutAmount = roundMoney(Math.max(amount - commissionAmount, 0));

    return {
        amount,
        commissionRate,
        commissionAmount,
        payoutAmount,
    };
}
const normalizeImageList = value => {
    if (!value) return null;

    const source =
        typeof value === 'string'
            ? (() => {
                  try {
                      return JSON.parse(value);
                  } catch (_error) {
                      return [value];
                  }
              })()
            : value;

    if (!Array.isArray(source)) {
        return null;
    }

    const cleaned = source
        .map(item => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean);

    return cleaned.length ? cleaned : null;
};

const normalizeExpressItemsInput = value => {
    if (!value) return [];

    const source =
        typeof value === 'string'
            ? (() => {
                  try {
                      return JSON.parse(value);
                  } catch (_error) {
                      return [];
                  }
              })()
            : value;

    if (!Array.isArray(source)) {
        return [];
    }

    return source
        .map((item, index) => ({
            item_index: index + 1,
            pickup_code:
                typeof item?.pickup_code === 'string' ? item.pickup_code.trim() : undefined,
            phone_tail:
                typeof item?.phone_tail === 'string' ? item.phone_tail.trim() : undefined,
            weight:
                item?.weight === null || item?.weight === undefined || item?.weight === ''
                    ? null
                    : Number.parseFloat(item.weight),
            size: typeof item?.size === 'string' ? item.size.trim() : undefined,
        }))
        .filter(
            item =>
                item.pickup_code ||
                item.phone_tail ||
                item.weight !== null ||
                item.size
        )
        .map(item => ({
            ...item,
            weight: Number.isFinite(item.weight) ? item.weight : null,
        }));
};

const buildLegacyExpressItems = order => {
    if (order.type !== 'express') return [];
    if (Array.isArray(order.items) && order.items.length > 0) {
        return order.items;
    }
    if (!order.pickup_code && !order.contact_phone && !order.weight && !order.size) {
        return [];
    }
    return [
        {
            id: null,
            order_id: order.id,
            item_index: 1,
            pickup_code: order.pickup_code || '',
            phone_tail: order.contact_phone || '',
            weight: order.weight ?? null,
            size: order.size || '',
        },
    ];
};

const serializePickupOrder = order => {
    const raw = typeof order?.toJSON === 'function' ? order.toJSON() : order;
    if (!raw) return raw;

    if (raw.type === 'express') {
        raw.items = buildLegacyExpressItems(raw);
    } else {
        raw.items = [];
    }

    return raw;
};

const pickupOrderInclude = [
    {
        model: PickupOrderItem,
        as: 'items',
        attributes: ['id', 'order_id', 'item_index', 'pickup_code', 'phone_tail', 'weight', 'size'],
        required: false,
    },
];

async function syncUserCompositeRating(userId, transaction) {
    const [taskStats, orderStats] = await Promise.all([
        Task.findOne({
            where: {
                assignee_id: userId,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
            ],
            transaction,
            raw: true,
        }),
        PickupOrder.findOne({
            where: {
                deliverer_id: userId,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
            ],
            transaction,
            raw: true,
        }),
    ]);

    const taskCount = Number(taskStats?.reviewCount || 0);
    const orderCount = Number(orderStats?.reviewCount || 0);
    const totalCount = taskCount + orderCount;
    const overallRating =
        totalCount > 0
            ? roundRating(
                  (Number(taskStats?.avgRating || 0) * taskCount +
                      Number(orderStats?.avgRating || 0) * orderCount) /
                      totalCount
              )
            : 5;

    await User.update({ rating: overallRating }, { where: { id: userId }, transaction });
}

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

async function awardPaymentPoints(user, wallet, amount, transaction) {
    const earnedPoints = PointsService.calculateRewardPoints(amount);
    if (earnedPoints <= 0) {
        return 0;
    }

    await Promise.all([
        user.update(
            {
                points: Number(user.points || 0) + earnedPoints,
            },
            { transaction }
        ),
        wallet.update(
            {
                points: Number(wallet.points || 0) + earnedPoints,
            },
            { transaction }
        ),
    ]);

    return earnedPoints;
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

async function freezePickupFundsWithPoints(
    userId,
    totalAmount,
    paymentPassword,
    requestedPoints,
    transaction
) {
    const { user, wallet } = await getLockedUserAndWallet(userId, transaction);
    const breakdown = PointsService.calculateDeduction(
        requestedPoints,
        totalAmount,
        Number(user.points || 0)
    );

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

    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);
    if (availableBalance < breakdown.cash_paid_amount) {
        throw new Error('余额不足，请先充值后再创建订单');
    }

    await PointsService.deductPoints(user, wallet, breakdown.points_used, transaction);

    const nextAvailableBalance = roundMoney(availableBalance - breakdown.cash_paid_amount);

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: roundMoney(frozenBalance + breakdown.cash_paid_amount),
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

    return breakdown;
}

async function releasePickupFunds(order, transaction, remark = '订单取消，冻结金额已退回余额') {
    const amount = roundMoney(
        order.cash_paid_amount || parseAmount(order.price) + parseAmount(order.tip)
    );
    const returnedPoints = Math.max(
        0,
        Number(order.points_used || 0) - Number(order.returned_points || 0)
    );

    if (amount <= 0 && returnedPoints <= 0) {
        return { refunded_cash_amount: 0, returned_points: 0 };
    }

    const { user, wallet } = await getLockedUserAndWallet(order.user_id, transaction);
    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);

    if (frozenBalance < amount) {
        throw new Error('冻结金额不足，无法退回订单金额');
    }

    const nextAvailableBalance = roundMoney(availableBalance + amount);

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: roundMoney(frozenBalance - amount),
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

    if (amount > 0) {
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

    await PointsService.addPoints(user, wallet, returnedPoints, transaction);

    return {
        refunded_cash_amount: amount,
        returned_points: returnedPoints,
    };
}

function calculateOrderPriceUpdateBreakdown(order, nextPrice) {
    const currentGrossAmount = roundMoney(parseAmount(order.price) + parseAmount(order.tip));
    const nextGrossAmount = roundMoney(parseAmount(nextPrice) + parseAmount(order.tip));
    const currentCashPaidAmount = roundMoney(order.cash_paid_amount || currentGrossAmount);
    const currentPointsUsed = Math.max(0, Math.floor(Number(order.points_used || 0)));
    const currentPointsRequest = currentPointsUsed - (currentPointsUsed % 100);
    const nextPricePointsCap = Math.max(0, Math.floor(nextGrossAmount) * 100);
    const nextPointsRequest = Math.min(currentPointsRequest, nextPricePointsCap);
    const nextBreakdown = PointsService.calculateDeduction(
        nextPointsRequest,
        nextGrossAmount,
        currentPointsRequest
    );

    return {
        current_cash_paid_amount: currentCashPaidAmount,
        current_points_used: currentPointsUsed,
        next_breakdown: nextBreakdown,
        cash_delta: roundMoney(nextBreakdown.cash_paid_amount - currentCashPaidAmount),
        points_delta: nextBreakdown.points_used - currentPointsUsed,
    };
}

async function applyOrderPriceUpdate(order, nextPrice, paymentPassword, transaction) {
    const { user, wallet } = await getLockedUserAndWallet(order.user_id, transaction);

    if (!wallet.payment_password_set || !wallet.payment_password) {
        throw new Error('请先设置支付密码');
    }

    if (!/^\d{6}$/.test(String(paymentPassword || ''))) {
        throw new Error('请输入 6 位支付密码');
    }

    const encryptedPassword = cryptoUtils.sha256(String(paymentPassword));
    if (wallet.payment_password !== encryptedPassword) {
        throw new Error('支付密码错误');
    }

    const breakdown = calculateOrderPriceUpdateBreakdown(order, nextPrice);
    const availableBalance = roundMoney(wallet.balance);
    const frozenBalance = roundMoney(wallet.frozen_balance);

    if (breakdown.cash_delta > 0) {
        if (availableBalance < breakdown.cash_delta) {
            throw new Error('余额不足，请先充值后再增加订单金额');
        }

        const nextAvailableBalance = roundMoney(availableBalance - breakdown.cash_delta);
        const nextFrozenBalance = roundMoney(frozenBalance + breakdown.cash_delta);

        await wallet.update(
            {
                balance: nextAvailableBalance,
                frozen_balance: nextFrozenBalance,
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
    } else if (breakdown.cash_delta < 0) {
        const refundAmount = roundMoney(Math.abs(breakdown.cash_delta));
        if (frozenBalance < refundAmount) {
            throw new Error('冻结金额不足，无法完成订单金额下调');
        }

        const nextAvailableBalance = roundMoney(availableBalance + refundAmount);
        const nextFrozenBalance = roundMoney(frozenBalance - refundAmount);

        await wallet.update(
            {
                balance: nextAvailableBalance,
                frozen_balance: nextFrozenBalance,
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

    if (breakdown.points_delta > 0) {
        await PointsService.deductPoints(user, wallet, breakdown.points_delta, transaction);
    } else if (breakdown.points_delta < 0) {
        await PointsService.addPoints(user, wallet, Math.abs(breakdown.points_delta), transaction);
    }

    await order.update(
        {
            price: roundMoney(nextPrice),
            original_amount: breakdown.next_breakdown.original_amount,
            cash_paid_amount: breakdown.next_breakdown.cash_paid_amount,
            points_discount_amount: breakdown.next_breakdown.points_discount_amount,
            platform_subsidy_amount: breakdown.next_breakdown.platform_subsidy_amount,
            points_used: breakdown.next_breakdown.points_used,
        },
        { transaction }
    );
}

async function settlePickupPayment(order, transaction) {
    const { amount, commissionRate, commissionAmount, payoutAmount } =
        await calculateSettlementBreakdown(
            parseAmount(order.price) + parseAmount(order.tip),
            transaction
        );
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

    await awardPaymentPoints(publisher, publisherWallet, amount, transaction);

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
    const delivererBalanceAfter = roundMoney(delivererBalanceBefore + payoutAmount);

    await delivererWallet.update(
        {
            balance: delivererBalanceAfter,
            total_income: roundMoney(parseAmount(delivererWallet.total_income) + payoutAmount),
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
            total_earnings: roundMoney(parseAmount(delivererProfile.total_earnings) + payoutAmount),
        },
        { transaction }
    );

    await order.update(
        {
            platform_commission_rate: commissionRate,
            platform_commission_amount: commissionAmount,
            platform_commission_settled_at: new Date(),
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
            user_id: delivererUser.id,
            type: 'earn_pickup',
            amount: payoutAmount,
            direction: 'in',
            balance_before: delivererBalanceBefore,
            balance_after: delivererBalanceAfter,
            status: 'success',
            related_type: 'pickup_order',
            related_id: order.id,
            payment_method: 'balance',
            description: `配送收入：${order.title}`,
            commission_rate: commissionRate,
            commission_amount: commissionAmount,
            remark: commissionAmount
                ? `订单总额${amount.toFixed(2)}元，平台抽成${commissionAmount.toFixed(2)}元，实际到账${payoutAmount.toFixed(2)}元`
                : null,
            extra_data: {
                gross_amount: amount,
                commission_amount: commissionAmount,
                net_payout_amount: payoutAmount,
            },
            completed_at: new Date(),
        },
        { transaction }
    );

    await FinanceAccountService.recordPlatformIncome(transaction, {
        amount: commissionAmount,
        relatedType: 'pickup_order',
        relatedId: order.id,
        paymentMethod: 'balance',
        description: '订单平台抽成收入',
        remark: `订单 ${order.order_no || order.id} 结算抽成`,
        commissionRate,
        commissionAmount,
        completedAt: new Date(),
        extraData: {
            order_id: order.id,
            gross_amount: amount,
            net_payout_amount: payoutAmount,
        },
    });
}

class UserOrderController {
    // 创建代取订单
    static async createOrder(req, res) {
        try {
            const userId = req.user.id;
            const clientIp = requestUtils.getClientIp(req);
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
                points_used = 0,
            } = req.body;

            const minimumPriceMap = {
                express: 3,
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
                ip: clientIp,
                userAgent: req.get('User-Agent'),
            });

            const totalAmount = parseAmount(price) + parseAmount(tip);
            const expressItems = normalizeExpressItemsInput(req.body.items);
            const moderationResult = await ContentModerationService.review(
                buildPickupOrderModerationPayload(req.body, expressItems),
                {
                    label: '订单内容',
                    scene: 'content',
                }
            );

            if (moderationResult.action === 'reject' || moderationResult.action === 'review') {
                return res
                    .status(400)
                    .json(
                        responseUtils.error(
                            ContentModerationService.buildUserFacingMessage(moderationResult, {
                                label: '订单内容',
                            })
                        )
                    );
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();

            let order;

            try {
                const paymentBreakdown = await freezePickupFundsWithPoints(
                    userId,
                    totalAmount,
                    payment_password,
                    points_used,
                    dbTransaction
                );

                const orderNo = orderUtils.generateOrderNo('PO');
                const primaryExpressItem =
                    expressItems[0] ||
                    (type === 'express'
                        ? {
                              pickup_code: typeof pickup_code === 'string' ? pickup_code.trim() : null,
                              weight:
                                  weight === null || weight === undefined || weight === ''
                                      ? null
                                      : Number.parseFloat(weight),
                              size: typeof size === 'string' ? size.trim() : null,
                          }
                        : null);

                if (type === 'express' && !expressItems.length && !primaryExpressItem?.pickup_code) {
                    throw new Error('请至少填写一件快递信息');
                }

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
                        pickup_code: type === 'express' ? primaryExpressItem?.pickup_code || null : null,
                        weight: type === 'express' ? primaryExpressItem?.weight ?? null : weight,
                        size: type === 'express' ? primaryExpressItem?.size || null : size,
                        price,
                        tip: tip || 0,
                        original_amount: paymentBreakdown.original_amount,
                        cash_paid_amount: paymentBreakdown.cash_paid_amount,
                        points_discount_amount: paymentBreakdown.points_discount_amount,
                        platform_subsidy_amount: paymentBreakdown.platform_subsidy_amount,
                        points_used: paymentBreakdown.points_used,
                        urgent: urgent || false,
                        fragile: fragile || false,
                        images,
                        notes,
                        status: 'pending',
                        payment_status: 'unpaid',
                    },
                    { transaction: dbTransaction }
                );

                if (type === 'express' && expressItems.length > 0) {
                    await PickupOrderItem.bulkCreate(
                        expressItems.map(item => ({
                            order_id: order.id,
                            item_index: item.item_index,
                            pickup_code: item.pickup_code || null,
                            phone_tail: item.phone_tail || null,
                            weight: item.weight,
                            size: item.size || null,
                        })),
                        { transaction: dbTransaction }
                    );
                }

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            // 获取完整的订单信息（包含用户信息）
            const fullOrder = await PickupOrder.findByPk(order.id, {
                include: [
                    ...pickupOrderInclude,
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'avatar', 'rating'],
                    },
                ],
            });

            res.json(
                responseUtils.success(
                    serializePickupOrder(fullOrder),
                    `订单创建成功，已冻结 ¥${totalAmount.toFixed(2)}`
                )
            );
        } catch (error) {
            console.error('创建订单失败:', error);
            const knownErrors = [
                '请先设置支付密码',
                '请输入支付密码',
                '支付密码错误',
                '余额不足',
                '请至少填写一件快递信息',
            ];
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
                    ...pickupOrderInclude,
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
                distinct: true,
            });

            const pagination = paginationUtils.formatPaginatedResponse(
                rows.map(serializePickupOrder),
                page,
                limit,
                count
            );

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
                    ...pickupOrderInclude,
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

            res.json(responseUtils.success(serializePickupOrder(order), '获取订单详情成功'));
        } catch (error) {
            console.error('获取订单详情失败:', error);
            res.status(500).json(responseUtils.error('获取订单详情失败'));
        }
    }

    // 修改订单金额
    static async updateOrder(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const payloadKeys = Object.keys(req.body || {}).filter(
                key => req.body[key] !== undefined
            );
            const { price, payment_password } = req.body || {};

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限修改此订单'));
            }

            const allowedKeys = ['price', 'payment_password'];
            const hasOnlyAllowedKeys =
                payloadKeys.length > 0 && payloadKeys.every(key => allowedKeys.includes(key));

            if (!(hasOnlyAllowedKeys && payloadKeys.includes('price'))) {
                return res
                    .status(400)
                    .json(responseUtils.error('当前仅支持修改订单金额，不能修改订单内容'));
            }

            if (!['pending', 'accepted', 'picking'].includes(order.status)) {
                return res.status(400).json(responseUtils.error('当前订单状态不允许修改金额'));
            }

            if (order.payment_status !== 'unpaid') {
                return res.status(400).json(responseUtils.error('当前订单支付状态不允许修改金额'));
            }

            const nextPrice = parseAmount(price);
            const currentPrice = parseAmount(order.price);

            if (!nextPrice || nextPrice <= 0) {
                return res.status(400).json(responseUtils.error('订单金额必须大于0'));
            }

            if (nextPrice < currentPrice) {
                return res.status(400).json(responseUtils.error('订单金额只能增加，不能减少'));
            }

            if (nextPrice === currentPrice) {
                const sameOrder = await PickupOrder.findByPk(id, {
                    include: [
                        ...pickupOrderInclude,
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
                return res.json(responseUtils.success(serializePickupOrder(sameOrder), '订单金额未变化'));
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();
            try {
                await applyOrderPriceUpdate(order, nextPrice, payment_password, dbTransaction);
                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            const updatedOrder = await PickupOrder.findByPk(id, {
                include: [
                    ...pickupOrderInclude,
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

            return res.json(responseUtils.success(serializePickupOrder(updatedOrder), '订单金额更新成功'));
        } catch (error) {
            console.error('更新订单失败:', error);
            const errorMessage = error.message || '更新订单失败';
            const isBusinessError = [
                '余额不足',
                '当前订单状态不允许修改金额',
                '当前订单支付状态不允许修改金额',
                '请先设置支付密码',
                '请输入支付密码',
                '支付密码错误',
                '订单金额只能增加，不能减少',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '更新订单失败'));
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
                    .json(
                        responseUtils.error('订单已被接单，请先联系配送员协商，待对方同意后再取消')
                    );
            }

            if (order.status !== 'pending') {
                return res.status(400).json(responseUtils.error('当前订单状态不允许取消'));
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                const refundResult = await releasePickupFunds(order, dbTransaction);

                await order.update(
                    {
                        status: 'cancelled',
                        cancel_reason: reason,
                        cancel_time: new Date(),
                        payment_status: 'refunded',
                        refund_amount: roundMoney(
                            parseAmount(order.refund_amount || 0) +
                                parseAmount(order.price) +
                                parseAmount(order.tip)
                        ),
                        refunded_cash_amount: roundMoney(refundResult.refunded_cash_amount),
                        returned_points: Number(refundResult.returned_points || 0),
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

            const activeDamageTicket = await findActiveDamageTicket(order.id);
            if (order.damage_claim_status === 'processing' || activeDamageTicket) {
                return res
                    .status(400)
                    .json(responseUtils.error('该订单正在赔付处理中，请联系客服'));
            }

            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                await PickupSettlementService.holdOrderSettlement(order, dbTransaction, new Date());

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            res.json(responseUtils.success(order, '订单确认完成，款项已进入48小时担保期'));
        } catch (error) {
            console.error('确认订单完成失败:', error);
            res.status(500).json(responseUtils.error('确认订单完成失败'));
        }
    }

    // 评价订单
    static async rateOrder(req, res) {
        try {
            const { id } = req.params;
            const { rating, comment, images } = req.body;
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
                images: normalizeImageList(images),
            });

            // 更新配送员综合评分（订单 + 任务）
            if (order.deliverer_id) {
                await syncUserCompositeRating(order.deliverer_id);
            }

            res.json(responseUtils.success(order, '评价成功'));
        } catch (error) {
            console.error('评价订单失败:', error);
            res.status(500).json(responseUtils.error('评价订单失败'));
        }
    }

    // 创建订单工单
    static async createServiceTicket(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { description, type = 'complaint', priority = 'high' } = req.body || {};

            const order = await PickupOrder.findByPk(id);

            if (!order) {
                return res.status(404).json(responseUtils.error('订单不存在'));
            }

            if (order.user_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限为此订单创建工单'));
            }

            const normalizedDescription = String(description || '').trim();
            if (!normalizedDescription) {
                return res.status(400).json(responseUtils.error('请填写需要客服介入的问题描述'));
            }

            const normalizedType = ['complaint', 'refund', 'dispute', 'suggestion', 'other'].includes(type)
                ? type
                : 'complaint';
            const normalizedPriority = ['low', 'medium', 'high', 'urgent'].includes(priority)
                ? priority
                : 'high';
            const typeTitleMap = {
                complaint: '订单投诉',
                refund: '订单退款',
                dispute: '订单损坏赔付',
                suggestion: '订单建议',
                other: '订单其他问题',
            };

            const ticket = await ServiceTicket.create({
                ticket_no: `ST${Date.now()}${Math.random().toString().slice(2, 6)}`,
                type: normalizedType,
                order_id: order.id,
                user_id: userId,
                deliverer_id: order.deliverer_id || null,
                title: `${typeTitleMap[normalizedType] || '订单客服介入'}：${order.title}`,
                description: normalizedDescription,
                priority: normalizedPriority,
                status: 'pending',
                service_id: null,
            });

            if (normalizedType === 'dispute') {
                await order.update({
                    damage_claim_status: 'processing',
                });
            }

            return res.json(responseUtils.success(ticket, '工单已创建，请等待客服介入处理'));
        } catch (error) {
            console.error('创建订单工单失败:', error);
            return res.status(500).json(responseUtils.error('创建订单工单失败'));
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

            const dbTransaction = await PickupOrder.sequelize.transaction();

            try {
                const lockedOrder = await PickupOrder.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!lockedOrder) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('订单不存在'));
                }

                const activeTicket = await findActiveDamageTicket(lockedOrder.id, dbTransaction);
                if (lockedOrder.damage_claim_status === 'processing' || activeTicket) {
                    if (activeTicket && activeTicket.type === 'refund') {
                        await activeTicket.update(
                            {
                                type: 'dispute',
                                title: `订单损坏赔付：${lockedOrder.title}`,
                                description: [
                                    activeTicket.description,
                                    reason ? `用户追加说明：${String(reason).trim()}` : null,
                                ]
                                    .filter(Boolean)
                                    .join('\n'),
                                priority:
                                    activeTicket.priority === 'urgent' ? 'urgent' : 'high',
                            },
                            { transaction: dbTransaction }
                        );
                    }

                    await lockedOrder.update(
                        {
                            damage_claim_status: 'processing',
                        },
                        { transaction: dbTransaction }
                    );

                    await dbTransaction.commit();
                    return res.json(
                        responseUtils.success(
                            {
                                ticket_id: activeTicket?.id || null,
                                ticket_type:
                                    activeTicket?.type === 'refund' ? 'dispute' : activeTicket?.type || null,
                            },
                            '已存在进行中的赔付工单，本次退款申请已并入赔付处理'
                        )
                    );
                }

                await dbTransaction.rollback();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            // 普通退款仍沿用原状态限制
            if (!['completed', 'cancelled'].includes(order.status)) {
                return res.status(400).json(responseUtils.error('该订单不支持退款'));
            }

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
            const { Deliverer } = require('@/models');

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
