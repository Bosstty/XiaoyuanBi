<template>
  <div class="user-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h2 class="page-title">用户管理</h2>
        <p class="page-subtitle">管理平台所有用户账号信息</p>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="关键词搜索">
          <el-input
            v-model="searchForm.search"
            placeholder="用户名/姓名/学号/邮箱"
            clearable
            prefix-icon="Search"
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="正常" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="学生认证">
          <el-select
            v-model="searchForm.student_verified"
            placeholder="请选择"
            clearable
            style="width: 120px"
          >
            <el-option label="全部" value="" />
            <el-option label="已认证" value="true" />
            <el-option label="未认证" value="false" />
          </el-select>
        </el-form-item>
        <el-form-item label="学院">
          <el-input
            v-model="searchForm.college"
            placeholder="请输入学院"
            clearable
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 用户列表 -->
    <el-card class="table-card" shadow="never">
      <el-table
        v-loading="loading"
        :data="userList"
        style="width: 100%"
        stripe
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="用户信息" min-width="180">
          <template #default="{ row }">
            <div class="user-info-cell">
              <el-avatar :size="36" :src="row.avatar" class="user-avatar">
                {{ row.username?.charAt(0) }}
              </el-avatar>
              <div class="user-info-text">
                <div class="user-name">{{ row.username }}</div>
                <div class="user-real-name">{{ row.real_name || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="student_id" label="学号" min-width="110" />
        <el-table-column prop="phone" label="手机号" min-width="115" />
        <el-table-column prop="college" label="学院" min-width="120" />
        <el-table-column prop="major" label="专业" min-width="100" />
        <el-table-column prop="grade" label="年级" width="70" align="center" />
        <el-table-column label="等级" width="60" align="center">
          <template #default="{ row }">
            <el-tag type="warning" effect="dark" size="small">Lv.{{ row.level }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="学生认证" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.student_verified ? 'success' : 'info'" size="small">
              {{ row.student_verified ? '已认证' : '未认证' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <div class="status-cell">
              <span class="status-dot" :class="row.status"></span>
              {{ getStatusText(row.status) }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="160">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="handleView(row)">
                查看
              </el-button>
              <el-dropdown @command="(command) => handleAction(command, row)">
                <el-button type="primary" size="small" text>
                  <el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item :command="row.status === 'active' ? 'freeze' : 'unfreeze'">
                      <el-icon><Lock /></el-icon>
                      {{ row.status === 'active' ? '禁用' : '启用' }}
                    </el-dropdown-item>
                    <el-dropdown-item :command="row.student_verified ? 'unverify' : 'verify'">
                      <el-icon><Tickets /></el-icon>
                      {{ row.student_verified ? '取消认证' : '认证学生' }}
                    </el-dropdown-item>
                    <el-dropdown-item command="resetPassword" divided>
                      <el-icon><Key /></el-icon>
                      重置密码
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
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 批量操作 -->
    <transition name="slide-fade">
      <el-card v-if="selectedUsers.length > 0" class="batch-actions">
        <div class="batch-content">
          <div class="batch-info">
            <el-icon><InfoFilled /></el-icon>
            已选择 <strong>{{ selectedUsers.length }}</strong> 个用户
          </div>
          <div class="batch-buttons">
            <el-button type="success" size="small" @click="handleBatchAction('activate')">
              <el-icon><Unlock /></el-icon>
              批量启用
            </el-button>
            <el-button type="warning" size="small" @click="handleBatchAction('deactivate')">
              <el-icon><Lock /></el-icon>
              批量禁用
            </el-button>
            <el-button type="primary" size="small" @click="handleBatchAction('verify')">
              <el-icon><Tickets /></el-icon>
              批量认证
            </el-button>
            <el-button type="info" size="small" @click="handleBatchAction('unverify')">
              <el-icon><Close /></el-icon>
              批量取消认证
            </el-button>
          </div>
        </div>
      </el-card>
    </transition>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowDown,
  Search,
  RefreshRight,
  Lock,
  InfoFilled,
  Unlock,
  Tickets,
  Key,
  Close,
} from '@element-plus/icons-vue'
import { userManagementApi } from '../../api/index.js'

const router = useRouter()

const loading = ref(false)
const userList = ref([])
const selectedUsers = ref([])

const searchForm = reactive({
  search: '',
  status: '',
  student_verified: '',
  college: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 获取用户列表
const fetchUsers = async () => {
  try {
    loading.value = true

    // 过滤掉空字符串的搜索参数
    const searchParams = {}
    Object.keys(searchForm).forEach((key) => {
      if (searchForm[key] !== '' && searchForm[key] !== null && searchForm[key] !== undefined) {
        searchParams[key] = searchForm[key]
      }
    })

    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      ...searchParams,
    }

    const response = await userManagementApi.getUsers(params)
    console.log('用户列表响应:', response)
    if (response.success) {
      // data.json 格式: { success, data: [...], pagination: {...} }
      const list = Array.isArray(response.data) ? response.data : []
      const paginationData = response.pagination || {}

      userList.value = list
      pagination.total = paginationData.total || 0
      pagination.page = paginationData.current_page || pagination.page
      pagination.pageSize = paginationData.per_page || pagination.pageSize
      return
    }
    ElMessage.error(response.message || '获取用户列表失败')
  } catch (error) {
    console.error('获取用户列表失败:', error)
    ElMessage.error('获取用户列表失败')
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  fetchUsers()
}

// 重置搜索
const handleReset = () => {
  Object.keys(searchForm).forEach((key) => {
    searchForm[key] = ''
  })
  pagination.page = 1
  fetchUsers()
}

// 查看用户详情
const handleView = (user) => {
  router.push(`/users/${user.id}`)
}

// 操作处理
const handleAction = async (command, user) => {
  switch (command) {
    case 'freeze':
      await handleStatusChange(user, 'inactive')
      break
    case 'unfreeze':
      await handleStatusChange(user, 'active')
      break
    case 'verify':
      await handleVerifyStudent(user, true)
      break
    case 'unverify':
      await handleVerifyStudent(user, false)
      break
    case 'resetPassword':
      await handleResetPassword(user)
      break
  }
}

// 状态变更
const handleStatusChange = async (user, status) => {
  try {
    const action = status === 'inactive' ? '禁用' : '启用'
    await ElMessageBox.confirm(`确定要${action}用户 "${user.username}" 吗？`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await userManagementApi.updateUserStatus(user.id, status)
    if (response.success) {
      ElMessage.success(`${action}成功`)
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('状态变更失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 重置密码
const handleResetPassword = async (user) => {
  try {
    await ElMessageBox.confirm(`确定要重置用户 "${user.username}" 的密码吗？`, '确认操作', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await userManagementApi.resetUserPassword(user.id)
    if (response.success) {
      ElMessage.success('密码重置成功')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重置密码失败')
    }
  }
}

// 认证学生身份
const handleVerifyStudent = async (user, verified) => {
  try {
    const action = verified ? '认证' : '取消认证'
    let payload = { verified }

    if (verified) {
      await ElMessageBox.confirm(
        `确定要${action}用户 "${user.username}" 的学生身份吗？`,
        '确认操作',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        },
      )
    } else {
      const { value } = await ElMessageBox.prompt(
        '请输入不通过原因，系统会自动通知用户并清空已提交的学生认证资料。',
        '学生认证不通过',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputPlaceholder: '例如：学生证照片不完整，请重新上传',
          inputValidator: (inputValue) => {
            if (!inputValue || !inputValue.trim()) {
              return '请填写不通过原因'
            }
            return true
          },
        },
      )
      payload = { verified, reason: value.trim() }
    }

    const response = await userManagementApi.verifyStudent(user.id, payload)
    if (response.success) {
      ElMessage.success(`${action}成功`)
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('认证失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 选择变更
const handleSelectionChange = (selection) => {
  selectedUsers.value = selection
}

// 批量操作
const handleBatchAction = async (action) => {
  try {
    const actionText = {
      activate: '启用',
      deactivate: '禁用',
      verify: '认证',
      unverify: '取消认证',
    }
    const actionLabel = actionText[action] || action

    await ElMessageBox.confirm(
      `确定要${actionLabel}选中的 ${selectedUsers.value.length} 个用户吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    const userIds = selectedUsers.value.map((u) => u.id)
    const response = await userManagementApi.batchUpdateUsers({ user_ids: userIds, action })
    if (response.success) {
      ElMessage.success(`批量${actionLabel}成功`)
      selectedUsers.value = []
      fetchUsers()
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量操作失败:', error)
      ElMessage.error('操作失败')
    }
  }
}

// 分页处理
const handleSizeChange = (newSize) => {
  pagination.pageSize = newSize
  pagination.page = 1
  fetchUsers()
}

const handleCurrentChange = (newPage) => {
  pagination.page = newPage
  fetchUsers()
}

// 工具函数
const getUserTypeTagType = (role) => {
  const types = {
    student: 'primary',
    delivery: 'success',
    admin: 'danger',
  }
  return types[role] || 'info'
}

const getUserTypeText = (role) => {
  const texts = {
    student: '学生',
    delivery: '配送员',
    admin: '管理员',
  }
  return texts[role] || '未知'
}

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

const formatDate = (dateString) => {
  if (!dateString) return ''
  try {
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return ''
    return date.toLocaleString('zh-CN')
  } catch {
    return dateString
  }
}

onMounted(() => {
  fetchUsers()
})
</script>

<style scoped>
.user-management {
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

/* 搜索卡片 */
.search-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}

.search-form {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.search-form :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.search-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--text-secondary);
}

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl);
  margin-bottom: 20px;
  border: 1px solid var(--border-color);
}

/* 用户信息单元格 */
.user-info-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  background: #4a9feb;
  flex-shrink: 0;
}

.user-info-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-name {
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-real-name {
  font-size: 0.8rem;
  color: var(--text-secondary);
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

.status-dot.active {
  background: var(--accent-success);
}

.status-dot.inactive {
  background: var(--accent-danger);
}

/* 评分单元格 */
.rating-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  color: #f59e0b;
  font-weight: 600;
}

.star-icon {
  font-size: 14px;
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

/* 批量操作 */
.batch-actions {
  border-radius: var(--radius-xl);
  background: #fff;
  border: 1px solid var(--primary);
}

.batch-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.batch-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

.batch-info .el-icon {
  color: var(--primary);
}

.batch-buttons {
  display: flex;
  gap: 8px;
}

/* 过渡动画 */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.2s ease-in;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .header-actions {
    width: 100%;
  }

  .search-form {
    flex-direction: column;
  }

  .search-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .search-form :deep(.el-input),
  .search-form :deep(.el-select) {
    width: 100% !important;
  }

  .batch-content {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
