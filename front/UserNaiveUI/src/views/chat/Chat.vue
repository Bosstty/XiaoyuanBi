<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from 'vue';
import { useRouter } from 'vue-router';
import { chatApi } from '@/api';
import { useUserStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();

// 状态
const conversations = ref<any[]>([]);
const currentConversation = ref<any>(null);
const messages = ref<any[]>([]);
const messageInput = ref('');
const loading = ref(false);
const sending = ref(false);

// 格式化时间
const formatTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  } else if (days === 1) {
    return '昨天';
  } else if (days < 7) {
    return `${days}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
};

// 格式化消息时间
const formatMessageTime = (time: string) => {
  if (!time) return '';
  const date = new Date(time);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 获取会话列表
const fetchConversations = async () => {
  try {
    loading.value = true;
    const res = await chatApi.getConversations();
    if (res.success) {
      conversations.value = res.data || [];
    }
  } catch (error) {
    console.error('获取会话列表失败:', error);
  } finally {
    loading.value = false;
  }
};

// 选择会话
const selectConversation = async (conv: any) => {
  currentConversation.value = conv;
  conv.unread_count = 0;

  try {
    const res = await chatApi.getMessages({ conversation_id: conv.id, limit: 50 });
    if (res.success) {
      messages.value = res.data || [];
      // 标记已读
      await chatApi.markAsRead(conv.id);
    }
  } catch (error) {
    console.error('获取消息失败:', error);
  }
};

// 发送消息
const sendMessage = async () => {
  if (!messageInput.value.trim() || !currentConversation.value || sending.value) return;

  sending.value = true;
  try {
    const res = await chatApi.sendMessage({
      conversation_id: currentConversation.value.id,
      content: messageInput.value.trim(),
      receiver_type: 'service'
    });

    if (res.success) {
      messages.value.push(res.data);
      currentConversation.value.last_message = messageInput.value.trim();
      currentConversation.value.last_message_at = new Date().toISOString();
      messageInput.value = '';
    }
  } catch (error) {
    console.error('发送消息失败:', error);
  } finally {
    sending.value = false;
  }
};

// 开始新会话
const startNewConversation = async () => {
  try {
    const res = await chatApi.createConversation({
      user_id: userStore.user?.id,
      initial_message: '您好，我想咨询一些问题'
    });

    if (res.success) {
      await fetchConversations();
      if (res.data) {
        selectConversation(res.data);
      }
    }
  } catch (error) {
    console.error('创建会话失败:', error);
  }
};

// 获取对方信息
const getOtherParty = (conv: any) => {
  if (conv.user) {
    return {
      name: conv.user.real_name || conv.user.username,
      avatar: conv.user.avatar,
      role: '用户'
    };
  } else if (conv.deliverer) {
    return {
      name: conv.deliverer.real_name || '配送员',
      avatar: conv.deliverer.avatar,
      role: '配送员'
    };
  }
  return { name: '客服', avatar: '', role: '客服' };
};

// 判断消息是否为自己发送
const isMyMessage = (msg: any) => {
  return msg.sender_type === 'user' || msg.sender_id === userStore.user?.id;
};

onMounted(() => {
  fetchConversations();
});
</script>

<template>
  <div class="chat-page">
    <!-- 会话列表 -->
    <div class="conversation-list" :class="{ active: !currentConversation }">
      <div class="list-header">
        <span>我的消息</span>
        <button class="new-chat-btn" @click="startNewConversation">+ 新会话</button>
      </div>

      <div v-if="loading" class="loading">加载中...</div>

      <div v-else-if="conversations.length === 0" class="empty">
        <p>暂无会话</p>
        <button @click="startNewConversation">开始咨询</button>
      </div>

      <div v-else class="conversation-items">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conversation-item"
          :class="{ active: currentConversation?.id === conv.id, unread: conv.unread_count > 0 }"
          @click="selectConversation(conv)"
        >
          <div class="avatar">
            <img v-if="getOtherParty(conv).avatar" :src="getOtherParty(conv).avatar" alt="avatar" />
            <span v-else>{{ getOtherParty(conv).name?.charAt(0) }}</span>
          </div>
          <div class="info">
            <div class="top">
              <span class="name">{{ getOtherParty(conv).name }}</span>
              <span class="time">{{ formatTime(conv.last_message_at) }}</span>
            </div>
            <div class="bottom">
              <span class="preview">{{ conv.last_message || '暂无消息' }}</span>
              <span v-if="conv.unread_count > 0" class="badge">{{ conv.unread_count }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 聊天窗口 -->
    <div class="chat-window" v-if="currentConversation">
      <div class="chat-header">
        <button class="back-btn" @click="currentConversation = null">&lt;</button>
        <span class="title">{{ getOtherParty(currentConversation).name }}</span>
        <span class="role">{{ getOtherParty(currentConversation).role }}</span>
      </div>

      <div class="messages">
        <div
          v-for="msg in messages"
          :key="msg.id"
          class="message"
          :class="{ mine: isMyMessage(msg) }"
        >
          <div class="avatar" v-if="!isMyMessage(msg)">
            <span>K</span>
          </div>
          <div class="content">
            <div class="text">{{ msg.content }}</div>
            <div class="time">{{ formatMessageTime(msg.created_at) }}</div>
          </div>
          <div class="avatar" v-if="isMyMessage(msg)">
            <span>{{ userStore.user?.username?.charAt(0) || '我' }}</span>
          </div>
        </div>
      </div>

      <div class="input-area">
        <input
          v-model="messageInput"
          type="text"
          placeholder="输入消息..."
          @keyup.enter="sendMessage"
          :disabled="sending"
        />
        <button @click="sendMessage" :disabled="sending || !messageInput.trim()">
          发送
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.chat-page {
  display: flex;
  height: 100vh;
  background: #f5f5f5;
}

.conversation-list {
  width: 100%;
  display: flex;
  flex-direction: column;
  background: #fff;
}

@media (min-width: 768px) {
  .conversation-list {
    width: 360px;
    border-right: 1px solid #e0e0e0;
  }
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #e0e0e0;
  font-size: 18px;
  font-weight: bold;
}

.new-chat-btn {
  padding: 6px 12px;
  background: #07c160;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  cursor: pointer;
}

.loading, .empty {
  padding: 40px;
  text-align: center;
  color: #999;
}

.empty button {
  margin-top: 16px;
  padding: 8px 24px;
  background: #07c160;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.conversation-items {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #f0f0f0;
  cursor: pointer;
}

.conversation-item:hover {
  background: #f9f9f9;
}

.conversation-item.active {
  background: #e8f5e9;
}

.conversation-item.unread .preview {
  font-weight: bold;
  color: #333;
}

.conversation-item .avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #07c160;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
  overflow: hidden;
}

.conversation-item .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.conversation-item .info {
  flex: 1;
  margin-left: 12px;
  overflow: hidden;
}

.conversation-item .top {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.conversation-item .name {
  font-weight: 500;
  color: #333;
}

.conversation-item .time {
  font-size: 12px;
  color: #999;
}

.conversation-item .bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-item .preview {
  font-size: 14px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 180px;
}

.conversation-item .badge {
  background: #07c160;
  color: white;
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  text-align: center;
}

/* 聊天窗口 */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.chat-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: #fff;
  border-bottom: 1px solid #e0e0e0;
}

.chat-header .back-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  padding: 0 8px;
  color: #333;
}

.chat-header .title {
  font-size: 18px;
  font-weight: 500;
  margin-left: 8px;
}

.chat-header .role {
  font-size: 14px;
  color: #999;
  margin-left: 8px;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.message {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.message.mine {
  flex-direction: row-reverse;
}

.message .avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #07c160;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  flex-shrink: 0;
}

.message.mine .avatar {
  background: #ff9500;
}

.message .content {
  max-width: 70%;
  margin: 0 8px;
}

.message .text {
  background: #fff;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
  word-wrap: break-word;
}

.message.mine .text {
  background: #07c160;
  color: white;
}

.message .time {
  font-size: 11px;
  color: #999;
  margin-top: 4px;
}

.message.mine .time {
  text-align: right;
}

.input-area {
  display: flex;
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #e0e0e0;
}

.input-area input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  outline: none;
  font-size: 14px;
}

.input-area input:focus {
  border-color: #07c160;
}

.input-area button {
  margin-left: 12px;
  padding: 10px 20px;
  background: #07c160;
  color: white;
  border: none;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
}

.input-area button:disabled {
  background: #ccc;
  cursor: not-allowed;
}
</style>
