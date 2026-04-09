const {
    DamageClaim,
    Deliverer,
    DelivererDebt,
    Transaction,
    User,
    Wallet,
} = require('../models');
const FinanceAccountService = require('./FinanceAccountService');

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number(parseAmount(value).toFixed(2));
const generateTransactionNo = () => `TX${Date.now()}${Math.random().toString().slice(2, 6)}`;

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

class DamageCompensationService {
    static async processOrderDamageClaim(
        order,
        {
            amount,
            reason,
            ticketId = null,
            processedBy = null,
        },
        transaction
    ) {
        if (!order || !order.id) {
            throw new Error('订单不存在');
        }

        if (order.status !== 'completed') {
            throw new Error('仅支持对已完成订单发起损坏赔付处理');
        }

        if (!order.deliverer_id) {
            throw new Error('订单缺少配送员信息，无法执行赔付');
        }

        if (order.payment_status === 'refunded') {
            throw new Error('订单已退款，不能重复处理损坏赔付');
        }

        if (order.damage_claim_status === 'resolved' || parseAmount(order.refund_amount) > 0) {
            throw new Error('订单已存在已处理退款记录，不能重复发起损坏赔付');
        }

        const refundAmount = roundMoney(parseAmount(order.price) + parseAmount(order.tip));
        const claimAmount = roundMoney(amount);

        if (refundAmount <= 0) {
            throw new Error('订单金额异常，无法处理赔付');
        }

        if (claimAmount < 0) {
            throw new Error('额外赔付金额不能小于0');
        }

        const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
            order.user_id,
            transaction
        );

        const delivererProfile = await Deliverer.findByPk(order.deliverer_id, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!delivererProfile?.user_id) {
            throw new Error('配送员信息不存在，无法执行赔付');
        }

        const { user: delivererUser, wallet: delivererWallet } = await getLockedUserAndWallet(
            delivererProfile.user_id,
            transaction
        );
        const { user: platformUser, wallet: platformWallet } =
            await FinanceAccountService.ensurePlatformWallet(transaction);

        const now = new Date();
        const publisherBalanceBefore = parseAmount(publisherWallet.balance);
        const publisherBalanceAfter = roundMoney(publisherBalanceBefore + refundAmount + claimAmount);

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
                type: 'refund',
                amount: refundAmount,
                direction: 'in',
                balance_before: publisherBalanceBefore,
                balance_after: roundMoney(publisherBalanceBefore + refundAmount),
                status: 'success',
                related_type: 'pickup_order',
                related_id: order.id,
                payment_method: 'balance',
                description: `损坏赔付退款：${order.title}`,
                remark: reason || '客服确认订单损坏，退还订单金额',
                completed_at: now,
            },
            { transaction }
        );

        if (claimAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: publisher.id,
                    type: 'transfer_in',
                    amount: claimAmount,
                    direction: 'in',
                    balance_before: roundMoney(publisherBalanceBefore + refundAmount),
                    balance_after: publisherBalanceAfter,
                    status: 'success',
                    related_type: 'damage_claim',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `订单额外赔付到账：${order.title}`,
                    remark: reason || '客服确认订单损坏，追加赔付金额',
                    completed_at: now,
                },
                { transaction }
            );
        }

        const delivererFrozenBefore = parseAmount(delivererWallet.frozen_balance);
        const frozenDeductAmount = roundMoney(
            Math.min(
                parseAmount(order.deliverer_frozen_amount),
                delivererFrozenBefore,
                claimAmount
            )
        );
        const delivererAvailableBefore = parseAmount(delivererWallet.balance);
        const remainingAfterFrozen = roundMoney(claimAmount - frozenDeductAmount);
        const balanceDeductAmount = roundMoney(
            Math.min(delivererAvailableBefore, remainingAfterFrozen)
        );
        const delivererBalanceAfter = roundMoney(delivererAvailableBefore - balanceDeductAmount);
        const platformAdvanceAmount = roundMoney(
            Math.max(remainingAfterFrozen - balanceDeductAmount, 0)
        );
        const delivererDeductAmount = roundMoney(frozenDeductAmount + balanceDeductAmount);
        const delivererFrozenAfter = roundMoney(delivererFrozenBefore - frozenDeductAmount);
        const orderFrozenAfter = roundMoney(parseAmount(order.deliverer_frozen_amount) - frozenDeductAmount);

        if (frozenDeductAmount > 0 || balanceDeductAmount > 0) {
            await delivererWallet.update(
                {
                    balance: delivererBalanceAfter,
                    frozen_balance: delivererFrozenAfter,
                    last_transaction_at: now,
                },
                { transaction }
            );

            await delivererUser.update(
                {
                    balance: delivererBalanceAfter,
                },
                { transaction }
            );
        }

        if (frozenDeductAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: delivererUser.id,
                    type: 'penalty',
                    amount: frozenDeductAmount,
                    direction: 'out',
                    balance_before: delivererAvailableBefore,
                    balance_after: delivererAvailableBefore,
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `额外赔付扣减冻结收益：${order.title}`,
                    remark: reason || '从配送员冻结收益中扣减额外赔付',
                    completed_at: now,
                    extra_data: {
                        deduction_source: 'frozen_income',
                    },
                },
                { transaction }
            );
        }

        if (balanceDeductAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: delivererUser.id,
                    type: 'penalty',
                    amount: balanceDeductAmount,
                    direction: 'out',
                    balance_before: delivererAvailableBefore,
                    balance_after: delivererBalanceAfter,
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `额外赔付扣减可用余额：${order.title}`,
                    remark: reason || '从配送员可用余额中扣减额外赔付',
                    completed_at: now,
                    extra_data: {
                        deduction_source: 'available_balance',
                    },
                },
                { transaction }
            );
        }

        let platformBalance = parseAmount(platformWallet.balance);
        if (delivererDeductAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: platformUser.id,
                    type: 'transfer_in',
                    amount: delivererDeductAmount,
                    direction: 'in',
                    balance_before: platformBalance,
                    balance_after: roundMoney(platformBalance + delivererDeductAmount),
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: '平台回收配送员额外赔付款',
                    remark: `订单额外赔付回收，订单ID：${order.id}`,
                    completed_at: now,
                },
                { transaction }
            );
            platformBalance = roundMoney(platformBalance + delivererDeductAmount);
        }

        let debt = null;
        if (platformAdvanceAmount > 0) {
            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: platformUser.id,
                    type: 'transfer_out',
                    amount: platformAdvanceAmount,
                    direction: 'out',
                    balance_before: platformBalance,
                    balance_after: roundMoney(platformBalance - platformAdvanceAmount),
                    status: 'success',
                    related_type: 'pickup_order',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: '平台垫付订单额外赔付',
                    remark: `订单额外赔付垫付，订单ID：${order.id}`,
                    completed_at: now,
                },
                { transaction }
            );
            platformBalance = roundMoney(platformBalance - platformAdvanceAmount);
        }

        await platformWallet.update(
            {
                balance: platformBalance,
                total_income: roundMoney(
                    parseAmount(platformWallet.total_income) + delivererDeductAmount
                ),
                total_expense: roundMoney(
                    parseAmount(platformWallet.total_expense) + platformAdvanceAmount
                ),
                last_transaction_at: now,
            },
            { transaction }
        );

        await platformUser.update(
            {
                balance: platformBalance,
            },
            { transaction }
        );

        const claim = await DamageClaim.create(
            {
                order_id: order.id,
                ticket_id: ticketId,
                user_id: publisher.id,
                deliverer_id: delivererProfile.id,
                deliverer_user_id: delivererUser.id,
                claim_amount: claimAmount,
                refund_amount: refundAmount,
                frozen_deduct_amount: frozenDeductAmount,
                balance_deduct_amount: balanceDeductAmount,
                deliverer_deduct_amount: delivererDeductAmount,
                platform_advance_amount: platformAdvanceAmount,
                debt_amount: platformAdvanceAmount,
                status: 'settled',
                reason,
                processed_by: processedBy,
                processed_at: now,
                extra_data: {
                    order_settlement_status_before: order.settlement_status,
                    order_frozen_amount_before: parseAmount(order.deliverer_frozen_amount),
                    total_user_credit_amount: roundMoney(refundAmount + claimAmount),
                },
            },
            { transaction }
        );

        if (platformAdvanceAmount > 0) {
            debt = await DelivererDebt.create(
                {
                    user_id: delivererUser.id,
                    order_id: order.id,
                    claim_id: claim.id,
                    principal_amount: platformAdvanceAmount,
                    remaining_amount: platformAdvanceAmount,
                    status: 'active',
                    remark: reason || '订单额外赔付，平台先行垫付',
                },
                { transaction }
            );
        }

        await order.update(
            {
                payment_status: 'refunded',
                refund_amount: roundMoney(parseAmount(order.refund_amount) + refundAmount),
                compensation_amount: roundMoney(parseAmount(order.compensation_amount) + claimAmount),
                deliverer_frozen_amount: orderFrozenAfter,
                settlement_status: orderFrozenAfter <= 0 ? 'refunded' : 'partial_refunded',
                damage_claim_status: 'resolved',
                latest_damage_claim_id: claim.id,
                settled_at: now,
                settlement_note: [
                    order.settlement_note,
                    `损坏赔付已处理：退款${refundAmount.toFixed(2)}元，额外赔付${claimAmount.toFixed(2)}元，配送员承担${delivererDeductAmount.toFixed(
                        2
                    )}元，平台垫付${platformAdvanceAmount.toFixed(2)}元`,
                ]
                    .filter(Boolean)
                    .join('\n'),
            },
            { transaction }
        );

        return {
            claim_id: claim.id,
            debt_id: debt?.id || null,
            refund_amount: refundAmount,
            claim_amount: claimAmount,
            total_user_credit_amount: roundMoney(refundAmount + claimAmount),
            deliverer_deduct_amount: delivererDeductAmount,
            frozen_deduct_amount: frozenDeductAmount,
            balance_deduct_amount: balanceDeductAmount,
            platform_advance_amount: platformAdvanceAmount,
            remaining_frozen_amount: orderFrozenAfter,
        };
    }
}

module.exports = DamageCompensationService;
