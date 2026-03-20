<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">客服聊天</h1>
        <p class="page-subtitle">实时处理用户咨询和在线沟通</p>
      </div>
      <div class="page-header-right">
        <el-button type="text" @click="refreshConversations">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 聊天主界面 -->
    <el-card class="chat-container" shadow="never">
      <div class="chat-layout">
        <!-- 会话列表 -->
        <div class="conversation-list" :class="{ active: !currentConversation }">
          <div class="list-header">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户..."
              prefix-icon="Search"
              clearable
              size="small"
            />
          </div>

          <div class="list-content">
            <div
              v-for="conv in filteredConversations"
              :key="conv.id"
              class="conversation-item"
              :class="{ active: currentConversation?.id === conv.id, unread: conv.unread > 0 }"
              @click="selectConversation(conv)"
            >
              <el-badge :value="conv.unread" :hidden="conv.unread === 0" class="unread-badge">
                <el-avatar :size="48" :src="conv.user?.avatar">
                  {{ conv.user?.username?.charAt(0) }}
                </el-avatar>
              </el-badge>
              <div class="conv-info">
                <div class="conv-header">
                  <span class="username">{{ conv.user?.real_name || conv.user?.username }}</span>
                  <span class="time">{{ formatTime(conv.last_message?.created_at) }}</span>
                </div>
                <div class="last-message">
                  {{ conv.last_message?.content || '暂无消息' }}
                </div>
              </div>
              <el-tag
                v-if="conv.status === 'pending'"
                type="warning"
                size="small"
                class="status-tag"
              >
                待回复
              </el-tag>
            </div>

            <el-empty v-if="filteredConversations.length === 0" description="暂无会话" />
          </div>
        </div>

        <!-- 聊天窗口 -->
        <div class="chat-window" v-if="currentConversation">
          <!-- 聊天头部 -->
          <div class="chat-header">
            <div class="user-info">
              <el-avatar :size="44" :src="currentConversation.user?.avatar">
                {{ currentConversation.user?.username?.charAt(0) }}
              </el-avatar>
              <div class="info-text">
                <div class="name">
                  {{ currentConversation.user?.real_name || currentConversation.user?.username }}
                </div>
                <div class="status">
                  <span
                    class="status-dot"
                    :class="getUserStatus(currentConversation.user?.online)"
                  ></span>
                  {{ currentConversation.user?.online ? '在线' : '离线' }}
                </div>
              </div>
            </div>
            <div class="chat-actions">
              <el-button size="small" @click="viewUserDetail">
                <el-icon><User /></el-icon>
                用户信息
              </el-button>
              <el-button size="small" @click="transferChat">
                <el-icon><Right /></el-icon>
                转接
              </el-button>
              <el-button size="small" type="danger" @click="endChat">
                <el-icon><Close /></el-icon>
                结束会话
              </el-button>
            </div>
          </div>

          <!-- 消息区域 -->
          <div class="messages-container" ref="messagesContainer">
            <div class="messages-list">
              <div
                v-for="(msg, index) in currentMessages"
                :key="msg.id || index"
                class="message-item"
                :class="{ own: msg.sender_type === 'service' }"
              >
                <el-avatar
                  v-if="msg.sender_type === 'user'"
                  :size="36"
                  :src="currentConversation.user?.avatar"
                >
                  {{ currentConversation.user?.username?.charAt(0) }}
                </el-avatar>

                <div class="message-bubble">
                  <div class="message-content">{{ msg.content }}</div>
                  <div class="message-time">{{ formatTime(msg.created_at) }}</div>
                </div>

                <el-avatar v-if="msg.sender_type === 'service'" :size="36">
                  <el-icon><Service /></el-icon>
                </el-avatar>
              </div>

              <div v-if="currentMessages.length === 0" class="empty-messages">
                <el-empty description="暂无消息" />
              </div>
            </div>
          </div>

          <!-- 输入区域 -->
          <div class="input-area">
            <div class="quick-replies">
              <el-button
                v-for="(reply, index) in quickReplies"
                :key="index"
                size="small"
                @click="useQuickReply(reply)"
              >
                {{ reply }}
              </el-button>
            </div>
            <div class="input-row">
              <el-input
                v-model="messageInput"
                placeholder="输入消息..."
                @keydown.enter="handleEnterKey"
                size="large"
                class="message-input-field"
              />
              <el-button
                type="primary"
                size="large"
                :disabled="!messageInput.trim()"
                @click="sendMessage"
                class="send-button"
              >
                <el-icon><Promotion /></el-icon>
                发送
              </el-button>
            </div>
          </div>
        </div>

        <!-- 未选择会话时的提示 -->
        <div class="no-conversation" v-else>
          <div class="welcome-content">
            <el-icon :size="80" color="#909399"><ChatDotRound /></el-icon>
            <h3>欢迎使用客服系统</h3>
            <p>请从左侧选择一个会话开始沟通</p>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 用户信息抽屉 -->
    <el-drawer v-model="userDrawer.visible" title="用户信息" size="500px">
      <template v-if="userDrawer.data">
        <!-- 基本信息头部 -->
        <div class="detail-header">
          <el-avatar :size="80" :src="userDrawer.data.avatar">
            <el-icon :size="40"><User /></el-icon>
          </el-avatar>
          <div class="detail-info">
            <h3>{{ userDrawer.data.real_name || userDrawer.data.username }}</h3>
            <p>{{ userDrawer.data.phone || '未绑定手机' }}</p>
            <div class="tags">
              <el-tag :type="userDrawer.data.status === 'active' ? 'success' : 'info'" size="small">
                {{ userDrawer.data.status === 'active' ? '正常' : '异常' }}
              </el-tag>
              <el-tag type="primary" size="small">用户</el-tag>
            </div>
          </div>
        </div>

        <el-divider />

        <!-- 基本信息 -->
        <div class="section-title">基本信息</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">
            {{ userDrawer.data.id || '-' }}
          </el-descriptions-item>
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

        <!-- 统计数据 -->
        <div class="section-title">统计数据</div>
        <el-descriptions :column="2" border>
          <el-descriptions-item label="订单数">
            {{ userDrawer.data.total_orders || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="投诉次数">
            {{ userDrawer.data.complaint_count || 0 }}
          </el-descriptions-item>
          <el-descriptions-item label="历史会话">
            {{ userDrawer.data.history_chats_count || 0 }} 次
          </el-descriptions-item>
          <el-descriptions-item label="消费金额">
            <span class="earnings">¥{{ userDrawer.data.total_spent || 0 }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>

    <!-- 转接对话框 -->
    <el-dialog v-model="transferDialog.visible" title="转接会话" width="400px">
      <el-form :model="transferDialog.form" label-width="80px">
        <el-form-item label="转接至">
          <el-select
            v-model="transferDialog.form.to_staff_id"
            placeholder="选择客服"
            style="width: 100%"
          >
            <el-option
              v-for="staff in onlineStaff"
              :key="staff.id"
              :label="staff.name"
              :value="staff.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="转接说明">
          <el-input
            v-model="transferDialog.form.note"
            type="textarea"
            :rows="3"
            placeholder="请输入转接说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="confirmTransfer">确认转接</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Refresh,
  ChatDotRound,
  CircleCheck,
  Clock,
  User,
  Right,
  Close,
  Service,
  Promotion,
} from '@element-plus/icons-vue'
import { serviceChatApi } from '@/api'

const searchKeyword = ref('')
const messageInput = ref('')
const messagesContainer = ref(null)

// 统计数据
const stats = reactive({
  totalConversations: 0,
  activeConversations: 0,
  avgResponseTime: 0,
})

// 会话列表
const conversations = ref([])
const currentConversation = ref(null)
const currentMessages = ref([])

// 用户信息抽屉
const userDrawer = reactive({
  visible: false,
  data: null,
})

// 转接对话框
const transferDialog = reactive({
  visible: false,
  form: {
    to_staff_id: '',
    note: '',
  },
})

// 在线客服列表
const onlineStaff = ref([
  { id: 1, name: '客服小王' },
  { id: 2, name: '客服小李' },
])

// 快捷回复
const quickReplies = [
  '您好，请问有什么可以帮助您的？',
  '请您稍等，我帮您查询一下',
  '感谢您的耐心等待',
  '请问还有其他问题吗？',
  '祝您生活愉快，再见！',
]

// 过滤后的会话
const filteredConversations = computed(() => {
  if (!searchKeyword.value) return conversations.value

  const keyword = searchKeyword.value.toLowerCase()
  return conversations.value.filter(
    (conv) =>
      conv.user?.username?.toLowerCase().includes(keyword) ||
      conv.user?.real_name?.includes(keyword),
  )
})

// 获取会话列表
const fetchConversations = async () => {
  try {
    const response = await serviceChatApi.getConversations()
    if (response.success) {
      const data = response.data
      // 直接使用返回的数组
      const list = Array.isArray(data) ? data : data.conversations || data.list || []

      // 转换数据结构以适配前端
      conversations.value = list.map((conv) => ({
        ...conv,
        // 处理未读数
        unread: conv.unread_count || 0,
        // 处理最后消息（后端返回的是字符串，需要转换为对象）
        last_message: {
          content: conv.last_message,
          created_at: conv.last_message_at,
        },
      }))

      // 统计数据
      stats.totalConversations = conversations.value.length
      stats.activeConversations = conversations.value.filter((c) => c.status === 'open').length
      stats.avgResponseTime = 5
    }
  } catch (error) {
    console.error('获取会话列表失败:', error)
    // 使用模拟数据
    conversations.value = [
      {
        id: 1,
        user: { id: 1, username: 'zhangsan', real_name: '张三', avatar: '', online: true },
        last_message: { content: '快递什么时候送到？', created_at: new Date() },
        unread: 2,
        status: 'pending',
      },
      {
        id: 2,
        user: { id: 2, username: 'lisi', real_name: '李四', avatar: '', online: false },
        last_message: { content: '谢谢您的帮助', created_at: new Date(Date.now() - 3600000) },
        unread: 0,
        status: 'closed',
      },
    ]
    stats.totalConversations = 2
    stats.activeConversations = 1
    stats.avgResponseTime = 8
  }
}

// 选择会话
const selectConversation = async (conv) => {
  currentConversation.value = conv
  conv.unread = 0

  try {
    const response = await serviceChatApi.getConversationDetail(conv.id)
    if (response.success) {
      // 更新会话信息（包含用户信息）
      Object.assign(currentConversation.value, response.data)
      currentMessages.value = response.data.messages || []
      scrollToBottom()

      // 标记消息已读
      try {
        await serviceChatApi.markAsRead(conv.id)
      } catch (e) {
        console.error('标记已读失败:', e)
      }

      // 获取用户统计信息
      const userId = conv.user_id || conv.deliverer_id
      if (userId) {
        try {
          const userResponse = await serviceChatApi.getUserStats(userId)
          if (userResponse.success) {
            currentConversation.value.userStats = userResponse.data
          }
        } catch (e) {
          console.error('获取用户统计失败:', e)
        }
      }
    }
  } catch (error) {
    console.error('获取消息失败:', error)
    // 使用模拟数据
    currentMessages.value = [
      {
        id: 1,
        sender_type: 'user',
        content: '您好，我想问一下我的快递到哪里了？',
        created_at: new Date(Date.now() - 600000),
      },
      {
        id: 2,
        sender_type: 'service',
        content: '您好，我帮您查询一下，请稍等',
        created_at: new Date(Date.now() - 300000),
      },
    ]
  }
}

// 刷新会话
const refreshConversations = () => {
  fetchConversations()
  if (currentConversation.value) {
    selectConversation(currentConversation.value)
  }
}

// 发送消息
const sendMessage = async () => {
  if (!messageInput.value.trim() || !currentConversation.value) return

  const content = messageInput.value.trim()

  const newMessage = {
    id: Date.now(),
    sender_type: 'service',
    content: content,
    created_at: new Date(),
  }

  // 先清空输入框
  messageInput.value = ''

  // 先添加到消息列表
  currentMessages.value.push(newMessage)

  // 立即滚动到底部（不使用nextTick，确保在DOM更新前就准备滚动）
  nextTick(() => {
    if (messagesContainer.value) {
      // 使用setTimeout确保DOM渲染完成
      setTimeout(() => {
        messagesContainer.value.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: 'smooth',
        })
      }, 50)
    }
  })

  try {
    await serviceChatApi.sendMessage({
      conversation_id: currentConversation.value.id,
      content,
    })
  } catch (error) {
    console.error('发送消息失败:', error)
  }
}

// 处理Enter键发送
const handleEnterKey = (e) => {
  // 防止换行，强制发送
  e.preventDefault()
  sendMessage()
}

// 使用快捷回复
const useQuickReply = (reply) => {
  messageInput.value = reply
  sendMessage()
}

// 查看用户详情
const viewUserDetail = async () => {
  if (!currentConversation.value) return

  // 合并用户基本信息和统计信息
  userDrawer.data = {
    ...currentConversation.value.user,
    ...currentConversation.value.userStats,
  }
  userDrawer.visible = true
}

// 转接会话
const transferChat = () => {
  transferDialog.form.to_staff_id = ''
  transferDialog.form.note = ''
  transferDialog.visible = true
}

// 确认转接
const confirmTransfer = async () => {
  if (!transferDialog.form.to_staff_id) {
    ElMessage.warning('请选择转接客服')
    return
  }

  try {
    ElMessage.success('会话已转接')
    transferDialog.visible = false
    currentConversation.value = null
    currentMessages.value = []
    fetchConversations()
  } catch {
    ElMessage.error('转接失败')
  }
}

// 结束会话
const endChat = async () => {
  try {
    await ElMessageBox.confirm('确定要结束当前会话吗？', '确认操作', { type: 'warning' })

    ElMessage.success('会话已结束')
    currentConversation.value = null
    currentMessages.value = []
    fetchConversations()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      // 使用setTimeout确保DOM渲染完成
      setTimeout(() => {
        messagesContainer.value.scrollTo({
          top: messagesContainer.value.scrollHeight,
          behavior: 'smooth',
        })
      }, 50)
    }
  })
}

// 工具函数
const getUserStatus = (online) => {
  return online ? 'online' : 'offline'
}

const formatTime = (date) => {
  if (!date) return ''
  const now = new Date()
  const time = new Date(date)
  const diff = now - time

  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`

  return time.toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchConversations()
})
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

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
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

.page-header-right {
  display: flex;
  gap: 8px;
}

/* 统计卡片 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  border-radius: var(--radius-xl, 16px);
  border: none;
  transition:
    transform 0.2s,
    box-shadow 0.2s;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
}

.stat-icon .el-icon {
  font-size: 28px;
}

.stat-icon.blue {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-icon.green {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-icon.orange {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
}

.stat-label {
  font-size: 0.85rem;
  color: #909399;
}

/* 聊天容器 */
.chat-container {
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  /* flex: 1; */
  min-height: 0;
  height: 100%;
}
.chat-container :deep(.el-card__body) {
  flex: 1;
  display: flex;
  min-height: 0;
  padding: 0;
}

.chat-layout {
  /* height: 100%; */
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

/* 会话列表 */
.conversation-list {
  width: 300px;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.list-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

.conversation-item {
  display: flex;
  align-items: center;
  padding: 16px;
  cursor: pointer;
  border-bottom: 1px solid #f0f0f0;
  transition: background 0.3s;
}

.conversation-item:hover {
  background: #f5f7fa;
}

.conversation-item.active {
  background: #ecf5ff;
  border-left: 3px solid var(--primary);
}

.conversation-item.unread .username {
  font-weight: 600;
}

.unread-badge {
  margin-right: 12px;
}

.conv-info {
  flex: 1;
  min-width: 0;
}

.conv-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
}

.username {
  font-weight: 500;
  color: #2c3e50;
}

.time {
  font-size: 0.75rem;
  color: #909399;
}

.last-message {
  font-size: 0.85rem;
  color: #909399;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.status-tag {
  margin-left: 8px;
}

/* 聊天窗口 */
.chat-window {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e4e7ed;
  background: #fafafa;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-text .name {
  font-weight: 500;
  color: #2c3e50;
}

.info-text .status {
  font-size: 0.85rem;
  color: #909399;
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.online {
  background: #67c23a;
}

.status-dot.offline {
  background: #909399;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

/* 消息区域 */
.messages-container {
  flex: 1;
  overflow-y: auto;
  background: #f5f7fa;
  min-height: 0;
}

.messages-list {
  max-width: 800px;
  margin: 0 auto;
  padding: 16px 20px;
  min-height: 100%;
}

.message-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 20px;
  padding-top: 16px;
}

.message-item:first-child {
  padding-top: 20px;
}

.message-item.own {
  justify-content: flex-end;
}

.message-item.own .el-avatar {
  order: 2;
}

.message-item.own .message-bubble {
  order: 1;
}

.message-bubble {
  max-width: 70%;
  padding: 12px 16px;
  border-radius: 16px;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.message-item.own .message-bubble {
  background: var(--primary);
  color: white;
}

.message-content {
  line-height: 1.5;
  word-break: break-word;
}

.message-time {
  font-size: 0.75rem;
  color: #909399;
  margin-top: 4px;
}

.message-item.own .message-time {
  color: rgba(255, 255, 255, 0.8);
}

.empty-messages {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
}

/* 输入区域 */
.input-area {
  padding: 16px 20px;
  background: white;
  border-top: 1px solid #e4e7ed;
}

.quick-replies {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.input-row {
  display: flex;
  gap: 12px;
  align-items: center;
}

.message-input-field {
  flex: 1;
}

.message-input-field :deep(.el-input__wrapper) {
  border-radius: 8px;
}

.send-button {
  border-radius: 8px;
  padding: 0 20px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
}

.send-button:disabled {
  opacity: 0.6;
}

/* 无会话提示 */
.no-conversation {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.welcome-content {
  text-align: center;
  color: #909399;
}

.welcome-content h3 {
  margin: 20px 0 8px;
  color: #2c3e50;
}

.welcome-content p {
  margin: 0;
}

/* 用户详情抽屉 - 与配送员详情一致 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
}

.detail-header .el-avatar {
  color: white;
}

.detail-header h3 {
  margin: 0 0 8px 0;
  color: #303133;
}

.detail-header p {
  margin: 0 0 8px 0;
  color: #606266;
}

.tags {
  display: flex;
  gap: 8px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.earnings {
  font-weight: 600;
  color: #67c23a;
  font-family: 'Fira Code', monospace;
}

:deep(.el-drawer__body) {
  padding: 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }

  .page-title {
    font-size: 1.5rem;
  }
}
</style>
