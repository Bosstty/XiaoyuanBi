const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '../..');
const routesRoot = path.join(projectRoot, 'src', 'routes');

const routeModules = [
    { file: 'user/auth.js', tag: 'User Auth', basePath: '/api/user/auth', auth: 'mixed' },
    { file: 'user/profile.js', tag: 'User Profile', basePath: '/api/user/profile', auth: 'user' },
    { file: 'user/orders.js', tag: 'User Orders', basePath: '/api/user/orders', auth: 'user' },
    { file: 'user/tasks.js', tag: 'User Tasks', basePath: '/api/user/tasks', auth: 'user' },
    { file: 'user/forum.js', tag: 'User Forum', basePath: '/api/user/forum', auth: 'mixed' },
    {
        file: 'user/messages.js',
        tag: 'User Messages',
        basePath: '/api/user/messages',
        auth: 'user',
    },
    { file: 'user/wallet.js', tag: 'User Wallet', basePath: '/api/user/wallet', auth: 'user' },
    { file: 'service/chat.js', tag: 'User Chat', basePath: '/api/user/chat', auth: 'user' },
    {
        file: 'deliverer/auth.js',
        tag: 'Deliverer Auth',
        basePath: '/api/deliverer/auth',
        auth: 'mixed',
    },
    {
        file: 'deliverer/application.js',
        tag: 'Deliverer Application',
        basePath: '/api/deliverer/application',
        auth: 'user',
    },
    {
        file: 'deliverer/orders.js',
        tag: 'Deliverer Orders',
        basePath: '/api/deliverer/orders',
        auth: 'deliverer',
    },
    {
        file: 'deliverer/status.js',
        tag: 'Deliverer Status',
        basePath: '/api/deliverer/status',
        auth: 'deliverer',
    },
    {
        file: 'deliverer/earnings.js',
        tag: 'Deliverer Earnings',
        basePath: '/api/deliverer/earnings',
        auth: 'deliverer',
    },
    {
        file: 'deliverer/messages.js',
        tag: 'Deliverer Messages',
        basePath: '/api/deliverer/messages',
        auth: 'deliverer',
    },
    { file: 'admin/auth.js', tag: 'Admin Auth', basePath: '/api/admin/auth', auth: 'mixed' },
    { file: 'admin/users.js', tag: 'Admin Users', basePath: '/api/admin/users', auth: 'admin' },
    {
        file: 'admin/admins.js',
        tag: 'Admin Management',
        basePath: '/api/admin/admins',
        auth: 'admin',
    },
    {
        file: 'admin/services.js',
        tag: 'Admin Services',
        basePath: '/api/admin/services',
        auth: 'admin',
    },
    { file: 'admin/orders.js', tag: 'Admin Orders', basePath: '/api/admin/orders', auth: 'admin' },
    { file: 'admin/tasks.js', tag: 'Admin Tasks', basePath: '/api/admin/tasks', auth: 'admin' },
    {
        file: 'admin/deliverers.js',
        tag: 'Admin Deliverers',
        basePath: '/api/admin/deliverers',
        auth: 'admin',
    },
    { file: 'admin/forum.js', tag: 'Admin Forum', basePath: '/api/admin/forum', auth: 'admin' },
    {
        file: 'admin/reviews.js',
        tag: 'Admin Reviews',
        basePath: '/api/admin/reviews',
        auth: 'admin',
    },
    {
        file: 'admin/analytics.js',
        tag: 'Admin Analytics',
        basePath: '/api/admin/analytics',
        auth: 'admin',
    },
    {
        file: 'admin/finance.js',
        tag: 'Admin Finance',
        basePath: '/api/admin/finance',
        auth: 'admin',
    },
    { file: 'admin/audit.js', tag: 'Admin Audit', basePath: '/api/admin/audit', auth: 'admin' },
    {
        file: 'admin/systemSettings.js',
        tag: 'Admin Settings',
        basePath: '/api/admin/settings',
        auth: 'admin',
    },
    { file: 'service/auth.js', tag: 'Service Auth', basePath: '/api/service/auth', auth: 'mixed' },
    {
        file: 'service/tickets.js',
        tag: 'Service Tickets',
        basePath: '/api/service/tickets',
        auth: 'service',
    },
    { file: 'service/chat.js', tag: 'Service Chat', basePath: '/api/service/chat', auth: 'mixed' },
    {
        file: 'service/orders.js',
        tag: 'Service Orders',
        basePath: '/api/service/orders',
        auth: 'service',
    },
    {
        file: 'service/users.js',
        tag: 'Service Users',
        basePath: '/api/service/users',
        auth: 'service',
    },
    {
        file: 'service/deliverers.js',
        tag: 'Service Deliverers',
        basePath: '/api/service/deliverers',
        auth: 'service',
    },
    {
        file: 'public/upload.js',
        tag: 'Public Upload',
        basePath: '/api/public/upload',
        auth: 'public',
    },
    {
        file: 'routes/auth.js',
        tag: 'Public Auth',
        basePath: '/api/auth',
        auth: 'public',
        absoluteRoot: projectRoot,
    },
];

function normalizeNewlines(content) {
    return content.replace(/\r\n/g, '\n');
}

function stripCommentPrefix(line) {
    return line.replace(/^\/\/\s?/, '').trim();
}

function startCase(input) {
    return String(input || '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, char => char.toUpperCase());
}

function inferSummary(routePath, method, handlerName, comments) {
    const commentText = comments.join(' ').trim();
    if (commentText) {
        return commentText;
    }

    if (handlerName) {
        const handlerLeaf = handlerName.split('.').pop();
        return startCase(handlerLeaf);
    }

    return `${method} ${routePath}`;
}

function normalizePath(basePath, routePath) {
    if (routePath === '/') {
        return basePath;
    }

    return `${basePath}${routePath.startsWith('/') ? routePath : `/${routePath}`}`;
}

function toOpenApiPath(pathname) {
    return pathname.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function detectConsumes(statement) {
    if (/upload\.(single|array|fields)\(/.test(statement)) {
        return 'multipart/form-data';
    }

    return 'application/json';
}

function detectAuth(statement, defaultAuth) {
    if (/adminAuthMiddleware/.test(statement)) return 'admin';
    if (/serviceAuth/.test(statement)) return 'service';
    if (/authMiddleware|auth\(/.test(statement)) return 'user';
    return defaultAuth;
}

function normalizeAuth(auth) {
    if (auth === 'mixed') return null;
    if (auth === 'public') return null;
    return [{ bearerAuth: [] }];
}

function extractHandlerName(statement) {
    const compact = statement.replace(/\s+/g, ' ');
    const matches = compact.match(/([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+)\s*\)?\s*;?\s*$/);
    return matches ? matches[1] : null;
}

function extractInlineComment(statement) {
    const lines = normalizeNewlines(statement).split('\n');
    const lastLine = lines[lines.length - 1];
    const match = lastLine.match(/\/\/\s*(.+)$/);
    return match ? match[1].trim() : '';
}

function extractRoutePath(statement) {
    const match = statement.match(/router\.(?:get|post|put|patch|delete)\(\s*['"`]([^'"`]+)['"`]/);
    return match ? match[1] : null;
}

function collectRouteStatements(content) {
    const lines = normalizeNewlines(content).split('\n');
    const routes = [];
    let currentComments = [];

    for (let index = 0; index < lines.length; index += 1) {
        const rawLine = lines[index];
        const line = rawLine.trim();

        if (line.startsWith('//')) {
            currentComments.push(stripCommentPrefix(line));
            continue;
        }

        if (!line) {
            currentComments = [];
            continue;
        }

        if (!line.includes('router.') || !line.includes('(')) {
            currentComments = [];
            continue;
        }

        const methodMatch = line.match(/router\.(get|post|put|patch|delete)\(/);
        if (!methodMatch) {
            currentComments = [];
            continue;
        }

        let statement = rawLine;
        let cursor = index;

        while (!statement.includes(');') && cursor < lines.length - 1) {
            cursor += 1;
            statement += `\n${lines[cursor]}`;
        }

        const routePath = extractRoutePath(statement);
        if (!routePath) {
            currentComments = [];
            index = cursor;
            continue;
        }

        const inlineComment = extractInlineComment(statement);
        const allComments = inlineComment ? [...currentComments, inlineComment] : currentComments;

        routes.push({
            method: methodMatch[1].toLowerCase(),
            routePath,
            handlerName: extractHandlerName(statement),
            comments: allComments.filter(Boolean),
            consumes: detectConsumes(statement),
            auth: detectAuth(statement, 'unknown'),
        });

        currentComments = [];
        index = cursor;
    }

    return routes;
}

function buildParameters(fullPath) {
    const matches = [...fullPath.matchAll(/\{([A-Za-z0-9_]+)\}/g)];
    return matches.map(match => ({
        name: match[1],
        in: 'path',
        required: true,
        schema: { type: 'string' },
    }));
}

function buildOperation(moduleConfig, route) {
    const fullPath = toOpenApiPath(normalizePath(moduleConfig.basePath, route.routePath));
    const operation = {
        tags: [moduleConfig.tag],
        summary: inferSummary(
            route.routePath,
            route.method.toUpperCase(),
            route.handlerName,
            route.comments
        ),
        operationId: route.handlerName
            ? route.handlerName.replace(/\./g, '_')
            : `${route.method}_${fullPath.replace(/[\/{}-]+/g, '_')}`.replace(/^_+|_+$/g, ''),
        parameters: buildParameters(fullPath),
        responses: {
            200: { description: 'Success' },
            400: { description: 'Bad Request' },
            500: { description: 'Server Error' },
        },
        'x-auto-generated': true,
    };

    const security = normalizeAuth(route.auth === 'unknown' ? moduleConfig.auth : route.auth);
    if (security) {
        operation.security = security;
        operation.responses[401] = { description: 'Unauthorized' };
    }

    if (route.consumes === 'multipart/form-data') {
        operation.requestBody = {
            required: true,
            content: {
                'multipart/form-data': {
                    schema: {
                        type: 'object',
                        additionalProperties: true,
                    },
                },
            },
        };
    }

    if (operation.parameters.length === 0) {
        delete operation.parameters;
    }

    return {
        fullPath,
        operation,
    };
}

function resolveModulePath(moduleConfig) {
    const root = moduleConfig.absoluteRoot || routesRoot;
    return path.join(root, moduleConfig.file);
}

function buildAutoSwaggerSpec() {
    const paths = {};
    const tags = [];

    for (const moduleConfig of routeModules) {
        tags.push({ name: moduleConfig.tag, description: `${moduleConfig.tag} endpoints` });

        const filePath = resolveModulePath(moduleConfig);
        const content = fs.readFileSync(filePath, 'utf8');
        const routes = collectRouteStatements(content);

        for (const route of routes) {
            const { fullPath, operation } = buildOperation(moduleConfig, route);
            if (!paths[fullPath]) {
                paths[fullPath] = {};
            }

            paths[fullPath][route.method] = operation;
        }
    }

    paths['/health'] = {
        get: {
            tags: ['System'],
            summary: '应用健康检查',
            operationId: 'health_check',
            responses: {
                200: { description: 'Service is healthy' },
            },
            'x-auto-generated': true,
        },
    };

    paths['/api/public/health'] = {
        get: {
            tags: ['Public'],
            summary: '公共健康检查',
            operationId: 'public_health_check',
            responses: {
                200: { description: 'Service is healthy' },
            },
            'x-auto-generated': true,
        },
    };

    paths['/api/public/status'] = {
        get: {
            tags: ['Public'],
            summary: '获取服务状态',
            operationId: 'public_status',
            responses: {
                200: { description: 'Service status' },
            },
            'x-auto-generated': true,
        },
    };

    tags.unshift(
        { name: 'System', description: '系统接口' },
        { name: 'Public', description: '公共接口' }
    );

    return {
        tags,
        paths,
    };
}

module.exports = {
    buildAutoSwaggerSpec,
};
