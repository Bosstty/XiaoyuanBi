const { User } = require('@/models');

class ServiceUserController {
    // 获取用户列表
    async getUsers(req, res) {
        try {
            const { keyword, status, page = 1, limit = 20 } = req.query;
            const where = {};

            if (keyword) {
                where[Symbol.for('or')] = [
                    { username: { [Symbol.for('like')]: `%${keyword}%` } },
                    { phone: { [Symbol.for('like')]: `%${keyword}%` } },
                    { email: { [Symbol.for('like')]: `%${keyword}%` } }
                ];
            }
            if (status) where.status = status;

            const { count, rows } = await User.findAndCountAll({
                where,
                attributes: { exclude: ['password'] },
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (page - 1) * limit
            });

            res.json({
                success: true,
                data: rows,
                pagination: {
                    current_page: parseInt(page),
                    per_page: parseInt(limit),
                    total: count
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取用户列表失败',
                error: error.message
            });
        }
    }

    // 获取用户详情
    async getUserDetail(req, res) {
        try {
            const user = await User.findByPk(req.params.id, {
                attributes: { exclude: ['password'] }
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取用户详情失败',
                error: error.message
            });
        }
    }

    // 封禁用户
    async banUser(req, res) {
        try {
            const { reason, duration } = req.body;
            const user = await User.findByPk(req.params.id);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: '用户不存在'
                });
            }

            user.status = 'banned';
            user.ban_reason = reason;
            user.banned_at = new Date();
            if (duration) {
                user.unban_at = new Date(Date.now() + duration * 24 * 60 * 60 * 1000);
            }
            await user.save();

            res.json({
                success: true,
                message: '用户已封禁',
                data: user
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '封禁用户失败',
                error: error.message
            });
        }
    }
}

module.exports = new ServiceUserController();
