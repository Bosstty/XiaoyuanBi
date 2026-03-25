const { Deliverer, User } = require('../../models');
const { jwtUtils, responseUtils } = require('../../utils');
const { Op } = require('sequelize');
const SecurityService = require('../../services/SecurityService');

class DelivererAuthController {
    // 配送员登录
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // 查找用户
            const user = await User.findOne({
                where: {
                    [Op.or]: [{ email }, { student_id: email }],
                },
                include: [
                    {
                        model: Deliverer,
                        as: 'deliverer',
                        required: true,
                    },
                ],
            });

            if (!user || !user.deliverer) {
                return res.status(400).json(responseUtils.error('配送员账号不存在'));
            }

            // 检查配送员状态
            if (user.deliverer.application_status !== 'approved') {
                return res.status(400).json(responseUtils.error('配送员账号未通过审核'));
            }

            if (user.status !== 'active') {
                return res.status(400).json(responseUtils.error('账号已被禁用'));
            }

            // 验证密码
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json(responseUtils.error('密码错误'));
            }

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(user.id, 'deliverer_login', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            // 更新登录信息
            await user.update({
                last_login_at: new Date(),
                last_login_ip: req.ip,
            });

            // 生成JWT令牌
            const token = jwtUtils.generateToken({
                id: user.id,
                type: 'deliverer',
                deliverer_id: user.deliverer.id,
            });

            res.json(
                responseUtils.success(
                    {
                        user,
                        deliverer: user.deliverer,
                        token,
                    },
                    '登录成功'
                )
            );
        } catch (error) {
            console.error('配送员登录失败:', error);
            res.status(500).json(responseUtils.error('登录失败'));
        }
    }

    // 获取配送员信息
    static async getProfile(req, res) {
        try {
            const user = req.user;
            const deliverer = await Deliverer.findOne({
                where: { user_id: user.id },
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: { exclude: ['password'] },
                    },
                ],
            });

            if (!deliverer) {
                return res.status(404).json(responseUtils.error('配送员信息不存在'));
            }

            res.json(responseUtils.success({ user, deliverer }, '获取配送员信息成功'));
        } catch (error) {
            console.error('获取配送员信息失败:', error);
            res.status(500).json(responseUtils.error('获取配送员信息失败'));
        }
    }

    // 更新配送员信息
    static async updateProfile(req, res) {
        try {
            const user = req.user;
            const deliverer = await Deliverer.findOne({ where: { user_id: user.id } });

            if (!deliverer) {
                return res.status(404).json(responseUtils.error('配送员信息不存在'));
            }

            const {
                emergency_contact,
                emergency_phone,
                vehicle_type,
                vehicle_number,
                bank_account,
                bank_name,
                account_holder,
                service_areas,
                availability_hours,
            } = req.body;

            // 更新配送员信息
            await deliverer.update({
                emergency_contact,
                emergency_phone,
                vehicle_type,
                vehicle_number,
                bank_account,
                bank_name,
                account_holder,
                service_areas,
                availability_hours,
            });

            res.json(responseUtils.success(deliverer, '更新成功'));
        } catch (error) {
            console.error('更新配送员信息失败:', error);
            res.status(500).json(responseUtils.error('更新失败'));
        }
    }

    // 退出登录
    static async logout(req, res) {
        try {
            res.json(responseUtils.success(null, '退出登录成功'));
        } catch (error) {
            console.error('退出登录失败:', error);
            res.status(500).json(responseUtils.error('退出登录失败'));
        }
    }
}

module.exports = DelivererAuthController;
