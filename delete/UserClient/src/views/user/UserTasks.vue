<template>
  <div class="user-tasks">
    <div class="page-header">
      <h2>我的任务</h2>
      <div class="header-actions">
        <router-link to="/tasks/create" class="create-btn">
          <van-icon name="plus" />
          发布新任务
        </router-link>
      </div>
    </div>

    <van-tabs v-model:active="activeTab" @change="handleTabChange">
      <van-tab title="发布的任务" name="published">
        <div v-if="loading" class="loading-container">
          <van-loading size="40px" />
          <p>加载中...</p>
        </div>

        <div v-else-if="publishedTasks.length === 0" class="empty-state">
          <van-empty description="还没有发布过任务">
            <template #image>
              <van-icon name="orders-o" size="64" color="#ddd" />
            </template>
            <router-link to="/tasks/create">
              <van-button type="primary">发布第一个任务</van-button>
            </router-link>
          </van-empty>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="task in publishedTasks"
            :key="task.id"
            class="task-card"
            @click="goToTaskDetail(task.id)"
          >
            <div class="task-header">
              <h4>{{ task.title }}</h4>
              <van-tag :type="getStatusType(task.status)" size="large">
                {{ getStatusText(task.status) }}
              </van-tag>
            </div>
            <div class="task-meta">
              <span class="task-category">{{ getCategoryText(task.category) }}</span>
              <span class="task-price">￥{{ task.price }}</span>
            </div>
            <p class="task-description">{{ task.description }}</p>
            <div class="task-footer">
              <span class="task-time">{{ formatTime(task.created_at) }}</span>
              <span class="task-applications">{{ task.applications_count || 0 }}人申请</span>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="申请的任务" name="applied">
        <div v-if="loading" class="loading-container">
          <van-loading size="40px" />
          <p>加载中...</p>
        </div>

        <div v-else-if="appliedTasks.length === 0" class="empty-state">
          <van-empty description="还没有申请过任务">
            <template #image>
              <van-icon name="orders-o" size="64" color="#ddd" />
            </template>
            <router-link to="/tasks">
              <van-button type="primary">去看看有什么任务</van-button>
            </router-link>
          </van-empty>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="application in appliedTasks"
            :key="application.id"
            class="task-card"
            @click="goToTaskDetail(application.task.id)"
          >
            <div class="task-header">
              <h4>{{ application.task.title }}</h4>
              <van-tag :type="getApplicationStatusType(application.status)" size="large">
                {{ getApplicationStatusText(application.status) }}
              </van-tag>
            </div>
            <div class="task-meta">
              <span class="task-category">{{ getCategoryText(application.task.category) }}</span>
              <span class="task-price">￥{{ application.task.price }}</span>
            </div>
            <p class="task-description">{{ application.task.description }}</p>
            <div class="task-footer">
              <span class="task-time">申请时间：{{ formatTime(application.created_at) }}</span>
              <span class="task-owner">发布者：{{ application.task.publisher?.username }}</span>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="进行中的任务" name="ongoing">
        <div v-if="loading" class="loading-container">
          <van-loading size="40px" />
          <p>加载中...</p>
        </div>

        <div v-else-if="ongoingTasks.length === 0" class="empty-state">
          <van-empty description="暂无进行中的任务">
            <template #image>
              <van-icon name="orders-o" size="64" color="#ddd" />
            </template>
          </van-empty>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="task in ongoingTasks"
            :key="task.id"
            class="task-card ongoing"
            @click="goToTaskDetail(task.id)"
          >
            <div class="task-header">
              <h4>{{ task.title }}</h4>
              <van-tag type="warning" size="large">进行中</van-tag>
            </div>
            <div class="task-meta">
              <span class="task-category">{{ getCategoryText(task.category) }}</span>
              <span class="task-price">￥{{ task.price }}</span>
            </div>
            <p class="task-description">{{ task.description }}</p>
            <div class="task-footer">
              <span class="task-time">开始时间：{{ formatTime(task.started_at) }}</span>
              <span class="task-deadline" v-if="task.deadline">
                截止时间：{{ formatTime(task.deadline) }}
              </span>
            </div>
            <div class="task-actions">
              <van-button
                size="small"
                type="primary"
                @click.stop="completeTask(task.id)"
                :loading="completingTask === task.id"
              >
                标记完成
              </van-button>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="已完成" name="completed">
        <div v-if="loading" class="loading-container">
          <van-loading size="40px" />
          <p>加载中...</p>
        </div>

        <div v-else-if="completedTasks.length === 0" class="empty-state">
          <van-empty description="暂无已完成的任务">
            <template #image>
              <van-icon name="orders-o" size="64" color="#ddd" />
            </template>
          </van-empty>
        </div>

        <div v-else class="tasks-list">
          <div
            v-for="task in completedTasks"
            :key="task.id"
            class="task-card completed"
            @click="goToTaskDetail(task.id)"
          >
            <div class="task-header">
              <h4>{{ task.title }}</h4>
              <van-tag type="success" size="large">已完成</van-tag>
            </div>
            <div class="task-meta">
              <span class="task-category">{{ getCategoryText(task.category) }}</span>
              <span class="task-price">￥{{ task.price }}</span>
            </div>
            <p class="task-description">{{ task.description }}</p>
            <div class="task-footer">
              <span class="task-time">完成时间：{{ formatTime(task.completed_at) }}</span>
              <van-rate
                v-if="task.rating"
                :model-value="task.rating"
                readonly
                size="12px"
                class="task-rating"
              />
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast, showConfirmDialog } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const activeTab = ref('published')
const loading = ref(false)
const completingTask = ref(null)

const publishedTasks = computed(() => taskStore.myTasks.filter(task =>
  ['published', 'pending', 'assigned'].includes(task.status)
))

const appliedTasks = computed(() => taskStore.myApplications || [])

const ongoingTasks = computed(() => taskStore.myTasks.filter(task =>
  task.status === 'in_progress'
))

const completedTasks = computed(() => taskStore.myTasks.filter(task =>
  task.status === 'completed'
))

function handleTabChange(tabName) {
  activeTab.value = tabName
  loadTasks()
}

function goToTaskDetail(taskId) {
  router.push(`/tasks/${taskId}`)
}

function getStatusType(status) {
  const types = {
    published: 'default',
    pending: 'warning',
    assigned: 'primary',
    in_progress: 'warning',
    completed: 'success',
    cancelled: 'danger',
  }
  return types[status] || 'default'
}

function getStatusText(status) {
  const texts = {
    published: '已发布',
    pending: '待确认',
    assigned: '已分配',
    in_progress: '进行中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return texts[status] || status
}

function getApplicationStatusType(status) {
  const types = {
    pending: 'warning',
    accepted: 'success',
    rejected: 'danger',
  }
  return types[status] || 'default'
}

function getApplicationStatusText(status) {
  const texts = {
    pending: '待处理',
    accepted: '已接受',
    rejected: '已拒绝',
  }
  return texts[status] || status
}

function getCategoryText(category) {
  const texts = {
    academic: '学习类',
    design: '设计类',
    tech: '技术类',
    writing: '文案类',
    life_service: '生活服务',
  }
  return texts[category] || category
}

function formatTime(time) {
  if (!time) return ''
  return new Date(time).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function completeTask(taskId) {
  try {
    await showConfirmDialog({
      title: '确认操作',
      message: '确定要标记此任务为已完成吗？',
      confirmButtonText: '确定',
      cancelButtonText: '取消',
    })

    completingTask.value = taskId
    await taskStore.completeTask(taskId)
    showToast('任务已标记为完成')
    loadTasks()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('完成任务失败:', error)
      showToast('操作失败，请重试')
    }
  } finally {
    completingTask.value = null
  }
}

async function loadTasks() {
  loading.value = true
  try {
    await taskStore.fetchMyTasks()
    if (activeTab.value === 'applied') {
      await taskStore.fetchMyApplications()
    }
  } catch (error) {
    console.error('加载任务失败:', error)
    showToast('加载失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTasks()
})
</script>

<style scoped>
.user-tasks {
  background: white;
  border-radius: 8px;
  padding: 24px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #ebeef5;
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 20px;
  font-weight: 600;
}

.create-btn {
  background: #409eff;
  color: white;
  padding: 8px 16px;
  border-radius: 6px;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  transition: background 0.3s;
}

.create-btn:hover {
  background: #337ecc;
  color: white;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #909399;
}

.empty-state {
  padding: 40px 0;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.task-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
  transform: translateY(-2px);
}

.task-card.ongoing {
  border-left: 4px solid #e6a23c;
}

.task-card.completed {
  border-left: 4px solid #67c23a;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.task-header h4 {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  flex: 1;
  margin-right: 12px;
  line-height: 1.4;
}

.task-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.task-category {
  background: #f0f9ff;
  color: #409eff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.task-price {
  color: #e6a23c;
  font-weight: 600;
  font-size: 16px;
}

.task-description {
  color: #606266;
  margin: 0 0 16px 0;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #909399;
}

.task-time,
.task-applications,
.task-owner,
.task-deadline {
  font-size: 12px;
  color: #909399;
}

.task-actions {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f5f7fa;
  display: flex;
  justify-content: flex-end;
}

.task-rating {
  margin-left: 12px;
}

@media (max-width: 768px) {
  .user-tasks {
    padding: 16px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .task-card {
    padding: 16px;
  }

  .task-header {
    flex-direction: column;
    gap: 8px;
  }

  .task-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .task-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
}
</style>