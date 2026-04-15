<template>
  <div class="task-management">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="任务管理"
      subtitle="管理学生发布的各类任务"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出"
      @change="handleDateRangeChange"
      @action="exportTasks"
    />

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline class="filter-form">
        <el-form-item label="任务分类">
          <el-select
            v-model="filters.category"
            placeholder="全部分类"
            clearable
            style="width: 140px"
          >
            <el-option label="学习类" value="study" />
            <el-option label="设计类" value="design" />
            <el-option label="技术类" value="tech" />
            <el-option label="文案类" value="writing" />
            <el-option label="生活服务" value="life" />
          </el-select>
        </el-form-item>

        <el-form-item label="任务状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待审核" value="pending" />
            <el-option label="已发布" value="published" />
            <el-option label="进行中" value="in_progress" />
            <el-option label="已完成" value="completed" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </el-form-item>

        <el-form-item label="支付状态">
          <el-select
            v-model="filters.paymentStatus"
            placeholder="全部"
            clearable
            style="width: 140px"
          >
            <el-option label="未支付" value="unpaid" />
            <el-option label="已支付" value="paid" />
            <el-option label="已退款" value="refunded" />
          </el-select>
        </el-form-item>

        <el-form-item label="价格范围">
          <el-input-number
            v-model="filters.minPrice"
            placeholder="最低"
            :min="0"
            controls-position="right"
            style="width: 110px"
          />
          <span class="price-separator">-</span>
          <el-input-number
            v-model="filters.maxPrice"
            placeholder="最高"
            :min="0"
            controls-position="right"
            style="width: 110px"
          />
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="任务号/标题/发布者"
            clearable
            prefix-icon="Search"
            style="width: 180px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="searchTasks">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="resetFilters">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 任务列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="tasks" stripe style="width: 100%">
        <el-table-column prop="task_no" label="任务号" align="center" min-width="180">
          <template #default="{ row }">
            <span class="task-no">{{ row.task_no }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" align="center">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" effect="light" round size="small">
              {{ getCategoryText(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="任务标题" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="task-title">
              <span>{{ row.title }}</span>
              <el-tooltip v-if="row.status === 'pending' && row.cancel_reason" :content="row.cancel_reason" placement="top">
                <el-tag size="small" type="warning">预审命中</el-tag>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <!-- <el-table-column label="标签" width="90" align="center">
          <template #default="{ row }">
            <div class="tag-cell">
              <el-tag v-if="row.urgent" type="danger" size="small" effect="dark">加急</el-tag>
              <el-tag v-if="row.remote_work" type="success" size="small" effect="dark">远程</el-tag>
            </div>
          </template>
        </el-table-column> -->
        <el-table-column prop="publisher" label="发布者" align="center">
          <template #default="{ row }">
            <div class="publisher-cell">
              <el-avatar :size="28" class="publisher-avatar">
                {{ row.publisher?.real_name?.charAt(0) || 'U' }}
              </el-avatar>
              <span>{{ row.publisher?.real_name || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="assignee" label="接单人" align="center">
          <template #default="{ row }">
            <span v-if="row.assignee">{{ row.assignee?.real_name || '-' }}</span>
            <span v-else class="text-muted">待接取</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="任务报酬" align="center">
          <template #default="{ row }">
            <span class="price">¥{{ row.price }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="payment_status" label="支付" align="center">
          <template #default="{ row }">
            <el-tag :type="getPaymentStatusTagType(row.payment_status)" size="small">
              {{ getPaymentStatusText(row.payment_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" effect="light" round size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="view_count" label="浏览" align="center">
          <template #default="{ row }">
            <span class="view-count">{{ row.view_count || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="deadline" label="截止时间" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.deadline) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row.id)">
                查看
              </el-button>
              <template v-if="row.status === 'pending'">
                <el-button type="success" size="small" text @click="moderateTask(row, 'approve')">
                  通过
                </el-button>
                <el-button type="warning" size="small" text @click="moderateTask(row, 'reject')">
                  驳回
                </el-button>
              </template>
              <el-button type="danger" size="small" text @click="deleteTask(row)"> 删除 </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.current"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="moderateDialog.visible"
      title="任务审核"
      width="500px"
      class="moderate-dialog"
    >
      <el-form :model="moderateDialog.form" label-width="100px">
        <el-form-item label="任务标题">
          <span class="dialog-task-title">{{ moderateDialog.form.title }}</span>
        </el-form-item>
        <el-form-item label="审核操作" required>
          <el-radio-group v-model="moderateDialog.form.action">
            <el-radio value="approve">
              <el-icon><CircleCheck /></el-icon>
              通过审核
            </el-radio>
            <el-radio value="reject">
              <el-icon><CircleClose /></el-icon>
              驳回审核
            </el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见" v-if="moderateDialog.form.action === 'reject'">
          <el-input
            v-model="moderateDialog.form.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入驳回原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="moderateDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitModerate" :loading="moderateDialog.loading"
          >提交</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Search,
  RefreshRight,
  CircleCheck,
  CircleClose,
} from '@element-plus/icons-vue'
import { taskManagementApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const router = useRouter()

const loading = ref(false)
const tasks = ref([])
const dateRange = ref([])

const filters = reactive({
  category: '',
  status: '',
  paymentStatus: '',
  minPrice: null,
  maxPrice: null,
  search: '',
})

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
})

const moderateDialog = reactive({
  visible: false,
  loading: false,
  form: {
    taskId: null,
    title: '',
    action: 'approve',
    reason: '',
  },
})

const queryParams = computed(() => {
  const params = {
    page: pagination.current,
    limit: pagination.pageSize,
  }

  if (filters.category) params.category = filters.category
  if (filters.status) params.status = filters.status
  if (filters.paymentStatus) params.payment_status = filters.paymentStatus
  if (filters.search) params.search = filters.search
  if (filters.minPrice) params.min_price = filters.minPrice
  if (filters.maxPrice) params.max_price = filters.maxPrice
  if (dateRange.value?.length === 2) {
    params.startDate = dateRange.value[0]
    params.endDate = dateRange.value[1]
  }

  return params
})

const fetchTasks = async () => {
  loading.value = true
  try {
    const response = await taskManagementApi.getTasks(queryParams.value)
    if (response.success) {
      tasks.value = response.data.tasks
      pagination.total = response.data.pagination.total
    }
  } catch (error) {
    ElMessage.error('获取任务列表失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const searchTasks = () => {
  pagination.current = 1
  fetchTasks()
}

const resetFilters = () => {
  Object.assign(filters, {
    category: '',
    status: '',
    paymentStatus: '',
    minPrice: null,
    maxPrice: null,
    search: '',
  })
  searchTasks()
}

const handleDateRangeChange = () => {
  pagination.current = 1
  fetchTasks()
}

const viewDetail = (id) => {
  router.push(`/tasks/${id}`)
}

const moderateTask = (task, action) => {
  moderateDialog.form.taskId = task.id
  moderateDialog.form.title = task.title
  moderateDialog.form.action = action
  moderateDialog.form.reason = ''
  moderateDialog.visible = true
}

const submitModerate = async () => {
  if (moderateDialog.form.action === 'reject' && !moderateDialog.form.reason) {
    ElMessage.warning('请输入驳回原因')
    return
  }

  moderateDialog.loading = true
  try {
    // 根据操作类型设置状态：approve -> published, reject -> cancelled
    const newStatus = moderateDialog.form.action === 'approve' ? 'published' : 'cancelled'
    const response = await taskManagementApi.updateTaskStatus(
      moderateDialog.form.taskId,
      newStatus,
      moderateDialog.form.reason,
    )

    if (response.success) {
      ElMessage.success(`任务${moderateDialog.form.action === 'approve' ? '通过' : '驳回'}成功`)
      moderateDialog.visible = false
      fetchTasks()
    }
  } catch (error) {
    ElMessage.error('审核失败: ' + error.message)
  } finally {
    moderateDialog.loading = false
  }
}

const deleteTask = async (task) => {
  try {
    await ElMessageBox.confirm(`确定要删除任务 ${task.task_no} 吗？此操作不可恢复。`, '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await taskManagementApi.deleteTask(task.id)
    if (response.success) {
      ElMessage.success('任务删除成功')
      fetchTasks()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除任务失败: ' + error.message)
    }
  }
}

const exportTasks = async () => {
  try {
    const params = {
      ...queryParams.value,
      page: 1,
      limit: Math.max(pagination.total || tasks.value.length || 0, 1000),
    }

    const response = await taskManagementApi.getTasks(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const list = response.data?.tasks || []
    const rows = list.map((task) => ({
      任务ID: task.id,
      任务号: normalizeExportValue(task.task_no),
      分类: getCategoryText(task.category),
      标题: normalizeExportValue(task.title),
      发布者: normalizeExportValue(task.publisher?.username),
      接受者: normalizeExportValue(task.assignee?.username),
      价格: normalizeExportValue(task.price),
      状态: getStatusText(task.status),
      支付状态: normalizeExportValue(task.payment_status),
      截止时间: normalizeExportValue(task.deadline),
      创建时间: normalizeExportValue(task.created_at),
    }))

    exportCsvFile(rows, '任务管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条任务数据`)
  } catch (error) {
    console.error('导出任务失败:', error)
    ElMessage.error(error.message || '导出任务失败')
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.current = 1
  fetchTasks()
}

const handleCurrentChange = (val) => {
  pagination.current = val
  fetchTasks()
}

const getCategoryText = (category) => {
  const categoryMap = {
    study: '学习类',
    design: '设计类',
    tech: '技术类',
    writing: '文案类',
    life: '生活服务',
  }
  return categoryMap[category] || category
}

const getCategoryTagType = (category) => {
  const categoryMap = {
    study: 'primary',
    design: 'success',
    tech: 'warning',
    writing: 'info',
    life: 'danger',
  }
  return categoryMap[category] || ''
}

const getStatusText = (status) => {
  const statusMap = {
    pending: '待审核',
    published: '已发布',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    published: 'info',
    in_progress: 'primary',
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

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  fetchTasks()
})
</script>

<style scoped>
.task-management {
  max-width: 1600px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
  margin: 0;
}

.page-subtitle {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
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

.price-separator {
  margin: 0 8px;
  color: var(--text-tertiary);
}

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}

/* 任务号 */
.task-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--secondary);
}

/* 任务标题 */
.task-title {
  font-weight: 500;
  color: var(--text-primary);
}

/* 发布者单元格 */
.publisher-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.publisher-avatar {
  background: var(--color-avatar-bg);
  flex-shrink: 0;
}

/* 价格 */
.price {
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

/* 状态单元格 */
.status-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.status-dot.pending {
  background: var(--accent-warning);
}

.status-dot.published {
  background: var(--accent-info);
}

.status-dot.in_progress {
  background: var(--primary);
}

.status-dot.completed {
  background: var(--accent-success);
}

.status-dot.cancelled {
  background: var(--accent-danger);
}

/* 时间文本 */
.time-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 标签单元格 */
.tag-cell {
  display: flex;
  gap: 4px;
  justify-content: center;
}

/* 浏览数 */
.view-count {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 文字颜色 */
.text-muted {
  color: var(--text-tertiary);
  font-size: 0.85rem;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* 分页 */
.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 审核对话框 */
.moderate-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

.dialog-task-title {
  font-weight: 500;
  color: var(--text-primary);
}

.moderate-dialog :deep(.el-radio-group) {
  display: flex;
  gap: 20px;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }
}
</style>
