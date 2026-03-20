const express = require('express');
const router = express.Router();
const AdminUserController = require('../../controllers/admin/UserController');

// 用户管理路由
router.get('/', AdminUserController.getUsers);
router.get('/stats', AdminUserController.getUserStats);
router.get('/export', AdminUserController.exportUsers);
router.post('/batch-update', AdminUserController.batchUpdateUsers);
router.get('/:id', AdminUserController.getUserDetail);
router.put('/:id/status', AdminUserController.updateUserStatus);
router.put('/:id/verify', AdminUserController.verifyStudent);
router.post('/:id/reset-password', AdminUserController.resetUserPassword);
router.get('/:id/activity-log', AdminUserController.getUserActivityLog);

module.exports = router;
