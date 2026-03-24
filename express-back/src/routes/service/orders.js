const express = require('express');
const router = express.Router();
const ServiceTicketController = require('../../controllers/service/TicketController');

// 申请退款
router.post('/:id/refund', ServiceTicketController.processRefund);

// 补偿处理
router.post('/:id/compensate', ServiceTicketController.processCompensate);

module.exports = router;
