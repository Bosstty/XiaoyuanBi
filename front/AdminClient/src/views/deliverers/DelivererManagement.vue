<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">配送员管理</h2>
        <p class="page-subtitle">管理平台配送员信息、审核申请及日常运营</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon blue">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalDeliverers }}</div>
            <div class="stat-label">配送员总数</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon green">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.activeDeliverers }}</div>
            <div class="stat-label">活跃配送员</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon orange">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pendingVerification }}</div>
            <div class="stat-label">待审核</div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="never">
          <div class="stat-icon purple">
            <el-icon><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.todayNew }}</div>
            <div class="stat-label">今日新增</div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 筛选卡片 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="searchForm" inline class="filter-form">
        <el-form-item label="关键词搜索">
          <el-input
            v-model="searchForm.keyword"
            placeholder="姓名/手机号/身份证"
            clearable
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="全部状态"
            clearable
            style="width: 140px"
          >
            <el-option label="全部" value="" />
            <el-option label="在职" value="active" />
            <el-option label="休息中" value="inactive" />
            <el-option label="暂停服务" value="suspended" />
            <el-option label="已封禁" value="banned" />
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

    <!-- 配送员列表 -->
    <el-card class="table-card" shadow="never">
      <template #header>
        <div class="card-header">
          <span>配送员列表</span>
          <el-tag type="info">共 {{ pagination.total }} 人</el-tag>
        </div>
      </template>

      <el-table v-loading="loading" :data="delivererList" stripe style="width: 100%">
        <el-table-column label="配送员" align="center" min-width="180">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :size="48" :src="row.user?.avatar || row.avatar">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <div class="user-detail">
                <div class="name">{{ row.real_name }}</div>
                <div class="phone">{{ row.phone }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="学号" align="center" min-width="120">
          <template #default="{ row }">
            {{ row.user?.student_id || '-' }}
          </template>
        </el-table-column>

        <el-table-column label="出行方式" align="center" min-width="100">
          <template #default="{ row }">
            <el-tag :type="getVehicleType(row.vehicle_type)" size="small">
              {{ getVehicleText(row.vehicle_type) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="在线状态" align="center" min-width="90">
          <template #default="{ row }">
            <span class="status-dot" :class="row.is_online ? 'online' : 'offline'">
              <span class="status-dot-inner"></span>
              {{ row.is_online ? '在线' : '离线' }}
            </span>
          </template>
        </el-table-column>

        <el-table-column label="认证信息" align="center" min-width="120">
          <template #default="{ row }">
            <div class="verify-info">
              <el-tag :type="getApplicationStatusType(row.application_status)" size="small">
                {{ getApplicationStatusText(row.application_status) }}
              </el-tag>
              <span class="verify-time" v-if="row.approval_time">
                {{ formatDate(row.approval_time) }}
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="订单统计" align="center" min-width="150">
          <template #default="{ row }">
            <div class="order-stats">
              <div class="stat-item">
                <span class="stat-num">{{ row.total_orders || 0 }}</span>
                <span class="stat-label">总订单</span>
              </div>
              <div class="stat-item">
                <span class="stat-num success">{{ row.completed_orders || 0 }}</span>
                <span class="stat-label">完成</span>
              </div>
              <div class="stat-item">
                <span class="stat-num danger">{{ row.cancelled_orders || 0 }}</span>
                <span class="stat-label">取消</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="收入" align="center" min-width="100">
          <template #default="{ row }">
            <span class="earnings">¥{{ parseFloat(row.total_earnings || 0).toFixed(2) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="评分" align="center" min-width="120">
          <template #default="{ row }">
            <div class="rating">
              <el-rate
                :model-value="parseFloat(row.rating) || 5"
                disabled
                show-score
                text-color="#ff9900"
              />
            </div>
          </template>
        </el-table-column>

        <el-table-column label="状态" align="center" min-width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="注册时间" align="center" min-width="160">
          <template #default="{ row }">
            {{ formatDateTime(row.createdAt) }}
          </template>
        </el-table-column>

        <el-table-column label="操作" fixed="right" align="center" min-width="180">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" size="small" @click="viewDetail(row)">查看</el-button>
              <el-dropdown @command="(cmd) => handleAction(cmd, row)">
                <el-button link type="primary" size="small">
                  更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item
                      v-if="row.status === 'active'"
                      command="suspend"
                    >
                      <el-icon><Lock /></el-icon>
                      暂停服务
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="row.status === 'suspended' || row.status === 'inactive'"
                      command="activate"
                    >
                      <el-icon><Unlock /></el-icon>
                      恢复正常
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="row.application_status !== 'banned'"
                      command="ban"
                      divided
                    >
                      <el-icon><Delete /></el-icon>
                      <span style="color: #f56c6c">封禁账号</span>
                    </el-dropdown-item>
                    <el-dropdown-item
                      v-if="row.application_status === 'banned'"
                      command="unban"
                      divided
                    >
                      <el-icon><Unlock /></el-icon>
                      解封认证
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
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handlePageChange"
        />
      </div>
    </el-card>

    <!-- 审核对话框 -->
    <el-dialog
      v-model="verifyDialog.visible"
      title="配送员认证审核"
      width="500px"
      :close-on-click-modal="false"
    >
      <div class="verify-content">
        <div class="user-card">
          <el-avatar :size="64" :src="verifyDialog.data?.user?.avatar || verifyDialog.data?.avatar">
            <el-icon :size="32"><UserFilled /></el-icon>
          </el-avatar>
          <div class="info">
            <h3>{{ verifyDialog.data?.real_name }}</h3>
            <p>{{ verifyDialog.data?.phone }}</p>
            <p>{{ verifyDialog.data?.user?.student_id }}</p>
          </div>
        </div>

        <el-descriptions :column="1" border class="verify-info-card">
          <el-descriptions-item label="注册时间">
            {{ formatDateTime(verifyDialog.data?.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="出行方式">
            {{ getVehicleText(verifyDialog.data?.vehicle_type) }}
          </el-descriptions-item>
          <el-descriptions-item label="紧急联系人">
            {{ verifyDialog.data?.emergency_contact_name || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="紧急联系电话">
            {{ verifyDialog.data?.emergency_contact_phone || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="身份证号">
            {{ verifyDialog.data?.id_card || '未填写' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <el-button @click="verifyDialog.visible = false">取消</el-button>
        <el-button type="danger" @click="handleVerifyResult(false)">拒绝申请</el-button>
        <el-button type="success" @click="handleVerifyResult(true)" :loading="verifyDialog.loading">
          通过审核
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <DelivererDetail v-model="detailDrawer.visible" :deliverer="detailDrawer.data" />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  RefreshLeft,
  UserFilled,
  CircleCheck,
  Clock,
  TrendCharts,
  ArrowDown,
  Lock,
  Unlock,
  Delete,
} from '@element-plus/icons-vue'
import { delivererManagementApi } from '@/api'
import DelivererDetail from './DelivererDetail.vue'

const loading = ref(false)
const delivererList = ref([])

const searchForm = reactive({
  keyword: '',
  status: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0,
})

const stats = reactive({
  totalDeliverers: 0,
  activeDeliverers: 0,
  pendingVerification: 0,
  todayNew: 0,
  avgRating: 0,
})

const verifyDialog = reactive({
  visible: false,
  loading: false,
  data: null,
})

const detailDrawer = reactive({
  visible: false,
  data: null,
  logs: [],
})

// 获取配送员列表
const fetchDeliverers = async () => {
  loading.value = true
  try {
    // 构建查询参数
    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
    }

    // 添加关键词搜索
    if (searchForm.keyword) {
      params.keyword = searchForm.keyword
    }

    // 添加状态筛选
    if (searchForm.status) {
      params.status = searchForm.status
    }

    const response = await delivererManagementApi.getDeliverers(params)
    console.log('配送员列表响应:', response)
    if (response.success) {
      const data = response.data
      delivererList.value = data.deliverers || []
      if (data.pagination) {
        pagination.total = data.pagination.total || 0
      }
    }
  } catch (error) {
    console.error('获取配送员列表失败:', error)
    ElMessage.error('获取配送员列表失败')
  } finally {
    loading.value = false
  }
}

// 获取统计数据
const fetchStats = async () => {
  try {
    const response = await delivererManagementApi.getDelivererStats()
    if (response.success) {
      const overview = response.data.overview || {}
      stats.totalDeliverers = overview.totalDeliverers || 0
      stats.activeDeliverers = overview.activeDeliverers || 0
      stats.pendingVerification = overview.pendingVerification || 0
      stats.todayNew = overview.todayNew || 0
      stats.avgRating = overview.avgRating || 0
    }
  } catch (error) {
    console.error('获取统计数据失败:', error)
    // 使用默认数据
    stats.totalDeliverers = 0
    stats.activeDeliverers = 0
    stats.pendingVerification = 0
    stats.todayNew = 0
    stats.avgRating = 0
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchDeliverers()
}

// 重置
const handleReset = () => {
  Object.keys(searchForm).forEach((key) => {
    searchForm[key] = ''
  })
  pagination.page = 1
  fetchDeliverers()
}

// 查看详情
const viewDetail = async (row) => {
  try {
    const response = await delivererManagementApi.getDelivererById(row.id)
    if (response.success) {
      detailDrawer.data = response.data
      detailDrawer.logs = response.data.logs || []
      detailDrawer.visible = true
    }
  } catch {
    ElMessage.error('获取详情失败')
  }
}

// 审核结果
const handleVerifyResult = async (approved) => {
  verifyDialog.loading = true
  try {
    const response = await delivererManagementApi.verifyDeliverer(verifyDialog.data.id, {
      approved,
      reason: approved ? '' : '不符合配送员申请条件',
    })

    if (response.success) {
      ElMessage.success(approved ? '审核通过' : '已拒绝申请')
      verifyDialog.visible = false
      fetchDeliverers()
      fetchStats()
    }
  } catch {
    ElMessage.error('审核失败')
  } finally {
    verifyDialog.loading = false
  }
}

// 操作处理
const handleAction = async (command, row) => {
  switch (command) {
    case 'activate':
      await handleStatusChange(row, 'active')
      break
    case 'suspend':
      await handleStatusChange(row, 'suspended')
      break
    case 'inactive':
      await handleStatusChange(row, 'inactive')
      break
    case 'ban':
      await handleBan(row)
      break
    case 'unban':
      await handleUnban(row)
      break
  }
}

// 状态变更
const handleStatusChange = async (row, status) => {
  try {
    const statusText = {
      active: '在职',
      inactive: '休息中',
      suspended: '暂停服务',
      banned: '已封禁',
    }
    const action = statusText[status] || status

    await ElMessageBox.confirm(
      `确定要将配送员 "${row.real_name}" 的状态改为"${action}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await delivererManagementApi.updateDelivererStatus(row.id, status)
    if (response.success) {
      ElMessage.success(`状态更新成功`)
      fetchDeliverers()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('状态变更失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 封禁
const handleBan = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要封禁配送员 "${row.real_name}" 吗？此操作将禁止其登录系统。`,
      '危险操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'error',
      },
    )

    // 封禁时需要传递 reason，但 API 设计是需要 reason 的
    const response = await delivererManagementApi.deleteDeliverer(row.id, {
      reason: '管理员封禁',
      permanent: true,
    })
    if (response.success) {
      ElMessage.success('封禁成功')
      fetchDeliverers()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('封禁失败:', error)
      ElMessage.error(error.message || '操作失败')
    }
  }
}

const handleUnban = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要解封配送员 "${row.real_name}" 的认证信息吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await delivererManagementApi.unbanDeliverer(row.id)
    if (response.success) {
      ElMessage.success('解封成功')
      fetchDeliverers()
      fetchStats()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解封失败:', error)
      ElMessage.error(error.message || '解封失败')
    }
  }
}

// 分页
const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize
  pagination.page = 1
  fetchDeliverers()
}

const handlePageChange = (newPage) => {
  pagination.page = newPage
  fetchDeliverers()
}

// 工具函数
const getStatusType = (status) => {
  const types = {
    active: 'success',
    inactive: 'warning',
    suspended: 'danger',
    banned: 'danger',
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    active: '在职',
    inactive: '休息中',
    suspended: '暂停服务',
    banned: '已封禁',
  }
  return texts[status] || '未知'
}

// 出行方式
const getVehicleType = (type) => {
  const types = {
    walk: 'info',
    bike: 'success',
    electric: 'warning',
    motor: 'danger',
  }
  return types[type] || 'info'
}

const getVehicleText = (type) => {
  const texts = {
    walk: '步行',
    bike: '自行车',
    electric: '电动车',
    motor: '摩托车',
  }
  return texts[type] || '未知'
}

// 认证状态
const getApplicationStatusText = (status) => {
  const texts = {
    approved: '已认证',
    pending: '待审核',
    rejected: '已拒绝',
    banned: '已封禁',
  }
  return texts[status] || '未知'
}

const getApplicationStatusType = (status) => {
  const types = {
    approved: 'success',
    pending: 'warning',
    rejected: 'danger',
    banned: 'danger',
  }
  return types[status] || 'info'
}

const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchDeliverers()
  fetchStats()
})
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
  /* padding: 20px; */
}

/* 页面头部 */
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
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

.stat-icon.blue {
  background: rgba(99, 102, 241, 0.1);
}

.stat-icon.blue .el-icon {
  color: #6366f1;
}

.stat-icon.green {
  background: rgba(16, 185, 129, 0.1);
}

.stat-icon.green .el-icon {
  color: #10b981;
}

.stat-icon.orange {
  background: rgba(245, 158, 11, 0.1);
}

.stat-icon.orange .el-icon {
  color: #f59e0b;
}

.stat-icon.purple {
  background: rgba(139, 92, 246, 0.1);
}

.stat-icon.purple .el-icon {
  color: #8b5cf6;
}

.stat-icon.purple .el-icon {
  color: #8b5cf6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.8rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.2;
}

.stat-label {
  font-size: 0.85rem;
  color: #909399;
  margin-top: 4px;
}

/* 筛选卡片 */
.filter-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl, 16px);
  border: 1px solid var(--el-border-color-light, #e4e7ed);
}

/* 子导航 */
.sub-nav {
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter, #ebeef5);
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

/* 用户信息 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-detail .name {
  font-weight: 500;
  color: #2c3e50;
}

.user-detail .phone {
  font-size: 0.85rem;
  color: #909399;
}

.verify-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.verify-time {
  font-size: 0.8rem;
  color: #909399;
}

.today-stats {
  display: flex;
  gap: 12px;
  justify-content: center;
  font-size: 0.85rem;
  color: #606266;
}

.today-stats span {
  display: flex;
  align-items: center;
  gap: 4px;
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

.status-dot.active .status-dot-inner {
  background: var(--success, #67c23a);
}

.status-dot.resting .status-dot-inner {
  background: var(--warning, #e6a23c);
}

.status-dot.disabled .status-dot-inner {
  background: var(--danger, #f56c6c);
}

.status-dot.online .status-dot-inner {
  background: #67c23a;
}

.status-dot.offline .status-dot-inner {
  background: #909399;
}

/* 订单统计 */
.order-stats {
  display: flex;
  gap: 8px;
  justify-content: center;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 40px;
}

.stat-num {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--primary);
}

.stat-num.success {
  color: #67c23a;
}

.stat-num.danger {
  color: #f56c6c;
}

.stat-label {
  font-size: 0.7rem;
  color: #909399;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-buttons .el-button {
  padding: 4px 8px;
}

/* 收入 */
.earnings {
  font-weight: 600;
  color: #67c23a;
  font-family: 'Fira Code', monospace;
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

/* 审核对话框 */
.verify-content {
  padding: 0 20px;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 12px;
  margin-bottom: 20px;
}

.user-card .info h3 {
  margin: 0 0 8px 0;
}

.user-card .info p {
  margin: 0 0 4px 0;
  color: #606266;
}

.verify-info-card {
  margin-top: 20px;
}

/* 详情抽屉 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  color: white;
}

.detail-header h3 {
  margin: 0 0 8px 0;
}

.detail-header p {
  margin: 0 0 8px 0;
  opacity: 0.9;
}

.tags {
  display: flex;
  gap: 8px;
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
</style>
