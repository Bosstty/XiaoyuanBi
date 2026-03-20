const jwt = require('jsonwebtoken');
const { Service } = require('../../models');

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

            // 生成token
            const token = jwt.sign(
                { id: service.id, role: 'service' },
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
                        name: service.name
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
            const { name, phone } = req.body;
            await Service.update({ name, phone }, { where: { id: req.user.id } });

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

    // 退出登录
    async logout(req, res) {
        res.json({
            success: true,
            message: '退出成功'
        });
    }
}

module.exports = new ServiceAuthController();
