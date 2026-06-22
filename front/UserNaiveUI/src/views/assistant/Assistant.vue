<template>
    <div class="assistant-page">
        <section class="assistant-hero">
            <div>
                <span class="assistant-hero__eyebrow">LangChain.js + 智谱 GLM</span>
                <h1>AI 客服助手</h1>
                <p>用于用户咨询、平台数据分析和 function call 练手的基础页。</p>
            </div>
            <div class="assistant-hero__meta">
                <span>{{ meta?.enabled ? '已启用' : '未启用' }}</span>
                <strong>{{ meta?.model || '未配置模型' }}</strong>
            </div>
        </section>

        <section v-if="meta?.capabilities?.length" class="assistant-capabilities">
            <span v-for="item in meta.capabilities" :key="item" class="assistant-tag">{{ item }}</span>
        </section>

        <section v-if="meta?.suggested_questions?.length" class="assistant-suggestions">
            <button
                v-for="item in meta.suggested_questions"
                :key="item"
                type="button"
                class="assistant-suggestion"
                @click="applySuggestion(item)"
            >
                {{ item }}
            </button>
        </section>

        <section class="assistant-chat">
            <div class="assistant-messages">
                <div
                    v-for="(item, index) in messages"
                    :key="`${item.role}-${index}`"
                    class="assistant-message"
                    :class="`assistant-message--${item.role}`"
                >
                    <span class="assistant-message__role">
                        {{ item.role === 'assistant' ? 'AI 助手' : '我' }}
                    </span>
                    <div class="assistant-message__bubble">
                        {{ item.content }}
                    </div>
                </div>

                <div v-if="loading" class="assistant-message assistant-message--assistant">
                    <span class="assistant-message__role">AI 助手</span>
                    <div class="assistant-message__bubble assistant-message__bubble--loading">
                        正在分析并尝试调用工具，首次响应可能需要 10 到 30 秒...
                    </div>
                </div>
            </div>

            <div v-if="lastToolCalls.length" class="assistant-toolbox">
                <strong>最近一次工具调用</strong>
                <div v-for="item in lastToolCalls" :key="item.name" class="assistant-toolbox__item">
                    <span>{{ item.name }}</span>
                    <code>{{ JSON.stringify(item.args) }}</code>
                </div>
            </div>

            <div class="assistant-input">
                <textarea
                    v-model="draft"
                    rows="4"
                    placeholder="例如：帮我看下最近订单，或者分析一下平台这周的数据"
                    :disabled="loading"
                />
                <button type="button" :disabled="loading || !draft.trim()" @click="sendMessage">
                    {{ loading ? '处理中...' : '发送给 AI' }}
                </button>
            </div>
        </section>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useMessage } from 'naive-ui';
import { assistantApi, type AssistantMessage } from '@/api';

type AssistantMeta = {
    enabled: boolean;
    model: string;
    capabilities: string[];
    suggested_questions: string[];
};

type ToolCallRecord = {
    name: string;
    args: Record<string, unknown>;
};

const message = useMessage();

const meta = ref<AssistantMeta | null>(null);
const draft = ref('');
const loading = ref(false);
const lastToolCalls = ref<ToolCallRecord[]>([]);
const messages = ref<AssistantMessage[]>([
    {
        role: 'assistant',
        content:
            '你好，我是平台 AI 客服助手。你可以问我订单、任务、钱包概况，或者让我做一些平台数据分析。',
    },
]);

const loadMeta = async () => {
    try {
        const res = await assistantApi.getMeta();
        if (res.success && res.data) {
            meta.value = res.data;
        }
    } catch (error) {
        console.error('加载 AI 助手配置失败:', error);
        message.error('加载 AI 助手配置失败');
    }
};

const applySuggestion = (value: string) => {
    draft.value = value;
};

const sendMessage = async () => {
    const content = draft.value.trim();
    if (!content || loading.value) return;

    const history = [...messages.value, { role: 'user' as const, content }];
    messages.value = history;
    draft.value = '';
    loading.value = true;

    try {
        const res = await assistantApi.chat({
            messages: history,
        });

        if (res.success && res.data) {
            messages.value.push({
                role: 'assistant',
                content: res.data.reply,
            });
            lastToolCalls.value = Array.isArray(res.data.tool_calls) ? res.data.tool_calls : [];
        }
    } catch (error: any) {
        console.error('AI 助手请求失败:', error);
        const errorMessage =
            error?.message === '请求超时，请稍后重试'
                ? 'AI 响应超时，通常是模型返回较慢或后端未完成配置'
                : error?.message || 'AI 助手请求失败';
        message.error(errorMessage);
        messages.value.push({
            role: 'assistant',
            content:
                error?.message === '请求超时，请稍后重试'
                    ? '这次请求在前端等待窗口内没有完成。你可以重试一次；如果持续超时，请检查后端服务日志、智谱 API Key 和外网访问。'
                    : '这次请求没有成功，你可以稍后重试，或者检查后端 AI 配置。',
        });
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    void loadMeta();
});
</script>

<style scoped>
.assistant-page {
    min-height: 100%;
    padding: 18px 16px calc(24px + var(--safe-area-bottom, 0px));
    background:
        radial-gradient(circle at top right, rgba(34, 197, 94, 0.08), transparent 30%),
        linear-gradient(180deg, #f6f8fc 0%, #edf3fb 100%);
}

.assistant-hero {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 22px 20px;
    border-radius: 28px;
    background: linear-gradient(135deg, #17304f 0%, #246b84 52%, #79b98c 100%);
    color: #fff;
    box-shadow: 0 22px 44px rgba(23, 48, 79, 0.18);
}

.assistant-hero__eyebrow {
    display: inline-block;
    margin-bottom: 10px;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    font-size: 12px;
}

.assistant-hero h1 {
    margin: 0 0 8px;
    font-size: 28px;
    font-weight: 800;
}

.assistant-hero p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.88);
}

.assistant-hero__meta {
    min-width: 118px;
    align-self: flex-start;
    padding: 12px 14px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.12);
}

.assistant-hero__meta span,
.assistant-hero__meta strong {
    display: block;
}

.assistant-hero__meta span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.78);
}

.assistant-hero__meta strong {
    margin-top: 6px;
    font-size: 15px;
}

.assistant-capabilities,
.assistant-suggestions,
.assistant-chat {
    margin-top: 16px;
}

.assistant-capabilities {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.assistant-tag {
    padding: 8px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    color: #35516d;
    font-size: 12px;
    box-shadow: 0 8px 18px rgba(23, 48, 79, 0.05);
}

.assistant-suggestions {
    display: grid;
    gap: 10px;
}

.assistant-suggestion {
    padding: 14px 16px;
    border: none;
    border-radius: 18px;
    text-align: left;
    background: #ffffff;
    color: #17304f;
    box-shadow: 0 10px 24px rgba(23, 48, 79, 0.05);
}

.assistant-chat {
    padding: 18px;
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 16px 36px rgba(23, 48, 79, 0.08);
}

.assistant-messages {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.assistant-message {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.assistant-message--user {
    align-items: flex-end;
}

.assistant-message__role {
    font-size: 12px;
    color: #73839a;
}

.assistant-message__bubble {
    max-width: 88%;
    padding: 12px 14px;
    border-radius: 18px;
    background: #eef4fb;
    color: #17304f;
    white-space: pre-wrap;
    line-height: 1.7;
    word-break: break-word;
}

.assistant-message--user .assistant-message__bubble {
    background: #17304f;
    color: #fff;
}

.assistant-message__bubble--loading {
    background: #f6f0de;
    color: #7a5a12;
}

.assistant-toolbox {
    margin-top: 18px;
    padding: 16px;
    border-radius: 20px;
    background: #f5f8fc;
}

.assistant-toolbox strong {
    display: block;
    margin-bottom: 10px;
    color: #17304f;
}

.assistant-toolbox__item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 0;
    border-top: 1px solid rgba(23, 48, 79, 0.08);
}

.assistant-toolbox__item:first-of-type {
    border-top: none;
    padding-top: 0;
}

.assistant-toolbox__item span {
    font-size: 13px;
    font-weight: 700;
    color: #17304f;
}

.assistant-toolbox__item code {
    font-size: 12px;
    white-space: pre-wrap;
    color: #49617d;
}

.assistant-input {
    margin-top: 18px;
    display: grid;
    gap: 12px;
}

.assistant-input textarea {
    width: 100%;
    padding: 14px 16px;
    border: 1px solid #dbe4ef;
    border-radius: 18px;
    resize: vertical;
    background: #fbfdff;
    color: #17304f;
    font-size: 14px;
    outline: none;
}

.assistant-input textarea:focus {
    border-color: #2a7b77;
}

.assistant-input button {
    justify-self: end;
    min-width: 120px;
    padding: 12px 18px;
    border: none;
    border-radius: 999px;
    background: linear-gradient(135deg, #17304f 0%, #2a7b77 100%);
    color: #fff;
    font-weight: 700;
}

.assistant-input button:disabled {
    background: #b8c7d9;
}

@media (max-width: 768px) {
    .assistant-hero {
        flex-direction: column;
    }

    .assistant-message__bubble {
        max-width: 100%;
    }
}
</style>
