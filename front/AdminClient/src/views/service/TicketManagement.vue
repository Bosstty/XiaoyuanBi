<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="工单管理"
      subtitle="处理客服转交的争议工单"
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
          <div class="stat-icon pending">
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
          <div class="stat-icon processing">
            <el-icon><Loading /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.processing }}</div>
            <div class="stat-label">处理中</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon completed">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
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
        <el-form-item label="处理人">
          <el-input
            v-model="filters.assignee"
            placeholder="处理人"
            clearable
            style="width: 120px"
          />
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
              <el-button type="primary" size="small" text @click="viewTicket(row)">
                详情
              </el-button>
              <el-button type="warning" size="small" text @click="handleAction('assign', row)">
                分配
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
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next"
          background
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 工单详情抽屉 -->
    <el-drawer v-model="detailDrawer.visible" title="工单详情" size="600px">
      <template v-if="detailDrawer.data">
        <!-- 工单信息 -->
        <div class="ticket-header">
          <div class="ticket-info">
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

        <el-divider />

        <!-- 发起人信息 -->
        <div class="section">
          <h4>发起人信息</h4>
          <div class="user-profile">
            <el-avatar :size="48" :src="detailDrawer.data.user?.avatar">
              {{ detailDrawer.data.user?.username?.charAt(0) || 'U' }}
            </el-avatar>
            <div class="user-info">
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
          <div class="contact-actions">
            <el-button type="primary" text @click="contactTicketUser(detailDrawer.data)">
              联系用户
            </el-button>
          </div>
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
          <div v-if="detailDrawer.data.deliverer_id" class="contact-actions">
            <el-button type="primary" text @click="contactTicketDeliverer(detailDrawer.data)">
              联系配送员
            </el-button>
          </div>
        </div>

        <el-divider />

        <!-- 工单内容 -->
        <div class="section">
          <h4>问题描述</h4>
          <div class="ticket-content">
            {{ detailDrawer.data.description }}
          </div>
          <div v-if="detailDrawer.data.images?.length" class="ticket-images">
            <el-image
              v-for="(img, index) in detailDrawer.data.images"
              :key="index"
              :src="img"
              :preview-src-list="detailDrawer.data.images"
              fit="cover"
              class="ticket-image"
            />
          </div>
        </div>

        <el-divider />

        <!-- 处理记录 -->
        <div class="section">
          <h4>处理记录</h4>
          <el-timeline>
            <el-timeline-item
              v-for="(record, index) in detailDrawer.data.records"
              :key="index"
              :timestamp="formatDateTime(record.created_at)"
              :type="record.action === 'close' ? 'danger' : 'primary'"
            >
              <div class="record-item">
                <div class="record-action">{{ record.action_text }}</div>
                <div class="record-content">{{ record.content }}</div>
                <div class="record-operator">处理人：{{ record.operator?.name }}</div>
              </div>
            </el-timeline-item>
          </el-timeline>
        </div>

        <el-divider />

        <!-- 处理操作 -->
        <div class="section">
          <h4>处理工单</h4>
          <el-form :model="handleForm" label-width="80px">
            <el-form-item label="回复内容">
              <el-input
                v-model="handleForm.content"
                type="textarea"
                :rows="4"
                placeholder="请输入回复内容"
              />
            </el-form-item>
            <el-form-item label="处理状态">
              <el-select v-model="handleForm.status" style="width: 200px">
                <el-option label="处理中" value="processing" />
                <el-option label="已完成" value="completed" />
                <el-option label="已关闭" value="closed" />
              </el-select>
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

    <!-- 分配对话框 -->
    <el-dialog v-model="assignDialog.visible" title="分配处理人" width="400px">
      <el-form :model="assignDialog.form" label-width="80px">
        <el-form-item label="工单编号">
          <span>{{ assignDialog.data?.ticket_no }}</span>
        </el-form-item>
        <el-form-item label="选择处理人" required>
          <el-select
            v-model="assignDialog.form.assignee_id"
            placeholder="请选择处理人"
            style="width: 100%"
          >
            <el-option
              v-for="staff in staffList"
              :key="staff.id"
              :label="staff.name"
              :value="staff.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitAssign">确定分配</el-button>
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
  Loading,
  CircleCheck,
  Search,
  RefreshLeft,
} from '@element-plus/icons-vue'
import { serviceChatApi, serviceTicketApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const router = useRouter()
const loading = ref(false)
const ticketList = ref([])
const staffList = ref([])
const dateRange = ref([])

const filters = reactive({
  type: '',
  priority: '',
  status: '',
  assignee: '',
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
  completed: 0,
})

const detailDrawer = reactive({
  visible: false,
  data: null,
})

const handleForm = reactive({
  content: '',
  status: 'processing',
  loading: false,
})

const assignDialog = reactive({
  visible: false,
  data: null,
  form: {
    assignee_id: '',
  },
})

// 获取工单列表
const fetchTickets = async () => {
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
      ticketList.value = data.tickets || data.list || data || []
      pagination.total = data.pagination?.total || data.length || 0
    }
  } catch (error) {
    console.error('获取工单列表失败:', error)
    // 使用模拟数据
    ticketList.value = [
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
        deliverer_id: 1,
        service_id: 1,
        created_at: '2026-02-28T02:38:28.000Z',
        updated_at: '2026-02-28T02:38:28.000Z',
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
        status: 'pending',
        order_id: 2,
        user_id: 2,
        deliverer_id: 3,
        service_id: 1,
        created_at: '2026-02-28T02:38:28.000Z',
        updated_at: '2026-02-28T02:38:28.000Z',
        user: {
          id: 2,
          username: 'lisi',
          phone: '13859968360',
          real_name: '李四',
        },
      },
    ]
    pagination.total = 2
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await serviceTicketApi.getTickets({})
    if (response.success) {
      const tickets = response.data.tickets || response.data.list || response.data || []
      stats.total = response.data.pagination?.total || tickets.length || 0
      stats.pending = tickets.filter((t) => t.status === 'pending').length
      stats.processing = tickets.filter((t) => t.status === 'processing').length
      stats.completed = tickets.filter(
        (t) => t.status === 'completed' || t.status === 'closed',
      ).length
    }
  } catch {
    stats.total = 15
    stats.pending = 5
    stats.processing = 3
    stats.completed = 7
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchTickets()
}

// 重置
const handleReset = () => {
  Object.keys(filters).forEach((key) => {
    filters[key] = ''
  })
  pagination.page = 1
  fetchTickets()
}

// 刷新
const refreshData = () => {
  fetchTickets()
  fetchStats()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  fetchTickets()
  fetchStats()
}

const handleExport = async () => {
  try {
    const params = {
      page: 1,
      pageSize: Math.max(pagination.total || ticketList.value.length || 0, 1000),
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
      工单ID: ticket.id,
      工单编号: normalizeExportValue(ticket.ticket_no),
      类型: getTypeText(ticket.type),
      标题: normalizeExportValue(ticket.title),
      发起人: normalizeExportValue(ticket.user?.real_name || ticket.user?.username),
      优先级: getPriorityText(ticket.priority),
      状态: getStatusText(ticket.status),
      关联订单: normalizeExportValue(ticket.order_id),
      处理人: normalizeExportValue(ticket.assignee),
      创建时间: normalizeExportValue(ticket.created_at),
    }))

    exportCsvFile(rows, '工单管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条工单数据`)
  } catch (error) {
    console.error('导出工单失败:', error)
    ElMessage.error(error.message || '导出工单失败')
  }
}

// 查看工单
const viewTicket = async (row) => {
  try {
    const response = await serviceTicketApi.getTicketById(row.id)
    if (response.success) {
      detailDrawer.data = response.data
      detailDrawer.visible = true
    }
  } catch {
    // 使用行数据作为详情
    detailDrawer.data = {
      ...row,
      records: [
        {
          action: 'create',
          action_text: '创建工单',
          content: row.description,
          operator: { name: '系统' },
          created_at: row.created_at,
        },
      ],
    }
    detailDrawer.visible = true
  }
}

const contactTicketUser = async (ticket) => {
  const userId = Number(ticket?.user_id || ticket?.user?.id || 0)
  if (!userId) {
    ElMessage.warning('未找到用户信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      user_id: userId,
      order_id: ticket?.order_id || undefined,
      initial_message: `您好，这里是平台客服，关于工单「${ticket?.title || ticket?.ticket_no || ''}」需要和您沟通。`,
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

const contactTicketDeliverer = async (ticket) => {
  const delivererId = Number(ticket?.deliverer_id || ticket?.order?.deliverer_id || 0)
  if (!delivererId) {
    ElMessage.warning('未找到配送员信息')
    return
  }

  try {
    const response = await serviceChatApi.createConversation({
      deliverer_id: delivererId,
      order_id: ticket?.order_id || undefined,
      initial_message: `您好，这里是平台客服，关于工单「${ticket?.title || ticket?.ticket_no || ''}」需要和您沟通。`,
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

// 提交处理
const submitHandle = async () => {
  if (!handleForm.content) {
    ElMessage.warning('请输入回复内容')
    return
  }

  handleForm.loading = true
  try {
    // 更新状态
    await serviceTicketApi.updateTicketStatus(detailDrawer.data.id, {
      status: handleForm.status,
      solution: handleForm.content,
    })

    ElMessage.success('处理提交成功')
    handleForm.content = ''
    handleForm.status = 'processing'
    detailDrawer.visible = false
    fetchTickets()
    fetchStats()
  } catch {
    ElMessage.error('处理失败')
  } finally {
    handleForm.loading = false
  }
}

// 操作处理
const handleAction = (command, row) => {
  switch (command) {
    case 'assign':
      assignDialog.data = row
      assignDialog.form.assignee_id = ''
      assignDialog.visible = true
      break
    case 'close':
      closeTicket(row)
      break
  }
}

// 关闭工单
const closeTicket = async (row) => {
  try {
    await ElMessageBox.confirm('确定要关闭此工单吗？', '确认操作', { type: 'warning' })

    const response = await serviceTicketApi.updateTicketStatus(row.id, { status: 'closed' })
    if (response.success) {
      ElMessage.success('工单已关闭')
      fetchTickets()
      fetchStats()
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
    }
  }
}

// 分配处理人
const submitAssign = async () => {
  if (!assignDialog.form.assignee_id) {
    ElMessage.warning('请选择处理人')
    return
  }

  try {
    await serviceTicketApi.assignTicket(assignDialog.data.id, {
      assignee_id: assignDialog.form.assignee_id,
    })

    ElMessage.success('分配成功')
    assignDialog.visible = false
    fetchTickets()
  } catch {
    ElMessage.error('分配失败')
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
    dispute: '争议',
    suggestion: '建议',
    other: '其他',
  }
  return texts[type] || type
}

const getTypeTagType = (type) => {
  const types = {
    complaint: 'danger',
    refund: 'warning',
    dispute: 'info',
    suggestion: 'success',
    other: '',
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
  return texts[priority] || priority
}

const getPriorityTagType = (priority) => {
  const types = {
    urgent: 'danger',
    high: 'warning',
    normal: '',
    low: 'info',
  }
  return types[priority] || ''
}

const getStatusText = (status) => {
  const texts = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    completed: '已完成',
    closed: '已关闭',
  }
  return texts[status] || status
}

const getStatusTagType = (status) => {
  const types = {
    pending: 'warning',
    processing: 'info',
    resolved: 'success',
    completed: 'success',
    closed: '',
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
  fetchTickets()
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

.stat-icon.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.processing {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-icon.completed {
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
  border-radius: var(--radius-xl);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.filter-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.filter-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.filter-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-secondary);
}

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  color: var(--text-primary);
}

.ticket-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  flex-shrink: 0;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 12px 16px;
  /* background: var(--bg-color, #f5f7fa); */
  border-radius: var(--radius-lg, 12px);
}

/* 用户单元格 */
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 状态圆点 */
.status-dot {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.875rem;
}

.status-dot-inner {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.pending .status-dot-inner {
  background: var(--warning, #e6a23c);
}

.status-dot.processing .status-dot-inner {
  background: var(--primary, #6366f1);
}

.status-dot.completed .status-dot-inner {
  background: var(--success, #67c23a);
}

.status-dot.closed .status-dot-inner {
  background: var(--info, #909399);
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

/* 详情抽屉 */
.ticket-header {
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.ticket-info {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
}

.ticket-header h3 {
  margin: 0 0 12px 0;
  font-size: 1.1rem;
}

.ticket-meta {
  margin: 0;
  color: #909399;
  font-size: 0.85rem;
}

.ticket-meta span {
  margin-right: 16px;
}

.section {
  margin-bottom: 20px;
}

.section h4 {
  margin: 0 0 16px 0;
  color: #2c3e50;
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-profile .user-info .name {
  font-weight: 500;
  margin-bottom: 4px;
}

.user-profile .user-info .contact {
  font-size: 0.85rem;
  color: #909399;
}

.ticket-content {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
  line-height: 1.6;
}

.ticket-images {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.ticket-image {
  width: 100px;
  height: 100px;
  border-radius: 8px;
  cursor: pointer;
}

.record-item {
  padding: 12px;
  background: #f5f7fa;
  border-radius: 8px;
}

.record-action {
  font-weight: 500;
  margin-bottom: 4px;
}

.record-content {
  font-size: 0.9rem;
  color: #606266;
  margin-bottom: 8px;
}

.record-operator {
  font-size: 0.8rem;
  color: #909399;
}

/* 工单编号 */
.ticket-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--secondary);
}

/* 工单标题 */
.ticket-title {
  font-weight: 500;
  color: var(--text-primary);
}

/* 用户单元格 */
.user-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-cell .el-avatar {
  background: var(--color-avatar-bg);
  flex-shrink: 0;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}
</style>
