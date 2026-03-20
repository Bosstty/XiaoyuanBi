const { AuditLog, User, Admin } = require('../../models');
const { responseUtils, paginationUtils } = require('../../utils');
const { Op } = require('sequelize');

class AuditLogController {
    // 获取审计日志列表
    static async getAuditLogs(req, res) {
        try {
            const {
                page = 1,
                limit = 20,
                search,
                action,
                method,
                risk_level,
                success,
                user_id,
                admin_id,
                ip_address,
                start_date,
                end_date,
                sort_by = 'created_at',
                sort_order = 'DESC',
            } = req.query;

            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            let where = {};

            // 搜索 - 支持action和ip_address模糊搜索
            if (search) {
                where[Op.or] = [
                    { action: { [Op.like]: `%${search}%` } },
                    { ip_address: { [Op.like]: `%${search}%` } },
                ];
            }

            // 精确筛选
            if (action) where.action = { [Op.like]: `%${action}%` };
            if (method) where.method = method;
            if (risk_level) where.risk_level = risk_level;
            if (success !== undefined) where.success = success === 'true';
            if (user_id) where.user_id = user_id;
            if (admin_id) where.admin_id = admin_id;
            if (ip_address) where.ip_address = ip_address;

            // 日期范围筛选
            if (start_date || end_date) {
                where.created_at = {};
                if (start_date) where.created_at[Op.gte] = new Date(start_date);
                if (end_date) where.created_at[Op.lte] = new Date(end_date + ' 23:59:59');
            }

            const { count, rows } = await AuditLog.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'student_id'],
                        required: false,
                    },
                    {
                        model: Admin,
                        as: 'admin',
                        attributes: ['id', 'username', 'name'],
                        required: false,
                    },
                ],
                order: [[sort_by, sort_order.toUpperCase()]],
                offset,
                limit: queryLimit,
            });

            // 格式化返回数据
            const formattedRows = rows.map(log => {
                const logJson = log.toJSON();
                return {
                    ...logJson,
                    user: logJson.user
                        ? {
                              id: logJson.user.id,
                              username: logJson.user.username,
                              real_name: logJson.user.real_name,
                              student_id: logJson.user.student_id,
                          }
                        : null,
                    admin: logJson.admin
                        ? {
                              id: logJson.admin.id,
                              username: logJson.admin.username,
                              name: logJson.admin.name,
                          }
                        : null,
                };
            });

            const pagination = paginationUtils.formatPaginatedResponse(
                formattedRows,
                page,
                limit,
                count
            );

            res.json(
                responseUtils.paginated(pagination.data, pagination.pagination, '获取审计日志成功')
            );
        } catch (error) {
            console.error('获取审计日志失败:', error);
            res.status(500).json(responseUtils.error('获取审计日志失败'));
        }
    }

    // 获取审计日志详情
    static async getAuditLogDetail(req, res) {
        try {
            const { id } = req.params;

            const log = await AuditLog.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name', 'student_id', 'phone', 'email'],
                    },
                    {
                        model: Admin,
                        as: 'admin',
                        attributes: ['id', 'username', 'name', 'phone'],
                    },
                ],
            });

            if (!log) {
                return res.status(404).json(responseUtils.error('审计日志不存在'));
            }

            res.json(responseUtils.success(log, '获取审计日志详情成功'));
        } catch (error) {
            console.error('获取审计日志详情失败:', error);
            res.status(500).json(responseUtils.error('获取审计日志详情失败'));
        }
    }

    // 获取审计日志统计
    static async getAuditLogStats(req, res) {
        try {
            const { start_date, end_date, group_by = 'day' } = req.query;

            // 默认查询最近7天
            const startDate = start_date
                ? new Date(start_date)
                : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
            const endDate = end_date ? new Date(end_date + ' 23:59:59') : new Date();

            const where = {
                created_at: {
                    [Op.gte]: startDate,
                    [Op.lte]: endDate,
                },
            };

            // 1. 基础统计
            const [totalCount, todayCount, successCount, failCount, highRiskCount] =
                await Promise.all([
                    AuditLog.count({ where }),
                    AuditLog.count({
                        where: {
                            created_at: {
                                [Op.gte]: new Date(new Date().toDateString()),
                            },
                        },
                    }),
                    AuditLog.count({ where: { ...where, success: true } }),
                    AuditLog.count({ where: { ...where, success: false } }),
                    AuditLog.count({ where: { ...where, risk_level: 'high' } }),
                ]);

            // 2. 按日期分组统计
            const dateFormat = group_by === 'hour' ? '%Y-%m-%d %H:00' : '%Y-%m-%d';
            const dateGroupQuery = await AuditLog.findAll({
                attributes: [
                    [
                        require('sequelize').literal(`DATE_FORMAT(created_at, '${dateFormat}')`),
                        'date',
                    ],
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                where,
                group: [require('sequelize').literal(`DATE_FORMAT(created_at, '${dateFormat}')`)],
                order: [[require('sequelize').literal('date'), 'ASC']],
                raw: true,
            });

            // 3. 按风险等级统计
            const riskStats = await AuditLog.findAll({
                attributes: [
                    'risk_level',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                where,
                group: ['risk_level'],
                raw: true,
            });

            // 4. 按HTTP方法统计
            const methodStats = await AuditLog.findAll({
                attributes: [
                    'method',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                where,
                group: ['method'],
                raw: true,
            });

            // 5. 按操作类型统计（取前10）
            const actionStats = await AuditLog.findAll({
                attributes: [
                    'action',
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                where,
                group: ['action'],
                order: [[require('sequelize').literal('count'), 'DESC']],
                limit: 10,
                raw: true,
            });

            // 6. 按操作者类型统计
            const userTypeStats = await Promise.all([
                AuditLog.count({ where: { ...where, user_id: { [Op.ne]: null } } }),
                AuditLog.count({ where: { ...where, admin_id: { [Op.ne]: null } } }),
                AuditLog.count({ where: { ...where, user_id: null, admin_id: null } }),
            ]);

            // 7. 按响应状态统计
            const statusStats = await AuditLog.findAll({
                attributes: [
                    [
                        require('sequelize').literal(`CASE
                        WHEN response_status >= 200 AND response_status < 300 THEN '2xx'
                        WHEN response_status >= 300 AND response_status < 400 THEN '3xx'
                        WHEN response_status >= 400 AND response_status < 500 THEN '4xx'
                        WHEN response_status >= 500 THEN '5xx'
                        ELSE 'other'
                    END`),
                        'status_group',
                    ],
                    [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
                ],
                where,
                group: [
                    require('sequelize').literal(`CASE
                    WHEN response_status >= 200 AND response_status < 300 THEN '2xx'
                    WHEN response_status >= 300 AND response_status < 400 THEN '3xx'
                    WHEN response_status >= 400 AND response_status < 500 THEN '4xx'
                    WHEN response_status >= 500 THEN '5xx'
                    ELSE 'other'
                END`),
                ],
                raw: true,
            });

            res.json(
                responseUtils.success(
                    {
                        overview: {
                            total: totalCount,
                            today: todayCount,
                            success: successCount,
                            fail: failCount,
                            high_risk: highRiskCount,
                            success_rate:
                                totalCount > 0 ? ((successCount / totalCount) * 100).toFixed(2) : 0,
                        },
                        date_trend: dateGroupQuery,
                        risk_distribution: riskStats.reduce((acc, item) => {
                            acc[item.risk_level] = parseInt(item.count);
                            return acc;
                        }, {}),
                        method_distribution: methodStats.reduce((acc, item) => {
                            acc[item.method] = parseInt(item.count);
                            return acc;
                        }, {}),
                        top_actions: actionStats.map(item => ({
                            action: item.action,
                            count: parseInt(item.count),
                        })),
                        user_type_distribution: {
                            user: userTypeStats[0],
                            admin: userTypeStats[1],
                            anonymous: userTypeStats[2],
                        },
                        status_distribution: statusStats.reduce((acc, item) => {
                            acc[item.status_group] = parseInt(item.count);
                            return acc;
                        }, {}),
                    },
                    '获取审计日志统计成功'
                )
            );
        } catch (error) {
            console.error('获取审计日志统计失败:', error);
            res.status(500).json(responseUtils.error('获取审计日志统计失败'));
        }
    }

    // 获取高风险日志列表
    static async getHighRiskLogs(req, res) {
        try {
            const { page = 1, limit = 20 } = req.query;
            const { offset, limit: queryLimit } = paginationUtils.getPagination(page, limit);

            const { count, rows } = await AuditLog.findAndCountAll({
                where: {
                    risk_level: { [Op.in]: ['high', 'critical'] },
                },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'username', 'real_name'],
                        required: false,
                    },
                    {
                        model: Admin,
                        as: 'admin',
                        attributes: ['id', 'username', 'name'],
                        required: false,
                    },
                ],
                order: [['created_at', 'DESC']],
                offset,
                limit: queryLimit,
            });

            const pagination = paginationUtils.formatPaginatedResponse(rows, page, limit, count);

            res.json(
                responseUtils.paginated(
                    pagination.data,
                    pagination.pagination,
                    '获取高风险日志成功'
                )
            );
        } catch (error) {
            console.error('获取高风险日志失败:', error);
            res.status(500).json(responseUtils.error('获取高风险日志失败'));
        }
    }

    // 获取操作者列表（用于筛选）
    static async getOperators(req, res) {
        try {
            const { type = 'all' } = req.query;

            let users = [];
            let admins = [];

            // 直接从 User 和 Admin 表查询有审计日志的用户/管理员
            if (type === 'all' || type === 'user') {
                const auditUserIds = await AuditLog.findAll({
                    attributes: [
                        [
                            require('sequelize').fn(
                                'DISTINCT',
                                require('sequelize').col('user_id')
                            ),
                            'user_id',
                        ],
                    ],
                    where: { user_id: { [Op.ne]: null } },
                    raw: true,
                });
                const userIds = auditUserIds.map(u => u.user_id).filter(Boolean);

                if (userIds.length > 0) {
                    users = await User.findAll({
                        where: { id: { [Op.in]: userIds } },
                        attributes: ['id', 'username', 'real_name', 'student_id'],
                        raw: false,
                    });
                }
            }

            if (type === 'all' || type === 'admin') {
                const auditAdminIds = await AuditLog.findAll({
                    attributes: [
                        [
                            require('sequelize').fn(
                                'DISTINCT',
                                require('sequelize').col('admin_id')
                            ),
                            'admin_id',
                        ],
                    ],
                    where: { admin_id: { [Op.ne]: null } },
                    raw: true,
                });
                const adminIds = auditAdminIds.map(a => a.admin_id).filter(Boolean);

                if (adminIds.length > 0) {
                    admins = await Admin.findAll({
                        where: { id: { [Op.in]: adminIds } },
                        attributes: ['id', 'username', 'name'],
                        raw: false,
                    });
                }
            }

            const formattedUsers = users.map(u => ({
                type: 'user',
                id: u.id,
                username: u.username,
                real_name: u.real_name,
                student_id: u.student_id,
            }));

            const formattedAdmins = admins.map(a => ({
                type: 'admin',
                id: a.id,
                username: a.username,
                name: a.name,
            }));

            res.json(
                responseUtils.success([...formattedUsers, ...formattedAdmins], '获取操作者列表成功')
            );
        } catch (error) {
            console.error('获取操作者列表失败:', error);
            res.status(500).json(responseUtils.error('获取操作者列表失败'));
        }
    }

    // 删除审计日志
    static async deleteAuditLogs(req, res) {
        try {
            const { ids, days } = req.body;

            let where = {};

            if (ids && Array.isArray(ids) && ids.length > 0) {
                where.id = { [Op.in]: ids };
            } else if (days) {
                const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
                where.created_at = { [Op.lt]: cutoffDate };
                // 默认只删除低风险日志
                where.risk_level = { [Op.in]: ['low', 'medium'] };
            } else {
                return res.status(400).json(responseUtils.error('请提供要删除的日志ID或保留天数'));
            }

            const deletedCount = await AuditLog.destroy({ where });

            res.json(responseUtils.success({ deleted_count: deletedCount }, '删除审计日志成功'));
        } catch (error) {
            console.error('删除审计日志失败:', error);
            res.status(500).json(responseUtils.error('删除审计日志失败'));
        }
    }
}

module.exports = AuditLogController;
