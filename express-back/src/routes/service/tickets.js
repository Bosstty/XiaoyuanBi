const express = require('express');
const router = express.Router();
const ServiceTicketController = require('../../controllers/service/TicketController');

// 获取工单列表
router.get('/', ServiceTicketController.getTickets);

// 获取工单详情
router.get('/:id', ServiceTicketController.getTicketDetail);

// 创建工单
router.post('/', ServiceTicketController.createTicket);

// 更新工单状态
router.patch('/:id/status', ServiceTicketController.updateTicketStatus);

// 分配工单
router.post('/:id/assign', ServiceTicketController.assignTicket);

module.exports = router;
