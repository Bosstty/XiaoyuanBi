const path = require('path');
const swaggerJSDoc = require('swagger-jsdoc');
const { buildAutoSwaggerSpec } = require('./swaggerAuto');

function mergeTags(autoTags, manualTags) {
    const merged = [];
    const seen = new Set();

    for (const tag of [...autoTags, ...manualTags]) {
        if (!tag || !tag.name || seen.has(tag.name)) {
            continue;
        }

        seen.add(tag.name);
        merged.push(tag);
    }

    return merged;
}

function mergePaths(autoPaths, manualPaths) {
    const merged = { ...autoPaths };

    for (const [pathname, methods] of Object.entries(manualPaths || {})) {
        merged[pathname] = {
            ...(merged[pathname] || {}),
            ...methods,
        };
    }

    return merged;
}

const autoSpec = buildAutoSwaggerSpec();

const definition = {
    openapi: '3.0.3',
    info: {
        title: '哈尔滨学院校园综合服务平台 API',
        version: '1.0.0',
        description: '校园综合服务平台后端接口文档。',
    },
    servers: [
        {
            url: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
            description: 'Current server',
        },
    ],
    tags: autoSpec.tags,
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
        },
        schemas: {
            SuccessEnvelope: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'ok' },
                    data: { type: 'object', additionalProperties: true },
                },
            },
            ErrorEnvelope: {
                type: 'object',
                properties: {
                    success: { type: 'boolean', example: false },
                    message: { type: 'string', example: '请求失败' },
                    error: { type: 'string', nullable: true },
                },
            },
        },
    },
};

const options = {
    definition,
    apis: [
        path.join(__dirname, '../docs/swagger/**/*.js'),
        path.join(__dirname, '../../app.js'),
    ],
};

const manualSpec = swaggerJSDoc(options);
const swaggerSpec = {
    ...manualSpec,
    tags: mergeTags(autoSpec.tags, manualSpec.tags || []),
    paths: mergePaths(autoSpec.paths, manualSpec.paths || {}),
};

module.exports = {
    swaggerSpec,
};
