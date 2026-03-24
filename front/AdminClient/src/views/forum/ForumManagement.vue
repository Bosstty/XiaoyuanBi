<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <DashboardFilterHeader
      v-model="dateRange"
      title="论坛管理"
      subtitle="管理论坛帖子，内容审核及用户发布内容"
      filter-label="统计范围"
      filter-hint="默认展示最近30天，可按需调整"
      :action-icon="Download"
      action-label="导出"
      @change="handleDateRangeChange"
      @action="exportPosts"
    />

    <!-- 统计信息 -->
    <div class="stats-section">
      <el-card class="stat-card" shadow="never">
        <div class="stat-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.totalPosts }}</div>
          <div class="stat-label">总帖子数</div>
        </div>
      </el-card>
      <el-card class="stat-card" shadow="never">
        <div class="stat-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.pendingPosts }}</div>
          <div class="stat-label">待审核</div>
        </div>
      </el-card>
      <el-card class="stat-card" shadow="never">
        <div class="stat-icon today">
          <el-icon><Plus /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.todayPosts }}</div>
          <div class="stat-label">今日新增</div>
        </div>
      </el-card>
      <el-card class="stat-card" shadow="never">
        <div class="stat-icon reported">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.reportedPosts }}</div>
          <div class="stat-label">举报待处理</div>
        </div>
      </el-card>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline class="filter-form">
        <el-form-item label="板块分类">
          <el-select
            v-model="filters.category"
            placeholder="全部板块"
            clearable
            style="width: 140px"
          >
            <el-option label="全部" value="" />
            <el-option label="学术交流" value="academic" />
            <el-option label="生活服务" value="life" />
            <el-option label="校园动态" value="campus" />
            <el-option label="任务交流" value="task" />
            <el-option label="技能分享" value="skill" />
          </el-select>
        </el-form-item>

        <el-form-item label="帖子状态">
          <el-select v-model="filters.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="全部" value="" />
            <el-option label="待审核" value="pending" />
            <el-option label="已发布" value="published" />
            <el-option label="已隐藏" value="hidden" />
            <el-option label="已删除" value="deleted" />
          </el-select>
        </el-form-item>

        <el-form-item label="搜索">
          <el-input
            v-model="filters.search"
            placeholder="标题/作者"
            clearable
            style="width: 180px"
          />
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="searchPosts">
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

    <!-- 帖子列表 -->
    <el-card class="table-card" shadow="never">
      <el-table v-loading="loading" :data="posts" stripe style="width: 100%">
        <el-table-column type="selection" width="50" />
        <el-table-column prop="id" label="ID" width="60" />
        <el-table-column label="帖子标题" align="center" min-width="250">
          <template #default="{ row }">
            <div class="post-title-cell">
              <el-tag v-if="row.isPinned" size="small" type="danger">置顶</el-tag>
              <el-tag v-if="row.isHot" size="small" type="warning">热门</el-tag>
              <el-tag v-if="row.isAnonymous" size="small" type="info">匿名</el-tag>
              <el-link @click="viewDetail(row.id)" type="primary">{{ row.title }}</el-link>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="板块" width="100">
          <template #default="{ row }">
            <el-tag :type="getCategoryTagType(row.category)" size="small">
              {{ getCategoryText(row.category) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="作者" width="120">
          <template #default="{ row }">
            <div class="author-cell">
              <el-avatar :size="28" :src="row.author?.avatar">
                {{ row.author?.username?.charAt(0) }}
              </el-avatar>
              <span>{{ row.author?.real_name || row.author?.username || '-' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="viewCount" label="浏览" width="70" align="center" />
        <el-table-column prop="likeCount" label="点赞" width="70" align="center" />
        <el-table-column prop="commentCount" label="评论" width="70" align="center" />
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" width="160">
          <template #default="{ row }">
            <span class="time-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" text @click="viewDetail(row.id)">
                查看
              </el-button>
              <el-dropdown @command="(command) => moderatePost(command, row)">
                <el-button type="primary" size="small" text>
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="row.status === 'pending_review'" command="approve">
                      <el-icon><CircleCheck /></el-icon>
                      通过审核
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'pending_review'" command="reject">
                      <el-icon><Close /></el-icon>
                      拒绝
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status !== 'hidden'" command="hide">
                      <el-icon><Hide /></el-icon>
                      隐藏帖子
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'hidden'" command="restore">
                      <el-icon><View /></el-icon>
                      恢复显示
                    </el-dropdown-item>
                    <el-dropdown-item :command="'top'">
                      <el-icon><Top /></el-icon>
                      {{ row.isPinned ? '取消置顶' : '设为置顶' }}
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
          :total="pagination.total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          background
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Search,
  RefreshRight,
  Document,
  Clock,
  Plus,
  Warning,
  MoreFilled,
  CircleCheck,
  Hide,
  View,
  Top,
  Close,
} from '@element-plus/icons-vue'
import { forumManagementApi } from '@/api'
import { exportCsvFile, normalizeExportValue } from '@/utils/export'
import DashboardFilterHeader from '../dashboard/components/DashboardFilterHeader.vue'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const posts = ref([])
const dateRange = ref([])

const stats = reactive({
  totalPosts: 0,
  pendingPosts: 0,
  todayPosts: 0,
  reportedPosts: 0,
})

const filters = reactive({
  category: '',
  status: '',
  search: '',
})

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
})

// 返回
const goBack = () => {
  router.push('/')
}

// 获取帖子列表
const fetchPosts = async () => {
  loading.value = true
  try {
    // 过滤空字符串参数
    const searchParams = {}
    if (filters.category) searchParams.category = filters.category
    if (filters.status) searchParams.status = filters.status
    if (filters.search) searchParams.search = filters.search

    const params = {
      page: pagination.page,
      limit: pagination.pageSize,
      ...searchParams,
    }

    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const response = await forumManagementApi.getPosts(params)
    console.log('帖子列表:', response)

    if (response.success) {
      // data.json 格式: { success, data: { posts: [...], pagination: {...} } }
      const data = response.data || {}
      posts.value = data.posts || data || []
      const paginationData = data.pagination || {}

      pagination.total = paginationData.total || 0
      pagination.page = paginationData.page || pagination.page
      pagination.pageSize = paginationData.limit || pagination.pageSize

      // 更新统计
      stats.totalPosts = paginationData.total || posts.value.length
      stats.pendingPosts = posts.value.filter((p) => p.status === 'pending').length
      stats.todayPosts = 0
      stats.reportedPosts = 0
    }
  } catch (error) {
    console.error('获取帖子列表失败:', error)
    ElMessage.error('获取帖子列表失败')
  } finally {
    loading.value = false
  }
}

const searchPosts = () => {
  pagination.page = 1
  fetchPosts()
}

const resetFilters = () => {
  filters.category = ''
  filters.status = ''
  filters.search = ''
  pagination.page = 1
  fetchPosts()
}

const handleDateRangeChange = () => {
  pagination.page = 1
  fetchPosts()
}

const viewDetail = (id) => {
  router.push(`/forum/posts/${id}`)
}

const moderatePost = async (command, post) => {
  if (command === 'reject') {
    ElMessageBox.prompt('请输入拒绝原因', '拒绝审核', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      inputPlaceholder: '请输入拒绝原因',
    })
      .then(async ({ value }) => {
        if (!value) {
          ElMessage.warning('请输入拒绝原因')
          return
        }
        try {
          const response = await forumManagementApi.moderatePost(post.id, 'reject', value)
          if (response.success) {
            ElMessage.success('已拒绝')
            fetchPosts()
          }
        } catch (error) {
          ElMessage.error('操作失败: ' + error.message)
        }
      })
      .catch(() => {})
  } else if (command === 'top') {
    // 置顶/取消置顶
    const action = post.isPinned ? 'unpin' : 'pin'
    try {
      const response = await forumManagementApi.moderatePost(post.id, action)
      if (response.success) {
        ElMessage.success(action === 'pin' ? '置顶成功' : '取消置顶成功')
        fetchPosts()
      }
    } catch (error) {
      ElMessage.error('操作失败: ' + error.message)
    }
  } else if (command === 'hide') {
    ElMessageBox.prompt('请输入隐藏原因', '隐藏帖子', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
      inputPlaceholder: '请输入隐藏原因',
    })
      .then(async ({ value }) => {
        try {
          const response = await forumManagementApi.moderatePost(post.id, 'hide', value)
          if (response.success) {
            ElMessage.success('隐藏成功')
            fetchPosts()
          }
        } catch (error) {
          ElMessage.error('隐藏失败: ' + error.message)
        }
      })
      .catch(() => {})
  } else if (command === 'restore') {
    try {
      const response = await forumManagementApi.moderatePost(post.id, 'restore')
      if (response.success) {
        ElMessage.success('已恢复显示')
        fetchPosts()
      }
    } catch (error) {
      ElMessage.error('恢复失败: ' + error.message)
    }
  } else if (command === 'approve') {
    try {
      const response = await forumManagementApi.moderatePost(post.id, 'approve')
      if (response.success) {
        ElMessage.success('审核通过')
        fetchPosts()
      }
    } catch (error) {
      ElMessage.error('审核失败: ' + error.message)
    }
  }
}

const exportPosts = async () => {
  try {
    const searchParams = {}
    if (filters.category) searchParams.category = filters.category
    if (filters.status) searchParams.status = filters.status
    if (filters.search) searchParams.search = filters.search

    const params = {
      page: 1,
      pageSize: Math.max(pagination.total || posts.value.length || 0, 1000),
      ...searchParams,
    }

    if (dateRange.value?.length === 2) {
      params.start_date = dateRange.value[0]
      params.end_date = dateRange.value[1]
    }

    const response = await forumManagementApi.getPosts(params)
    if (!response.success) throw new Error(response.message || '导出失败')

    const data = response.data || {}
    const list = data.posts || data || []
    const rows = list.map((post) => ({
      帖子ID: post.id,
      标题: normalizeExportValue(post.title),
      分类: getCategoryText(post.category),
      作者: normalizeExportValue(post.author?.real_name || post.author?.username),
      浏览量: normalizeExportValue(post.viewCount),
      点赞数: normalizeExportValue(post.likeCount),
      评论数: normalizeExportValue(post.commentCount),
      状态: getStatusText(post.status),
      置顶: post.isPinned ? '是' : '否',
      热门: post.isHot ? '是' : '否',
      匿名: post.isAnonymous ? '是' : '否',
      发布时间: normalizeExportValue(post.createdAt),
    }))

    exportCsvFile(rows, '论坛管理', dateRange.value)
    ElMessage.success(`已导出 ${rows.length} 条帖子数据`)
  } catch (error) {
    console.error('导出帖子失败:', error)
    ElMessage.error(error.message || '导出帖子失败')
  }
}

const handleSizeChange = (val) => {
  pagination.pageSize = val
  pagination.page = 1
  fetchPosts()
}

const handleCurrentChange = (val) => {
  pagination.page = val
  fetchPosts()
}

// 辅助函数
const getCategoryText = (category) => {
  const categoryMap = {
    academic: '学术交流',
    life: '生活服务',
    campus: '校园动态',
    task: '任务交流',
    skill: '技能分享',
  }
  return categoryMap[category] || category
}

const getCategoryTagType = (category) => {
  const categoryMap = {
    academic: 'primary',
    life: 'success',
    campus: 'warning',
    task: 'info',
    skill: 'danger',
  }
  return categoryMap[category] || ''
}

const getStatusText = (status) => {
  const statusMap = {
    draft: '草稿',
    pending_review: '待审核',
    published: '已发布',
    rejected: '已拒绝',
    hidden: '已隐藏',
    deleted: '已删除',
  }
  return statusMap[status] || status
}

const getStatusTagType = (status) => {
  const statusMap = {
    draft: 'info',
    pending_review: 'warning',
    published: 'success',
    rejected: 'danger',
    hidden: 'info',
    deleted: 'danger',
  }
  return statusMap[status] || ''
}

const formatDate = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

// 生命周期
onMounted(() => {
  const end = new Date()
  const start = new Date()
  start.setDate(start.getDate() - 30)
  dateRange.value = [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  fetchPosts()
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
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}

.stat-card :deep(.el-card__body) {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: white;
}

.stat-icon.total {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.stat-icon.pending {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.stat-icon.today {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-icon.reported {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
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

/* 表格卡片 */
.table-card {
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
}

.post-title-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
}

.post-badges {
  display: flex;
  gap: 4px;
}

.author-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.author-cell .el-avatar {
  background: var(--color-avatar-bg);
}

.time-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
}

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

/* 响应式 */
@media (max-width: 1200px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .stats-section {
    grid-template-columns: 1fr;
  }

  .filter-form {
    flex-direction: column;
  }

  .filter-form :deep(.el-form-item) {
    width: 100%;
    margin-right: 0;
  }

  .filter-form :deep(.el-select),
  .filter-form :deep(.el-input) {
    width: 100% !important;
  }
}
</style>
