const { Op } = require('sequelize');
const { User, Wallet } = require('../models');

const parseAmount = value => Number.parseFloat(value || 0) || 0;

const SYSTEM_ACCOUNT = {
    student_id: 'SYSTEM0001',
    username: 'system_wallet',
    email: 'system-wallet@campus.local',
    password: 'system-wallet-unsafe-login-disabled',
    real_name: '系统账户',
};

class FinanceAccountService {
    static async ensurePlatformWallet(transaction) {
        let systemUser = await User.findOne({
            where: {
                [Op.or]: [{ student_id: SYSTEM_ACCOUNT.student_id }, { email: SYSTEM_ACCOUNT.email }],
            },
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
}

module.exports = FinanceAccountService;
