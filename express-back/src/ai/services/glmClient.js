const { ChatOpenAI } = require('@langchain/openai');
const assistantConfig = require('@/ai/config/assistantConfig');

const createGlmChatModel = () => {
    if (!assistantConfig.apiKey) {
        const error = new Error('未配置智谱 API Key，请先设置 ZHIPU_API_KEY');
        error.statusCode = 503;
        throw error;
    }

    return new ChatOpenAI({
        apiKey: assistantConfig.apiKey,
        model: assistantConfig.model,
        temperature: 0.2,
        maxTokens: assistantConfig.maxTokens,
        streamUsage: false,
        configuration: {
            baseURL: assistantConfig.baseURL,
        },
    });
};

module.exports = {
    createGlmChatModel,
};
