const { User } = require('../../models');
const { jwtUtils, responseUtils, validationUtils } = require('../../utils');
const { Op } = require('sequelize');
const SecurityService = require('../../services/SecurityService');

class UserAuthController {
    // 用户注册
    static async register(req, res) {
        try {
            const {
                student_id,
                username,
                email,
                password,
                phone,
                real_name,
                college,
                major,
                grade,
            } = req.body;

            // 检查学号是否已存在
            const existingStudentId = await User.findOne({
                where: { student_id },
            });

            if (existingStudentId) {
                return res.status(400).json(responseUtils.error('学号已存在'));
            }

            // 检查邮箱是否已存在
            const existingEmail = await User.findOne({
                where: { email },
            });

            if (existingEmail) {
                return res.status(400).json(responseUtils.error('邮箱已存在'));
            }

            // 检查手机号是否已存在（如果提供）
            if (phone) {
                const existingPhone = await User.findOne({
                    where: { phone },
                });

                if (existingPhone) {
                    return res.status(400).json(responseUtils.error('手机号已存在'));
                }
            }

            // 创建用户
            const user = await User.create({
                student_id,
                username,
                email,
                password,
                phone,
                real_name,
                college,
                major,
                grade,
                status: 'active',
            });

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(user.id, 'register', {
                ip: req.ip,
                userAgent: req.get('User-Agent'),
            });

            // 生成JWT令牌
            const token = jwtUtils.generateToken({
                id: user.id,
                type: 'user',
            });

            res.json(
                responseUtils.success(
                    {
                        user,
                        token,
                    },
                    '注册成功'
                )
            );
        } catch (error) {
            console.error('用户注册失败:', error);
            res.status(500).json(responseUtils.error('注册失败'));
        }
    }

    // 用户登录
    static async login(req, res) {
        try {
            const { email, password } = req.body;

            // 查找用户
            const user = await User.findOne({
                where: {
                    [Op.or]: [{ email }, { student_id: email }],
                },
            });

            if (!user) {
                return res.status(400).json(responseUtils.error('用户不存在'));
            }

            // 检查用户状态
            if (user.status !== 'active') {
                return res.status(400).json(responseUtils.error('账号已被禁用'));
            }

            // 验证密码
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json(responseUtils.error('密码错误'));
            }

            // 异常行为检测
            await SecurityService.detectAnomalousActivity(user.id, 'login', {
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
                type: 'user',
            });

            res.json(
                responseUtils.success(
                    {
                        user,
                        token,
                    },
                    '登录成功'
                )
            );
        } catch (error) {
            console.error('用户登录失败:', error);
            res.status(500).json(responseUtils.error('登录失败'));
        }
    }

    // 获取当前用户信息
    static async getProfile(req, res) {
        try {
            const user = req.user;
            res.json(responseUtils.success(user, '获取用户信息成功'));
        } catch (error) {
            console.error('获取用户信息失败:', error);
            res.status(500).json(responseUtils.error('获取用户信息失败'));
        }
    }

    // 更新用户信息
    static async updateProfile(req, res) {
        try {
            const user = req.user;
            const {
                username,
                phone,
                real_name,
                gender,
                birthday,
                college,
                major,
                grade,
                dormitory,
                bio,
                skills,
            } = req.body;

            // 检查手机号是否已被其他用户使用
            if (phone && phone !== user.phone) {
                const existingPhone = await User.findOne({
                    where: {
                        phone,
                        id: { [Op.ne]: user.id },
                    },
                });

                if (existingPhone) {
                    return res.status(400).json(responseUtils.error('手机号已被使用'));
                }
            }

            // 更新用户信息
            await user.update({
                username,
                phone,
                real_name,
                gender,
                birthday,
                college,
                major,
                grade,
                dormitory,
                bio,
                skills,
            });

            res.json(responseUtils.success(user, '更新成功'));
        } catch (error) {
            console.error('更新用户信息失败:', error);
            res.status(500).json(responseUtils.error('更新失败'));
        }
    }

    // 修改密码
    static async changePassword(req, res) {
        try {
            const user = req.user;
            const { old_password, new_password } = req.body;

            // 验证旧密码
            const isOldPasswordValid = await user.comparePassword(old_password);
            if (!isOldPasswordValid) {
                return res.status(400).json(responseUtils.error('原密码错误'));
            }

            // 更新密码
            await user.update({
                password: new_password,
            });

            res.json(responseUtils.success(null, '密码修改成功'));
        } catch (error) {
            console.error('修改密码失败:', error);
            res.status(500).json(responseUtils.error('密码修改失败'));
        }
    }

    // 上传头像
    static async uploadAvatar(req, res) {
        try {
            const user = req.user;
            const file = req.files?.avatar;

            if (!file) {
                return res.status(400).json(responseUtils.error('请选择要上传的头像'));
            }

            // 这里应该实现文件上传逻辑
            // 暂时返回模拟的URL
            const avatarUrl = `/uploads/avatars/${user.id}_${Date.now()}.jpg`;

            // 更新用户头像
            await user.update({
                avatar: avatarUrl,
            });

            res.json(
                responseUtils.success(
                    {
                        avatar: avatarUrl,
                    },
                    '头像上传成功'
                )
            );
        } catch (error) {
            console.error('头像上传失败:', error);
            res.status(500).json(responseUtils.error('头像上传失败'));
        }
    }

    // 发送验证码
    static async sendVerificationCode(req, res) {
        try {
            const { type, target } = req.body;
            // type: email/phone, target: 邮箱或手机号

            // 生成6位数验证码
            const code = Math.floor(100000 + Math.random() * 900000).toString();

            // 这里应该实现发送验证码的逻辑（邮件或短信）
            // 暂时只返回成功响应
            console.log(`验证码 ${code} 已发送到 ${target}`);

            res.json(responseUtils.success(null, '验证码发送成功'));
        } catch (error) {
            console.error('发送验证码失败:', error);
            res.status(500).json(responseUtils.error('发送验证码失败'));
        }
    }

    // 验证验证码
    static async verifyCode(req, res) {
        try {
            const { type, target, code } = req.body;
            const user = req.user;

            // 这里应该实现验证码验证逻辑
            // 暂时假设验证成功

            if (type === 'email') {
                await user.update({
                    email_verified: true,
                });
            } else if (type === 'phone') {
                await user.update({
                    phone_verified: true,
                });
            }

            res.json(responseUtils.success(null, '验证成功'));
        } catch (error) {
            console.error('验证失败:', error);
            res.status(500).json(responseUtils.error('验证失败'));
        }
    }

    // 微信登录
    static async wechatLogin(req, res) {
        try {
            const { code } = req.body;

            // 这里应该实现微信OAuth流程
            // 1. 用code换取access_token和openid
            // 2. 根据openid查找或创建用户
            // 暂时返回模拟响应

            res.json(responseUtils.success(null, '微信登录功能待实现'));
        } catch (error) {
            console.error('微信登录失败:', error);
            res.status(500).json(responseUtils.error('微信登录失败'));
        }
    }

    // 微信OAuth实现
    static async wechatOAuth(req, res) {
        try {
            const { code } = req.body;

            // TODO: 实现完整的微信OAuth流程
            const mockOpenId = 'mock_openid_' + Date.now();
            let user = await User.findOne({ where: { wechat_openid: mockOpenId } });

            if (!user) {
                // 创建新用户
                user = await User.create({
                    student_id: 'WX' + Date.now(),
                    username: '微信用户',
                    email: `wx_${Date.now()}@temp.com`,
                    password: Math.random().toString(36),
                    wechat_openid: mockOpenId,
                    status: 'active',
                });
            }

            // 生成JWT令牌
            const token = jwtUtils.generateToken({
                id: user.id,
                type: 'user',
            });

            res.json(
                responseUtils.success(
                    {
                        user,
                        token,
                        is_new_user: !user.student_verified,
                    },
                    '微信登录成功'
                )
            );
        } catch (error) {
            console.error('微信OAuth失败:', error);
            res.status(500).json(responseUtils.error('微信OAuth失败'));
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

    // 注销账号
    static async deleteAccount(req, res) {
        try {
            const user = req.user;
            const { password } = req.body;

            // 验证密码
            const isPasswordValid = await user.comparePassword(password);
            if (!isPasswordValid) {
                return res.status(400).json(responseUtils.error('密码错误'));
            }

            // 软删除用户（设置为inactive状态）
            await user.update({
                status: 'inactive',
            });

            res.json(responseUtils.success(null, '账号注销成功'));
        } catch (error) {
            console.error('注销账号失败:', error);
            res.status(500).json(responseUtils.error('注销账号失败'));
        }
    }

    // 发送密码重置邮件
    static async sendPasswordResetEmail(req, res) {
        try {
            const { email } = req.body;

            // 查找用户
            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(400).json(responseUtils.error('邮箱不存在'));
            }

            // 生成重置token
            const resetToken =
                Math.random().toString(36).substring(2, 15) +
                Math.random().toString(36).substring(2, 15);

            // TODO: 将token存储到Redis，设置30分钟过期
            // TODO: 发送重置邮件
            console.log(`密码重置链接已发送到 ${email}，token: ${resetToken}`);

            res.json(responseUtils.success(null, '密码重置邮件已发送'));
        } catch (error) {
            console.error('发送密码重置邮件失败:', error);
            res.status(500).json(responseUtils.error('发送密码重置邮件失败'));
        }
    }

    // 验证重置token
    static async verifyResetToken(req, res) {
        try {
            const { token } = req.params;

            // TODO: 从Redis验证token
            const userId = 1; // 模拟验证成功

            if (!userId) {
                return res.status(400).json(responseUtils.error('重置链接无效或已过期'));
            }

            res.json(responseUtils.success({ valid: true }));
        } catch (error) {
            console.error('验证重置token失败:', error);
            res.status(500).json(responseUtils.error('验证重置token失败'));
        }
    }

    // 重置密码
    static async resetPassword(req, res) {
        try {
            const { token, new_password } = req.body;

            // TODO: 从Redis验证token并获取用户ID
            const userId = 1; // 模拟获取用户ID

            if (!userId) {
                return res.status(400).json(responseUtils.error('重置链接无效或已过期'));
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(400).json(responseUtils.error('用户不存在'));
            }

            // 更新密码
            await user.update({ password: new_password });

            res.json(responseUtils.success(null, '密码重置成功'));
        } catch (error) {
            console.error('重置密码失败:', error);
            res.status(500).json(responseUtils.error('重置密码失败'));
        }
    }

    // 获取设备列表
    static async getDevices(req, res) {
        try {
            const user = req.user;

            // TODO: 实现Redis缓存存储设备信息
            const devices = [
                {
                    id: 'device_001',
                    device_type: 'mobile',
                    device_name: 'iPhone 14',
                    last_login: new Date(),
                    ip: req.ip,
                    location: '哈尔滨',
                    is_current: true,
                },
            ];

            res.json(responseUtils.success(devices));
        } catch (error) {
            console.error('获取设备列表失败:', error);
            res.status(500).json(responseUtils.error('获取设备列表失败'));
        }
    }

    // 登出指定设备
    static async logoutDevice(req, res) {
        try {
            const { device_id } = req.params;

            // TODO: 实现设备登出逻辑，将设备token加入黑名单
            console.log(`设备 ${device_id} 已被登出`);

            res.json(responseUtils.success(null, '设备已登出'));
        } catch (error) {
            console.error('设备登出失败:', error);
            res.status(500).json(responseUtils.error('设备登出失败'));
        }
    }

    // 获取用户统计信息
    static async getUserStats(req, res) {
        try {
            const userId = req.user.id;
            const { PickupOrder, Task, ForumPost } = require('../../models');

            // 获取用户的各项统计数据
            const stats = await Promise.all([
                // 代取订单统计
                PickupOrder.count({
                    where: { user_id: userId, status: 'completed' },
                }),
                PickupOrder.count({
                    where: { deliverer_id: userId, status: 'completed' },
                }),
                // 任务统计
                Task.count({
                    where: { publisher_id: userId, status: 'completed' },
                }),
                Task.count({
                    where: { assignee_id: userId, status: 'completed' },
                }),
                // 论坛统计
                ForumPost.count({
                    where: { author_id: userId, status: 'published' },
                }),
                ForumPost.sum('like_count', {
                    where: { author_id: userId, status: 'published' },
                }) || 0,
            ]);

            const userStats = {
                orders: {
                    published: stats[0],
                    completed: stats[1],
                },
                tasks: {
                    published: stats[2],
                    completed: stats[3],
                },
                forum: {
                    posts: stats[4],
                    likes: stats[5],
                },
            };

            res.json(responseUtils.success(userStats));
        } catch (error) {
            console.error('获取用户统计失败:', error);
            res.status(500).json(responseUtils.error('获取用户统计失败'));
        }
    }
}

module.exports = UserAuthController;
