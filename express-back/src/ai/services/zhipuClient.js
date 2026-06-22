const { Agent } = require('undici');
const assistantConfig = require('@/ai/config/assistantConfig');

const zhipuDispatcher = new Agent({
    connect: {
        timeout: 30000,
    },
});

const buildEndpoint = () => {
    const baseURL = String(assistantConfig.baseURL || '').replace(/\/+$/, '');
    return `${baseURL}/chat/completions`;
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const getErrorCode = error => error?.code || error?.cause?.code || '';

const isRetriableNetworkError = error => {
    const code = getErrorCode(error);
    const message = String(error?.message || '').toLowerCase();

    return (
        code === 'UND_ERR_CONNECT_TIMEOUT' ||
        code === 'UND_ERR_HEADERS_TIMEOUT' ||
        code === 'UND_ERR_SOCKET' ||
        code === 'ECONNRESET' ||
        code === 'ETIMEDOUT' ||
        code === 'EAI_AGAIN' ||
        message.includes('fetch failed')
    );
};

const buildNetworkRetryError = error => {
    const code = getErrorCode(error) || 'NETWORK_ERROR';
    const networkError = new Error(
        '连接智谱模型服务时网络中断，请稍后重试，或检查当前服务器到 open.bigmodel.cn 的网络连通性。'
    );
    networkError.statusCode = 504;
    networkError.providerCode = code;
    return networkError;
};

const mapProviderError = providerError => {
    const message = providerError?.message || '模型服务调用失败';
    const code = String(providerError?.code || '');

    if (code === '1113' || message.includes('余额不足') || message.includes('资源包')) {
        const error = new Error(
            `智谱账户余额不足或无可用资源包，请先充值后再调用 ${assistantConfig.model}。`
        );
        error.statusCode = 503;
        error.providerCode = code || '1113';
        return error;
    }

    const error = new Error(message);
    error.statusCode = 502;
    error.providerCode = code || null;
    return error;
};

const requestChatCompletion = async body => {
    if (!assistantConfig.apiKey) {
        const error = new Error('未配置智谱 API Key，请先设置 ZHIPU_API_KEY');
        error.statusCode = 503;
        throw error;
    }

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeoutMs = 45000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(buildEndpoint(), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${assistantConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
                signal: controller.signal,
                dispatcher: zhipuDispatcher,
            });

            const payload = await response.json().catch(() => null);
            if (!response.ok) {
                if (payload?.error) {
                    throw mapProviderError(payload.error);
                }

                const error = new Error(`智谱模型调用失败，HTTP ${response.status}`);
                error.statusCode = 502;
                throw error;
            }

            return payload;
        } catch (error) {
            lastError = error;

            if (error.name === 'AbortError') {
                const timeoutError = new Error('智谱模型调用超时，请稍后重试');
                timeoutError.statusCode = 504;
                throw timeoutError;
            }

            if (isRetriableNetworkError(error)) {
                if (attempt < maxAttempts) {
                    await sleep(800 * attempt);
                    continue;
                }

                throw buildNetworkRetryError(error);
            }

            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError;
};

const parseSSEBlock = block => {
    const lines = String(block || '')
        .split('\n')
        .map(line => line.trimEnd());
    let event = 'message';
    const dataLines = [];

    for (const line of lines) {
        if (!line) continue;
        if (line.startsWith('event:')) {
            event = line.slice(6).trim();
            continue;
        }
        if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    return {
        event,
        data: dataLines.join('\n'),
    };
};

const applyToolCallDeltas = (finalToolCalls, deltas = []) => {
    for (const toolCall of deltas) {
        const index = Number(toolCall?.index || 0);
        const current = finalToolCalls[index] || {
            id: toolCall?.id || `tool-call-${index}`,
            type: 'function',
            function: {
                name: '',
                arguments: '',
            },
        };

        if (toolCall?.id) {
            current.id = toolCall.id;
        }
        if (toolCall?.function?.name) {
            current.function.name = toolCall.function.name;
        }
        if (typeof toolCall?.function?.arguments === 'string') {
            current.function.arguments += toolCall.function.arguments;
        }

        finalToolCalls[index] = current;
    }
};

const requestChatCompletionStream = async (body, callbacks = {}) => {
    if (!assistantConfig.apiKey) {
        const error = new Error('未配置智谱 API Key，请先设置 ZHIPU_API_KEY');
        error.statusCode = 503;
        throw error;
    }

    const maxAttempts = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        const controller = new AbortController();
        const timeoutMs = 60000;
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const response = await fetch(buildEndpoint(), {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${assistantConfig.apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...body,
                    stream: true,
                    tool_stream: true,
                }),
                signal: controller.signal,
                dispatcher: zhipuDispatcher,
            });

            if (!response.ok) {
                const payload = await response.json().catch(() => null);
                if (payload?.error) {
                    throw mapProviderError(payload.error);
                }

                const error = new Error(`智谱模型调用失败，HTTP ${response.status}`);
                error.statusCode = 502;
                throw error;
            }

            if (!response.body) {
                const error = new Error('智谱模型流式响应为空');
                error.statusCode = 502;
                throw error;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let buffer = '';
            let usage = null;
            const finalToolCalls = {};
            const assistantMessage = {
                role: 'assistant',
                content: '',
                tool_calls: [],
            };

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const chunks = buffer.split('\n\n');
                buffer = chunks.pop() || '';

                for (const chunk of chunks) {
                    const eventPayload = parseSSEBlock(chunk);
                    if (!eventPayload.data) continue;
                    if (eventPayload.data === '[DONE]') continue;

                    let parsed;
                    try {
                        parsed = JSON.parse(eventPayload.data);
                    } catch (error) {
                        continue;
                    }

                    if (parsed?.usage) {
                        usage = parsed.usage;
                    }

                    const delta = parsed?.choices?.[0]?.delta || {};
                    if (typeof delta.reasoning_content === 'string' && delta.reasoning_content) {
                        callbacks.onReasoning?.(delta.reasoning_content);
                    }

                    if (typeof delta.content === 'string' && delta.content) {
                        assistantMessage.content += delta.content;
                        callbacks.onContent?.(delta.content);
                    }

                    if (Array.isArray(delta.tool_calls) && delta.tool_calls.length) {
                        applyToolCallDeltas(finalToolCalls, delta.tool_calls);
                    }
                }
            }

            assistantMessage.tool_calls = Object.values(finalToolCalls);
            return {
                message: assistantMessage,
                usage,
            };
        } catch (error) {
            lastError = error;

            if (error.name === 'AbortError') {
                const timeoutError = new Error('智谱模型调用超时，请稍后重试');
                timeoutError.statusCode = 504;
                throw timeoutError;
            }

            if (isRetriableNetworkError(error)) {
                if (attempt < maxAttempts) {
                    await sleep(800 * attempt);
                    continue;
                }

                throw buildNetworkRetryError(error);
            }

            throw error;
        } finally {
            clearTimeout(timeout);
        }
    }

    throw lastError;
};

module.exports = {
    requestChatCompletion,
    requestChatCompletionStream,
};
