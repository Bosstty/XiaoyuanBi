const fs = require('fs');
const path = require('path');
const multer = require('multer');

const DEFAULT_UPLOAD_ROOT = path.resolve(process.cwd(), 'uploads');
const uploadRoot = path.resolve(process.env.UPLOAD_ROOT || process.env.UPLOAD_PATH || DEFAULT_UPLOAD_ROOT);

const uploadCategoryMap = {
    avatar: ['avatars'],
    chat: ['chat'],
    misc: ['misc'],
    'order-delivery': ['orders', 'delivery'],
    'order-pickup': ['orders', 'pickup'],
    'order-review': ['orders', 'reviews'],
    'student-verification': ['student-verifications'],
    'deliverer-application': ['deliverer-applications'],
};

function ensureDir(dirPath) {
    fs.mkdirSync(dirPath, { recursive: true });
    return dirPath;
}

function getUploadRoot() {
    return ensureDir(uploadRoot);
}

function resolveUploadSegments(category = 'misc') {
    const normalized = String(category).trim().toLowerCase();
    return uploadCategoryMap[normalized] || uploadCategoryMap.misc;
}

function resolveUploadDir(...segments) {
    return ensureDir(path.join(getUploadRoot(), ...segments));
}

function buildPublicUploadPath(segments, filename) {
    return `/uploads/${segments.join('/')}/${filename}`.replace(/\\/g, '/');
}

function createFilename(file, prefix = '') {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    return `${prefix}${uniqueSuffix}${ext}`;
}

function createDiskStorage({ destination, filename }) {
    return multer.diskStorage({
        destination(req, file, cb) {
            try {
                cb(null, destination(req, file));
            } catch (error) {
                cb(error);
            }
        },
        filename(req, file, cb) {
            try {
                cb(null, filename(req, file));
            } catch (error) {
                cb(error);
            }
        },
    });
}

function createUpload({ destination, filename, fileSize = 10 * 1024 * 1024, fileFilter } = {}) {
    return multer({
        storage: createDiskStorage({
            destination,
            filename: filename || ((_, file) => createFilename(file)),
        }),
        limits: {
            fileSize,
        },
        ...(fileFilter ? { fileFilter } : {}),
    });
}

function collectUploadedFiles(req) {
    const files = [];

    if (req.file) {
        files.push(req.file);
    }

    if (Array.isArray(req.files)) {
        files.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
        Object.values(req.files).forEach(value => {
            if (Array.isArray(value)) {
                files.push(...value);
            }
        });
    }

    return files.filter(file => file && file.path);
}

module.exports = {
    buildPublicUploadPath,
    collectUploadedFiles,
    createFilename,
    createUpload,
    getUploadRoot,
    resolveUploadDir,
    resolveUploadSegments,
};
