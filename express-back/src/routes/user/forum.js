const express = require('express');
const ForumController = require('../../controllers/user/ForumController');
const { auth } = require('../../middleware/auth');
const { validate, validationRules } = require('../../middleware/validation');

const router = express.Router();

// 公开接口（不需要认证）
router.get('/', ForumController.getPosts); // 获取帖子列表
router.get('/hot', ForumController.getHotPosts); // 获取热门帖子
router.get('/:id', ForumController.getPostById); // 获取帖子详情
router.get('/:id/comments', ForumController.getComments); // 获取帖子评论

// 需要用户认证的接口
router.post('/', auth('user'), validate(validationRules.forumPost), ForumController.createPost); // 创建帖子
router.put('/:id', auth('user'), ForumController.updatePost); // 更新帖子
router.delete('/:id', auth('user'), ForumController.deletePost); // 删除帖子
router.post('/:id/like', auth('user'), ForumController.likePost); // 点赞帖子

// 评论相关
router.post('/:id/comments', auth('user'), ForumController.createComment); // 创建评论
router.post('/comments/:commentId/like', auth('user'), ForumController.likeComment); // 点赞评论

// 个人帖子相关接口
router.get('/my/posts', auth('user'), ForumController.getMyPosts); // 获取我的帖子

module.exports = router;
