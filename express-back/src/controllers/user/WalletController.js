const { Op } = require('sequelize');
const { Wallet, Transaction, Deliverer, PickupOrder, Task, User } = require('../../models');
const { responseUtils, paginationUtils, timeUtils, cryptoUtils } = require('../../utils');

const parseAmount = value => Number.parseFloat(value || 0) || 0;
const MIN_WALLET_AMOUNT = 10;
const WITHDRAW_FEE_RATE = 0.01;
const WITHDRAW_MIN_FEE = 2;
const VALID_PAYMENT_METHODS = ['balance', 'wechat', 'alipay', 'bank_card'];
const VALID_RECORD_TYPES = ['recharge', 'withdraw'];
const SYSTEM_ACCOUNT = {
    student_id: 'SYSTEM0001',
    username: 'system_wallet',
    email: 'system-wallet@campus.local',
    password: 'system-wallet-unsafe-login-disabled',
    real_name: '系统账户',
};

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

const paymentMethodLabelMap = {
    balance: '余额',
    wechat: '微信支付',
    alipay: '支付宝',
    bank_card: '银行卡',
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

async function ensureSystemWalletAccount(dbTransaction) {
    let systemUser = await User.findOne({
        where: {
            [Op.or]: [{ student_id: SYSTEM_ACCOUNT.student_id }, { email: SYSTEM_ACCOUNT.email }],
        },
        transaction: dbTransaction,
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
            { transaction: dbTransaction }
        );
    }

    const [wallet] = await Wallet.findOrCreate({
        where: { user_id: systemUser.id },
        defaults: {
            user_id: systemUser.id,
            balance: 0,
            points: 0,
            status: 'active',
        },
        transaction: dbTransaction,
    });

    return { user: systemUser, wallet };
}

function normalizeTransaction(transaction) {
    const extraData = transaction.extra_data || transaction.extraData || {};

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
        third_party_no: transaction.third_party_no,
        balance_after: parseAmount(transaction.balance_after),
        commission_rate: parseAmount(transaction.commission_rate),
        commission_amount: parseAmount(transaction.commission_amount),
        actual_amount: parseAmount(extraData.actual_amount),
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
        third_party_no: null,
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
        third_party_no: null,
        balance_after: null,
    };
}

function generateTransactionNo(prefix = 'TX') {
    return `${prefix}${Date.now()}${Math.random().toString().slice(2, 6)}`;
}

function parseLegacyRemark(remark) {
    if (!remark || typeof remark !== 'string' || !remark.includes(':')) {
        return {};
    }

    const [paymentMethod, value] = remark.split(':');
    if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
        return {};
    }

    return {
        payment_method: paymentMethod,
        third_party_no: value || null,
    };
}

function normalizeRecordType(type) {
    if (!type) return null;
    if (type === 'withdrawal') return 'withdraw';
    if (type === 'recharge') return 'recharge';
    return type;
}

function assertAmount(amount, action) {
    if (amount < MIN_WALLET_AMOUNT) {
        throw new Error(`${action}金额不能低于 ${MIN_WALLET_AMOUNT} 元`);
    }
}

function assertPaymentMethod(paymentMethod, validMethods) {
    if (!validMethods.includes(paymentMethod)) {
        throw new Error('支付方式不支持');
    }
}

function buildPaymentDescription(type, paymentMethod) {
    const label = paymentMethodLabelMap[paymentMethod] || '钱包';
    return `${label}${type === 'recharge' ? '充值' : '提现'}`;
}

function resolveAccountNo(payload, scene = 'recharge') {
    const legacy = parseLegacyRemark(payload.remark);
    const paymentMethod = payload.payment_method || legacy.payment_method || null;
    const rawThirdPartyNo = payload.third_party_no || legacy.third_party_no || null;
    const bankPrefix = String(payload.bank_prefix || '')
        .trim()
        .toUpperCase();
    const accountNo = String(payload.account_no || '').trim();
    const phone = String(payload.phone || '').trim();

    if (paymentMethod === 'alipay') {
        const account = rawThirdPartyNo || phone;
        if (scene === 'withdraw' && !/^1\d{10}$/.test(account)) {
            throw new Error('支付宝账号必须为 11 位手机号');
        }

        return account || null;
    }

    if (paymentMethod === 'bank_card') {
        if (rawThirdPartyNo) {
            if (!/^[A-Z]{2}\d{16}$/.test(rawThirdPartyNo)) {
                throw new Error('银行卡账号格式不正确');
            }

            return rawThirdPartyNo;
        }

        if (!/^[A-Z]{2}$/.test(bankPrefix)) {
            throw new Error('银行卡前缀格式不正确');
        }

        if (!/^\d{16}$/.test(accountNo)) {
            throw new Error('银行卡号必须为 16 位数字');
        }

        return `${bankPrefix}${accountNo}`;
    }

    return rawThirdPartyNo;
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

async function createRechargeTransaction(user, payload) {
    const dbTransaction = await Wallet.sequelize.transaction();

    try {
        const amount = parseAmount(payload.amount);
        assertAmount(amount, '充值');
        assertPaymentMethod(payload.payment_method, ['alipay', 'wechat', 'bank_card']);

        const thirdPartyNo = resolveAccountNo(payload, 'recharge');
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

        const balanceBefore = parseAmount(wallet.balance);
        const balanceAfter = balanceBefore + amount;
        const now = new Date();

        await wallet.update(
            {
                balance: balanceAfter,
                total_income: parseAmount(wallet.total_income) + amount,
                last_transaction_at: now,
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
                transaction_no: generateTransactionNo('RC'),
                user_id: user.id,
                type: 'recharge',
                amount,
                direction: 'in',
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'success',
                related_type: 'recharge',
                related_id: null,
                third_party_no: thirdPartyNo,
                payment_method: payload.payment_method,
                description: buildPaymentDescription('recharge', payload.payment_method),
                remark: payload.remark || null,
                completed_at: now,
                extra_data: {
                    requested_amount: amount,
                    payment_method_label: paymentMethodLabelMap[payload.payment_method] || null,
                },
            },
            { transaction: dbTransaction }
        );

        await dbTransaction.commit();

        return {
            wallet,
            transaction: transactionRecord,
        };
    } catch (error) {
        await dbTransaction.rollback();
        throw error;
    }
}

async function createWithdrawTransaction(user, payload) {
    const dbTransaction = await Wallet.sequelize.transaction();

    try {
        const amount = parseAmount(payload.amount);
        assertAmount(amount, '提现');
        assertPaymentMethod(payload.payment_method, ['alipay', 'bank_card']);

        const thirdPartyNo = resolveAccountNo(payload, 'withdraw');
        const fee = Math.max(amount * WITHDRAW_FEE_RATE, WITHDRAW_MIN_FEE);
        const actualAmount = amount - fee;

        if (actualAmount <= 0) {
            throw new Error('提现金额过低，扣除服务费后到账金额必须大于 0');
        }

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

        const balanceBefore = parseAmount(wallet.balance);
        if (!wallet.payment_password_set || !wallet.payment_password) {
            throw new Error('请先设置支付密码');
        }

        if (!/^\d{6}$/.test(String(payload.payment_password || ''))) {
            throw new Error('请输入 6 位支付密码');
        }

        const encryptedPassword = cryptoUtils.sha256(String(payload.payment_password));
        if (wallet.payment_password !== encryptedPassword) {
            throw new Error('支付密码错误');
        }

        if (balanceBefore < amount) {
            throw new Error('余额不足');
        }

        const balanceAfter = balanceBefore - amount;
        const now = new Date();

        await wallet.update(
            {
                balance: balanceAfter,
                total_expense: parseAmount(wallet.total_expense) + amount,
                last_transaction_at: now,
            },
            { transaction: dbTransaction }
        );

        await currentUser.update(
            {
                balance: balanceAfter,
            },
            { transaction: dbTransaction }
        );

        const userTransaction = await Transaction.create(
            {
                transaction_no: generateTransactionNo('WD'),
                user_id: user.id,
                type: 'withdraw',
                amount,
                direction: 'out',
                balance_before: balanceBefore,
                balance_after: balanceAfter,
                status: 'success',
                related_type: 'withdraw',
                related_id: null,
                third_party_no: thirdPartyNo,
                payment_method: payload.payment_method,
                commission_rate: WITHDRAW_FEE_RATE,
                commission_amount: fee,
                description: buildPaymentDescription('withdraw', payload.payment_method),
                remark: payload.remark || null,
                completed_at: now,
                extra_data: {
                    service_fee: fee,
                    actual_amount: actualAmount,
                    payment_method_label: paymentMethodLabelMap[payload.payment_method] || null,
                },
            },
            { transaction: dbTransaction }
        );

        const systemAccount = await ensureSystemWalletAccount(dbTransaction);
        const systemWallet = await Wallet.findOne({
            where: { user_id: systemAccount.user.id },
            transaction: dbTransaction,
            lock: dbTransaction.LOCK.UPDATE,
        });

        const systemBalanceBefore = parseAmount(systemWallet.balance);
        const systemBalanceAfter = systemBalanceBefore + fee;

        await systemWallet.update(
            {
                balance: systemBalanceAfter,
                total_income: parseAmount(systemWallet.total_income) + fee,
                last_transaction_at: now,
            },
            { transaction: dbTransaction }
        );

        await systemAccount.user.update(
            {
                balance: systemBalanceAfter,
            },
            { transaction: dbTransaction }
        );

        await Transaction.create(
            {
                transaction_no: generateTransactionNo('SF'),
                user_id: systemAccount.user.id,
                type: 'recharge',
                amount: fee,
                direction: 'in',
                balance_before: systemBalanceBefore,
                balance_after: systemBalanceAfter,
                status: 'success',
                related_type: 'withdraw',
                related_id: userTransaction.id,
                third_party_no: thirdPartyNo,
                payment_method: payload.payment_method,
                commission_rate: WITHDRAW_FEE_RATE,
                commission_amount: fee,
                description: '提现服务费收入',
                remark: `用户 ${user.id} 提现服务费`,
                completed_at: now,
                extra_data: {
                    source_user_id: user.id,
                    source_transaction_no: userTransaction.transaction_no,
                },
            },
            { transaction: dbTransaction }
        );

        await dbTransaction.commit();

        return {
            wallet,
            transaction: userTransaction,
            fee,
            actualAmount,
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
            const { page = 1, limit = 20, direction = 'all', type, payment_method } = req.query;
            const { activities } = await buildWalletActivities(userId);
            const normalizedType = normalizeRecordType(type);

            if (normalizedType && !VALID_RECORD_TYPES.includes(normalizedType)) {
                return res.status(400).json(responseUtils.error('记录类型不支持'));
            }

            if (payment_method && !VALID_PAYMENT_METHODS.includes(payment_method)) {
                return res.status(400).json(responseUtils.error('支付方式不支持'));
            }

            const filteredActivities = activities.filter(item => {
                if (direction !== 'all' && item.direction !== direction) {
                    return false;
                }

                if (normalizedType && item.type !== normalizedType) {
                    return false;
                }

                if (payment_method && item.payment_method !== payment_method) {
                    return false;
                }

                return true;
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
            const { payment_password, account_password } = req.body;

            if (!/^\d{6}$/.test(String(payment_password || ''))) {
                return res.status(400).json(responseUtils.error('支付密码必须为6位数字'));
            }

            if (!account_password) {
                return res.status(400).json(responseUtils.error('请输入账户密码进行验证'));
            }

            const isAccountPasswordValid = await req.user.comparePassword(String(account_password));
            if (!isAccountPasswordValid) {
                return res.status(400).json(responseUtils.error('账户密码错误'));
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
                        updated: Boolean(wallet.payment_password_set),
                    },
                    wallet.payment_password_set ? '支付密码修改成功' : '支付密码设置成功'
                )
            );
        } catch (error) {
            console.error('设置支付密码失败:', error);
            return res.status(500).json(responseUtils.error('设置支付密码失败'));
        }
    }

    static async recharge(req, res) {
        try {
            const payload = {
                amount: req.body.amount,
                payment_method:
                    req.body.payment_method || parseLegacyRemark(req.body.remark).payment_method,
                payment_password: req.body.payment_password,
                third_party_no: req.body.third_party_no,
                bank_prefix: req.body.bank_prefix,
                account_no: req.body.account_no,
                phone: req.body.phone,
                remark: req.body.remark,
            };

            const result = await createRechargeTransaction(req.user, payload);

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
            console.error('充值失败:', error);
            res.status(400).json(responseUtils.error(error.message || '充值失败'));
        }
    }

    static async withdraw(req, res) {
        try {
            const payload = {
                amount: req.body.amount,
                payment_method:
                    req.body.payment_method || parseLegacyRemark(req.body.remark).payment_method,
                payment_password: req.body.payment_password,
                third_party_no: req.body.third_party_no,
                bank_prefix: req.body.bank_prefix,
                account_no: req.body.account_no,
                phone: req.body.phone,
                remark: req.body.remark,
            };

            const result = await createWithdrawTransaction(req.user, payload);

            res.json(
                responseUtils.success(
                    {
                        balance: parseAmount(result.wallet.balance),
                        fee: parseAmount(result.fee),
                        actual_amount: parseAmount(result.actualAmount),
                        transaction: normalizeTransaction(result.transaction),
                    },
                    '提现成功'
                )
            );
        } catch (error) {
            console.error('提现失败:', error);
            res.status(400).json(responseUtils.error(error.message || '提现失败'));
        }
    }
}

module.exports = WalletController;
