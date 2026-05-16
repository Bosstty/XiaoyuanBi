const { ForumPost: Post, ForumComment: Comment, User, ContentReport } = require('@/models');
const { Op } = require('sequelize');
const AdminActionNotificationService = require('@/services/AdminActionNotificationService');

/**
 * 论坛管理控制器
 * Forum Management Controller
 */
class ForumController {
  /**
   * 获取帖子列表
   * Get posts list with pagination and filters
   */
  static async getPosts(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        category,
        user_id,
        search,
        start_date,
        end_date,
        sortBy = 'createdAt'
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      // 构建查询条件
      if (status) where.status = status;
      if (category) where.category = category;
      if (user_id) where.author_id = user_id;

      if (start_date || end_date) {
        where.createdAt = {};
        if (start_date) where.createdAt[Op.gte] = new Date(start_date);
        if (end_date) {
          const endDateObj = new Date(end_date);
          endDateObj.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endDateObj;
        }
      }

      if (search) {
        where[Op.or] = [
          { title: { [Op.like]: `%${search}%` } },
          { content: { [Op.like]: `%${search}%` } }
        ];
      }

      const { count, rows: posts } = await Post.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'real_name', 'avatar', 'phone'],
            required: false
          }
        ],
        order: [[sortBy, 'DESC']]
      });

      return res.json({
        success: true,
        message: '获取帖子列表成功',
        data: {
          posts,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get posts error:', error);
      return res.status(500).json({
        success: false,
        message: '获取帖子列表失败',
        error: error.message
      });
    }
  }

  /**
   * 获取帖子详情
   * Get post detail by ID
   */
  static async getPostDetail(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '帖子ID不能为空'
        });
      }

      const post = await Post.findByPk(id, {
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'real_name', 'avatar', 'phone', 'student_id']
          },
          {
            model: Comment,
            as: 'comments',
            separate: true,
            limit: 20,
            order: [['createdAt', 'DESC']],
            include: [{
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'real_name', 'avatar']
            }]
          }
        ]
      });

      if (!post) {
        return res.status(404).json({
          success: false,
          message: '帖子不存在'
        });
      }

      const reportCount = await ContentReport.count({
        where: { biz_type: 'post', biz_id: id, status: 'pending' }
      });

      return res.json({
        success: true,
        message: '获取帖子详情成功',
        data: {
          ...post.toJSON(),
          reportCount
        }
      });
    } catch (error) {
      console.error('Get post detail error:', error);
      return res.status(500).json({
        success: false,
        message: '获取帖子详情失败',
        error: error.message
      });
    }
  }

  /**
   * 审核帖子
   * Moderate post
   */
  static async moderatePost(req, res) {
    try {
      const { id } = req.params;
      const { action, reason, remark } = req.body;
      const adminUser = req.user;

      if (!id || !action) {
        return res.status(400).json({
          success: false,
          message: '帖子ID和操作不能为空'
        });
      }

      const allowedActions = ['approve', 'reject', 'hide', 'pin', 'unpin', 'restore'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: '无效的操作'
        });
      }

      const post = await Post.findByPk(id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: '帖子不存在'
        });
      }

      // 根据操作更新帖子状态
      switch (action) {
        case 'approve':
          post.status = 'published';
          post.approvedAt = new Date();
          post.approvedBy = adminUser.id;
          break;
        case 'reject':
          post.status = 'rejected';
          post.rejectReason = reason;
          post.rejectedAt = new Date();
          post.rejectedBy = adminUser.id;
          break;
        case 'hide':
          post.status = 'hidden';
          post.rejectReason = reason;
          post.hiddenAt = new Date();
          post.hiddenBy = adminUser.id;
          break;
        case 'pin':
          post.isPinned = true;
          post.pinnedAt = new Date();
          post.pinnedBy = adminUser.id;
          break;
        case 'unpin':
          post.isPinned = false;
          break;
        case 'restore':
          post.status = 'published';
          post.rejectReason = null;
          post.hiddenAt = null;
          post.hiddenBy = null;
          break;
      }

      post.adminRemark = remark;
      post.moderatedBy = adminUser.id;
      post.moderatedAt = new Date();

      await post.save();

      if (['reject', 'hide', 'pin', 'unpin', 'restore', 'approve'].includes(action)) {
        await AdminActionNotificationService.notifyUser({
          userId: post.author_id,
          adminUser,
          entityType: 'forum_post',
          entityId: post.id,
          entityTitle: post.title,
          action,
          reason,
          remark
        });
      }

      return res.json({
        success: true,
        message: `帖子${action}操作成功`,
        data: post
      });
    } catch (error) {
      console.error('Moderate post error:', error);
      return res.status(500).json({
        success: false,
        message: '审核帖子失败',
        error: error.message
      });
    }
  }

  /**
   * 删除帖子
   * Delete post (soft delete)
   */
  static async deletePost(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUser = req.user;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '帖子ID不能为空'
        });
      }

      if (!reason) {
        return res.status(400).json({
          success: false,
          message: '删除原因不能为空'
        });
      }

      const post = await Post.findByPk(id);

      if (!post) {
        return res.status(404).json({
          success: false,
          message: '帖子不存在'
        });
      }

      // 软删除
      post.status = 'hidden';
      post.rejectReason = reason;
      post.hiddenAt = new Date();
      post.hiddenBy = adminUser.id;

      await post.save();

      // TODO: 同时删除相关评论和举报记录
      await AdminActionNotificationService.notifyUser({
        userId: post.author_id,
        adminUser,
        entityType: 'forum_post',
        entityId: post.id,
        entityTitle: post.title,
        action: 'delete',
        reason
      });

      return res.json({
        success: true,
        message: '帖子已删除',
        data: post
      });
    } catch (error) {
      console.error('Delete post error:', error);
      return res.status(500).json({
        success: false,
        message: '删除帖子失败',
        error: error.message
      });
    }
  }

  /**
   * 获取评论列表
   * Get comments list
   */
  static async getComments(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        postId,
        userId,
        status,
        keyword,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (postId) where.postId = postId;
      if (userId) where.userId = userId;
      if (status) where.status = status;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endDateObj;
        }
      }

      if (keyword) {
        where.content = { [Op.like]: `%${keyword}%` };
      }

      const { count, rows: comments } = await Comment.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: User,
            as: 'author',
            attributes: ['id', 'username', 'real_name', 'avatar']
          },
          {
            model: Post,
            as: 'post',
            attributes: ['id', 'title']
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        success: true,
        message: '获取评论列表成功',
        data: {
          comments,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get comments error:', error);
      return res.status(500).json({
        success: false,
        message: '获取评论列表失败',
        error: error.message
      });
    }
  }

  /**
   * 删除评论
   * Delete comment
   */
  static async deleteComment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const adminUser = req.user;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: '评论ID不能为空'
        });
      }

      const comment = await Comment.findByPk(id);

      if (!comment) {
        return res.status(404).json({
          success: false,
          message: '评论不存在'
        });
      }

      // 软删除
      comment.status = 'hidden';
      comment.rejectReason = reason;
      comment.hiddenAt = new Date();
      comment.hiddenBy = adminUser.id;

      await comment.save();

      // TODO: 更新帖子评论数
      // TODO: 发送通知给评论作者

      return res.json({
        success: true,
        message: '评论已删除',
        data: comment
      });
    } catch (error) {
      console.error('Delete comment error:', error);
      return res.status(500).json({
        success: false,
        message: '删除评论失败',
        error: error.message
      });
    }
  }

  /**
   * 获取举报列表
   * Get reports list
   */
  static async getReports(req, res) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        type,
        startDate,
        endDate
      } = req.query;

      const offset = (page - 1) * limit;
      const where = {};

      if (status) where.status = status;
      if (type) where.reason_type = type;

      if (startDate || endDate) {
        where.createdAt = {};
        if (startDate) where.createdAt[Op.gte] = new Date(startDate);
        if (endDate) {
          const endDateObj = new Date(endDate);
          endDateObj.setHours(23, 59, 59, 999);
          where.createdAt[Op.lte] = endDateObj;
        }
      }

      const whereWithType = { ...where, biz_type: 'post' };
      const { count, rows: reports } = await ContentReport.findAndCountAll({
        where: whereWithType,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include: [
          {
            model: User,
            as: 'reporter',
            attributes: ['id', 'username', 'real_name', 'avatar']
          },
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.json({
        success: true,
        message: '获取举报列表成功',
        data: {
          reports,
          pagination: {
            total: count,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(count / limit)
          }
        }
      });
    } catch (error) {
      console.error('Get reports error:', error);
      return res.status(500).json({
        success: false,
        message: '获取举报列表失败',
        error: error.message
      });
    }
  }

  /**
   * 处理举报
   * Handle report
   */
  static async handleReport(req, res) {
    try {
      const { id } = req.params;
      const { action, reason, remark } = req.body;
      const adminUser = req.user;

      if (!id || !action) {
        return res.status(400).json({
          success: false,
          message: '举报ID和处理动作不能为空'
        });
      }

      const allowedActions = ['accept', 'reject', 'dismiss'];
      if (!allowedActions.includes(action)) {
        return res.status(400).json({
          success: false,
          message: '无效的处理动作'
        });
      }

      const report = await ContentReport.findByPk(id);

      if (!report) {
        return res.status(404).json({
          success: false,
          message: '举报不存在'
        });
      }

      if (report.status !== 'pending') {
        return res.status(400).json({
          success: false,
          message: '该举报已处理'
        });
      }

      // 更新举报状态
      report.status = action === 'accept' ? 'accepted' : 'dismissed';
      report.handle_reason = reason || remark || null;
      report.handled_at = new Date();
      report.handled_by = adminUser.id;

      await report.save();

      // 如果接受举报，需要处理被举报的内容
      if (action === 'accept') {
        if (report.biz_type === 'post') {
          const post = await Post.findByPk(report.biz_id);
          if (post) {
            post.status = 'hidden';
            post.rejectReason = `举报处理: ${reason || '已下架'}`;
            post.hiddenBy = adminUser.id;
            post.hiddenAt = new Date();
            await post.save();
          }
        }
      }

      // TODO: 发送通知给举报人和被举报人

      return res.json({
        success: true,
        message: '举报处理成功',
        data: report
      });
    } catch (error) {
      console.error('Handle report error:', error);
      return res.status(500).json({
        success: false,
        message: '处理举报失败',
        error: error.message
      });
    }
  }
}

module.exports = ForumController;
