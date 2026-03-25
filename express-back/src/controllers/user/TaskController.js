const { Task, TaskApplication, User, Wallet, Transaction } = require('../../models');
const { responseUtils, orderUtils, cryptoUtils } = require('../../utils');
const { Op } = require('sequelize');

const parseAmount = value => Number(value || 0);

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
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
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
            transaction_no: `TX${Date.now()}${Math.random().toString().slice(2, 6)}`,
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

            const task = await Task.findByPk(id, {
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
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                        required: false,
                    },
                ],
            });

            if (!task) {
                return res.status(404).json(responseUtils.error('任务不存在'));
            }

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
            taskData.has_applied = Boolean(currentUserApplication?.status);
            taskData.current_user_application_status = currentUserApplication?.status || null;
            taskData.current_user_application = currentUserApplication || null;

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
            const updateData = req.body;

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

            await task.update(updateData);

            const updatedTask = await Task.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'rating'],
                    },
                ],
            });

            res.json(responseUtils.success(updatedTask, '任务更新成功'));
        } catch (error) {
            console.error('更新任务失败:', error);
            return res.status(500).json(responseUtils.error('更新任务失败'));
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
                    await releaseTaskFunds(task.publisher_id, parseAmount(task.price), dbTransaction);
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
                    await releaseTaskFunds(task.publisher_id, parseAmount(task.price), dbTransaction);
                }

                await task.update(
                    {
                        status: 'cancelled',
                        cancel_reason: '用户主动取消发布',
                        payment_status: task.payment_status === 'unpaid' ? 'refunded' : task.payment_status,
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
                        ],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            res.json(responseUtils.success(applications));
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

            // 只有接受者可以提交完成
            if (task.assignee_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限操作此任务'));
            }

            if (task.status !== 'in_progress') {
                return res.status(400).json(responseUtils.error('任务状态不允许提交'));
            }

            if (task.submit_time) {
                return res.status(400).json(responseUtils.error('你已经提交过完成申请，请等待发布者确认'));
            }

            await task.update({
                submit_time: new Date(),
                submission_note,
                attachments,
            });

            res.json(responseUtils.success(null, '已提交完成申请，请等待发布者确认'));
        } catch (error) {
            console.error('完成任务失败:', error);
            return res.status(500).json(responseUtils.error('完成任务失败'));
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

                if (task.publisher_id !== userId) {
                    await dbTransaction.rollback();
                    return res.status(403).json(responseUtils.error('无权限确认此任务'));
                }

                if (task.status !== 'in_progress') {
                    await dbTransaction.rollback();
                    return res
                        .status(400)
                        .json(responseUtils.error('当前任务状态不允许确认完成'));
                }

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
            ].some(message => errorMessage.includes(message));
            return res
                .status(isBusinessError ? 400 : 500)
                .json(responseUtils.error(isBusinessError ? errorMessage : '确认任务完成失败'));
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
