const express = require('express');
const router = express.Router();
const ServiceChatController = require('../../controllers/service/ChatController');

// 创建会话
router.post('/conversations', ServiceChatController.createConversation);

// 获取会话列表（客服端）
router.get('/conversations', ServiceChatController.getConversations);

// 获取我的会话列表（用户端）
router.get('/my/conversations', ServiceChatController.getMyConversations);

// 获取会话详情
router.get('/conversations/:id', ServiceChatController.getConversationDetail);

// 获取可转接客服列表
router.get('/services', ServiceChatController.getAvailableServices);

// 转接会话
router.post('/conversations/:id/transfer', ServiceChatController.transferConversation);

// 获取消息列表
router.get('/messages', ServiceChatController.getMessages);

// 发送消息
router.post('/messages', ServiceChatController.sendMessage);

// 标记消息已读
router.post('/messages/read', ServiceChatController.markAsRead);

// 获取用户统计信息
router.get('/users/:userId/stats', ServiceChatController.getUserStats);

module.exports = router;
