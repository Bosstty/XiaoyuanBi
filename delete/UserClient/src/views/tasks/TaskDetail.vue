<template>
  <div class="task-detail">
    <van-nav-bar title="任务详情" left-arrow @click-left="goBack" />

    <!-- 加载状态 -->
    <van-loading v-if="taskStore.loading" class="loading-container" />

    <div v-else-if="task" class="task-content">
      <!-- 任务头部信息 -->
      <van-cell-group class="task-header">
        <van-cell :title="task.title" size="large">
          <template #label>
            <van-space class="task-meta">
              <van-tag type="primary" size="large">
                {{ getCategoryName(task.category) }}
              </van-tag>
              <van-tag :type="getStatusTagType(task.status)" size="large">
                {{ getStatusText(task.status) }}
              </van-tag>
            </van-space>
            <div class="publish-info">
              <van-icon name="clock-o" />
              <span>发布于 {{ formatTime(task.created_at) }}</span>
            </div>
          </template>
          <template #value>
            <div class="price-info">
              <div class="price-label">任务报酬</div>
              <div class="price-value">¥{{ task.price }}</div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 任务描述 -->
      <van-cell-group title="任务描述" class="content-section">
        <van-cell>
          <div class="task-description">{{ task.description }}</div>
        </van-cell>
      </van-cell-group>

      <!-- 任务要求 -->
      <van-cell-group v-if="task.requirements" title="任务要求" class="content-section">
        <van-cell
          v-if="task.requirements.skills && task.requirements.skills.length"
          title="技能要求"
        >
          <template #value>
            <van-space class="skills-list">
              <van-tag
                v-for="skill in task.requirements.skills"
                :key="skill"
                type="primary"
                size="medium"
              >
                {{ skill }}
              </van-tag>
            </van-space>
          </template>
        </van-cell>

        <van-cell
          v-if="task.requirements.experience"
          title="经验要求"
          :value="getExperienceText(task.requirements.experience)"
        />
      </van-cell-group>

      <!-- 相关标签 -->
      <van-cell-group v-if="task.tags && task.tags.length" title="相关标签" class="content-section">
        <van-cell>
          <van-space class="tags-list">
            <van-tag v-for="tag in task.tags" :key="tag" type="success" plain size="medium">
              {{ tag }}
            </van-tag>
          </van-space>
        </van-cell>
      </van-cell-group>

      <!-- 补充说明 -->
      <van-cell-group v-if="task.notes" title="补充说明" class="content-section">
        <van-cell>
          <div class="task-notes">{{ task.notes }}</div>
        </van-cell>
      </van-cell-group>

      <!-- 工作安排 -->
      <van-cell-group title="工作安排" class="content-section">
        <van-cell title="工作地点" :value="getLocationText(task.location_type, task.location)" />

        <van-cell v-if="task.deadline" title="完成期限" :value="formatDeadline(task.deadline)" />

        <van-cell title="紧急程度">
          <template #value>
            <span :class="`priority-${task.priority}`">
              {{ getPriorityText(task.priority) }}
            </span>
          </template>
        </van-cell>

        <van-cell
          v-if="task.contact_preferences && task.contact_preferences.length"
          title="联系方式"
          :value="task.contact_preferences.join('、')"
        />
      </van-cell-group>

      <!-- 任务信息 -->
      <van-cell-group title="任务信息" class="content-section">
        <van-cell title="发布者" :value="task.publisher?.name || '匿名用户'" />
        <van-cell title="发布时间" :value="formatDateTime(task.created_at)" />
        <van-cell v-if="task.deadline" title="截止时间" :value="formatDateTime(task.deadline)" />
        <van-cell title="申请人数" :value="`${task.applicant_count || 0}人`" />
        <van-cell title="浏览次数" :value="`${task.view_count || 0}次`" />
      </van-cell-group>

      <!-- 申请列表 -->
      <van-cell-group v-if="task.applications && task.applications.length" title="申请列表">
        <div class="applications-list">
          <van-card
            v-for="application in task.applications"
            :key="application.id"
            :title="application.user.name"
            :desc="application.reason"
            class="application-item"
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
              <div class="application-info">
                <div v-if="application.user.skills" class="skills-info">
                  <van-icon name="star-o" />
                  技能：{{ application.user.skills.join('、') }}
                </div>
                <div class="time-info">
                  <van-icon name="clock-o" />
                  预计完成：{{ formatDateTime(application.estimated_completion) }}
                </div>
                <div v-if="application.notes" class="notes-info">
                  <van-icon name="comment-o" />
                  {{ application.notes }}
                </div>
              </div>
            </template>

            <template v-if="isTaskOwner" #footer>
              <van-space>
                <van-button type="success" size="small" @click="acceptApplication(application.id)">
                  接受
                </van-button>
                <van-button type="danger" size="small" @click="rejectApplication(application.id)">
                  拒绝
                </van-button>
              </van-space>
            </template>
          </van-card>
        </div>
      </van-cell-group>

      <!-- 相关任务 -->
      <van-cell-group v-if="relatedTasks.length" title="相关任务" class="content-section">
        <van-cell
          v-for="relatedTask in relatedTasks"
          :key="relatedTask.id"
          :title="relatedTask.title"
          :value="`¥${relatedTask.price}`"
          is-link
          @click="viewTask(relatedTask.id)"
        />
      </van-cell-group>
    </div>

    <!-- 错误状态 -->
    <van-empty v-else description="任务不存在">
      <template #image>
        <van-icon name="warning-o" size="64" color="#dcdee0" />
      </template>
      <van-button type="primary" @click="goBack">返回任务列表</van-button>
    </van-empty>

    <!-- 底部操作栏 -->
    <div v-if="task" class="action-bar">
      <!-- 申请任务 -->
      <van-button
        v-if="task.status === 'published' && !isTaskOwner"
        type="primary"
        block
        size="large"
        @click="showApplyModal"
      >
        申请这个任务
      </van-button>

      <!-- 任务发布者操作 -->
      <van-space v-else-if="isTaskOwner" fill>
        <van-button size="large" @click="editTask">编辑任务</van-button>
        <van-button type="danger" size="large" @click="deleteTask">删除任务</van-button>
      </van-space>

      <!-- 其他状态 -->
      <div v-else class="status-message">
        <van-notice-bar :text="getStatusMessage(task.status)" />
      </div>
    </div>

    <!-- 申请任务弹窗 -->
    <van-popup v-model:show="showApplyDialog" position="bottom" :style="{ height: '70%' }">
      <div class="apply-modal">
        <div class="modal-header">
          <van-nav-bar title="申请任务">
            <template #right>
              <van-button size="small" @click="closeApplyModal">关闭</van-button>
            </template>
          </van-nav-bar>
        </div>

        <div class="modal-content">
          <van-cell-group class="task-summary">
            <van-cell :title="task?.title" :value="`¥${task?.price}`" />
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
              :rules="[{ required: true, message: '请输入申请理由' }]"
            />

            <van-field
              v-model="applicationForm.estimated_completion"
              name="estimated_completion"
              label="预计完成时间"
              type="datetime-local"
              required
              :rules="[{ required: true, message: '请选择预计完成时间' }]"
            />

            <van-field
              v-model="applicationForm.contact_info"
              name="contact_info"
              label="联系方式"
              placeholder="请输入手机号或微信号"
              required
              :rules="[{ required: true, message: '请输入联系方式' }]"
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

            <van-notice-bar
              v-if="taskStore.error"
              type="danger"
              :text="taskStore.error"
              background="#fef0f0"
              color="#f56c6c"
            />

            <div class="form-actions">
              <van-button @click="closeApplyModal" block>取消</van-button>
              <van-button
                type="primary"
                native-type="submit"
                :loading="taskStore.loading"
                loading-text="提交中..."
                block
              >
                提交申请
              </van-button>
            </div>
          </van-form>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { useUserStore } from '@/stores/user'
import { showToast, showConfirmDialog } from 'vant'

const route = useRoute()
const router = useRouter()
const taskStore = useTaskStore()
const userStore = useUserStore()

const task = ref(null)
const relatedTasks = ref([])
const showApplyDialog = ref(false)
const applicationForm = ref({
  reason: '',
  estimated_completion: '',
  contact_info: '',
  notes: '',
})

const isTaskOwner = computed(() => {
  return task.value && userStore.user && task.value.publisher_id === userStore.user.id
})

const categories = {
  academic: '学习类',
  design: '设计类',
  tech: '技术类',
  writing: '文案类',
  life_service: '生活服务',
}

const experiences = {
  beginner: '初学者',
  intermediate: '有一定经验',
  advanced: '经验丰富',
  expert: '专业级别',
}

const priorities = {
  normal: '普通',
  urgent: '紧急',
  very_urgent: '非常紧急',
}

function goBack() {
  router.push('/tasks')
}

function getCategoryName(category) {
  return categories[category] || category
}

function getExperienceText(experience) {
  return experiences[experience] || experience
}

function getPriorityText(priority) {
  return priorities[priority] || priority
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

function getStatusMessage(status) {
  const messages = {
    in_progress: '任务正在进行中',
    completed: '任务已完成',
    cancelled: '任务已取消',
  }
  return messages[status] || ''
}

function getLocationText(locationType, location) {
  const locationTypes = {
    remote: '远程工作',
    onsite: location || '现场工作',
    flexible: '灵活安排',
  }
  return locationTypes[locationType] || '未指定'
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

function showApplyModal() {
  showApplyDialog.value = true
  applicationForm.value = {
    reason: '',
    estimated_completion: '',
    contact_info: '',
    notes: '',
  }
}

function closeApplyModal() {
  showApplyDialog.value = false
}

async function submitApplication() {
  try {
    await taskStore.applyForTask(task.value.id, applicationForm.value)
    closeApplyModal()
    showToast('申请提交成功')
    await fetchTaskDetail()
  } catch (error) {
    console.error('申请失败:', error)
    showToast('申请失败，请重试')
  }
}

async function acceptApplication(applicationId) {
  try {
    await taskStore.acceptApplication(applicationId)
    await fetchTaskDetail()
    showToast('申请已接受')
  } catch (error) {
    console.error('接受申请失败:', error)
    showToast('操作失败')
  }
}

async function rejectApplication(applicationId) {
  try {
    await taskStore.rejectApplication(applicationId)
    await fetchTaskDetail()
    showToast('申请已拒绝')
  } catch (error) {
    console.error('拒绝申请失败:', error)
    showToast('操作失败')
  }
}

function editTask() {
  router.push(`/tasks/${task.value.id}/edit`)
}

async function deleteTask() {
  try {
    await showConfirmDialog({
      title: '确认删除',
      message: '确定要删除这个任务吗？此操作无法撤销。',
    })

    await taskStore.deleteTask(task.value.id)
    showToast('任务已删除')
    router.push('/tasks')
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除任务失败:', error)
      showToast('删除失败')
    }
  }
}

function viewTask(taskId) {
  router.push(`/tasks/${taskId}`)
}

async function fetchTaskDetail() {
  try {
    const taskId = route.params.id
    task.value = await taskStore.fetchTaskDetail(taskId)

    if (task.value) {
      relatedTasks.value = await taskStore.fetchRelatedTasks(task.value.category, taskId)
    }
  } catch (error) {
    console.error('获取任务详情失败:', error)
    task.value = null
  }
}

onMounted(() => {
  fetchTaskDetail()
})
</script>

<style scoped>
.task-detail {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 80px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.task-content {
  background: #f7f8fa;
}

.content-section {
  margin-bottom: 16px;
}

.task-header {
  margin-bottom: 16px;
}

.task-meta {
  margin-bottom: 8px;
}

.publish-info {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
}

.price-info {
  text-align: right;
}

.price-label {
  font-size: 12px;
  color: #969799;
  margin-bottom: 2px;
}

.price-value {
  font-size: 20px;
  font-weight: 600;
  color: #1989fa;
}

.task-description,
.task-notes {
  line-height: 1.6;
  color: #646566;
  white-space: pre-wrap;
}

.skills-list,
.tags-list {
  flex-wrap: wrap;
}

.priority-urgent {
  color: #ff976a;
  font-weight: 500;
}

.priority-very_urgent {
  color: #ee0a24;
  font-weight: 500;
}

.applications-list {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.application-item {
  border-radius: 8px;
}

.application-info {
  margin-top: 8px;
}

.application-info > div {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
  font-size: 12px;
  color: #969799;
}

.skills-info {
  color: #646566;
}

.time-info,
.notes-info {
  color: #969799;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.status-message {
  padding: 8px 0;
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
