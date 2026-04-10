const { User, Deliverer, PickupOrder, Task, Wallet, DelivererDebt } = require('../../models');
const { jwtUtils, responseUtils, validationUtils, cryptoUtils } = require('../../utils');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const SecurityService = require('../../services/SecurityService');
const redis = require('../../../config/redis');
const emailService = require('../../../services/emailService');

const RESET_PASSWORD_TTL = Number(process.env.RESET_PASSWORD_TOKEN_TTL || 1800);

function getResetTokenKey(token) {
    return `password_reset:token:${token}`;
}

function buildResetPasswordUrl(token) {
    const baseUrl =
        process.env.RESET_PASSWORD_URL_BASE ||
        process.env.FRONTEND_URL ||
        'http://localhost:5173/reset-password';

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}token=${encodeURIComponent(token)}`;
}

function getRequestEmail(body = {}) {
    return String(body.email || body.target || '')
        .trim()
        .toLowerCase();
}

async function buildUserResponse(user) {
    const deliverer = await Deliverer.findOne({
        where: {
            user_id: user.id,
            application_status: 'approved',
            status: 'active',
            isDeleted: false,
        },
        attributes: ['id', 'application_status', 'status'],
    });

    const wallet = await Wallet.findOne({
        where: { user_id: user.id },
        attributes: ['balance', 'frozen_balance'],
    });
    const debtRows = await DelivererDebt.findAll({
        where: {
            user_id: user.id,
            status: {
                [Op.in]: ['active', 'partial'],
            },
        },
        attributes: ['remaining_amount'],
    });
    const walletBalance = Number.parseFloat(wallet?.balance || user.balance || 0) || 0;
    const frozenBalance = Number.parseFloat(wallet?.frozen_balance || 0) || 0;
    const debtAmount = debtRows.reduce(
        (sum, debt) => sum + (Number.parseFloat(debt.remaining_amount || 0) || 0),
        0
    );
    const displayBalance = Number((walletBalance - debtAmount).toFixed(2));

    return {
        ...user.toJSON(),
        balance: displayBalance,
        wallet_balance: walletBalance,
        frozen_balance: frozenBalance,
        debt_amount: debtAmount,
        display_balance: displayBalance,
        is_deliverer: Boolean(deliverer),
        deliverer_id: deliverer ? deliverer.id : null,
    };
}

function pickPublicUser(user) {
    return {
        id: user.id,
        username: user.username,
        real_name: user.real_name,
        avatar: user.avatar,
        gender: user.gender,
        college: user.college,
        major: user.major,
        grade: user.grade,
        bio: user.bio,
        skills: user.skills,
        rating: Number(user.rating || 0),
        completed_orders: Number(user.completed_orders || 0),
        completed_tasks: Number(user.completed_tasks || 0),
        student_verified: Boolean(user.student_verified),
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
    };
}

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

            const userData = await buildUserResponse(user);

            res.json(responseUtils.success({ user: userData, token }, '注册成功'));
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

            const userData = await buildUserResponse(user);

            res.json(responseUtils.success({ user: userData, token }, '登录成功'));
        } catch (error) {
            console.error('用户登录失败:', error);
            res.status(500).json(responseUtils.error('登录失败'));
        }
    }

    // 获取当前用户信息
    static async getProfile(req, res) {
        try {
            const user = req.user;
            const userData = await buildUserResponse(user);

            res.json(responseUtils.success(userData, '获取用户信息成功'));
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

            const userData = await buildUserResponse(user);

            res.json(responseUtils.success(userData, '更新成功'));
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
            const file = req.file || req.files?.avatar;

            if (!file) {
                return res.status(400).json(responseUtils.error('请选择要上传的头像'));
            }

            const avatarUrl = `/uploads/avatars/${file.filename || `${user.id}_${Date.now()}.jpg`}`;

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

    // 提交学生认证
    static async submitStudentVerification(req, res) {
        try {
            const user = req.user;
            const file = req.file;

            if (!file) {
                return res.status(400).json(responseUtils.error('请上传学生证照片'));
            }

            const studentCardUrl = `/uploads/student-verifications/${file.filename}`;
            const verificationData = {
                ...(user.verification_data || {}),
                status: 'pending',
                student_card: studentCardUrl,
                submitted_at: new Date().toISOString(),
                review_reason: null,
                reviewed_at: null,
            };

            await user.update({
                student_verified: false,
                student_verified_at: null,
                verification_data: verificationData,
            });

            const userData = await buildUserResponse(user);

            res.json(
                responseUtils.success(
                    {
                        user: userData,
                        verification_data: verificationData,
                    },
                    '学生认证材料已提交，请等待审核'
                )
            );
        } catch (error) {
            console.error('提交学生认证失败:', error);
            res.status(500).json(responseUtils.error('提交学生认证失败'));
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

    static async getPublicUserProfile(req, res) {
        try {
            const userId = Number(req.params.id || 0);
            if (!userId) {
                return res.status(400).json(responseUtils.error('用户ID不正确'));
            }

            const user = await User.findByPk(userId, {
                attributes: [
                    'id',
                    'username',
                    'real_name',
                    'avatar',
                    'gender',
                    'college',
                    'major',
                    'grade',
                    'bio',
                    'skills',
                    'rating',
                    'completed_orders',
                    'completed_tasks',
                    'student_verified',
                    'createdAt',
                    'updatedAt',
                ],
            });

            if (!user) {
                return res.status(404).json(responseUtils.error('用户不存在'));
            }

            const [
                taskStats,
                orderStats,
                publishedTaskCount,
                publishedOrderCount,
                recentTaskReviews,
                recentOrderReviews,
            ] = await Promise.all([
                Task.findOne({
                    where: {
                        assignee_id: userId,
                        status: 'completed',
                        rating: { [Op.not]: null },
                    },
                    attributes: [
                        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
                    ],
                    raw: true,
                }),
                PickupOrder.findOne({
                    where: {
                        deliverer_id: userId,
                        status: 'completed',
                        rating: { [Op.not]: null },
                    },
                    attributes: [
                        [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating'],
                        [sequelize.fn('COUNT', sequelize.col('id')), 'reviewCount'],
                    ],
                    raw: true,
                }),
                Task.count({ where: { publisher_id: userId } }),
                PickupOrder.count({ where: { user_id: userId } }),
                Task.findAll({
                    where: {
                        assignee_id: userId,
                        status: 'completed',
                        rating: { [Op.not]: null },
                    },
                    include: [
                        {
                            model: User,
                            as: 'publisher',
                            attributes: ['id', 'username', 'real_name', 'avatar'],
                        },
                    ],
                    attributes: ['id', 'title', 'rating', 'rating_comment', 'images', 'createdAt'],
                    order: [['updated_at', 'DESC']],
                    limit: 6,
                }),
                PickupOrder.findAll({
                    where: {
                        deliverer_id: userId,
                        status: 'completed',
                        rating: { [Op.not]: null },
                    },
                    include: [
                        {
                            model: User,
                            as: 'user',
                            attributes: ['id', 'username', 'real_name', 'avatar'],
                        },
                    ],
                    attributes: ['id', 'title', 'rating', 'rating_comment', 'createdAt'],
                    order: [['updated_at', 'DESC']],
                    limit: 6,
                }),
            ]);

            const result = {
                user: pickPublicUser(user),
                stats: {
                    overall_rating: Number(Number(user.rating || 0).toFixed(2)),
                    task_rating: Number(Number(taskStats?.avgRating || 0).toFixed(2)),
                    order_rating: Number(Number(orderStats?.avgRating || 0).toFixed(2)),
                    total_task_reviews: Number(taskStats?.reviewCount || 0),
                    total_order_reviews: Number(orderStats?.reviewCount || 0),
                    completed_tasks: Number(user.completed_tasks || 0),
                    completed_orders: Number(user.completed_orders || 0),
                    published_tasks: Number(publishedTaskCount || 0),
                    published_orders: Number(publishedOrderCount || 0),
                },
                recent_task_reviews: recentTaskReviews.map(item => ({
                    id: item.id,
                    rating: Number(item.rating || 0),
                    comment: item.rating_comment,
                    title: item.title,
                    createdAt: item.createdAt,
                    publisher: item.publisher || null,
                })),
                recent_order_reviews: recentOrderReviews.map(item => ({
                    id: item.id,
                    rating: Number(item.rating || 0),
                    comment: item.rating_comment,
                    images: Array.isArray(item.images) ? item.images : [],
                    title: item.title,
                    createdAt: item.createdAt,
                    reviewer: item.user || null,
                })),
            };

            return res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取公开用户详情失败:', error);
            return res.status(500).json(responseUtils.error('获取公开用户详情失败'));
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

    // 发送邮箱验证码
    static async sendVerificationCode(req, res) {
        try {
            const email = getRequestEmail(req.body);

            if (!validationUtils.isEmail(email)) {
                return res.status(400).json(responseUtils.error('邮箱格式不正确'));
            }

            const result = await emailService.sendVerifyCode(email);
            res.json(responseUtils.success(result, '验证码发送成功'));
        } catch (error) {
            console.error('发送验证码失败:', error);
            res.status(error.status || 500).json(responseUtils.error(error.message || '发送验证码失败'));
        }
    }

    // 验证邮箱验证码
    static async verifyCode(req, res) {
        try {
            const email = getRequestEmail(req.body);
            const code = String(req.body.code || '').trim();

            if (!validationUtils.isEmail(email)) {
                return res.status(400).json(responseUtils.error('邮箱格式不正确'));
            }

            await emailService.verifyCode(email, code);

            const user = req.user;
            if (user && user.email && user.email.toLowerCase() === email) {
                await user.update({
                    email_verified: true,
                });

                return res.json(responseUtils.success({ email, verified: true }, '验证成功'));
            }

            const resetToken = cryptoUtils.randomString(24);
            await redis.set(getResetTokenKey(resetToken), email, 'EX', RESET_PASSWORD_TTL);

            res.json(
                responseUtils.success(
                    {
                        email,
                        verified: true,
                        resetToken,
                        reset_token: resetToken,
                        expires_in: RESET_PASSWORD_TTL,
                    },
                    '验证成功'
                )
            );
        } catch (error) {
            console.error('验证失败:', error);
            res.status(error.status || 500).json(responseUtils.error(error.message || '验证失败'));
        }
    }

    // // 微信登录
    // static async wechatLogin(req, res) {
    //     try {
    //         const { code } = req.body;

    //         // 这里应该实现微信OAuth流程
    //         // 1. 用code换取access_token和openid
    //         // 2. 根据openid查找或创建用户
    //         // 暂时返回模拟响应

    //         res.json(responseUtils.success(null, '微信登录功能待实现'));
    //     } catch (error) {
    //         console.error('微信登录失败:', error);
    //         res.status(500).json(responseUtils.error('微信登录失败'));
    //     }
    // }

    // // 微信OAuth实现
    // static async wechatOAuth(req, res) {
    //     try {
    //         const { code } = req.body;

    //         // TODO: 实现完整的微信OAuth流程
    //         const mockOpenId = 'mock_openid_' + Date.now();
    //         let user = await User.findOne({ where: { wechat_openid: mockOpenId } });

    //         if (!user) {
    //             // 创建新用户
    //             user = await User.create({
    //                 student_id: 'WX' + Date.now(),
    //                 username: '微信用户',
    //                 email: `wx_${Date.now()}@temp.com`,
    //                 password: Math.random().toString(36),
    //                 wechat_openid: mockOpenId,
    //                 status: 'active',
    //             });
    //         }

    //         // 生成JWT令牌
    //         const token = jwtUtils.generateToken({
    //             id: user.id,
    //             type: 'user',
    //         });

    //         const userData = await buildUserResponse(user);

    //         res.json(
    //             responseUtils.success(
    //                 {
    //                     user: userData,
    //                     token,
    //                     is_new_user: !user.student_verified,
    //                 },
    //                 '微信登录成功'
    //             )
    //         );
    //     } catch (error) {
    //         console.error('微信OAuth失败:', error);
    //         res.status(500).json(responseUtils.error('微信OAuth失败'));
    //     }
    // }

    // 发送密码重置邮件
    static async sendPasswordResetEmail(req, res) {
        try {
            const email = getRequestEmail(req.body);

            if (!validationUtils.isEmail(email)) {
                return res.status(400).json(responseUtils.error('邮箱格式不正确'));
            }

            const user = await User.findOne({ where: { email } });
            if (!user) {
                return res.status(400).json(responseUtils.error('邮箱不存在'));
            }

            const resetToken = cryptoUtils.randomString(24);
            const resetUrl = buildResetPasswordUrl(resetToken);

            await redis.set(getResetTokenKey(resetToken), String(user.id), 'EX', RESET_PASSWORD_TTL);

            const transporter = require('../../../config/mail');
            const from = process.env.MAIL_FROM || process.env.MAIL_USER;

            await transporter.sendMail({
                from,
                to: email,
                subject: '找回密码',
                text: `请在${RESET_PASSWORD_TTL / 60}分钟内打开以下链接重置密码：${resetUrl}`,
                html: emailService.buildResetPasswordEmail(resetUrl, RESET_PASSWORD_TTL / 60),
            });

            res.json(
                responseUtils.success(
                    {
                        expires_in: RESET_PASSWORD_TTL,
                        ...(process.env.NODE_ENV !== 'production' ? { reset_token: resetToken } : {}),
                    },
                    '密码重置邮件已发送'
                )
            );
        } catch (error) {
            console.error('发送密码重置邮件失败:', error);
            res.status(error.status || 500).json(responseUtils.error(error.message || '发送密码重置邮件失败'));
        }
    }

    // 验证重置token
    static async verifyResetToken(req, res) {
        try {
            const token = String(req.params.token || '').trim();
            const userId = token ? await redis.get(getResetTokenKey(token)) : null;

            if (!userId) {
                return res.status(400).json(responseUtils.error('重置链接无效或已过期'));
            }

            const ttl = await redis.ttl(getResetTokenKey(token));
            res.json(responseUtils.success({ valid: true, expires_in: ttl }, '重置链接有效'));
        } catch (error) {
            console.error('验证重置token失败:', error);
            res.status(500).json(responseUtils.error('验证重置token失败'));
        }
    }

    // 重置密码
    static async resetPassword(req, res) {
        try {
            const token = String(req.body.token || req.body.resetToken || req.body.reset_token || '').trim();
            const newPassword = req.body.new_password || req.body.newPassword;

            const userId = token ? await redis.get(getResetTokenKey(token)) : null;
            if (!userId) {
                return res.status(400).json(responseUtils.error('重置链接无效或已过期'));
            }

            const user = /^\d+$/.test(String(userId))
                ? await User.findByPk(userId)
                : await User.findOne({ where: { email: String(userId).toLowerCase() } });
            if (!user) {
                await redis.del(getResetTokenKey(token));
                return res.status(400).json(responseUtils.error('用户不存在'));
            }

            await user.update({
                password: newPassword,
            });

            await redis.del(getResetTokenKey(token));

            res.json(responseUtils.success(null, '密码重置成功'));
        } catch (error) {
            console.error('重置密码失败:', error);
            res.status(500).json(responseUtils.error('重置密码失败'));
        }
    }

    // // 获取设备列表
    // static async getDevices(req, res) {
    //     try {
    //         const user = req.user;

    //         // TODO: 实现Redis缓存存储设备信息
    //         const devices = [
    //             {
    //                 id: 'device_001',
    //                 device_type: 'mobile',
    //                 device_name: 'iPhone 14',
    //                 last_login: new Date(),
    //                 ip: req.ip,
    //                 location: '哈尔滨',
    //                 is_current: true,
    //             },
    //         ];

    //         res.json(responseUtils.success(devices));
    //     } catch (error) {
    //         console.error('获取设备列表失败:', error);
    //         res.status(500).json(responseUtils.error('获取设备列表失败'));
    //     }
    // }

    // // 登出指定设备
    // static async logoutDevice(req, res) {
    //     try {
    //         const { device_id } = req.params;

    //         // TODO: 实现设备登出逻辑，将设备token加入黑名单
    //         console.log(`设备 ${device_id} 已被登出`);

    //         res.json(responseUtils.success(null, '设备已登出'));
    //     } catch (error) {
    //         console.error('设备登出失败:', error);
    //         res.status(500).json(responseUtils.error('设备登出失败'));
    //     }
    // }
}

module.exports = UserAuthController;
