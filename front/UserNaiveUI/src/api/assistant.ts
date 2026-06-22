import { apiClient } from './client';
import { getApiBaseUrl } from '@/utils/apiBase';

export type AssistantMessage = {
    role: 'user' | 'assistant';
    content: string;
};

export type AssistantChatResponse = {
    reply: string;
    model: string;
    skills?: string[];
    tool_calls: Array<{
        name: string;
        args: Record<string, unknown>;
    }>;
    usage: Record<string, unknown> | null;
};

export type AssistantStreamEvent =
    | { type: 'status'; message: string }
    | { type: 'reasoning'; content: string }
    | { type: 'content'; content: string }
    | { type: 'tool'; name: string; label?: string }
    | { type: 'done'; data: AssistantChatResponse }
    | { type: 'error'; message: string };

type AssistantStreamEventPayload = AssistantStreamEvent | { type: string; [key: string]: unknown };

export const assistantApi = {
    getMeta: () =>
        apiClient.get<{
            enabled: boolean;
            model: string;
            scope?: string;
            skill_mode?: string;
            skills?: string[];
            capabilities: string[];
            suggested_questions: string[];
        }>('/assistant/meta', {
            timeout: 15000,
        }),

    chat: (data: { input?: string; messages?: AssistantMessage[] }) =>
        apiClient.post<AssistantChatResponse>('/assistant/chat', data, {
            timeout: 60000,
        }),

    streamChat: async (
        data: { input?: string; messages?: AssistantMessage[] },
        handlers: {
            onEvent?: (event: AssistantStreamEventPayload) => void | Promise<void>;
        } = {}
    ) => {
        const token = localStorage.getItem('token');
        const response = await fetch(`${getApiBaseUrl('user')}/assistant/chat/stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            let errorMessage = 'AI 助手请求失败';
            try {
                const payload = await response.json();
                errorMessage = payload?.message || errorMessage;
            } catch (error) {
                errorMessage = response.statusText || errorMessage;
            }
            throw new Error(errorMessage);
        }

        if (!response.body) {
            throw new Error('AI 流式响应为空');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';
        let currentEvent = 'message';

        const emitEvent = async (rawEvent: string, rawData: string) => {
            if (!rawData) return;
            let parsed: AssistantStreamEventPayload | null = null;
            try {
                parsed = JSON.parse(rawData) as AssistantStreamEventPayload;
            } catch (error) {
                return;
            }

            if (rawEvent && parsed && parsed.type !== rawEvent && rawEvent !== 'message') {
                parsed = { ...parsed, type: rawEvent };
            }

            if (!parsed) {
                return;
            }

            if (parsed.type === 'error') {
                await handlers.onEvent?.(parsed);
                throw new Error(String((parsed as { message?: string }).message || 'AI 助手流式回复失败'));
            }

            await handlers.onEvent?.(parsed);
        };

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split('\n\n');
            buffer = blocks.pop() || '';

            for (const block of blocks) {
                const lines = block.split('\n');
                const dataLines: string[] = [];
                currentEvent = 'message';

                for (const line of lines) {
                    if (line.startsWith('event:')) {
                        currentEvent = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        dataLines.push(line.slice(5).trimStart());
                    }
                }

                await emitEvent(currentEvent, dataLines.join('\n'));
            }
        }
    },
};
