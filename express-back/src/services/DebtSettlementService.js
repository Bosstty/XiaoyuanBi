const { Op } = require('sequelize');
const { DelivererDebt, DebtRepaymentRecord, Transaction, User, Wallet } = require('../models');
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

class DebtSettlementService {
    static async settleDelivererDebts(
        userId,
        transaction,
        { sourceTransactionId = null, remark = null } = {}
    ) {
        const debts = await DelivererDebt.findAll({
            where: {
                user_id: userId,
                status: {
                    [Op.in]: ['active', 'partial'],
                },
            },
            order: [
                ['created_at', 'ASC'],
                ['id', 'ASC'],
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!debts.length) {
            return {
                total_deducted: 0,
                settled_count: 0,
            };
        }

        const { user, wallet } = await getLockedUserAndWallet(userId, transaction);
        const { user: platformUser, wallet: platformWallet } =
            await FinanceAccountService.ensurePlatformWallet(transaction);

        let availableBalance = parseAmount(wallet.balance);
        let platformBalance = parseAmount(platformWallet.balance);
        let totalDeducted = 0;
        let settledCount = 0;
        const now = new Date();

        for (const debt of debts) {
            if (availableBalance <= 0) {
                break;
            }

            const debtRemaining = parseAmount(debt.remaining_amount);
            if (debtRemaining <= 0) {
                continue;
            }

            const deductAmount = roundMoney(Math.min(availableBalance, debtRemaining));
            const balanceBefore = availableBalance;
            const balanceAfter = roundMoney(balanceBefore - deductAmount);

            const deductTx = await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: user.id,
                    type: 'debt_deduct',
                    amount: deductAmount,
                    direction: 'out',
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    status: 'success',
                    related_type: 'deliverer_debt',
                    related_id: debt.id,
                    payment_method: 'balance',
                    description: '配送员欠款自动抵扣',
                    remark:
                        remark ||
                        `配送员收入到账后自动抵扣欠款，来源订单ID：${debt.order_id}`,
                    completed_at: now,
                },
                { transaction }
            );

            await Transaction.create(
                {
                    transaction_no: generateTransactionNo(),
                    user_id: platformUser.id,
                    type: 'transfer_in',
                    amount: deductAmount,
                    direction: 'in',
                    balance_before: platformBalance,
                    balance_after: roundMoney(platformBalance + deductAmount),
                    status: 'success',
                    related_type: 'deliverer_debt',
                    related_id: debt.id,
                    payment_method: 'balance',
                    description: '平台回收配送员欠款',
                    remark: `自动抵扣配送员欠款，欠款ID：${debt.id}`,
                    completed_at: now,
                },
                { transaction }
            );

            await DebtRepaymentRecord.create(
                {
                    debt_id: debt.id,
                    user_id: user.id,
                    source_transaction_id: sourceTransactionId,
                    deduction_transaction_id: deductTx.id,
                    deduct_amount: deductAmount,
                    balance_before: balanceBefore,
                    balance_after: balanceAfter,
                    remark: remark || '配送收益到账后自动抵扣历史欠款',
                },
                { transaction }
            );

            const nextRemaining = roundMoney(debtRemaining - deductAmount);
            await debt.update(
                {
                    remaining_amount: nextRemaining,
                    status: nextRemaining <= 0 ? 'cleared' : 'partial',
                    cleared_at: nextRemaining <= 0 ? now : null,
                },
                { transaction }
            );

            availableBalance = balanceAfter;
            platformBalance = roundMoney(platformBalance + deductAmount);
            totalDeducted = roundMoney(totalDeducted + deductAmount);
            settledCount += nextRemaining <= 0 ? 1 : 0;
        }

        await wallet.update(
            {
                balance: availableBalance,
                last_transaction_at: totalDeducted > 0 ? now : wallet.last_transaction_at,
            },
            { transaction }
        );

        await user.update(
            {
                balance: availableBalance,
            },
            { transaction }
        );

        await platformWallet.update(
            {
                balance: platformBalance,
                last_transaction_at: totalDeducted > 0 ? now : platformWallet.last_transaction_at,
            },
            { transaction }
        );

        await platformUser.update(
            {
                balance: platformBalance,
            },
            { transaction }
        );

        return {
            total_deducted: totalDeducted,
            settled_count: settledCount,
        };
    }
}

module.exports = DebtSettlementService;
