const {
    User,
    PickupOrder,
    Task,
    ForumPost,
    Deliverer,
    Admin,
    ChatConversation,
    ChatMessage,
} = require('../../models');
const { responseUtils, paginationUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

const DEFAULT_SERVICE_ID = 1;

const sendStudentVerificationMessage = async (userId, adminId, content) => {
    const serviceId = adminId || DEFAULT_SERVICE_ID;

    let conversation = await ChatConversation.findOne({
        where: {
            type: 'user_service',
            user_id: userId,
            service_id: serviceId,
            status: 'open',
        },
    });

    if (!conversation) {
        conversation = await ChatConversation.create({
            user_id: userId,
            service_id: serviceId,
            type: 'user_service',
            status: 'open',
            last_message: content,
            last_message_at: new Date(),
        });
    }

    await ChatMessage.create({
        conversation_id: conversation.id,
        sender_id: serviceId,
        sender_type: 'service',
        receiver_type: 'user',
        content,
        type: 'system',
        is_read: false,
    });

    await conversation.update({
        last_message: content,
        last_message_at: new Date(),
    });
};

class AdminUserController {
    // 获取用户列表
    static async getUsers(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                search,
                status,
                student_verified,
                college,
                sort_by = 'created_at',
                sort_order = 'DESC',
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = {};

            if (search) {
                where[Op.or] = [
                    { username: { [Op.like]: `%${search}%` } },
                    { real_name: { [Op.like]: `%${search}%` } },
                    { email: { [Op.like]: `%${search}%` } },
                    { student_id: { [Op.like]: `%${search}%` } },
                ];
            }

            if (status) where.status = status;
            if (student_verified !== undefined)
                where.student_verified = student_verified === 'true';
            if (college) where.college = college;

            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: { exclude: ['password'] },
                order: [[sort_by, sort_order.toUpperCase()]],
                offset,
                limit: queryLimit,
            });

            const pagination = paginationUtils.formatPaginatedResponse(rows, page, limit, count);

            res.json(
                responseUtils.paginated(pagination.data, pagination.pagination, '获取用户列表成功')
            );
        } catch (error) {
            console.error('获取用户列表失败:', error);
            res.status(500).json(responseUtils.error('获取用户列表失败'));
        }
    }

    // 获取用户详情
    static async getUserDetail(req, res) {
        try {
            const { id } = req.params;

            const user = await User.findByPk(id, {
                attributes: { exclude: ['password'] },
                include: [
                    {
                        model: PickupOrder,
                        // 与 User.hasMany(PickupOrder, { as: 'orders', foreignKey: 'user_id' })
                        as: 'orders',
                        attributes: ['id', 'order_no', 'status', 'price', 'created_at'],
                    },
                    {
                        model: Task,
                        as: 'publishedTasks',
                        attributes: ['id', 'title', 'status', 'price', 'created_at'],
                    },
                ],
            });

            if (!user) {
                return res.status(404).json(responseUtils.error('用户不存在'));
            }

            // 获取用户统计信息
            const stats = await Promise.all([
                PickupOrder.count({ where: { user_id: id } }),
                PickupOrder.count({ where: { user_id: id, status: 'completed' } }),
                Task.count({ where: { publisher_id: id } }),
                Task.count({ where: { assignee_id: id } }),
                ForumPost.count({ where: { author_id: id } }),
            ]);

            const userDetail = {
                ...user.toJSON(),
                stats: {
                    total_orders: stats[0],
                    completed_orders: stats[1],
                    published_tasks: stats[2],
                    completed_tasks: stats[3],
                    forum_posts: stats[4],
                },
            };

            res.json(responseUtils.success(userDetail, '获取用户详情成功'));
        } catch (error) {
            console.error('获取用户详情失败:', error);
            res.status(500).json(responseUtils.error('获取用户详情失败'));
        }
    }

    // 更新用户状态
    static async updateUserStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;
            console.log('Received status:', status, 'reason:', reason);

            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json(responseUtils.error('用户不存在'));
            }

            await user.update({
                status,
                status_reason: reason,
                status_updated_at: new Date(),
            });

            res.json(responseUtils.success(user, '用户状态更新成功'));
        } catch (error) {
            console.error('更新用户状态失败:', error);
            res.status(500).json(responseUtils.error('更新用户状态失败'));
        }
    }

    // 验证学生身份
    static async verifyStudent(req, res) {
        try {
            const { id } = req.params;
            const { verified, reason } = req.body;
            const isVerified = verified === true || verified === 'true';

            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json(responseUtils.error('用户不存在'));
            }

            const wasVerified = Boolean(user.student_verified);

            if (!isVerified && !String(reason || '').trim()) {
                return res.status(400).json(responseUtils.error('请填写认证不通过原因'));
            }

            if (isVerified) {
                const verificationData = {
                    ...(user.verification_data || {}),
                    status: 'approved',
                    review_reason: null,
                    reviewed_at: new Date().toISOString(),
                };

                await user.update({
                    student_verified: true,
                    student_verified_at: new Date(),
                    verification_data: verificationData,
                });
            } else {
                await user.update({
                    student_verified: false,
                    student_verified_at: null,
                    verification_data: null,
                });

                await sendStudentVerificationMessage(
                    user.id,
                    req.admin?.id || req.user?.id,
                    wasVerified
                        ? `学生认证已取消，原因：${String(reason).trim()}`
                        : `学生认证未通过，原因：${String(reason).trim()}`
                );
            }

            if (isVerified) {
                await sendStudentVerificationMessage(
                    user.id,
                    req.admin?.id || req.user?.id,
                    '学生认证已通过，您的校园身份认证已完成。'
                );
            }

            await user.reload();

            res.json(responseUtils.success(user, '学生身份验证更新成功'));
        } catch (error) {
            console.error('验证学生身份失败:', error);
            res.status(500).json(responseUtils.error('验证学生身份失败'));
        }
    }

    // 重置用户密码
    static async resetUserPassword(req, res) {
        try {
            const { id } = req.params;
            const { new_password } = req.body;

            const user = await User.findByPk(id);

            if (!user) {
                return res.status(404).json(responseUtils.error('用户不存在'));
            }

            await user.update({
                password: new_password,
            });

            res.json(responseUtils.success(null, '密码重置成功'));
        } catch (error) {
            console.error('重置用户密码失败:', error);
            res.status(500).json(responseUtils.error('重置用户密码失败'));
        }
    }

    // 获取用户统计数据
    static async getUserStats(req, res) {
        try {
            const stats = await Promise.all([
                User.count(),
                User.count({ where: { status: 'active' } }),
                User.count({ where: { student_verified: true } }),
                User.count({
                    where: {
                        created_at: { [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
                    },
                }),
                User.count({
                    where: {
                        last_login_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
                    },
                }),
            ]);

            const result = {
                total_users: stats[0],
                active_users: stats[1],
                verified_users: stats[2],
                new_users_30d: stats[3],
                active_users_7d: stats[4],
            };

            res.json(responseUtils.success(result, '获取用户统计成功'));
        } catch (error) {
            console.error('获取用户统计失败:', error);
            res.status(500).json(responseUtils.error('获取用户统计失败'));
        }
    }

    // 导出用户数据
    static async exportUsers(req, res) {
        try {
            const { status, student_verified, college, start_date, end_date } = req.query;

            let where = {};

            if (status) where.status = status;
            if (student_verified !== undefined)
                where.student_verified = student_verified === 'true';
            if (college) where.college = college;
            if (start_date && end_date) {
                where.created_at = {
                    [Op.between]: [new Date(start_date), new Date(end_date)],
                };
            }

            const users = await User.findAll({
                where,
                attributes: { exclude: ['password'] },
                order: [['created_at', 'DESC']],
            });

            // 这里应该实现Excel导出逻辑
            // 暂时返回JSON数据
            res.json(responseUtils.success(users, '用户数据导出成功'));
        } catch (error) {
            console.error('导出用户数据失败:', error);
            res.status(500).json(responseUtils.error('导出用户数据失败'));
        }
    }

    // 批量操作用户
    static async batchUpdateUsers(req, res) {
        try {
            const { user_ids, action, data } = req.body;

            if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
                return res.status(400).json(responseUtils.error('请选择要操作的用户'));
            }

            let updateData = {};

            switch (action) {
                case 'activate':
                    updateData = { status: 'active' };
                    break;
                case 'deactivate':
                    updateData = { status: 'inactive' };
                    break;
                case 'verify':
                    updateData = { student_verified: true, student_verified_at: new Date() };
                    break;
                case 'unverify':
                    updateData = { student_verified: false, student_verified_at: null };
                    break;
                default:
                    return res.status(400).json(responseUtils.error('无效的操作类型'));
            }

            if (data) {
                updateData = { ...updateData, ...data };
            }

            const result = await User.update(updateData, {
                where: { id: { [Op.in]: user_ids } },
            });

            res.json(
                responseUtils.success(
                    { affected_count: result[0] },
                    `批量${action}操作成功，共影响${result[0]}个用户`
                )
            );
        } catch (error) {
            console.error('批量操作用户失败:', error);
            res.status(500).json(responseUtils.error('批量操作用户失败'));
        }
    }

    // 获取用户活动日志
    static async getUserActivityLog(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            // 这里应该从审计日志表中获取用户活动记录
            // 暂时返回模拟数据
            const activities = [
                {
                    id: 1,
                    action: 'login',
                    description: '用户登录',
                    ip: '192.168.1.1',
                    user_agent: 'Mozilla/5.0...',
                    created_at: new Date(),
                },
            ];

            const count = activities.length;
            const pagination = paginationUtils.formatPaginatedResponse(
                activities,
                page,
                limit,
                count
            );

            res.json(
                responseUtils.paginated(
                    pagination.data,
                    pagination.pagination,
                    '获取用户活动日志成功'
                )
            );
        } catch (error) {
            console.error('获取用户活动日志失败:', error);
            res.status(500).json(responseUtils.error('获取用户活动日志失败'));
        }
    }
}

module.exports = AdminUserController;
