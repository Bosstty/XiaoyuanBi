const jwt = require('jsonwebtoken');
const { Service } = require('@/models');
const bcrypt = require('bcryptjs');

class ServiceAuthController {
    // 客服登录
    async login(req, res) {
        try {
            const { username, password } = req.body;

            const service = await Service.findOne({
                where: { username, status: 'active' }
            });

            if (!service) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            const isPasswordValid = await service.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: '用户名或密码错误'
                });
            }

            if (!String(service.password || '').startsWith('$2')) {
                const hashedPassword = await bcrypt.hash(String(password || ''), 12);
                await service.update({ password: hashedPassword });
            }

            await service.update({
                last_login_at: new Date(),
            });

            // 生成token
            const token = jwt.sign(
                { id: service.id, type: 'service', role: 'service' },
                process.env.JWT_SECRET,
                { expiresIn: '24h' }
            );

            res.json({
                success: true,
                message: '登录成功',
                data: {
                    service: {
                        id: service.id,
                        username: service.username,
                        name: service.name,
                        role: service.role,
                        status: service.status,
                        ticket_types: Array.isArray(service.ticket_types) ? service.ticket_types : [],
                    },
                    token
                }
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '登录失败',
                error: error.message
            });
        }
    }

    // 获取客服信息
    async getProfile(req, res) {
        try {
            const service = await Service.findByPk(req.user.id, {
                attributes: { exclude: ['password'] }
            });

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在'
                });
            }

            res.json({
                success: true,
                data: service
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '获取信息失败',
                error: error.message
            });
        }
    }

    // 更新客服信息
    async updateProfile(req, res) {
        try {
            const { name, phone, email, avatar } = req.body;
            await Service.update({ name, phone, email, avatar }, { where: { id: req.user.id } });

            res.json({
                success: true,
                message: '更新成功'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '更新失败',
                error: error.message
            });
        }
    }

    // 修改密码
    async changePassword(req, res) {
        try {
            const { old_password, new_password } = req.body;
            const service = await Service.findByPk(req.user.id);

            if (!service) {
                return res.status(404).json({
                    success: false,
                    message: '客服不存在'
                });
            }

            const isOldPasswordValid = await service.comparePassword(old_password);
            if (!isOldPasswordValid) {
                return res.status(400).json({
                    success: false,
                    message: '原密码错误'
                });
            }

            await service.update({
                password: new_password,
            });

            res.json({
                success: true,
                message: '密码修改成功'
            });
        } catch (error) {
            res.status(500).json({
                success: false,
                message: '密码修改失败',
                error: error.message
            });
        }
    }

    // 退出登录
    async logout(req, res) {
        res.json({
            success: true,
            message: '退出成功'
        });
    }
}

module.exports = new ServiceAuthController();
