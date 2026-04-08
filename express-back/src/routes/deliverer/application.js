const express = require('express');
const router = express.Router();
const DelivererApplicationController = require('../../controllers/deliverer/ApplicationController');
const { authMiddleware } = require('../../middleware');
const path = require('path');
const { optimizeUploads } = require('../../middleware/optimizeUploads');
const { createUpload, resolveUploadDir } = require('../../utils/uploads');

const upload = createUpload({
    destination: () => resolveUploadDir('deliverer-applications'),
    filename: (_req, file) => `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`,
    fileSize: 5 * 1024 * 1024,
});

// 提交配送员申请
router.post(
    '/submit',
    authMiddleware,
    upload.fields([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
        { name: 'vehicle_photo', maxCount: 1 },
    ]),
    optimizeUploads({ maxWidth: 1800, maxHeight: 1800, quality: 78 }),
    DelivererApplicationController.submitApplication
);

// 获取申请状态
router.get('/status', authMiddleware, DelivererApplicationController.getApplicationStatus);

// 更新申请信息
router.put(
    '/update',
    authMiddleware,
    upload.fields([
        { name: 'id_card_front', maxCount: 1 },
        { name: 'id_card_back', maxCount: 1 },
    ]),
    optimizeUploads({ maxWidth: 1800, maxHeight: 1800, quality: 78 }),
    DelivererApplicationController.updateApplication
);

module.exports = router;
