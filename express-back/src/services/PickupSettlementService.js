const { Op } = require('sequelize');
const { PickupOrder, User, Deliverer, Wallet, Transaction, SystemSetting } = require('../models');
const DebtSettlementService = require('./DebtSettlementService');
const FinanceAccountService = require('./FinanceAccountService');
const PointsService = require('./PointsService');

const HOLD_DURATION_MS = 48 * 60 * 60 * 1000;
const ACTIVE_HOLD_STATUSES = ['holding', 'partial_refunded', 'partial_compensated'];

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number((parseAmount(value)).toFixed(2));
const generateTransactionNo = () => `TX${Date.now()}${Math.random().toString().slice(2, 6)}`;

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

async function getLockedDelivererStake(order, transaction) {
    const delivererProfile = await Deliverer.findByPk(order.deliverer_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    if (!delivererProfile?.user_id) {
        throw new Error('配送员信息不存在，无法处理订单结算');
    }

    const { user, wallet } = await getLockedUserAndWallet(delivererProfile.user_id, transaction);
    return { delivererProfile, delivererUser: user, delivererWallet: wallet };
}

function calculateOrderAmount(order) {
    return roundMoney(parseAmount(order.price) + parseAmount(order.tip));
}

function deriveSettlementStatus(order) {
    const settlementAmount = parseAmount(order.settlement_amount);
    const remainingFrozen = parseAmount(order.deliverer_frozen_amount);
    const refundAmount = parseAmount(order.refund_amount);
    const compensationAmount = parseAmount(order.compensation_amount);

    if (remainingFrozen <= 0) {
        if (refundAmount >= settlementAmount && compensationAmount <= 0) return 'refunded';
        if (compensationAmount >= settlementAmount && refundAmount <= 0) return 'compensated';
        if (compensationAmount > 0) return 'partial_compensated';
        if (refundAmount > 0) return 'partial_refunded';
        return 'settled';
    }

    if (compensationAmount > 0) return 'partial_compensated';
    if (refundAmount > 0) return 'partial_refunded';
    return 'holding';
}

function appendSettlementNote(currentNote, extraNote) {
    const trimmed = String(extraNote || '').trim();
    if (!trimmed) return currentNote || null;
    return currentNote ? `${currentNote}\n${trimmed}` : trimmed;
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

async function upsertPendingEarnTransaction(
    order,
    delivererUser,
    delivererWallet,
    transaction,
    {
        amount,
        status = 'pending',
        description,
        remark = null,
        commissionRate = null,
        commissionAmount = null,
        completedAt = null,
        extraData = null,
        balanceBefore = parseAmount(delivererWallet.balance),
        balanceAfter =
            status === 'success'
                ? roundMoney(parseAmount(delivererWallet.balance))
                : parseAmount(delivererWallet.balance),
    }
) {
    let earnTx = await Transaction.findOne({
        where: {
            user_id: delivererUser.id,
            type: 'earn_pickup',
            related_type: 'pickup_order',
            related_id: order.id,
            status: { [Op.in]: ['pending', 'success', 'cancelled'] },
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
    });

    const payload = {
        amount: roundMoney(amount),
        direction: 'in',
        balance_before: balanceBefore,
        balance_after: balanceAfter,
        status,
        payment_method: 'balance',
        commission_rate: commissionRate,
        commission_amount: commissionAmount,
        description,
        remark,
        extra_data: extraData,
        completed_at: completedAt,
    };

    if (!earnTx) {
        earnTx = await Transaction.create(
            {
                transaction_no: generateTransactionNo(),
                user_id: delivererUser.id,
                type: 'earn_pickup',
                related_type: 'pickup_order',
                related_id: order.id,
                ...payload,
            },
            { transaction }
        );
        return earnTx;
    }

    await earnTx.update(payload, { transaction });
    return earnTx;
}

function assertHoldingOrder(order) {
    if (order.status !== 'completed') {
        throw new Error('只有已完成订单才能处理担保结算');
    }

    if (!ACTIVE_HOLD_STATUSES.includes(order.settlement_status)) {
        throw new Error('当前订单不在担保期内，无法处理该操作');
    }

    if (!order.settlement_hold_until) {
        throw new Error('订单未设置担保截止时间');
    }
}

class PickupSettlementService {
    static async refundUncompletedOrder(order, reason, transaction) {
        if (order.status === 'completed') {
            throw new Error('已完成订单请走担保期退款流程');
        }

        const refundAmount = roundMoney(order.cash_paid_amount || calculateOrderAmount(order));
        if (refundAmount <= 0 && !Number(order.points_used || 0)) {
            throw new Error('订单金额异常，无法退款');
        }

        const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
            order.user_id,
            transaction
        );

        const publisherBalanceBefore = parseAmount(publisherWallet.balance);
        const publisherFrozenBefore = parseAmount(publisherWallet.frozen_balance);

        if (publisherFrozenBefore < refundAmount) {
            throw new Error('用户冻结金额不足，无法退回订单金额');
        }

        const publisherBalanceAfter = roundMoney(publisherBalanceBefore + refundAmount);
        const publisherFrozenAfter = roundMoney(publisherFrozenBefore - refundAmount);

        await publisherWallet.update(
            {
                balance: publisherBalanceAfter,
                frozen_balance: publisherFrozenAfter,
                last_transaction_at: new Date(),
            },
            { transaction }
        );

        await publisher.update(
            {
                balance: publisherBalanceAfter,
            },
            { transaction }
        );

        if (refundAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: publisher.id,
                    type: 'refund',
                    amount: refundAmount,
                    direction: 'in',
                    balance_before: publisherBalanceBefore,
                    balance_after: publisherBalanceAfter,
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `订单退款返还：${order.title}`,
                    remark: reason || '客服同意退款，订单未完成直接解冻',
                    completed_at: new Date(),
                },
                { transaction }
            );
        }

        const pointsToReturn = Math.max(
            0,
            Number(order.points_used || 0) - Number(order.returned_points || 0)
        );
        await PointsService.addPoints(publisher, publisherWallet, pointsToReturn, transaction);

        await order.update(
            {
                status: 'cancelled',
                payment_status: 'refunded',
                cancel_reason: reason || '客服同意退款',
                cancel_time: new Date(),
                settlement_status: 'refunded',
                settlement_amount: calculateOrderAmount(order),
                deliverer_frozen_amount: 0,
                refund_amount: calculateOrderAmount(order),
                refunded_cash_amount: roundMoney(order.cash_paid_amount || refundAmount),
                returned_points: Number(order.points_used || 0),
                settled_at: new Date(),
                settlement_note: appendSettlementNote(
                    order.settlement_note,
                    `订单未完成，客服退款并解冻现金${refundAmount.toFixed(2)}元，返还积分${pointsToReturn}：${reason || '客服同意退款'}`
                ),
            },
            { transaction }
        );

        return {
            refund_amount: refundAmount,
            returned_points: pointsToReturn,
            mode: 'release_user_frozen',
        };
    }

    static async holdOrderSettlement(order, transaction, completedAt = new Date()) {
        const amount = calculateOrderAmount(order);
        const cashPaidAmount = roundMoney(order.cash_paid_amount || amount);
        const subsidyAmount = roundMoney(order.platform_subsidy_amount || 0);
        const holdUntil = new Date(completedAt.getTime() + HOLD_DURATION_MS);
        const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
            order.user_id,
            transaction
        );

        const publisherFrozenBalance = parseAmount(publisherWallet.frozen_balance);
        if (publisherFrozenBalance < cashPaidAmount) {
            throw new Error('冻结金额不足，无法进入担保结算');
        }

        await publisherWallet.update(
            {
                frozen_balance: roundMoney(publisherFrozenBalance - cashPaidAmount),
                total_expense: roundMoney(parseAmount(publisherWallet.total_expense) + cashPaidAmount),
                last_transaction_at: completedAt,
            },
            { transaction }
        );

        if (cashPaidAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: publisher.id,
                    type: 'payment',
                    amount: cashPaidAmount,
                    direction: 'out',
                    balance_before: parseAmount(publisherWallet.balance),
                    balance_after: parseAmount(publisherWallet.balance),
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `代取订单支出：${order.title}`,
                    completed_at: completedAt,
                },
                { transaction }
            );
        }

        const rewardPoints = await awardPaymentPoints(
            publisher,
            publisherWallet,
            cashPaidAmount,
            transaction
        );

        await FinanceAccountService.recordPlatformExpense(transaction, {
            amount: subsidyAmount,
            relatedType: 'pickup_order',
            relatedId: order.id,
            paymentMethod: 'balance',
            description: '积分抵扣平台补贴支出',
            remark: `订单 ${order.order_no || order.id} 积分抵扣补贴`,
            completedAt,
            extraData: {
                expense_category: 'points_subsidy',
                order_id: order.id,
                points_used: Number(order.points_used || 0),
                subsidy_amount: subsidyAmount,
            },
        });

        if (order.deliverer_id) {
            const { delivererProfile, delivererUser, delivererWallet } =
                await getLockedDelivererStake(order, transaction);

            await delivererWallet.update(
                {
                    frozen_balance: roundMoney(parseAmount(delivererWallet.frozen_balance) + amount),
                    last_transaction_at: completedAt,
                },
                { transaction }
            );

            await delivererUser.update(
                {
                    completed_orders: Number(delivererUser.completed_orders || 0) + 1,
                },
                { transaction }
            );

            await delivererProfile.update(
                {
                    completed_orders: Number(delivererProfile.completed_orders || 0) + 1,
                },
                { transaction }
            );

            await upsertPendingEarnTransaction(order, delivererUser, delivererWallet, transaction, {
                amount,
                status: 'pending',
                description: `配送收入担保中：${order.title}`,
                remark: '订单已完成，收益进入48小时担保期冻结',
                extraData: {
                    settlement_mode: 'holding',
                    settlement_amount: amount,
                    settlement_hold_until: holdUntil.toISOString(),
                },
            });
        }

        await order.update(
            {
                status: 'completed',
                payment_status: 'paid',
                delivery_complete_time: completedAt,
                settlement_status: 'holding',
                settlement_amount: amount,
                deliverer_frozen_amount: amount,
                settlement_started_at: completedAt,
                settlement_hold_until: holdUntil,
                settled_at: null,
                platform_commission_rate: null,
                platform_commission_amount: 0,
                platform_commission_settled_at: null,
                reward_points: rewardPoints,
                reward_points_granted: rewardPoints > 0,
                settlement_note: appendSettlementNote(
                    order.settlement_note,
                    `订单进入48小时担保期：${completedAt.toISOString()}`
                ),
            },
            { transaction }
        );

        return order;
    }

    static async processRefund(order, amount, reason, transaction) {
        assertHoldingOrder(order);

        const now = new Date();
        if (new Date(order.settlement_hold_until).getTime() <= now.getTime()) {
            throw new Error('订单担保期已结束，请先执行订单结算');
        }

        const refundAmount = roundMoney(amount);
        if (refundAmount <= 0) {
            throw new Error('退款金额必须大于0');
        }

        const remainingFrozen = parseAmount(order.deliverer_frozen_amount);
        if (refundAmount > remainingFrozen) {
            throw new Error('退款金额超过当前可退的冻结金额');
        }

        const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
            order.user_id,
            transaction
        );
        const { delivererUser, delivererWallet } = await getLockedDelivererStake(order, transaction);

        await delivererWallet.update(
            {
                frozen_balance: roundMoney(parseAmount(delivererWallet.frozen_balance) - refundAmount),
                last_transaction_at: now,
            },
            { transaction }
        );

        const refundSnapshot = PointsService.calculateRefundSnapshot(order, refundAmount);
        const cashRefundAmount = refundSnapshot.cash_refund_delta;
        const subsidyRecoveryAmount = roundMoney(refundAmount - cashRefundAmount);

        const publisherBalanceBefore = parseAmount(publisherWallet.balance);
        const publisherBalanceAfter = roundMoney(publisherBalanceBefore + cashRefundAmount);

        await publisherWallet.update(
            {
                balance: publisherBalanceAfter,
                last_transaction_at: now,
            },
            { transaction }
        );

        await publisher.update(
            {
                balance: publisherBalanceAfter,
            },
            { transaction }
        );

        if (cashRefundAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: publisher.id,
                    type: 'refund',
                    amount: cashRefundAmount,
                    direction: 'in',
                    balance_before: publisherBalanceBefore,
                    balance_after: publisherBalanceAfter,
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `订单退款返还：${order.title}`,
                    remark: reason || '客服处理订单退款',
                    completed_at: now,
                },
                { transaction }
            );
        }

        const netPointDelta =
            Number(refundSnapshot.points_return_delta || 0) -
            Number(refundSnapshot.reward_revert_delta || 0);
        if (netPointDelta !== 0) {
            await Promise.all([
                publisher.update(
                    {
                        points: Number(publisher.points || 0) + netPointDelta,
                    },
                    { transaction }
                ),
                publisherWallet.update(
                    {
                        points: Number(publisherWallet.points || 0) + netPointDelta,
                    },
                    { transaction }
                ),
            ]);
        }

        await FinanceAccountService.recordPlatformIncome(transaction, {
            amount: subsidyRecoveryAmount,
            relatedType: 'pickup_order',
            relatedId: order.id,
            paymentMethod: 'balance',
            description: '积分抵扣平台补贴回收',
            remark: `订单 ${order.order_no || order.id} 退款回收平台补贴`,
            completedAt: now,
            extraData: {
                order_id: order.id,
                subsidy_recovery_amount: subsidyRecoveryAmount,
            },
        });

        const nextFrozen = roundMoney(remainingFrozen - refundAmount);
        const nextRefundAmount = roundMoney(parseAmount(order.refund_amount) + refundAmount);

        await order.update(
            {
                deliverer_frozen_amount: nextFrozen,
                refund_amount: nextRefundAmount,
                refunded_cash_amount: refundSnapshot.target_cash_refund,
                returned_points: refundSnapshot.target_returned_points,
                reverted_reward_points: refundSnapshot.target_reverted_reward_points,
                payment_status: nextFrozen <= 0 ? 'refunded' : order.payment_status,
                settlement_status: deriveSettlementStatus({
                    ...order.toJSON(),
                    deliverer_frozen_amount: nextFrozen,
                    refund_amount: nextRefundAmount,
                }),
                settled_at: nextFrozen <= 0 ? now : order.settled_at,
                settlement_note: appendSettlementNote(
                    order.settlement_note,
                    `退款${refundAmount.toFixed(2)}元：${reason || '客服处理'}`
                ),
            },
            { transaction }
        );

        await upsertPendingEarnTransaction(order, delivererUser, delivererWallet, transaction, {
            amount: nextFrozen,
            status: nextFrozen > 0 ? 'pending' : 'cancelled',
            description: nextFrozen > 0 ? `配送收入担保中：${order.title}` : `配送收入已取消：${order.title}`,
            remark:
                nextFrozen > 0
                    ? '担保期内发生退款，剩余金额继续冻结'
                    : '订单冻结收益已全部退款，待结算收益取消',
            extraData: {
                settlement_mode: 'holding',
                refund_amount: nextRefundAmount,
                remaining_frozen_amount: nextFrozen,
            },
        });

        return {
            refund_amount: refundAmount,
            remaining_frozen_amount: nextFrozen,
            mode: 'deduct_deliverer_frozen',
        };
    }

    static async processCompensation(order, amount, reason, transaction) {
        assertHoldingOrder(order);

        const now = new Date();
        if (new Date(order.settlement_hold_until).getTime() <= now.getTime()) {
            throw new Error('订单担保期已结束，请先执行订单结算');
        }

        const requestedAmount = roundMoney(amount);
        if (requestedAmount <= 0) {
            throw new Error('补偿金额必须大于0');
        }

        const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
            order.user_id,
            transaction
        );
        const systemCompensationAmount = requestedAmount;
        const offlineCompensationAmount = 0;

        const publisherBalanceBefore = parseAmount(publisherWallet.balance);
        const publisherBalanceAfter = roundMoney(publisherBalanceBefore + systemCompensationAmount);

        await publisherWallet.update(
            {
                balance: publisherBalanceAfter,
                last_transaction_at: now,
            },
            { transaction }
        );

        await publisher.update(
            {
                balance: publisherBalanceAfter,
            },
            { transaction }
        );

        await Transaction.create(
            {
                transaction_no: generateTransactionNo(),
                user_id: publisher.id,
                type: 'bonus',
                amount: systemCompensationAmount,
                direction: 'in',
                balance_before: publisherBalanceBefore,
                balance_after: publisherBalanceAfter,
                status: 'success',
                related_type: 'pickup_order',
                related_id: order.id,
                payment_method: 'balance',
                description: `平台补偿入账：${order.title}`,
                remark: reason || '客服处理投诉赔偿',
                completed_at: now,
                extra_data: {
                    compensation_category: 'platform_compensation',
                },
            },
            { transaction }
        );

        await FinanceAccountService.recordPlatformExpense(transaction, {
            amount: systemCompensationAmount,
            relatedType: 'pickup_order',
            relatedId: order.id,
            paymentMethod: 'balance',
            description: '平台投诉赔偿支出',
            remark: reason || `订单 ${order.order_no || order.id} 投诉赔偿`,
            completedAt: now,
            extraData: {
                expense_category: 'platform_compensation',
                order_id: order.id,
                compensation_amount: systemCompensationAmount,
            },
        });

        const nextFrozen = roundMoney(parseAmount(order.deliverer_frozen_amount));
        const nextCompensationAmount = roundMoney(
            parseAmount(order.compensation_amount) + systemCompensationAmount
        );
        const nextOfflineCompensationAmount = roundMoney(parseAmount(order.offline_compensation_amount));

        await order.update(
            {
                compensation_amount: nextCompensationAmount,
                offline_compensation_amount: nextOfflineCompensationAmount,
                settlement_status: deriveSettlementStatus({
                    ...order.toJSON(),
                    deliverer_frozen_amount: parseAmount(order.deliverer_frozen_amount),
                    compensation_amount: nextCompensationAmount,
                }),
                settled_at: order.settled_at || now,
                settlement_note: appendSettlementNote(
                    order.settlement_note,
                    `平台补偿${requestedAmount.toFixed(2)}元：${reason || '客服处理'}`
                ),
            },
            { transaction }
        );

        return {
            requested_amount: requestedAmount,
            processed_amount: systemCompensationAmount,
            offline_amount: offlineCompensationAmount,
            remaining_frozen_amount: nextFrozen,
        };
    }

    static async settleHeldOrder(order, transaction, settledAt = new Date()) {
        if (!ACTIVE_HOLD_STATUSES.includes(order.settlement_status)) {
            throw new Error('当前订单不在待结算状态');
        }

        const remainingFrozen = parseAmount(order.deliverer_frozen_amount);
        if (remainingFrozen <= 0) {
            await order.update(
                {
                    settlement_status: deriveSettlementStatus(order),
                    settled_at: settledAt,
                    platform_commission_rate: 0,
                    platform_commission_amount: 0,
                    platform_commission_settled_at: settledAt,
                },
                { transaction }
            );
            return { payout_amount: 0, commission_amount: 0 };
        }

        const commissionRate = await getPlatformCommissionRate(transaction);
        const commissionAmount = roundMoney(remainingFrozen * commissionRate);
        const payoutAmount = roundMoney(Math.max(remainingFrozen - commissionAmount, 0));
        const { delivererProfile, delivererUser, delivererWallet } = await getLockedDelivererStake(
            order,
            transaction
        );

        const delivererBalanceBefore = parseAmount(delivererWallet.balance);
        const delivererBalanceAfter = roundMoney(delivererBalanceBefore + payoutAmount);

        await delivererWallet.update(
            {
                balance: delivererBalanceAfter,
                frozen_balance: roundMoney(parseAmount(delivererWallet.frozen_balance) - remainingFrozen),
                total_income: roundMoney(parseAmount(delivererWallet.total_income) + payoutAmount),
                last_transaction_at: settledAt,
            },
            { transaction }
        );

        await delivererUser.update(
            {
                balance: delivererBalanceAfter,
            },
            { transaction }
        );

        await delivererProfile.update(
            {
                total_earnings: roundMoney(parseAmount(delivererProfile.total_earnings) + payoutAmount),
            },
            { transaction }
        );

        await upsertPendingEarnTransaction(order, delivererUser, delivererWallet, transaction, {
            amount: payoutAmount,
            status: 'success',
            description: `配送收入结算：${order.title}`,
            remark: '担保期结束，收益已结算至可用余额',
            commissionRate,
            commissionAmount,
            completedAt: settledAt,
            balanceBefore: delivererBalanceBefore,
            balanceAfter: delivererBalanceAfter,
            extraData: {
                settlement_mode: 'released',
                gross_amount: remainingFrozen,
                net_payout_amount: payoutAmount,
                commission_amount: commissionAmount,
            },
        });

        const settledEarnTx = await Transaction.findOne({
            where: {
                user_id: delivererUser.id,
                type: 'earn_pickup',
                related_type: 'pickup_order',
                related_id: order.id,
                status: 'success',
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        await FinanceAccountService.recordPlatformIncome(transaction, {
            amount: commissionAmount,
            relatedType: 'pickup_order',
            relatedId: order.id,
            paymentMethod: 'balance',
            description: '订单担保结算平台抽成收入',
            remark: `订单 ${order.order_no || order.id} 担保解冻结算抽成`,
            commissionRate,
            commissionAmount,
            completedAt: settledAt,
            extraData: {
                order_id: order.id,
                settlement_mode: 'released',
                gross_amount: remainingFrozen,
                net_payout_amount: payoutAmount,
            },
        });

        await DebtSettlementService.settleDelivererDebts(delivererUser.id, transaction, {
            sourceTransactionId: settledEarnTx?.id || null,
            remark: `订单收益结算后自动抵扣欠款，订单ID：${order.id}`,
        });

        await order.update(
            {
                settlement_status: 'settled',
                deliverer_frozen_amount: 0,
                settled_at: settledAt,
                platform_commission_rate: commissionRate,
                platform_commission_amount: commissionAmount,
                platform_commission_settled_at: settledAt,
                settlement_note: appendSettlementNote(
                    order.settlement_note,
                    `担保期结束自动结算，实际结算${payoutAmount.toFixed(2)}元，平台抽成${commissionAmount.toFixed(2)}元`
                ),
            },
            { transaction }
        );

        return {
            payout_amount: payoutAmount,
            commission_amount: commissionAmount,
        };
    }

    static async settleDueOrders(limit = 100) {
        const orders = await PickupOrder.findAll({
            where: {
                settlement_status: { [Op.in]: ACTIVE_HOLD_STATUSES },
                settlement_hold_until: { [Op.lte]: new Date() },
            },
            order: [['settlement_hold_until', 'ASC']],
            limit,
        });

        const results = [];

        for (const order of orders) {
            const transaction = await PickupOrder.sequelize.transaction();
            try {
                const lockedOrder = await PickupOrder.findByPk(order.id, {
                    transaction,
                    lock: transaction.LOCK.UPDATE,
                });

                const result = await PickupSettlementService.settleHeldOrder(
                    lockedOrder,
                    transaction,
                    new Date()
                );
                await transaction.commit();
                results.push({ order_id: order.id, success: true, ...result });
            } catch (error) {
                await transaction.rollback();
                results.push({ order_id: order.id, success: false, error: error.message });
            }
        }

        return {
            total: results.length,
            success: results.filter(item => item.success).length,
            failed: results.filter(item => !item.success).length,
            results,
        };
    }
}

module.exports = PickupSettlementService;
