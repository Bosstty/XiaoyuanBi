const assistantConfig = {
    enabled: process.env.AI_ASSISTANT_ENABLED !== 'false',
    model: process.env.ZHIPU_GLM_MODEL || 'glm-4.7',
    apiKey: process.env.ZHIPU_API_KEY || '',
    baseURL: process.env.ZHIPU_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4',
    maxTokens: Number(process.env.ZHIPU_MAX_TOKENS || 1200),
    maxHistory: Number(process.env.AI_ASSISTANT_MAX_HISTORY || 12),
    maxIterations: Number(process.env.AI_ASSISTANT_MAX_ITERATIONS || 6),
    temperature: Number(process.env.ZHIPU_TEMPERATURE || 1.0),
    topP: process.env.ZHIPU_TOP_P ? Number(process.env.ZHIPU_TOP_P) : null,
    thinkingEnabled: process.env.ZHIPU_THINKING_ENABLED === 'true',
    reasoningEffort: process.env.ZHIPU_REASONING_EFFORT || 'max',
};

module.exports = assistantConfig;
