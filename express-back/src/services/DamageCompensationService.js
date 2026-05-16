const {
    DamageClaim,
    Deliverer,
    DelivererDebt,
    Transaction,
    User,
    Wallet,
} = require('@/models');
const FinanceAccountService = require('./FinanceAccountService');
const PickupSettlementService = require('./PickupSettlementService');

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number(parseAmount(value).toFixed(2));
const generateTransactionNo = () => `TX${Date.now()}${Math.random().toString().slice(2, 6)}`;
const calculateOrderAmount = order =>
    roundMoney(parseAmount(order?.price) + parseAmount(order?.tip));

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

        if (!['accepted', 'picking', 'delivering', 'completed'].includes(order.status)) {
            throw new Error('当前订单状态不支持损坏赔付处理');
        }

        if (!order.deliverer_id) {
            throw new Error('订单缺少配送员信息，无法执行赔付');
        }

        if (order.damage_claim_status === 'resolved') {
            throw new Error('订单损坏赔付已处理，不能重复发起');
        }

        const orderAmount = calculateOrderAmount(order);
        const refundedAmount = roundMoney(parseAmount(order.refund_amount));
        const refundAmount = roundMoney(Math.max(orderAmount - refundedAmount, 0));
        const claimAmount = roundMoney(amount);

        if (orderAmount <= 0) {
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
        let orderFrozenDeductAmount = 0;
        let refundResult = null;

        if (refundAmount > 0) {
            refundResult =
                order.status === 'completed'
                    ? await PickupSettlementService.processRefund(
                          order,
                          refundAmount,
                          reason || '赔付成立，订单金额全额退还',
                          transaction
                      )
                    : await PickupSettlementService.refundUncompletedOrder(
                          order,
                          reason || '赔付成立，订单金额全额退还',
                          transaction
                      );

            orderFrozenDeductAmount =
                refundResult?.mode === 'deduct_deliverer_frozen' ? roundMoney(refundAmount) : 0;
        }

        if (claimAmount > 0) {
            const publisherBalanceBefore = parseAmount(publisherWallet.balance);
            const publisherBalanceAfter = roundMoney(publisherBalanceBefore + claimAmount);

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
                    type: 'transfer_in',
                    amount: claimAmount,
                    direction: 'in',
                    balance_before: publisherBalanceBefore,
                    balance_after: publisherBalanceAfter,
                    status: 'success',
                    related_type: 'damage_claim',
                    related_id: order.id,
                    payment_method: 'balance',
                    description: `订单赔付到账：${order.title}`,
                    remark: reason || '客服确认订单损坏，支付赔付金额',
                    completed_at: now,
                },
                { transaction }
            );
        }

        const delivererAvailableBefore = parseAmount(delivererWallet.balance);
        const balanceDeductAmount = roundMoney(Math.min(delivererAvailableBefore, claimAmount));
        const delivererBalanceAfter = roundMoney(delivererAvailableBefore - balanceDeductAmount);
        const platformAdvanceAmount = roundMoney(Math.max(claimAmount - balanceDeductAmount, 0));
        const delivererDeductAmount = roundMoney(orderFrozenDeductAmount + balanceDeductAmount);

        if (balanceDeductAmount > 0) {
            await delivererWallet.update(
                {
                    balance: delivererBalanceAfter,
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
                    description: `订单赔付扣减可用余额：${order.title}`,
                    remark: reason || '从配送员可用余额中扣减赔付金额',
                    completed_at: now,
                    extra_data: {
                        deduction_source: 'available_balance',
                        compensation_only: true,
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
                    description: '平台回收配送员赔付款',
                    remark: `订单赔付回收，订单ID：${order.id}`,
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
                    description: '平台垫付订单赔付',
                    remark: `订单赔付垫付，订单ID：${order.id}`,
                    completed_at: now,
                    extra_data: {
                        expense_category: 'deliverer_compensation_advance',
                        order_id: order.id,
                        claim_amount: claimAmount,
                    },
                },
                { transaction }
            );
            platformBalance = roundMoney(platformBalance - platformAdvanceAmount);
        }

        await platformWallet.update(
            {
                balance: platformBalance,
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
                frozen_deduct_amount: orderFrozenDeductAmount,
                balance_deduct_amount: balanceDeductAmount,
                deliverer_deduct_amount: delivererDeductAmount,
                platform_advance_amount: platformAdvanceAmount,
                debt_amount: platformAdvanceAmount,
                status: 'settled',
                reason,
                processed_by: processedBy,
                processed_at: now,
                extra_data: {
                    order_status_before: order.status,
                    order_payment_status_before: order.payment_status,
                    order_settlement_status_before: order.settlement_status,
                    order_amount: orderAmount,
                    refunded_order_amount: refundAmount,
                    order_refund_frozen_deduct_amount: orderFrozenDeductAmount,
                    compensation_balance_deduct_amount: balanceDeductAmount,
                    compensation_platform_advance_amount: platformAdvanceAmount,
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
                    remark: reason || '订单赔付金额不足，平台先行垫付',
                },
                { transaction }
            );
        }

        await order.update(
            {
                compensation_amount: roundMoney(parseAmount(order.compensation_amount) + claimAmount),
                damage_claim_status: 'resolved',
                latest_damage_claim_id: claim.id,
                settled_at: now,
                settlement_note: [
                    order.settlement_note,
                    `损坏赔付已处理：订单退款${refundAmount.toFixed(2)}元，额外赔付${claimAmount.toFixed(
                        2
                    )}元，配送员冻结扣回${orderFrozenDeductAmount.toFixed(
                        2
                    )}元，配送员可用余额扣减${balanceDeductAmount.toFixed(
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
            frozen_deduct_amount: orderFrozenDeductAmount,
            balance_deduct_amount: balanceDeductAmount,
            platform_advance_amount: platformAdvanceAmount,
            remaining_frozen_amount: roundMoney(parseAmount(order.deliverer_frozen_amount)),
        };
    }
}

module.exports = DamageCompensationService;
