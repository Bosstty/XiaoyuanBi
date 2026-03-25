<template>
  <div class="order-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">
          <h1>订单详情</h1>
          <span class="order-no">{{ order.order_no }}</span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="primary" @click="editStatus">修改状态</el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <!-- 订单概览卡片 -->
      <el-card class="summary-card">
        <div class="order-summary">
          <div class="summary-left">
            <div class="order-type-icon" :class="order.type">
              <el-icon><component :is="getTypeIcon(order.type)" /></el-icon>
            </div>
            <div class="order-info">
              <h2>{{ order.title }}</h2>
              <div class="order-tags">
                <el-tag :type="getTypeTagType(order.type)" effect="light">{{
                  getTypeText(order.type)
                }}</el-tag>
                <el-tag v-if="order.urgent" type="danger" effect="dark">加急</el-tag>
                <el-tag v-if="order.fragile" type="warning" effect="dark">易碎</el-tag>
                <el-tag :type="getPaymentStatusTagType(order.payment_status)" effect="light">{{
                  getPaymentStatusText(order.payment_status)
                }}</el-tag>
              </div>
            </div>
          </div>
          <div class="summary-right">
            <div class="price-display">
              <span class="price-label">订单金额</span>
              <span class="price-value">¥{{ order.price }}</span>
              <span v-if="order.tip > 0" class="tip-value">+小费 ¥{{ order.tip }}</span>
            </div>
            <div class="status-display">
              <el-tag size="large" :type="getStatusTagType(order.status)" effect="dark">
                {{ getStatusText(order.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </el-card>

      <!-- 标签页内容 -->
      <el-tabs v-model="activeTab" class="detail-tabs">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="info">
          <el-card class="info-card">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="订单号">
                <span class="order-no">{{ order.order_no }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="取件码">
                <span class="pickup-code">{{ order.pickup_code || '无' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="联系人">{{ order.contact_name }}</el-descriptions-item>
              <el-descriptions-item label="联系电话">
                <span class="phone">{{ order.contact_phone }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="取件地点" :span="2">
                <div class="location-item">
                  <el-icon><Location /></el-icon>
                  {{ order.pickup_location }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="配送地点" :span="2">
                <div class="location-item">
                  <el-icon><House /></el-icon>
                  {{ order.delivery_location }}
                </div>
              </el-descriptions-item>
              <el-descriptions-item label="物品重量">
                {{ order.weight ? `${order.weight}kg` : '未称重' }}
              </el-descriptions-item>
              <el-descriptions-item label="物品尺寸">
                {{ order.size || '未测量' }}
              </el-descriptions-item>
              <el-descriptions-item label="备注信息" :span="2">
                {{ order.notes || '无' }}
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">{{
                formatDateTime(order.createdAt)
              }}</el-descriptions-item>
              <el-descriptions-item label="更新时间">{{
                formatDateTime(order.updatedAt)
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 订单描述 -->
          <el-card class="description-card">
            <template #header>
              <span>详细描述</span>
            </template>
            <div class="description-content">
              {{ order.description || '暂无详细描述' }}
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 状态跟踪 -->
        <el-tab-pane label="状态跟踪" name="timeline">
          <el-card class="timeline-card">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in timeline"
                :key="index"
                :timestamp="formatDateTime(item.timestamp)"
                :type="getTimelineType(item.status)"
                :hollow="index === timeline.length - 1"
              >
                <div class="timeline-content">
                  <div class="timeline-title">{{ item.title }}</div>
                  <div class="timeline-desc">{{ item.description }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </el-card>
        </el-tab-pane>

        <!-- 相关人员 -->
        <el-tab-pane label="相关人员" name="people">
          <el-row :gutter="16">
            <!-- 用户信息 -->
            <el-col :span="12">
              <el-card class="person-card">
                <template #header>
                  <div class="person-header">
                    <el-icon><User /></el-icon>
                    <span>下单用户</span>
                  </div>
                </template>
                <div class="person-info">
                  <el-avatar :size="64" :src="order.user?.avatar">
                    {{ order.user?.username?.charAt(0) }}
                  </el-avatar>
                  <div class="person-details">
                    <div class="person-name">{{ order.user?.real_name }}</div>
                    <div class="person-meta">
                      <span
                        ><el-icon><School /></el-icon>
                        {{ order.user?.student_id || '未填写' }}</span
                      >
                      <span
                        ><el-icon><Phone /></el-icon> {{ order.user?.phone }}</span
                      >
                    </div>
                  </div>
                </div>
              </el-card>
            </el-col>

            <!-- 配送员信息 -->
            <el-col :span="12" v-if="order.delivererInfo">
              <el-card class="person-card">
                <template #header>
                  <div class="person-header">
                    <el-icon><Van /></el-icon>
                    <span>配送员</span>
                  </div>
                </template>
                <div class="person-info">
                  <el-avatar :size="64" :src="order.delivererInfo?.avatar">
                    {{ order.delivererInfo?.real_name?.charAt(0) }}
                  </el-avatar>
                  <div class="person-details">
                    <div class="person-name">{{ order.delivererInfo?.real_name }}</div>
                    <div class="person-meta">
                      <span
                        ><el-icon><Phone /></el-icon> {{ order.delivererInfo?.phone }}</span
                      >
                      <span>
                        <el-rate
                          :model-value="parseFloat(order.delivererInfo?.rating || 5)"
                          disabled
                          size="small"
                        />
                      </span>
                    </div>
                  </div>
                </div>
                <el-button type="primary" text @click="contactDeliverer">
                  联系配送员
                </el-button>
              </el-card>
            </el-col>
          </el-row>

          <!-- 评价信息 -->
          <el-card class="rating-card" v-if="order.rating || order.rating_comment">
            <template #header>
              <span>用户评价</span>
            </template>
            <div class="rating-content">
              <el-rate
                :model-value="parseFloat(order.rating || 0)"
                disabled
                show-score
                text-color="#ff9900"
              />
              <p class="rating-comment" v-if="order.rating_comment">{{ order.rating_comment }}</p>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 操作管理 -->
        <el-tab-pane label="操作管理" name="actions">
          <el-card class="actions-card">
            <template #header>
              <span>快速操作</span>
            </template>
            <div class="action-grid">
              <div class="action-item">
                <el-button
                  type="success"
                  size="large"
                  @click="completeOrder"
                  :disabled="order.status === 'completed'"
                >
                  <el-icon><CircleCheck /></el-icon>
                  标记完成
                </el-button>
                <p>确认订单已完成配送</p>
              </div>
              <div class="action-item">
                <el-button
                  type="warning"
                  size="large"
                  @click="cancelOrder"
                  :disabled="order.status === 'completed' || order.status === 'cancelled'"
                >
                  <el-icon><CircleClose /></el-icon>
                  取消订单
                </el-button>
                <p>取消当前订单</p>
              </div>
              <div class="action-item">
                <el-button size="large" @click="editStatus">
                  <el-icon><Edit /></el-icon>
                  修改状态
                </el-button>
                <p>手动修改订单状态</p>
              </div>
              <div class="action-item">
                <el-button size="large" @click="contactUser">
                  <el-icon><Message /></el-icon>
                  联系用户
                </el-button>
                <p>联系订单用户</p>
              </div>
            </div>
          </el-card>

          <!-- 取消原因 -->
          <el-card class="cancel-card" v-if="order.cancel_reason">
            <template #header>
              <span>取消信息</span>
            </template>
            <div class="cancel-content">
              <div class="cancel-reason">
                <el-icon><Warning /></el-icon>
                {{ order.cancel_reason }}
              </div>
              <div class="cancel-time" v-if="order.cancel_time">
                取消时间: {{ formatDateTime(order.cancel_time) }}
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 状态编辑对话框 -->
    <el-dialog v-model="statusDialog.visible" title="修改订单状态" width="500px">
      <el-form :model="statusDialog.form" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="getStatusTagType(order.status)">{{ getStatusText(order.status) }}</el-tag>
        </el-form-item>
        <el-form-item label="新状态" required>
          <el-select
            v-model="statusDialog.form.newStatus"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="配送中" value="delivering" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="statusDialog.form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入状态修改原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="updateStatus" :loading="statusDialog.loading"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Location,
  House,
  User,
  School,
  Phone,
  Van,
  CircleCheck,
  CircleClose,
  Edit,
  Message,
  Warning,
  Box,
  Food,
  FirstAidKit,
  Shop,
} from '@element-plus/icons-vue'
import { orderManagementApi, serviceChatApi } from '@/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const order = ref({})
const timeline = ref([])
const activeTab = ref('info')

const statusDialog = reactive({
  visible: false,
  loading: false,
  form: {
    orderId: null,
    newStatus: '',
    remark: '',
  },
})

// 类型图标映射
const typeIconMap = {
  express: markRaw(Box),
  food: markRaw(Food),
  medicine: markRaw(FirstAidKit),
  daily: markRaw(Shop),
}

const getTypeIcon = (type) => {
  return typeIconMap[type] || markRaw(Box)
}

// 方法
const fetchOrderDetail = async () => {
  loading.value = true
  try {
    const response = await orderManagementApi.getOrderById(route.params.id)
    if (response.success) {
      order.value = response.data
      // 生成时间线数据
      timeline.value = [
        {
          timestamp: order.value.createdAt,
          status: 'created',
          title: '订单创建',
          description: '用户创建了订单',
        },
      ]

      // 添加接单时间线
      if (order.value.accept_time) {
        timeline.value.push({
          timestamp: order.value.accept_time,
          status: 'accepted',
          title: '已接单',
          description: '配送员已接单',
        })
      }

      // 添加取货完成时间线
      if (order.value.pickup_complete_time) {
        timeline.value.push({
          timestamp: order.value.pickup_complete_time,
          status: 'picking_up',
          title: '取货完成',
          description: '已取到货物',
        })
      }

      // 添加配送完成时间线
      if (order.value.delivery_complete_time) {
        timeline.value.push({
          timestamp: order.value.delivery_complete_time,
          status: 'completed',
          title: '配送完成',
          description: '货物已送达',
        })
      }

      // 添加取消时间线
      if (order.value.cancel_time) {
        timeline.value.push({
          timestamp: order.value.cancel_time,
          status: 'cancelled',
          title: '订单取消',
          description: order.value.cancel_reason || '用户取消了订单',
        })
      }

      // 添加当前状态
      timeline.value.push({
        timestamp: order.value.updatedAt,
        status: order.value.status,
        title: getStatusText(order.value.status),
        description: `订单状态: ${getStatusText(order.value.status)}`,
      })
    }
  } catch (error) {
    ElMessage.error('获取订单详情失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/orders')
}

const refreshData = () => {
  fetchOrderDetail()
}

const editStatus = () => {
  statusDialog.form.orderId = order.value.id
  statusDialog.form.newStatus = ''
  statusDialog.form.remark = ''
  statusDialog.visible = true
}

const updateStatus = async () => {
  if (!statusDialog.form.newStatus) {
    ElMessage.warning('请选择新状态')
    return
  }

  statusDialog.loading = true
  try {
    const response = await orderManagementApi.updateOrderStatus(
      statusDialog.form.orderId,
      statusDialog.form.newStatus,
    )

    if (response.success) {
      ElMessage.success('订单状态更新成功')
      statusDialog.visible = false
      fetchOrderDetail()
    }
  } catch (error) {
    ElMessage.error('更新订单状态失败: ' + error.message)
  } finally {
    statusDialog.loading = false
  }
}

const completeOrder = async () => {
  try {
    await ElMessageBox.confirm('确定要标记订单为已完成吗？', '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info',
    })

    const response = await orderManagementApi.updateOrderStatus(order.value.id, 'completed')
    if (response.success) {
      ElMessage.success('订单已标记为完成')
      fetchOrderDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + error.message)
    }
  }
}

const cancelOrder = async () => {
  try {
    await ElMessageBox.confirm('确定要取消此订单吗？', '确认取消', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await orderManagementApi.updateOrderStatus(order.value.id, 'cancelled')
    if (response.success) {
      ElMessage.success('订单已取消')
      fetchOrderDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消订单失败: ' + error.message)
    }
  }
}

const contactUser = async () => {
  const targetUserId = Number(order.value?.user?.id || order.value?.user_id || 0)
  if (!targetUserId) {
    ElMessage.warning('未找到用户信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      user_id: targetUserId,
      order_id: order.value?.id,
      initial_message: `您好，这里是平台客服，关于订单「${order.value?.title || order.value?.order_no || ''}」需要和您沟通。`,
    })

    if (!response.success || !response.data?.id) {
      throw new Error(response.message || '创建会话失败')
    }

    router.push({
      path: '/service/chat',
      query: { conversationId: String(response.data.id) },
    })
  } catch (error) {
    ElMessage.error('联系用户失败: ' + error.message)
  }
}

const contactDeliverer = async () => {
  const targetDelivererId = Number(order.value?.delivererInfo?.id || order.value?.deliverer_id || 0)
  if (!targetDelivererId) {
    ElMessage.warning('未找到配送员信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      deliverer_id: targetDelivererId,
      order_id: order.value?.id,
      initial_message: `您好，这里是平台客服，关于订单「${order.value?.title || order.value?.order_no || ''}」需要和您沟通。`,
    })

    if (!response.success || !response.data?.id) {
      throw new Error(response.message || '创建会话失败')
    }

    router.push({
      path: '/service/chat',
      query: { conversationId: String(response.data.id) },
    })
  } catch (error) {
    ElMessage.error('联系配送员失败: ' + error.message)
  }
}

// 辅助函数
const getTypeText = (type) => {
  const typeMap = {
    express: '快递代取',
    food: '外卖代取',
    medicine: '药品代购',
    daily: '生活用品',
  }
  return typeMap[type] || type
}

const getTypeTagType = (type) => {
  const typeMap = {
    express: '',
    food: 'success',
    medicine: 'warning',
    daily: 'info',
  }
  return typeMap[type] || ''
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待接单',
    accepted: '已接单',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    accepted: 'info',
    delivering: '',
    completed: 'success',
    cancelled: 'danger',
  }
  return statusMap[status] || ''
}

const getPaymentStatusText = (status) => {
  const statusMap = {
    unpaid: '未支付',
    paid: '已支付',
    refunded: '已退款',
  }
  return statusMap[status] || status
}

const getPaymentStatusTagType = (status) => {
  const statusMap = {
    unpaid: 'danger',
    paid: 'success',
    refunded: 'info',
  }
  return statusMap[status] || ''
}

const getTimelineType = (status) => {
  const typeMap = {
    created: 'primary',
    accepted: 'success',
    delivering: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return typeMap[status] || 'primary'
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 生命周期
onMounted(() => {
  fetchOrderDetail()
})
</script>

<style scoped>
.order-detail {
  padding: 20px;
}

.detail-content {
  margin-top: 20px;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-title h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.header-title .order-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--primary);
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 订单概览卡片 */
.summary-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
}

.order-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.order-type-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.order-type-icon.express {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.order-type-icon.food {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.order-type-icon.medicine {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.order-type-icon.daily {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
}

.order-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.order-tags {
  display: flex;
  gap: 8px;
}

.summary-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.price-display {
  text-align: right;
}

.price-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.price-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

.tip-value {
  display: block;
  font-size: 0.9rem;
  color: var(--accent-warning);
  font-family: 'Fira Code', monospace;
}

.status-display {
  display: flex;
  justify-content: flex-end;
}

/* 标签页 */
.detail-tabs {
  margin-top: 20px;
}

.detail-tabs :deep(.el-tabs__header) {
  margin-bottom: 20px;
}

.detail-tabs :deep(.el-tabs__item) {
  font-size: 1rem;
  padding: 0 20px;
}

/* 概览卡片样式 */
.info-card,
.description-card,
.timeline-card,
.person-card,
.rating-card,
.actions-card,
.cancel-card {
  margin-bottom: 16px;
  border-radius: var(--radius-xl);
  box-shadow: none;
}

/* 订单号样式 */
.order-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  color: var(--primary);
}

/* 价格样式 */
.price {
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
  font-size: 1rem;
}

.tip {
  margin-left: 8px;
  font-size: 0.85rem;
  color: var(--accent-warning);
  font-family: 'Fira Code', monospace;
}

/* 取件码 */
.pickup-code {
  font-family: 'Fira Code', monospace;
  font-weight: 600;
  color: var(--primary);
}

/* 电话 */
.phone {
  font-family: 'Fira Code', monospace;
}

/* 地点 */
.location-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
}

.location-item .el-icon {
  color: var(--primary);
}

/* 描述内容 */
.description-content {
  padding: 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-lg);
  line-height: 1.7;
  color: var(--text-secondary);
}

/* 时间线 */
.timeline-content {
  padding-left: 8px;
}

.timeline-title {
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--text-primary);
}

.timeline-desc {
  color: var(--text-secondary);
  font-size: 0.85rem;
}

/* 人员卡片 */
.person-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.person-header .el-icon {
  color: var(--primary);
}

.person-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.person-info .el-avatar {
  color: white;
}

.person-details {
  flex: 1;
}

.person-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.person-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.person-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
}

/* 评价 */
.rating-content {
  padding: 8px 0;
}

.rating-content .el-rate {
  margin-bottom: 12px;
}

.rating-comment {
  color: var(--text-primary);
  line-height: 1.6;
  margin: 0;
  padding: 12px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-lg);
}

/* 操作网格 */
.action-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.action-item {
  text-align: center;
}

.action-item .el-button {
  width: 100%;
  height: 60px;
  font-size: 1rem;
}

.action-item .el-button .el-icon {
  margin-right: 8px;
}

.action-item p {
  margin: 8px 0 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 取消信息 */
.cancel-content {
  padding: 8px 0;
}

.cancel-reason {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: rgba(239, 68, 68, 0.1);
  border-radius: var(--radius-lg);
  color: var(--accent-danger);
  font-weight: 500;
}

.cancel-time {
  margin-top: 12px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .order-summary {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }

  .summary-right {
    align-items: flex-start;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .el-col-12 {
    width: 100%;
  }
}
</style>
