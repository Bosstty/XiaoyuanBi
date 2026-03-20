const express = require('express');
const router = express.Router();
const AuditLogController = require('../../controllers/admin/AuditLogController');

// 审计日志管理路由
router.get('/', AuditLogController.getAuditLogs);
router.get('/stats', AuditLogController.getAuditLogStats);
router.get('/operators', AuditLogController.getOperators);
router.get('/high-risk', AuditLogController.getHighRiskLogs);
router.get('/:id', AuditLogController.getAuditLogDetail);
router.delete('/', AuditLogController.deleteAuditLogs);
router.post('/delete', AuditLogController.deleteAuditLogs);

module.exports = router;
