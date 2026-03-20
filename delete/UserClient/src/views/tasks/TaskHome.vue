<template>
  <div class="task-home">
    <van-nav-bar title="任务中心" fixed placeholder>
      <template #subtitle>发布任务，寻找帮手，技能变现</template>
    </van-nav-bar>

    <!-- 快捷操作栏 -->
    <van-row :gutter="12" class="action-bar">
      <van-col span="12">
        <router-link to="/tasks/publish" class="action-card primary">
          <van-icon name="plus" />
          <span>发布任务</span>
        </router-link>
      </van-col>
      <van-col span="12">
        <router-link to="/tasks/my" class="action-card secondary">
          <van-icon name="orders-o" />
          <span>我的任务</span>
        </router-link>
      </van-col>
    </van-row>

    <!-- 任务分类 -->
    <van-cell-group title="任务分类" class="category-section">
      <van-grid :column-num="2" :border="false">
        <van-grid-item
          v-for="category in categories"
          :key="category.id"
          @click="filterByCategory(category.id)"
        >
          <div class="category-item">
            <div class="category-icon">
              <van-icon :name="getCategoryIcon(category.id)" />
            </div>
            <div class="category-name">{{ category.name }}</div>
            <div class="category-count">{{ getCategoryCount(category.id) }}个任务</div>
          </div>
        </van-grid-item>
      </van-grid>
    </van-cell-group>

    <!-- 最新任务 -->
    <van-cell-group title="最新任务" class="task-section">
      <template #right-icon>
        <van-tabs v-model:active="activeFilter" type="card" shrink>
          <van-tab name="all" title="全部" />
          <van-tab name="urgent" title="紧急" />
          <van-tab name="high-pay" title="高薪" />
        </van-tabs>
      </template>

      <div v-if="filteredTasks.length" class="tasks-list">
        <van-card
          v-for="task in filteredTasks"
          :key="task.id"
          :title="task.title"
          :desc="task.description"
          :price="`¥${task.price}`"
          @click="applyTask(task)"
        >
          <template #thumb>
            <div class="task-thumb" :class="task.category">
              <van-icon :name="getCategoryIcon(task.category)" />
            </div>
          </template>

          <template #top-right>
            <van-tag v-if="task.urgent" type="danger" size="large"> 紧急 </van-tag>
            <van-tag v-else-if="task.price >= 50" type="warning" size="large"> 高薪 </van-tag>
          </template>

          <template #bottom>
            <van-space>
              <van-tag v-for="tag in task.tags" :key="tag" size="mini" type="primary" plain>
                {{ tag }}
              </van-tag>
            </van-space>
          </template>

          <template #footer>
            <van-space justify="space-between" fill>
              <div class="task-info">
                <div class="info-item">
                  <van-icon name="clock-o" />
                  <span>{{ formatTime(task.createTime) }}</span>
                </div>
                <div class="info-item">
                  <van-icon name="location-o" />
                  <span>{{ task.location }}</span>
                </div>
              </div>
              <van-button type="primary" size="small" @click.stop="applyTask(task)">
                立即申请
              </van-button>
            </van-space>
          </template>
        </van-card>
      </div>

      <van-empty v-else description="暂无任务" />
    </van-cell-group>

    <!-- 申请任务弹窗 -->
    <van-popup v-model:show="showApplyDialog" position="bottom" :style="{ height: '60%' }">
      <div class="apply-modal">
        <div class="modal-header">
          <van-nav-bar title="申请任务">
            <template #right>
              <van-button size="small" @click="closeApplyDialog">关闭</van-button>
            </template>
          </van-nav-bar>
        </div>

        <div class="modal-content" v-if="selectedTask">
          <van-cell-group class="task-summary">
            <van-cell
              :title="selectedTask.title"
              :value="`¥${selectedTask.price}`"
              :label="selectedTask.description"
            />
          </van-cell-group>

          <van-form @submit="submitApplication" class="apply-form">
            <van-field
              v-model="applicationForm.reason"
              name="reason"
              label="申请理由"
              type="textarea"
              placeholder="请说明您申请这个任务的理由，包括相关经验、技能等"
              rows="3"
              maxlength="200"
              show-word-limit
              required
            />

            <van-field
              v-model="applicationForm.contact"
              name="contact"
              label="联系方式"
              placeholder="请输入您的联系方式"
              required
            />

            <van-field
              v-model="applicationForm.notes"
              name="notes"
              label="补充说明"
              type="textarea"
              placeholder="其他需要说明的内容"
              rows="2"
              maxlength="100"
              show-word-limit
            />

            <div class="form-actions">
              <van-button @click="closeApplyDialog" block>取消</van-button>
              <van-button type="primary" native-type="submit" block> 提交申请 </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>

    <router-view />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const activeFilter = ref('all')
const showApplyDialog = ref(false)
const selectedTask = ref(null)

const applicationForm = ref({
  reason: '',
  contact: '',
  notes: '',
})

const categories = ref([
  { id: 'study', name: '学习辅导' },
  { id: 'design', name: '设计制作' },
  { id: 'tech', name: '技术开发' },
  { id: 'writing', name: '文案写作' },
  { id: 'life', name: '生活服务' },
  { id: 'other', name: '其他服务' },
])

const filteredTasks = computed(() => {
  let tasks = taskStore.tasks

  if (activeFilter.value === 'urgent') {
    tasks = tasks.filter((task) => task.urgent)
  } else if (activeFilter.value === 'high-pay') {
    tasks = tasks.filter((task) => task.price >= 50)
  }

  return tasks.slice(0, 10)
})

function getCategoryIcon(categoryId) {
  const icons = {
    study: 'todo-list-o',
    design: 'photo-o',
    tech: 'setting-o',
    writing: 'edit',
    life: 'home-o',
    other: 'service-o',
  }
  return icons[categoryId] || 'service-o'
}

function filterByCategory(categoryId) {
  // 跳转到任务列表页，并设置分类筛选
  router.push(`/tasks?category=${categoryId}`)
}

function getCategoryCount(categoryId) {
  return taskStore.getTasksByCategory(categoryId).length
}

function formatTime(time) {
  const now = new Date()
  const taskTime = new Date(time)
  const diff = now - taskTime
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚发布'
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

function applyTask(task) {
  selectedTask.value = task
  applicationForm.value = {
    reason: '',
    contact: '',
    notes: '',
  }
  showApplyDialog.value = true
}

function closeApplyDialog() {
  showApplyDialog.value = false
  selectedTask.value = null
}

async function submitApplication() {
  try {
    await taskStore.applyForTask(selectedTask.value.id, applicationForm.value)
    showToast('申请提交成功')
    closeApplyDialog()
  } catch (error) {
    console.error('申请失败:', error)
    showToast('申请失败，请重试')
  }
}

onMounted(() => {
  // 初始化任务数据
  if (taskStore.tasks.length === 0) {
    // 添加一些示例任务
    taskStore.addTask({
      title: '帮忙取快递',
      description: '本人在上课，有个快递到了，希望有人帮忙代取一下',
      category: 'life',
      price: 5,
      location: '1号宿舍楼',
      tags: ['快递', '代取'],
      urgent: false,
      createTime: Date.now(),
    })

    taskStore.addTask({
      title: '数学作业辅导',
      description: '高等数学作业不会做，需要有人辅导讲解',
      category: 'study',
      price: 30,
      location: '图书馆',
      tags: ['数学', '辅导'],
      urgent: true,
      createTime: Date.now() - 3600000,
    })

    taskStore.addTask({
      title: '海报设计',
      description: '需要设计一张活动海报，要求简洁美观',
      category: 'design',
      price: 80,
      location: '线上',
      tags: ['设计', '海报'],
      urgent: false,
      createTime: Date.now() - 7200000,
    })
  }
})
</script>

<style scoped>
.task-home {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.action-bar {
  margin: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border-radius: 12px;
  text-decoration: none;
  color: white;
  min-height: 80px;
  font-weight: 500;
  transition: transform 0.3s;
}

.action-card:active {
  transform: scale(0.95);
}

.action-card.primary {
  background: #1989fa;
}

.action-card.secondary {
  background: #07c160;
}

.action-card .van-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.category-section {
  margin: 16px;
}

.category-item {
  text-align: center;
  padding: 16px 8px;
}

.category-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 8px;
  background: #f0f2ff;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #1989fa;
  font-size: 20px;
}

.category-name {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  color: #323233;
}

.category-count {
  font-size: 12px;
  color: #969799;
}

.task-section {
  margin: 16px;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-thumb {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.task-thumb.study {
  background: #3f51b5;
}

.task-thumb.design {
  background: #e91e63;
}

.task-thumb.tech {
  background: #2196f3;
}

.task-thumb.writing {
  background: #4caf50;
}

.task-thumb.life {
  background: #ff9800;
}

.task-thumb.other {
  background: #9c27b0;
}

.task-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
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

.form-actions {
  display: flex;
  gap: 12px;
  margin-top: 16px;
}

.form-actions .van-button {
  flex: 1;
}
</style>
