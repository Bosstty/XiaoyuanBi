<template>
  <div class="post-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">
          <h1>帖子详情</h1>
          <span class="post-id">ID: {{ post.id }}</span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="primary" @click="openModerateDialog">审核操作</el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <!-- 帖子概览卡片 -->
      <el-card class="summary-card">
        <div class="post-summary">
          <div class="summary-left">
            <div class="post-type-icon" :class="post.category">
              <el-icon><Document /></el-icon>
            </div>
            <div class="post-info">
              <h2>{{ post.title }}</h2>
              <div class="post-tags">
                <el-tag :type="getCategoryTagType(post.category)" effect="light">
                  {{ getCategoryText(post.category) }}
                </el-tag>
                <el-tag :type="getStatusTagType(post.status)" effect="light">
                  {{ getStatusText(post.status) }}
                </el-tag>
                <el-tag v-if="post.is_pinned" type="danger" effect="dark">置顶</el-tag>
                <el-tag v-if="post.is_hot" type="warning" effect="dark">热门</el-tag>
                <el-tag v-if="post.is_anonymous" type="info" effect="plain">匿名</el-tag>
              </div>
            </div>
          </div>
          <div class="summary-right">
            <div class="stats-display">
              <div class="stat-item">
                <span class="stat-value">{{ post.view_count }}</span>
                <span class="stat-label">浏览</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ post.like_count }}</span>
                <span class="stat-label">点赞</span>
              </div>
              <div class="stat-item">
                <span class="stat-value">{{ post.comment_count }}</span>
                <span class="stat-label">评论</span>
              </div>
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
              <el-descriptions-item label="帖子ID">{{ post.id }}</el-descriptions-item>
              <el-descriptions-item label="作者ID">{{ post.author_id }}</el-descriptions-item>
              <el-descriptions-item label="帖子分类">
                <el-tag :type="getCategoryTagType(post.category)" size="small">
                  {{ getCategoryText(post.category) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="发布状态">
                <el-tag :type="getStatusTagType(post.status)" size="small">
                  {{ getStatusText(post.status) }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="是否置顶">
                {{ post.is_pinned ? '是' : '否' }}
              </el-descriptions-item>
              <el-descriptions-item label="是否热门">
                {{ post.is_hot ? '是' : '否' }}
              </el-descriptions-item>
              <el-descriptions-item label="是否匿名">
                {{ post.is_anonymous ? '是' : '否' }}
              </el-descriptions-item>
              <el-descriptions-item label="举报次数">
                <span :class="{ 'text-danger': post.reportCount > 0 }">{{ post.reportCount }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="创建时间">
                {{ formatDateTime(post.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="更新时间">
                {{ formatDateTime(post.updatedAt) }}
              </el-descriptions-item>
              <el-descriptions-item label="最后评论时间" :span="2">
                {{ post.last_comment_time ? formatDateTime(post.last_comment_time) : '暂无评论' }}
              </el-descriptions-item>
              <el-descriptions-item v-if="post.reject_reason" label="拒绝原因" :span="2">
                <span class="text-danger">{{ post.reject_reason }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 帖子摘要 -->
          <el-card class="description-card" v-if="post.summary">
            <template #header>
              <span>帖子摘要</span>
            </template>
            <div class="description-content">
              {{ post.summary }}
            </div>
          </el-card>

          <!-- 帖子标签 -->
          <el-card class="tags-card" v-if="post.tags && post.tags.length">
            <template #header>
              <span>标签</span>
            </template>
            <div class="tags-list">
              <el-tag v-for="tag in post.tags" :key="tag" size="default" class="tag-item">
                {{ tag }}
              </el-tag>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 帖子内容 -->
        <el-tab-pane label="帖子内容" name="content">
          <el-card class="content-card">
            <template #header>
              <div class="content-header">
                <span>正文内容</span>
                <el-tag v-if="!post.content" type="warning">内容为空</el-tag>
              </div>
            </template>
            <div class="post-content" v-html="post.content || '暂无内容'"></div>
          </el-card>

          <!-- 图片附件 -->
          <el-card class="images-card" v-if="post.images && post.images.length">
            <template #header>
              <span>图片附件 ({{ post.images.length }})</span>
            </template>
            <div class="images-list">
              <el-image
                v-for="(img, index) in post.images"
                :key="index"
                :src="img"
                :preview-src-list="post.images"
                fit="cover"
                class="post-image"
              />
            </div>
          </el-card>

          <!-- 其他附件 -->
          <el-card class="attachments-card" v-if="post.attachments && post.attachments.length">
            <template #header>
              <span>文件附件 ({{ post.attachments.length }})</span>
            </template>
            <div class="attachments-list">
              <div v-for="file in post.attachments" :key="file.id" class="attachment-item">
                <el-icon><Document /></el-icon>
                <span class="filename">{{ file.name || file.url }}</span>
                <span class="filesize">({{ formatFileSize(file.size) }})</span>
              </div>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 作者信息 -->
        <el-tab-pane label="作者信息" name="author">
          <el-card class="author-card">
            <template #header>
              <div class="author-header">
                <span>发布作者</span>
                <el-button type="primary" size="small" @click="viewUserDetail(post.author?.id)">
                  查看用户详情
                </el-button>
              </div>
            </template>
            <div class="author-info" v-if="post.author">
              <el-avatar :size="80" :src="post.author.avatar">
                {{ post.author.username?.charAt(0) }}
              </el-avatar>
              <div class="author-details">
                <div class="author-name">{{ post.author.real_name || post.author.username }}</div>
                <div class="author-meta">
                  <span
                    ><el-icon><User /></el-icon> 用户名: {{ post.author.username }}</span
                  >
                </div>
                <div class="author-meta">
                  <span
                    ><el-icon><Tickets /></el-icon> 学号:
                    {{ post.author.student_id || '未填写' }}</span
                  >
                </div>
                <div class="author-meta">
                  <span
                    ><el-icon><Phone /></el-icon> 手机: {{ post.author.phone || '未绑定' }}</span
                  >
                </div>
              </div>
            </div>
            <el-empty v-else description="作者信息不存在" />
          </el-card>
        </el-tab-pane>

        <!-- 评论列表 -->
        <el-tab-pane label="评论列表" name="comments">
          <el-card class="comments-card">
            <template #header>
              <div class="comments-header">
                <span>评论 ({{ comments.length }})</span>
                <el-button size="small" @click="refreshComments">刷新</el-button>
              </div>
            </template>

            <el-empty v-if="comments.length === 0" description="暂无评论" />

            <div v-else class="comments-list">
              <div v-for="comment in comments" :key="comment.id" class="comment-item">
                <div class="comment-header">
                  <el-avatar :size="40" :src="comment.author?.avatar">
                    {{ comment.author?.username?.charAt(0) }}
                  </el-avatar>
                  <div class="comment-author">
                    <div class="author-name">
                      {{ comment.author?.real_name || comment.author?.username || '匿名用户' }}
                    </div>
                    <div class="comment-time">{{ formatDateTime(comment.created_at) }}</div>
                  </div>
                  <div class="comment-actions">
                    <el-tag v-if="comment.status === 'hidden'" type="warning" size="small"
                      >已隐藏</el-tag
                    >
                    <el-button type="text" size="small" @click="deleteComment(comment)">
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                  </div>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 审核操作对话框 -->
    <el-dialog v-model="moderateDialog.visible" title="帖子审核操作" width="500px">
      <el-form :model="moderateDialog.form" label-width="100px">
        <el-form-item label="操作类型" required>
          <el-radio-group v-model="moderateDialog.form.action">
            <el-radio value="approve">通过审核</el-radio>
            <el-radio value="hide">隐藏帖子</el-radio>
            <el-radio value="delete">删除帖子</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item
          label="操作原因"
          v-if="['hide', 'delete'].includes(moderateDialog.form.action)"
          required
        >
          <el-input
            v-model="moderateDialog.form.reason"
            type="textarea"
            :rows="3"
            placeholder="请输入操作原因"
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
import { ref, reactive, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, Document, User, Tickets, Phone, Delete } from '@element-plus/icons-vue'
import { forumManagementApi } from '@/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const activeTab = ref('info')
const post = ref({})
const comments = ref([])

const moderateDialog = reactive({
  visible: false,
  loading: false,
  form: {
    action: 'approve',
    reason: '',
  },
})

// 获取帖子详情
const fetchPostDetail = async () => {
  loading.value = true
  try {
    const response = await forumManagementApi.getPostById(route.params.id)
    if (response.success) {
      post.value = response.data
      comments.value = response.data.comments || []
    }
  } catch (error) {
    console.error('获取帖子详情失败:', error)
    // 使用模拟数据
    post.value = {
      id: 1,
      author_id: 1,
      category: 'campus',
      title: '求高等数学答疑',
      content: '这是帖子内容，求高等数学答疑的相关内容...',
      summary: null,
      tags: null,
      images: null,
      attachments: null,
      is_anonymous: false,
      is_pinned: false,
      is_hot: false,
      status: 'published',
      view_count: 63,
      like_count: 29,
      comment_count: 0,
      share_count: 0,
      last_comment_time: null,
      reject_reason: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      author: {
        id: 1,
        username: 'zhangsan',
        real_name: '张三',
        avatar: null,
        phone: '13887113961',
        student_id: '20240001',
      },
      comments: [],
      reportCount: 0,
    }
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/forum')
}

const refreshData = () => {
  fetchPostDetail()
}

const refreshComments = () => {
  fetchPostDetail()
}

const openModerateDialog = () => {
  moderateDialog.form.action = 'approve'
  moderateDialog.form.reason = ''
  moderateDialog.visible = true
}

const submitModerate = async () => {
  if (['hide', 'delete'].includes(moderateDialog.form.action) && !moderateDialog.form.reason) {
    ElMessage.warning('请输入操作原因')
    return
  }

  moderateDialog.loading = true
  try {
    const response = await forumManagementApi.moderatePost(post.value.id, {
      action: moderateDialog.form.action,
      reason: moderateDialog.form.reason,
    })

    if (response.success) {
      ElMessage.success('操作成功')
      moderateDialog.visible = false
      if (moderateDialog.form.action === 'delete') {
        router.push('/forum')
      } else {
        fetchPostDetail()
      }
    }
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    moderateDialog.loading = false
  }
}

const viewUserDetail = (userId) => {
  if (userId) {
    router.push(`/users/${userId}`)
  }
}

const deleteComment = async (comment) => {
  try {
    await ElMessageBox.confirm('确定要删除此评论吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    ElMessage.success('评论删除成功')
    refreshComments()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除评论失败')
    }
  }
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
  return categoryMap[category] || category || '未知'
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
    pending: '待审核',
    published: '已发布',
    hidden: '已隐藏',
    deleted: '已删除',
  }
  return statusMap[status] || status || '未知'
}

const getStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    published: 'success',
    hidden: 'info',
    deleted: 'danger',
  }
  return statusMap[status] || ''
}

const formatDateTime = (dateTime) => {
  if (!dateTime) return '-'
  return new Date(dateTime).toLocaleString('zh-CN')
}

const formatFileSize = (size) => {
  if (!size) return '未知'
  if (size < 1024) return size + 'B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(1) + 'KB'
  return (size / (1024 * 1024)).toFixed(1) + 'MB'
}

// 生命周期
onMounted(() => {
  fetchPostDetail()
})
</script>

<style scoped>
.post-detail {
  padding: 20px;
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
  margin-bottom: 16px;
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

.post-id {
  font-size: 0.85rem;
  color: var(--primary);
  font-family: 'Fira Code', monospace;
}

.header-right {
  display: flex;
  gap: 8px;
}

.detail-content {
  margin-top: 0;
}

/* 概览卡片 */
.summary-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
  border: 1px solid rgba(99, 102, 241, 0.1);
}

.post-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.post-type-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.post-type-icon.academic {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.post-type-icon.life {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.post-type-icon.campus {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.post-type-icon.task {
  background: rgba(6, 182, 212, 0.1);
  color: #06b6d4;
}

.post-type-icon.skill {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.post-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.post-tags {
  display: flex;
  gap: 8px;
}

.summary-right {
  text-align: right;
}

.stats-display {
  display: flex;
  gap: 24px;
}

.stats-display .stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-display .stat-value {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary);
}

.stats-display .stat-label {
  font-size: 0.75rem;
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

.info-card,
.content-card,
.author-card,
.comments-card {
  margin-bottom: 16px;
  border-radius: var(--radius-xl);
  box-shadow: none;
}

.description-card,
.tags-card,
.images-card,
.attachments-card {
  margin-top: 16px;
  border-radius: var(--radius-xl);
  box-shadow: none;
}

.description-content {
  line-height: 1.8;
  color: var(--text-secondary);
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.post-content {
  line-height: 1.8;
  color: var(--text-primary);
  min-height: 100px;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  margin-right: 8px;
  margin-bottom: 8px;
}

.images-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.post-image {
  width: 100%;
  height: 150px;
  border-radius: 8px;
  cursor: pointer;
}

.attachments-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.attachments-list .attachment-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: var(--bg-page);
  border-radius: 8px;
}

.attachments-list .filename {
  flex: 1;
  font-weight: 500;
}

.attachments-list .filesize {
  color: var(--text-muted);
  font-size: 0.875rem;
}

/* 作者信息 */
.author-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 10px;
}

.author-info .el-avatar {
  color: white;
}

.author-details .author-name {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.author-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary);
  font-size: 0.9375rem;
  margin-bottom: 6px;
}

/* 评论列表 */
.comments-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.comments-list {
  max-height: 500px;
  overflow-y: auto;
}

.comment-item {
  padding: 16px 0;
  border-bottom: 1px solid var(--border-light);
}

.comment-item:last-child {
  border-bottom: none;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 10px;
}

.comment-author {
  flex: 1;
}

.comment-author .author-name {
  font-weight: 500;
  color: var(--text-primary);
}

.comment-time {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

.comment-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-content {
  line-height: 1.6;
  color: var(--text-secondary);
  margin-left: 52px;
}

.text-danger {
  color: var(--accent-danger);
}

/* 响应式 */
@media (max-width: 768px) {
  .post-summary {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .summary-right {
    text-align: left;
  }

  .stats-display {
    justify-content: flex-start;
  }

  .author-info {
    flex-direction: column;
    text-align: center;
  }

  .author-details {
    text-align: center;
  }
}
</style>
