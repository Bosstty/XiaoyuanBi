const express = require('express');
const router = express.Router();
const DelivererMessageController = require('@/controllers/deliverer/MessageController');

// 获取配送员消息列表
router.get('/', DelivererMessageController.getMessages);

// 发送消息
router.post('/send', DelivererMessageController.sendMessage);

// 标记消息为已读
router.patch('/:id/read', DelivererMessageController.markAsRead);

module.exports = router;
