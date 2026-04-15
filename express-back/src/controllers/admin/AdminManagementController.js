const { Admin } = require('../../models');
const { responseUtils } = require('../../utils');

function canManageAdmins(user) {
    const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
    return user?.role === 'super_admin' || permissions.includes('all') || permissions.includes('system:manage');
}

class AdminManagementController {
    static async list(req, res) {
        try {
            if (!canManageAdmins(req.user)) {
                return res.status(403).json(responseUtils.error('仅超级管理员可管理管理员账号', 403));
            }

            const admins = await Admin.findAll({
                attributes: {
                    exclude: ['password'],
                },
                order: [['id', 'ASC']],
            });

            return res.json(responseUtils.success(admins, '获取管理员列表成功'));
        } catch (error) {
            console.error('获取管理员列表失败:', error);
            return res.status(500).json(responseUtils.error('获取管理员列表失败'));
        }
    }

    static async create(req, res) {
        try {
            if (!canManageAdmins(req.user)) {
                return res.status(403).json(responseUtils.error('仅超级管理员可管理管理员账号', 403));
            }

            const { username, email, password, name, role, permissions, status, phone, department, notes } = req.body;

            if (!username || !email || !password || !name) {
                return res.status(400).json(responseUtils.error('用户名、邮箱、密码、姓名不能为空'));
            }

            const existing = await Admin.findOne({
                where: {
                    username,
                },
            });

            if (existing) {
                return res.status(400).json(responseUtils.error('管理员用户名已存在'));
            }

            const existingEmail = await Admin.findOne({
                where: {
                    email,
                },
            });

            if (existingEmail) {
                return res.status(400).json(responseUtils.error('管理员邮箱已存在'));
            }

            const admin = await Admin.create({
                username: String(username).trim(),
                email: String(email).trim(),
                password,
                name: String(name).trim(),
                role: role || 'admin',
                permissions: Array.isArray(permissions) ? permissions : [],
                status: status || 'active',
                phone: phone || null,
                department: department || null,
                notes: notes || null,
            });

            return res.json(responseUtils.success(admin.toJSON(), '创建管理员成功'));
        } catch (error) {
            console.error('创建管理员失败:', error);
            return res.status(500).json(responseUtils.error('创建管理员失败'));
        }
    }

    static async update(req, res) {
        try {
            if (!canManageAdmins(req.user)) {
                return res.status(403).json(responseUtils.error('仅超级管理员可管理管理员账号', 403));
            }

            const { id } = req.params;
            const { email, name, role, permissions, status, phone, department, notes, password } = req.body;

            const admin = await Admin.findByPk(id);
            if (!admin) {
                return res.status(404).json(responseUtils.error('管理员不存在', 404));
            }

            if (email && email !== admin.email) {
                const existingEmail = await Admin.findOne({ where: { email } });
                if (existingEmail && existingEmail.id !== admin.id) {
                    return res.status(400).json(responseUtils.error('管理员邮箱已存在'));
                }
            }

            if (admin.id === req.user.id && status && status !== 'active') {
                return res.status(400).json(responseUtils.error('不能停用当前登录的超级管理员'));
            }

            await admin.update({
                email: email !== undefined ? String(email).trim() : admin.email,
                name: name !== undefined ? String(name).trim() : admin.name,
                role: role || admin.role,
                permissions: Array.isArray(permissions) ? permissions : admin.permissions,
                status: status || admin.status,
                phone: phone !== undefined ? phone : admin.phone,
                department: department !== undefined ? department : admin.department,
                notes: notes !== undefined ? notes : admin.notes,
                ...(password ? { password } : {}),
            });

            return res.json(responseUtils.success(admin.toJSON(), '更新管理员成功'));
        } catch (error) {
            console.error('更新管理员失败:', error);
            return res.status(500).json(responseUtils.error('更新管理员失败'));
        }
    }
}

module.exports = AdminManagementController;
