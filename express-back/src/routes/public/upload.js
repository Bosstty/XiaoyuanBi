const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadRoot = path.join(process.cwd(), 'uploads');
const uploadCategoryMap = {
    chat: ['chat'],
    'order-pickup': ['orders', 'pickup'],
    'order-delivery': ['orders', 'delivery'],
    'order-review': ['orders', 'reviews'],
    avatar: ['avatars'],
    misc: ['misc'],
};

const resolveUploadSegments = category => {
    const normalized = String(category || 'misc')
        .trim()
        .toLowerCase();
    return uploadCategoryMap[normalized] || uploadCategoryMap.misc;
};

const buildPublicUploadPath = (segments, filename) =>
    `/uploads/${segments.join('/')}/${filename}`.replace(/\\/g, '/');

// 配置文件上传
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const segments = resolveUploadSegments(req.body?.category || req.query?.category);
        const targetDir = path.join(uploadRoot, ...segments);
        fs.mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    },
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('不支持的文件类型'));
        }
    },
});

// 单文件上传
router.post('/single', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: '未上传文件',
            });
        }

        const segments = resolveUploadSegments(req.body?.category || req.query?.category);
        const publicPath = buildPublicUploadPath(segments, req.file.filename);
        res.json({
            success: true,
            message: '文件上传成功',
            data: {
                filename: req.file.filename,
                originalname: req.file.originalname,
                size: req.file.size,
                category: req.body?.category || req.query?.category || 'misc',
                path: publicPath,
                url: `${req.protocol}://${req.get('host')}${publicPath}`,
            },
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '文件上传失败',
            error: error.message,
        });
    }
});

// 多文件上传
router.post('/multiple', upload.array('files', 5), (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({
                success: false,
                message: '未上传文件',
            });
        }

        const segments = resolveUploadSegments(req.body?.category || req.query?.category);
        const files = req.files.map(file => ({
            filename: file.filename,
            originalname: file.originalname,
            size: file.size,
            category: req.body?.category || req.query?.category || 'misc',
            path: buildPublicUploadPath(segments, file.filename),
            url: `${req.protocol}://${req.get('host')}${buildPublicUploadPath(
                segments,
                file.filename
            )}`,
        }));

        res.json({
            success: true,
            message: '文件上传成功',
            data: files,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '文件上传失败',
            error: error.message,
        });
    }
});

module.exports = router;
