const Module = require('module');
const path = require('path');

const srcRoot = path.resolve(__dirname, 'src');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
    if (request === '@' || request.startsWith('@/')) {
        const relativePath = request === '@' ? '' : request.slice(2);
        const aliasTarget = path.join(srcRoot, relativePath);
        return originalResolveFilename.call(this, aliasTarget, parent, isMain, options);
    }

    return originalResolveFilename.call(this, request, parent, isMain, options);
};
