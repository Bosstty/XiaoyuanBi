const express = require('express');
const router = express.Router();
const AdminForumController = require('@/controllers/admin/ForumController');

// 获取帖子列表
router.get('/posts', AdminForumController.getPosts);

// 获取帖子详情
router.get('/posts/:id', AdminForumController.getPostDetail);

// 审核帖子
router.patch('/posts/:id/moderate', AdminForumController.moderatePost);

// 删除帖子
router.delete('/posts/:id', AdminForumController.deletePost);

// 获取评论列表
router.get('/comments', AdminForumController.getComments);

// 删除评论
router.delete('/comments/:id', AdminForumController.deleteComment);

// 获取举报列表
router.get('/reports', AdminForumController.getReports);

// 处理举报
router.patch('/reports/:id', AdminForumController.handleReport);

module.exports = router;
