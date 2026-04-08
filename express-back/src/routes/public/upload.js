const express = require('express');
const router = express.Router();
const path = require('path');
const { optimizeUploads } = require('../../middleware/optimizeUploads');
const {
    buildPublicUploadPath,
    createUpload,
    resolveUploadDir,
    resolveUploadSegments,
} = require('../../utils/uploads');

const upload = createUpload({
    destination: req => {
        const segments = resolveUploadSegments(req.body?.category || req.query?.category);
        return resolveUploadDir(...segments);
    },
    filename: (_req, file) => `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`,
    fileSize: 10 * 1024 * 1024,
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
router.post('/single', upload.single('file'), optimizeUploads({ maxWidth: 1920, maxHeight: 1920, quality: 80 }), (req, res) => {
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
router.post('/multiple', upload.array('files', 5), optimizeUploads({ maxWidth: 1920, maxHeight: 1920, quality: 80 }), (req, res) => {
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
