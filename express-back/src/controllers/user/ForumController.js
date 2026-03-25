const { ForumPost, ForumComment, User } = require('../../models');
const { responseUtils } = require('../../utils');
const { Op } = require('sequelize');

class ForumController {
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

            const post = await ForumPost.create({
                author_id: userId,
                ...postData,
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

            res.json(responseUtils.success(postWithAuthor, '帖子创建成功'));
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

            res.json(responseUtils.success(post));
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

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            // 只有作者可以更新帖子
            if (post.author_id !== userId) {
                return res.status(403).json(responseUtils.error('无权限更新此帖子'));
            }

            await post.update(updateData);

            const updatedPost = await ForumPost.findByPk(id, {
                include: [
                    {
                        model: User,
                        as: 'author',
                        attributes: ['id', 'username', 'real_name', 'avatar'],
                    },
                ],
            });

            res.json(responseUtils.success(updatedPost, '帖子更新成功'));
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

            const post = await ForumPost.findByPk(id);

            if (!post) {
                return res.status(404).json(responseUtils.error('帖子不存在'));
            }

            const comment = await ForumComment.create({
                post_id: id,
                author_id: userId,
                ip_address: req.ip,
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
