<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage } from 'naive-ui';
import { chatApi } from '@/api';
import { useUserStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const message = useMessage();
const userStore = useUserStore();

const conversations = ref<any[]>([]);
const currentConversation = ref<any | null>(null);
const messages = ref<any[]>([]);
const messageInput = ref('');
const loading = ref(false);
const sending = ref(false);
const bootstrapping = ref(false);
const uploading = ref(false);
const showActionPanel = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const pollingTimer = ref<number | null>(null);
const previewImage = ref('');
const previewScale = ref(1);
const pinchStartDistance = ref(0);
const pinchStartScale = ref(1);

const hasConversation = computed(() => conversations.value.length > 0);

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }
    if (value.startsWith('/uploads/')) {
        return `${window.location.origin}${value}`;
    }
    return value;
};

const getOtherParty = (conversation: any) => {
    if (conversation?.partner) {
        return {
            name: conversation.partner.name || '联系人',
            avatar: resolveAvatarUrl(conversation.partner.avatar),
            role: conversation.partner.role || '用户',
        };
    }

    if (conversation?.user) {
        return {
            name: conversation.user.real_name || conversation.user.username || '用户',
            avatar: resolveAvatarUrl(conversation.user.avatar),
            role: '用户',
        };
    }

    if (conversation?.deliverer) {
        return {
            name: conversation.deliverer.real_name || '配送员',
            avatar: '',
            role: '配送员',
        };
    }

    return {
        name: '在线客服',
        avatar: '',
        role: '客服',
    };
};

const formatListTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';

    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);

    if (days <= 0) {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    if (days === 1) return '昨天';
    if (days < 7) return `${days}天前`;
    return date.toLocaleDateString('zh-CN');
};

const formatMessageTime = (time?: string) => {
    if (!time) return '';
    const date = new Date(time);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

const isMyMessage = (msg: any) => {
    return msg.sender_id === userStore.user?.id && msg.sender_type === 'user';
};

const isImageMessage = (msg: any) => msg.type === 'image';
const resolveChatImageSrc = (content?: string) => {
    if (!content) return '';
    if (/^https?:\/\//i.test(content) || content.startsWith('data:')) {
        return content;
    }
    if (content.startsWith('/uploads/')) {
        return content;
    }
    if (content.startsWith('uploads/')) {
        return `/${content}`;
    }
    return content;
};
const openImagePreview = (src?: string) => {
    if (!src) return;
    previewImage.value = src;
    previewScale.value = 1;
};
const closeImagePreview = () => {
    previewImage.value = '';
    previewScale.value = 1;
    pinchStartDistance.value = 0;
    pinchStartScale.value = 1;
};
const clampScale = (value: number) => Math.min(4, Math.max(0.8, value));
const zoomInPreview = () => {
    previewScale.value = clampScale(previewScale.value + 0.25);
};
const zoomOutPreview = () => {
    previewScale.value = clampScale(previewScale.value - 0.25);
};
const resetPreviewZoom = () => {
    previewScale.value = 1;
};
const getTouchDistance = (touches: TouchList) => {
    if (touches.length < 2) return 0;
    const [first, second] = [touches[0], touches[1]];
    const deltaX = first.clientX - second.clientX;
    const deltaY = first.clientY - second.clientY;
    return Math.hypot(deltaX, deltaY);
};
const handlePreviewTouchStart = (event: TouchEvent) => {
    if (event.touches.length < 2) return;
    pinchStartDistance.value = getTouchDistance(event.touches);
    pinchStartScale.value = previewScale.value;
};
const handlePreviewTouchMove = (event: TouchEvent) => {
    if (event.touches.length < 2 || !pinchStartDistance.value) return;
    const currentDistance = getTouchDistance(event.touches);
    if (!currentDistance) return;
    previewScale.value = clampScale(
        pinchStartScale.value * (currentDistance / pinchStartDistance.value)
    );
};
const handlePreviewTouchEnd = () => {
    if (pinchStartDistance.value) {
        pinchStartDistance.value = 0;
        pinchStartScale.value = previewScale.value;
    }
};
const handlePreviewWheel = (event: WheelEvent) => {
    const delta = event.deltaY < 0 ? 0.12 : -0.12;
    previewScale.value = clampScale(previewScale.value + delta);
};

const fetchConversations = async () => {
    try {
        loading.value = true;
        const res = await chatApi.getConversations();
        if (res.success) {
            conversations.value = Array.isArray(res.data) ? res.data : [];
        }
    } catch (error) {
        console.error('获取会话列表失败:', error);
        message.error('获取消息列表失败');
    } finally {
        loading.value = false;
    }
};

const scrollToBottom = async () => {
    await nextTick();
    const container = document.querySelector('.messages') as HTMLElement | null;
    if (container) {
        container.scrollTop = container.scrollHeight;
    }
};

const applyIncomingMessages = async (incoming: any[]) => {
    if (!Array.isArray(incoming)) {
        messages.value = [];
        return;
    }

    const previousLastId = messages.value[messages.value.length - 1]?.id;
    const nextLastId = incoming[incoming.length - 1]?.id;

    messages.value = incoming;

    if (previousLastId !== nextLastId) {
        await scrollToBottom();
    }
};

const openConversationById = async (conversationId?: number | null) => {
    if (!conversationId) return;

    const localConversation = conversations.value.find(
        item => Number(item.id) === Number(conversationId)
    );
    if (localConversation) {
        await selectConversation(localConversation);
        return;
    }

    try {
        const detail = await chatApi.getConversationDetail(Number(conversationId));
        if (detail.success && detail.data) {
            conversations.value = [
                detail.data,
                ...conversations.value.filter(item => item.id !== detail.data.id),
            ];
            await selectConversation(detail.data);
        }
    } catch (error) {
        console.error('打开会话失败:', error);
    }
};

const selectConversation = async (conversation: any) => {
    currentConversation.value = conversation;
    conversation.unread_count = 0;
    showActionPanel.value = false;

    try {
        const res = await chatApi.getMessages({ conversation_id: conversation.id, limit: 100 });
        if (res.success) {
            await applyIncomingMessages(Array.isArray(res.data) ? res.data : []);
            await chatApi.markAsRead(conversation.id);
        }
    } catch (error) {
        console.error('获取消息失败:', error);
        message.error('获取消息失败');
    }

    if (route.query.conversationId !== String(conversation.id)) {
        router.replace({
            path: '/chat',
            query: { conversationId: String(conversation.id) },
        });
    }

    await scrollToBottom();
};

const sendMessage = async () => {
    if (!messageInput.value.trim() || !currentConversation.value || sending.value) return;

    sending.value = true;
    try {
        const content = messageInput.value.trim();
        const res = await chatApi.sendMessage({
            conversation_id: currentConversation.value.id,
            content,
            type: 'text',
        });

        if (res.success && res.data) {
            messages.value.push(res.data);
            currentConversation.value.last_message = content;
            currentConversation.value.last_message_at = new Date().toISOString();
            messageInput.value = '';
            showActionPanel.value = false;
            await scrollToBottom();
        }
    } catch (error) {
        console.error('发送消息失败:', error);
        message.error('发送消息失败');
    } finally {
        sending.value = false;
    }
};

const triggerImageUpload = () => fileInputRef.value?.click();
const toggleActionPanel = () => {
    showActionPanel.value = !showActionPanel.value;
};

const handleImageSelected = async (event: Event) => {
    const target = event.target as HTMLInputElement;
    const file = target.files?.[0];
    if (!file || !currentConversation.value) return;

    uploading.value = true;
    try {
        const uploadRes = await chatApi.uploadImage(file);
        const imageUrl = uploadRes.data?.path || uploadRes.data?.url;
        if (!imageUrl) throw new Error('图片上传失败');

        const sendRes = await chatApi.sendMessage({
            conversation_id: currentConversation.value.id,
            content: imageUrl,
            type: 'image',
        });

        if (sendRes.success && sendRes.data) {
            messages.value.push(sendRes.data);
            currentConversation.value.last_message = '[图片]';
            currentConversation.value.last_message_at = new Date().toISOString();
            showActionPanel.value = false;
            message.success('图片已发送');
            await scrollToBottom();
        }
    } catch (error: any) {
        console.error('发送图片失败:', error);
        message.error(error?.message || '发送图片失败');
    } finally {
        uploading.value = false;
        target.value = '';
    }
};

const startServiceConversation = async () => {
    if (bootstrapping.value) return;

    bootstrapping.value = true;
    try {
        const res = await chatApi.createConversation({
            type: 'user_service',
            initial_message: '您好，我想咨询一下。',
        });

        if (res.success && res.data) {
            await fetchConversations();
            await openConversationById(res.data.id);
            message.success('已进入客服会话');
        }
    } catch (error) {
        console.error('创建客服会话失败:', error);
        message.error('打开客服会话失败');
    } finally {
        bootstrapping.value = false;
    }
};

const stopPolling = () => {
    if (pollingTimer.value) {
        window.clearInterval(pollingTimer.value);
        pollingTimer.value = null;
    }
};

const pollCurrentConversation = async () => {
    if (!currentConversation.value?.id || sending.value || uploading.value) return;

    try {
        const [messageRes, conversationRes] = await Promise.all([
            chatApi.getMessages({
                conversation_id: currentConversation.value.id,
                limit: 100,
            }),
            chatApi.getConversations(),
        ]);

        if (messageRes.success) {
            await applyIncomingMessages(Array.isArray(messageRes.data) ? messageRes.data : []);
            await chatApi.markAsRead(currentConversation.value.id);
        }

        if (conversationRes.success) {
            const latestConversations = Array.isArray(conversationRes.data)
                ? conversationRes.data
                : [];
            conversations.value = latestConversations;
            const matchedConversation = latestConversations.find(
                item => Number(item.id) === Number(currentConversation.value?.id)
            );
            if (matchedConversation) {
                matchedConversation.unread_count = 0;
                currentConversation.value = matchedConversation;
            }
        }
    } catch (error) {
        console.error('轮询消息失败:', error);
    }
};

const startPolling = () => {
    stopPolling();
    if (!currentConversation.value?.id) return;

    pollingTimer.value = window.setInterval(() => {
        void pollCurrentConversation();
    }, 3000);
};

onMounted(async () => {
    await fetchConversations();
    const conversationId = Number(route.query.conversationId || 0);
    if (conversationId) {
        await openConversationById(conversationId);
    }
});

watch(
    () => route.query.conversationId,
    async value => {
        const conversationId = Number(value || 0);
        if (!conversationId || currentConversation.value?.id === conversationId) return;
        await openConversationById(conversationId);
    }
);

watch(currentConversation, value => {
    if (!value && route.query.conversationId) {
        router.replace({ path: '/chat' });
    }

    if (!value) {
        closeImagePreview();
    }

    if (value?.id) {
        startPolling();
    } else {
        stopPolling();
    }
});

onBeforeUnmount(() => {
    stopPolling();
});
</script>

<template>
    <div class="chat-page" :class="{ 'chat-page--conversation': currentConversation }">
        <div class="conversation-list" :class="{ active: !currentConversation }">
            <div class="list-header">
                <span>消息</span>
                <button class="new-chat-btn" @click="startServiceConversation">联系客服</button>
            </div>

            <div v-if="loading" class="loading">加载中...</div>

            <div v-else-if="!hasConversation" class="empty">
                <p>暂无会话</p>
                <button @click="startServiceConversation">发起客服咨询</button>
            </div>

            <div v-else class="conversation-items">
                <div
                    v-for="conv in conversations"
                    :key="conv.id"
                    class="conversation-item"
                    :class="{
                        active: currentConversation?.id === conv.id,
                        unread: conv.unread_count > 0,
                    }"
                    @click="selectConversation(conv)"
                >
                    <div class="avatar">
                        <img
                            v-if="getOtherParty(conv).avatar"
                            :src="getOtherParty(conv).avatar"
                            alt="avatar"
                        />
                        <span v-else>{{ getOtherParty(conv).name?.charAt(0) }}</span>
                    </div>
                    <div class="info">
                        <div class="top">
                            <span class="name">{{ getOtherParty(conv).name }}</span>
                            <span class="time">{{ formatListTime(conv.last_message_at) }}</span>
                        </div>
                        <div class="bottom">
                            <span class="preview">{{ conv.last_message || '暂无消息' }}</span>
                            <span v-if="conv.unread_count > 0" class="badge">
                                {{ conv.unread_count }}
                            </span>
                        </div>
                        <div class="role">{{ getOtherParty(conv).role }}</div>
                    </div>
                </div>
            </div>
        </div>

        <transition name="conversation-slide">
            <div v-if="currentConversation" class="chat-window">
                <div class="chat-header">
                    <button class="back-btn" @click="currentConversation = null" aria-label="返回">
                        <svg viewBox="0 0 24 24" class="back-icon" aria-hidden="true">
                            <path
                                d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                    <div class="chat-header-copy">
                        <span class="title">{{ getOtherParty(currentConversation).name }}</span>
                        <span class="role">{{ getOtherParty(currentConversation).role }}</span>
                    </div>
                </div>

                <div class="messages">
                    <div
                        v-for="msg in messages"
                        :key="msg.id"
                        class="message"
                        :class="{ mine: isMyMessage(msg) }"
                    >
                        <div class="avatar" v-if="!isMyMessage(msg)">
                            <img
                                v-if="getOtherParty(currentConversation).avatar"
                                :src="getOtherParty(currentConversation).avatar"
                                alt="avatar"
                            />
                            <span v-else>
                                {{ getOtherParty(currentConversation).name?.charAt(0) || '对' }}
                            </span>
                        </div>
                        <div class="content">
                            <div v-if="isImageMessage(msg)" class="image-card">
                                <img
                                    :src="resolveChatImageSrc(msg.content)"
                                    alt="chat-image"
                                    class="chat-image"
                                    @click="openImagePreview(resolveChatImageSrc(msg.content))"
                                />
                            </div>
                            <div v-else class="text">{{ msg.content }}</div>
                            <div class="time">
                                {{ formatMessageTime(msg.created_at || msg.createdAt) }}
                            </div>
                        </div>
                        <div class="avatar" v-if="isMyMessage(msg)">
                            <img v-if="userStore.userAvatar" :src="userStore.userAvatar" alt="avatar" />
                            <span v-else>{{ userStore.user?.username?.charAt(0) || '我' }}</span>
                        </div>
                    </div>
                </div>

                <div v-if="showActionPanel" class="action-panel">
                    <button type="button" class="action-card" @click="triggerImageUpload">
                        <span class="action-icon">🖼</span>
                        <span class="action-label">照片</span>
                    </button>
                </div>

                <div class="input-area">
                    <button
                        type="button"
                        class="image-btn"
                        :disabled="uploading || sending"
                        @click="toggleActionPanel"
                    >
                        {{ uploading ? '…' : '+' }}
                    </button>
                    <input
                        v-model="messageInput"
                        type="text"
                        placeholder="输入消息..."
                        :disabled="sending || uploading"
                        @keyup.enter="sendMessage"
                    />
                    <button
                        @click="sendMessage"
                        :disabled="sending || uploading || !messageInput.trim()"
                    >
                        发送
                    </button>
                </div>

                <input
                    ref="fileInputRef"
                    type="file"
                    accept="image/*"
                    class="hidden-file-input"
                    @change="handleImageSelected"
                />
            </div>
        </transition>

        <div v-if="previewImage" class="image-preview" @click="closeImagePreview">
            <button
                type="button"
                class="preview-close"
                aria-label="关闭图片预览"
                @click.stop="closeImagePreview"
            >
                ×
            </button>
            <img
                :src="previewImage"
                alt="preview-image"
                class="preview-image"
                :style="{ transform: `scale(${previewScale})` }"
                @click.stop
                @dblclick.stop="resetPreviewZoom"
                @wheel.prevent.stop="handlePreviewWheel"
                @touchstart.passive="handlePreviewTouchStart"
                @touchmove.prevent="handlePreviewTouchMove"
                @touchend="handlePreviewTouchEnd"
            />
            <div class="preview-toolbar" @click.stop>
                <button type="button" class="preview-action" @click="zoomOutPreview">-</button>
                <button
                    type="button"
                    class="preview-action preview-action--label"
                    @click="resetPreviewZoom"
                >
                    {{ Math.round(previewScale * 100) }}%
                </button>
                <button type="button" class="preview-action" @click="zoomInPreview">+</button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.chat-page {
    position: relative;
    min-height: calc(100vh - 82px);
    overflow: hidden;
    background:
        radial-gradient(circle at top right, rgba(75, 184, 255, 0.1), transparent 28%),
        linear-gradient(180deg, #f5f7fb 0%, #eef4fb 100%);
}

.chat-page--conversation {
    min-height: 100dvh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background: #e9eef6;
}

.conversation-list {
    width: 100%;
    display: flex;
    flex-direction: column;
    min-height: calc(100vh - 82px);
    background: transparent;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 18px 16px 14px;
    font-size: 24px;
    font-weight: 700;
    color: #17304f;
}

.new-chat-btn,
.empty button,
.input-area button {
    border: none;
    border-radius: 999px;
    cursor: pointer;
}

.new-chat-btn {
    padding: 7px 14px;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
    color: white;
    font-size: 13px;
    font-weight: 600;
}

.loading,
.empty {
    padding: 48px 20px;
    text-align: center;
    color: #96a1b5;
}

.empty button {
    margin-top: 16px;
    padding: 10px 22px;
    background: #17304f;
    color: white;
}

.conversation-items {
    flex: 1;
    overflow-y: auto;
}

.conversation-item {
    display: flex;
    margin: 0 16px 12px;
    padding: 14px;
    border: 1px solid rgba(23, 48, 79, 0.06);
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.9);
    box-shadow: 0 10px 30px rgba(23, 48, 79, 0.06);
    cursor: pointer;
}

.conversation-item.active {
    background: linear-gradient(135deg, rgba(47, 107, 255, 0.08), rgba(75, 184, 255, 0.04));
    border-color: rgba(47, 107, 255, 0.16);
}

.conversation-item.unread .preview {
    font-weight: 600;
    color: #17304f;
}

.avatar {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
    overflow: hidden;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.info {
    flex: 1;
    margin-left: 12px;
    overflow: hidden;
}

.top,
.bottom {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.top {
    margin-bottom: 6px;
}

.name {
    font-weight: 600;
    color: #17304f;
}

.time,
.role {
    font-size: 12px;
    color: #96a1b5;
}

.preview {
    font-size: 13px;
    color: #6b7487;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 190px;
}

.badge {
    min-width: 18px;
    height: 18px;
    padding: 0 6px;
    border-radius: 9px;
    background: #2f6bff;
    color: white;
    font-size: 11px;
    line-height: 18px;
    text-align: center;
}

.role {
    margin-top: 6px;
}

.chat-window {
    position: absolute;
    inset: 0;
    z-index: 2;
    min-height: 100dvh;
    height: 100dvh;
    display: flex;
    flex-direction: column;
    background:
        radial-gradient(circle at top center, rgba(255, 255, 255, 0.55), transparent 28%), #e9eef6;
}

.conversation-slide-enter-active,
.conversation-slide-leave-active {
    transition:
        transform 0.32s cubic-bezier(0.22, 0.8, 0.24, 1),
        opacity 0.32s ease;
    will-change: transform, opacity;
}

.conversation-slide-enter-from,
.conversation-slide-leave-to {
    opacity: 0.98;
    transform: translateX(100%);
}

.conversation-slide-enter-to,
.conversation-slide-leave-from {
    opacity: 1;
    transform: translateX(0);
}

@media (prefers-reduced-motion: reduce) {
    .conversation-slide-enter-active,
    .conversation-slide-leave-active {
        transition: none;
    }
}

.chat-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px;
    background: rgba(255, 255, 255, 0.92);
    border-bottom: 1px solid rgba(23, 48, 79, 0.06);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

.back-btn {
    background: none;
    border: none;
    width: 28px;
    height: 28px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: #17304f;
}

.back-icon {
    width: 24px;
    height: 24px;
}

.chat-header-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    flex: 1;
}

.title {
    font-size: 17px;
    font-weight: 700;
    color: #17304f;
}

.messages {
    flex: 1;
    overflow-y: auto;
    padding: 16px 14px 10px;
}

.message {
    display: flex;
    margin-bottom: 16px;
    align-items: flex-start;
    justify-content: flex-start;
}

.message.mine {
    justify-content: flex-end;
}

.message .avatar {
    width: 36px;
    height: 36px;
    font-size: 14px;
}

.content {
    max-width: 72%;
    margin: 0 8px;
}

.message.mine .content {
    order: 1;
}

.message.mine .avatar {
    order: 2;
    background: linear-gradient(135deg, #17304f 0%, #2f6bff 100%);
}

.text {
    background: #fff;
    padding: 11px 14px;
    border-radius: 8px 18px 18px 18px;
    box-shadow: 0 2px 10px rgba(23, 48, 79, 0.08);
    word-break: break-word;
    color: #17304f;
    line-height: 1.55;
}

.message.mine .text {
    background: #2f6bff;
    color: white;
    border-radius: 18px 8px 18px 18px;
}

.image-card {
    overflow: hidden;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 2px 10px rgba(23, 48, 79, 0.08);
}

.chat-image {
    display: block;
    width: 100%;
    max-width: 220px;
    max-height: 280px;
    object-fit: cover;
    cursor: zoom-in;
}

.action-panel {
    display: flex;
    gap: 14px;
    padding: 14px 16px 10px;
    background: rgba(255, 255, 255, 0.96);
    border-top: 1px solid rgba(23, 48, 79, 0.06);
}

.action-card {
    width: 72px;
    border: none;
    background: transparent;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: #4f5d73;
}

.action-icon {
    width: 52px;
    height: 52px;
    border-radius: 16px;
    background: #f1f5fb;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
}

.action-label {
    font-size: 12px;
}

.time {
    margin-top: 4px;
    font-size: 11px;
}

.message.mine .time {
    text-align: right;
}

.input-area {
    display: flex;
    gap: 10px;
    padding: 10px 14px calc(10px + var(--safe-area-bottom, 0px));
    background: rgba(255, 255, 255, 0.95);
    border-top: 1px solid rgba(23, 48, 79, 0.06);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

.image-btn {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: #2f6bff;
    color: #fff;
    font-size: 24px;
    line-height: 1;
    flex-shrink: 0;
}

.input-area input {
    flex: 1;
    height: 40px;
    padding: 0 14px;
    border: 1px solid #dbe3ef;
    border-radius: 999px;
    outline: none;
    font-size: 14px;
    background: #fff;
}

.input-area input:focus {
    border-color: #2f6bff;
}

.input-area button {
    min-width: 68px;
    height: 40px;
    padding: 0 16px;
    background: #2f6bff;
    color: white;
    font-size: 14px;
    font-weight: 600;
}

.input-area button:disabled {
    background: #c7d2e5;
    cursor: not-allowed;
}

.hidden-file-input {
    display: none;
}

.image-preview {
    position: fixed;
    inset: 0;
    z-index: 60;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(10, 18, 30, 0.9);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
}

.preview-close {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 26px;
    line-height: 1;
    cursor: pointer;
}

.preview-image {
    display: block;
    max-width: min(100%, 720px);
    max-height: 84vh;
    border-radius: 18px;
    box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
    object-fit: contain;
    transform-origin: center center;
    transition: transform 0.18s ease;
    touch-action: none;
}

.preview-toolbar {
    position: absolute;
    bottom: 28px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.preview-action {
    min-width: 42px;
    height: 42px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    font-size: 22px;
    line-height: 1;
    cursor: pointer;
}

.preview-action--label {
    min-width: 68px;
    padding: 0 14px;
    font-size: 14px;
    font-weight: 600;
}
</style>
