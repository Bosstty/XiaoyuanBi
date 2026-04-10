const { Op } = require('sequelize');
const {
    sequelize,
    DelivererDebt,
    DebtRepaymentRecord,
    Transaction,
    User,
    PickupOrder,
    DamageClaim,
    Wallet,
} = require('../../models');
const FinanceAccountService = require('../../services/FinanceAccountService');

const parseAmount = value => Number.parseFloat(value || 0) || 0;

class FinanceController {
    static async getDelivererDebts(req, res) {
        try {
            const { page = 1, limit = 10, status, keyword, userId } = req.query;
            const where = {};
            const userWhere = {};
            const orderWhere = {};

            if (status) {
                where.status = status;
            }

            if (userId) {
                where.user_id = Number(userId);
            }

            if (keyword) {
                userWhere[Op.or] = [
                    { username: { [Op.like]: `%${keyword}%` } },
                    { real_name: { [Op.like]: `%${keyword}%` } },
                    { phone: { [Op.like]: `%${keyword}%` } },
                ];
                orderWhere[Op.or] = [
                    { order_no: { [Op.like]: `%${keyword}%` } },
                    { title: { [Op.like]: `%${keyword}%` } },
                ];
                where[Op.or] = [{ remark: { [Op.like]: `%${keyword}%` } }];
            }

            const offset = (Number(page) - 1) * Number(limit);
            const { count, rows } = await DelivererDebt.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'phone', 'avatar'],
                        where: Object.keys(userWhere).length ? userWhere : undefined,
                        required: Boolean(Object.keys(userWhere).length),
                    },
                    {
                        model: PickupOrder,
                        as: 'order',
                        attributes: ['id', 'order_no', 'title', 'status', 'created_at'],
                        where: Object.keys(orderWhere).length ? orderWhere : undefined,
                        required: Boolean(Object.keys(orderWhere).length),
                    },
                    {
                        model: DamageClaim,
                        as: 'claim',
                        attributes: ['id', 'claim_amount', 'platform_advance_amount', 'reason', 'processed_at'],
                        required: false,
                    },
                ],
                order: [
                    ['status', 'ASC'],
                    ['created_at', 'DESC'],
                ],
                limit: Number(limit),
                offset,
            });

            const [summary] = await Promise.all([
                DelivererDebt.findAll({
                    attributes: [
                        'status',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'remaining_amount'],
                        [sequelize.fn('SUM', sequelize.col('principal_amount')), 'principal_amount'],
                    ],
                    group: ['status'],
                    raw: true,
                }),
            ]);

            return res.json({
                success: true,
                message: '获取配送员欠款列表成功',
                data: {
                    debts: rows,
                    summary: summary.map(item => ({
                        status: item.status,
                        count: Number(item.count || 0),
                        remaining_amount: parseAmount(item.remaining_amount),
                        principal_amount: parseAmount(item.principal_amount),
                    })),
                    pagination: {
                        total: count,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(count / Number(limit)),
                    },
                },
            });
        } catch (error) {
            console.error('Get deliverer debts error:', error);
            return res.status(500).json({
                success: false,
                message: '获取配送员欠款列表失败',
                error: error.message,
            });
        }
    }

    static async getDelivererDebtDetail(req, res) {
        try {
            const debt = await DelivererDebt.findByPk(req.params.id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'phone', 'avatar'],
                    },
                    {
                        model: PickupOrder,
                        as: 'order',
                        attributes: ['id', 'order_no', 'title', 'status', 'price', 'tip', 'created_at'],
                    },
                    {
                        model: DamageClaim,
                        as: 'claim',
                        attributes: [
                            'id',
                            'claim_amount',
                            'refund_amount',
                            'platform_advance_amount',
                            'debt_amount',
                            'reason',
                            'processed_at',
                        ],
                    },
                ],
            });

            if (!debt) {
                return res.status(404).json({
                    success: false,
                    message: '欠款记录不存在',
                });
            }

            const records = await DebtRepaymentRecord.findAll({
                where: { debt_id: debt.id },
                include: [
                    {
                        model: Transaction,
                        as: 'sourceTransaction',
                        attributes: ['id', 'transaction_no', 'type', 'amount', 'description', 'completed_at'],
                        required: false,
                    },
                    {
                        model: Transaction,
                        as: 'deductionTransaction',
                        attributes: ['id', 'transaction_no', 'type', 'amount', 'description', 'completed_at'],
                        required: false,
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return res.json({
                success: true,
                message: '获取配送员欠款详情成功',
                data: {
                    debt,
                    repayment_records: records,
                },
            });
        } catch (error) {
            console.error('Get deliverer debt detail error:', error);
            return res.status(500).json({
                success: false,
                message: '获取配送员欠款详情失败',
                error: error.message,
            });
        }
    }

    static async getSystemAccountOverview(req, res) {
        try {
            const { user: systemUser, wallet } = await FinanceAccountService.ensurePlatformWallet();
            const transactionWhere = { user_id: systemUser.id };

            const [recentTransactions, groupedStats, successStats, debtStats] = await Promise.all([
                Transaction.findAll({
                    where: transactionWhere,
                    order: [['completed_at', 'DESC'], ['created_at', 'DESC']],
                    limit: 10,
                }),
                Transaction.findAll({
                    where: transactionWhere,
                    attributes: [
                        'type',
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                        [sequelize.fn('SUM', sequelize.col('amount')), 'amount'],
                    ],
                    group: ['type'],
                    raw: true,
                }),
                Transaction.findOne({
                    where: {
                        ...transactionWhere,
                        status: 'success',
                    },
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                        [
                            sequelize.fn(
                                'SUM',
                                sequelize.literal("CASE WHEN direction = 'in' THEN amount ELSE 0 END")
                            ),
                            'income_amount',
                        ],
                        [
                            sequelize.fn(
                                'SUM',
                                sequelize.literal("CASE WHEN direction = 'out' THEN amount ELSE 0 END")
                            ),
                            'expense_amount',
                        ],
                    ],
                    raw: true,
                }),
                DelivererDebt.findAll({
                    where: {
                        status: {
                            [Op.in]: ['active', 'partial'],
                        },
                    },
                    attributes: [
                        [sequelize.fn('COUNT', sequelize.col('id')), 'active_count'],
                        [sequelize.fn('SUM', sequelize.col('remaining_amount')), 'active_amount'],
                    ],
                    raw: true,
                }),
            ]);

            return res.json({
                success: true,
                message: '获取系统账户概览成功',
                data: {
                    account: {
                        user_id: systemUser.id,
                        username: systemUser.username,
                        real_name: systemUser.real_name,
                        balance: parseAmount(wallet.balance),
                        frozen_balance: parseAmount(wallet.frozen_balance),
                        total_income: parseAmount(wallet.total_income),
                        total_expense: parseAmount(wallet.total_expense),
                        last_transaction_at: wallet.last_transaction_at,
                    },
                    transaction_summary: {
                        total_count: Number(successStats?.count || 0),
                        income_amount: parseAmount(successStats?.income_amount),
                        expense_amount: parseAmount(successStats?.expense_amount),
                    },
                    grouped_stats: groupedStats.map(item => ({
                        type: item.type,
                        count: Number(item.count || 0),
                        amount: parseAmount(item.amount),
                    })),
                    debt_summary: {
                        active_count: Number(debtStats?.[0]?.active_count || 0),
                        active_amount: parseAmount(debtStats?.[0]?.active_amount),
                    },
                    recent_transactions: recentTransactions,
                },
            });
        } catch (error) {
            console.error('Get system account overview error:', error);
            return res.status(500).json({
                success: false,
                message: '获取系统账户概览失败',
                error: error.message,
            });
        }
    }

    static async getSystemAccountTransactions(req, res) {
        try {
            const { page = 1, limit = 20, type, direction, keyword, startDate, endDate } = req.query;
            const { user: systemUser } = await FinanceAccountService.ensurePlatformWallet();
            const where = { user_id: systemUser.id };

            if (type) {
                where.type = type;
            }

            if (direction) {
                where.direction = direction;
            }

            if (startDate || endDate) {
                where.completed_at = {};
                if (startDate) where.completed_at[Op.gte] = new Date(startDate);
                if (endDate) where.completed_at[Op.lte] = new Date(endDate);
            }

            if (keyword) {
                where[Op.or] = [
                    { transaction_no: { [Op.like]: `%${keyword}%` } },
                    { description: { [Op.like]: `%${keyword}%` } },
                    { remark: { [Op.like]: `%${keyword}%` } },
                ];
            }

            const offset = (Number(page) - 1) * Number(limit);
            const { count, rows } = await Transaction.findAndCountAll({
                where,
                order: [['completed_at', 'DESC'], ['created_at', 'DESC']],
                limit: Number(limit),
                offset,
            });

            return res.json({
                success: true,
                message: '获取系统账户流水成功',
                data: {
                    transactions: rows,
                    pagination: {
                        total: count,
                        page: Number(page),
                        limit: Number(limit),
                        totalPages: Math.ceil(count / Number(limit)),
                    },
                },
            });
        } catch (error) {
            console.error('Get system account transactions error:', error);
            return res.status(500).json({
                success: false,
                message: '获取系统账户流水失败',
                error: error.message,
            });
        }
    }
}

module.exports = FinanceController;
