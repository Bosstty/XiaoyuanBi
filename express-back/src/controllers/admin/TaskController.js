const { Task, User, TaskApplication, Wallet, ContentReport } = require('../../models');
const { Op } = require('sequelize');
const AdminActionNotificationService = require('../../services/AdminActionNotificationService');

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

async function releaseTaskFunds(task, transaction) {
    if (task.payment_status !== 'unpaid') {
        return;
    }

    const amount = parseAmount(task.price);
    const { user, wallet } = await getLockedUserAndWallet(task.publisher_id, transaction);
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

    await task.update(
        {
            payment_status: 'refunded',
        },
        { transaction }
    );
}

/**
 * 任务管理控制器
 * Task Management Controller
 */
class TaskController {
    /** 
     * 获取任务列表
     * Get tasks list with pagination and filters
     */
    static async getTasks(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                status,
                category,
                userId,
                startDate,
                endDate,
                keyword,
            } = req.query;

            const offset = (page - 1) * limit;
            const where = {};

            // 构建查询条件
            if (status) where.status = status;
            if (category) where.category = category;
            if (userId) where.publisher_id = userId;

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at[Op.gte] = new Date(startDate);
                if (endDate) {
                    // 结束日期设置为当天 23:59:59，确保包含当天所有数据
                    const endDateObj = new Date(endDate);
                    endDateObj.setHours(23, 59, 59, 999);
                    where.created_at[Op.lte] = endDateObj;
                }
            }

            if (keyword) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${keyword}%` } },
                    { description: { [Op.like]: `%${keyword}%` } },
                ];
            }

            const { count, rows: tasks } = await Task.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: parseInt(offset),
                include: [
                    {
                        model: User,
                        as: 'publisher',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                    },
                    {
                        model: User,
                        as: 'assignee',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                    },
                ],
                order: [['created_at', 'DESC']],
            });

            return res.json({
                success: true,
                message: '获取任务列表成功',
                data: {
                    tasks,
                    pagination: {
                        total: count,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: Math.ceil(count / limit),
                    },
                },
            });
        } catch (error) {
            console.error('Get tasks error:', error);
            return res.status(500).json({
                success: false,
                message: '获取任务列表失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取任务详情
     * Get task detail by ID
     */
    static async getTaskDetail(req, res) {
        try {
            const { id } = req.params;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '任务ID不能为空',
                });
            }

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
                            'phone',
                            'student_id',
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
                            'phone',
                            'student_id',
                        ],
                    },
                    {
                        model: TaskApplication,
                        as: 'applications',
                        include: [
                            {
                                model: User,
                                as: 'applicant',
                                attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
                            },
                        ],
                    },
                ],
            });

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: '任务不存在',
                });
            }

            const reportCount = await ContentReport.count({
                where: { biz_type: 'task', biz_id: id, status: 'pending' },
            });

            return res.json({
                success: true,
                message: '获取任务详情成功',
                data: {
                    ...task.toJSON(),
                    reportCount,
                },
            });
        } catch (error) {
            console.error('Get task detail error:', error);
            return res.status(500).json({
                success: false,
                message: '获取任务详情失败',
                error: error.message,
            });
        }
    }

    /**
     * 更新任务状态
     * Update task status
     */
    static async updateTaskStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            if (!id || !status) {
                return res.status(400).json({
                    success: false,
                    message: '任务ID和状态不能为空',
                });
            }

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: '任务不存在',
                });
            }

            // 验证状态转换是否合法
            const allowedTransitions = {
                pending: ['published', 'cancelled'],
                published: ['in_progress', 'cancelled', 'expired'],
                in_progress: ['completed', 'cancelled'],
                completed: [],
                cancelled: [],
                expired: [],
            };

            if (!allowedTransitions[task.status]?.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `任务状态不能从 ${task.status} 转换为 ${status}`,
                });
            }

            const dbTransaction = await Task.sequelize.transaction();

            try {
                const lockedTask = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                lockedTask.status = status;
                if (status === 'in_progress') {
                    lockedTask.accept_time = new Date();
                } else if (status === 'completed') {
                    lockedTask.complete_time = new Date();
                } else if (status === 'cancelled') {
                    lockedTask.cancel_reason = reason;
                }

                await lockedTask.save({ transaction: dbTransaction });

                if (['cancelled', 'expired'].includes(status)) {
                    await releaseTaskFunds(lockedTask, dbTransaction);
                }

                await dbTransaction.commit();

                if (['cancelled', 'expired', 'published'].includes(status)) {
                    await AdminActionNotificationService.notifyUser({
                        userId: lockedTask.publisher_id,
                        adminUser: req.user,
                        entityType: 'task',
                        entityId: lockedTask.id,
                        entityTitle: lockedTask.title,
                        action: status,
                        reason,
                    });
                }

                return res.json({
                    success: true,
                    message: '任务状态更新成功',
                    data: lockedTask,
                });
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

        } catch (error) {
            console.error('Update task status error:', error);
            return res.status(500).json({
                success: false,
                message: '更新任务状态失败',
                error: error.message,
            });
        }
    }

    /**
     * 删除任务
     * Delete task (soft delete)
     */
    static async deleteTask(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            if (!id) {
                return res.status(400).json({
                    success: false,
                    message: '任务ID不能为空',
                });
            }

            const task = await Task.findByPk(id);

            if (!task) {
                return res.status(404).json({
                    success: false,
                    message: '任务不存在',
                });
            }

            if (['in_progress', 'completed'].includes(task.status)) {
                return res.status(400).json({
                    success: false,
                    message: '该状态的任务不能删除',
                });
            }

            const dbTransaction = await Task.sequelize.transaction();
            try {
                const lockedTask = await Task.findByPk(id, {
                    transaction: dbTransaction,
                    lock: dbTransaction.LOCK.UPDATE,
                });

                lockedTask.status = 'cancelled';
                lockedTask.cancel_reason = reason;
                await lockedTask.save({ transaction: dbTransaction });
                await releaseTaskFunds(lockedTask, dbTransaction);

                await dbTransaction.commit();
            } catch (error) {
                await dbTransaction.rollback();
                throw error;
            }

            await AdminActionNotificationService.notifyUser({
                userId: task.publisher_id,
                adminUser: req.user,
                entityType: 'task',
                entityId: task.id,
                entityTitle: task.title,
                action: 'delete',
                reason,
            });

            return res.json({
                success: true,
                message: '任务已删除',
                data: task,
            });
        } catch (error) {
            console.error('Delete task error:', error);
            return res.status(500).json({
                success: false,
                message: '删除任务失败',
                error: error.message,
            });
        }
    }

    /**
     * 获取任务统计
     * Get task statistics
     */
    static async getTaskStats(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const where = {};

            if (startDate || endDate) {
                where.created_at = {};
                if (startDate) where.created_at[Op.gte] = new Date(startDate);
                if (endDate) {
                    // 结束日期设置为当天 23:59:59，确保包含当天所有数据
                    const endDateObj = new Date(endDate);
                    endDateObj.setHours(23, 59, 59, 999);
                    where.created_at[Op.lte] = endDateObj;
                }
            }

            // 任务状态统计
            const statusStats = await Task.findAll({
                where,
                attributes: [
                    'status',
                    [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count'],
                    [Task.sequelize.fn('SUM', Task.sequelize.col('price')), 'totalReward'],
                ],
                group: ['status'],
            });

            // 任务分类统计
            const categoryStats = await Task.findAll({
                where,
                attributes: [
                    'category',
                    [Task.sequelize.fn('COUNT', Task.sequelize.col('id')), 'count'],
                ],
                group: ['category'],
            });

            // 总体统计
            const totalTasks = await Task.count({ where });
            const totalReward = (await Task.sum('price', { where })) || 0;
            const avgReward = totalTasks > 0 ? totalReward / totalTasks : 0;

            // 今日统计
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const todayTasks = await Task.count({
                where: {
                    ...where,
                    created_at: { [Op.gte]: today },
                },
            });

            // 待审核任务数
            const pendingApproval = await Task.count({
                where: {
                    ...where,
                    status: 'pending',
                },
            });

            return res.json({
                success: true,
                message: '获取任务统计成功',
                data: {
                    statusStats,
                    categoryStats,
                    overview: {
                        totalTasks,
                        totalReward,
                        avgReward,
                        todayTasks,
                        pendingApproval,
                    },
                },
            });
        } catch (error) {
            console.error('Get task stats error:', error);
            return res.status(500).json({
                success: false,
                message: '获取任务统计失败',
                error: error.message,
            });
        }
    }
}

module.exports = TaskController;
