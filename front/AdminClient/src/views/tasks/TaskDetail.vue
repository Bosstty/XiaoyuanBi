<template>
  <div class="task-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <div class="header-title">
          <h1>任务详情</h1>
          <span class="task-no">{{ task.task_no }}</span>
        </div>
      </div>
      <div class="header-right">
        <el-button @click="refreshData">刷新</el-button>
        <el-button type="success" @click="approveTask" v-if="task.status === 'pending'">
          <el-icon><CircleCheck /></el-icon>
          通过审核
        </el-button>
        <el-button type="warning" @click="rejectTask" v-if="task.status === 'pending'">
          <el-icon><CircleClose /></el-icon>
          驳回审核
        </el-button>
      </div>
    </div>

    <div v-loading="loading" class="detail-content">
      <!-- 任务概览卡片 -->
      <el-card class="summary-card">
        <div class="task-summary">
          <div class="summary-left">
            <div class="task-type-icon" :class="task.category">
              <el-icon><component :is="getCategoryIcon(task.category)" /></el-icon>
            </div>
            <div class="task-info">
              <h2>{{ task.title }}</h2>
              <div class="task-tags">
                <el-tag :type="getCategoryTagType(task.category)" effect="light">
                  {{ getCategoryText(task.category) }}
                </el-tag>
                <el-tag v-if="task.urgent" type="danger" effect="dark">加急</el-tag>
                <el-tag v-if="task.remote_work" type="info" effect="dark">远程</el-tag>
                <el-tag :type="getPaymentStatusTagType(task.payment_status)" effect="light">
                  {{ getPaymentStatusText(task.payment_status) }}
                </el-tag>
              </div>
            </div>
          </div>
          <div class="summary-right">
            <div class="price-display">
              <span class="price-label">任务赏金</span>
              <span class="price-value">¥{{ task.price }}</span>
            </div>
            <div class="status-display">
              <el-tag size="large" :type="getStatusTagType(task.status)" effect="dark">
                {{ getStatusText(task.status) }}
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
              <el-descriptions-item label="任务号">
                <span class="task-no">{{ task.task_no }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="任务分类">
                <el-tag :type="getCategoryTagType(task.category)">{{
                  getCategoryText(task.category)
                }}</el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="任务标题" :span="2">{{
                task.title
              }}</el-descriptions-item>
              <el-descriptions-item label="任务报酬">
                <span class="price">¥{{ task.price }}</span>
              </el-descriptions-item>
              <el-descriptions-item label="任务地点">
                {{ task.location || '不限' }}
              </el-descriptions-item>
              <el-descriptions-item label="开始时间">
                {{ formatDate(task.start_time) || '待定' }}
              </el-descriptions-item>
              <el-descriptions-item label="截止时间">
                {{ formatDate(task.deadline) || '待定' }}
              </el-descriptions-item>
              <el-descriptions-item label="预计工期">
                {{ task.estimated_duration ? `${task.estimated_duration}小时` : '待定' }}
              </el-descriptions-item>
              <el-descriptions-item label="最大人数">
                {{ task.max_applicants }}人
              </el-descriptions-item>
              <el-descriptions-item label="浏览次数">
                {{ task.view_count || 0 }}次
              </el-descriptions-item>
              <el-descriptions-item label="创建时间" :span="2">
                {{ formatDate(task.createdAt) }}
              </el-descriptions-item>
              <el-descriptions-item v-if="task.cancel_reason" label="取消原因" :span="2">
                <span class="cancel-reason">{{ task.cancel_reason }}</span>
              </el-descriptions-item>
            </el-descriptions>
          </el-card>

          <!-- 任务描述 -->
          <el-card class="description-card">
            <template #header>
              <span>任务描述</span>
            </template>
            <div class="description-content">
              {{ task.description || '暂无详细描述' }}
            </div>
          </el-card>

          <!-- 任务要求 -->
          <el-card v-if="task.requirements" class="requirements-card">
            <template #header>
              <span>任务要求</span>
            </template>
            <div class="requirements-content">
              {{ task.requirements }}
            </div>
          </el-card>

          <!-- 技能要求 -->
          <el-card v-if="task.skills_required" class="skills-card">
            <template #header>
              <span>技能要求</span>
            </template>
            <div class="skills-tags">
              <el-tag
                v-for="skill in parseSkills(task.skills_required)"
                :key="skill"
                type="primary"
                effect="light"
              >
                {{ skill }}
              </el-tag>
            </div>
          </el-card>
        </el-tab-pane>

        <!-- 相关人员 -->
        <el-tab-pane label="相关人员" name="people">
          <el-row :gutter="16">
            <!-- 发布者信息 -->
            <el-col :span="12">
              <el-card class="person-card">
                <template #header>
                  <div class="person-header">
                    <el-icon><User /></el-icon>
                    <span>发布者</span>
                  </div>
                </template>
                <div class="person-info">
                  <el-avatar :size="64" :src="task.publisher?.avatar">
                    {{ task.publisher?.username?.charAt(0) }}
                  </el-avatar>
                  <div class="person-details">
                    <div class="person-name">{{ task.publisher?.real_name }}</div>
                    <div class="person-meta">
                      <span
                        ><el-icon><Ticket /></el-icon>
                        {{ task.publisher?.student_id || '未填写' }}</span
                      >
                      <span
                        ><el-icon><Phone /></el-icon> {{ task.publisher?.phone }}</span
                      >
                    </div>
                  </div>
                </div>
                <el-button type="primary" text @click="viewUserDetail(task.publisher?.id)">
                  查看详情
                </el-button>
              </el-card>
            </el-col>

            <!-- 接单者信息 -->
            <el-col :span="12" v-if="task.assignee">
              <el-card class="person-card">
                <template #header>
                  <div class="person-header">
                    <el-icon><Service /></el-icon>
                    <span>接单者</span>
                  </div>
                </template>
                <div class="person-info">
                  <el-avatar :size="64" :src="task.assignee?.avatar">
                    {{ task.assignee?.username?.charAt(0) }}
                  </el-avatar>
                  <div class="person-details">
                    <div class="person-name">{{ task.assignee?.real_name }}</div>
                    <div class="person-meta">
                      <span
                        ><el-icon><Phone /></el-icon> {{ task.assignee?.phone }}</span
                      >
                    </div>
                  </div>
                </div>
                <el-button type="primary" text @click="viewUserDetail(task.assignee?.id)">
                  查看详情
                </el-button>
              </el-card>
            </el-col>
          </el-row>
        </el-tab-pane>

        <!-- 申请记录 -->
        <el-tab-pane label="申请记录" name="applications">
          <el-card class="table-card">
            <template #header>
              <div class="card-header">
                <span>申请列表</span>
                <span class="record-count">共 {{ task.applications?.length || 0 }} 条</span>
              </div>
            </template>
            <el-table
              :data="task.applications || []"
              style="width: 100%"
              v-if="task.applications?.length > 0"
            >
              <el-table-column prop="applicant.real_name" label="申请人" min-width="100" />
              <el-table-column prop="applicant.student_id" label="学号" min-width="120" />
              <el-table-column
                prop="proposal"
                label="申请理由"
                min-width="200"
                show-overflow-tooltip
              />
              <el-table-column prop="expected_completion" label="预计完成时间" width="180">
                <template #default="{ row }">
                  {{ formatDate(row.expected_completion) }}
                </template>
              </el-table-column>
              <el-table-column prop="status" label="状态" width="100">
                <template #default="{ row }">
                  <el-tag :type="getApplicationStatusTagType(row.status)" size="small">
                    {{ getApplicationStatusText(row.status) }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
            <el-empty v-else description="暂无申请记录" />
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
                  type="success"
                  size="large"
                  @click="approveTask"
                  :disabled="task.status !== 'pending'"
                >
                  <el-icon><CircleCheck /></el-icon>
                  通过审核
                </el-button>
                <p>审核通过，任务发布</p>
              </div>
              <div class="action-item">
                <el-button
                  type="warning"
                  size="large"
                  @click="rejectTask"
                  :disabled="task.status !== 'pending'"
                >
                  <el-icon><CircleClose /></el-icon>
                  驳回审核
                </el-button>
                <p>驳回任务发布</p>
              </div>
              <div class="action-item">
                <el-button type="danger" size="large" @click="deleteTask">
                  <el-icon><Delete /></el-icon>
                  删除任务
                </el-button>
                <p>永久删除该任务</p>
              </div>
              <div class="action-item">
                <el-button size="large" @click="contactPublisher">
                  <el-icon><Message /></el-icon>
                  联系发布者
                </el-button>
                <p>联系任务发布者</p>
              </div>
            </div>
          </el-card>
        </el-tab-pane>
      </el-tabs>
    </div>

    <!-- 审核对话框 -->
    <el-dialog v-model="moderateDialog.visible" title="任务审核" width="500px">
      <el-form :model="moderateDialog.form" label-width="100px">
        <el-form-item label="审核结果" required>
          <el-radio-group v-model="moderateDialog.form.action">
            <el-radio value="approve">通过审核</el-radio>
            <el-radio value="reject">驳回审核</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见" v-if="moderateDialog.form.action === 'reject'" required>
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
import { ref, reactive, onMounted, markRaw } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  CircleCheck,
  CircleClose,
  Delete,
  Message,
  User,
  Phone,
  Ticket,
  Service,
  Reading,
  Picture,
  Cpu,
  Document,
  Shop,
} from '@element-plus/icons-vue'
import { taskManagementApi } from '@/api'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const task = ref({})
const activeTab = ref('info')

const moderateDialog = reactive({
  visible: false,
  loading: false,
  form: {
    action: 'approve',
    reason: '',
  },
})

// 任务分类图标映射
const categoryIconMap = {
  study: markRaw(Reading),
  design: markRaw(Picture),
  tech: markRaw(Cpu),
  writing: markRaw(Document),
  life: markRaw(Shop),
}

const getCategoryIcon = (category) => {
  return categoryIconMap[category] || markRaw(Document)
}

// 获取任务详情
const fetchTaskDetail = async () => {
  try {
    loading.value = true
    const response = await taskManagementApi.getTaskById(route.params.id)
    console.log('任务详情:', response)
    if (response.success) {
      task.value = response.data || {}
      return
    }
    ElMessage.error(response.message || '获取任务详情失败')
  } catch (error) {
    console.error('获取任务详情失败:', error)
    ElMessage.error('获取任务详情失败')
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  router.push('/tasks')
}

const refreshData = () => {
  fetchTaskDetail()
  ElMessage.success('已刷新')
}

const approveTask = () => {
  moderateDialog.form.action = 'approve'
  moderateDialog.form.reason = ''
  moderateDialog.visible = true
}

const rejectTask = () => {
  moderateDialog.form.action = 'reject'
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
      task.value.id,
      newStatus,
      moderateDialog.form.reason,
    )

    if (response.success) {
      ElMessage.success(`任务${moderateDialog.form.action === 'approve' ? '通过' : '驳回'}成功`)
      moderateDialog.visible = false
      fetchTaskDetail()
    }
  } catch (error) {
    ElMessage.error('审核失败: ' + error.message)
  } finally {
    moderateDialog.loading = false
  }
}

const deleteTask = async () => {
  try {
    await ElMessageBox.confirm('确定要删除此任务吗？此操作不可恢复。', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })

    const response = await taskManagementApi.deleteTask(task.value.id)
    if (response.success) {
      ElMessage.success('任务删除成功')
      router.push('/tasks')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除任务失败: ' + error.message)
    }
  }
}

const contactPublisher = () => {
  ElMessage.info('联系发布者功能开发中')
}

const viewUserDetail = (userId) => {
  if (userId) {
    router.push(`/users/${userId}`)
  }
}

const parseSkills = (skills) => {
  if (!skills) return []
  if (Array.isArray(skills)) return skills
  return skills
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s)
}

// 辅助函数
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
    in_progress: '',
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

const getApplicationStatusText = (status) => {
  const statusMap = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
  }
  return statusMap[status] || status
}

const getApplicationStatusTagType = (status) => {
  const statusMap = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'danger',
  }
  return statusMap[status] || ''
}

const formatDate = (dateString) => {
  if (!dateString) return null
  return new Date(dateString).toLocaleString('zh-CN')
}

onMounted(() => {
  fetchTaskDetail()
})
</script>

<style scoped>
.task-detail {
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

.header-title .task-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.85rem;
  color: var(--primary);
}

.header-right {
  display: flex;
  gap: 12px;
}

/* 任务概览卡片 */
.summary-card {
  margin-bottom: 20px;
  border-radius: var(--radius-xl);
}

.task-summary {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.summary-left {
  display: flex;
  align-items: center;
  gap: 20px;
}

.task-type-icon {
  width: 64px;
  height: 64px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.task-type-icon.study {
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
}

.task-type-icon.design {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
}

.task-type-icon.tech {
  background: rgba(249, 115, 22, 0.1);
  color: #f97316;
}

.task-type-icon.writing {
  background: rgba(236, 72, 153, 0.1);
  color: #ec4899;
}

.task-type-icon.life {
  background: rgba(156, 163, 175, 0.1);
  color: #9ca3af;
}

.task-info h2 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.task-tags {
  display: flex;
  gap: 8px;
}

.summary-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.price-display {
  text-align: right;
}

.price-label {
  display: block;
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.price-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
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
.requirements-card,
.skills-card,
.table-card,
.actions-card,
.person-card {
  margin-bottom: 16px;
  border-radius: var(--radius-xl);
  box-shadow: none;
}

/* 任务号样式 */
.task-no {
  font-family: 'Fira Code', monospace;
  font-size: 0.9rem;
  color: var(--primary);
}

/* 价格样式 */
.price {
  font-weight: 700;
  color: var(--accent-danger);
  font-family: 'Fira Code', monospace;
}

/* 取消原因样式 */
.cancel-reason {
  color: var(--accent-danger);
  font-weight: 500;
}

/* 描述内容 */
.description-content,
.requirements-content {
  padding: 16px;
  background: rgba(99, 102, 241, 0.05);
  border-radius: var(--radius-lg);
  line-height: 1.7;
  color: var(--text-secondary);
}

/* 技能标签 */
.skills-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

/* 人员卡片 */
.person-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.person-header .el-icon {
  color: var(--primary);
}

.person-info {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 0;
}

.person-info .el-avatar {
  color: white;
}

.person-details {
  flex: 1;
}

.person-name {
  font-weight: 600;
  font-size: 1.1rem;
  margin-bottom: 8px;
  color: var(--text-primary);
}

.person-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.person-meta span {
  display: flex;
  align-items: center;
  gap: 6px;
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
  grid-template-columns: repeat(2, 1fr);
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

  .task-summary {
    flex-direction: column;
    gap: 20px;
    align-items: flex-start;
  }

  .summary-right {
    align-items: flex-start;
  }

  .action-grid {
    grid-template-columns: 1fr;
  }

  .el-col-12 {
    width: 100%;
  }
}
</style>
