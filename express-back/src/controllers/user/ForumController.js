const { ForumPost, ForumComment, User, ContentReport } = require('@/models');
const { responseUtils, requestUtils } = require('@/utils');
const { Op } = require('sequelize');
const ContentModerationService = require('@/services/ContentModerationService');

function getRequestedPostStatus(payload = {}) {
    return String(payload?.status || '').trim().toLowerCase();
}

function getPostPublishPayload(payload = {}, moderationResult) {
    return {
        category: payload.category,
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        tags: payload.tags,
        images: payload.images,
        attachments: payload.attachments,
        is_anonymous: payload.is_anonymous,
        status: 'pending_review',
        rejectReason:
            moderationResult.action === 'review'
                ? ContentModerationService.buildReason(moderationResult)
                : null,
    };
}

function getPostDraftPayload(payload = {}) {
    return {
        category: payload.category,
        title: payload.title,
        summary: payload.summary,
        content: payload.content,
        tags: payload.tags,
        images: payload.images,
        attachments: payload.attachments,
        is_anonymous: payload.is_anonymous,
        status: 'draft',
        rejectReason: null,
    };
}

class ForumController {
    static async createReport(req, res) {
        try {
            const { id } = req.params;
            const reporterId = req.user.id;
            const reasonType = String(req.body?.reason_type || '').trim();
            const reasonText = String(req.body?.reason_text || '').trim();

            if (!reasonType) {
                return res.status(400).json(responseUtils.error('请选择举报原因'));
            }

            const post = await ForumPost.findByPk(id, {
                attributes: ['id', 'author_id', 'title', 'status'],
            });

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            if (Number(post.author_id) === Number(reporterId)) {
                return res.status(400).json(responseUtils.error('不能举报自己的帖子'));
            }

            const existing = await ContentReport.findOne({
                where: {
                    biz_type: 'post',
                    biz_id: id,
                    reporter_id: reporterId,
                    status: 'pending',
                },
            });

            if (existing) {
                return res.status(400).json(responseUtils.error('你已举报过该帖子，请勿重复提交'));
            }

            const report = await ContentReport.create({
                biz_type: 'post',
                biz_id: id,
                reporter_id: reporterId,
                reported_user_id: post.author_id,
                reason_type: reasonType,
                reason_text: reasonText || null,
                snapshot: {
                    title: post.title,
                    status: post.status,
                },
            });

            return res.json(responseUtils.success(report, '举报已提交，管理员会尽快处理'));
        } catch (error) {
            console.error('创建帖子举报失败:', error);
            return res.status(500).json(responseUtils.error('提交举报失败'));
        }
    }

    // 获取各分类帖子数量
    static async getCategoryStats(req, res) {
        try {
            const categories = ['academic', 'life', 'campus', 'task', 'skill'];
            const counts = await ForumPost.count({
                where: { status: 'published' },
                group: ['category'],
            });

            const countMap = counts.reduce((result, item) => {
                result[item.category] = Number(item.count) || 0;
                return result;
            }, {});

            const stats = categories.map(category => ({
                category,
                count: countMap[category] || 0,
            }));

            res.json(responseUtils.success({ stats }));
        } catch (error) {
            console.error('获取论坛分类统计失败:', error);
            return res.status(500).json(responseUtils.error('获取论坛分类统计失败'));
        }
    }
    // 创建帖子
    static async createPost(req, res) {
        try {
            const userId = req.user.id;
            const postData = req.body;
            const requestedStatus = getRequestedPostStatus(postData);

            if (requestedStatus === 'draft') {
                const post = await ForumPost.create({
                    author_id: userId,
                    ...getPostDraftPayload(postData),
                });

                const postWithAuthor = await ForumPost.findByPk(post.id, {
                    include: [
                        {
                            model: User,
                            as: 'author',
                            attributes: [
                                'id',
                                'username',
                                'real_name',
                                'avatar',
                                'college',
                                'major',
                            ],
                        },
                    ],
                });

                return res.json(responseUtils.success(postWithAuthor, '草稿保存成功'));
            }

            const moderationResult = await ContentModerationService.review(postData, {
                label: '帖子内容',
                scene: 'content',
            });

            if (moderationResult.action === 'reject') {
                return res
                    .status(400)
                    .json(
                        responseUtils.error(
                            ContentModerationService.buildUserFacingMessage(moderationResult, {
                                label: '帖子内容',
                            })
                        )
                    );
            }

            const post = await ForumPost.create({
                author_id: userId,
                ...getPostPublishPayload(postData, moderationResult),
            });

            // 获取包含作者信息的帖子详情
            const postWithAuthor = await ForumPost.findByPk(post.id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'college', 'major'],
                    },
                ],
            });

            const message =
                moderationResult.action === 'review'
                    ? ContentModerationService.buildUserFacingMessage(moderationResult, {
                          label: '帖子内容',
                      })
                    : '帖子已提交，正在审核中';
            res.json(responseUtils.success(postWithAuthor, message));
        } catch (error) {
            console.error('创建帖子失败:', error);
            return res.status(500).json(responseUtils.error('创建帖子失败'));
        }
    }

    // 获取帖子列表
    static async getPosts(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                category,
                search,
                sort = 'created_at',
                order = 'desc',
                is_pinned,
                is_hot,
            } = req.query;

            const offset = (page - 1) * limit;
            const where = { status: 'published' };

            // 分类筛选
            if (category) {
                where.category = category;
            }

            // 置顶筛选
            if (is_pinned !== undefined) {
                where.isPinned = is_pinned === 'true';
            }

            // 热门筛选
            if (is_hot !== undefined) {
                where.isHot = is_hot === 'true';
            }

            // 搜索功能
            if (search) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${search}%` } },
                    { content: { [Op.like]: `%${search}%` } },
                    { summary: { [Op.like]: `%${search}%` } },
                ];
            }

            const { count, rows } = await ForumPost.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'college', 'major'],
                    },
                ],
                order: [
                    ['isPinned', 'DESC'], // 置顶优先
                    [sort, order.toUpperCase()],
                ],
                offset: parseInt(offset),
                limit: parseInt(limit),
            });

            const result = {
                posts: rows,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };

            res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取帖子列表失败:', error);
            return res.status(500).json(responseUtils.error('获取帖子列表失败'));
        }
    }

    // 获取帖子详情
    static async getPostById(req, res) {
        try {
            const { id } = req.params;

            const post = await ForumPost.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: [
                            'id',
                            'username',
                            'real_name',
                            'avatar',
                            'college',
                            'major',
                            'rating',
                        ],
                    },
                ],
            });

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            // 非发布状态的帖子，只有作者本人可以查看
            if (post.status !== 'published') {
                const userId = req.user?.id;
                if (!userId || post.author_id !== userId) {
                    return res.status(403).json(responseUtils.error('帖子不可访问'));
                }
            }

            // 增加浏览次数
            await post.increment('viewCount');

            const [report_count, currentUserReport] = await Promise.all([
                ContentReport.count({
                    where: { biz_type: 'post', biz_id: id, status: 'pending' },
                }),
                req.user?.id
                    ? ContentReport.findOne({
                          where: {
                              biz_type: 'post',
                              biz_id: id,
                              reporter_id: req.user.id,
                              status: 'pending',
                          },
                          attributes: ['id'],
                      })
                    : Promise.resolve(null),
            ]);

            const postData = post.toJSON();
            postData.report_count = report_count;
            postData.has_reported = Boolean(currentUserReport);

            res.json(responseUtils.success(postData));
        } catch (error) {
            console.error('获取帖子详情失败:', error);
            return res.status(500).json(responseUtils.error('获取帖子详情失败'));
        }
    }

    // 更新帖子
    static async updatePost(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;
            const updateData = req.body;
            const requestedStatus = getRequestedPostStatus(updateData);

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            // 只有作者可以更新帖子
            if (post.author_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限更新此帖子'));
            }

            if (requestedStatus === 'draft') {
                await post.update(getPostDraftPayload(updateData));
            } else {
                const moderationResult = await ContentModerationService.review(updateData, {
                    label: '帖子内容',
                    scene: 'content',
                });

                if (moderationResult.action === 'reject') {
                    return res
                        .status(400)
                        .json(
                            responseUtils.error(
                                ContentModerationService.buildUserFacingMessage(moderationResult, {
                                    label: '帖子内容',
                                })
                            )
                        );
                }

                await post.update(getPostPublishPayload(updateData, moderationResult));
            }

            const updatedPost = await ForumPost.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                ],
            });

            const message = requestedStatus === 'draft' ? '草稿保存成功' : '帖子已提交，正在审核中';
            res.json(responseUtils.success(updatedPost, message));
        } catch (error) {
            console.error('更新帖子失败:', error);
            return res.status(500).json(responseUtils.error('更新帖子失败'));
        }
    }

    // 删除帖子
    static async deletePost(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            // 只有作者可以删除帖子
            if (post.author_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限删除此帖子'));
            }

            await post.destroy();

            res.json(responseUtils.success(null, '帖子删除成功'));
        } catch (error) {
            console.error('删除帖子失败:', error);
            return res.status(500).json(responseUtils.error('删除帖子失败'));
        }
    }

    // 点赞帖子
    static async likePost(req, res) {
        try {
            const { id } = req.params;

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            // 增加点赞数
            await post.increment('likeCount');

            res.json(responseUtils.success({ likeCount: post.likeCount + 1 }, '点赞成功'));
        } catch (error) {
            console.error('点赞失败:', error);
            return res.status(500).json(responseUtils.error('点赞失败'));
        }
    }

    // 创建评论
    static async createComment(req, res) {
        try {
            const { id } = req.params; // post_id
            const userId = req.user.id;
            const commentData = req.body;
            const clientIp = requestUtils.getClientIp(req);

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            const comment = await ForumComment.create({
                post_id: id,
                author_id: userId,
                ip_address: clientIp,
                ...commentData,
            });

            // 更新帖子评论数和最后评论时间
            await post.update({
                commentCount: post.commentCount + 1,
                lastCommentTime: new Date(),
            });

            // 获取包含作者信息的评论详情
            const commentWithAuthor = await ForumComment.findByPk(comment.id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                    {
                        model: User,
                        as: 'replyToUser',
                        attributes: ['id', 'username', 'real_name'],
                        required: false,
                    },
                ],
            });

            res.json(responseUtils.success(commentWithAuthor, '评论创建成功'));
        } catch (error) {
            console.error('创建评论失败:', error);
            return res.status(500).json(responseUtils.error('创建评论失败'));
        }
    }

    // 获取帖子评论列表
    static async getComments(req, res) {
        try {
            const { id } = req.params; // post_id
            const { page = 1, limit = 20, sort = 'created_at', order = 'asc' } = req.query;

            const offset = (page - 1) * limit;

            const { count, rows } = await ForumComment.findAndCountAll({
                where: {
                    post_id: id,
                    status: 'published',
                },
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar', 'college'],
                    },
                    {
                        model: User,
                        as: 'replyToUser',
                        attributes: ['id', 'username', 'real_name'],
                        required: false,
                    },
                    {
                        model: ForumComment,
                        as: 'parent',
                        attributes: ['id', 'content'],
                        required: false,
                    },
                ],
                order: [[sort, order.toUpperCase()]],
                offset: parseInt(offset),
                limit: parseInt(limit),
            });

            const result = {
                comments: rows,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };

            res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取评论列表失败:', error);
            return res.status(500).json(responseUtils.error('获取评论列表失败'));
        }
    }

    // 点赞评论
    static async likeComment(req, res) {
        try {
            const { commentId } = req.params;

            const comment = await ForumComment.findByPk(commentId);

            if (!comment) {
                return res.status(404).json(responseUtils.error('评论不存在'));
            }

            // 增加点赞数
            await comment.increment('likeCount');

            res.json(responseUtils.success({ likeCount: comment.likeCount + 1 }, '点赞成功'));
        } catch (error) {
            console.error('点赞评论失败:', error);
            return res.status(500).json(responseUtils.error('点赞评论失败'));
        }
    }

    // 获取热门帖子
    static async getHotPosts(req, res) {
        try {
            const { limit = 3 } = req.query;

            const posts = await ForumPost.findAll({
                where: {
                    status: 'published',
                },
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                ],
                order: [
                    ['viewCount', 'DESC'],
                    ['likeCount', 'DESC'],
                    ['createdAt', 'DESC'],
                ],
                limit: parseInt(limit),
            });

            res.json(responseUtils.success(posts));
        } catch (error) {
            console.error('获取热门帖子失败:', error);
            return res.status(500).json(responseUtils.error('获取热门帖子失败'));
        }
    }

    // 获取我的帖子
    static async getMyPosts(req, res) {
        try {
            const userId = req.user.id;
            const { page = 1, limit = 10, status } = req.query;

            const offset = (page - 1) * limit;
            const where = { author_id: userId };

            if (status) {
                where.status = status;
            }

            const { count, rows } = await ForumPost.findAndCountAll({
                where,
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                ],
                order: [['created_at', 'DESC']],
                offset: parseInt(offset),
                limit: parseInt(limit),
            });

            const result = {
                posts: rows,
                pagination: {
                    current: parseInt(page),
                    pageSize: parseInt(limit),
                    total: count,
                    totalPages: Math.ceil(count / limit),
                },
            };

            res.json(responseUtils.success(result));
        } catch (error) {
            console.error('获取我的帖子失败:', error);
            return res.status(500).json(responseUtils.error('获取我的帖子失败'));
        }
    }
}

module.exports = ForumController;
