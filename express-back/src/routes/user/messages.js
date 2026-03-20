const express = require('express');
const router = express.Router();
const MessageController = require('../../controllers/user/MessageController');
const { authMiddleware, adminAuthMiddleware } = require('../../middleware');

// 消息相关
router.post('/send', MessageController.sendMessage);
router.get('/list', MessageController.getMessages);
router.post('/mark-read', MessageController.markAsRead);
router.delete('/:message_id', MessageController.deleteMessage);
router.get('/unread-count', MessageController.getUnreadCount);

// 通知设置
router.get('/settings', MessageController.getNotificationSettings);
router.put('/settings', MessageController.updateNotificationSettings);
router.post('/register-device', MessageController.registerDeviceToken);

module.exports = router;