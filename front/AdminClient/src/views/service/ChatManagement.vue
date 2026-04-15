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
              :class="{ active: isConversationActive(conv.id) }"
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
                    {{ formatConversationPreview(conv.last_message) }}
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
                <div class="chat-partner-role">
                  {{ currentPartner.role }}
                  <span v-if="currentServiceName"> · 当前负责人：{{ currentServiceName }}</span>
                </div>
              </div>
              <el-button
                v-if="currentPartner.role === '用户'"
                class="pending-ticket-shortcut"
                size="small"
                plain
                @click="openPendingTicketListFromShortcut"
              >
                未处理工单
                <el-badge
                  :value="userPendingTicketCount"
                  :hidden="userPendingTicketCount <= 0"
                  class="pending-ticket-shortcut__badge"
                />
              </el-button>
              <el-button
                v-if="currentConversation?.order_id"
                class="pending-ticket-shortcut"
                size="small"
                plain
                @click="openOrderDrawer"
              >
                关联订单 #{{ currentConversation.order_id }}
              </el-button>
            </div>

            <div class="chat-actions">
              <el-button
                size="small"
                @click="openTransferDialog"
                :disabled="!canTransferConversation"
              >
                <el-icon><Service /></el-icon>
                转接客服
              </el-button>
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
                :class="{ own: isOwnMessage(msg), system: isSystemMessage(msg) }"
              >
                <template v-if="isSystemMessage(msg)">
                  <div class="system-message">
                    {{ msg.content }}
                  </div>
                </template>
                <template v-else>
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
                </template>
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
          <el-avatar :size="78" :src="resolveAssetUrl(userDrawer.data.avatar) || undefined">
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

        <el-divider />

        <div class="section-title">未处理工单</div>
        <div class="pending-ticket-card">
          <div class="pending-ticket-copy">
            <div class="pending-ticket-count">
              {{ userDrawer.data.unresolved_ticket_count || 0 }}
            </div>
            <div class="pending-ticket-meta">
              <el-tag
                :type="Number(userDrawer.data.unresolved_ticket_count || 0) > 0 ? 'warning' : 'success'"
                size="small"
              >
                {{ Number(userDrawer.data.unresolved_ticket_count || 0) > 0 ? '有未处理工单' : '暂无未处理工单' }}
              </el-tag>
            </div>
          </div>
          <el-button
            type="primary"
            plain
            :disabled="Number(userDrawer.data.unresolved_ticket_count || 0) <= 0"
            @click="openPendingTicketList"
          >
            查看工单
          </el-button>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="ticketListDialog.visible" title="未处理工单" width="860px">
      <el-table v-loading="ticketListDialog.loading" :data="ticketListDialog.tickets" stripe>
        <el-table-column prop="ticket_no" label="工单编号" min-width="180" />
        <el-table-column prop="title" label="标题" min-width="220" show-overflow-tooltip />
        <el-table-column prop="type" label="类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">{{ getTypeText(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="priority" label="优先级" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="110" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="viewPendingTicketDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-dialog>

    <el-drawer v-model="ticketDetailDrawer.visible" title="工单详情" size="620px">
      <template v-if="ticketDetailDrawer.data">
        <div class="ticket-header">
          <div class="ticket-info">
            <el-tag :type="getTypeTagType(ticketDetailDrawer.data.type)" size="large">
              {{ getTypeText(ticketDetailDrawer.data.type) }}
            </el-tag>
            <el-tag :type="getPriorityTagType(ticketDetailDrawer.data.priority)" size="large">
              {{ getPriorityText(ticketDetailDrawer.data.priority) }}
            </el-tag>
            <el-tag :type="getStatusTagType(ticketDetailDrawer.data.status)" size="large">
              {{ getStatusText(ticketDetailDrawer.data.status) }}
            </el-tag>
          </div>
          <h3>{{ ticketDetailDrawer.data.title }}</h3>
          <p class="ticket-meta">
            <span>{{ ticketDetailDrawer.data.ticket_no }}</span>
            <span>创建于 {{ formatDateTime(ticketDetailDrawer.data.created_at) }}</span>
          </p>
        </div>

        <el-divider />

        <div class="section">
          <h4>工单详情</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="问题描述">
              {{ ticketDetailDrawer.data.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="关联订单" v-if="ticketDetailDrawer.data.order_id">
              <div class="linked-order-row">
                <span>{{ ticketDetailDrawer.data.order_id }}</span>
                <el-button type="primary" link @click="openTicketOrderDrawer(ticketDetailDrawer.data.order_id)">
                  查看订单详情
                </el-button>
              </div>
            </el-descriptions-item>
            <el-descriptions-item label="处理时间" v-if="ticketDetailDrawer.data.resolved_at">
              {{ formatDateTime(ticketDetailDrawer.data.resolved_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="解决方案" v-if="ticketDetailDrawer.data.solution">
              {{ ticketDetailDrawer.data.solution }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div
          class="section action-section"
          v-if="ticketDetailDrawer.data.status !== 'resolved' && ticketDetailDrawer.data.status !== 'closed'"
        >
          <h4>快速处理</h4>
          <el-form :model="ticketHandleForm" label-width="100px">
            <el-form-item label="解决方案">
              <el-input
                v-model="ticketHandleForm.solution"
                type="textarea"
                :rows="3"
                placeholder="请输入处理备注或解决方案"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="submitPendingTicketHandle" :loading="ticketHandleForm.loading">
                标记已解决
              </el-button>
              <el-button @click="startPendingTicketProcess" :loading="ticketHandleForm.loading">
                开始处理
              </el-button>
              <el-button type="danger" @click="closePendingTicket" :loading="ticketHandleForm.loading">
                关闭工单
              </el-button>
            </el-form-item>
            <el-form-item v-if="ticketDetailDrawer.data.order_id">
              <el-button v-if="ticketDetailDrawer.data.type === 'refund'" type="warning" @click="handlePendingTicketRefund">
                退款
              </el-button>
              <el-button v-else-if="ticketDetailDrawer.data.type === 'complaint'" type="danger" @click="handlePendingTicketCompensation">
                赔偿
              </el-button>
              <template v-else-if="ticketDetailDrawer.data.type === 'dispute'">
                <el-button type="warning" @click="handlePendingTicketRefund">退款</el-button>
                <el-button type="danger" @click="handlePendingTicketCompensate">赔付</el-button>
              </template>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="transferDialog.visible" title="转接客服" width="420px">
      <el-form label-position="top">
        <el-form-item label="目标客服">
          <el-select
            v-model="transferDialog.form.targetServiceId"
            placeholder="请选择要转接的客服"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="item in transferDialog.services"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="通知用户">
          <el-switch v-model="transferDialog.form.notifyUser" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="transferDialog.submitting" @click="submitTransfer">
          确认转接
        </el-button>
      </template>
    </el-dialog>

    <div v-if="previewImage" class="image-preview" @click="closeImagePreview">
      <button type="button" class="preview-close" @click.stop="closeImagePreview">×</button>
      <img :src="previewImage" alt="preview-image" class="preview-image" @click.stop />
    </div>

    <el-drawer v-model="orderDrawer.visible" title="订单详情" size="620px">
      <template v-if="orderDrawer.data">
        <div v-loading="orderDrawer.loading">
        <div class="ticket-header">
          <div class="ticket-info">
            <el-tag size="large" :type="getOrderStatusTagType(orderDrawer.data.status)">
              {{ getOrderStatusText(orderDrawer.data.status) }}
            </el-tag>
            <el-tag size="large" :type="getPaymentStatusTagType(orderDrawer.data.payment_status)">
              {{ getPaymentStatusText(orderDrawer.data.payment_status) }}
            </el-tag>
            <el-tag size="large" :type="getSettlementStatusTagType(orderDrawer.data.settlement_status)">
              {{ getSettlementStatusText(orderDrawer.data.settlement_status) }}
            </el-tag>
          </div>
          <h3>{{ orderDrawer.data.title || `订单 #${orderDrawer.data.id}` }}</h3>
          <p class="ticket-meta">
            <span>{{ orderDrawer.data.order_no || `#${orderDrawer.data.id}` }}</span>
            <span>创建于 {{ formatDateTime(orderDrawer.data.created_at) }}</span>
          </p>
        </div>

        <el-divider />

        <div class="section">
          <h4>订单概览</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="订单ID">{{ orderDrawer.data.id }}</el-descriptions-item>
            <el-descriptions-item label="订单类型">{{ getOrderTypeText(orderDrawer.data.type) }}</el-descriptions-item>
            <el-descriptions-item label="发布用户">
              {{ orderDrawer.data.user?.real_name || orderDrawer.data.user?.username || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="配送员">
              {{ orderDrawer.data.delivererInfo?.real_name || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="订单金额">
              ¥{{ formatMoney(orderDrawer.data.price) }}
            </el-descriptions-item>
            <el-descriptions-item label="小费">
              ¥{{ formatMoney(orderDrawer.data.tip) }}
            </el-descriptions-item>
            <el-descriptions-item label="应付合计">
              ¥{{ formatMoney(getOrderTotalAmount(orderDrawer.data)) }}
            </el-descriptions-item>
            <el-descriptions-item label="联系人">
              {{ orderDrawer.data.contact_name || '-' }} / {{ orderDrawer.data.contact_phone || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="取货地址">
              {{ orderDrawer.data.pickup_location || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="送达地址">
              {{ orderDrawer.data.delivery_location || '-' }}
            </el-descriptions-item>
            <el-descriptions-item v-if="orderDrawer.data.description" label="备注说明">
              {{ orderDrawer.data.description }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <div
          v-if="orderDrawer.data.pickup_photo || orderDrawer.data.delivery_photo"
          class="order-photo-grid"
        >
          <div v-if="orderDrawer.data.pickup_photo" class="order-photo-card">
            <div class="order-photo-label">取货照片</div>
            <el-image
              :src="resolveImage(orderDrawer.data.pickup_photo)"
              :preview-src-list="[resolveImage(orderDrawer.data.pickup_photo)]"
              fit="cover"
              class="order-proof-image"
            />
          </div>
          <div v-if="orderDrawer.data.delivery_photo" class="order-photo-card">
            <div class="order-photo-label">送达照片</div>
            <el-image
              :src="resolveImage(orderDrawer.data.delivery_photo)"
              :preview-src-list="[resolveImage(orderDrawer.data.delivery_photo)]"
              fit="cover"
              class="order-proof-image"
            />
          </div>
        </div>

        <div class="section" v-if="orderDrawer.data.items?.length">
          <h4>物品明细</h4>
          <div class="order-items">
            <div
              v-for="item in orderDrawer.data.items"
              :key="item.id || item.item_index"
              class="order-item-row"
            >
              <strong>{{ item.item_name || item.name || `物品#${item.id}` }}</strong>
              <span>{{ item.quantity || 1 }} 件</span>
            </div>
          </div>
        </div>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, Promotion, Refresh, Search, Service, User } from '@element-plus/icons-vue'
import { publicApi, serviceChatApi, serviceOrderApi, serviceTicketApi } from '@/api'
import { createChatSocket } from '@/utils/chatSocket'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const route = useRoute()
const router = useRouter()

const searchKeyword = ref('')
const messageInput = ref('')
const messagesContainer = ref(null)
const fileInputRef = ref(null)
const loading = ref(false)
const detailLoading = ref(false)
const sending = ref(false)
const uploading = ref(false)
const previewImage = ref('')
const socket = ref(null)
const joinedConversationId = ref(null)
let handleSocketConnect = null
let handleSocketMessageNew = null
let handleSocketConversationUpdated = null
let handleSocketMessageRead = null
let handleSocketConnectError = null

const conversations = ref([])
const currentConversation = ref(null)
const messages = ref([])
const activeConversationId = ref(null)
let conversationRequestToken = 0
const pageAlive = ref(true)

const userDrawer = reactive({
  visible: false,
  data: null,
})

const ticketListDialog = reactive({
  visible: false,
  loading: false,
  tickets: [],
})

const ticketDetailDrawer = reactive({
  visible: false,
  data: null,
})
const orderDrawer = reactive({
  visible: false,
  loading: false,
  data: null,
})

const ticketHandleForm = reactive({
  solution: '',
  loading: false,
})

const transferDialog = reactive({
  visible: false,
  submitting: false,
  services: [],
  form: {
    targetServiceId: null,
    notifyUser: true,
  },
})

const quickReplies = [
  '您好，请问有什么可以帮助您的？',
  '请稍等，我帮您核实一下。',
  '感谢您的耐心等待。',
  '如果还有其他问题，可以继续告诉我。',
]

const resolveAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:') || value.startsWith('blob:')) {
    return value
  }
  if (value.startsWith('/')) {
    return `${FILE_BASE_URL}${value}`
  }
  return `${FILE_BASE_URL}/${String(value).replace(/^\/+/, '')}`
}

const getPartner = (conversation) => {
  if (conversation?.partner) {
    return {
      id: conversation.partner.id,
      name: conversation.partner.name || '联系人',
      avatar: resolveAssetUrl(conversation.partner.avatar),
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
const currentServiceName = computed(
  () => currentConversation.value?.service?.name || currentConversation.value?.service?.username || '',
)
const canTransferConversation = computed(() => Boolean(currentConversation.value?.id))
const userPendingTicketCount = computed(() => Number(userDrawer.data?.unresolved_ticket_count || 0))
const currentOrderId = computed(() => Number(currentConversation.value?.order_id || 0))
const availableOrderStatusActions = computed(() => {
  const status = orderDrawer.data?.status
  const map = {
    pending: [
      { value: 'accepted', label: '标记已接单', type: 'primary' },
      { value: 'cancelled', label: '取消订单', type: 'danger' },
    ],
    accepted: [
      { value: 'picking', label: '开始取货', type: 'primary' },
      { value: 'cancelled', label: '取消订单', type: 'danger' },
    ],
    picking: [
      { value: 'delivering', label: '标记配送中', type: 'primary' },
      { value: 'cancelled', label: '取消订单', type: 'danger' },
    ],
    delivering: [{ value: 'completed', label: '标记已完成', type: 'success' }],
  }
  return map[status] || []
})
const canRefundCurrentOrder = computed(
  () => Boolean(orderDrawer.data?.id) && orderDrawer.data?.payment_status === 'paid',
)
const canCompensateCurrentOrder = computed(
  () => Boolean(orderDrawer.data?.id) && ['accepted', 'picking', 'delivering', 'completed'].includes(orderDrawer.data?.status),
)
const canDamageCompensateCurrentOrder = computed(
  () => Boolean(orderDrawer.data?.id) && ['accepted', 'picking', 'delivering', 'completed'].includes(orderDrawer.data?.status),
)

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

const isConversationActive = (conversationId) =>
  Number(activeConversationId.value || 0) === Number(conversationId || 0)

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

const formatConversationPreview = (value) => {
  const content = String(value || '').trim()
  if (!content) return '暂无消息'

  const lowerContent = content.toLowerCase()
  const isUploadPath =
    content.startsWith('/uploads/') ||
    content.startsWith('uploads/') ||
    /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(content)

  if (content === '[图片]' || isUploadPath || lowerContent.startsWith('data:image/')) {
    return '[图片]'
  }

  return content
}

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString('zh-CN')
}

const isDialogCancel = (error) => error === 'cancel' || error === 'close'

const sortConversations = (list) =>
  [...list].sort((left, right) => {
    const leftTime = new Date(left?.last_message_at || 0).getTime()
    const rightTime = new Date(right?.last_message_at || 0).getTime()
    return rightTime - leftTime
  })

const upsertConversation = (incoming) => {
  if (!incoming?.id) return null

  const currentId = Number(currentConversation.value?.id || 0)
  const existing = conversations.value.find((item) => Number(item.id) === Number(incoming.id))
  const mergedPartner = existing?.partner || incoming?.partner || null
  const merged = {
    ...(existing || {}),
    ...incoming,
    ...(mergedPartner ? { partner: mergedPartner } : {}),
  }

  conversations.value = sortConversations([
    merged,
    ...conversations.value.filter((item) => Number(item.id) !== Number(incoming.id)),
  ])

  if (currentId && currentId === Number(incoming.id)) {
    currentConversation.value = {
      ...(currentConversation.value || {}),
      ...merged,
    }
  }

  return merged
}

const resolveImage = (content) => {
  return resolveAssetUrl(content)
}

const openImagePreview = (src) => {
  if (!src) return
  previewImage.value = src
}

const closeImagePreview = () => {
  previewImage.value = ''
}

const isOwnMessage = (message) => message.sender_type === 'service'
const isSystemMessage = (message) => message.type === 'system'

const scrollToBottom = async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const applyConversationList = (list) => {
  conversations.value = Array.isArray(list) ? sortConversations(list) : []

  if (!currentConversation.value?.id) return

  const matched = conversations.value.find((item) => item.id === currentConversation.value.id)
  if (matched) {
    currentConversation.value = matched
  }
}

const appendMessage = async (incoming) => {
  if (!incoming?.id) return

  const exists = messages.value.some((item) => Number(item.id) === Number(incoming.id))
  if (exists) return

  messages.value.push(incoming)
  await scrollToBottom()
}

const updateConversationFromMessage = (conversationId, incomingMessage) => {
  const existing = conversations.value.find((item) => Number(item.id) === Number(conversationId))
  if (!existing) return

  const isActiveConversation = Number(currentConversation.value?.id || 0) === Number(conversationId)
  const isOwn = isOwnMessage(incomingMessage)

  upsertConversation({
    ...existing,
    last_message: incomingMessage.type === 'image' ? '[图片]' : incomingMessage.content,
    last_message_at:
      incomingMessage.created_at || incomingMessage.createdAt || new Date().toISOString(),
    unread_count: isActiveConversation
      ? 0
      : isOwn
        ? Number(existing.unread_count || 0)
        : Number(existing.unread_count || 0) + 1,
  })
}

const fetchConversations = async () => {
  loading.value = true
  try {
    const response = await serviceChatApi.getConversations({ page: 1, limit: 50 })
    if (!response.success) {
      throw new Error(response.message || '获取会话失败')
    }

    if (!pageAlive.value) return
    applyConversationList(response.data)
  } catch (error) {
    if (!pageAlive.value) return
    console.error('获取会话列表失败:', error)
    ElMessage.error(error.message || '获取会话列表失败')
  } finally {
    if (pageAlive.value) {
      loading.value = false
    }
  }
}

const loadConversationDetail = async (conversationId, keepScroll = false) => {
  const requestToken = ++conversationRequestToken
  activeConversationId.value = Number(conversationId || 0)
  detailLoading.value = true
  try {
    const response = await serviceChatApi.getConversationDetail(conversationId)
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取会话详情失败')
    }

    if (!pageAlive.value || requestToken !== conversationRequestToken) return

    currentConversation.value = response.data
    messages.value = Array.isArray(response.data.messages) ? response.data.messages : []

    conversations.value = conversations.value.map((item) =>
      item.id === conversationId ? { ...item, ...response.data, unread_count: 0 } : item,
    )

    void serviceChatApi.markAsRead(conversationId)
    void refreshUserStats()

    if (!keepScroll) {
      await scrollToBottom()
    }
  } catch (error) {
    if (!pageAlive.value || requestToken !== conversationRequestToken) return
    console.error('获取会话详情失败:', error)
    ElMessage.error(error.message || '获取会话详情失败')
  } finally {
    if (pageAlive.value && requestToken === conversationRequestToken) {
      detailLoading.value = false
    }
  }
}

const selectConversation = async (conversation) => {
  const nextConversationId = Number(conversation?.id || 0)
  if (!nextConversationId || isConversationActive(nextConversationId)) return

  activeConversationId.value = nextConversationId
  userDrawer.data = null
  orderDrawer.data = null
  ticketListDialog.tickets = []
  if (ticketListDialog.visible) {
    ticketListDialog.visible = false
  }

  currentConversation.value = {
    ...(currentConversation.value || {}),
    ...conversation,
  }
  messages.value = []

  await loadConversationDetail(nextConversationId)
}

const openConversationById = async (conversationId) => {
  const numericId = Number(conversationId || 0)
  if (!numericId) return

  if (isConversationActive(numericId)) return

  userDrawer.data = null
  orderDrawer.data = null

  const localConversation = conversations.value.find((item) => Number(item.id) === numericId)
  if (localConversation) {
    await selectConversation(localConversation)
    return
  }

  await loadConversationDetail(numericId)
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

const loadAvailableServices = async () => {
  const response = await serviceChatApi.getAvailableServices()
  if (!response.success) {
    throw new Error(response.message || '获取客服列表失败')
  }

  const currentServiceId = Number(currentConversation.value?.service?.id || 0)
  transferDialog.services = Array.isArray(response.data)
    ? response.data.filter((item) => Number(item.id) !== currentServiceId)
    : []
}

const openTransferDialog = async () => {
  if (!currentConversation.value?.id) return

  try {
    await loadAvailableServices()
    if (!transferDialog.services.length) {
      ElMessage.warning('暂无可转接的客服')
      return
    }

    transferDialog.form.targetServiceId = transferDialog.services[0]?.id || null
    transferDialog.form.notifyUser = true
    transferDialog.visible = true
  } catch (error) {
    console.error('获取客服列表失败:', error)
    ElMessage.error(error.message || '获取客服列表失败')
  }
}

const submitTransfer = async () => {
  if (!currentConversation.value?.id) return
  if (!transferDialog.form.targetServiceId) {
    ElMessage.warning('请选择要转接的客服')
    return
  }

  transferDialog.submitting = true
  try {
    const response = await serviceChatApi.transferConversation(currentConversation.value.id, {
      target_service_id: transferDialog.form.targetServiceId,
      notify_user: transferDialog.form.notifyUser,
    })

    if (!response.success) {
      throw new Error(response.message || '转接会话失败')
    }

    transferDialog.visible = false
    conversations.value = conversations.value.filter(
      (item) => Number(item.id) !== Number(currentConversation.value?.id || 0),
    )
    currentConversation.value = null
    messages.value = []
    if (route.query.conversationId) {
      await router.replace({ path: '/service/chat' })
    }
    ElMessage.success('会话已转接')
    await fetchConversations()
  } catch (error) {
    console.error('转接会话失败:', error)
    ElMessage.error(error.message || '转接会话失败')
  } finally {
    transferDialog.submitting = false
  }
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

    await appendMessage(response.data)
    upsertConversation({
      ...(currentConversation.value || {}),
      id: currentConversation.value.id,
      last_message: content,
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })

    messageInput.value = ''
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

    await appendMessage(sendResponse.data)
    upsertConversation({
      ...(currentConversation.value || {}),
      id: currentConversation.value.id,
      last_message: '[图片]',
      last_message_at: new Date().toISOString(),
      unread_count: 0,
    })

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

const openPendingTicketListFromShortcut = async () => {
  try {
    await refreshUserStats()
    await openPendingTicketList()
  } catch (error) {
    console.error('打开未处理工单失败:', error)
    ElMessage.error(error.message || '打开未处理工单失败')
  }
}

const getPendingTicketUserId = () => Number(userDrawer.data?.id || currentConversation.value?.partner?.id || 0)

const refreshUserStats = async () => {
  if (!pageAlive.value) return
  if (currentPartner.value.role !== '用户') {
    userDrawer.data = null
    return
  }

  const userId = getPendingTicketUserId()
  if (!userId) {
    userDrawer.data = null
    return
  }

  const response = await serviceChatApi.getUserStats(userId)
  if (pageAlive.value && response.success) {
    userDrawer.data = response.data
  }
}

const fetchPendingTickets = async () => {
  const userId = getPendingTicketUserId()
  if (!userId) {
    throw new Error('未找到用户信息')
  }

  ticketListDialog.loading = true
  try {
    const response = await serviceTicketApi.getTickets({
      user_id: userId,
      unresolved_only: true,
      include_all_user_tickets: true,
      page: 1,
      limit: 50,
    })
    if (!response.success) {
      throw new Error(response.message || '获取工单列表失败')
    }

    ticketListDialog.tickets = Array.isArray(response.data) ? response.data : []
  } finally {
    ticketListDialog.loading = false
  }
}

const openPendingTicketList = async () => {
  try {
    await fetchPendingTickets()
    ticketListDialog.visible = true
  } catch (error) {
    console.error('获取未处理工单失败:', error)
    ElMessage.error(error.message || '获取未处理工单失败')
  }
}

const fetchConversationOrderDetail = async (orderId = currentOrderId.value) => {
  if (!orderId) {
    orderDrawer.data = null
    return
  }

  orderDrawer.loading = true
  try {
    const response = await serviceOrderApi.getOrderDetail(orderId)
    if (!response.success || !response.data) {
      throw new Error(response.message || '获取订单详情失败')
    }
    if (!pageAlive.value) return
    orderDrawer.data = response.data
  } catch (error) {
    if (!pageAlive.value) return
    console.error('获取订单详情失败:', error)
    ElMessage.error(error.message || '获取订单详情失败')
  } finally {
    if (pageAlive.value) {
      orderDrawer.loading = false
    }
  }
}

const openOrderDrawer = async () => {
  if (!currentOrderId.value) {
    ElMessage.warning('当前会话没有关联订单')
    return
  }

  await fetchConversationOrderDetail()
  if (orderDrawer.data?.id) {
    orderDrawer.visible = true
  }
}

const openTicketOrderDrawer = async (orderId) => {
  if (!orderId) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  await fetchConversationOrderDetail(orderId)
  if (orderDrawer.data?.id) {
    orderDrawer.visible = true
  }
}

const refreshPendingTicketContext = async (ticketId) => {
  await Promise.all([fetchPendingTickets(), refreshUserStats()])

  if (!ticketDetailDrawer.visible || !ticketId) return

  const response = await serviceTicketApi.getTicketById(ticketId)
  if (response.success && response.data) {
    ticketDetailDrawer.data = response.data
  }
}

const viewPendingTicketDetail = async (row) => {
  const ticketId = Number(row?.id || 0)
  if (!ticketId) {
    ElMessage.warning('未找到工单信息')
    return
  }

  router.push({
    path: '/service/after-sales',
    query: {
      ticketId: String(ticketId),
      conversationId: currentConversation.value?.id ? String(currentConversation.value.id) : undefined,
    },
  })
}

const updatePendingTicketStatus = async (status, fallbackSolution = '') => {
  if (!ticketDetailDrawer.data?.id) return

  const solution = String(ticketHandleForm.solution || fallbackSolution).trim()
  if (!solution) {
    ElMessage.warning('请输入处理备注')
    return
  }

  ticketHandleForm.loading = true
  try {
    const response = await serviceTicketApi.updateTicketStatus(ticketDetailDrawer.data.id, {
      status,
      solution,
    })

    if (!response.success) {
      throw new Error(response.message || '工单处理失败')
    }

    ElMessage.success('工单处理成功')
    if (status === 'resolved' || status === 'closed') {
      ticketDetailDrawer.visible = false
    }
    await refreshPendingTicketContext(ticketDetailDrawer.data.id)
  } catch (error) {
    console.error('工单处理失败:', error)
    ElMessage.error(error.message || '工单处理失败')
  } finally {
    ticketHandleForm.loading = false
  }
}

const submitPendingTicketHandle = async () => {
  await updatePendingTicketStatus('resolved')
}

const startPendingTicketProcess = async () => {
  ticketHandleForm.loading = true
  try {
    const response = await serviceTicketApi.claimTicket(ticketDetailDrawer.data.id)
    if (!response.success) {
      throw new Error(response.message || '开始处理失败')
    }

    ElMessage.success('已开始处理工单')
    await refreshPendingTicketContext(ticketDetailDrawer.data.id)
  } catch (error) {
    ElMessage.error(error.message || '开始处理失败')
  } finally {
    ticketHandleForm.loading = false
  }
}

const closePendingTicket = async () => {
  await updatePendingTicketStatus('closed', '工单已关闭')
}

const handlePendingTicketRefund = async () => {
  if (!ticketDetailDrawer.data?.order_id) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入退款原因', '退款处理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValidator: (inputValue) => (inputValue && inputValue.trim() ? true : '请填写退款原因'),
    })

    const response = await serviceOrderApi.processRefund(ticketDetailDrawer.data.order_id, {
      reason: value.trim(),
      ticket_id: ticketDetailDrawer.data.id,
    })

    if (!response.success) {
      throw new Error(response.message || '退款处理失败')
    }

    ElMessage.success('退款处理成功')
    await refreshPendingTicketContext(ticketDetailDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '退款处理失败')
    }
  }
}

const handlePendingTicketCompensation = async () => {
  if (!ticketDetailDrawer.data?.order_id) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入赔偿金额和原因（格式：金额|原因）', '投诉赔偿处理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^\d+(\.\d+)?\|.+$/,
      inputErrorMessage: '格式错误，请输入：金额|原因',
    })

    const [amount, reason] = value.split('|')
    const response = await serviceOrderApi.processCompensation(ticketDetailDrawer.data.order_id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
      ticket_id: ticketDetailDrawer.data.id,
    })

    if (!response.success) {
      throw new Error(response.message || '赔偿处理失败')
    }

    ElMessage.success('赔偿处理成功')
    await refreshPendingTicketContext(ticketDetailDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '赔偿处理失败')
    }
  }
}

const handlePendingTicketCompensate = async () => {
  if (!ticketDetailDrawer.data?.order_id) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入额外赔付金额和原因（格式：金额|原因）', '损坏赔付处理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPattern: /^\d+(\.\d+)?\|.+$/,
      inputErrorMessage: '格式错误，请输入：金额|原因',
    })

    const [amount, reason] = value.split('|')
    const response = await serviceOrderApi.processCompensate(ticketDetailDrawer.data.order_id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
      ticket_id: ticketDetailDrawer.data.id,
    })

    if (!response.success) {
      throw new Error(response.message || '赔付处理失败')
    }

    ElMessage.success('赔付处理成功')
    await refreshPendingTicketContext(ticketDetailDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '赔付处理失败')
    }
  }
}

const updateCurrentOrderStatus = async (status) => {
  if (!orderDrawer.data?.id) return

  try {
    let reason
    if (status === 'cancelled') {
      const result = await ElMessageBox.prompt('请输入取消原因', '取消订单', {
        inputValidator: (inputValue) => (inputValue && inputValue.trim() ? true : '请填写取消原因'),
      })
      reason = result.value.trim()
    } else {
      await ElMessageBox.confirm(`确认将订单状态更新为“${getOrderStatusText(status)}”？`, '更新订单状态', {
        type: 'warning',
      })
    }

    const response = await serviceOrderApi.handleOrderStatus(orderDrawer.data.id, { status, reason })
    if (!response.success) {
      throw new Error(response.message || '更新订单状态失败')
    }

    ElMessage.success('订单状态已更新')
    await fetchConversationOrderDetail(orderDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '更新订单状态失败')
    }
  }
}

const handleConversationOrderRefund = async () => {
  if (!orderDrawer.data?.id) return

  try {
    const { value } = await ElMessageBox.prompt('请输入退款原因', '退款处理', {
      inputValidator: (inputValue) => (inputValue && inputValue.trim() ? true : '请填写退款原因'),
    })

    const response = await serviceOrderApi.processRefund(orderDrawer.data.id, {
      reason: value.trim(),
    })
    if (!response.success) {
      throw new Error(response.message || '退款处理失败')
    }

    ElMessage.success('退款处理成功')
    await fetchConversationOrderDetail(orderDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '退款处理失败')
    }
  }
}

const handleConversationOrderCompensation = async () => {
  if (!orderDrawer.data?.id) return

  try {
    const { value } = await ElMessageBox.prompt('请输入赔偿金额和原因（格式：金额|原因）', '投诉赔偿处理', {
      inputPattern: /^\d+(\.\d+)?\|.+$/,
      inputErrorMessage: '格式错误，请输入：金额|原因',
    })
    const [amount, reason] = value.split('|')
    const response = await serviceOrderApi.processCompensation(orderDrawer.data.id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
    })
    if (!response.success) {
      throw new Error(response.message || '赔偿处理失败')
    }

    ElMessage.success('赔偿处理成功')
    await fetchConversationOrderDetail(orderDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '赔偿处理失败')
    }
  }
}

const handleConversationOrderDamageCompensation = async () => {
  if (!orderDrawer.data?.id) return

  try {
    const { value } = await ElMessageBox.prompt('请输入额外赔付金额和原因（格式：金额|原因）', '损坏赔付处理', {
      inputPattern: /^\d+(\.\d+)?\|.+$/,
      inputErrorMessage: '格式错误，请输入：金额|原因',
    })
    const [amount, reason] = value.split('|')
    const response = await serviceOrderApi.processCompensate(orderDrawer.data.id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
    })
    if (!response.success) {
      throw new Error(response.message || '赔付处理失败')
    }

    ElMessage.success('赔付处理成功')
    await fetchConversationOrderDetail(orderDrawer.data.id)
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '赔付处理失败')
    }
  }
}

const getTypeText = (type) => {
  const texts = {
    complaint: '投诉',
    refund: '退款',
    dispute: '争议',
    suggestion: '建议',
    other: '其他',
  }
  return texts[type] || type || '其他'
}

const getTypeTagType = (type) => {
  const types = {
    complaint: 'danger',
    refund: 'warning',
    dispute: 'info',
    suggestion: 'success',
    other: 'info',
  }
  return types[type] || 'info'
}

const getPriorityText = (priority) => {
  const texts = {
    urgent: '紧急',
    high: '高',
    medium: '中',
    normal: '普通',
    low: '低',
  }
  return texts[priority] || priority || '中'
}

const getPriorityTagType = (priority) => {
  const types = {
    urgent: 'danger',
    high: 'warning',
    medium: '',
    normal: '',
    low: 'info',
  }
  return types[priority] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    closed: '已关闭',
  }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    closed: 'info',
  }
  return types[status] || 'info'
}

const getOrderStatusText = (status) => {
  const texts = {
    pending: '待接单',
    accepted: '已接单',
    picking: '取货处理中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return texts[status] || status || '-'
}

const getPaymentStatusText = (status) => {
  const texts = {
    unpaid: '待支付',
    paid: '已支付',
    refunded: '已退款',
  }
  return texts[status] || status || '-'
}

const getSettlementStatusText = (status) => {
  const texts = {
    none: '未进入结算',
    holding: '担保期中',
    settled: '已结算',
    partial_refunded: '部分退款',
    refunded: '已退款',
    partial_compensated: '部分赔付',
    compensated: '已赔付',
  }
  return texts[status] || status || '-'
}

const formatMoney = (value) => {
  const amount = Number.parseFloat(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

const getOrderTotalAmount = (order) =>
  Number.parseFloat(order?.price || 0) + Number.parseFloat(order?.tip || 0)

const getOrderStatusTagType = (status) => {
  const types = {
    pending: 'warning',
    accepted: 'primary',
    picking: 'warning',
    delivering: 'primary',
    completed: 'success',
    cancelled: 'info',
  }
  return types[status] || 'info'
}

const getPaymentStatusTagType = (status) => {
  const types = {
    unpaid: 'warning',
    paid: 'success',
    refunded: 'info',
  }
  return types[status] || 'info'
}

const getSettlementStatusTagType = (status) => {
  const types = {
    none: 'info',
    holding: 'warning',
    settled: 'success',
    partial_refunded: 'warning',
    refunded: 'info',
    partial_compensated: 'warning',
    compensated: 'success',
  }
  return types[status] || 'info'
}

const getOrderTypeText = (type) => {
  const texts = {
    express: '快递代取',
    food: '外卖代取',
    medicine: '药品代取',
    daily: '日用品代取',
  }
  return texts[type] || type || '-'
}

const leaveConversationRoom = () => {
  if (!socket.value || !joinedConversationId.value) return

  socket.value.emit('chat:leave', {
    conversation_id: joinedConversationId.value,
  })
  joinedConversationId.value = null
}

const joinConversationRoom = (conversationId) => {
  if (!socket.value || !conversationId) return
  if (Number(joinedConversationId.value || 0) === Number(conversationId)) return

  leaveConversationRoom()
  socket.value.emit('chat:join', {
    conversation_id: Number(conversationId),
  })
  joinedConversationId.value = Number(conversationId)
}

const connectChatSocket = () => {
  if (socket.value) return

  const client = createChatSocket()
  if (!client) return

  socket.value = client

  handleSocketConnect = () => {
    if (!pageAlive.value) return
    if (currentConversation.value?.id) {
      joinConversationRoom(currentConversation.value.id)
    }
    void fetchConversations()
  }

  handleSocketMessageNew = async (payload) => {
    if (!pageAlive.value) return
    const conversationId = Number(payload?.conversation_id || 0)
    const incomingMessage = payload?.message
    if (!conversationId || !incomingMessage) return

    updateConversationFromMessage(conversationId, incomingMessage)

    if (Number(currentConversation.value?.id || 0) === conversationId) {
      await appendMessage(incomingMessage)

      if (!isOwnMessage(incomingMessage)) {
        void serviceChatApi.markAsRead(conversationId)
        upsertConversation({
          ...(currentConversation.value || {}),
          id: conversationId,
          unread_count: 0,
        })
      }
    }
  }

  handleSocketConversationUpdated = (payload) => {
    if (!pageAlive.value) return
    const incomingConversation = payload?.conversation
    if (!incomingConversation?.id) return

    const exists = conversations.value.some(
      (item) => Number(item.id) === Number(incomingConversation.id),
    )
    if (!exists) {
      void fetchConversations()
      return
    }

    upsertConversation(incomingConversation)
  }

  handleSocketMessageRead = (payload) => {
    if (!pageAlive.value) return
    const conversationId = Number(payload?.conversation_id || 0)
    if (!conversationId || Number(currentConversation.value?.id || 0) !== conversationId) {
      return
    }

    messages.value = messages.value.map((item) =>
      item.sender_type === 'service' ? { ...item, is_read: true } : item,
    )
  }

  handleSocketConnectError = (error) => {
    console.error('客服聊天 Socket 连接失败:', error)
  }

  client.on('connect', handleSocketConnect)
  client.on('chat:message:new', handleSocketMessageNew)
  client.on('chat:conversation:updated', handleSocketConversationUpdated)
  client.on('chat:message:read', handleSocketMessageRead)
  client.on('connect_error', handleSocketConnectError)
}

const disconnectChatSocket = () => {
  leaveConversationRoom()
  if (!socket.value) return
  if (handleSocketConnect) {
    socket.value.off('connect', handleSocketConnect)
  }
  if (handleSocketMessageNew) {
    socket.value.off('chat:message:new', handleSocketMessageNew)
  }
  if (handleSocketConversationUpdated) {
    socket.value.off('chat:conversation:updated', handleSocketConversationUpdated)
  }
  if (handleSocketMessageRead) {
    socket.value.off('chat:message:read', handleSocketMessageRead)
  }
  if (handleSocketConnectError) {
    socket.value.off('connect_error', handleSocketConnectError)
  }
  socket.value = null
  handleSocketConnect = null
  handleSocketMessageNew = null
  handleSocketConversationUpdated = null
  handleSocketMessageRead = null
  handleSocketConnectError = null
}

onMounted(async () => {
  pageAlive.value = true
  connectChatSocket()
  await fetchConversations()
  await openConversationById(route.query.conversationId)
})

onBeforeUnmount(() => {
  pageAlive.value = false
  conversationRequestToken += 1
  disconnectChatSocket()
})

watch(
  () => route.query.conversationId,
  async (value) => {
    const conversationId = Number(value || 0)
    if (!conversationId || currentConversation.value?.id === conversationId) return
    await openConversationById(conversationId)
  },
)

watch(
  () => currentConversation.value?.id,
  (value) => {
    if (value) {
      joinConversationRoom(Number(value))
      orderDrawer.data = null
    } else {
      leaveConversationRoom()
      closeImagePreview()
      orderDrawer.data = null
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
  flex-wrap: wrap;
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

.pending-ticket-shortcut {
  margin-left: 4px;
}

.pending-ticket-shortcut__badge {
  margin-left: 6px;
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

.message-item.system {
  justify-content: center;
}

.message-item.own {
  justify-content: flex-end;
}

.system-message {
  max-width: 80%;
  padding: 10px 16px;
  border-radius: 999px;
  background: #eef4ff;
  color: #3f5f97;
  font-size: 13px;
  line-height: 1.6;
  text-align: center;
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

.pending-ticket-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 16px;
  border-radius: 14px;
  background: #f6f8fb;
  border: 1px solid #e4eaf2;
}

.pending-ticket-copy {
  display: flex;
  align-items: center;
  gap: 14px;
}

.pending-ticket-count {
  min-width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #fff;
  box-shadow: inset 0 0 0 1px #e4eaf2;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  font-weight: 700;
  color: #24364b;
}

.pending-ticket-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ticket-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ticket-info {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.ticket-meta {
  margin: 0;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  color: #6b7280;
  font-size: 13px;
}

.section {
  margin-top: 20px;
}

.section h4 {
  margin: 0 0 12px;
  color: #303133;
}

.action-section {
  padding-top: 4px;
}

.linked-order-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.order-item-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 14px;
  border-radius: 12px;
  border: 1px solid #e8edf5;
  background: #fff;
}

.order-photo-grid {
  margin-top: 20px;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.order-photo-card {
  border: 1px solid #e8edf5;
  border-radius: 14px;
  padding: 14px;
  background: #fff;
}

.order-photo-label {
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  color: #4b5563;
}

.order-proof-image {
  width: 100%;
  height: 220px;
  border-radius: 12px;
  overflow: hidden;
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
