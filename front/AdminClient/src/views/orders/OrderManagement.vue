<template>
  <div class="order-management">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="订单管理"
      subtitle="管理平台所有代取/代购订单"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出"
      @change="handleDateRangeChange"
      @action="exportOrders"
    />

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline class="filter-form">
        <el-form-item label="订单类型">
          <el-select v-model="filters.type" placeholder="全部类型" clearable style="width: 140px">
            <el-option label="快递代取" value="express" />
            <el-option label="外卖代取" value="food" />
            <el-option label="药品代购" value="medicine" />
            <el-option label="生活用品" value="daily" />
          </el-select>
        </el-form-item>

        <el-form-item label="订单状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 140px">
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="取货中" value="picking" />
            <el-option label="配送中" value="delivering" />
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

        <el-form-item label="关键词搜索">
          <el-input
            v-model="filters.keyword"
            placeholder="订单号/标题"
            clearable
            prefix-icon="Search"
            style="width: 180px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="searchOrders">
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

    <!-- 订单列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="orders" stripe style="width: 100%">
        <el-table-column prop="order_no" label="订单号" align="center" min-width="180">
          <template #default="{ row }">
            <span class="order-no">{{ row.order_no }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" align="center">
          <template #default="{ row }">
            <div class="type-cell">
              <el-icon><component :is="getTypeIcon(row.type)" /></el-icon>
              {{ getTypeText(row.type) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="title" label="订单标题" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="order-title">{{ row.title }}</div>
          </template>
        </el-table-column>
        <el-table-column
          prop="pickup_location"
          label="取件地点"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="location-text">{{ row.pickup_location || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column
          prop="delivery_location"
          label="配送地点"
          align="center"
          show-overflow-tooltip
        >
          <template #default="{ row }">
            <span class="location-text">{{ row.delivery_location || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="contact_name" label="联系人" align="center" />
        <el-table-column prop="contact_phone" label="联系电话" align="center">
          <template #default="{ row }">
            <span class="phone-text">{{ row.contact_phone || '-' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="price" label="金额" align="center">
          <template #default="{ row }">
            <div class="price-cell">
              <span class="price">¥{{ row.price }}</span>
              <span v-if="row.tip > 0" class="tip">+¥{{ row.tip }}</span>
            </div>
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
        <el-table-column prop="createdAt" label="创建时间" align="center">
          <template #default="{ row }">
            <span class="time-text">{{ formatDateTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row.id)">
                查看
              </el-button>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                text
                @click="openAssignDialog(row)"
              >
                分配
              </el-button>
              <el-button type="warning" size="small" text @click="editStatus(row)">
                状态
              </el-button>
              <el-button
                v-if="!['completed', 'cancelled'].includes(row.status)"
                type="danger"
                size="small"
                text
                @click="deleteOrder(row)"
              >
                取消
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
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 状态编辑对话框 -->
    <el-dialog
      v-model="statusDialog.visible"
      title="修改订单状态"
      width="500px"
      class="status-dialog"
    >
      <el-form :model="statusDialog.form" label-width="100px">
        <el-form-item label="当前状态">
          <el-tag :type="getStatusTagType(statusDialog.form.currentStatus)">
            {{ getStatusText(statusDialog.form.currentStatus) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="新状态" required>
          <el-select
            v-model="statusDialog.form.newStatus"
            placeholder="请选择状态"
            style="width: 100%"
          >
            <el-option label="待接单" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="取货中" value="picking" />
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

    <!-- 分配订单对话框 -->
    <el-dialog
      v-model="assignDialog.visible"
      title="分配订单"
      width="500px"
      class="assign-dialog"
    >
      <el-form :model="assignDialog.form" label-width="100px">
        <el-form-item label="订单号">
          <span>{{ assignDialog.form.orderNo }}</span>
        </el-form-item>
        <el-form-item label="订单类型">
          <el-tag>{{ getTypeText(assignDialog.form.type) }}</el-tag>
        </el-form-item>
        <el-form-item label="选择配送员" required>
          <el-select
            v-model="assignDialog.form.delivererId"
            placeholder="请选择配送员"
            filterable
            style="width: 100%"
            :loading="assignDialog.loading"
          >
            <el-option
              v-for="item in assignDialog.deliverers"
              :key="item.id"
              :label="`${item.real_name || item.user?.real_name || '未知'} - ${item.phone || item.user?.phone || '无电话'}`"
              :value="item.id"
            >
              <div class="deliverer-option">
                <span>{{ item.real_name || item.user?.real_name || '未知' }}</span>
                <span class="deliverer-phone">{{ item.phone || item.user?.phone || '' }}</span>
              </div>
            </el-option>
          </el-select>
          <div v-if="!assignDialog.loading && !assignDialog.deliverers.length" class="assign-empty">
            当前没有可分配的在线配送员
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="assignOrder" :loading="assignDialog.submitting">
          确定分配
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed, markRaw } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Search,
  RefreshRight,
  Box,
  Food,
  FirstAidKit,
  Shop,
} from '@element-plus/icons-vue'
import { orderManagementApi, delivererManagementApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const router = useRouter()

const loading = ref(false)
const orders = ref([])
const dateRange = ref([])

const filters = reactive({
  type: '',
  status: '',
  paymentStatus: '',
  keyword: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const statusDialog = reactive({
  visible: false,
  loading: false,
  form: {
    orderId: null,
    currentStatus: '',
    newStatus: '',
    remark: '',
  },
})

const assignDialog = reactive({
  visible: false,
  loading: false,
  submitting: false,
  form: {
    orderId: null,
    orderNo: '',
    type: '',
    delivererId: null,
  },
  deliverers: [],
})

const typeIconMap = {
  express: markRaw(Box),
  food: markRaw(Food),
  medicine: markRaw(FirstAidKit),
  daily: markRaw(Shop),
}

const getTypeIcon = (type) => {
  return typeIconMap[type] || markRaw(Box)
}

const queryParams = computed(() => {
  const params = {
    page: pagination.page,
    limit: pagination.pageSize,
  }

  if (filters.type) params.type = filters.type
  if (filters.status) params.status = filters.status
  if (filters.paymentStatus) params.payment_status = filters.paymentStatus
  if (filters.keyword) params.keyword = filters.keyword
  if (dateRange.value?.length === 2) {
    params.start_date = dateRange.value[0]
    params.end_date = dateRange.value[1]
  }

  return params
})

const fetchOrders = async () => {
  loading.value = true
  try {
    const response = await orderManagementApi.getOrders(queryParams.value)
    if (response.success) {
      orders.value = response.data?.orders || response.data || []
      const paginationData = response.pagination || response.data?.pagination || {}
      pagination.total = paginationData.total || 0
    }
  } catch (error) {
    console.error('获取订单列表失败:', error)
    ElMessage.error('获取订单列表失败')
  } finally {
    loading.value = false
  }
}

const searchOrders = () => {
  pagination.page = 1
  fetchOrders()
}

const resetFilters = () => {
  filters.type = ''
  filters.status = ''
  filters.paymentStatus = ''
  filters.keyword = ''
  pagination.page = 1
  fetchOrders()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  fetchOrders()
}

const refreshData = () => {
  fetchOrders()
  ElMessage.success('已刷新')
}

const viewDetail = (id) => {
  router.push(`/orders/${id}`)
}

const editStatus = (order) => {
  statusDialog.form.orderId = order.id
  statusDialog.form.currentStatus = order.status
  statusDialog.form.newStatus = order.status
  statusDialog.form.remark = ''
  statusDialog.visible = true
}

const openAssignDialog = async (order) => {
  assignDialog.form.orderId = order.id
  assignDialog.form.orderNo = order.order_no
  assignDialog.form.type = order.type
  assignDialog.form.delivererId = null
  assignDialog.deliverers = []
  assignDialog.loading = true
  assignDialog.visible = true

  try {
    // 获取可分配的在线配送员
    const response = await delivererManagementApi.getDeliverers({
      status: 'active',
      verified: 'true',
      online: 'true',
      limit: 100,
    })
    if (response.success) {
      assignDialog.deliverers = response.data?.deliverers || response.data || []
    }
  } catch {
    ElMessage.error('获取配送员列表失败')
  } finally {
    assignDialog.loading = false
  }
}

const assignOrder = async () => {
  if (!assignDialog.form.delivererId) {
    ElMessage.warning('请选择配送员')
    return
  }
  assignDialog.submitting = true
  try {
    const response = await orderManagementApi.batchAssignOrders({
      orderIds: [assignDialog.form.orderId],
      delivererId: assignDialog.form.delivererId,
    })
    if (response.success) {
      ElMessage.success('订单分配成功')
      assignDialog.visible = false
      fetchOrders()
    }
  } catch {
    ElMessage.error('分配失败')
  } finally {
    assignDialog.submitting = false
  }
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
      ElMessage.success('状态更新成功')
      statusDialog.visible = false
      fetchOrders()
    }
  } catch (error) {
    ElMessage.error('状态更新失败')
  } finally {
    statusDialog.loading = false
  }
}

const deleteOrder = async (order) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消订单 "${order.order_no}" 吗？此操作不可恢复！`,
      '取消订单',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    const response = await orderManagementApi.cancelOrder(order.id, {
      reason: '管理员取消',
    })
    if (response.success) {
      ElMessage.success('订单已取消')
      fetchOrders()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('取消订单失败')
    }
  }
}

const exportOrders = async () => {
  try {
    const params = {
      ...queryParams.value,
      page: 1,
      limit: Math.max(pagination.total || orders.value.length || 0, 1000),
    }

    const response = await orderManagementApi.getOrders(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const list = response.data?.orders || response.data || []
    const rows = list.map((order) => ({
      订单ID: order.id,
      订单号: normalizeExportValue(order.order_no),
      类型: getTypeText(order.type),
      标题: normalizeExportValue(order.title),
      用户: normalizeExportValue(order.user?.username || order.contact_name),
      配送员: normalizeExportValue(order.deliverer?.username),
      金额: normalizeExportValue(order.price),
      小费: normalizeExportValue(order.tip),
      状态: getStatusText(order.status),
      支付状态: normalizeExportValue(order.payment_status),
      创建时间: normalizeExportValue(order.created_at),
    }))

    exportCsvFile(rows, '订单管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条订单数据`)
  } catch (error) {
    console.error('导出订单失败:', error)
    ElMessage.error(error.message || '导出订单失败')
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.page = 1
  fetchOrders()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  fetchOrders()
}

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
    express: 'primary',
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
    picking: '取货中',
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
    picking: 'success',
    delivering: 'primary',
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
  return new Date(dateTime).toLocaleString('zh-CN')
}

onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  fetchOrders()
})
</script>

<style scoped>
.order-management {
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
}

/* 订单号 */
.order-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--primary);
}

/* 类型单元格 */
.type-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
}

.type-cell .el-icon {
  color: var(--primary);
}

/* 订单标题 */
.order-title {
  font-weight: 500;
  color: var(--text-primary);
}

/* 价格 */
.price {
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

.price-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.price-cell .tip {
  font-size: 0.75rem;
  color: var(--accent-warning);
  font-family: 'Fira Code', monospace;
}

/* 地点文本 */
.location-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 电话文本 */
.phone-text {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
}

/* 标签单元格 */
.tag-cell {
  display: flex;
  gap: 4px;
  justify-content: center;
}

/* 时间文本 */
.time-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
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

/* 状态对话框 */
.status-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

/* 分配对话框 */
.assign-dialog :deep(.el-dialog) {
  border-radius: var(--radius-xl);
}

/* 配送员选项 */
.deliverer-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.deliverer-phone {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: 'Fira Code', monospace;
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

  .filter-form :deep(.el-input),
  .filter-form :deep(.el-select),
  .filter-form :deep(.el-date-editor) {
    width: 100% !important;
  }
}
</style>
