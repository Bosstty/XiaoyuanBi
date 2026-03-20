const { Task, TaskApplication, User } = require('../../models');
const { responseUtils, orderUtils } = require('../../utils');
const { Op } = require('sequelize');

class TaskController {
    // 创建任务
    static async createTask(req, res) {
        try {
            const userId = req.user.id;
            const taskData = req.body;

            // 生成任务号
            const taskNo = orderUtils.generateOrderNo('TK');

            const task = await Task.create({
                task_no: taskNo,
                publisher_id: userId,
                ...taskData,
            });

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
            return res.status(500).json(responseUtils.error('创建任务失败'));
        }
    }

    // 获取任务列表
    static async getTasks(req, res) {
        try {
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
            console.error('获取任务列表失败:', error);
            return res.status(500).json(responseUtils.error('获取任务列表失败'));
        }
    }

    // 获取任务详情
    static async getTaskById(req, res) {
        try {
            const { id } = req.params;

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

            res.json(responseUtils.success(task));
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

            await task.destroy();

            res.json(responseUtils.success(null, '任务删除成功'));
        } catch (error) {
            console.error('删除任务失败:', error);
            return res.status(500).json(responseUtils.error('删除任务失败'));
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

            await task.update({
                status: 'completed',
                submit_time: new Date(),
                complete_time: new Date(),
                submission_note,
                attachments,
            });

            res.json(responseUtils.success(null, '任务提交成功'));
        } catch (error) {
            console.error('完成任务失败:', error);
            return res.status(500).json(responseUtils.error('完成任务失败'));
        }
    }

    // 获取我的任务（发布的和接受的）
    static async getMyTasks(req, res) {
        try {
            const userId = req.user.id;
            const { type = 'all', page = 1, limit = 10 } = req.query;

            const offset = (page - 1) * limit;
            let where = {};

            if (type === 'published') {
                where.publisher_id = userId;
            } else if (type === 'assigned') {
                where.assignee_id = userId;
            } else {
                where[Op.or] = [{ publisher_id: userId }, { assignee_id: userId }];
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
