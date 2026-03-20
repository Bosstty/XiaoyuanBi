<template>
  <el-card class="chart-card alert-card" shadow="never" v-if="alerts.length > 0">
    <template #header>
      <div class="chart-header">
        <div class="chart-title-group">
          <h3>
            <el-icon class="alert-icon"><Warning /></el-icon>
            异常订单预警
          </h3>
          <span class="chart-subtitle">共 {{ alertSummary.count || 0 }} 个订单超时未完成</span>
        </div>
        <div class="alert-header-actions">
          <div class="alert-inline-toolbar">
            <el-input
              v-model="keyword"
              placeholder="搜索订单号、标题、联系人"
              clearable
              class="alert-search-input"
              @input="handleKeywordChange"
            />
            <div class="alert-inline-pager">
              <el-button circle size="small" @click="prevPage">
                <span class="pager-arrow">‹</span>
              </el-button>
              <span class="pager-text">{{ pagination.currentPage }} / {{ pageCount }}</span>
              <el-button circle size="small" @click="nextPage">
                <span class="pager-arrow">›</span>
              </el-button>
            </div>
          </div>
          <el-tag class="alert-risk-tag" size="small" effect="dark" round>
            {{ alertSummary.level === 'high' ? '高风险' : '中风险' }}
          </el-tag>
        </div>
      </div>
    </template>

    <el-table
      :data="pageData"
      size="small"
      style="width: 100%"
      stripe
      class="alert-table"
      @row-click="openOrderDetail"
    >
      <el-table-column prop="order_no" label="订单号" width="200" />
      <el-table-column prop="title" label="标题" />
      <el-table-column label="类型" align="center" width="100">
        <template #default="{ row }">
          <el-tag :type="getOrderTypeTag(row.type)" size="small" effect="light" round>
            {{ formatOrderType(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态" align="center" width="90">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)" size="small" effect="light" round>
            {{ formatStatus(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="price" label="金额" align="center" width="90">
        <template #default="{ row }">
          <span class="price">{{ formatMoney(row.price) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="用户" align="center" width="100">
        <template #default="{ row }">{{ row.user?.username }}</template>
      </el-table-column>
      <el-table-column label="配送员" align="center" width="100">
        <template #default="{ row }">{{ row.deliverer?.username || '未分配' }}</template>
      </el-table-column>
      <el-table-column label="预计送达" align="center" width="170">
        <template #default="{ row }">
          <span class="time-text">{{ formatDate(row.delivery_time) }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="alert-footer" v-if="orders.length > 0">
      <span>单击任意一条异常订单可打开详情抽屉并继续处理</span>
      <el-pagination
        v-model:current-page="pagination.currentPage"
        v-model:page-size="pagination.pageSize"
        :total="filteredOrders.length"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes"
        background
        small
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>
  </el-card>

  <el-drawer v-model="detailVisible" size="34%" class="abnormal-order-drawer" destroy-on-close>
    <template #header>
      <div class="drawer-header">
        <div class="drawer-title-block">
          <div class="drawer-kicker">Order Workbench</div>
          <h3>{{ selectedOrder?.title || '异常订单详情' }}</h3>
          <p>{{ selectedOrder?.order_no || '正在加载订单信息' }}</p>
        </div>
        <el-tag class="alert-risk-tag" size="small" effect="dark" round>
          {{ selectedOrder ? formatStatus(selectedOrder.status) : '处理中' }}
        </el-tag>
      </div>
    </template>

    <div v-loading="detailLoading" class="detail-drawer-body">
      <template v-if="selectedOrder">
        <div class="detail-overview-grid">
          <div class="detail-overview-card">
            <span>订单金额</span>
            <strong>{{ formatMoney(selectedOrder.price) }}</strong>
            <em v-if="parseFloat(selectedOrder.tip) > 0"
              >小费 {{ formatMoney(selectedOrder.tip) }}</em
            >
          </div>
          <div class="detail-overview-card">
            <span>预计送达</span>
            <strong>{{ formatDate(selectedOrder.delivery_time) }}</strong>
            <em>超时 {{ getOverdueText(selectedOrder.delivery_time) }}</em>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">订单信息</div>
          <div class="detail-info-grid">
            <div class="detail-info-item">
              <label>订单号</label>
              <span>{{ selectedOrder.order_no }}</span>
            </div>
            <div class="detail-info-item">
              <label>订单类型</label>
              <span>{{ formatOrderType(selectedOrder.type) }}</span>
            </div>
            <div class="detail-info-item">
              <label>当前状态</label>
              <span>{{ formatStatus(selectedOrder.status) }}</span>
            </div>
            <div class="detail-info-item">
              <label>支付状态</label>
              <span>{{ selectedOrder.payment_status || '-' }}</span>
            </div>
            <div class="detail-info-item detail-info-item-wide">
              <label>取件地址</label>
              <span>{{ selectedOrder.pickup_location || '-' }}</span>
            </div>
            <div class="detail-info-item detail-info-item-wide">
              <label>送达地址</label>
              <span>{{ selectedOrder.delivery_location || '-' }}</span>
            </div>
            <div class="detail-info-item detail-info-item-wide">
              <label>备注信息</label>
              <span>{{ selectedOrder.notes || selectedOrder.description || '暂无备注' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">相关人员</div>
          <div class="detail-person-stack">
            <div class="detail-person-card">
              <span class="detail-person-role">下单用户</span>
              <strong>{{ selectedOrder.user?.username || `用户${selectedOrder.user_id}` }}</strong>
              <span>{{ selectedOrder.user?.phone || selectedOrder.contact_phone || '-' }}</span>
            </div>
            <div class="detail-person-card">
              <span class="detail-person-role">配送员</span>
              <strong>{{
                selectedOrder.deliverer?.username ||
                (selectedOrder.deliverer_id ? `ID:${selectedOrder.deliverer_id}` : '暂未分配')
              }}</strong>
              <span>{{ selectedOrder.deliverer?.phone || '-' }}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-section-title">建议处理方式</div>
          <div class="detail-action-list">
            <div v-for="item in suggestedActions" :key="item.title" class="detail-action-item">
              <strong>{{ item.title }}</strong>
              <span>{{ item.desc }}</span>
            </div>
          </div>
        </div>

        <div class="detail-drawer-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
          <el-button type="primary" @click="goToOrderDetail(selectedOrder.id)"
            >前往订单详情处理</el-button
          >
        </div>
      </template>
    </div>
  </el-drawer>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Warning } from '@element-plus/icons-vue'
import { orderManagementApi } from '@/api'

const props = defineProps({
  alerts: {
    type: Array,
    default: () => [],
  },
  orders: {
    type: Array,
    default: () => [],
  },
})

const router = useRouter()
const keyword = ref('')
const pagination = reactive({
  currentPage: 1,
  pageSize: 10,
})
const detailVisible = ref(false)
const detailLoading = ref(false)
const selectedOrder = ref(null)

const alertSummary = computed(() => props.alerts[0] || {})
const filteredOrders = computed(() => {
  const value = keyword.value.trim().toLowerCase()
  if (!value) return props.orders

  return props.orders.filter((item) => {
    const fields = [
      item.order_no,
      item.title,
      item.contact_name,
      item.contact_phone,
      item.user?.username,
      item.deliverer?.username,
    ]
    return fields.some((field) =>
      String(field || '')
        .toLowerCase()
        .includes(value),
    )
  })
})
const pageCount = computed(() =>
  Math.max(1, Math.ceil(filteredOrders.value.length / pagination.pageSize)),
)
const pageData = computed(() => {
  const start = (pagination.currentPage - 1) * pagination.pageSize
  return filteredOrders.value.slice(start, start + pagination.pageSize)
})
const suggestedActions = computed(() => {
  const order = selectedOrder.value
  if (!order) return []

  const actions = [
    {
      title: '核查履约状态',
      desc: `当前状态为${formatStatus(order.status)}，优先确认订单是否卡在异常节点。`,
    },
  ]

  if (order.deliverer_id || order.deliverer) {
    actions.push({
      title: '联系配送员',
      desc: '确认当前位置、履约进度和是否需要改派。',
    })
  } else {
    actions.push({
      title: '检查分配情况',
      desc: '订单可能未及时分配，建议优先检查运力并尽快指派。',
    })
  }

  actions.push({
    title: '同步用户预期',
    desc: '必要时联系下单用户，说明延迟原因并确认是否继续履约。',
  })

  return actions
})

watch(
  () => props.orders,
  () => {
    pagination.currentPage = 1
  },
)

const formatOrderType = (type) => {
  const map = { express: '快递', food: '外卖', medicine: '药品', daily: '日用' }
  return map[type] || type
}

const formatStatus = (status) => {
  const map = {
    pending: '待接单',
    accepted: '已接单',
    picking: '取件中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[status] || status
}

const formatDate = (value) => (value ? new Date(value).toLocaleString('zh-CN') : '-')
const formatMoney = (amount) => `¥${(parseFloat(amount) || 0).toFixed(2)}`

const getOrderTypeTag = (type) => {
  const map = { express: 'primary', food: 'warning', medicine: 'danger', daily: 'success' }
  return map[type] || 'info'
}

const getStatusTagType = (status) => {
  const map = {
    pending: 'warning',
    accepted: 'primary',
    picking: 'info',
    delivering: 'success',
    completed: 'success',
    cancelled: 'danger',
  }
  return map[status] || 'info'
}

const getOverdueText = (deliveryTime) => {
  if (!deliveryTime) return '-'
  const diff = Date.now() - new Date(deliveryTime).getTime()
  if (diff <= 0) return '未超时'

  const minutes = Math.floor(diff / (1000 * 60))
  const days = Math.floor(minutes / (60 * 24))
  const hours = Math.floor((minutes % (60 * 24)) / 60)
  const mins = minutes % 60

  if (days > 0) return `${days}天${hours}小时`
  if (hours > 0) return `${hours}小时${mins}分钟`
  return `${mins}分钟`
}

const handleKeywordChange = () => {
  pagination.currentPage = 1
}

const handlePageChange = (page) => {
  pagination.currentPage = page
}

const handleSizeChange = (size) => {
  pagination.pageSize = size
  pagination.currentPage = 1
}

const prevPage = () => {
  if (pagination.currentPage > 1) pagination.currentPage -= 1
}

const nextPage = () => {
  if (pagination.currentPage < pageCount.value) pagination.currentPage += 1
}

const openOrderDetail = async (row) => {
  detailVisible.value = true
  detailLoading.value = true
  selectedOrder.value = row

  try {
    const res = await orderManagementApi.getOrderById(row.id)
    if (res.success && res.data) selectedOrder.value = res.data
  } catch {
    ElMessage.warning('订单详情获取失败，已展示预警列表中的基础信息')
  } finally {
    detailLoading.value = false
  }
}

const goToOrderDetail = (id) => {
  detailVisible.value = false
  router.push({ name: 'order-detail', params: { id } })
}
</script>

<style scoped>
.chart-header,
.alert-header-actions,
.alert-inline-toolbar,
.drawer-header,
.detail-person-stack,
.detail-drawer-footer,
.alert-footer {
  display: flex;
}

.chart-header,
.alert-header-actions,
.detail-drawer-footer,
.alert-footer {
  justify-content: space-between;
  align-items: center;
}

.chart-title-group,
.drawer-title-block,
.detail-action-list,
.detail-overview-card,
.detail-info-item,
.detail-person-card {
  display: flex;
  flex-direction: column;
}

.chart-title-group {
  gap: 2px;
}

.chart-title-group h3 {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.chart-subtitle {
  font-size: 0.78rem;
  color: var(--text-tertiary);
}

.alert-card {
  --el-card-border-color: rgba(99, 102, 241, 0.28);
  --el-card-border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.28);
  box-shadow: none !important;
  background: #fff;
}

.alert-card :deep(.el-card__header) {
  border-bottom-color: rgba(99, 102, 241, 0.16);
}

.alert-card :deep(.el-card__body) {
  background: #fff;
  box-shadow: none !important;
}

.alert-icon {
  color: #6366f1;
  vertical-align: middle;
  margin-right: 6px;
}

.alert-risk-tag {
  --el-tag-bg-color: #6366f1;
  --el-tag-border-color: #6366f1;
  --el-tag-text-color: #fff;
}

.alert-header-actions,
.alert-inline-toolbar {
  gap: 12px;
}

.alert-search-input {
  width: 220px;
}

.alert-inline-pager {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 2px 4px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.18);
}

.pager-text,
.pager-arrow {
  color: #6366f1;
  font-weight: 600;
}

.alert-table {
  cursor: pointer;
}

.alert-table :deep(.el-table__row:hover > td.el-table__cell) {
  background: rgba(238, 242, 255, 0.55);
}

.price,
.time-text {
  font-family: 'Fira Code', monospace;
}

.price {
  font-weight: 600;
  color: #4338ca;
}

.time-text {
  color: #64748b;
  font-size: 12px;
}

.alert-footer {
  padding: 12px 20px;
  font-size: 0.82rem;
  color: var(--text-tertiary);
  border-top: 1px solid var(--border-color);
}

.abnormal-order-drawer :deep(.el-drawer__header) {
  margin-bottom: 0 !important;
  padding: 20px 24px 10px;
}

.abnormal-order-drawer :deep(.el-drawer__body) {
  padding: 8px 24px 24px;
}

.drawer-header {
  align-items: flex-start;
  gap: 16px;
}

.drawer-title-block {
  gap: 4px;
}

.drawer-kicker {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #6366f1;
}

.drawer-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}

.drawer-header p {
  margin: 6px 0 0;
  font-size: 0.82rem;
  color: var(--text-secondary);
}

.detail-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-overview-grid,
.detail-info-grid {
  display: grid;
  gap: 12px;
}

.detail-overview-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-overview-card,
.detail-section,
.detail-person-card {
  padding: 16px;
  border-radius: 18px;
  border: 1px solid rgba(99, 102, 241, 0.12);
  background: #fff;
}

.detail-overview-card span,
.detail-info-item label,
.detail-person-role {
  font-size: 0.74rem;
  color: #7c8aa5;
  letter-spacing: 0.04em;
  font-weight: 600;
}

.detail-overview-card strong,
.detail-person-card strong {
  margin-top: 6px;
  color: #4338ca;
  font-size: 1.15rem;
}

.detail-overview-card em,
.detail-action-item span,
.detail-info-item span,
.detail-person-card span:last-child {
  margin-top: 6px;
  color: #24324a;
  font-style: normal;
}

.detail-section-title {
  margin-bottom: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--text-primary);
}

.detail-info-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.detail-info-item {
  padding: 12px 14px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.08);
}

.detail-info-item span {
  font-size: 1rem;
  line-height: 1.5;
  font-weight: 600;
  color: #1e293b;
  word-break: break-word;
}

.detail-info-item-wide {
  grid-column: 1 / -1;
}

.detail-person-stack,
.detail-action-list {
  gap: 12px;
}

.detail-action-item {
  padding: 14px 16px;
  border-radius: 16px;
  background: #fff;
  border: 1px solid rgba(99, 102, 241, 0.12);
}

@media (max-width: 1200px) {
  .alert-header-actions,
  .alert-inline-toolbar,
  .chart-header,
  .alert-footer,
  .detail-drawer-footer {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-overview-grid,
  .detail-info-grid {
    grid-template-columns: 1fr;
  }

  .alert-search-input {
    width: 100%;
  }
}
</style>
