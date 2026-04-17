const { Admin } = require('@/models');
const { Op } = require('sequelize');
const { jwtUtils, responseUtils, requestUtils } = require('@/utils');
const SecurityService = require('@/services/SecurityService');

class AdminAuthController {
    // 管理员登录
    static async login(req, res) {
        try {
            const { username, password } = req.body;
            const clientIp = requestUtils.getClientIp(req);

            // 查找管理员
            const admin = await Admin.findOne({
                where: { username, status: 'active' },
            });

            if (!admin) {
                return res.status(400).json(responseUtils.error('管理员账号不存在或已被禁用'));
            }

            // 验证密码
            const isPasswordValid = await admin.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json(responseUtils.error('密码错误'));
            }

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(admin.id, 'admin_login', {
                ip: clientIp,
                userAgent: req.get('User-Agent'),
            });

            // 更新登录信息
            await admin.update({
                last_login_at: new Date(),
                last_login_ip: clientIp,
            });

            // 生成JWT令牌
            const token = jwtUtils.generateToken({
                id: admin.id,
                type: 'admin',
                role: admin.role,
                permissions: admin.permissions,
            });

            // 移除密码字段
            const adminData = admin.toJSON();
            delete adminData.password;

            res.json(
                responseUtils.success(
                    {
                        admin: adminData,
                        token,
                    },
                    '登录成功'
                )
            );
        } catch (error) {
            console.error('管理员登录失败:', error);
            res.status(500).json(responseUtils.error('登录失败'));
        }
    }

    // 获取管理员信息
    static async getProfile(req, res) {
        try {
            const admin = req.user;

            // 移除敏感信息
            const adminData = admin.toJSON();
            delete adminData.password;

            res.json(responseUtils.success(adminData, '获取管理员信息成功'));
        } catch (error) {
            console.error('获取管理员信息失败:', error);
            res.status(500).json(responseUtils.error('获取管理员信息失败'));
        }
    }

    // 更新管理员信息
    static async updateProfile(req, res) {
        try {
            const admin = req.user;
            const { name, real_name, phone, email, department, avatar } = req.body;
            const nextName = name !== undefined ? name : real_name;

            // 检查邮箱是否已被其他管理员使用
            if (email && email !== admin.email) {
                const existingEmail = await Admin.findOne({
                    where: {
                        email,
                        id: { [Op.ne]: admin.id },
                    },
                });

                if (existingEmail) {
                    return res.status(400).json(responseUtils.error('邮箱已被使用'));
                }
            }

            // 更新管理员信息
            await admin.update({
                ...(nextName !== undefined ? { name: String(nextName).trim() } : {}),
                phone,
                email,
                department,
                avatar,
            });

            // 移除密码字段
            const adminData = admin.toJSON();
            delete adminData.password;

            res.json(responseUtils.success(adminData, '更新成功'));
        } catch (error) {
            console.error('更新管理员信息失败:', error);
            res.status(500).json(responseUtils.error('更新失败'));
        }
    }

    // 修改密码
    static async changePassword(req, res) {
        try {
            const admin = req.user;
            const { old_password, new_password } = req.body;

            // 验证旧密码
            const isOldPasswordValid = await admin.comparePassword(old_password);
            if (!isOldPasswordValid) {
                return res.status(400).json(responseUtils.error('原密码错误'));
            }

            // 更新密码
            await admin.update({
                password: new_password,
            });

            res.json(responseUtils.success(null, '密码修改成功'));
        } catch (error) {
            console.error('修改密码失败:', error);
            res.status(500).json(responseUtils.error('密码修改失败'));
        }
    }

    // 退出登录
    static async logout(req, res) {
        try {
            // JWT是无状态的，客户端删除token即可
            // 如果需要实现token黑名单，可以在这里添加逻辑

            res.json(responseUtils.success(null, '退出登录成功'));
        } catch (error) {
            console.error('退出登录失败:', error);
            res.status(500).json(responseUtils.error('退出登录失败'));
        }
    }

    // 获取管理员权限信息
    static async getPermissions(req, res) {
        try {
            const admin = req.user;
            const directPermissions = Array.isArray(admin.permissions) ? admin.permissions : [];

            const permissions = {
                role: admin.role,
                permissions: directPermissions,
                can_manage_users: directPermissions.includes('all') || directPermissions.includes('user:admin_read'),
                can_manage_orders: directPermissions.includes('all') || directPermissions.includes('order:admin'),
                can_manage_system: directPermissions.includes('all') || directPermissions.includes('system:manage'),
                can_view_analytics: directPermissions.includes('all') || directPermissions.includes('analytics:read'),
                can_manage_finance: directPermissions.includes('all') || directPermissions.includes('analytics:read'),
            };

            res.json(responseUtils.success(permissions, '获取权限信息成功'));
        } catch (error) {
            console.error('获取权限信息失败:', error);
            res.status(500).json(responseUtils.error('获取权限信息失败'));
        }
    }
}

module.exports = AdminAuthController;
