const { User, Role, Permission, UserRole, RolePermission } = require('@/models');
const { responseUtils } = require('@/utils');
const Redis = require('ioredis');

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

class PermissionMiddleware {
    // 检查用户权限
    static checkPermission(resource, action) {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user) {
                    return res.status(401).json(responseUtils.error('未认证'));
                }

                // 管理员表直接配置的权限/角色（JSON 字段）优先处理
                const directPermissions = Array.isArray(user.permissions) ? user.permissions : [];
                const permissionCode = `${resource}:${action}`;
                if (
                    user.role === 'super_admin' ||
                    directPermissions.includes('all') ||
                    directPermissions.includes(permissionCode)
                ) {
                    return next();
                }

                // 角色/权限关联表校验
                const hasPermission = await PermissionMiddleware.userHasPermission(
                    user.id,
                    resource,
                    action
                );

                if (!hasPermission) {
                    return res.status(403).json(responseUtils.error('权限不足'));
                }

                next();
            } catch (error) {
                console.error('权限检查失败', error);
                res.status(500).json(responseUtils.error('权限检查失败'));
            }
        };
    }

    // 检查角色权限
    static checkRole(roleCodes) {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user) {
                    return res.status(401).json(responseUtils.error('未认证'));
                }

                const roles = Array.isArray(roleCodes) ? roleCodes : [roleCodes];
                const directPermissions = Array.isArray(user.permissions) ? user.permissions : [];
                const delivererId =
                    user.deliverer_id ??
                    (typeof user.get === 'function' ? user.get('deliverer_id') : null);
                const isDeliverer =
                    user.is_deliverer ??
                    (typeof user.get === 'function' ? user.get('is_deliverer') : false);

                // 管理员表的角色/权限直接放行
                if (
                    user.role === 'super_admin' ||
                    directPermissions.includes('all') ||
                    roles.includes(user.role) ||
                    (roles.includes('deliverer') && (Boolean(delivererId) || Boolean(isDeliverer)))
                ) {
                    return next();
                }

                const hasRole = await PermissionMiddleware.userHasRole(user.id, roles);

                if (!hasRole) {
                    return res.status(403).json(responseUtils.error('角色权限不足'));
                }

                next();
            } catch (error) {
                console.error('角色检查失败', error);
                res.status(500).json(responseUtils.error('角色检查失败'));
            }
        };
    }

    // 检查用户是否有指定权限
    static async userHasPermission(userId, resource, action) {
        try {
            const cacheKey = `user_permissions:${userId}`;
            const cachedPermissions = await redis.get(cacheKey);

            let userPermissions;
            if (cachedPermissions) {
                userPermissions = JSON.parse(cachedPermissions);
            } else {
                userPermissions = await PermissionMiddleware.getUserPermissions(userId);
                // 缓存30分钟
                await redis.setex(cacheKey, 1800, JSON.stringify(userPermissions));
            }

            const permissionCode = `${resource}:${action}`;
            return userPermissions.some(
                p => p.code === permissionCode || p.code === `${resource}:*`
            );
        } catch (error) {
            console.error('权限检查失败', error);
            return false;
        }
    }

    // 检查用户是否有指定角色
    static async userHasRole(userId, roleCodes) {
        try {
            const cacheKey = `user_roles:${userId}`;
            const cachedRoles = await redis.get(cacheKey);

            let userRoles;
            if (cachedRoles) {
                userRoles = JSON.parse(cachedRoles);
            } else {
                userRoles = await PermissionMiddleware.getUserRoles(userId);
                // 缓存30分钟
                await redis.setex(cacheKey, 1800, JSON.stringify(userRoles));
            }

            return roleCodes.some(code => userRoles.includes(code));
        } catch (error) {
            console.error('角色检查失败', error);
            return false;
        }
    }

    // 获取用户权限列表
    static async getUserPermissions(userId) {
        try {
            const permissions = await Permission.findAll({
                include: [
                    {
                        model: Role,
                        through: RolePermission,
                        include: [
                            {
                                model: User,
                                through: {
                                    model: UserRole,
                                    where: { status: 'active' },
                                },
                                where: { id: userId },
                                required: true,
                            },
                        ],
                        required: true,
                    },
                ],
                where: { status: 'active' },
            });

            return permissions.map(p => ({
                id: p.id,
                code: p.code,
                name: p.name,
                resource: p.resource,
                action: p.action,
            }));
        } catch (error) {
            console.error('获取用户权限失败:', error);
            return [];
        }
    }

    // 获取用户角色列表
    static async getUserRoles(userId) {
        try {
            const roles = await Role.findAll({
                include: [
                    {
                        model: User,
                        through: {
                            model: UserRole,
                            where: { status: 'active' },
                        },
                        where: { id: userId },
                        required: true,
                    },
                ],
                where: { status: 'active' },
            });

            return roles.map(r => r.code);
        } catch (error) {
            console.error('获取用户角色失败:', error);
            return [];
        }
    }

    // 清除用户权限缓存
    static async clearUserPermissionCache(userId) {
        try {
            await redis.del(`user_permissions:${userId}`);
            await redis.del(`user_roles:${userId}`);
        } catch (error) {
            console.error('清除权限缓存失败:', error);
        }
    }

    // 获取资源拥有者权限中间件
    static checkResourceOwnership(resourceModel, resourceIdParam = 'id', userIdField = 'user_id') {
        return async (req, res, next) => {
            try {
                const user = req.user;
                const resourceId = req.params[resourceIdParam];

                if (!user || !resourceId) {
                    return res.status(400).json(responseUtils.error('参数错误'));
                }

                // 管理角色直接放行
                const isAdmin = await PermissionMiddleware.userHasRole(user.id, [
                    'admin',
                    'super_admin',
                ]);
                if (isAdmin) {
                    return next();
                }

                const Model = require('@/models')[resourceModel];
                const resource = await Model.findByPk(resourceId);

                if (!resource) {
                    return res.status(404).json(responseUtils.error('资源不存在'));
                }

                if (resource[userIdField] !== user.id) {
                    return res.status(403).json(responseUtils.error('无权访问此资源'));
                }

                req.resource = resource;
                next();
            } catch (error) {
                console.error('资源所有权检查失败', error);
                res.status(500).json(responseUtils.error('权限检查失败'));
            }
        };
    }

    // 动态权限检查（基于请求参数）
    static dynamicPermissionCheck() {
        return async (req, res, next) => {
            try {
                const user = req.user;
                if (!user) {
                    return res.status(401).json(responseUtils.error('未认证'));
                }

                const { method, route } = req;
                const resourceAction = PermissionMiddleware.getResourceActionFromRoute(
                    method,
                    route.path
                );

                if (resourceAction) {
                    const hasPermission = await PermissionMiddleware.userHasPermission(
                        user.id,
                        resourceAction.resource,
                        resourceAction.action
                    );

                    if (!hasPermission) {
                        return res.status(403).json(responseUtils.error('权限不足'));
                    }
                }

                next();
            } catch (error) {
                console.error('动态权限检查失败', error);
                res.status(500).json(responseUtils.error('权限检查失败'));
            }
        };
    }

    // 从路由推断资源和操作
    static getResourceActionFromRoute(method, path) {
        const routeMapping = {
            GET: {
                '/api/users': { resource: 'user', action: 'read' },
                '/api/users/:id': { resource: 'user', action: 'read' },
                '/api/orders': { resource: 'order', action: 'read' },
                '/api/tasks': { resource: 'task', action: 'read' },
                '/api/admin/users': { resource: 'user', action: 'admin_read' },
            },
            POST: {
                '/api/users': { resource: 'user', action: 'create' },
                '/api/orders': { resource: 'order', action: 'create' },
                '/api/tasks': { resource: 'task', action: 'create' },
                '/api/admin/users': { resource: 'user', action: 'admin_create' },
            },
            PUT: {
                '/api/users/:id': { resource: 'user', action: 'update' },
                '/api/orders/:id': { resource: 'order', action: 'update' },
                '/api/tasks/:id': { resource: 'task', action: 'update' },
            },
            DELETE: {
                '/api/users/:id': { resource: 'user', action: 'delete' },
                '/api/orders/:id': { resource: 'order', action: 'delete' },
                '/api/tasks/:id': { resource: 'task', action: 'delete' },
            },
        };

        return routeMapping[method]?.[path];
    }

    // 初始化默认角色和权限
    static async initializeDefaultRolesAndPermissions() {
        try {
            // 创建默认角色
            const defaultRoles = [
                { name: '超级管理员', code: 'super_admin', level: 100, is_system: true },
                { name: '管理员', code: 'admin', level: 90, is_system: true },
                { name: '普通用户', code: 'user', level: 1, is_system: true },
                { name: '配送员', code: 'deliverer', level: 10, is_system: true },
                { name: '版主', code: 'moderator', level: 50, is_system: true },
            ];

            for (const roleData of defaultRoles) {
                await Role.findOrCreate({
                    where: { code: roleData.code },
                    defaults: roleData,
                });
            }

            // 创建默认权限
            const defaultPermissions = [
                // 用户管理权限
                {
                    name: '查看用户',
                    code: 'user:read',
                    resource: 'user',
                    action: 'read',
                    group: 'user',
                },
                {
                    name: '创建用户',
                    code: 'user:create',
                    resource: 'user',
                    action: 'create',
                    group: 'user',
                },
                {
                    name: '更新用户',
                    code: 'user:update',
                    resource: 'user',
                    action: 'update',
                    group: 'user',
                },
                {
                    name: '删除用户',
                    code: 'user:delete',
                    resource: 'user',
                    action: 'delete',
                    group: 'user',
                },
                {
                    name: '管理员查看用户',
                    code: 'user:admin_read',
                    resource: 'user',
                    action: 'admin_read',
                    group: 'admin',
                },

                // 订单管理权限
                {
                    name: '查看订单',
                    code: 'order:read',
                    resource: 'order',
                    action: 'read',
                    group: 'order',
                },
                {
                    name: '创建订单',
                    code: 'order:create',
                    resource: 'order',
                    action: 'create',
                    group: 'order',
                },
                {
                    name: '更新订单',
                    code: 'order:update',
                    resource: 'order',
                    action: 'update',
                    group: 'order',
                },
                {
                    name: '删除订单',
                    code: 'order:delete',
                    resource: 'order',
                    action: 'delete',
                    group: 'order',
                },
                {
                    name: '管理所有订单',
                    code: 'order:admin',
                    resource: 'order',
                    action: 'admin',
                    group: 'admin',
                },

                // 任务管理权限
                {
                    name: '查看任务',
                    code: 'task:read',
                    resource: 'task',
                    action: 'read',
                    group: 'task',
                },
                {
                    name: '创建任务',
                    code: 'task:create',
                    resource: 'task',
                    action: 'create',
                    group: 'task',
                },
                {
                    name: '更新任务',
                    code: 'task:update',
                    resource: 'task',
                    action: 'update',
                    group: 'task',
                },
                {
                    name: '删除任务',
                    code: 'task:delete',
                    resource: 'task',
                    action: 'delete',
                    group: 'task',
                },

                // 论坛管理权限
                {
                    name: '查看论坛',
                    code: 'forum:read',
                    resource: 'forum',
                    action: 'read',
                    group: 'forum',
                },
                {
                    name: '发表帖子',
                    code: 'forum:post',
                    resource: 'forum',
                    action: 'post',
                    group: 'forum',
                },
                {
                    name: '管理论坛',
                    code: 'forum:moderate',
                    resource: 'forum',
                    action: 'moderate',
                    group: 'forum',
                },

                // 系统管理权限
                {
                    name: '系统配置',
                    code: 'system:config',
                    resource: 'system',
                    action: 'config',
                    group: 'system',
                },
                {
                    name: '系统管理',
                    code: 'system:manage',
                    resource: 'system',
                    action: 'manage',
                    group: 'system',
                },
                {
                    name: '查看日志',
                    code: 'system:logs',
                    resource: 'system',
                    action: 'logs',
                    group: 'system',
                },
                {
                    name: '全部权限',
                    code: 'system:all',
                    resource: 'system',
                    action: '*',
                    group: 'system',
                },

                // 数据分析权限
                {
                    name: '查看数据分析',
                    code: 'analytics:read',
                    resource: 'analytics',
                    action: 'read',
                    group: 'analytics',
                },
            ];

            for (const permissionData of defaultPermissions) {
                await Permission.findOrCreate({
                    where: { code: permissionData.code },
                    defaults: permissionData,
                });
            }

            console.log('默认角色和权限初始化完成');
        } catch (error) {
            console.error('初始化角色权限失败:', error);
        }
    }
}

module.exports = PermissionMiddleware;
