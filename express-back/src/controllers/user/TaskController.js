const {
    Task,
    TaskApplication,
    PickupOrder,
    User,
    Wallet,
    Transaction,
    ServiceTicket,
} = require('../../models');
const { responseUtils, orderUtils, cryptoUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

const parseAmount = value => Number(value || 0);
const roundRating = value => Number(Number(value || 0).toFixed(2));
const TASK_CANCELLATION_TIMEOUT_MS = 48 * 60 * 60 * 1000;

const buildCancellationResetPayload = () => ({
    cancellation_status: 'none',
    cancellation_initiator_id: null,
    cancellation_reason: null,
    cancellation_compensation: null,
    cancellation_requested_at: null,
    cancellation_expires_at: null,
    cancellation_responded_at: null,
    cancellation_ticket_id: null,
});

const generateTransactionNo = () => `TX${Date.now()}${Math.random().toString().slice(2, 6)}`;
const generateTicketNo = () =>
    `TK${Date.now().toString().slice(-10)}${Math.random().toString(36).slice(2, 6)}`.toUpperCase();

const isTaskParticipant = (task, userId) =>
    !!task && [Number(task.publisher_id), Number(task.assignee_id || 0)].includes(Number(userId));

function assertNoBlockingCancellation(task) {
    if (task?.cancellation_status === 'pending') {
        throw new Error('当前任务存在待确认的取消申请，请先处理取消协商');
    }

    if (task?.cancellation_status === 'disputed') {
        throw new Error('当前任务正在争议处理中，暂时无法操作');
    }
}

async function getTaskAverageRating(userId, transaction) {
    const avg = await Task.findOne({
        where: {
            assignee_id: userId,
            status: 'completed',
            rating: { [Op.not]: null },
        },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        transaction,
        raw: true,
    });

    return roundRating(avg?.avgRating);
}

async function getOrderAverageRating(userId, transaction) {
    const avg = await PickupOrder.findOne({
        where: {
            deliverer_id: userId,
            status: 'completed',
            rating: { [Op.not]: null },
        },
        attributes: [[sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
        transaction,
        raw: true,
    });

    return roundRating(avg?.avgRating);
}

async function syncUserCompositeRating(userId, transaction) {
    const [taskAvg, orderAvg, taskCount, orderCount] = await Promise.all([
        getTaskAverageRating(userId, transaction),
        getOrderAverageRating(userId, transaction),
        Task.count({
            where: {
                assignee_id: userId,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            transaction,
        }),
        PickupOrder.count({
            where: {
                deliverer_id: userId,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            transaction,
        }),
    ]);

    const totalCount = Number(taskCount || 0) + Number(orderCount || 0);
    const overallRating =
        totalCount > 0
            ? roundRating(
                  (Number(taskAvg || 0) * Number(taskCount || 0) +
                      Number(orderAvg || 0) * Number(orderCount || 0)) /
                      totalCount
              )
            : 5;

    await User.update({ rating: overallRating }, { where: { id: userId }, transaction });

    return {
        overall_rating: overallRating,
        task_rating: taskAvg,
        order_rating: orderAvg,
        total_task_reviews: Number(taskCount || 0),
        total_order_reviews: Number(orderCount || 0),
    };
}

async function buildApplicantProfileSnapshot(user) {
    if (!user?.id) return null;

    const [taskStats, orderStats] = await Promise.all([
        Task.findOne({
            where: {
                assignee_id: user.id,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
            ],
            raw: true,
        }),
        PickupOrder.findOne({
            where: {
                deliverer_id: user.id,
                status: 'completed',
                rating: { [Op.not]: null },
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
            ],
            raw: true,
        }),
    ]);

    return {
        overall_rating: roundRating(user.rating || 0),
        task_rating: roundRating(taskStats?.avgRating),
        order_rating: roundRating(orderStats?.avgRating),
        total_task_reviews: Number(taskStats?.reviewCount || 0),
        total_order_reviews: Number(orderStats?.reviewCount || 0),
        completed_tasks: Number(user.completed_tasks || 0),
        completed_orders: Number(user.completed_orders || 0),
    };
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

async function freezeTaskFunds(publisherId, amount, transaction) {
    const { user, wallet } = await getLockedUserAndWallet(publisherId, transaction);
    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);

    if (availableBalance < amount) {
        throw new Error('余额不足，任务创建失败，请先充值后再发布');
    }

    const nextAvailableBalance = availableBalance - amount;

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: frozenBalance + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await user.update(
        {
            balance: nextAvailableBalance,
        },
        { transaction }
    );
}

async function releaseTaskFunds(publisherId, amount, transaction) {
    const { user, wallet } = await getLockedUserAndWallet(publisherId, transaction);
    const availableBalance = parseAmount(wallet.balance);
    const frozenBalance = parseAmount(wallet.frozen_balance);

    if (frozenBalance < amount) {
        throw new Error('冻结金额不足，无法解冻任务资金');
    }

    const nextAvailableBalance = availableBalance + amount;

    await wallet.update(
        {
            balance: nextAvailableBalance,
            frozen_balance: frozenBalance - amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await user.update(
        {
            balance: nextAvailableBalance,
        },
        { transaction }
    );
}

async function settleTaskPayment(task, paymentPassword, transaction) {
    const amount = parseAmount(task.price);
    const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
        task.publisher_id,
        transaction
    );

    if (!publisherWallet.payment_password_set || !publisherWallet.payment_password) {
        throw new Error('请先设置支付密码');
    }

    if (!paymentPassword || !String(paymentPassword).trim()) {
        throw new Error('请输入支付密码');
    }

    const encryptedPassword = cryptoUtils.sha256(String(paymentPassword).trim());
    if (publisherWallet.payment_password !== encryptedPassword) {
        throw new Error('支付密码错误');
    }

    const publisherFrozenBalance = parseAmount(publisherWallet.frozen_balance);
    if (publisherFrozenBalance < amount) {
        throw new Error('冻结金额不足，无法完成支付');
    }

    await publisherWallet.update(
        {
            frozen_balance: publisherFrozenBalance - amount,
            total_expense: parseAmount(publisherWallet.total_expense) + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: generateTransactionNo(),
            user_id: publisher.id,
            type: 'payment',
            amount,
            direction: 'out',
            balance_before: parseAmount(publisherWallet.balance),
            balance_after: parseAmount(publisherWallet.balance),
            status: 'success',
            related_type: 'task',
            related_id: task.id,
            payment_method: 'balance',
            description: `任务报酬支出：${task.title}`,
            completed_at: new Date(),
        },
        { transaction }
    );

    if (!task.assignee_id) {
        return;
    }

    const { user: assignee, wallet: assigneeWallet } = await getLockedUserAndWallet(
        task.assignee_id,
        transaction
    );

    const assigneeBalanceBefore = parseAmount(assigneeWallet.balance);
    const assigneeBalanceAfter = assigneeBalanceBefore + amount;

    await assigneeWallet.update(
        {
            balance: assigneeBalanceAfter,
            total_income: parseAmount(assigneeWallet.total_income) + amount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await assignee.update(
        {
            balance: assigneeBalanceAfter,
            completed_tasks: Number(assignee.completed_tasks || 0) + 1,
        },
        { transaction }
    );

    await Transaction.create(
        {
            transaction_no: generateTransactionNo(),
            user_id: assignee.id,
            type: 'earn_task',
            amount,
            direction: 'in',
            balance_before: assigneeBalanceBefore,
            balance_after: assigneeBalanceAfter,
            status: 'success',
            related_type: 'task',
            related_id: task.id,
            payment_method: 'balance',
            description: `任务协作收入：${task.title}`,
            completed_at: new Date(),
        },
        { transaction }
    );
}

async function expireTaskCancellationIfNeeded(task, transaction) {
    if (!task || task.cancellation_status !== 'pending' || !task.cancellation_expires_at) {
        return task;
    }

    const expiresAt = new Date(task.cancellation_expires_at);
    if (Number.isNaN(expiresAt.getTime()) || expiresAt.getTime() > Date.now()) {
        return task;
    }

    const resetPayload = buildCancellationResetPayload();
    await task.update(resetPayload, { transaction });
    task.set(resetPayload);
    return task;
}

async function createTaskWalletTransaction(
    {
        userId,
        type,
        amount,
        direction,
        balanceBefore,
        balanceAfter,
        description,
        taskId,
        remark,
        extraData,
    },
    transaction
) {
    return Transaction.create(
        {
            transaction_no: generateTransactionNo(),
            user_id: userId,
            type,
            amount,
            direction,
            balance_before: balanceBefore,
            balance_after: balanceAfter,
            status: 'success',
            related_type: 'task',
            related_id: taskId,
            payment_method: 'balance',
            description,
            remark: remark || null,
            extra_data: extraData || null,
            completed_at: new Date(),
        },
        { transaction }
    );
}

async function refundTaskFrozenFunds(task, amount, description, transaction) {
    const refundAmount = parseAmount(amount);
    if (refundAmount <= 0) {
        return;
    }

    const { user, wallet } = await getLockedUserAndWallet(task.publisher_id, transaction);
    const balanceBefore = parseAmount(wallet.balance);
    const frozenBefore = parseAmount(wallet.frozen_balance);

    if (frozenBefore < refundAmount) {
        throw new Error('冻结金额不足，无法退回任务资金');
    }

    const balanceAfter = balanceBefore + refundAmount;

    await wallet.update(
        {
            balance: balanceAfter,
            frozen_balance: frozenBefore - refundAmount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await user.update(
        {
            balance: balanceAfter,
        },
        { transaction }
    );

    await createTaskWalletTransaction(
        {
            userId: user.id,
            type: 'refund',
            amount: refundAmount,
            direction: 'in',
            balanceBefore,
            balanceAfter,
            description,
            taskId: task.id,
        },
        transaction
    );
}

async function transferBalanceCompensation(
    { fromUserId, toUserId, amount, payerType, payerDescription, receiverDescription, taskId },
    transaction
) {
    const compensationAmount = parseAmount(amount);
    if (compensationAmount <= 0) {
        return;
    }

    const { user: payer, wallet: payerWallet } = await getLockedUserAndWallet(
        fromUserId,
        transaction
    );
    const payerBalanceBefore = parseAmount(payerWallet.balance);

    if (payerBalanceBefore < compensationAmount) {
        throw new Error('赔偿方余额不足，无法完成取消补偿');
    }

    const payerBalanceAfter = payerBalanceBefore - compensationAmount;

    await payerWallet.update(
        {
            balance: payerBalanceAfter,
            total_expense: parseAmount(payerWallet.total_expense) + compensationAmount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await payer.update(
        {
            balance: payerBalanceAfter,
        },
        { transaction }
    );

    await createTaskWalletTransaction(
        {
            userId: payer.id,
            type: payerType,
            amount: compensationAmount,
            direction: 'out',
            balanceBefore: payerBalanceBefore,
            balanceAfter: payerBalanceAfter,
            description: payerDescription,
            taskId,
        },
        transaction
    );

    const { user: receiver, wallet: receiverWallet } = await getLockedUserAndWallet(
        toUserId,
        transaction
    );
    const receiverBalanceBefore = parseAmount(receiverWallet.balance);
    const receiverBalanceAfter = receiverBalanceBefore + compensationAmount;

    await receiverWallet.update(
        {
            balance: receiverBalanceAfter,
            total_income: parseAmount(receiverWallet.total_income) + compensationAmount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await receiver.update(
        {
            balance: receiverBalanceAfter,
        },
        { transaction }
    );

    await createTaskWalletTransaction(
        {
            userId: receiver.id,
            type: 'transfer_in',
            amount: compensationAmount,
            direction: 'in',
            balanceBefore: receiverBalanceBefore,
            balanceAfter: receiverBalanceAfter,
            description: receiverDescription,
            taskId,
        },
        transaction
    );
}

async function transferFrozenCompensationToAssignee(task, amount, description, transaction) {
    const compensationAmount = parseAmount(amount);
    if (compensationAmount <= 0 || !task.assignee_id) {
        return;
    }

    const { user: publisher, wallet: publisherWallet } = await getLockedUserAndWallet(
        task.publisher_id,
        transaction
    );
    const publisherFrozenBefore = parseAmount(publisherWallet.frozen_balance);

    if (publisherFrozenBefore < compensationAmount) {
        throw new Error('冻结金额不足，无法支付取消补偿');
    }

    await publisherWallet.update(
        {
            frozen_balance: publisherFrozenBefore - compensationAmount,
            total_expense: parseAmount(publisherWallet.total_expense) + compensationAmount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await createTaskWalletTransaction(
        {
            userId: publisher.id,
            type: 'payment',
            amount: compensationAmount,
            direction: 'out',
            balanceBefore: parseAmount(publisherWallet.balance),
            balanceAfter: parseAmount(publisherWallet.balance),
            description: `任务取消补偿支出：${task.title}`,
            taskId: task.id,
        },
        transaction
    );

    const { user: assignee, wallet: assigneeWallet } = await getLockedUserAndWallet(
        task.assignee_id,
        transaction
    );
    const assigneeBalanceBefore = parseAmount(assigneeWallet.balance);
    const assigneeBalanceAfter = assigneeBalanceBefore + compensationAmount;

    await assigneeWallet.update(
        {
            balance: assigneeBalanceAfter,
            total_income: parseAmount(assigneeWallet.total_income) + compensationAmount,
            last_transaction_at: new Date(),
        },
        { transaction }
    );

    await assignee.update(
        {
            balance: assigneeBalanceAfter,
        },
        { transaction }
    );

    await createTaskWalletTransaction(
        {
            userId: assignee.id,
            type: 'transfer_in',
            amount: compensationAmount,
            direction: 'in',
            balanceBefore: assigneeBalanceBefore,
            balanceAfter: assigneeBalanceAfter,
            description,
            taskId: task.id,
        },
        transaction
    );
}

async function settleAcceptedCancellation(task, transaction) {
    const taskAmount = parseAmount(task.price);
    const compensationAmount = parseAmount(task.cancellation_compensation);
    const publisherInitiated = Number(task.cancellation_initiator_id) === Number(task.publisher_id);

    if (publisherInitiated) {
        if (compensationAmount > taskAmount) {
            throw new Error('赔偿金额不能超过当前任务金额');
        }

        await transferFrozenCompensationToAssignee(
            task,
            compensationAmount,
            `任务取消补偿收入：${task.title}`,
            transaction
        );

        await refundTaskFrozenFunds(
            task,
            Math.max(taskAmount - compensationAmount, 0),
            `任务取消退回：${task.title}`,
            transaction
        );
        return;
    }

    await refundTaskFrozenFunds(task, taskAmount, `任务取消退回：${task.title}`, transaction);

    if (compensationAmount > 0) {
        await transferBalanceCompensation(
            {
                fromUserId: task.assignee_id,
                toUserId: task.publisher_id,
                amount: compensationAmount,
                payerType: 'penalty',
                payerDescription: `任务取消补偿支出：${task.title}`,
                receiverDescription: `任务取消补偿收入：${task.title}`,
                taskId: task.id,
            },
            transaction
        );
    }
}

class TaskController {
    // 创建任务
    static async createTask(req, res) {
        try {
            const userId = req.user.id;
            const {
                category,
                title,
                description,
                requirements,
                tags,
                skills_required,
                price,
                location,
                start_time,
                deadline,
                estimated_duration,
                max_applicants,
                urgent,
                remote_work,
                images,
                attachments,
            } = req.body;

            const validCategories = ['study', 'design', 'tech', 'writing', 'life'];

            if (!validCategories.includes(category)) {
                return res.status(400).json(responseUtils.error('任务分类不正确'));
            }

            if (!title || !String(title).trim()) {
                return res.status(400).json(responseUtils.error('任务标题不能为空'));
            }

            if (!description || !String(description).trim()) {
                return res.status(400).json(responseUtils.error('任务描述不能为空'));
            }

            if (!price || Number(price) <= 0) {
                return res.status(400).json(responseUtils.error('任务报酬必须大于0'));
            }

            if (!deadline) {
                return res.status(400).json(responseUtils.error('截止时间不能为空'));
            }

            const deadlineDate = new Date(deadline);
            if (Number.isNaN(deadlineDate.getTime())) {
                return res.status(400).json(responseUtils.error('截止时间格式不正确'));
            }

            if (deadlineDate <= new Date()) {
                return res.status(400).json(responseUtils.error('截止时间必须晚于当前时间'));
            }

            let startTimeDate = null;
            if (start_time) {
                startTimeDate = new Date(start_time);
                if (Number.isNaN(startTimeDate.getTime())) {
                    return res.status(400).json(responseUtils.error('开始时间格式不正确'));
                }

                if (startTimeDate > deadlineDate) {
                    return res.status(400).json(responseUtils.error('开始时间不能晚于截止时间'));
                }
            }

            if (max_applicants !== undefined && Number(max_applicants) < 1) {
                return res.status(400).json(responseUtils.error('最大申请人数不能小于1'));
            }

            if (estimated_duration !== undefined && Number(estimated_duration) < 1) {
                return res.status(400).json(responseUtils.error('预计时长不能小于1小时'));
            }

            const dbTransaction = await Task.sequelize.transaction();
            let task;

            try {
                // 生成任务号
                const taskNo = orderUtils.generateOrderNo('TK');
                const taskAmount = parseAmount(price);

                await freezeTaskFunds(userId, taskAmount, dbTransaction);

                task = await Task.create(
                    {
                        task_no: taskNo,
                        publisher_id: userId,
                        category,
                        title: String(title).trim(),
                        description: String(description).trim(),
                        requirements: requirements ? String(requirements).trim() : null,
                        tags: Array.isArray(tags) ? tags : null,
                        skills_required: Array.isArray(skills_required) ? skills_required : null,
                        price: taskAmount,
                        location: location ? String(location).trim() : null,
                        start_time: startTimeDate || null,
                        deadline: deadlineDate,
                        estimated_duration: estimated_duration ? Number(estimated_duration) : null,
                        max_applicants: max_applicants ? Number(max_applicants) : 1,
                        urgent: Boolean(urgent),
                        remote_work: Boolean(remote_work),
                        images: Array.isArray(images) ? images : null,
                        attachments: Array.isArray(attachments) ? attachments : null,
                        status: 'pending',
                        payment_status: 'unpaid',
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            // 获取包含发布者信息的任务详情
            const taskWithPublisher = await Task.findByPk(task.id, {
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                ],
            });

            res.json(responseUtils.success(taskWithPublisher, '任务创建成功'));
        } catch (error) {
            console.error('创建任务失败:', error);
            const errorMessage = error.message || '创建任务失败';
            const isBusinessError = [
                '余额不足',
                '任务分类不正确',
                '任务标题不能为空',
                '任务描述不能为空',
                '任务报酬必须大于0',
                '截止时间不能为空',
                '截止时间格式不正确',
                '截止时间必须晚于当前时间',
                '开始时间格式不正确',
                '开始时间不能晚于截止时间',
                '最大申请人数不能小于1',
                '预计时长不能小于1小时',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '创建任务失败'));
        }
    }

    // 获取任务列表
    static async getTasks(req, res) {
        try {
            const userId = req.user.id;
            const {
                page = 1,
                limit = 10,
                category,
                status = 'published',
                search,
                sort = 'created_at',
                order = 'desc',
            } = req.query;

            const offset = (page - 1) * limit;
            const where = { status };

            // 分类筛选
            if (category) {
                where.category = category;
            }

            // 搜索功能
            if (search) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } },
                ];
            }

            const { count, rows } = await Task.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                    {
                        model: User,
                        as: 'assignee',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                        required: false,
                    },
                ],
                order: [[sort, order.toUpperCase()]],
                offset: parseInt(offset),
                limit: parseInt(limit),
            });

            const taskIds = rows.map(task => task.id);
            let applicationMap = new Map();

            if (taskIds.length) {
                const myApplications = await TaskApplication.findAll({
                    where: {
                        task_id: { [Op.in]: taskIds },
                        applicant_id: userId,
                    },
                    attributes: ['task_id', 'status'],
                    raw: true,
                });

                applicationMap = new Map(
                    myApplications.map(application => [
                        Number(application.task_id),
                        application.status,
                    ])
                );
            }

            const tasksWithApplication = rows.map(task => {
                const plainTask = task.toJSON();
                const applicationStatus = applicationMap.get(Number(task.id)) || null;
                plainTask.has_applied = Boolean(applicationStatus);
                plainTask.current_user_application_status = applicationStatus;
                return plainTask;
            });

            const result = {
                tasks: tasksWithApplication,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };

            res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取任务列表失败:', error);
            return res.status(500).json(responseUtils.error('获取任务列表失败'));
        }
    }

    // 获取已发布任务分类统计
    static async getPublishedCategoryStats(req, res) {
        try {
            const categories = ['study', 'design', 'tech', 'writing', 'life'];

            const rows = await Task.findAll({
                where: {
                    status: 'published',
                },
                attributes: [
                    'category',
                    [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count'],
                ],
                group: ['category'],
                raw: true,
            });

            const stats = categories.reduce((acc, category) => {
                acc[category] = 0;
                return acc;
            }, {});

            rows.forEach(row => {
                if (categories.includes(row.category)) {
                    stats[row.category] = Number(row.count) || 0;
                }
            });

            res.json(
                responseUtils.success(
                    {
                        status: 'published',
                        categories: stats,
                        total: Object.values(stats).reduce((sum, count) => sum + count, 0),
                    },
                    '获取任务分类统计成功'
                )
            );
        } catch (error) {
            console.error('获取任务分类统计失败:', error);
            return res.status(500).json(responseUtils.error('获取任务分类统计失败'));
        }
    }

    // 获取任务详情
    static async getTaskById(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            let task = await Task.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'rating',
                            'college',
                            'major',
                        ],
                    },
                    {
                        model: User,
                        as: 'assignee',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'rating',
                            'completed_tasks',
                            'completed_orders',
                        ],
                        required: false,
                    },
                ],
            });

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            await expireTaskCancellationIfNeeded(task);

            // 增加浏览次数
            await task.increment('view_count');

            const currentUserApplication = await TaskApplication.findOne({
                where: {
                    task_id: id,
                    applicant_id: userId,
                },
                attributes: ['id', 'status', 'message', 'created_at', 'createdAt'],
            });

            const taskData = task.toJSON();
            taskData.view_count = Number(taskData.view_count || 0) + 1;
            taskData.has_applied = Boolean(currentUserApplication?.status);
            taskData.current_user_application_status = currentUserApplication?.status || null;
            taskData.current_user_application = currentUserApplication || null;
            taskData.has_reviewed =
                task.publisher_id === userId && task.status === 'completed' && Boolean(task.rating);

            res.json(responseUtils.success(taskData));
        } catch (error) {
            console.error('获取任务详情失败:', error);
            return res.status(500).json(responseUtils.error('获取任务详情失败'));
        }
    }

    // 更新任务
    static async updateTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const payloadKeys = Object.keys(req.body || {}).filter(
                key => req.body[key] !== undefined
            );
            const { price, payment_password } = req.body || {};

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            // 只有发布者可以更新任务
            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限更新此任务'));
            }

            // 只有未开始的任务可以编辑
            if (task.status !== 'published') {
                return res.status(400).json(responseUtils.error('任务状态不允许编辑'));
            }

            const allowedKeys = ['price', 'payment_password'];
            const hasOnlyAllowedKeys =
                payloadKeys.length > 0 && payloadKeys.every(key => allowedKeys.includes(key));

            if (hasOnlyAllowedKeys && payloadKeys.includes('price')) {
                const nextPrice = parseAmount(price);
                if (!nextPrice || nextPrice <= 0) {
                    return res.status(400).json(responseUtils.error('任务报酬必须大于0'));
                }

                const currentPrice = parseAmount(task.price);
                if (nextPrice === currentPrice) {
                    const sameTask = await Task.findByPk(id, {
                        include: [
                            {
                                model: User,
                                as: 'publisher',
                                attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                            },
                        ],
                    });
                    return res.json(responseUtils.success(sameTask, '任务金额未变化'));
                }

                const dbTransaction = await Task.sequelize.transaction();
                try {
                    if (task.payment_status !== 'unpaid') {
                        throw new Error('当前任务支付状态不允许修改金额');
                    }

                    const wallet = await Wallet.findOne({
                        where: { user_id: task.publisher_id },
                        transaction: dbTransaction,
                        lock: dbTransaction.LOCK.UPDATE,
                    });

                    if (!wallet || !wallet.payment_password_set || !wallet.payment_password) {
                        throw new Error('请先设置支付密码');
                    }

                    if (!/^\d{6}$/.test(String(payment_password || ''))) {
                        throw new Error('请输入 6 位支付密码');
                    }

                    const encryptedPassword = cryptoUtils.sha256(String(payment_password));
                    if (wallet.payment_password !== encryptedPassword) {
                        throw new Error('支付密码错误');
                    }

                    if (nextPrice > currentPrice) {
                        await freezeTaskFunds(
                            task.publisher_id,
                            nextPrice - currentPrice,
                            dbTransaction
                        );
                    } else {
                        await releaseTaskFunds(
                            task.publisher_id,
                            currentPrice - nextPrice,
                            dbTransaction
                        );
                    }

                    await task.update({ price: nextPrice }, { transaction: dbTransaction });
                    await dbTransaction.commit();
                } catch (error) {
                    await dbTransaction.rollback();
                    throw error;
                }
            } else {
                return res
                    .status(400)
                    .json(responseUtils.error('当前仅支持修改任务金额，不能修改任务内容'));
            }

            const updatedTask = await Task.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                ],
            });

            res.json(responseUtils.success(updatedTask, '任务金额更新成功'));
        } catch (error) {
            console.error('更新任务失败:', error);
            const errorMessage = error.message || '更新任务失败';
            const isBusinessError = [
                '余额不足',
                '当前任务支付状态不允许修改金额',
                '请先设置支付密码',
                '请输入 6 位支付密码',
                '支付密码错误',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '更新任务失败'));
        }
    }

    // 删除任务
    static async deleteTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            // 只有发布者可以删除任务
            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限删除此任务'));
            }

            // 只有未开始的任务可以删除
            if (task.status !== 'published') {
                return res.status(400).json(responseUtils.error('任务状态不允许删除'));
            }

            const dbTransaction = await Task.sequelize.transaction();
            try {
                if (task.payment_status === 'unpaid') {
                    await releaseTaskFunds(
                        task.publisher_id,
                        parseAmount(task.price),
                        dbTransaction
                    );
                }

                await Task.destroy({
                    where: { id: task.id },
                    transaction: dbTransaction,
                });

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            res.json(responseUtils.success(null, '任务删除成功'));
        } catch (error) {
            console.error('删除任务失败:', error);
            return res.status(500).json(responseUtils.error('删除任务失败'));
        }
    }

    // 取消发布任务
    static async cancelTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限取消此任务'));
            }

            if (!['pending', 'published'].includes(task.status)) {
                return res.status(400).json(responseUtils.error('当前任务状态不允许取消发布'));
            }

            const dbTransaction = await Task.sequelize.transaction();
            try {
                if (task.payment_status === 'unpaid') {
                    await releaseTaskFunds(
                        task.publisher_id,
                        parseAmount(task.price),
                        dbTransaction
                    );
                }

                await task.update(
                    {
                        status: 'cancelled',
                        cancel_reason: '用户主动取消发布',
                        payment_status:
                            task.payment_status === 'unpaid' ? 'refunded' : task.payment_status,
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            return res.json(responseUtils.success(task, '任务已取消发布'));
        } catch (error) {
            console.error('取消发布任务失败:', error);
            return res.status(500).json(responseUtils.error('取消发布任务失败'));
        }
    }

    // 申请任务
    static async applyForTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const applicationData = req.body;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            // 检查任务状态
            if (task.status !== 'published') {
                return res.status(400).json(responseUtils.error('任务不可申请'));
            }

            // 不能申请自己发布的任务
            if (task.publisher_id === userId) {
                return res.status(400).json(responseUtils.error('不能申请自己发布的任务'));
            }

            // 检查是否已经申请过
            const existingApplication = await TaskApplication.findOne({
                where: { task_id: id, applicant_id: userId },
            });

            if (existingApplication) {
                return res.status(400).json(responseUtils.error('已经申请过此任务'));
            }

            const application = await TaskApplication.create({
                task_id: id,
                applicant_id: userId,
                ...applicationData,
            });

            const applicationWithApplicant = await TaskApplication.findByPk(application.id, {
                include: [
                    {
                        model: User,
                        as: 'applicant',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating', 'skills'],
                    },
                ],
            });

            res.json(responseUtils.success(applicationWithApplicant, '申请提交成功'));
        } catch (error) {
            console.error('申请任务失败:', error);
            return res.status(500).json(responseUtils.error('申请任务失败'));
        }
    }

    // 获取任务申请列表
    static async getApplications(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            // 只有发布者可以查看申请列表
            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限查看申请列表'));
            }

            const applications = await TaskApplication.findAll({
                where: { task_id: id },
                include: [
                    {
                        model: User,
                        as: 'applicant',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'rating',
                            'skills',
                            'college',
                            'major',
                            'completed_tasks',
                            'completed_orders',
                        ],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            const enrichedApplications = await Promise.all(
                applications.map(async application => {
                    const data = application.toJSON();
                    data.applicant_profile = await buildApplicantProfileSnapshot(data.applicant);
                    return data;
                })
            );

            res.json(responseUtils.success(enrichedApplications));
        } catch (error) {
            console.error('获取申请列表失败:', error);
            return res.status(500).json(responseUtils.error('获取申请列表失败'));
        }
    }

    // 处理任务申请（接受/拒绝）
    static async handleApplication(req, res) {
        try {
            const { id, applicationId } = req.params;
            const { action, message } = req.body; // accept 或 reject
            const userId = req.user.id;

            const task = await Task.findByPk(id);
            const application = await TaskApplication.findByPk(applicationId);

            if (!task || !application) {
                return res.status(404).json(responseUtils.error('任务或申请不存在'));
            }

            // 只有发布者可以处理申请
            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限处理此申请'));
            }

            if (action === 'accept') {
                // 接受申请
                await application.update({
                    status: 'accepted',
                    response_message: message,
                    response_time: new Date(),
                });

                // 更新任务状态和指派人
                await task.update({
                    status: 'in_progress',
                    assignee_id: application.applicant_id,
                    accept_time: new Date(),
                });

                // 拒绝其他申请
                await TaskApplication.update(
                    {
                        status: 'rejected',
                        response_message: '任务已被其他申请者接受',
                        response_time: new Date(),
                    },
                    {
                        where: {
                            task_id: id,
                            id: { [Op.ne]: applicationId },
                            status: 'pending',
                        },
                    }
                );

                res.json(responseUtils.success(null, '申请已接受'));
            } else if (action === 'reject') {
                // 拒绝申请
                await application.update({
                    status: 'rejected',
                    response_message: message,
                    response_time: new Date(),
                });

                res.json(responseUtils.success(null, '申请已拒绝'));
            } else {
                return res.status(400).json(responseUtils.error('无效的操作'));
            }
        } catch (error) {
            console.error('处理申请失败:', error);
            return res.status(500).json(responseUtils.error('处理申请失败'));
        }
    }

    // 完成任务
    static async completeTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { submission_note, attachments } = req.body;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            await expireTaskCancellationIfNeeded(task);

            // 只有接受者可以提交完成
            if (task.assignee_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限操作此任务'));
            }

            if (task.status !== 'in_progress') {
                return res.status(400).json(responseUtils.error('任务状态不允许提交'));
            }

            assertNoBlockingCancellation(task);

            if (task.submit_time) {
                return res
                    .status(400)
                    .json(responseUtils.error('你已经提交过完成申请，请等待发布者确认'));
            }

            await task.update({
                submit_time: new Date(),
                submission_note,
                attachments,
            });

            res.json(responseUtils.success(null, '已提交完成申请，请等待发布者确认'));
        } catch (error) {
            console.error('完成任务失败:', error);
            const errorMessage = error.message || '完成任务失败';
            const isBusinessError = ['当前任务存在待确认的取消申请', '当前任务正在争议处理中'].some(
                message => errorMessage.includes(message)
            );
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '完成任务失败'));
        }
    }

    // 发布者确认任务完成
    static async confirmTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { payment_password } = req.body;

            const dbTransaction = await Task.sequelize.transaction();
            let task;

            try {
                task = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!task) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('任务不存在'));
                }

                await expireTaskCancellationIfNeeded(task, dbTransaction);

                if (task.publisher_id !== userId) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限确认此任务'));
                }

                if (task.status !== 'in_progress') {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('当前任务状态不允许确认完成'));
                }

                assertNoBlockingCancellation(task);

                if (!task.submit_time) {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('申请人尚未提交完成申请'));
                }

                await task.update(
                    {
                        status: 'completed',
                        complete_time: new Date(),
                        payment_status: 'paid',
                    },
                    { transaction: dbTransaction }
                );

                await settleTaskPayment(task, payment_password, dbTransaction);

                await dbTransaction.commit();
                return res.json(responseUtils.success(task, '任务已确认完成'));
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('确认任务完成失败:', error);
            const errorMessage = error.message || '确认任务完成失败';
            const isBusinessError = [
                '请先设置支付密码',
                '请输入支付密码',
                '支付密码错误',
                '冻结金额不足',
                '用户不存在',
                '当前任务存在待确认的取消申请',
                '当前任务正在争议处理中',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '确认任务完成失败'));
        }
    }

    // 发布者评价任务承接人
    static async rateTask(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const { rating, comment } = req.body;

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

            if (task.publisher_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限评价此任务'));
            }

            if (task.status !== 'completed') {
                return res.status(400).json(responseUtils.error('只有已完成的任务才能评价'));
            }

            if (!task.assignee_id) {
                return res.status(400).json(responseUtils.error('任务没有承接人，无法评价'));
            }

            const normalizedRating = Number(rating);
            if (
                !Number.isInteger(normalizedRating) ||
                normalizedRating < 1 ||
                normalizedRating > 5
            ) {
                return res.status(400).json(responseUtils.error('评分必须是 1 到 5 的整数'));
            }

            if (task.rating) {
                return res.status(400).json(responseUtils.error('该任务已经评价过了'));
            }

            await task.update({
                rating: normalizedRating,
                rating_comment: comment ? String(comment).trim() : null,
            });

            await syncUserCompositeRating(task.assignee_id);

            const ratedTask = await Task.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                    {
                        model: User,
                        as: 'assignee',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'rating',
                            'completed_tasks',
                            'completed_orders',
                        ],
                    },
                ],
            });

            return res.json(responseUtils.success(ratedTask, '评价成功'));
        } catch (error) {
            console.error('评价任务失败:', error);
            return res.status(500).json(responseUtils.error('评价任务失败'));
        }
    }

    // 发起任务取消协商
    static async requestCancellation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const reason = String(req.body?.reason || '').trim();
            const compensationAmount = parseAmount(req.body?.compensation);

            if (!reason) {
                return res.status(400).json(responseUtils.error('请输入取消原因'));
            }

            if (Number.isNaN(compensationAmount) || compensationAmount < 0) {
                return res.status(400).json(responseUtils.error('赔偿金额不能小于 0'));
            }

            const dbTransaction = await Task.sequelize.transaction();

            try {
                const task = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!task) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('任务不存在'));
                }

                await expireTaskCancellationIfNeeded(task, dbTransaction);

                if (!isTaskParticipant(task, userId)) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限操作此任务'));
                }

                if (task.status !== 'in_progress' || !task.assignee_id) {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前任务状态不允许发起取消协商'));
                }

                if (task.cancellation_status === 'pending') {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前已有待确认的取消申请，请先等待对方处理'));
                }

                if (task.cancellation_status === 'disputed') {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前任务已进入争议处理，暂时无法再次发起取消'));
                }

                if (
                    Number(userId) === Number(task.publisher_id) &&
                    compensationAmount > parseAmount(task.price)
                ) {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('赔偿金额不能超过当前任务金额'));
                }

                if (Number(userId) === Number(task.assignee_id) && compensationAmount > 0) {
                    const { wallet } = await getLockedUserAndWallet(userId, dbTransaction);
                    if (parseAmount(wallet.balance) < compensationAmount) {
                        throw new Error('当前余额不足，无法设置该赔偿金额');
                    }
                }

                const now = new Date();
                const expiresAt = new Date(now.getTime() + TASK_CANCELLATION_TIMEOUT_MS);

                await task.update(
                    {
                        cancellation_status: 'pending',
                        cancellation_initiator_id: userId,
                        cancellation_reason: reason,
                        cancellation_compensation: compensationAmount,
                        cancellation_requested_at: now,
                        cancellation_expires_at: expiresAt,
                        cancellation_responded_at: null,
                        cancellation_ticket_id: null,
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
                return res.json(responseUtils.success(null, '取消申请已发出，等待对方确认'));
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('发起任务取消协商失败:', error);
            const errorMessage = error.message || '发起任务取消协商失败';
            const isBusinessError = [
                '请输入取消原因',
                '赔偿金额不能小于 0',
                '赔偿金额不能超过当前任务金额',
                '当前余额不足',
                '当前任务状态不允许发起取消协商',
                '当前已有待确认的取消申请',
                '当前任务已进入争议处理',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '发起任务取消协商失败'));
        }
    }

    // 响应任务取消协商
    static async respondCancellation(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const action = String(req.body?.action || '').trim();

            if (!['accept', 'reject'].includes(action)) {
                return res.status(400).json(responseUtils.error('取消协商操作不正确'));
            }

            const dbTransaction = await Task.sequelize.transaction();

            try {
                const task = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!task) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('任务不存在'));
                }

                await expireTaskCancellationIfNeeded(task, dbTransaction);

                if (!isTaskParticipant(task, userId)) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限操作此任务'));
                }

                if (task.status !== 'in_progress' || !task.assignee_id) {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前任务状态不允许处理取消协商'));
                }

                if (task.cancellation_status !== 'pending') {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('当前没有待处理的取消申请'));
                }

                if (Number(task.cancellation_initiator_id) === Number(userId)) {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('不能处理自己发起的取消申请'));
                }

                if (action === 'reject') {
                    await task.update(
                        {
                            cancellation_status: 'rejected',
                            cancellation_responded_at: new Date(),
                        },
                        { transaction: dbTransaction }
                    );

                    await dbTransaction.commit();
                    return res.json(responseUtils.success(null, '已拒绝取消申请'));
                }

                await settleAcceptedCancellation(task, dbTransaction);

                await task.update(
                    {
                        status: 'cancelled',
                        payment_status: 'refunded',
                        cancel_reason: task.cancellation_reason || '双方协商取消任务',
                        cancellation_status: 'accepted',
                        cancellation_responded_at: new Date(),
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
                return res.json(responseUtils.success(null, '任务已协商取消'));
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('处理任务取消协商失败:', error);
            const errorMessage = error.message || '处理任务取消协商失败';
            const isBusinessError = [
                '取消协商操作不正确',
                '当前任务状态不允许处理取消协商',
                '当前没有待处理的取消申请',
                '不能处理自己发起的取消申请',
                '赔偿方余额不足',
                '冻结金额不足',
                '赔偿金额不能超过当前任务金额',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '处理任务取消协商失败'));
        }
    }

    // 撤回任务取消协商
    static async withdrawCancellationRequest(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const dbTransaction = await Task.sequelize.transaction();

            try {
                const task = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!task) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('任务不存在'));
                }

                await expireTaskCancellationIfNeeded(task, dbTransaction);

                if (!isTaskParticipant(task, userId)) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限操作此任务'));
                }

                if (task.cancellation_status !== 'pending') {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('当前没有可撤回的取消申请'));
                }

                if (Number(task.cancellation_initiator_id) !== Number(userId)) {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('只能撤回自己发起的取消申请'));
                }

                await task.update(buildCancellationResetPayload(), { transaction: dbTransaction });

                await dbTransaction.commit();
                return res.json(responseUtils.success(null, '取消申请已撤回'));
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('撤回任务取消协商失败:', error);
            const errorMessage = error.message || '撤回任务取消协商失败';
            const isBusinessError = ['当前没有可撤回的取消申请', '只能撤回自己发起的取消申请'].some(
                message => errorMessage.includes(message)
            );
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '撤回任务取消协商失败'));
        }
    }

    // 创建取消协商争议工单
    static async createCancellationTicket(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const description = String(req.body?.description || '').trim();

            const dbTransaction = await Task.sequelize.transaction();

            try {
                const task = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                if (!task) {
                    await dbTransaction.rollback();
                    return res.status(404).json(responseUtils.error('任务不存在'));
                }

                await expireTaskCancellationIfNeeded(task, dbTransaction);

                if (!isTaskParticipant(task, userId)) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限操作此任务'));
                }

                if (task.status !== 'in_progress' || !task.assignee_id) {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前任务状态不允许创建争议工单'));
                }

                if (task.cancellation_status !== 'rejected') {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('只有取消协商被拒绝后才能创建工单'));
                }

                if (task.cancellation_ticket_id) {
                    await dbTransaction.rollback();
                    return res.status(400).json(responseUtils.error('当前任务已创建过争议工单'));
                }

                const ticket = await ServiceTicket.create(
                    {
                        ticket_no: generateTicketNo(),
                        type: 'dispute',
                        title: `任务取消争议：${task.title}`,
                        description:
                            description ||
                            `任务取消协商未达成一致。协商原因：${task.cancellation_reason || '未填写'}`,
                        priority: 'high',
                        status: 'pending',
                        task_id: task.id,
                        user_id: userId,
                        service_id: null,
                    },
                    { transaction: dbTransaction }
                );

                await task.update(
                    {
                        cancellation_status: 'disputed',
                        cancellation_ticket_id: ticket.id,
                        cancellation_responded_at: new Date(),
                    },
                    { transaction: dbTransaction }
                );

                await dbTransaction.commit();
                return res.json(responseUtils.success(ticket, '争议工单已创建，请等待客服介入'));
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }
        } catch (error) {
            console.error('创建任务争议工单失败:', error);
            const errorMessage = error.message || '创建任务争议工单失败';
            const isBusinessError = [
                '当前任务状态不允许创建争议工单',
                '只有取消协商被拒绝后才能创建工单',
                '当前任务已创建过争议工单',
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '创建任务争议工单失败'));
        }
    }

    // 获取我的任务（发布的和接受的）
    static async getMyTasks(req, res) {
        try {
            const userId = req.user.id;
            const { type = 'all', status, page = 1, limit = 10 } = req.query;

            const offset = (page - 1) * limit;
            let where = {};
            const validStatuses = [
                'pending',
                'published',
                'in_progress',
                'completed',
                'cancelled',
                'expired',
            ];

            if (status && !validStatuses.includes(status)) {
                return res.status(400).json(responseUtils.error('任务状态参数不正确'));
            }

            const publishedTasks = await Task.findAll({
                where: { publisher_id: userId },
                attributes: ['id'],
                raw: true,
            });
            const assignedTasks = await Task.findAll({
                where: { assignee_id: userId },
                attributes: ['id'],
                raw: true,
            });
            const appliedTaskApplications = await TaskApplication.findAll({
                where: {
                    applicant_id: userId,
                    status: {
                        [Op.in]: ['pending', 'accepted'],
                    },
                },
                include: [
                    {
                        model: Task,
                        as: 'task',
                        attributes: ['id', 'status'],
                        required: true,
                        where: status ? { status } : undefined,
                    },
                ],
                attributes: ['task_id'],
            });

            const publishedTaskIds = publishedTasks.map(item => Number(item.id));
            const assignedTaskIds = assignedTasks.map(item => Number(item.id));
            const appliedTaskIds = [
                ...new Set(
                    appliedTaskApplications.map(item => Number(item.task?.id || item.task_id))
                ),
            ];

            if (type === 'published') {
                where.id = {
                    [Op.in]: publishedTaskIds.length ? publishedTaskIds : [-1],
                };
            } else if (type === 'assigned') {
                const allAssignedIds = [...new Set([...assignedTaskIds, ...appliedTaskIds])];
                where.id = {
                    [Op.in]: allAssignedIds.length ? allAssignedIds : [-1],
                };
            } else {
                const allTaskIds = [
                    ...new Set([...publishedTaskIds, ...assignedTaskIds, ...appliedTaskIds]),
                ];
                where.id = {
                    [Op.in]: allTaskIds.length ? allTaskIds : [-1],
                };
            }

            if (status && type !== 'assigned') {
                where.status = status;
            }

            const { count, rows } = await Task.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                    {
                        model: User,
                        as: 'assignee',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                        required: false,
                    },
                ],
                order: [['created_at', 'DESC']],
                offset: parseInt(offset),
                limit: parseInt(limit),
            });

            await Promise.all(rows.map(item => expireTaskCancellationIfNeeded(item)));

            const result = {
                tasks: rows,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };

            res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取我的任务失败:', error);
            return res.status(500).json(responseUtils.error('获取我的任务失败'));
        }
    }
}

module.exports = TaskController;
