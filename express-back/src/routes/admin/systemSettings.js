const express = require('express');
const router = express.Router();
const SystemSettingsController = require('@/controllers/admin/SystemSettingsController');

// 系统设置管理路由
router.get('/', SystemSettingsController.getSettings);
router.put('/', SystemSettingsController.updateSettings);
router.get('/export', SystemSettingsController.exportSettings);
router.post('/import', SystemSettingsController.importSettings);
router.post('/reset', SystemSettingsController.resetSettings);
router.get('/:category', SystemSettingsController.getSettingsByCategory);
router.put('/:category', SystemSettingsController.updateSettingsByCategory);

module.exports = router;
