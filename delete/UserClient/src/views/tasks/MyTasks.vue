<template>
  <div class="my-tasks">
    <van-nav-bar title="我的任务" left-arrow @click-left="goBack">
      <template #subtitle>管理你发布和参与的所有任务</template>
    </van-nav-bar>

    <van-tabs v-model:active="currentTab" class="task-tabs" scrollspy sticky>
      <van-tab
        v-for="tab in tabs"
        :key="tab.value"
        :name="tab.value"
        :title="tab.name"
        :badge="getTabCount(tab.value)"
      >
        <template #title>
          <div class="tab-title">
            <van-icon :name="getTabIcon(tab.value)" />
            <span>{{ tab.name }}</span>
          </div>
        </template>

        <div class="tab-content">
          <!-- 搜索和排序 -->
          <div class="search-section">
            <van-search
              v-model="searchKeyword"
              placeholder="搜索任务..."
              background="#f7f8fa"
            />

            <van-row :gutter="12" class="filter-row">
              <van-col span="12">
                <van-field
                  v-model="sortByText"
                  label="排序"
                  placeholder="请选择排序方式"
                  readonly
                  is-link
                  @click="showSortPicker = true"
                />
              </van-col>
              <van-col span="12">
                <router-link to="/tasks/create">
                  <van-button type="primary" size="small" icon="plus" block>
                    发布新任务
                  </van-button>
                </router-link>
              </van-col>
            </van-row>
          </div>

          <!-- 加载状态 -->
          <van-loading v-if="taskStore.loading" class="loading-container" />

          <!-- 任务列表 -->
          <div v-else-if="filteredTasks.length" class="tasks-list">
            <van-card
              v-for="task in filteredTasks"
              :key="task.id"
              :title="task.title"
              :desc="task.description"
              :price="`¥${task.price}`"
              @click="viewTask(task.id)"
            >
              <template #thumb>
                <div class="task-category-thumb" :class="task.category">
                  <van-icon :name="getCategoryIcon(task.category)" />
                </div>
              </template>

              <template #top-right>
                <van-tag :type="getStatusTagType(task.status)" size="large">
                  {{ getStatusText(task.status) }}
                </van-tag>
              </template>

              <template #bottom>
                <div class="task-meta">
                  <div class="meta-row">
                    <van-icon name="clock-o" />
                    <span>{{ formatTime(task.created_at) }}</span>
                  </div>

                  <div class="meta-row" v-if="task.deadline">
                    <van-icon name="calendar-o" />
                    <span>{{ formatDeadline(task.deadline) }}</span>
                  </div>

                  <div class="meta-row" v-if="currentTab === 'published'">
                    <van-icon name="friends-o" />
                    <span>{{ task.applicant_count || 0 }}人申请</span>
                  </div>

                  <div class="meta-row" v-if="currentTab === 'applied'">
                    <van-icon name="info-o" />
                    <span :class="`application-${task.application_status}`">
                      {{ getApplicationStatusText(task.application_status) }}
                    </span>
                  </div>
                </div>

                <van-row v-if="task.tags && task.tags.length" class="task-tags">
                  <van-tag
                    v-for="tag in task.tags.slice(0, 3)"
                    :key="tag"
                    size="mini"
                    type="primary"
                    plain
                  >
                    {{ tag }}
                  </van-tag>
                </van-row>
              </template>

              <template #footer>
                <van-space>
                  <!-- 发布的任务操作 -->
                  <template v-if="currentTab === 'published'">
                    <van-button
                      v-if="task.applicant_count > 0"
                      size="small"
                      type="primary"
                      @click.stop="viewApplications(task)"
                    >
                      查看申请 ({{ task.applicant_count }})
                    </van-button>
                    <van-button size="small" @click.stop="editTask(task.id)">
                      编辑
                    </van-button>
                    <van-button size="small" type="danger" @click.stop="deleteTask(task.id)">
                      删除
                    </van-button>
                  </template>

                  <!-- 申请的任务操作 -->
                  <template v-else-if="currentTab === 'applied'">
                    <van-button size="small" type="primary" @click.stop="viewTask(task.id)">
                      查看详情
                    </van-button>
                    <van-button
                      v-if="task.application_status === 'pending'"
                      size="small"
                      type="warning"
                      @click.stop="withdrawApplication(task.id)"
                    >
                      撤回申请
                    </van-button>
                  </template>

                  <!-- 接受的任务操作 -->
                  <template v-else-if="currentTab === 'accepted'">
                    <van-button size="small" type="primary" @click.stop="viewTask(task.id)">
                      查看详情
                    </van-button>
                    <van-button
                      v-if="task.status === 'in_progress'"
                      size="small"
                      type="warning"
                      @click.stop="updateProgress(task)"
                    >
                      更新进度
                    </van-button>
                    <van-button
                      v-if="task.status === 'in_progress'"
                      size="small"
                      type="success"
                      @click.stop="completeTask(task.id)"
                    >
                      提交完成
                    </van-button>
                  </template>

                  <!-- 其他状态 -->
                  <template v-else>
                    <van-button size="small" type="primary" @click.stop="viewTask(task.id)">
                      查看详情
                    </van-button>
                  </template>
                </van-space>
              </template>
            </van-card>
          </div>

          <!-- 空状态 -->
          <van-empty v-else :description="getEmptyMessage()">
            <template #image>
              <van-icon :name="getEmptyIcon()" size="64" color="#dcdee0" />
            </template>

            <router-link
              v-if="currentTab === 'published' || currentTab === 'drafts'"
              to="/tasks/create"
            >
              <van-button type="primary">发布第一个任务</van-button>
            </router-link>
            <router-link v-else to="/tasks">
              <van-button type="primary">去找任务</van-button>
            </router-link>
          </van-empty>
        </div>
      </van-tab>
    </van-tabs>

    <!-- 申请列表弹窗 -->
    <van-popup v-model:show="showApplicationsModal" position="bottom" :style="{ height: '70%' }">
      <div class="applications-modal">
        <div class="modal-header">
          <van-nav-bar title="任务申请列表">
            <template #right>
              <van-button size="small" @click="closeApplicationsModal">关闭</van-button>
            </template>
          </van-nav-bar>
        </div>

        <div class="modal-content">
          <van-cell-group v-if="selectedTask" class="task-summary">
            <van-cell :title="selectedTask.title" :value="`¥${selectedTask.price}`" />
          </van-cell-group>

          <div v-if="selectedTask?.applications?.length" class="applications-list">
            <van-card
              v-for="application in selectedTask.applications"
              :key="application.id"
              :title="application.user.name"
              :desc="application.reason"
            >
              <template #thumb>
                <van-image
                  v-if="application.user.avatar"
                  :src="application.user.avatar"
                  width="40"
                  height="40"
                  round
                />
                <van-icon v-else name="user-circle-o" size="40" />
              </template>

              <template #bottom>
                <div class="applicant-info">
                  <div v-if="application.user.skills" class="skills">
                    <van-icon name="star-o" />
                    技能：{{ application.user.skills.join('、') }}
                  </div>
                  <div class="apply-time">
                    <van-icon name="clock-o" />
                    申请时间：{{ formatDateTime(application.created_at) }}
                  </div>
                  <div class="completion-time">
                    <van-icon name="calendar-o" />
                    预计完成：{{ formatDateTime(application.estimated_completion) }}
                  </div>
                  <div v-if="application.notes" class="notes">
                    <van-icon name="comment-o" />
                    {{ application.notes }}
                  </div>
                </div>
              </template>

              <template #footer>
                <van-space>
                  <van-button
                    type="success"
                    size="small"
                    @click="acceptApplication(application.id)"
                  >
                    接受
                  </van-button>
                  <van-button
                    type="danger"
                    size="small"
                    @click="rejectApplication(application.id)"
                  >
                    拒绝
                  </van-button>
                </van-space>
              </template>
            </van-card>
          </div>

          <van-empty v-else description="暂无申请" />
        </div>
      </div>
    </van-popup>

    <!-- 进度更新弹窗 -->
    <van-popup v-model:show="showProgressModal" position="bottom" :style="{ height: '60%' }">
      <div class="progress-modal">
        <div class="modal-header">
          <van-nav-bar title="更新任务进度">
            <template #right>
              <van-button size="small" @click="closeProgressModal">关闭</van-button>
            </template>
          </van-nav-bar>
        </div>

        <div class="modal-content">
          <van-cell-group v-if="selectedTask" class="task-summary">
            <van-cell :title="selectedTask.title" />
          </van-cell-group>

          <van-form @submit="submitProgress" class="progress-form">
            <van-field name="progress" label="完成进度">
              <template #input>
                <van-slider
                  v-model="progressForm.percentage"
                  :min="0"
                  :max="100"
                  :step="10"
                />
                <div class="progress-text">{{ progressForm.percentage }}%</div>
              </template>
            </van-field>

            <van-field
              v-model="progressForm.description"
              name="description"
              label="进度说明"
              type="textarea"
              placeholder="请描述当前的工作进展"
              rows="3"
              maxlength="200"
              show-word-limit
              required
            />

            <van-field
              v-model="progressForm.issues"
              name="issues"
              label="遇到的问题"
              type="textarea"
              placeholder="如有困难或需要协助的地方，请说明"
              rows="2"
              maxlength="200"
              show-word-limit
            />

            <div class="form-actions">
              <van-button @click="closeProgressModal" block>取消</van-button>
              <van-button
                type="primary"
                native-type="submit"
                :loading="taskStore.loading"
                block
              >
                提交进度
              </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- 排序选择器 -->
    <van-popup v-model:show="showSortPicker" position="bottom">
      <van-picker
        :columns="sortOptions"
        @confirm="onSortConfirm"
        @cancel="showSortPicker = false"
        title="选择排序方式"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const currentTab = ref('published')
const searchKeyword = ref('')
const sortBy = ref('newest')
const showSortPicker = ref(false)

const showApplicationsModal = ref(false)
const showProgressModal = ref(false)
const selectedTask = ref(null)

const progressForm = ref({
  percentage: 0,
  description: '',
  issues: '',
})

const tabs = [
  { value: 'published', name: '我发布的' },
  { value: 'applied', name: '我申请的' },
  { value: 'accepted', name: '我接受的' },
  { value: 'completed', name: '已完成' },
  { value: 'drafts', name: '草稿' },
]

const sortOptions = [
  { text: '最新发布', value: 'newest' },
  { text: '最早发布', value: 'oldest' },
  { text: '价格从高到低', value: 'price_high' },
  { text: '价格从低到高', value: 'price_low' },
  { text: '截止时间', value: 'deadline' },
]

const categories = {
  academic: '学习类',
  design: '设计类',
  tech: '技术类',
  writing: '文案类',
  life_service: '生活服务',
}

const filteredTasks = computed(() => {
  let tasks = []

  switch (currentTab.value) {
    case 'published':
      tasks = taskStore.publishedTasks || []
      break
    case 'applied':
      tasks = taskStore.appliedTasks || []
      break
    case 'accepted':
      tasks = taskStore.acceptedTasks || []
      break
    case 'completed':
      tasks = taskStore.completedTasks || []
      break
    case 'drafts':
      tasks = taskStore.draftTasks || []
      break
    default:
      tasks = []
  }

  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    tasks = tasks.filter(
      (task) =>
        task.title.toLowerCase().includes(keyword) ||
        task.description.toLowerCase().includes(keyword),
    )
  }

  // 排序
  switch (sortBy.value) {
    case 'oldest':
      tasks = tasks.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      break
    case 'price_high':
      tasks = tasks.sort((a, b) => b.price - a.price)
      break
    case 'price_low':
      tasks = tasks.sort((a, b) => a.price - b.price)
      break
    case 'deadline':
      tasks = tasks.sort((a, b) => {
        if (!a.deadline) return 1
        if (!b.deadline) return -1
        return new Date(a.deadline) - new Date(b.deadline)
      })
      break
    default: // newest
      tasks = tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  return tasks
})

const sortByText = computed(() => {
  const option = sortOptions.find(opt => opt.value === sortBy.value)
  return option ? option.text : '最新发布'
})

function getTabCount(tabValue) {
  switch (tabValue) {
    case 'published':
      return taskStore.publishedTasks?.length || 0
    case 'applied':
      return taskStore.appliedTasks?.length || 0
    case 'accepted':
      return taskStore.acceptedTasks?.length || 0
    case 'completed':
      return taskStore.completedTasks?.length || 0
    case 'drafts':
      return taskStore.draftTasks?.length || 0
    default:
      return 0
  }
}

function getTabIcon(tabValue) {
  const icons = {
    published: 'notes-o',
    applied: 'user-o',
    accepted: 'completed',
    completed: 'medal-o',
    drafts: 'coupon-o',
  }
  return icons[tabValue] || 'orders-o'
}

function getCategoryIcon(category) {
  const icons = {
    academic: 'todo-list-o',
    design: 'photo-o',
    tech: 'setting-o',
    writing: 'edit',
    life_service: 'home-o',
  }
  return icons[category] || 'orders-o'
}

function getCategoryName(category) {
  return categories[category] || category
}

function getStatusText(status) {
  const statusTexts = {
    draft: '草稿',
    published: '已发布',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusTexts[status] || status
}

function getStatusTagType(status) {
  const types = {
    draft: 'default',
    published: 'primary',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

function getApplicationStatusText(status) {
  const statusTexts = {
    pending: '待审核',
    accepted: '已接受',
    rejected: '已拒绝',
  }
  return statusTexts[status] || status
}

function formatTime(timeString) {
  const date = new Date(timeString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
  return date.toLocaleDateString()
}

function formatDateTime(timeString) {
  const date = new Date(timeString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
}

function formatDeadline(deadline) {
  const date = new Date(deadline)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return '已截止'
  if (diffDays === 0) return '今天截止'
  if (diffDays === 1) return '明天截止'
  if (diffDays < 7) return `${diffDays}天后截止`
  return formatDateTime(deadline)
}

function getEmptyIcon() {
  const icons = {
    published: 'notes-o',
    applied: 'user-o',
    accepted: 'completed',
    completed: 'medal-o',
    drafts: 'coupon-o',
  }
  return icons[currentTab.value] || 'orders-o'
}

function getEmptyMessage() {
  const messages = {
    published: '还没有发布任务，发布你的第一个任务吧',
    applied: '还没有申请任务，去任务大厅找找感兴趣的任务',
    accepted: '被接受的任务会显示在这里',
    completed: '完成的任务会显示在这里',
    drafts: '保存的草稿会显示在这里',
  }
  return messages[currentTab.value] || '暂无任务'
}

function goBack() {
  router.push('/tasks')
}

function viewTask(taskId) {
  router.push(`/tasks/${taskId}`)
}

function editTask(taskId) {
  router.push(`/tasks/${taskId}/edit`)
}

async function deleteTask(taskId) {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个任务吗？此操作无法撤销。',
    })

    await taskStore.deleteTask(taskId)
    await fetchMyTasks()
    showToast('任务已删除')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
      showToast('删除失败')
    }
  }
}

function viewApplications(task) {
  selectedTask.value = task
  showApplicationsModal.value = true
}

function closeApplicationsModal() {
  showApplicationsModal.value = false
  selectedTask.value = null
}

async function acceptApplication(applicationId) {
  try {
    await taskStore.acceptApplication(applicationId)
    await fetchMyTasks()
    closeApplicationsModal()
    showToast('申请已接受')
  } catch (error) {
    console.error('接受申请失败:', error)
    showToast('操作失败')
  }
}

async function rejectApplication(applicationId) {
  try {
    await taskStore.rejectApplication(applicationId)
    await fetchMyTasks()
    showToast('申请已拒绝')
  } catch (error) {
    console.error('拒绝申请失败:', error)
    showToast('操作失败')
  }
}

async function withdrawApplication(taskId) {
  try {
    await showConfirmDialog({
      title: '确认撤回',
      message: '确定要撤回申请吗？',
    })

    await taskStore.withdrawApplication(taskId)
    await fetchMyTasks()
    showToast('申请已撤回')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('撤回申请失败:', error)
      showToast('操作失败')
    }
  }
}

function updateProgress(task) {
  selectedTask.value = task
  progressForm.value = {
    percentage: task.progress?.percentage || 0,
    description: '',
    issues: '',
  }
  showProgressModal.value = true
}

function closeProgressModal() {
  showProgressModal.value = false
  selectedTask.value = null
}

async function submitProgress() {
  try {
    await taskStore.updateTaskProgress(selectedTask.value.id, progressForm.value)
    await fetchMyTasks()
    closeProgressModal()
    showToast('进度已更新')
  } catch (error) {
    console.error('更新进度失败:', error)
    showToast('更新失败')
  }
}

async function completeTask(taskId) {
  try {
    await showConfirmDialog({
      title: '确认提交',
      message: '确定要提交完成吗？',
    })

    await taskStore.completeTask(taskId)
    await fetchMyTasks()
    showToast('已提交完成')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交完成失败:', error)
      showToast('操作失败')
    }
  }
}

function onSortConfirm({ selectedOptions }) {
  sortBy.value = selectedOptions[0].value
  showSortPicker.value = false
}

async function fetchMyTasks() {
  try {
    await taskStore.fetchMyTasks()
  } catch (error) {
    console.error('获取我的任务失败:', error)
    showToast('加载失败')
  }
}

onMounted(() => {
  fetchMyTasks()
})
</script>

<style scoped>
.my-tasks {
  background: #f7f8fa;
  min-height: 100vh;
}

.task-tabs {
  background: white;
}

.tab-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.tab-content {
  padding: 16px;
}

.search-section {
  margin-bottom: 16px;
}

.filter-row {
  margin-top: 12px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-category-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.task-category-thumb.academic {
  background: #3f51b5;
}

.task-category-thumb.design {
  background: #e91e63;
}

.task-category-thumb.tech {
  background: #2196f3;
}

.task-category-thumb.writing {
  background: #4caf50;
}

.task-category-thumb.life_service {
  background: #ff9800;
}

.task-meta {
  margin-top: 8px;
}

.meta-row {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #969799;
}

.task-tags {
  margin-top: 8px;
  gap: 4px;
}

.application-pending {
  color: #ff976a;
}

.application-accepted {
  color: #07c160;
}

.application-rejected {
  color: #ee0a24;
}

.applications-modal,
.progress-modal {
  background: white;
  border-radius: 16px 16px 0 0;
  height: 100%;
}

.modal-header {
  border-bottom: 1px solid #ebedf0;
}

.modal-content {
  padding: 16px;
  overflow-y: auto;
  height: calc(100% - 64px);
}

.task-summary {
  margin-bottom: 16px;
}

.applications-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.applicant-info {
  margin-top: 8px;
}

.applicant-info > div {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #969799;
}

.progress-form .progress-text {
  text-align: center;
  margin-top: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #1989fa;
}

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}
</style>