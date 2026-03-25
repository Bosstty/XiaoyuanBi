const { Op } = require('sequelize');
const { Wallet, Transaction, Deliverer, PickupOrder, Task } = require('../../models');
const { responseUtils, paginationUtils, timeUtils, cryptoUtils } = require('../../utils');

const parseAmount = value => Number.parseFloat(value || 0) || 0;

const transactionTitleMap = {
    recharge: '钱包充值',
    withdraw: '钱包提现',
    payment: '订单支付',
    refund: '退款到账',
    earn_pickup: '配送收入',
    earn_task: '任务收入',
    commission_deduct: '平台佣金',
    penalty: '违约扣款',
    bonus: '奖励到账',
    transfer_in: '转入',
    transfer_out: '转出',
};

const orderTypeLabelMap = {
    express: '快递代取',
    food: '餐饮代购',
    medicine: '药品代买',
    daily: '生活服务',
};

async function ensureWallet(userId, user) {
    const [wallet] = await Wallet.findOrCreate({
        where: { user_id: userId },
        defaults: {
            user_id: userId,
            balance: parseAmount(user?.balance),
            points: Number(user?.points || 0),
            status: 'active',
        },
    });

    return wallet;
}

function normalizeTransaction(transaction) {
    return {
        id: `tx-${transaction.id}`,
        source: 'transaction',
        type: transaction.type,
        direction: transaction.direction,
        amount: parseAmount(transaction.amount),
        title: transactionTitleMap[transaction.type] || '资金变动',
        description: transaction.description || transaction.remark || '钱包资金流水',
        time:
            transaction.completed_at ||
            transaction.completedAt ||
            transaction.created_at ||
            transaction.createdAt,
        status: transaction.status,
        related_type: transaction.related_type,
        related_id: transaction.related_id,
        payment_method: transaction.payment_method,
        balance_after: parseAmount(transaction.balance_after),
    };
}

function normalizePickupActivity(order, direction, amount, title, description) {
    return {
        id: `pickup-${direction}-${order.id}`,
        source: 'pickup_order',
        type: direction === 'in' ? 'earn_pickup' : 'payment',
        direction,
        amount,
        title,
        description,
        time:
            order.delivery_complete_time ||
            order.accept_time ||
            order.created_at ||
            order.createdAt,
        status: order.status,
        related_type: 'pickup_order',
        related_id: order.id,
        payment_method: direction === 'out' ? 'balance' : null,
        balance_after: null,
    };
}

function normalizeTaskActivity(task, direction, amount, title, description) {
    return {
        id: `task-${direction}-${task.id}`,
        source: 'task',
        type: direction === 'in' ? 'earn_task' : 'payment',
        direction,
        amount,
        title,
        description,
        time:
            task.complete_time ||
            task.updated_at ||
            task.updatedAt ||
            task.created_at ||
            task.createdAt,
        status: task.status,
        related_type: 'task',
        related_id: task.id,
        payment_method: direction === 'out' ? 'balance' : null,
        balance_after: null,
    };
}

async function buildWalletActivities(userId) {
    const transactions = await Transaction.findAll({
        where: { user_id: userId },
        order: [['created_at', 'DESC']],
    });

    const successfulTransactions = transactions.filter(item => item.status === 'success');
    const successKeySet = new Set(
        successfulTransactions
            .filter(item => item.related_type && item.related_id)
            .map(item => `${item.related_type}:${item.related_id}:${item.type}`)
    );

    const activities = transactions.map(normalizeTransaction);

    const deliverer = await Deliverer.findOne({
        where: {
            user_id: userId,
            application_status: 'approved',
            status: 'active',
        },
        attributes: ['id', 'is_online', 'rating'],
    });

    const userExpenseOrders = await PickupOrder.findAll({
        where: {
            user_id: userId,
            status: {
                [Op.in]: ['accepted', 'picking', 'delivering', 'completed'],
            },
        },
        attributes: [
            'id',
            'type',
            'title',
            'price',
            'tip',
            'status',
            'delivery_complete_time',
            'accept_time',
            'created_at',
        ],
        order: [['created_at', 'DESC']],
    });

    userExpenseOrders.forEach(order => {
        if (successKeySet.has(`pickup_order:${order.id}:payment`)) {
            return;
        }

        const amount = parseAmount(order.price) + parseAmount(order.tip);
        activities.push(
            normalizePickupActivity(
                order,
                'out',
                amount,
                `${orderTypeLabelMap[order.type] || '订单'}支出`,
                order.title || '订单支付支出'
            )
        );
    });

    const publishedCompletedTasks = await Task.findAll({
        where: {
            publisher_id: userId,
            status: 'completed',
        },
        attributes: ['id', 'title', 'price', 'status', 'complete_time', 'updated_at', 'created_at'],
        order: [['updated_at', 'DESC']],
    });

    publishedCompletedTasks.forEach(task => {
        if (successKeySet.has(`task:${task.id}:payment`)) {
            return;
        }

        activities.push(
            normalizeTaskActivity(
                task,
                'out',
                parseAmount(task.price),
                '任务报酬支出',
                task.title || '任务完成后结算给承接人'
            )
        );
    });

    const assignedCompletedTasks = await Task.findAll({
        where: {
            assignee_id: userId,
            status: 'completed',
        },
        attributes: ['id', 'title', 'price', 'status', 'complete_time', 'updated_at', 'created_at'],
        order: [['updated_at', 'DESC']],
    });

    assignedCompletedTasks.forEach(task => {
        if (successKeySet.has(`task:${task.id}:earn_task`)) {
            return;
        }

        activities.push(
            normalizeTaskActivity(
                task,
                'in',
                parseAmount(task.price),
                '任务协作收入',
                task.title || '任务完成后的收入结算'
            )
        );
    });

    let delivererStats = {
        enabled: false,
        deliverer_id: null,
        is_online: false,
        rating: 0,
        total_orders: 0,
        completed_orders: 0,
        total_income: 0,
        month_income: 0,
        today_income: 0,
        pending_income: 0,
    };

    if (deliverer) {
        const completedDelivererOrders = await PickupOrder.findAll({
            where: {
                deliverer_id: deliverer.id,
                status: 'completed',
            },
            attributes: [
                'id',
                'type',
                'title',
                'price',
                'tip',
                'status',
                'delivery_complete_time',
                'created_at',
            ],
            order: [['delivery_complete_time', 'DESC']],
        });

        completedDelivererOrders.forEach(order => {
            if (successKeySet.has(`pickup_order:${order.id}:earn_pickup`)) {
                return;
            }

            const amount = parseAmount(order.price) + parseAmount(order.tip);
            activities.push(
                normalizePickupActivity(
                    order,
                    'in',
                    amount,
                    '配送服务收入',
                    order.title || '订单完成后的配送收入'
                )
            );
        });

        const monthRange = timeUtils.getTimeRange('month');
        const todayRange = timeUtils.getTimeRange('today');

        const totalIncome = completedDelivererOrders.reduce(
            (sum, item) => sum + parseAmount(item.price) + parseAmount(item.tip),
            0
        );
        const monthIncome = completedDelivererOrders.reduce((sum, item) => {
            const completedAt = new Date(
                item.delivery_complete_time || item.created_at || item.createdAt
            );
            if (completedAt >= monthRange.start && completedAt <= monthRange.end) {
                return sum + parseAmount(item.price) + parseAmount(item.tip);
            }
            return sum;
        }, 0);
        const todayIncome = completedDelivererOrders.reduce((sum, item) => {
            const completedAt = new Date(
                item.delivery_complete_time || item.created_at || item.createdAt
            );
            if (completedAt >= todayRange.start && completedAt <= todayRange.end) {
                return sum + parseAmount(item.price) + parseAmount(item.tip);
            }
            return sum;
        }, 0);

        const pendingDelivererOrders = await PickupOrder.findAll({
            where: {
                deliverer_id: deliverer.id,
                status: {
                    [Op.in]: ['accepted', 'picking', 'delivering'],
                },
            },
            attributes: ['price', 'tip'],
        });

        const totalOrders = await PickupOrder.count({
            where: { deliverer_id: deliverer.id },
        });

        delivererStats = {
            enabled: true,
            deliverer_id: deliverer.id,
            is_online: Boolean(deliverer.is_online),
            rating: parseAmount(deliverer.rating),
            total_orders: totalOrders,
            completed_orders: completedDelivererOrders.length,
            total_income: totalIncome,
            month_income: monthIncome,
            today_income: todayIncome,
            pending_income: pendingDelivererOrders.reduce(
                (sum, item) => sum + parseAmount(item.price) + parseAmount(item.tip),
                0
            ),
        };
    }

    activities.sort((a, b) => new Date(b.time || 0).getTime() - new Date(a.time || 0).getTime());

    return {
        activities,
        delivererStats,
    };
}

async function applyWalletChange(user, change) {
    const dbTransaction = await Wallet.sequelize.transaction();

    try {
        await ensureWallet(user.id, user);
        const wallet = await Wallet.findOne({
            where: { user_id: user.id },
            transaction: dbTransaction,
            lock: dbTransaction.LOCK.UPDATE,
        });
        const currentUser = await user.constructor.findByPk(user.id, {
            transaction: dbTransaction,
            lock: dbTransaction.LOCK.UPDATE,
        });

        const amount = parseAmount(change.amount);
        const balanceBefore = parseAmount(wallet.balance);

        if (amount <= 0) {
            throw new Error('金额必须大于0');
        }

        if (change.direction === 'out' && balanceBefore < amount) {
            throw new Error('余额不足');
        }

        const balanceAfter =
            change.direction === 'in' ? balanceBefore + amount : balanceBefore - amount;

        await wallet.update(
            {
                balance: balanceAfter,
                total_income:
                    change.direction === 'in'
                        ? parseAmount(wallet.total_income) + amount
                        : parseAmount(wallet.total_income),
                total_expense:
                    change.direction === 'out'
                        ? parseAmount(wallet.total_expense) + amount
                        : parseAmount(wallet.total_expense),
                last_transaction_at: new Date(),
            },
            { transaction: dbTransaction }
        );

        await currentUser.update(
            {
                balance: balanceAfter,
            },
            { transaction: dbTransaction }
        );

        const transactionRecord = await Transaction.create(
            {
                transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
                user_id: user.id,
                type: change.type,
                amount,
                direction: change.direction,
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'success',
                related_type: change.related_type || null,
                related_id: change.related_id || null,
                payment_method: 'balance',
                description: change.description,
                remark: change.remark || null,
                completed_at: new Date(),
            },
            { transaction: dbTransaction }
        );

        await dbTransaction.commit();

        return {
            wallet,
            user: currentUser,
            transaction: transactionRecord,
        };
    } catch (error) {
        await dbTransaction.rollback();
        throw error;
    }
}

class WalletController {
    static async getWalletOverview(req, res) {
        try {
            const userId = req.user.id;
            const wallet = await ensureWallet(userId, req.user);
            const { activities, delivererStats } = await buildWalletActivities(userId);
            const monthRange = timeUtils.getTimeRange('month');

            const successfulActivities = activities.filter(
                item => item.status === 'success' || item.source !== 'transaction'
            );
            const monthActivities = successfulActivities.filter(item => {
                const time = new Date(item.time || 0);
                return time >= monthRange.start && time <= monthRange.end;
            });

            const totalIncome = successfulActivities
                .filter(item => item.direction === 'in')
                .reduce((sum, item) => sum + item.amount, 0);
            const totalExpense = successfulActivities
                .filter(item => item.direction === 'out')
                .reduce((sum, item) => sum + item.amount, 0);
            const monthIncome = monthActivities
                .filter(item => item.direction === 'in')
                .reduce((sum, item) => sum + item.amount, 0);
            const monthExpense = monthActivities
                .filter(item => item.direction === 'out')
                .reduce((sum, item) => sum + item.amount, 0);

            const inProgressTasks = await Task.findAll({
                where: {
                    assignee_id: userId,
                    status: 'in_progress',
                },
                attributes: ['price'],
            });

            const pendingTaskIncome = inProgressTasks.reduce(
                (sum, task) => sum + parseAmount(task.price),
                0
            );

            res.json(
                responseUtils.success(
                    {
                        wallet: {
                            id: wallet.id,
                            balance: parseAmount(wallet.balance || req.user.balance),
                            frozen_balance: parseAmount(wallet.frozen_balance),
                            total_income: parseAmount(wallet.total_income) || totalIncome,
                            total_expense: parseAmount(wallet.total_expense) || totalExpense,
                            points: Number(wallet.points || req.user.points || 0),
                            status: wallet.status,
                            payment_password_set: Boolean(wallet.payment_password_set),
                            last_transaction_at: wallet.last_transaction_at,
                        },
                        summary: {
                            available_balance: parseAmount(wallet.balance || req.user.balance),
                            frozen_balance: parseAmount(wallet.frozen_balance),
                            total_income: totalIncome,
                            total_expense: totalExpense,
                            month_income: monthIncome,
                            month_expense: monthExpense,
                            pending_settlement: delivererStats.pending_income + pendingTaskIncome,
                            points: Number(wallet.points || req.user.points || 0),
                            last_transaction_at: wallet.last_transaction_at,
                        },
                        deliverer: delivererStats,
                        recent_activities: activities.slice(0, 10),
                    },
                    '获取钱包概览成功'
                )
            );
        } catch (error) {
            console.error('获取钱包概览失败:', error);
            res.status(500).json(responseUtils.error('获取钱包概览失败'));
        }
    }

    static async getWalletActivities(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 20, direction = 'all' } = req.query;
            const { activities } = await buildWalletActivities(userId);

            const filteredActivities = activities.filter(item => {
                if (direction === 'all') {
                    return true;
                }
                return item.direction === direction;
            });

            const { offset, limit: pageLimit } = paginationUtils.getPagination(page, limit);
            const pagedItems = filteredActivities.slice(offset, offset + pageLimit);
            const pagination = paginationUtils.formatPaginatedResponse(
                pagedItems,
                Number(page),
                Number(limit),
                filteredActivities.length
            ).pagination;

            res.json(
                responseUtils.paginated(
                    {
                        items: pagedItems,
                        summary: {
                            income: filteredActivities
                                .filter(item => item.direction === 'in')
                                .reduce((sum, item) => sum + item.amount, 0),
                            expense: filteredActivities
                                .filter(item => item.direction === 'out')
                                .reduce((sum, item) => sum + item.amount, 0),
                            count: filteredActivities.length,
                        },
                    },
                    pagination,
                    '获取钱包流水成功'
                )
            );
        } catch (error) {
            console.error('获取钱包流水失败:', error);
            res.status(500).json(responseUtils.error('获取钱包流水失败'));
        }
    }

    static async setPaymentPassword(req, res) {
        try {
            const { payment_password } = req.body;

            if (!/^\d{6}$/.test(String(payment_password || ''))) {
                return res.status(400).json(responseUtils.error('支付密码必须为6位数字'));
            }

            const wallet = await ensureWallet(req.user.id, req.user);
            await wallet.update({
                payment_password: cryptoUtils.sha256(String(payment_password)),
                payment_password_set: true,
            });

            return res.json(
                responseUtils.success(
                    {
                        payment_password_set: true,
                    },
                    '支付密码设置成功'
                )
            );
        } catch (error) {
            console.error('设置支付密码失败:', error);
            return res.status(500).json(responseUtils.error('设置支付密码失败'));
        }
    }

    static async recharge(req, res) {
        try {
            const { amount, remark } = req.body;
            const result = await applyWalletChange(req.user, {
                amount,
                direction: 'in',
                type: 'recharge',
                description: '虚拟充值',
                remark,
            });

            res.json(
                responseUtils.success(
                    {
                        balance: parseAmount(result.wallet.balance),
                        transaction: normalizeTransaction(result.transaction),
                    },
                    '充值成功'
                )
            );
        } catch (error) {
            console.error('虚拟充值失败:', error);
            res.status(400).json(responseUtils.error(error.message || '充值失败'));
        }
    }

    static async withdraw(req, res) {
        try {
            const { amount, remark } = req.body;
            const result = await applyWalletChange(req.user, {
                amount,
                direction: 'out',
                type: 'withdraw',
                description: '虚拟提现',
                remark,
            });

            res.json(
                responseUtils.success(
                    {
                        balance: parseAmount(result.wallet.balance),
                        transaction: normalizeTransaction(result.transaction),
                    },
                    '提现成功'
                )
            );
        } catch (error) {
            console.error('虚拟提现失败:', error);
            res.status(400).json(responseUtils.error(error.message || '提现失败'));
        }
    }
}

module.exports = WalletController;
