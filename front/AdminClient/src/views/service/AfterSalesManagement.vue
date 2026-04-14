<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="售后管理"
      subtitle="处理用户提交的工单、投诉及退款申请"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出工单"
      @change="handleDateRangeChange"
      @action="handleExport"
    />

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon total">
            <el-icon><Tickets /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">工单总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon warning">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pending }}</div>
            <div class="stat-label">待处理</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon danger">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.processing }}</div>
            <div class="stat-label">处理中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon success">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.resolved }}</div>
            <div class="stat-label">已解决</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选卡片 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline class="filter-form">
        <el-form-item label="工单类型">
          <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="全部" value="" />
            <el-option label="投诉" value="complaint" />
            <el-option label="退款" value="refund" />
            <el-option label="争议" value="dispute" />
            <el-option label="建议" value="suggestion" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="优先级">
          <el-select v-model="filters.priority" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="紧急" value="urgent" />
            <el-option label="高" value="high" />
            <el-option label="中" value="medium" />
            <el-option label="低" value="low" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已解决" value="resolved" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 工单列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="ticketList" stripe style="width: 100%">
        <el-table-column prop="ticket_no" label="工单编号" align="center" min-width="180">
          <template #default="{ row }">
            <span class="ticket-no">{{ row.ticket_no }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="工单类型" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTagType(row.type)" size="small">
              {{ getTypeText(row.type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column
          prop="title"
          label="标题"
          align="center"
          show-overflow-tooltip
          min-width="200"
        >
          <template #default="{ row }">
            <span>{{ row.title }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" align="center" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="user" label="提交用户" align="center" width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="row.user?.avatar">
                {{ row.user?.username?.charAt(0) || 'U' }}
              </el-avatar>
              <span>{{ row.user?.username || '-' }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="处理客服" align="center" width="140">
          <template #default="{ row }">
            <el-tag v-if="row.service?.id" type="info" size="small">
              {{ row.service?.name || row.service?.username || `客服#${row.service?.id}` }}
            </el-tag>
            <span v-else class="unassigned-service">未领取</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" align="center" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" align="center" fixed="right" width="180">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row)">
                详情
              </el-button>
              <el-dropdown @command="(cmd) => moderateTicket(cmd, row)">
                <el-button type="primary" size="small" text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="process" v-if="row.status === 'pending'">
                      <el-icon><Clock /></el-icon>
                      开始处理
                    </el-dropdown-item>
                    <el-dropdown-item command="release" v-if="row.status === 'processing' && row.service_id">
                      释放工单
                    </el-dropdown-item>
                    <el-dropdown-item command="edit-type">
                      修改类型
                    </el-dropdown-item>
                    <el-dropdown-item command="resolve">
                      <el-icon><CircleCheck /></el-icon>
                      标记已解决
                    </el-dropdown-item>
                    <el-dropdown-item command="close">
                      <el-icon><Close /></el-icon>
                      关闭工单
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailDrawer.visible" title="工单详情" size="600px">
      <template v-if="detailDrawer.data">
        <!-- 状态头部 -->
        <div class="status-header" :class="detailDrawer.data.status">
          <div class="status-info">
            <el-tag :type="getTypeTagType(detailDrawer.data.type)" size="large">
              {{ getTypeText(detailDrawer.data.type) }}
            </el-tag>
            <el-tag :type="getPriorityTagType(detailDrawer.data.priority)" size="large">
              {{ getPriorityText(detailDrawer.data.priority) }}
            </el-tag>
            <el-tag :type="getStatusTagType(detailDrawer.data.status)" size="large">
              {{ getStatusText(detailDrawer.data.status) }}
            </el-tag>
          </div>
          <h3>{{ detailDrawer.data.title }}</h3>
          <p class="ticket-meta">
            <span>{{ detailDrawer.data.ticket_no }}</span>
            <span>创建于 {{ formatDateTime(detailDrawer.data.created_at) }}</span>
          </p>
        </div>

        <!-- 用户信息 -->
        <div class="section">
          <h4>提交用户</h4>
          <div class="user-card">
            <el-avatar :size="48" :src="detailDrawer.data.user?.avatar">
              {{ detailDrawer.data.user?.username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="info">
              <div class="name">{{ detailDrawer.data.user?.username || '-' }}</div>
              <div class="contact">手机: {{ detailDrawer.data.user?.phone || '-' }}</div>
            </div>
          </div>
          <div class="contact-actions">
            <el-button type="primary" text @click="contactAfterSalesUser(detailDrawer.data)">
              联系用户
            </el-button>
          </div>
        </div>

        <!-- 关联订单 -->
        <div class="section" v-if="detailDrawer.data.order_id">
          <h4>关联订单</h4>
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="订单ID">
              {{ detailDrawer.data.order_id }}
            </el-descriptions-item>
            <el-descriptions-item label="订单编号" v-if="detailDrawer.data.order?.order_no">
              {{ detailDrawer.data.order.order_no }}
            </el-descriptions-item>
            <el-descriptions-item label="订单标题" v-if="detailDrawer.data.order?.title">
              {{ detailDrawer.data.order.title }}
            </el-descriptions-item>
            <el-descriptions-item label="订单状态" v-if="detailDrawer.data.order?.status">
              {{ getOrderStatusText(detailDrawer.data.order.status) }}
            </el-descriptions-item>
            <el-descriptions-item label="支付状态" v-if="detailDrawer.data.order?.payment_status">
              {{ getPaymentStatusText(detailDrawer.data.order.payment_status) }}
            </el-descriptions-item>
            <el-descriptions-item label="结算状态" v-if="detailDrawer.data.order?.settlement_status">
              {{ getSettlementStatusText(detailDrawer.data.order.settlement_status) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="赔付状态"
              v-if="detailDrawer.data.order?.damage_claim_status && detailDrawer.data.order?.damage_claim_status !== 'none'"
            >
              {{ getDamageClaimStatusText(detailDrawer.data.order.damage_claim_status) }}
            </el-descriptions-item>
            <el-descriptions-item label="订单金额" v-if="detailDrawer.data.order">
              ¥{{ formatMoney(detailDrawer.data.order.price) }}
            </el-descriptions-item>
            <el-descriptions-item label="小费" v-if="detailDrawer.data.order">
              ¥{{ formatMoney(detailDrawer.data.order.tip) }}
            </el-descriptions-item>
            <el-descriptions-item label="应付合计" v-if="detailDrawer.data.order">
              ¥{{ formatMoney(getOrderTotalAmount(detailDrawer.data.order)) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="已退款金额"
              v-if="Number(detailDrawer.data.order?.refund_amount || 0) > 0"
            >
              ¥{{ formatMoney(detailDrawer.data.order.refund_amount) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="赔付金额"
              v-if="Number(detailDrawer.data.order?.compensation_amount || 0) > 0"
            >
              ¥{{ formatMoney(detailDrawer.data.order.compensation_amount) }}
            </el-descriptions-item>
            <el-descriptions-item
              label="待结算冻结"
              v-if="Number(detailDrawer.data.order?.deliverer_frozen_amount || 0) > 0"
            >
              ¥{{ formatMoney(detailDrawer.data.order.deliverer_frozen_amount) }}
            </el-descriptions-item>
            <el-descriptions-item label="担保截止" v-if="detailDrawer.data.order?.settlement_hold_until">
              {{ formatDateTime(detailDrawer.data.order.settlement_hold_until) }}
            </el-descriptions-item>
            <el-descriptions-item label="结算备注" v-if="detailDrawer.data.order?.settlement_note">
              {{ detailDrawer.data.order.settlement_note }}
            </el-descriptions-item>
            <el-descriptions-item label="取件地址" v-if="detailDrawer.data.order?.pickup_location">
              {{ detailDrawer.data.order.pickup_location }}
            </el-descriptions-item>
            <el-descriptions-item label="送达地址" v-if="detailDrawer.data.order?.delivery_location">
              {{ detailDrawer.data.order.delivery_location }}
            </el-descriptions-item>
          </el-descriptions>

          <div
            v-if="detailDrawer.data.order?.pickup_photo || detailDrawer.data.order?.delivery_photo"
            class="order-photo-grid"
          >
            <div v-if="detailDrawer.data.order?.pickup_photo" class="order-photo-card">
              <div class="order-photo-label">取货照片</div>
              <el-image
                :src="resolveImage(detailDrawer.data.order.pickup_photo)"
                :preview-src-list="[resolveImage(detailDrawer.data.order.pickup_photo)]"
                fit="cover"
                class="order-proof-image"
              />
            </div>
            <div v-if="detailDrawer.data.order?.delivery_photo" class="order-photo-card">
              <div class="order-photo-label">送达照片</div>
              <el-image
                :src="resolveImage(detailDrawer.data.order.delivery_photo)"
                :preview-src-list="[resolveImage(detailDrawer.data.order.delivery_photo)]"
                fit="cover"
                class="order-proof-image"
              />
            </div>
          </div>

          <div v-if="detailDrawer.data.order?.items?.length" class="order-items">
            <div class="order-items__title">快递明细</div>
            <div
              v-for="item in detailDrawer.data.order.items"
              :key="item.id || item.item_index"
              class="order-item-card"
            >
              <div class="order-item-card__title">第{{ item.item_index || 1 }}件</div>
              <div class="order-item-card__meta">取件码：{{ item.pickup_code || '-' }}</div>
              <div class="order-item-card__meta">尾号：{{ item.phone_tail || '-' }}</div>
              <div class="order-item-card__meta">
                重量：{{ item.weight !== null && item.weight !== undefined ? `${item.weight}kg` : '-' }}
              </div>
              <div class="order-item-card__meta">尺寸：{{ item.size || '-' }}</div>
            </div>
          </div>

          <div v-if="detailDrawer.data.deliverer_id" class="contact-actions">
            <el-button type="primary" text @click="contactAfterSalesDeliverer(detailDrawer.data)">
              联系配送员
            </el-button>
          </div>
        </div>

        <!-- 工单详情 -->
        <div class="section">
          <h4>工单详情</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="工单编号">
              {{ detailDrawer.data.ticket_no }}
            </el-descriptions-item>
            <el-descriptions-item label="工单类型">
              {{ getTypeText(detailDrawer.data.type) }}
            </el-descriptions-item>
            <el-descriptions-item label="优先级">
              {{ getPriorityText(detailDrawer.data.priority) }}
            </el-descriptions-item>
            <el-descriptions-item label="标题">
              {{ detailDrawer.data.title }}
            </el-descriptions-item>
            <el-descriptions-item label="问题描述">
              {{ detailDrawer.data.description || '-' }}
            </el-descriptions-item>
            <el-descriptions-item label="创建时间">
              {{ formatDateTime(detailDrawer.data.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理时间" v-if="detailDrawer.data.resolved_at">
              {{ formatDateTime(detailDrawer.data.resolved_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="解决方案" v-if="detailDrawer.data.solution">
              {{ detailDrawer.data.solution }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 处理操作 -->
        <div
          class="section action-section"
          v-if="detailDrawer.data.status !== 'resolved' && detailDrawer.data.status !== 'closed'"
        >
          <h4>处理操作</h4>
          <el-form :model="handleForm" label-width="100px">
            <el-form-item label="解决方案">
              <el-input
                v-model="handleForm.solution"
                type="textarea"
                :rows="3"
                placeholder="请输入解决方案"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitHandle" :loading="handleForm.loading">
                提交处理
              </el-button>
              <el-button
                type="danger"
                v-if="detailDrawer.data.status !== 'resolved'"
                @click="moderateTicket('close', detailDrawer.data)"
              >
                关闭工单
              </el-button>
            </el-form-item>

            <!-- 工单处理动作 -->
            <el-form-item v-if="detailDrawer.data.order_id">
              <el-button v-if="detailDrawer.data.type === 'refund'" type="warning" @click="handleRefund">
                退款
              </el-button>
              <el-button v-else-if="detailDrawer.data.type === 'complaint'" type="danger" @click="handleCompensation">
                赔偿
              </el-button>
              <template v-else-if="detailDrawer.data.type === 'dispute'">
                <el-button type="warning" @click="handleRefund">退款</el-button>
                <el-button type="danger" @click="handleCompensate">赔付</el-button>
              </template>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </el-drawer>

    <el-dialog v-model="typeDialog.visible" title="修改工单类型" width="420px">
      <el-form label-position="top">
        <el-form-item label="新工单类型">
          <el-select v-model="typeDialog.type" style="width: 100%">
            <el-option
              v-for="item in getTransferableTicketTypes()"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="typeDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="typeDialog.submitting" @click="submitTypeChange">确认修改</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Tickets,
  Clock,
  Warning,
  CircleCheck,
  Search,
  RefreshLeft,
  MoreFilled,
  Close,
} from '@element-plus/icons-vue'
import { serviceChatApi, serviceOrderApi, serviceTicketApi } from '@/api'
import { useAdminStore } from '@/stores/admin'
import { dateUtils } from '@/utils'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const router = useRouter()
const adminStore = useAdminStore()
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'
const FILE_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '')
const loading = ref(false)
const ticketList = ref([])
const dateRange = ref([])

const filters = reactive({
  type: '',
  priority: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const stats = reactive({
  total: 0,
  pending: 0,
  processing: 0,
  resolved: 0,
})

const detailDrawer = reactive({
  visible: false,
  data: null,
})

const typeDialog = reactive({
  visible: false,
  submitting: false,
  ticketId: null,
  type: '',
})

const ticketTypeOptions = [
  { label: '投诉', value: 'complaint' },
  { label: '退款', value: 'refund' },
  { label: '争议', value: 'dispute' },
  { label: '建议', value: 'suggestion' },
  { label: '其他', value: 'other' },
]

const getTransferableTicketTypes = () => {
  const ownTypes = Array.isArray(adminStore.admin?.ticket_types) ? adminStore.admin.ticket_types : []
  return ticketTypeOptions.filter((item) => !ownTypes.includes(item.value))
}

const handleForm = reactive({
  solution: '',
  loading: false,
})

const buildTicketParams = (includePagination = true) => {
  const params = {}

  if (includePagination) {
    params.page = pagination.page
    params.limit = pagination.pageSize
  }

  if (filters.type) params.type = filters.type
  if (filters.priority) params.priority = filters.priority
  if (filters.status) params.status = filters.status

  if (dateRange.value?.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }

  return params
}

const isDialogCancel = (error) => error === 'cancel' || error === 'close'

const refreshPageData = async () => {
  await fetchTickets()
}

const refreshDetailDrawer = async (ticketId) => {
  if (!detailDrawer.visible || !detailDrawer.data || detailDrawer.data.id !== ticketId) {
    return
  }

  try {
    const response = await serviceTicketApi.getTicketById(ticketId)
    if (response.success && response.data) {
      detailDrawer.data = { ...detailDrawer.data, ...response.data }
    }
  } catch (error) {
    console.error('刷新工单详情失败:', error)
  }
}

// 获取工单列表
const fetchTickets = async () => {
  loading.value = true
  try {
    const response = await serviceTicketApi.getTickets(buildTicketParams())
    if (response.success) {
      const data = response.data || []
      ticketList.value = Array.isArray(data) ? data : []
      pagination.total = response.pagination?.total || ticketList.value.length
    }
  } catch (error) {
    console.error('获取工单列表失败:', error)
    ElMessage.error('获取工单列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const baseParams = buildTicketParams(false)
    const [pendingRes, processingRes, resolvedRes, allRes] = await Promise.all([
      serviceTicketApi.getTickets({ ...baseParams, status: 'pending', limit: 1 }),
      serviceTicketApi.getTickets({ ...baseParams, status: 'processing', limit: 1 }),
      serviceTicketApi.getTickets({ ...baseParams, status: 'resolved', limit: 1 }),
      serviceTicketApi.getTickets({ ...baseParams, limit: 1 }),
    ])

    stats.pending = pendingRes.pagination?.total || 0
    stats.processing = processingRes.pagination?.total || 0
    stats.resolved = resolvedRes.pagination?.total || 0
    stats.total = allRes.pagination?.total || 0
  } catch (error) {
    console.error('获取统计数据失败:', error)
    stats.total = 0
    stats.pending = 0
    stats.processing = 0
    stats.resolved = 0
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  refreshPageData()
}

// 重置
const handleReset = () => {
  filters.type = ''
  filters.priority = ''
  filters.status = ''
  pagination.page = 1
  refreshPageData()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  refreshPageData()
}

const handleExport = async () => {
  try {
    const params = {
      ...buildTicketParams(false),
      page: 1,
      limit: Math.max(pagination.total || ticketList.value.length || 0, 1000),
    }

    const response = await serviceTicketApi.getTickets(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const list = response.data || []
    const rows = list.map((ticket) => ({
      工单编号: normalizeExportValue(ticket.ticket_no),
      工单类型: getTypeText(ticket.type),
      标题: normalizeExportValue(ticket.title),
      优先级: getPriorityText(ticket.priority),
      状态: getStatusText(ticket.status),
      用户: normalizeExportValue(ticket.user?.username),
      手机号: normalizeExportValue(ticket.user?.phone),
      描述: normalizeExportValue(ticket.description),
      创建时间: normalizeExportValue(ticket.created_at),
      解决时间: normalizeExportValue(ticket.resolved_at),
      解决方案: normalizeExportValue(ticket.solution),
    }))

    exportCsvFile(rows, '工单管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条工单数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error(error.message || '导出失败')
  }
}

// 查看详情
const viewDetail = async (row) => {
  handleForm.solution = ''
  try {
    const response = await serviceTicketApi.getTicketById(row.id)
    if (response.success) {
      detailDrawer.data = { ...row, ...response.data }
    } else {
      detailDrawer.data = row
    }
    detailDrawer.visible = true
  } catch {
    detailDrawer.data = row
    detailDrawer.visible = true
  }
}

const contactAfterSalesUser = async (ticket) => {
  const userId = Number(ticket?.user?.id || ticket?.user_id || 0)
  if (!userId) {
    ElMessage.warning('未找到用户信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      user_id: userId,
      order_id: ticket?.order_id || undefined,
      initial_message: `您好，这里是平台客服，关于售后工单「${ticket?.title || ticket?.ticket_no || ''}」需要和您沟通。`,
    })

    if (!response.success || !response.data?.id) {
      throw new Error(response.message || '创建会话失败')
    }

    detailDrawer.visible = false
    router.push({
      path: '/service/chat',
      query: { conversationId: String(response.data.id) },
    })
  } catch (error) {
    ElMessage.error(error.message || '联系用户失败')
  }
}

const contactAfterSalesDeliverer = async (ticket) => {
  const delivererId = Number(ticket?.deliverer_id || ticket?.order?.deliverer_id || 0)
  if (!delivererId) {
    ElMessage.warning('未找到配送员信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      deliverer_id: delivererId,
      order_id: ticket?.order_id || undefined,
      initial_message: `您好，这里是平台客服，关于售后工单「${ticket?.title || ticket?.ticket_no || ''}」需要和您沟通。`,
    })

    if (!response.success || !response.data?.id) {
      throw new Error(response.message || '创建会话失败')
    }

    detailDrawer.visible = false
    router.push({
      path: '/service/chat',
      query: { conversationId: String(response.data.id) },
    })
  } catch (error) {
    ElMessage.error(error.message || '联系配送员失败')
  }
}

// 处理工单
const moderateTicket = async (command, ticket) => {
  if (command === 'process') {
    try {
      const response = await serviceTicketApi.claimTicket(ticket.id)

      if (response.success) {
        ElMessage.success('已开始处理')
        await refreshPageData()
        await refreshDetailDrawer(ticket.id)
      }
    } catch (error) {
      if (!isDialogCancel(error)) {
        ElMessage.error('操作失败')
      }
    }
  } else if (command === 'resolve') {
    try {
      const { value } = await ElMessageBox.prompt('请输入解决方案', '标记已解决', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
      })

      const response = await serviceTicketApi.updateTicketStatus(ticket.id, {
        status: 'resolved',
        solution: value,
      })

      if (response.success) {
        ElMessage.success('已标记为已解决')
        await refreshPageData()
        detailDrawer.visible = false
      }
    } catch (error) {
      if (!isDialogCancel(error)) {
        ElMessage.error('操作失败')
      }
    }
  } else if (command === 'close') {
    try {
      await ElMessageBox.confirm('确定要关闭此工单吗？', '确认关闭', { type: 'warning' })

      const response = await serviceTicketApi.updateTicketStatus(ticket.id, {
        status: 'closed',
        solution: '工单已关闭',
      })

      if (response.success) {
        ElMessage.success('工单已关闭')
        await refreshPageData()
        detailDrawer.visible = false
      }
    } catch (error) {
      if (!isDialogCancel(error)) {
        ElMessage.error('操作失败')
      }
    }
  } else if (command === 'release') {
    try {
      const response = await serviceTicketApi.releaseTicket(ticket.id)
      if (response.success) {
        ElMessage.success('工单已释放')
        await refreshPageData()
        await refreshDetailDrawer(ticket.id)
      }
    } catch (error) {
      ElMessage.error(error.message || '释放工单失败')
    }
  } else if (command === 'edit-type') {
    if (!getTransferableTicketTypes().length) {
      ElMessage.warning('当前客服没有可转出的目标工单类型')
      return
    }
    typeDialog.ticketId = ticket.id
    typeDialog.type = getTransferableTicketTypes()[0]?.value || ''
    typeDialog.visible = true
  }
}

// 提交处理
const submitHandle = async () => {
  if (!detailDrawer.data?.id) {
    ElMessage.warning('未找到当前工单')
    return
  }

  if (!handleForm.solution) {
    ElMessage.warning('请输入解决方案')
    return
  }

  handleForm.loading = true
  try {
    const response = await serviceTicketApi.updateTicketStatus(detailDrawer.data.id, {
      status: 'resolved',
      solution: handleForm.solution,
    })

    if (response.success) {
      ElMessage.success('处理成功')
      handleForm.solution = ''
      detailDrawer.visible = false
      await refreshPageData()
    }
  } catch {
    ElMessage.error('处理失败')
  } finally {
    handleForm.loading = false
  }
}

const submitTypeChange = async () => {
  if (!typeDialog.ticketId || !typeDialog.type) {
    ElMessage.warning('请选择工单类型')
    return
  }

  typeDialog.submitting = true
  try {
    const response = await serviceTicketApi.updateTicketType(typeDialog.ticketId, typeDialog.type)
    if (!response.success) throw new Error(response.message || '修改工单类型失败')

    ElMessage.success('工单类型已更新，已重新进入待处理队列')
    typeDialog.visible = false
    detailDrawer.visible = false
    await refreshPageData()
  } catch (error) {
    ElMessage.error(error.message || '修改工单类型失败')
  } finally {
    typeDialog.submitting = false
  }
}

// 退款处理
const handleRefund = async () => {
  if (!detailDrawer.data.order_id) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt('请输入退款原因', '退款处理', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputPlaceholder: '例如：配送员未按要求送达，客服同意退款',
      inputValidator: (inputValue) => {
        if (!inputValue || !inputValue.trim()) return '请填写退款原因'
        return true
      },
    })

    const response = await serviceOrderApi.processRefund(detailDrawer.data.order_id, {
      reason: value.trim(),
      ticket_id: detailDrawer.data.id,
    })

    if (response.success) {
      ElMessage.success('退款处理成功')
      await refreshPageData()
      await refreshDetailDrawer(detailDrawer.data.id)
    }
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '退款处理失败')
    }
  }
}

// 投诉赔偿处理
const handleCompensation = async () => {
  if (!detailDrawer.data.order_id) {
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

    const response = await serviceOrderApi.processCompensation(detailDrawer.data.order_id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
      ticket_id: detailDrawer.data.id,
    })

    if (response.success) {
      const result = response.data?.result || {}
      ElMessage.success(
        Number(result.offline_amount || 0) > 0
          ? `赔偿已处理，系统赔偿 ¥${Number(result.processed_amount || 0).toFixed(2)}，线下待处理 ¥${Number(result.offline_amount || 0).toFixed(2)}`
          : `赔偿已处理，赔偿金额 ¥${Number(result.processed_amount || 0).toFixed(2)}`,
      )
      await refreshPageData()
      await refreshDetailDrawer(detailDrawer.data.id)
    }
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '赔偿处理失败')
    }
  }
}

// 损坏赔付处理
const handleCompensate = async () => {
  if (!detailDrawer.data.order_id) {
    ElMessage.warning('该工单没有关联订单')
    return
  }

  try {
    const { value } = await ElMessageBox.prompt(
      '请输入额外赔付金额和原因（格式：金额|原因）。订单金额会全额退款给用户；这里填写的金额是退款之外的额外赔付，会再打给用户，并按配送员承担优先、平台不足垫付的方式结算。若订单尚未由用户确认完成，系统会先自动结束订单并进入担保结算。',
      '损坏赔付处理',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPattern: /^\d+(\.\d+)?\|.+$/,
        inputErrorMessage: '格式错误，请输入：金额|原因',
      },
    )

    const [amount, reason] = value.split('|')

    const response = await serviceOrderApi.processCompensate(detailDrawer.data.order_id, {
      amount: parseFloat(amount),
      reason: reason.trim(),
      ticket_id: detailDrawer.data.id,
    })

    if (response.success) {
      const result = response.data?.result || {}
      if (Number(result.platform_advance_amount || 0) > 0) {
        ElMessage.success(
          `赔付已处理，退款 ¥${Number(result.refund_amount || 0).toFixed(2)}，额外赔付 ¥${Number(result.claim_amount || 0).toFixed(2)}，平台垫付 ¥${Number(result.platform_advance_amount).toFixed(2)}，并已生成欠款记录`,
        )
      } else {
        ElMessage.success(
          `赔付已处理，退款 ¥${Number(result.refund_amount || 0).toFixed(2)}，额外赔付 ¥${Number(result.claim_amount || 0).toFixed(2)}`,
        )
      }
      await refreshPageData()
      await refreshDetailDrawer(detailDrawer.data.id)
    }
  } catch (error) {
    if (!isDialogCancel(error)) {
      ElMessage.error(error.message || '损坏赔付处理失败')
    }
  }
}

// 分页
const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize
  pagination.page = 1
  fetchTickets()
}

const handlePageChange = (newPage) => {
  pagination.page = newPage
  fetchTickets()
}

// 工具函数
const getTypeText = (type) => {
  const texts = {
    complaint: '投诉',
    refund: '退款',
    dispute: '损坏赔付',
    suggestion: '建议',
    other: '其他',
  }
  return texts[type] || type || '其他'
}

const getTypeTagType = (type) => {
  const types = {
    complaint: 'danger',
    refund: 'warning',
    dispute: 'warning',
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
    low: '低',
  }
  return texts[priority] || priority || '中'
}

const getPriorityTagType = (priority) => {
  const types = {
    urgent: 'danger',
    high: 'danger',
    medium: 'warning',
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
  return types[status] || ''
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

const getDamageClaimStatusText = (status) => {
  const texts = {
    none: '未发起',
    processing: '处理中',
    resolved: '已处理',
    rejected: '已驳回',
  }
  return texts[status] || status || '-'
}

const formatMoney = (value) => {
  const amount = Number.parseFloat(value || 0)
  return Number.isFinite(amount) ? amount.toFixed(2) : '0.00'
}

const getOrderTotalAmount = (order) =>
  Number.parseFloat(order?.price || 0) + Number.parseFloat(order?.tip || 0)

const resolveImage = (content) => {
  if (!content) return ''
  if (/^https?:\/\//i.test(content) || content.startsWith('data:')) return content
  if (content.startsWith('/uploads/')) return `${FILE_BASE_URL}${content}`
  if (content.startsWith('uploads/')) return `${FILE_BASE_URL}/${content}`
  if (content.startsWith('/')) return `${FILE_BASE_URL}${content}`
  return `${FILE_BASE_URL}/${String(content).replace(/^\/+/, '')}`
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [dateUtils.formatDate(start), dateUtils.formatDate(end)]
  refreshPageData()
})
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
}

/* 统计卡片 */
.stats-row {
  display: none;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: var(--radius-xl, 16px);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
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

.stat-icon.total {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.danger {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.stat-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
}

.unassigned-service {
  color: #9ca3af;
}

.stat-label {
  font-size: 0.85rem;
  color: #909399;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl, 16px);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl, 16px);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.ticket-no {
  font-weight: 600;
  color: var(--el-color-primary);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 详情抽屉 */
.status-header {
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.status-header.pending {
  background: #fdf6ec;
  border: 1px solid #e6a23c;
}

.status-header.processing {
  background: #ecf5ff;
  border: 1px solid var(--el-color-primary);
}

.status-header.resolved {
  background: #f0f9eb;
  border: 1px solid #67c23a;
}

.status-header.closed {
  background: #f4f4f5;
  border: 1px solid #909399;
}

.status-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.section {
  margin-bottom: 24px;
}

.section h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
  font-size: 1rem;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.user-card .info .name {
  font-weight: 500;
  margin-bottom: 4px;
}

.user-card .info .contact {
  font-size: 0.85rem;
  color: #909399;
}

.order-photo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-top: 16px;
}

.order-photo-card,
.order-item-card {
  border: 1px solid var(--el-border-color-light, #e4e7ed);
  border-radius: 12px;
  padding: 14px;
  background: #f8fafc;
}

.order-photo-label,
.order-items__title,
.order-item-card__title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
}

.order-proof-image {
  width: 100%;
  height: 160px;
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
}

.order-items {
  margin-top: 16px;
}

.order-items__title {
  margin-bottom: 12px;
}

.order-item-card + .order-item-card {
  margin-top: 12px;
}

.order-item-card__title {
  margin-bottom: 8px;
}

.order-item-card__meta {
  font-size: 0.9rem;
  color: #475569;
  line-height: 1.8;
}

.action-section {
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 工单元信息 */
.ticket-meta {
  margin: 8px 0 0;
  font-size: 0.85rem;
  color: #909399;
}

.ticket-meta span {
  margin-right: 16px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }

  .pagination-wrapper {
    justify-content: center;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
  }

  .filter-form :deep(.el-select),
  .filter-form :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
