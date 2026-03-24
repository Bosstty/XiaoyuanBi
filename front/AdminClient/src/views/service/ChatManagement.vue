<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">在线客服</h1>
        <p class="page-subtitle">按最新聊天接口同步会话、消息和未读状态</p>
      </div>
      <div class="page-header-right">
        <el-button text @click="refreshConversations" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <el-card class="chat-container" shadow="never">
      <div class="chat-layout">
        <aside class="conversation-list">
          <div class="list-header">
            <el-input
              v-model="searchKeyword"
              :prefix-icon="Search"
              placeholder="搜索会话..."
              clearable
            />
          </div>

          <div v-if="loading" class="list-state">
            <el-empty description="加载中..." />
          </div>

          <div v-else class="list-content">
            <button
              v-for="conv in filteredConversations"
              :key="conv.id"
              type="button"
              class="conversation-item"
              :class="{ active: currentConversation?.id === conv.id }"
              @click="selectConversation(conv)"
            >
              <el-badge :value="conv.unread_count || 0" :hidden="!(conv.unread_count > 0)">
                <el-avatar :size="46" :src="getPartner(conv).avatar || undefined">
                  {{ getPartner(conv).name.charAt(0) }}
                </el-avatar>
              </el-badge>

              <div class="conversation-copy">
                <div class="conversation-top">
                  <span class="conversation-name">{{ getPartner(conv).name }}</span>
                  <span class="conversation-time">
                    {{ formatListTime(conv.last_message_at) }}
                  </span>
                </div>
                <div class="conversation-bottom">
                  <span class="conversation-preview">
                    {{ conv.last_message || '暂无消息' }}
                  </span>
                </div>
                <div class="conversation-role">{{ getPartner(conv).role }}</div>
              </div>
            </button>

            <el-empty
              v-if="!filteredConversations.length"
              description="暂无会话"
              class="empty-list"
            />
          </div>
        </aside>

        <section v-if="currentConversation" class="chat-window">
          <div class="chat-header">
            <div class="chat-partner">
              <el-avatar :size="44" :src="currentPartner.avatar || undefined">
                {{ currentPartner.name.charAt(0) }}
              </el-avatar>
              <div class="chat-partner-copy">
                <div class="chat-partner-name">{{ currentPartner.name }}</div>
                <div class="chat-partner-role">{{ currentPartner.role }}</div>
              </div>
            </div>

            <div class="chat-actions">
              <el-button
                v-if="currentPartner.role === '用户'"
                size="small"
                @click="viewUserDetail"
              >
                <el-icon><User /></el-icon>
                用户信息
              </el-button>
              <el-button size="small" @click="refreshCurrentConversation" :loading="detailLoading">
                <el-icon><Refresh /></el-icon>
                刷新消息
              </el-button>
            </div>
          </div>

          <div ref="messagesContainer" class="messages-container">
            <div v-if="detailLoading && !messages.length" class="messages-state">
              <el-empty description="加载消息中..." />
            </div>

            <div v-else-if="!messages.length" class="messages-state">
              <el-empty description="暂无消息" />
            </div>

            <div v-else class="messages-list">
              <div
                v-for="msg in messages"
                :key="msg.id"
                class="message-item"
                :class="{ own: isOwnMessage(msg) }"
              >
                <el-avatar
                  v-if="!isOwnMessage(msg)"
                  :size="34"
                  :src="currentPartner.avatar || undefined"
                >
                  {{ currentPartner.name.charAt(0) }}
                </el-avatar>

                <div class="message-bubble">
                  <div v-if="msg.type === 'image'" class="message-image-wrap">
                    <img
                      :src="resolveImage(msg.content)"
                      alt="chat-image"
                      class="message-image"
                      @click="openImagePreview(resolveImage(msg.content))"
                    />
                  </div>
                  <div v-else class="message-text">{{ msg.content }}</div>
                  <div class="message-time">
                    {{ formatMessageTime(msg.created_at || msg.createdAt) }}
                  </div>
                </div>

                <el-avatar v-if="isOwnMessage(msg)" :size="34">
                  <el-icon><Service /></el-icon>
                </el-avatar>
              </div>
            </div>
          </div>

          <div class="input-area">
            <div class="quick-replies">
              <el-button
                v-for="reply in quickReplies"
                :key="reply"
                size="small"
                @click="useQuickReply(reply)"
              >
                {{ reply }}
              </el-button>
            </div>

            <div class="input-row">
              <button
                type="button"
                class="image-upload-btn"
                :disabled="uploading || sending"
                @click="triggerImageUpload"
              >
                {{ uploading ? '...' : '+' }}
              </button>
              <el-input
                v-model="messageInput"
                type="textarea"
                :rows="2"
                resize="none"
                placeholder="输入消息..."
                @keydown.enter.prevent="handleEnterKey"
              />
              <el-button
                type="primary"
                class="send-button"
                :disabled="sending || !messageInput.trim()"
                :loading="sending"
                @click="sendMessage"
              >
                  <el-icon><Promotion /></el-icon>
                  发送
               </el-button>
             </div>
           </div>
           <input
             ref="fileInputRef"
             type="file"
             accept="image/*"
             class="hidden-file-input"
             @change="handleImageSelected"
           />
        </section>

        <section v-else class="no-conversation">
          <div class="welcome-content">
            <el-icon :size="72" color="#9aa7b8"><ChatDotRound /></el-icon>
            <h3>请选择一个会话</h3>
            <p>左侧会话列表已按最新接口返回的数据展示</p>
          </div>
        </section>
      </div>
    </el-card>

    <el-drawer v-model="userDrawer.visible" title="用户信息" size="500px">
      <template v-if="userDrawer.data">
        <div class="detail-header">
          <el-avatar :size="78" :src="userDrawer.data.avatar || undefined">
            <el-icon :size="34"><User /></el-icon>
          </el-avatar>
          <div class="detail-info">
            <h3>{{ userDrawer.data.real_name || userDrawer.data.username || '用户' }}</h3>
            <p>{{ userDrawer.data.phone || '未绑定手机号' }}</p>
            <div class="tags">
              <el-tag :type="userDrawer.data.status === 'active' ? 'success' : 'info'" size="small">
                {{ userDrawer.data.status === 'active' ? '正常' : '未知' }}
              </el-tag>
            </div>
          </div>
        </div>

        <el-divider />

        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ userDrawer.data.id || '-' }}</el-descriptions-item>
          <el-descriptions-item label="用户名">
            {{ userDrawer.data.username || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="学号">
            {{ userDrawer.data.student_id || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="手机号">
            {{ userDrawer.data.phone || '未绑定' }}
          </el-descriptions-item>
          <el-descriptions-item label="注册时间" :span="2">
            {{ formatDateTime(userDrawer.data.created_at) }}
          </el-descriptions-item>
        </el-descriptions>

        <el-divider />

        <div class="section-title">统计信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单数">
            {{ userDrawer.data.total_orders || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="投诉次数">
            {{ userDrawer.data.complaint_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="历史会话">
            {{ userDrawer.data.history_chats_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="消费金额">
            ¥{{ userDrawer.data.total_spent || 0 }}
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <div v-if="previewImage" class="image-preview" @click="closeImagePreview">
      <button type="button" class="preview-close" @click.stop="closeImagePreview">×</button>
      <img :src="previewImage" alt="preview-image" class="preview-image" @click.stop />
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { ChatDotRound, Promotion, Refresh, Search, Service, User } from '@element-plus/icons-vue'
import { publicApi, serviceChatApi } from '@/api'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')

const searchKeyword = ref('')
const messageInput = ref('')
const messagesContainer = ref(null)
const fileInputRef = ref(null)
const loading = ref(false)
const detailLoading = ref(false)
const sending = ref(false)
const uploading = ref(false)
const pollingTimer = ref(null)
const previewImage = ref('')

const conversations = ref([])
const currentConversation = ref(null)
const messages = ref([])

const userDrawer = reactive({
  visible: false,
  data: null,
})

const quickReplies = [
  '您好，请问有什么可以帮助您的？',
  '请稍等，我帮您核实一下。',
  '感谢您的耐心等待。',
  '如果还有其他问题，可以继续告诉我。',
]

const getPartner = (conversation) => {
  if (conversation?.partner) {
    return {
      id: conversation.partner.id,
      name: conversation.partner.name || '联系人',
      avatar: conversation.partner.avatar || '',
      role: conversation.partner.role || '用户',
    }
  }

  return {
    id: conversation?.user_id || null,
    name: '联系人',
    avatar: '',
    role: '用户',
  }
}

const currentPartner = computed(() => getPartner(currentConversation.value))

const filteredConversations = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return conversations.value

  return conversations.value.filter((conversation) => {
    const partner = getPartner(conversation)
    return (
      partner.name.toLowerCase().includes(keyword) ||
      partner.role.toLowerCase().includes(keyword) ||
      String(conversation.last_message || '').toLowerCase().includes(keyword)
    )
  })
})

const formatListTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / 86400000)

  if (days <= 0) {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  }
  if (days === 1) return '昨天'
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

const formatMessageTime = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

const resolveImage = (content) => {
  if (!content) return ''
  if (/^https?:\/\//i.test(content) || content.startsWith('data:')) {
    return content
  }
  if (content.startsWith('/uploads/')) {
    return `${FILE_BASE_URL}${content}`
  }
  if (content.startsWith('uploads/')) {
    return `${FILE_BASE_URL}/${content}`
  }
  if (content.startsWith('/')) {
    return `${FILE_BASE_URL}${content}`
  }
  return `${FILE_BASE_URL}/${String(content).replace(/^\/+/, '')}`
}

const openImagePreview = (src) => {
  if (!src) return
  previewImage.value = src
}

const closeImagePreview = () => {
  previewImage.value = ''
}

const isOwnMessage = (message) => message.sender_type === 'service'

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const applyConversationList = (list) => {
  conversations.value = Array.isArray(list) ? list : []

  if (!currentConversation.value?.id) return

  const matched = conversations.value.find((item) => item.id === currentConversation.value.id)
  if (matched) {
    currentConversation.value = matched
  }
}

const fetchConversations = async () => {
  loading.value = true
  try {
    const response = await serviceChatApi.getConversations({ page: 1, limit: 50 })
    if (!response.success) {
      throw new Error(response.message || '获取会话失败')
    }

    applyConversationList(response.data)
  } catch (error) {
    console.error('获取会话列表失败:', error)
    ElMessage.error(error.message || '获取会话列表失败')
  } finally {
    loading.value = false
  }
}

const loadConversationDetail = async (conversationId, keepScroll = false) => {
  detailLoading.value = true
  try {
    const response = await serviceChatApi.getConversationDetail(conversationId)
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取会话详情失败')
    }

    currentConversation.value = response.data
    messages.value = Array.isArray(response.data.messages) ? response.data.messages : []
    await serviceChatApi.markAsRead(conversationId)

    conversations.value = conversations.value.map((item) =>
      item.id === conversationId ? { ...item, ...response.data, unread_count: 0 } : item,
    )

    if (!keepScroll) {
      await scrollToBottom()
    }
  } catch (error) {
    console.error('获取会话详情失败:', error)
    ElMessage.error(error.message || '获取会话详情失败')
  } finally {
    detailLoading.value = false
  }
}

const selectConversation = async (conversation) => {
  await loadConversationDetail(conversation.id)
}

const refreshConversations = async () => {
  await fetchConversations()
  if (currentConversation.value?.id) {
    await loadConversationDetail(currentConversation.value.id, true)
  }
}

const refreshCurrentConversation = async () => {
  if (!currentConversation.value?.id) return
  await loadConversationDetail(currentConversation.value.id, true)
}

const sendMessage = async () => {
  if (!currentConversation.value?.id || !messageInput.value.trim() || sending.value) return

  const content = messageInput.value.trim()
  sending.value = true

  try {
    const response = await serviceChatApi.sendMessage({
      conversation_id: currentConversation.value.id,
      content,
      type: 'text',
    })

    if (!response.success || !response.data) {
      throw new Error(response.message || '发送消息失败')
    }

    messages.value.push(response.data)
    currentConversation.value.last_message = content
    currentConversation.value.last_message_at = new Date().toISOString()
    conversations.value = conversations.value.map((item) =>
      item.id === currentConversation.value.id
        ? {
            ...item,
            last_message: content,
            last_message_at: currentConversation.value.last_message_at,
          }
        : item,
    )

    messageInput.value = ''
    await scrollToBottom()
  } catch (error) {
    console.error('发送消息失败:', error)
    ElMessage.error(error.message || '发送消息失败')
  } finally {
    sending.value = false
  }
}

const triggerImageUpload = () => {
  fileInputRef.value?.click()
}

const handleImageSelected = async (event) => {
  const target = event.target
  const file = target?.files?.[0]

  if (!file || !currentConversation.value?.id) return

  uploading.value = true

  try {
    const formData = new FormData()
    formData.append('file', file)

    const uploadResponse = await publicApi.uploadFile(formData)
    const imagePath = uploadResponse?.data?.path || uploadResponse?.data?.url

    if (!imagePath) {
      throw new Error('图片上传失败')
    }

    const sendResponse = await serviceChatApi.sendMessage({
      conversation_id: currentConversation.value.id,
      content: imagePath,
      type: 'image',
    })

    if (!sendResponse.success || !sendResponse.data) {
      throw new Error(sendResponse.message || '发送图片失败')
    }

    messages.value.push(sendResponse.data)
    currentConversation.value.last_message = '[图片]'
    currentConversation.value.last_message_at = new Date().toISOString()
    conversations.value = conversations.value.map((item) =>
      item.id === currentConversation.value.id
        ? {
            ...item,
            last_message: '[图片]',
            last_message_at: currentConversation.value.last_message_at,
          }
        : item,
    )

    await scrollToBottom()
    ElMessage.success('图片已发送')
  } catch (error) {
    console.error('发送图片失败:', error)
    ElMessage.error(error.message || '发送图片失败')
  } finally {
    uploading.value = false
    if (target) target.value = ''
  }
}

const handleEnterKey = () => {
  void sendMessage()
}

const useQuickReply = (reply) => {
  messageInput.value = reply
  void sendMessage()
}

const viewUserDetail = async () => {
  if (!currentConversation.value?.partner?.id || currentPartner.value.role !== '用户') return

  try {
    const response = await serviceChatApi.getUserStats(currentConversation.value.partner.id)
    if (!response.success) {
      throw new Error(response.message || '获取用户信息失败')
    }

    userDrawer.data = response.data
    userDrawer.visible = true
  } catch (error) {
    console.error('获取用户信息失败:', error)
    ElMessage.error(error.message || '获取用户信息失败')
  }
}

const pollCurrentConversation = async () => {
  if (!currentConversation.value?.id || sending.value) return

  try {
    const [conversationRes, detailRes] = await Promise.all([
      serviceChatApi.getConversations({ page: 1, limit: 50 }),
      serviceChatApi.getConversationDetail(currentConversation.value.id),
    ])

    if (conversationRes.success) {
      applyConversationList(conversationRes.data)
    }

    if (detailRes.success && detailRes.data) {
      currentConversation.value = detailRes.data
      messages.value = Array.isArray(detailRes.data.messages) ? detailRes.data.messages : []
      conversations.value = conversations.value.map((item) =>
        item.id === detailRes.data.id ? { ...item, ...detailRes.data, unread_count: 0 } : item,
      )
      await serviceChatApi.markAsRead(detailRes.data.id)
      await scrollToBottom()
    }
  } catch (error) {
    console.error('轮询聊天失败:', error)
  }
}

const startPolling = () => {
  if (pollingTimer.value) {
    window.clearInterval(pollingTimer.value)
  }

  if (!currentConversation.value?.id) return

  pollingTimer.value = window.setInterval(() => {
    void pollCurrentConversation()
  }, 3000)
}

const stopPolling = () => {
  if (pollingTimer.value) {
    window.clearInterval(pollingTimer.value)
    pollingTimer.value = null
  }
}

onMounted(async () => {
  await fetchConversations()
})

onBeforeUnmount(() => {
  stopPolling()
})

watch(
  () => currentConversation.value?.id,
  (value) => {
  if (value) {
    startPolling()
  } else {
    stopPolling()
    closeImagePreview()
  }
},
)
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
  height: 100%;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  overflow: hidden;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-left {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  font-family: 'Fira Code', monospace;
  color: var(--text-primary, #2c3e50);
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary, #909399);
}

.chat-container {
  border-radius: 16px;
  overflow: hidden;
  height: 100%;
  min-height: 0;
}

.chat-container :deep(.el-card__body) {
  height: 100%;
  min-height: 0;
  padding: 0;
}

.chat-layout {
  display: flex;
  min-height: 680px;
  height: 100%;
}

.conversation-list {
  width: 320px;
  border-right: 1px solid #ebeff5;
  background: #fff;
  display: flex;
  flex-direction: column;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #ebeff5;
}

.list-state,
.empty-list {
  padding: 30px 16px;
}

.list-content {
  flex: 1;
  overflow-y: auto;
}

.conversation-item {
  width: 100%;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px;
  border: none;
  border-bottom: 1px solid #f4f6fa;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.conversation-item:hover,
.conversation-item.active {
  background: #f7faff;
}

.conversation-item.active {
  box-shadow: inset 3px 0 0 #409eff;
}

.conversation-copy {
  flex: 1;
  min-width: 0;
}

.conversation-top,
.conversation-bottom {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.conversation-top {
  margin-bottom: 6px;
}

.conversation-name {
  font-weight: 600;
  color: #1f2d3d;
}

.conversation-time,
.conversation-role {
  font-size: 12px;
  color: #94a0b2;
}

.conversation-preview {
  color: #697586;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.conversation-role {
  margin-top: 6px;
}

.chat-window {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #f5f7fb;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeff5;
  background: rgba(255, 255, 255, 0.96);
}

.chat-partner {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-partner-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-partner-name {
  font-weight: 700;
  color: #24364b;
}

.chat-partner-role {
  font-size: 12px;
  color: #94a0b2;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  padding: 20px;
}

.messages-state {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100%;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
}

.message-item.own {
  justify-content: flex-end;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 14px;
  border-radius: 10px 18px 18px 18px;
  background: #fff;
  box-shadow: 0 4px 18px rgba(26, 43, 72, 0.06);
}

.message-item.own .message-bubble {
  background: linear-gradient(135deg, #409eff 0%, #2f6bff 100%);
  color: #fff;
  border-radius: 18px 10px 18px 18px;
}

.message-text {
  line-height: 1.6;
  word-break: break-word;
}

.message-time {
  margin-top: 6px;
  font-size: 12px;
  color: #99a4b5;
}

.message-item.own .message-time {
  color: rgba(255, 255, 255, 0.75);
}

.message-image-wrap {
  overflow: hidden;
  border-radius: 12px;
}

.message-image {
  display: block;
  width: 100%;
  max-width: 220px;
  max-height: 280px;
  object-fit: cover;
  cursor: zoom-in;
}

.input-area {
  padding: 16px 20px;
  border-top: 1px solid #ebeff5;
  background: #fff;
}

.quick-replies {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: flex-end;
}

.image-upload-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: #2f6bff;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.image-upload-btn:disabled {
  background: #c7d2e5;
  cursor: not-allowed;
}

.input-row :deep(.el-textarea) {
  flex: 1;
}

.send-button {
  height: 40px;
  padding: 0 18px;
  flex-shrink: 0;
}

.hidden-file-input {
  display: none;
}

.no-conversation {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  background: linear-gradient(180deg, #f9fbfd 0%, #f3f6fb 100%);
}

.welcome-content {
  text-align: center;
  color: #93a0b2;
}

.welcome-content h3 {
  margin: 18px 0 8px;
  color: #2c3e50;
}

.welcome-content p {
  margin: 0;
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(64, 158, 255, 0.08);
  border-radius: 12px;
  border: 1px solid rgba(64, 158, 255, 0.18);
}

.detail-info h3 {
  margin: 0 0 8px;
  color: #303133;
}

.detail-info p {
  margin: 0 0 8px;
  color: #606266;
}

.tags {
  display: flex;
  gap: 8px;
}

.section-title {
  margin-bottom: 12px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-drawer__body) {
  padding: 20px;
}

.image-preview {
  position: fixed;
  inset: 0;
  z-index: 90;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: rgba(10, 18, 30, 0.9);
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
  max-width: min(100%, 760px);
  max-height: 84vh;
  border-radius: 18px;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.35);
  object-fit: contain;
}

@media (max-width: 992px) {
  .chat-layout {
    flex-direction: column;
  }

  .conversation-list {
    width: 100%;
    max-height: 280px;
    border-right: none;
    border-bottom: 1px solid #ebeff5;
  }
}
</style>
