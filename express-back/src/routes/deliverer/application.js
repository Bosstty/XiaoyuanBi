const express = require('express');
const router = express.Router();
const DelivererApplicationController = require('../../controllers/deliverer/ApplicationController');
const { authMiddleware } = require('../../middleware');
const multer = require('multer');
const path = require('path');

// 配置multer用于文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/deliverer-applications/');
    },
    filename: function (req, file, cb) {
        cb(
            null,
            Date.now() + '-' + Math.round(Math.random() * 1e9) + path.extname(file.originalname)
        );
    },
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
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
    DelivererApplicationController.submitApplication
);

// 获取申请状态
router.get('/status', authMiddleware, DelivererApplicationController.getApplicationStatus);

// 更新申请信息
router.put('/update', authMiddleware, DelivererApplicationController.updateApplication);

module.exports = router;
