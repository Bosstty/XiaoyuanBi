<template>
  <div class="task-list">
    <van-nav-bar title="任务列表" left-arrow @click-left="goBack">
      <template #subtitle>发布你的需求，寻找志同道合的伙伴</template>
      <template #right>
        <router-link to="/tasks/create">
          <van-button size="small" type="primary" icon="plus"> 发布任务 </van-button>
        </router-link>
      </template>
    </van-nav-bar>

    <!-- 筛选区域 -->
    <van-sticky>
      <div class="filter-section">
        <!-- 分类筛选 -->
        <van-tabs v-model:active="currentCategory" type="card" shrink sticky>
          <van-tab
            v-for="category in categories"
            :key="category.value"
            :name="category.value"
            :title="category.name"
          >
            <template #title>
              <div class="category-tab">
                <van-icon :name="getCategoryIcon(category.value)" />
                <span>{{ category.name }}</span>
              </div>
            </template>
          </van-tab>
        </van-tabs>

        <!-- 搜索和排序 -->
        <div class="search-controls">
          <van-search
            v-model="searchKeyword"
            placeholder="搜索任务标题、描述..."
            background="transparent"
          />

          <van-row :gutter="12" class="filter-controls">
            <van-col span="12">
              <van-field
                v-model="sortByText"
                label="排序"
                placeholder="排序方式"
                readonly
                is-link
                @click="showSortPicker = true"
              />
            </van-col>
            <van-col span="12">
              <van-field
                v-model="statusFilterText"
                label="状态"
                placeholder="任务状态"
                readonly
                is-link
                @click="showStatusPicker = true"
              />
            </van-col>
          </van-row>
        </div>
      </div>
    </van-sticky>

    <!-- 加载状态 -->
    <van-loading v-if="taskStore.loading" class="loading-container" />

    <!-- 任务列表 -->
    <div v-else-if="filteredTasks.length" class="tasks-container">
      <van-list
        v-model:loading="loading"
        :finished="finished"
        finished-text="没有更多了"
        @load="onLoad"
      >
        <van-card
          v-for="task in paginatedTasks"
          :key="task.id"
          :title="task.title"
          :desc="task.description"
          :price="`¥${task.price}`"
          @click="viewTaskDetail(task.id)"
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
            <div class="task-details">
              <!-- 标签 -->
              <van-space v-if="task.tags && task.tags.length" class="task-tags">
                <van-tag
                  v-for="tag in task.tags.slice(0, 3)"
                  :key="tag"
                  size="mini"
                  type="primary"
                  plain
                >
                  {{ tag }}
                </van-tag>
              </van-space>

              <!-- 技能要求 -->
              <div v-if="task.requirements" class="requirements">
                <div v-if="task.requirements.skills" class="requirement-item">
                  <van-icon name="star-o" />
                  <span class="label">技能要求：</span>
                  <span class="value">{{ task.requirements.skills.join(', ') }}</span>
                </div>
                <div v-if="task.requirements.experience" class="requirement-item">
                  <van-icon name="medal-o" />
                  <span class="label">经验要求：</span>
                  <span class="value">{{ task.requirements.experience }}</span>
                </div>
              </div>

              <!-- 任务信息 -->
              <div class="task-info">
                <div class="info-item">
                  <van-icon name="clock-o" />
                  <span>{{ formatTime(task.created_at) }}</span>
                </div>
                <div class="info-item" v-if="task.deadline">
                  <van-icon name="calendar-o" />
                  <span>{{ formatDeadline(task.deadline) }}</span>
                </div>
                <div class="info-item">
                  <van-icon name="friends-o" />
                  <span>{{ task.applicant_count || 0 }}人申请</span>
                </div>
              </div>
            </div>
          </template>

          <template #footer>
            <van-space justify="space-between" fill>
              <van-tag :type="getStatusTagType(task.status)" plain>
                {{ getStatusText(task.status) }}
              </van-tag>

              <van-button
                v-if="task.status === 'published'"
                type="success"
                size="small"
                @click.stop="showApplyModal(task)"
              >
                立即申请
              </van-button>
              <van-button v-else size="small" @click.stop="viewTaskDetail(task.id)">
                查看详情
              </van-button>
            </van-space>
          </template>
        </van-card>
      </van-list>
    </div>

    <!-- 空状态 -->
    <van-empty v-else description="暂无符合条件的任务">
      <template #image>
        <van-icon name="orders-o" size="64" color="#dcdee0" />
      </template>
      <van-button type="primary" @click="resetFilters"> 重置筛选条件 </van-button>
      <router-link to="/tasks/create">
        <van-button type="success" style="margin-left: 8px"> 发布第一个任务 </van-button>
      </router-link>
    </van-empty>

    <!-- 申请任务弹窗 -->
    <van-popup v-model:show="showApplyDialog" position="bottom" :style="{ height: '60%' }">
      <div class="apply-modal">
        <div class="modal-header">
          <van-nav-bar title="申请任务">
            <template #right>
              <van-button size="small" @click="closeApplyModal">关闭</van-button>
            </template>
          </van-nav-bar>
        </div>

        <div class="modal-content" v-if="selectedTask">
          <van-cell-group class="task-summary">
            <van-cell :title="selectedTask.title" :value="`¥${selectedTask.price}`" />
            <van-cell title="任务描述" :value="selectedTask.description" />
          </van-cell-group>

          <van-form @submit="submitApplication" class="apply-form">
            <van-field
              v-model="applicationForm.reason"
              name="reason"
              label="申请理由"
              type="textarea"
              placeholder="请说明你申请这个任务的理由，包括相关经验、技能等"
              rows="4"
              maxlength="200"
              show-word-limit
              required
            />

            <van-field
              v-model="applicationForm.estimated_completion"
              name="estimated_completion"
              label="预计完成时间"
              type="datetime-local"
              required
            />

            <van-field
              v-model="applicationForm.contact_info"
              name="contact_info"
              label="联系方式"
              placeholder="请输入手机号或微信号"
              required
            />

            <van-field
              v-model="applicationForm.notes"
              name="notes"
              label="补充说明"
              type="textarea"
              placeholder="其他需要说明的内容"
              rows="2"
              maxlength="200"
              show-word-limit
            />

            <div v-if="taskStore.error" class="error-message">
              {{ taskStore.error }}
            </div>

            <div class="form-actions">
              <van-button @click="closeApplyModal" block>取消</van-button>
              <van-button type="primary" native-type="submit" :loading="taskStore.loading" block>
                提交申请
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

    <!-- 状态选择器 -->
    <van-popup v-model:show="showStatusPicker" position="bottom">
      <van-picker
        :columns="statusOptions"
        @confirm="onStatusConfirm"
        @cancel="showStatusPicker = false"
        title="选择任务状态"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const currentCategory = ref('all')
const searchKeyword = ref('')
const sortBy = ref('newest')
const statusFilter = ref('all')
const currentPage = ref(1)
const pageSize = 10
const loading = ref(false)
const finished = ref(false)

const showApplyDialog = ref(false)
const showSortPicker = ref(false)
const showStatusPicker = ref(false)
const selectedTask = ref(null)

const applicationForm = ref({
  reason: '',
  estimated_completion: '',
  contact_info: '',
  notes: '',
})

const categories = [
  { value: 'all', name: '全部' },
  { value: 'academic', name: '学习类' },
  { value: 'design', name: '设计类' },
  { value: 'tech', name: '技术类' },
  { value: 'writing', name: '文案类' },
  { value: 'life_service', name: '生活服务' },
]

const sortOptions = [
  { text: '最新发布', value: 'newest' },
  { text: '价格从高到低', value: 'price_high' },
  { text: '价格从低到高', value: 'price_low' },
  { text: '截止时间', value: 'deadline' },
]

const statusOptions = [
  { text: '全部状态', value: 'all' },
  { text: '待接受', value: 'published' },
  { text: '进行中', value: 'in_progress' },
  { text: '已完成', value: 'completed' },
]

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks

  // 分类筛选
  if (currentCategory.value !== 'all') {
    tasks = tasks.filter((task) => task.category === currentCategory.value)
  }

  // 状态筛选
  if (statusFilter.value !== 'all') {
    tasks = tasks.filter((task) => task.status === statusFilter.value)
  }

  // 关键词搜索
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

const totalPages = computed(() => {
  return Math.ceil(filteredTasks.value.length / pageSize)
})

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  const end = start + pageSize
  return filteredTasks.value.slice(0, end) // 为了配合van-list的无限滚动
})

const sortByText = computed(() => {
  const option = sortOptions.find((opt) => opt.value === sortBy.value)
  return option ? option.text : '最新发布'
})

const statusFilterText = computed(() => {
  const option = statusOptions.find((opt) => opt.value === statusFilter.value)
  return option ? option.text : '全部状态'
})

function getCategoryIcon(category) {
  const icons = {
    all: 'orders-o',
    academic: 'todo-list-o',
    design: 'photo-o',
    tech: 'setting-o',
    writing: 'edit',
    life_service: 'home-o',
  }
  return icons[category] || 'orders-o'
}

function getStatusText(status) {
  const statusTexts = {
    published: '待接受',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return statusTexts[status] || status
}

function getStatusTagType(status) {
  const types = {
    published: 'primary',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
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

function formatDeadline(deadline) {
  const date = new Date(deadline)
  const now = new Date()
  const diffMs = date - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMs < 0) return '已截止'
  if (diffDays === 0) return '今天截止'
  if (diffDays === 1) return '明天截止'
  if (diffDays < 7) return `${diffDays}天后截止`
  return date.toLocaleDateString()
}

function goBack() {
  router.push('/tasks')
}

function viewTaskDetail(taskId) {
  router.push(`/tasks/${taskId}`)
}

function showApplyModal(task) {
  selectedTask.value = task
  showApplyDialog.value = true
  // 重置表单
  applicationForm.value = {
    reason: '',
    estimated_completion: '',
    contact_info: '',
    notes: '',
  }
}

function closeApplyModal() {
  showApplyDialog.value = false
  selectedTask.value = null
}

async function submitApplication() {
  if (!selectedTask.value) return

  try {
    await taskStore.applyForTask(selectedTask.value.id, applicationForm.value)
    closeApplyModal()
    showToast('申请提交成功')
  } catch (error) {
    console.error('申请失败:', error)
    showToast('申请失败，请重试')
  }
}

function onSortConfirm({ selectedOptions }) {
  sortBy.value = selectedOptions[0].value
  showSortPicker.value = false
  resetPagination()
}

function onStatusConfirm({ selectedOptions }) {
  statusFilter.value = selectedOptions[0].value
  showStatusPicker.value = false
  resetPagination()
}

function resetFilters() {
  currentCategory.value = 'all'
  searchKeyword.value = ''
  sortBy.value = 'newest'
  statusFilter.value = 'all'
  resetPagination()
}

function resetPagination() {
  currentPage.value = 1
  finished.value = false
}

function onLoad() {
  if (currentPage.value >= totalPages.value) {
    finished.value = true
    loading.value = false
    return
  }

  setTimeout(() => {
    currentPage.value++
    loading.value = false
  }, 1000)
}

async function fetchTasks() {
  try {
    await taskStore.fetchTasks()
  } catch (error) {
    console.error('获取任务列表失败:', error)
    showToast('加载失败')
  }
}

onMounted(() => {
  fetchTasks()
})
</script>

<style scoped>
.task-list {
  background: #f7f8fa;
  min-height: 100vh;
}

.filter-section {
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.search-controls {
  padding: 16px;
}

.filter-controls {
  margin-top: 12px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.tasks-container {
  padding: 16px;
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

.task-details {
  margin-top: 8px;
}

.task-tags {
  margin-bottom: 8px;
}

.requirements {
  margin-bottom: 8px;
}

.requirement-item {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #646566;
}

.requirement-item .label {
  color: #969799;
}

.requirement-item .value {
  color: #323233;
}

.task-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #969799;
}

.apply-modal {
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

.error-message {
  background: #fef0f0;
  color: #f56c6c;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  text-align: center;
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
