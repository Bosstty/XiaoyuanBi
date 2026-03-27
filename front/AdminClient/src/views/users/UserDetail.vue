<template>
  <div class="user-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">
          <h1>用户详情</h1>
          <span class="user-id">ID: {{ userInfo.id }}</span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshData">刷新</el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <!-- 用户概览卡片 -->
      <el-card class="summary-card">
        <div class="user-summary">
          <div class="summary-left">
            <div class="user-avatar-wrapper">
              <el-avatar :size="80" :src="userInfo.avatar" class="user-avatar">
                {{ userInfo.username?.charAt(0) }}
              </el-avatar>
            </div>
            <div class="user-info">
              <h2>{{ userInfo.real_name || userInfo.username }}</h2>
              <div class="user-tags">
                <el-tag :type="userInfo.student_verified ? 'success' : 'warning'" effect="light">
                  {{ userInfo.student_verified ? '已认证学生' : '未认证' }}
                </el-tag>
                <el-tag type="warning" effect="dark">Lv.{{ userInfo.level }}</el-tag>
              </div>
            </div>
          </div>

          <div class="summary-right">
            <div class="stats-display">
              <div class="stat-item">
                <span class="stat-value">{{ userStats.total_orders || 0 }}</span>
                <span class="stat-label">总订单</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ userStats.published_tasks || 0 }}</span>
                <span class="stat-label">发布任务</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ userInfo.points || 0 }}</span>
                <span class="stat-label">积分</span>
              </div>
            </div>
            <div class="status-display">
              <el-tag size="large" :type="getStatusTagType(userInfo.status)" effect="dark">
                {{ getStatusText(userInfo.status) }}
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
              <el-descriptions-item label="用户ID">{{ userInfo.id }}</el-descriptions-item>
              <el-descriptions-item label="用户名">{{ userInfo.username }}</el-descriptions-item>
              <el-descriptions-item label="学号">{{
                userInfo.student_id || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="真实姓名">{{
                userInfo.real_name || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="手机号">
                <span class="phone">{{ userInfo.phone || '未填写' }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="邮箱">{{
                userInfo.email || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="性别">{{
                getGenderText(userInfo.gender)
              }}</el-descriptions-item>
              <el-descriptions-item label="生日">{{
                formatDate(userInfo.birthday) || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="学院">{{
                userInfo.college || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="专业">{{
                userInfo.major || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="年级">{{
                userInfo.grade || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="宿舍">{{
                userInfo.dormitory || '未填写'
              }}</el-descriptions-item>
              <el-descriptions-item label="账户余额">
                <span class="balance">¥{{ parseFloat(userInfo.balance || 0).toFixed(2) }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="用户评分">
                <el-rate :model-value="parseFloat(userInfo.rating || 5)" disabled size="small" />
              </el-descriptions-item>
              <el-descriptions-item label="注册时间" :span="2">{{
                formatDate(userInfo.createdAt)
              }}</el-descriptions-item>
              <el-descriptions-item label="更新时间" :span="2">{{
                formatDate(userInfo.updatedAt)
              }}</el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 个人简介 -->
          <el-card v-if="userInfo.bio" class="description-card">
            <template #header>
              <span>个人简介</span>
            </template>
            <div class="description-content">
              {{ userInfo.bio }}
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 验证状态 -->
        <el-tab-pane label="验证状态" name="verification">
          <el-card class="verification-card">
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="verification-item" :class="{ verified: isDelivererVerified }">
                  <div class="verification-icon">
                    <el-icon><Message /></el-icon>
                  </div>
                  <div class="verification-content">
                    <div class="verification-title">配送员认证</div>
                    <div class="verification-status">
                      {{ getDelivererVerificationText() }}
                    </div>
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="verification-item" :class="{ verified: hasDelivererApplication }">
                  <div class="verification-icon">
                    <el-icon><Phone /></el-icon>
                  </div>
                  <div class="verification-content">
                    <div class="verification-title">配送员审核</div>
                    <div class="verification-status-row">
                      <span class="verification-status">
                        {{ getDelivererApplicationStatusText() }}
                      </span>
                      <span v-if="userInfo.delivererProfile?.approval_time" class="verification-time">
                        {{ formatDate(userInfo.delivererProfile?.approval_time) }}
                      </span>
                    </div>
                  </div>
                </div>
              </el-col>
              <el-col :span="8">
                <div class="verification-item" :class="{ verified: userInfo.student_verified }">
                  <div class="verification-icon">
                    <el-icon><Ticket /></el-icon>
                  </div>
                  <div class="verification-content">
                    <div class="verification-title">学生认证</div>
                    <div class="verification-status-row">
                      <span class="verification-status">
                        {{ getStudentVerificationText() }}
                      </span>
                      <span v-if="userInfo.student_verified_at" class="verification-time">
                        {{ formatDate(userInfo.student_verified_at) }}
                      </span>
                    </div>
                    <div v-if="studentCardUrl" class="student-card-preview">
                      <span class="student-card-label">学生证照片</span>
                      <el-image
                        :src="studentCardUrl"
                        :preview-src-list="[studentCardUrl]"
                        fit="cover"
                        preview-teleported
                        class="student-card-image"
                      />
                    </div>
                    <div v-else class="student-card-empty">未上传学生证</div>
                  </div>
                </div>
              </el-col>
            </el-row>

            <div v-if="hasDelivererApplication" class="deliverer-certificates">
              <div class="deliverer-certificates__title">配送员认证照片</div>
              <div class="deliverer-certificates__grid">
                <div v-if="delivererIdCardFrontUrl" class="deliverer-certificate-card">
                  <div class="deliverer-certificate-label">身份证正面</div>
                  <el-image
                    :src="delivererIdCardFrontUrl"
                    :preview-src-list="[delivererIdCardFrontUrl]"
                    fit="cover"
                    class="deliverer-certificate-image"
                  />
                </div>
                <div v-if="delivererIdCardBackUrl" class="deliverer-certificate-card">
                  <div class="deliverer-certificate-label">身份证反面</div>
                  <el-image
                    :src="delivererIdCardBackUrl"
                    :preview-src-list="[delivererIdCardBackUrl]"
                    fit="cover"
                    class="deliverer-certificate-image"
                  />
                </div>
                <div v-if="delivererHealthCertificateUrl" class="deliverer-certificate-card">
                  <div class="deliverer-certificate-label">健康证照片</div>
                  <el-image
                    :src="delivererHealthCertificateUrl"
                    :preview-src-list="[delivererHealthCertificateUrl]"
                    fit="cover"
                    class="deliverer-certificate-image"
                  />
                </div>
              </div>
            </div>
          </el-card>

          <!-- 登录信息 -->
          <el-card class="login-info-card">
            <template #header>
              <span>登录信息</span>
            </template>
            <el-descriptions :column="2" border>
              <el-descriptions-item label="最后登录时间">
                {{ formatDate(userInfo.last_login_at) || '从未登录' }}
              </el-descriptions-item>
              <el-descriptions-item label="最后登录IP">
                {{ userInfo.last_login_ip || '-' }}
              </el-descriptions-item>
              <el-descriptions-item label="微信OpenID">
                {{ userInfo.wechat_openid || '未绑定' }}
              </el-descriptions-item>
            </el-descriptions>
          </el-card>
        </el-tab-pane>

        <!-- 订单记录 -->
        <el-tab-pane label="订单记录" name="orders">
          <el-card class="table-card">
            <template #header>
              <div class="card-header">
                <span>订单列表</span>
                <span class="record-count">共 {{ userOrders.length }} 条</span>
              </div>
            </template>
            <el-table :data="userOrders" style="width: 100%" v-if="userOrders.length > 0">
              <el-table-column prop="order_no" label="订单号" min-width="180" />
              <el-table-column prop="price" label="金额" width="100">
                <template #default="{ row }">
                  <span class="price">¥{{ parseFloat(row.price || 0).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getOrderStatusType(row.status)" size="small">
                    {{ getOrderStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="创建时间" min-width="180">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无订单记录" />
          </el-card>
        </el-tab-pane>

        <!-- 任务记录 -->
        <el-tab-pane label="任务记录" name="tasks">
          <el-card class="table-card">
            <template #header>
              <div class="card-header">
                <span>任务列表</span>
                <span class="record-count">共 {{ userTasks.length }} 条</span>
              </div>
            </template>
            <el-table :data="userTasks" style="width: 100%" v-if="userTasks.length > 0">
              <el-table-column prop="title" label="任务标题" min-width="180" />
              <el-table-column prop="price" label="赏金" width="100">
                <template #default="{ row }">
                  <span class="price">¥{{ parseFloat(row.price || 0).toFixed(2) }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="120">
                <template #default="{ row }">
                  <el-tag :type="getTaskStatusType(row.status)" size="small">
                    {{ getTaskStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="created_at" label="发布时间" min-width="180">
                <template #default="{ row }">
                  {{ formatDate(row.created_at) }}
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无任务记录" />
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
                  :type="userInfo.status === 'active' ? 'warning' : 'success'"
                  size="large"
                  @click="handleStatusChange"
                >
                  <el-icon><Lock /></el-icon>
                  {{ userInfo.status === 'active' ? '禁用用户' : '启用用户' }}
                </el-button>
                <p>{{ userInfo.status === 'active' ? '禁用该用户账号' : '恢复该用户账号' }}</p>
              </div>
              <div class="action-item">
                <el-button
                  v-if="!userInfo.student_verified"
                  type="success"
                  size="large"
                  @click="handleApproveStudentVerification"
                >
                  <el-icon><Tickets /></el-icon>
                  认证学生身份
                </el-button>
                <el-button
                  v-else
                  type="info"
                  size="large"
                  @click="handleCancelStudentVerification"
                >
                  <el-icon><Close /></el-icon>
                  取消学生认证
                </el-button>
                <p>{{ userInfo.student_verified ? '取消该用户的学生认证状态' : '通过该用户的学生认证' }}</p>
              </div>
              <div v-if="!userInfo.student_verified" class="action-item">
                <el-button
                  type="warning"
                  size="large"
                  @click="handleRejectStudentVerification"
                >
                  <el-icon><Close /></el-icon>
                  审核不通过
                </el-button>
                <p>驳回学生认证并发送原因给用户</p>
              </div>
              <div class="action-item">
                <el-button type="danger" size="large" @click="handleResetPassword">
                  <el-icon><Key /></el-icon>
                  重置密码
                </el-button>
                <p>重置该用户的登录密码</p>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  Lock,
  Message,
  Phone,
  Ticket,
  Tickets,
  Key,
  Close,
} from '@element-plus/icons-vue'
import { userManagementApi } from '../../api/index.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const userInfo = ref({})
const userOrders = ref([])
const userTasks = ref([])
const userStats = ref({})
const activeTab = ref('info')

const userId = route.params.id
const resolveAssetUrl = (value) => {
  if (!value) return ''
  if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value
  if (value.startsWith('/')) return `${window.location.origin}${value}`
  return value
}

const studentCardUrl = computed(() =>
  resolveAssetUrl(userInfo.value?.verification_data?.student_card),
)
const delivererProfile = computed(() => userInfo.value?.delivererProfile || null)
const hasDelivererApplication = computed(() => Boolean(delivererProfile.value?.id))
const isDelivererVerified = computed(
  () =>
    Boolean(delivererProfile.value?.verified) ||
    delivererProfile.value?.application_status === 'approved',
)
const delivererIdCardFrontUrl = computed(() =>
  resolveAssetUrl(delivererProfile.value?.id_card_front),
)
const delivererIdCardBackUrl = computed(() =>
  resolveAssetUrl(delivererProfile.value?.id_card_back),
)
const delivererHealthCertificateUrl = computed(() =>
  resolveAssetUrl(delivererProfile.value?.health_certificate),
)

// 获取用户详情
const fetchUserDetail = async () => {
  try {
    loading.value = true
    const response = await userManagementApi.getUserById(userId)
    console.log('用户详情:', response)

    if (response.success) {
      const data = response.data || {}
      userInfo.value = data
      userOrders.value = data.orders || []
      userTasks.value = data.publishedTasks || []
      userStats.value = data.stats || {}
      return
    }

    ElMessage.error(response.message || '获取用户详情失败')
  } catch (error) {
    console.error('获取用户详情失败:', error)
    ElMessage.error('获取用户详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/users')
}

const refreshData = () => {
  fetchUserDetail()
  ElMessage.success('已刷新')
}

// 状态变更
const handleStatusChange = async () => {
  try {
    const newStatus = userInfo.value.status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'inactive' ? '禁用' : '启用'

    await ElMessageBox.confirm(
      `确定要${action}用户 "${userInfo.value.username}" 吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await userManagementApi.updateUserStatus(userId, newStatus)
    if (response.success) {
      ElMessage.success(`${action}成功`)
      fetchUserDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('状态变更失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 认证学生身份
const handleApproveStudentVerification = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要认证用户 "${userInfo.value.username}" 的学生身份吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await userManagementApi.verifyStudent(userId, { verified: true })
    if (response.success) {
      ElMessage.success('认证成功')
      fetchUserDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('认证失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

const handleRejectStudentVerification = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      '请输入不通过原因，系统会自动给用户发送客服消息并清空认证资料。',
      '学生认证不通过',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：学生证照片不清晰，请重新上传',
        inputValidator: (inputValue) => {
          if (!inputValue || !inputValue.trim()) {
            return '请填写不通过原因'
          }
          return true
        },
      },
    )

    const response = await userManagementApi.verifyStudent(userId, {
      verified: false,
      reason: value.trim(),
    })
    if (response.success) {
      ElMessage.success('已驳回学生认证')
      fetchUserDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('驳回认证失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

const handleCancelStudentVerification = async () => {
  try {
    const { value } = await ElMessageBox.prompt(
      `请输入取消学生认证的原因，系统会自动通知用户。`,
      '取消学生认证',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputPlaceholder: '例如：认证信息与学生证不一致，请重新提交',
        inputValidator: (inputValue) => {
          if (!inputValue || !inputValue.trim()) {
            return '请填写取消原因'
          }
          return true
        },
      },
    )

    const response = await userManagementApi.verifyStudent(userId, {
      verified: false,
      reason: value.trim(),
    })
    if (response.success) {
      ElMessage.success('已取消学生认证')
      fetchUserDetail()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消学生认证失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 重置密码
const handleResetPassword = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 "${userInfo.value.username}" 的密码吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const response = await userManagementApi.resetUserPassword(userId)
    if (response.success) {
      ElMessage.success('密码重置成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 工具函数
const getStatusTagType = (status) => {
  const types = {
    active: 'success',
    inactive: 'danger',
  }
  return types[status] || 'info'
}

const getStatusText = (status) => {
  const texts = {
    active: '正常',
    inactive: '禁用',
  }
  return texts[status] || '未知'
}

const getGenderText = (gender) => {
  const texts = {
    male: '男',
    female: '女',
    other: '其他',
  }
  return texts[gender] || '未设置'
}

const formatDate = (dateString) => {
  if (!dateString) return null
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return '未知'
    return date.toLocaleString('zh-CN')
  } catch {
    return dateString
  }
}

const getStudentVerificationText = () => {
  if (userInfo.value.student_verified) return '已认证'

  const status = userInfo.value?.verification_data?.status
  if (status === 'pending') return '审核中'
  if (status === 'rejected') return '认证未通过'
  return '未认证'
}

const getDelivererVerificationText = () => {
  if (!hasDelivererApplication.value) return '未申请'
  if (isDelivererVerified.value) return '已认证'
  if (delivererProfile.value?.application_status === 'rejected') return '认证未通过'
  if (delivererProfile.value?.application_status === 'banned') return '已封禁'
  return '审核中'
}

const getDelivererApplicationStatusText = () => {
  if (!hasDelivererApplication.value) return '未提交申请'

  const status = delivererProfile.value?.application_status
  const statusMap = {
    pending: '待审核',
    approved: '审核通过',
    rejected: '审核驳回',
    banned: '已封禁',
  }
  return statusMap[status] || '待审核'
}

// 订单状态
const getOrderStatusType = (status) => {
  const types = {
    pending: 'warning',
    delivering: 'primary',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'info'
}

const getOrderStatusText = (status) => {
  const texts = {
    pending: '待配送',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return texts[status] || status
}

// 任务状态
const getTaskStatusType = (status) => {
  const types = {
    published: 'primary',
    ongoing: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'info'
}

const getTaskStatusText = (status) => {
  const texts = {
    published: '已发布',
    ongoing: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return texts[status] || status
}

onMounted(() => {
  fetchUserDetail()
})
</script>

<style scoped>
.user-detail {
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

.header-title .user-id {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--primary);
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 用户概览卡片 */
.summary-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
}

.user-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20px;
  flex: 1;
}

.user-avatar-wrapper {
  padding: 4px;
  background: var(--color-avatar-bg);
  border-radius: 50%;
}

.user-avatar {
  font-size: 2rem;
  font-weight: 700;
}

.user-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.user-tags {
  display: flex;
  gap: 8px;
}

.summary-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.stats-display {
  display: flex;
  gap: 32px;
}

.stats-display .stat-item {
  text-align: center;
}

.stats-display .stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}

.stats-display .stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
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

/* 卡片样式 */
.info-card,
.description-card,
.verification-card,
.login-info-card,
.table-card,
.actions-card {
  margin-bottom: 16px;
  border-radius: var(--radius-xl);
  box-shadow: none;
}

/* 用户ID样式 */
.user-id {
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  color: var(--primary);
}

/* 电话样式 */
.phone {
  font-family: 'Fira Code', monospace;
}

/* 余额样式 */
.balance {
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

/* 价格样式 */
.price {
  font-weight: 600;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

/* 描述内容 */
.description-content {
  padding: 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-lg);
  line-height: 1.7;
  color: var(--text-secondary);
}

/* 验证卡片 */
.verification-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px;
  border-radius: var(--radius-lg);
  background: #f9fafb;
  transition: all 0.3s ease;
}

.verification-item.verified {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%);
}

.verification-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e5e7eb;
  color: #6b7280;
  font-size: 1.25rem;
}

.verification-item.verified .verification-icon {
  background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
  color: white;
}

.verification-content {
  flex: 1;
}

.verification-title {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 1rem;
}

.verification-status {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.verification-status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.verification-time {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.student-card-preview {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-card-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.student-card-image {
  width: 120px;
  height: 76px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(99, 102, 241, 0.14);
  background: #fff;
}

.student-card-empty {
  margin-top: 10px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.deliverer-certificates {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid rgba(15, 23, 42, 0.08);
}

.deliverer-certificates__title {
  margin-bottom: 14px;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.deliverer-certificates__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}

.deliverer-certificate-card {
  padding: 14px;
  border-radius: 14px;
  background: #f8fafc;
  border: 1px solid rgba(99, 102, 241, 0.12);
}

.deliverer-certificate-label {
  margin-bottom: 10px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.deliverer-certificate-image {
  width: 100%;
  height: 140px;
  border-radius: 12px;
  overflow: hidden;
  background: #fff;
}

/* 表格卡片 */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-count {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

/* 操作网格 */
.action-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
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

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .user-summary {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }

  .summary-right {
    align-items: flex-start;
  }

  .stats-display {
    gap: 20px;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .deliverer-certificates__grid {
    grid-template-columns: 1fr;
  }
}
</style>
