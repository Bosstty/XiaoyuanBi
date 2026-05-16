const fs = require('fs/promises');
const path = require('path');

const { collectUploadedFiles } = require('@/utils/uploads');

let sharp = null;
try {
    sharp = require('sharp');
} catch (error) {
    console.warn('sharp 未安装，图片压缩优化已跳过');
}

const OPTIMIZABLE_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function shouldOptimize(file) {
    return sharp && file && OPTIMIZABLE_MIME_TYPES.has(String(file.mimetype || '').toLowerCase());
}

async function optimizeImage(file, { maxWidth = 1600, maxHeight = 1600, quality = 80 } = {}) {
    if (!shouldOptimize(file)) {
        return;
    }

    const sourcePath = file.path;
    const ext = path.extname(sourcePath).toLowerCase();
    const tempPath = `${sourcePath}.tmp`;
    const pipeline = sharp(sourcePath).rotate().resize({
        width: maxWidth,
        height: maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
    });

    if (ext === '.png') {
        pipeline.png({ compressionLevel: 9, palette: true, quality });
    } else if (ext === '.webp') {
        pipeline.webp({ quality });
    } else {
        pipeline.jpeg({ quality, mozjpeg: true });
    }

    const metadata = await sharp(sourcePath).metadata();
    await pipeline.toFile(tempPath);
    await fs.rename(tempPath, sourcePath);

    const stats = await fs.stat(sourcePath);
    file.size = stats.size;
    file.optimized = true;
    file.image = {
        width: metadata.width,
        height: metadata.height,
    };
}

function optimizeUploads(options = {}) {
    return async function optimizeUploadsMiddleware(req, res, next) {
        const files = collectUploadedFiles(req);

        if (!files.length || !sharp) {
            return next();
        }

        try {
            await Promise.all(files.map(file => optimizeImage(file, options)));
            next();
        } catch (error) {
            next(error);
        }
    };
}

module.exports = {
    optimizeUploads,
};
