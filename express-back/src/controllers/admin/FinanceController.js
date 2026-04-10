const { Op, QueryTypes } = require('sequelize');
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
const PLATFORM_REVENUE_SQL = `
    (
        (type = 'transfer_in' AND COALESCE(commission_amount, 0) > 0)
        OR (type = 'recharge' AND related_type = 'withdraw')
    )
`;
const PLATFORM_EXPENSE_CATEGORY_SQL = `
    CASE
        WHEN direction = 'out'
            AND (
                JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.expense_category')) = 'platform_compensation'
                OR description = '平台投诉赔偿支出'
            )
        THEN 'platform_compensation'
        WHEN direction = 'out'
            AND (
                JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.expense_category')) = 'points_subsidy'
                OR description = '积分抵扣平台补贴支出'
            )
        THEN 'points_subsidy'
        WHEN direction = 'out'
            AND (
                JSON_UNQUOTE(JSON_EXTRACT(extra_data, '$.expense_category')) = 'deliverer_compensation_advance'
                OR description IN ('平台垫付订单赔付', '平台垫付订单额外赔付')
            )
        THEN 'deliverer_compensation_advance'
        ELSE NULL
    END
`;
const PLATFORM_EXPENSE_SQL = `
    (${PLATFORM_EXPENSE_CATEGORY_SQL}) IS NOT NULL
`;

const createEmptyExpenseBreakdown = () => ({
    platform_compensation: 0,
    points_subsidy: 0,
    deliverer_compensation_advance: 0,
});

const mapExpenseBreakdown = rows =>
    rows.reduce((acc, item) => {
        if (!item.expense_category || !(item.expense_category in acc)) {
            return acc;
        }

        acc[item.expense_category] = parseAmount(item.amount);
        return acc;
    }, createEmptyExpenseBreakdown());

const clampDays = value => {
    const days = Number.parseInt(value, 10);
    if (Number.isNaN(days)) return 30;
    return Math.min(Math.max(days, 7), 180);
};

const formatDateKey = date => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const buildDailyPeriods = days => {
    const result = [];
    const now = new Date();
    for (let i = days - 1; i >= 0; i -= 1) {
        const date = new Date(now);
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() - i);
        result.push(formatDateKey(date));
    }
    return result;
};

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

            const [recentTransactions, groupedStats, successStats, debtStats, expenseBreakdownRows] =
                await Promise.all([
                Transaction.findAll({
                    where: transactionWhere,
                    order: [['completed_at', 'DESC'], ['created_at', 'DESC']],
                    limit: 10,
                }),
                sequelize.query(
                    `
                        SELECT
                            type,
                            COUNT(id) AS count,
                            SUM(amount) AS amount
                        FROM transactions
                        WHERE user_id = :userId
                          AND status = 'success'
                          AND (
                            ${PLATFORM_EXPENSE_SQL}
                            OR ${PLATFORM_REVENUE_SQL}
                          )
                        GROUP BY type
                    `,
                    {
                        replacements: {
                            userId: systemUser.id,
                        },
                        type: QueryTypes.SELECT,
                    }
                ),
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
                                sequelize.literal(
                                    `CASE WHEN ${PLATFORM_REVENUE_SQL} THEN amount ELSE 0 END`
                                )
                            ),
                            'income_amount',
                        ],
                        [
                            sequelize.fn(
                                'SUM',
                                sequelize.literal(
                                    `CASE WHEN ${PLATFORM_EXPENSE_SQL} THEN amount ELSE 0 END`
                                )
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
                sequelize.query(
                    `
                        SELECT
                            ${PLATFORM_EXPENSE_CATEGORY_SQL} AS expense_category,
                            COUNT(id) AS count,
                            SUM(amount) AS amount
                        FROM transactions
                        WHERE user_id = :userId
                          AND status = 'success'
                          AND ${PLATFORM_EXPENSE_SQL}
                        GROUP BY expense_category
                    `,
                    {
                        replacements: {
                            userId: systemUser.id,
                        },
                        type: QueryTypes.SELECT,
                    }
                ),
            ]);

            const expenseBreakdown = mapExpenseBreakdown(expenseBreakdownRows);

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
                    expense_breakdown: expenseBreakdown,
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

    static async getSystemAccountAnalysis(req, res) {
        try {
            const days = clampDays(req.query.days);
            const { user: systemUser } = await FinanceAccountService.ensurePlatformWallet();

            const startDate = new Date();
            startDate.setHours(0, 0, 0, 0);
            startDate.setDate(startDate.getDate() - (days - 1));

            const trendRows = await sequelize.query(
                `
                    SELECT
                        DATE_FORMAT(COALESCE(completed_at, created_at), '%Y-%m-%d') AS period,
                        SUM(CASE WHEN ${PLATFORM_REVENUE_SQL} THEN amount ELSE 0 END) AS income,
                        SUM(CASE WHEN direction = 'out' THEN amount ELSE 0 END) AS expense,
                        COUNT(*) AS transaction_count
                    FROM transactions
                    WHERE user_id = :userId
                      AND status = 'success'
                      AND COALESCE(completed_at, created_at) >= :startDate
                    GROUP BY DATE_FORMAT(COALESCE(completed_at, created_at), '%Y-%m-%d')
                    ORDER BY period ASC
                `,
                {
                    replacements: {
                        userId: systemUser.id,
                        startDate,
                    },
                    type: QueryTypes.SELECT,
                }
            );

            const groupedRows = await sequelize.query(
                `
                    SELECT
                        direction,
                        type,
                        SUM(amount) AS amount,
                        COUNT(*) AS count
                    FROM transactions
                    WHERE user_id = :userId
                      AND status = 'success'
                      AND COALESCE(completed_at, created_at) >= :startDate
                      AND (
                        ${PLATFORM_EXPENSE_SQL}
                        OR ${PLATFORM_REVENUE_SQL}
                      )
                    GROUP BY direction, type
                    ORDER BY direction ASC, amount DESC
                `,
                {
                    replacements: {
                        userId: systemUser.id,
                        startDate,
                    },
                    type: QueryTypes.SELECT,
                }
            );
            const expenseBreakdownRows = await sequelize.query(
                `
                    SELECT
                        ${PLATFORM_EXPENSE_CATEGORY_SQL} AS expense_category,
                        SUM(amount) AS amount,
                        COUNT(id) AS count
                    FROM transactions
                    WHERE user_id = :userId
                      AND status = 'success'
                      AND COALESCE(completed_at, created_at) >= :startDate
                      AND ${PLATFORM_EXPENSE_SQL}
                    GROUP BY expense_category
                `,
                {
                    replacements: {
                        userId: systemUser.id,
                        startDate,
                    },
                    type: QueryTypes.SELECT,
                }
            );

            const trendMap = new Map(
                trendRows.map(item => [
                    item.period,
                    {
                        income: parseAmount(item.income),
                        expense: parseAmount(item.expense),
                        transaction_count: Number(item.transaction_count || 0),
                    },
                ])
            );

            const trend = buildDailyPeriods(days).map(period => {
                const current = trendMap.get(period) || {
                    income: 0,
                    expense: 0,
                    transaction_count: 0,
                };
                const netIncome = parseAmount(current.income - current.expense);
                const profitMargin = current.income > 0 ? (netIncome / current.income) * 100 : 0;
                return {
                    period,
                    income: parseAmount(current.income),
                    expense: parseAmount(current.expense),
                    net_income: parseAmount(netIncome),
                    profit_margin: Number(profitMargin.toFixed(2)),
                    transaction_count: current.transaction_count,
                };
            });

            const totalIncome = trend.reduce((sum, item) => sum + parseAmount(item.income), 0);
            const totalExpense = trend.reduce((sum, item) => sum + parseAmount(item.expense), 0);
            const totalNetIncome = parseAmount(totalIncome - totalExpense);
            const totalTransactions = trend.reduce((sum, item) => sum + Number(item.transaction_count || 0), 0);
            const expenseBreakdown = mapExpenseBreakdown(expenseBreakdownRows);
            const bestIncomeDay = trend.reduce(
                (best, item) => (item.income > best.income ? item : best),
                { period: '--', income: 0 }
            );
            const highestMarginDay = trend.reduce(
                (best, item) => (item.profit_margin > best.profit_margin ? item : best),
                { period: '--', profit_margin: 0 }
            );

            return res.json({
                success: true,
                message: '获取系统账户分析成功',
                data: {
                    range_days: days,
                    summary: {
                        total_income: parseAmount(totalIncome),
                        total_expense: parseAmount(totalExpense),
                        net_income: totalNetIncome,
                        profit_margin: totalIncome > 0 ? Number(((totalNetIncome / totalIncome) * 100).toFixed(2)) : 0,
                        avg_daily_income: Number((totalIncome / days).toFixed(2)),
                        avg_daily_expense: Number((totalExpense / days).toFixed(2)),
                        total_transactions: totalTransactions,
                        expense_breakdown: expenseBreakdown,
                        best_income_day: {
                            period: bestIncomeDay.period,
                            income: parseAmount(bestIncomeDay.income),
                        },
                        highest_margin_day: {
                            period: highestMarginDay.period,
                            profit_margin: Number((highestMarginDay.profit_margin || 0).toFixed(2)),
                        },
                    },
                    trend,
                    expense_breakdown: expenseBreakdown,
                    grouped_breakdown: groupedRows.map(item => ({
                        direction: item.direction,
                        type: item.type,
                        amount: parseAmount(item.amount),
                        count: Number(item.count || 0),
                    })),
                },
            });
        } catch (error) {
            console.error('Get system account analysis error:', error);
            return res.status(500).json({
                success: false,
                message: '获取系统账户分析失败',
                error: error.message,
            });
        }
    }
}

module.exports = FinanceController;
