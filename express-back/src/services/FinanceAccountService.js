const { Op } = require('sequelize');
const { User, Wallet, Transaction } = require('@/models');

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const roundMoney = value => Number(parseAmount(value).toFixed(2));
const generateTransactionNo = prefix =>
    `${prefix}${Date.now()}${Math.random().toString().slice(2, 6)}`;

const SYSTEM_ACCOUNT = {
    student_id: 'SYSTEM0001',
    username: 'system_wallet',
    email: 'system-wallet@campus.local',
    password: 'system-wallet-unsafe-login-disabled',
    real_name: '系统账户',
};

class FinanceAccountService {
    static getSystemAccountWhere() {
        return {
            [Op.or]: [{ student_id: SYSTEM_ACCOUNT.student_id }, { email: SYSTEM_ACCOUNT.email }],
        };
    }

    static async ensurePlatformWallet(transaction) {
        let systemUser = await User.findOne({
            where: FinanceAccountService.getSystemAccountWhere(),
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });

        if (!systemUser) {
            systemUser = await User.create(
                {
                    ...SYSTEM_ACCOUNT,
                    phone: null,
                    gender: 'other',
                    college: '系统',
                    major: '平台服务',
                    status: 'active',
                    email_verified: true,
                    phone_verified: false,
                    student_verified: false,
                },
                { transaction }
            );
        }

        let wallet = await Wallet.findOne({
            where: { user_id: systemUser.id },
            transaction,
            lock: transaction?.LOCK?.UPDATE,
        });

        if (!wallet) {
            wallet = await Wallet.create(
                {
                    user_id: systemUser.id,
                    balance: 0,
                    points: 0,
                    status: 'active',
                },
                { transaction }
            );

            wallet = await Wallet.findOne({
                where: { user_id: systemUser.id },
                transaction,
                lock: transaction?.LOCK?.UPDATE,
            });
        }

        if (parseAmount(systemUser.balance) !== parseAmount(wallet.balance)) {
            await systemUser.update(
                {
                    balance: parseAmount(wallet.balance),
                },
                { transaction }
            );
        }

        return { user: systemUser, wallet };
    }

    static async recordPlatformIncome(
        transaction,
        {
            amount,
            relatedType,
            relatedId = null,
            paymentMethod = 'balance',
            description,
            remark = null,
            commissionRate = null,
            commissionAmount = null,
            extraData = null,
            thirdPartyNo = null,
            completedAt = new Date(),
            transactionType = 'transfer_in',
        }
    ) {
        const normalizedAmount = roundMoney(amount);
        if (normalizedAmount <= 0) {
            return null;
        }

        const { user: platformUser, wallet: platformWallet } =
            await FinanceAccountService.ensurePlatformWallet(transaction);

        const balanceBefore = parseAmount(platformWallet.balance);
        const balanceAfter = roundMoney(balanceBefore + normalizedAmount);

        await platformWallet.update(
            {
                balance: balanceAfter,
                total_income: roundMoney(parseAmount(platformWallet.total_income) + normalizedAmount),
                last_transaction_at: completedAt,
            },
            { transaction }
        );

        await platformUser.update(
            {
                balance: balanceAfter,
            },
            { transaction }
        );

        return Transaction.create(
            {
                transaction_no: generateTransactionNo('PF'),
                user_id: platformUser.id,
                type: transactionType,
                amount: normalizedAmount,
                direction: 'in',
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'success',
                related_type: relatedType,
                related_id: relatedId,
                third_party_no: thirdPartyNo,
                payment_method: paymentMethod,
                commission_rate: commissionRate,
                commission_amount: commissionAmount,
                description,
                remark,
                completed_at: completedAt,
                extra_data: extraData,
            },
            { transaction }
        );
    }

    static async recordPlatformExpense(
        transaction,
        {
            amount,
            relatedType,
            relatedId = null,
            paymentMethod = 'balance',
            description,
            remark = null,
            extraData = null,
            completedAt = new Date(),
            transactionType = 'transfer_out',
        }
    ) {
        const normalizedAmount = roundMoney(amount);
        if (normalizedAmount <= 0) {
            return null;
        }

        const { user: platformUser, wallet: platformWallet } =
            await FinanceAccountService.ensurePlatformWallet(transaction);

        const balanceBefore = parseAmount(platformWallet.balance);
        const balanceAfter = roundMoney(balanceBefore - normalizedAmount);

        await platformWallet.update(
            {
                balance: balanceAfter,
                total_expense: roundMoney(parseAmount(platformWallet.total_expense) + normalizedAmount),
                last_transaction_at: completedAt,
            },
            { transaction }
        );

        await platformUser.update(
            {
                balance: balanceAfter,
            },
            { transaction }
        );

        return Transaction.create(
            {
                transaction_no: generateTransactionNo('PE'),
                user_id: platformUser.id,
                type: transactionType,
                amount: normalizedAmount,
                direction: 'out',
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'success',
                related_type: relatedType,
                related_id: relatedId,
                payment_method: paymentMethod,
                description,
                remark,
                completed_at: completedAt,
                extra_data: extraData,
            },
            { transaction }
        );
    }
}

module.exports = FinanceAccountService;
