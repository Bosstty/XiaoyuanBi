const express = require('express');
const router = express.Router();
const AIAssistantController = require('@/controllers/user/AIAssistantController');

router.get('/meta', AIAssistantController.getMeta);
router.post('/chat', AIAssistantController.chat);
router.post('/chat/stream', AIAssistantController.chatStream);

module.exports = router;
