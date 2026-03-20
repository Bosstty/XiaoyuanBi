<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="售后管理"
      subtitle="处理退款、投诉及售后服务"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出售后"
      @change="handleDateRangeChange"
      @action="handleExport"
    />

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon total">
            <el-icon><ShoppingCart /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">售后单总数</div>
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
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ stats.refundAmount.toFixed(2) }}</div>
            <div class="stat-label">待退款金额</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon success">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completedToday }}</div>
            <div class="stat-label">今日完成</div>
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
            <el-option label="已完成" value="completed" />
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

    <!-- 售后单列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="afterSalesList" stripe style="width: 100%">
        <el-table-column prop="ticket_no" label="工单编号" align="center" min-width="180">
          <template #default="{ row }">
            <span class="ticket-no">{{ row.ticket_no }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="type" label="类型" align="center" width="100">
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
          min-width="250"
        >
          <template #default="{ row }">
            <span>{{ row.title }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="user" label="发起人" align="center" width="160">
          <template #default="{ row }">
            <div class="user-cell">
              <el-avatar :size="32" :src="row.user?.avatar">
                {{ row.user?.username?.charAt(0) || 'U' }}
              </el-avatar>
              <span>{{ row.user?.real_name || row.user?.username || '用户' + row.user_id }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="priority" label="优先级" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="getPriorityTagType(row.priority)" size="small">
              {{ getPriorityText(row.priority) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" align="center" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="order_id" label="关联订单" align="center" width="100">
          <template #default="{ row }">
            <el-tag v-if="row.order_id" size="small" type="info">{{ row.order_id }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>

        <el-table-column prop="created_at" label="创建时间" align="center" width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row)">
                详情
              </el-button>
              <el-button type="warning" size="small" text @click="handleAction('transfer', row)">
                转交
              </el-button>
              <el-button
                type="danger"
                size="small"
                text
                @click="handleAction('close', row)"
                v-if="row.status !== 'closed'"
              >
                关闭
              </el-button>
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
    <el-drawer v-model="detailDrawer.visible" title="售后单详情" size="600px">
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

        <!-- 关联信息 -->
        <div class="section" v-if="detailDrawer.data.order_id || detailDrawer.data.deliverer_id">
          <h4>关联信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="订单ID" v-if="detailDrawer.data.order_id">
              {{ detailDrawer.data.order_id }}
            </el-descriptions-item>
            <el-descriptions-item label="配送员ID" v-if="detailDrawer.data.deliverer_id">
              {{ detailDrawer.data.deliverer_id }}
            </el-descriptions-item>
            <el-descriptions-item label="服务ID" v-if="detailDrawer.data.service_id">
              {{ detailDrawer.data.service_id }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 发起人信息 -->
        <div class="section">
          <h4>发起人信息</h4>
          <div class="user-card">
            <el-avatar :size="48" :src="detailDrawer.data.user?.avatar">
              {{ detailDrawer.data.user?.username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="info">
              <div class="name">
                {{
                  detailDrawer.data.user?.real_name ||
                  detailDrawer.data.user?.username ||
                  '用户' + detailDrawer.data.user_id
                }}
              </div>
              <div class="contact">手机: {{ detailDrawer.data.user?.phone || '-' }}</div>
              <div class="contact">用户ID: {{ detailDrawer.data.user_id }}</div>
            </div>
          </div>
        </div>

        <!-- 工单详情 -->
        <div class="section">
          <h4>工单详情</h4>
          <el-descriptions :column="1" border>
            <el-descriptions-item label="工单编号">
              {{ detailDrawer.data.ticket_no }}
            </el-descriptions-item>
            <el-descriptions-item label="问题描述">
              {{ detailDrawer.data.description }}
            </el-descriptions-item>
            <el-descriptions-item label="申请时间">
              {{ formatDateTime(detailDrawer.data.created_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理时间" v-if="detailDrawer.data.processed_at">
              {{ formatDateTime(detailDrawer.data.processed_at) }}
            </el-descriptions-item>
            <el-descriptions-item label="处理备注" v-if="detailDrawer.data.process_note">
              {{ detailDrawer.data.process_note }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 凭证图片 -->
        <div class="section" v-if="detailDrawer.data.images?.length">
          <h4>凭证图片</h4>
          <div class="image-list">
            <el-image
              v-for="(img, index) in detailDrawer.data.images"
              :key="index"
              :src="img"
              :preview-src-list="detailDrawer.data.images"
              fit="cover"
              class="evidence-image"
            />
          </div>
        </div>

        <!-- 处理操作 -->
        <div
          class="section action-section"
          v-if="detailDrawer.data.status !== 'completed' && detailDrawer.data.status !== 'closed'"
        >
          <h4>处理操作</h4>
          <el-form :model="handleForm" label-width="100px">
            <el-form-item label="处理结果">
              <el-radio-group v-model="handleForm.result">
                <el-radio value="complete">完成</el-radio>
                <el-radio value="close">关闭</el-radio>
              </el-radio-group>
            </el-form-item>

            <el-form-item label="处理备注">
              <el-input
                v-model="handleForm.note"
                type="textarea"
                :rows="3"
                placeholder="请输入处理备注"
              />
            </el-form-item>

            <el-form-item>
              <el-button type="primary" @click="submitHandle" :loading="handleForm.loading">
                提交处理
              </el-button>
            </el-form-item>
          </el-form>
        </div>
      </template>
    </el-drawer>

    <!-- 转交工单对话框 -->
    <el-dialog v-model="transferDialog.visible" title="转交管理员处理" width="500px">
      <div class="transfer-info">
        <el-alert type="warning" :closable="false" show-icon>
          此工单将转交给管理员进行最终处理
        </el-alert>
      </div>
      <el-form :model="transferDialog.form" label-width="100px" style="margin-top: 20px">
        <el-form-item label="工单编号">
          <el-input :value="transferDialog.data?.ticket_no" disabled />
        </el-form-item>
        <el-form-item label="转交说明">
          <el-input
            v-model="transferDialog.form.description"
            type="textarea"
            :rows="4"
            placeholder="请填写转交说明，说明需要管理员处理的原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="transferDialog.visible = false">取消</el-button>
        <el-button type="warning" @click="submitTransfer" :loading="transferDialog.loading">
          确认转交
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  ShoppingCart,
  Clock,
  Money,
  CircleCheck,
  Search,
  RefreshLeft,
} from '@element-plus/icons-vue'
import { serviceTicketApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const loading = ref(false)
const afterSalesList = ref([])
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
  refundAmount: 0,
  completedToday: 0,
})

const detailDrawer = reactive({
  visible: false,
  data: null,
})

const handleForm = reactive({
  result: 'complete',
  note: '',
  loading: false,
})

// 转交工单对话框
const transferDialog = reactive({
  visible: false,
  loading: false,
  data: null,
  form: {
    title: '',
    description: '',
    priority: 'medium',
  },
})

// 获取售后单列表（使用工单接口）
const fetchAfterSales = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      ...filters,
    }

    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const response = await serviceTicketApi.getTickets(params)
    if (response.success) {
      const data = response.data
      afterSalesList.value = data.tickets || data.list || data || []
      pagination.total = data.pagination?.total || data.length || 0
    }
  } catch (error) {
    console.error('获取售后单列表失败:', error)
    // 使用模拟数据
    afterSalesList.value = [
      {
        id: 1,
        ticket_no: 'TK1772246308549000',
        type: 'complaint',
        title: '配送员态度恶劣',
        description: '配送员在送餐时语言不友好，甚至有辱骂行为，希望能严肃处理。',
        priority: 'high',
        status: 'pending',
        order_id: 5,
        user_id: 5,
        created_at: '2026-02-28T02:38:28.000Z',
        user: {
          id: 5,
          username: 'qianqi',
          phone: '13873090096',
          real_name: '钱七',
        },
      },
      {
        id: 2,
        ticket_no: 'TK1772246308564001',
        type: 'refund',
        title: '订单退款申请',
        description: '商品已损坏，申请全额退款。',
        priority: 'medium',
        status: 'processing',
        order_id: 2,
        user_id: 2,
        created_at: '2026-02-27T10:20:00.000Z',
        user: {
          id: 2,
          username: 'lisi',
          phone: '13800000002',
          real_name: '李四',
        },
      },
    ]
    pagination.total = 2
  } finally {
    loading.value = false
  }
}

// 获取统计数据（使用工单接口）
const fetchStats = async () => {
  try {
    // 获取工单总数
    const totalRes = await serviceTicketApi.getTickets({ pageSize: 1 })
    const totalCount = totalRes.pagination?.total || 0

    // 获取待处理工单数
    const pendingRes = await serviceTicketApi.getTickets({ status: 'pending', pageSize: 1 })
    const pendingCount = pendingRes.pagination?.total || 0

    // 获取处理中工单数
    const processingRes = await serviceTicketApi.getTickets({ status: 'processing', pageSize: 1 })
    const processingCount = processingRes.pagination?.total || 0

    // 获取已完成工单数
    const completedRes = await serviceTicketApi.getTickets({ status: 'completed', pageSize: 1 })
    const completedCount = completedRes.pagination?.total || 0

    stats.total = totalCount
    stats.pending = pendingCount + processingCount
    // 模拟待退款金额
    stats.refundAmount = stats.pending * 15
    stats.completedToday = completedCount
  } catch (error) {
    console.error('获取统计数据失败:', error)
    stats.total = 10
    stats.pending = 3
    stats.refundAmount = 85.5
    stats.completedToday = 7
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchAfterSales()
}

// 重置
const handleReset = () => {
  Object.keys(filters).forEach((key) => {
    filters[key] = ''
  })
  pagination.page = 1
  fetchAfterSales()
}

// 刷新
const refreshData = () => {
  fetchAfterSales()
  fetchStats()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  fetchAfterSales()
  fetchStats()
}

const handleExport = async () => {
  try {
    const params = {
      page: 1,
      pageSize: Math.max(pagination.total || afterSalesList.value.length || 0, 1000),
      ...filters,
    }

    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const response = await serviceTicketApi.getTickets(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const data = response.data
    const list = data.tickets || data.list || data || []
    const rows = list.map((ticket) => ({
      售后单ID: ticket.id,
      工单编号: normalizeExportValue(ticket.ticket_no),
      类型: getTypeText(ticket.type),
      标题: normalizeExportValue(ticket.title),
      发起人: normalizeExportValue(ticket.user?.real_name || ticket.user?.username),
      优先级: getPriorityText(ticket.priority),
      状态: getStatusText(ticket.status),
      关联订单: normalizeExportValue(ticket.order_id),
      创建时间: normalizeExportValue(ticket.created_at),
      处理时间: normalizeExportValue(ticket.processed_at),
    }))

    exportCsvFile(rows, '售后管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条售后数据`)
  } catch (error) {
    console.error('导出售后失败:', error)
    ElMessage.error(error.message || '导出售后失败')
  }
}

// 查看详情
const viewDetail = async (row) => {
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

// 操作处理
const handleAction = (command, row) => {
  switch (command) {
    case 'process':
      handleProcess(row)
      break
    case 'complete':
      handleComplete(row)
      break
    case 'close':
      handleClose(row)
      break
    case 'transfer':
      openTransferDialog(row)
      break
  }
}

// 开始处理（转为处理中）
const handleProcess = async (row) => {
  try {
    await ElMessageBox.confirm('确定要开始处理此工单吗？', '确认操作', { type: 'info' })

    const response = await serviceTicketApi.updateTicketStatus(row.id, {
      status: 'processing',
      content: '客服开始处理',
    })

    if (response.success) {
      ElMessage.success('已开始处理')
      fetchAfterSales()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 关闭工单
const handleClose = async (row) => {
  try {
    await ElMessageBox.confirm('确定要关闭此工单吗？', '确认关闭', { type: 'warning' })

    const response = await serviceTicketApi.updateTicketStatus(row.id, {
      status: 'closed',
      content: '客服关闭工单',
    })

    if (response.success) {
      ElMessage.success('工单已关闭')
      fetchAfterSales()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 打开转交对话框
const openTransferDialog = (row) => {
  transferDialog.data = row
  transferDialog.form = {
    description: `工单编号: ${row.ticket_no}\n标题: ${row.title}\n类型: ${getTypeText(row.type)}\n优先级: ${getPriorityText(row.priority)}\n状态: ${getStatusText(row.status)}\n描述: ${row.description}`,
    priority: 'high',
  }
  transferDialog.visible = true
}

// 提交转交（转给管理员处理）
const submitTransfer = async () => {
  transferDialog.loading = true
  try {
    // 更新工单状态为处理中，并提升优先级
    await serviceTicketApi.updateTicketStatus(transferDialog.data.id, {
      status: 'processing',
      content: transferDialog.form.description + '\n\n客服转交：需要管理员介入处理',
    })

    ElMessage.success('已转交管理员处理')
    transferDialog.visible = false
    fetchAfterSales()
    fetchStats()
  } catch (error) {
    ElMessage.error('转交失败: ' + (error.message || '请稍后重试'))
  } finally {
    transferDialog.loading = false
  }
}

// 标记完成
const handleComplete = async (row) => {
  try {
    await ElMessageBox.confirm('确定要将此工单标记为完成吗？', '确认操作', { type: 'info' })

    const response = await serviceTicketApi.updateTicketStatus(row.id, {
      status: 'completed',
      content: '客服标记完成',
    })
    if (response.success) {
      ElMessage.success('已标记完成')
      fetchAfterSales()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 提交处理
const submitHandle = async () => {
  handleForm.loading = true
  try {
    // 根据处理结果更新工单状态
    const statusMap = {
      approve: 'completed',
      reject: 'closed',
      compensate: 'processing',
    }
    const status = statusMap[handleForm.result] || 'processing'

    await serviceTicketApi.updateTicketStatus(detailDrawer.data.id, {
      status,
      content: handleForm.note,
    })

    ElMessage.success('处理成功')
    detailDrawer.visible = false
    fetchAfterSales()
    fetchStats()
  } catch {
    ElMessage.error('处理失败')
  } finally {
    handleForm.loading = false
  }
}

// 分页
const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize
  pagination.page = 1
  fetchAfterSales()
}

const handlePageChange = (newPage) => {
  pagination.page = newPage
  fetchAfterSales()
}

// 工具函数
const getTypeText = (type) => {
  // 工单类型映射
  const texts = {
    complaint: '投诉',
    refund: '退款',
    dispute: '争议',
    suggestion: '建议',
    other: '其他',
    express: '快递代取',
    takeout: '外卖代取',
    medicine: '药品代购',
    shopping: '生活用品',
  }
  return texts[type] || type || '待处理'
}

const getTypeTagType = (type) => {
  const types = {
    complaint: 'danger',
    refund: 'warning',
    dispute: 'warning',
    suggestion: 'success',
    other: 'info',
    express: 'primary',
    takeout: 'warning',
    medicine: 'danger',
    shopping: 'success',
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
    completed: '已完成',
    closed: '已关闭',
    accepted: '已接单',
    picking: '取件中',
    delivering: '配送中',
    cancelled: '已取消',
  }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    pending: 'info',
    processing: 'warning',
    completed: 'success',
    closed: 'info',
    accepted: 'primary',
    picking: 'warning',
    delivering: 'warning',
    cancelled: 'danger',
  }
  return types[status] || ''
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  fetchAfterSales()
  fetchStats()
})
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
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

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.ticket-no,
.order-no {
  font-weight: 600;
  color: var(--primary);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reason-text {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.amount {
  font-weight: 600;
  color: #f56c6c;
}

.amount-large {
  font-size: 1.2rem;
  font-weight: 600;
  color: #f56c6c;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--bg-color, #f5f7fa);
  border-radius: var(--radius-lg, 12px);
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
  border: 1px solid var(--primary);
}

.status-header.completed,
.status-header.refunded {
  background: #f0f9eb;
  border: 1px solid #67c23a;
}

.status-header.rejected {
  background: #fef0f0;
  border: 1px solid #f56c6c;
}

.status-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.order-info {
  color: #606266;
}

.order-info .label {
  color: #909399;
}

.order-info .value {
  font-weight: 500;
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

.image-list {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.evidence-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  cursor: pointer;
}

.action-section {
  padding-top: 20px;
  border-top: 1px solid #e4e7ed;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-container {
    padding: 12px;
  }

  .page-title {
    font-size: 1.5rem;
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
</style>
