const express = require('express');
const ForumController = require('../../controllers/user/ForumController');
const { auth } = require('../../middleware/auth');
const { validate, validationRules } = require('../../middleware/validation');

const router = express.Router();

// 公开接口
router.get('/', ForumController.getPosts);
router.get('/hot', ForumController.getHotPosts);
router.get('/stats/categories', ForumController.getCategoryStats);
router.get('/my/posts', auth('user'), ForumController.getMyPosts);
router.get('/:id', ForumController.getPostById);
router.get('/:id/comments', ForumController.getComments);

// 需要用户认证的接口
router.post('/', auth('user'), validate(validationRules.forumPost), ForumController.createPost);
router.put('/:id', auth('user'), ForumController.updatePost);
router.delete('/:id', auth('user'), ForumController.deletePost);
router.post('/:id/like', auth('user'), ForumController.likePost);
router.post('/:id/report', auth('user'), ForumController.createReport);

// 评论相关
router.post('/:id/comments', auth('user'), ForumController.createComment);
router.post('/comments/:commentId/like', auth('user'), ForumController.likeComment);

module.exports = router;
