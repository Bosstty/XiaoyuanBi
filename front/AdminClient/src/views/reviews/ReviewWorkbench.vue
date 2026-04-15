<template>
  <div class="page-container review-workbench">
    <section class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">审核工作台</h1>
        <p class="page-subtitle">集中处理学生认证、配送员审核、帖子审核、任务审核与用户举报</p>
      </div>
      <el-button type="primary" @click="fetchWorkbench">刷新队列</el-button>
    </section>

    <section class="stats-grid" v-loading="loading">
      <article class="stat-card primary">
        <span>待审总量</span>
        <strong>{{ stats.totalPending }}</strong>
        <p>当前需要人工处理的审核项</p>
      </article>
      <article v-if="modules.students" class="stat-card">
        <span>学生认证</span>
        <strong>{{ stats.students }}</strong>
        <p>待审核学生资料</p>
      </article>
      <article v-if="modules.deliverers" class="stat-card">
        <span>配送员申请</span>
        <strong>{{ stats.deliverers }}</strong>
        <p>待审核配送员申请</p>
      </article>
      <article v-if="modules.posts" class="stat-card">
        <span>帖子待审</span>
        <strong>{{ stats.posts }}</strong>
        <p>{{ stats.preModeratedPosts }} 条命中预审规则</p>
      </article>
      <article v-if="modules.tasks" class="stat-card">
        <span>任务待审</span>
        <strong>{{ stats.tasks }}</strong>
        <p>{{ stats.preModeratedTasks }} 条命中预审规则</p>
      </article>
      <article v-if="modules.reports" class="stat-card">
        <span>举报待处理</span>
        <strong>{{ stats.reports }}</strong>
        <p>用户举报后待人工确认的内容</p>
      </article>
    </section>

    <section class="board-grid" v-loading="loading">
      <el-card v-if="modules.students" shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <div class="panel-title">学生认证</div>
              <div class="panel-desc">优先处理已提交认证材料的用户</div>
            </div>
            <el-button text @click="router.push('/users')">查看全部</el-button>
          </div>
        </template>
        <div v-if="students.length" class="queue-list">
          <div v-for="item in students" :key="`student-${item.id}`" class="queue-item">
            <div class="queue-main">
              <strong>{{ item.real_name || item.username || `用户#${item.id}` }}</strong>
              <span>{{ item.student_id || '--' }} · {{ item.college || '未填写学院' }}</span>
              <small>{{ formatTime(item.submitted_at) }}</small>
            </div>
            <div class="queue-actions">
              <el-button size="small" @click="router.push(`/users/${item.id}`)">详情</el-button>
              <el-button size="small" type="success" @click="verifyStudent(item, true)">通过</el-button>
              <el-button size="small" type="danger" plain @click="verifyStudent(item, false)">拒绝</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无待审学生认证" :image-size="88" />
      </el-card>

      <el-card v-if="modules.deliverers" shadow="never" class="panel-card">
        <template #header>
          <div class="panel-head">
            <div>
              <div class="panel-title">配送员审核</div>
              <div class="panel-desc">处理骑手入驻申请和身份核验</div>
            </div>
            <el-button text @click="router.push('/deliverers/verification')">查看全部</el-button>
          </div>
        </template>
        <div v-if="deliverers.length" class="queue-list">
          <div v-for="item in deliverers" :key="`deliverer-${item.id}`" class="queue-item">
            <div class="queue-main">
              <strong>{{ item.real_name || item.user?.real_name || `配送员#${item.id}` }}</strong>
              <span>{{ item.phone || '--' }} · {{ vehicleTypeText(item.vehicle_type) }}</span>
              <small>{{ formatTime(item.created_at) }}</small>
            </div>
            <div class="queue-actions">
              <el-button size="small" @click="router.push('/deliverers/verification')">详情</el-button>
              <el-button size="small" type="success" @click="verifyDeliverer(item, true)">通过</el-button>
              <el-button size="small" type="danger" plain @click="verifyDeliverer(item, false)">拒绝</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无待审配送员申请" :image-size="88" />
      </el-card>

      <el-card v-if="modules.posts" shadow="never" class="panel-card panel-span-2">
        <template #header>
          <div class="panel-head">
            <div>
              <div class="panel-title">帖子审核</div>
              <div class="panel-desc">命中敏感词的帖子会优先显示预审原因</div>
            </div>
            <el-button text @click="router.push('/forum')">查看全部</el-button>
          </div>
        </template>
        <div v-if="posts.length" class="queue-list">
          <div v-for="item in posts" :key="`post-${item.id}`" class="queue-item">
            <div class="queue-main">
              <div class="queue-title-row">
                <strong class="queue-title-text">
                  <template
                    v-for="(segment, index) in getHighlightedSegments(item.title, getMatchedWords(item))"
                    :key="`post-title-${item.id}-${index}`"
                  >
                    <span :class="{ 'sensitive-hit': segment.hit }">{{ segment.text }}</span>
                  </template>
                </strong>
                <el-tag v-if="item.reason" type="warning" size="small">预审命中</el-tag>
                <el-tag
                  v-for="word in getMatchedWords(item)"
                  :key="`post-word-${item.id}-${word}`"
                  type="danger"
                  effect="light"
                  size="small"
                  class="sensitive-word-tag"
                >
                  {{ word }}
                </el-tag>
              </div>
              <span>{{ categoryText(item.category) }} · {{ item.author?.real_name || item.author?.username || '--' }}</span>
              <small v-if="item.reason" class="queue-reason">
                <template
                  v-for="(segment, index) in getHighlightedSegments(item.reason, getMatchedWords(item))"
                  :key="`post-reason-${item.id}-${index}`"
                >
                  <span :class="{ 'sensitive-hit': segment.hit }">{{ segment.text }}</span>
                </template>
              </small>
              <small>{{ formatTime(item.created_at) }}</small>
            </div>
            <div class="queue-actions">
              <el-button size="small" @click="router.push(`/forum/posts/${item.id}`)">详情</el-button>
              <el-button size="small" type="success" @click="moderatePost(item, 'approve')">通过</el-button>
              <el-button size="small" type="danger" plain @click="moderatePost(item, 'reject')">拒绝</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无待审帖子" :image-size="88" />
      </el-card>

      <el-card v-if="modules.tasks" shadow="never" class="panel-card panel-span-2">
        <template #header>
          <div class="panel-head">
            <div>
              <div class="panel-title">任务审核</div>
              <div class="panel-desc">待发布任务统一在这里处理，命中预审规则会显示原因</div>
            </div>
            <el-button text @click="router.push('/tasks')">查看全部</el-button>
          </div>
        </template>
        <div v-if="tasks.length" class="queue-list">
          <div v-for="item in tasks" :key="`task-${item.id}`" class="queue-item">
            <div class="queue-main">
              <div class="queue-title-row">
                <strong class="queue-title-text">
                  <template
                    v-for="(segment, index) in getHighlightedSegments(item.title, getMatchedWords(item))"
                    :key="`task-title-${item.id}-${index}`"
                  >
                    <span :class="{ 'sensitive-hit': segment.hit }">{{ segment.text }}</span>
                  </template>
                </strong>
                <el-tag type="info" size="small">¥{{ formatMoney(item.price) }}</el-tag>
                <el-tag v-if="item.reason" type="warning" size="small">预审命中</el-tag>
                <el-tag
                  v-for="word in getMatchedWords(item)"
                  :key="`task-word-${item.id}-${word}`"
                  type="danger"
                  effect="light"
                  size="small"
                  class="sensitive-word-tag"
                >
                  {{ word }}
                </el-tag>
              </div>
              <span>{{ taskCategoryText(item.category) }} · {{ item.publisher?.real_name || item.publisher?.username || '--' }}</span>
              <small v-if="item.reason" class="queue-reason">
                <template
                  v-for="(segment, index) in getHighlightedSegments(item.reason, getMatchedWords(item))"
                  :key="`task-reason-${item.id}-${index}`"
                >
                  <span :class="{ 'sensitive-hit': segment.hit }">{{ segment.text }}</span>
                </template>
              </small>
              <small>{{ formatTime(item.created_at) }}</small>
            </div>
            <div class="queue-actions">
              <el-button size="small" @click="router.push(`/tasks/${item.id}`)">详情</el-button>
              <el-button size="small" type="success" @click="moderateTask(item, true)">通过</el-button>
              <el-button size="small" type="danger" plain @click="moderateTask(item, false)">拒绝</el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无待审任务" :image-size="88" />
      </el-card>

      <el-card v-if="modules.reports" shadow="never" class="panel-card panel-span-2">
        <template #header>
          <div class="panel-head">
            <div>
              <div class="panel-title">举报处理</div>
              <div class="panel-desc">用户举报会优先进入这里，支持直接下架或忽略</div>
            </div>
          </div>
        </template>
        <div v-if="reports.length" class="queue-list">
          <div v-for="item in reports" :key="`report-${item.id}`" class="queue-item">
            <div class="queue-main">
              <div class="queue-title-row">
                <strong>{{ item.target_title }}</strong>
                <el-tag size="small" :type="item.biz_type === 'post' ? 'warning' : 'danger'">
                  {{ item.biz_type === 'post' ? '帖子举报' : '任务举报' }}
                </el-tag>
                <el-tag v-if="item.pending_count > 1" size="small" type="danger">
                  {{ item.pending_count }} 条待处理
                </el-tag>
              </div>
              <span>
                {{ item.reason_type_label }} ·
                {{ item.reporter?.real_name || item.reporter?.username || '--' }} 举报 ·
                {{ item.target_owner?.real_name || item.target_owner?.username || '--' }}
              </span>
              <small class="queue-reason">
                {{ item.reason_text || '未填写补充说明' }}
              </small>
              <small>{{ formatTime(item.created_at) }}</small>
            </div>
            <div class="queue-actions">
              <el-button
                size="small"
                @click="router.push(item.biz_type === 'post' ? `/forum/posts/${item.biz_id}` : `/tasks/${item.biz_id}`)"
              >
                详情
              </el-button>
              <el-button size="small" type="warning" @click="handleReport(item, 'accept')">
                下架内容
              </el-button>
              <el-button size="small" plain @click="handleReport(item, 'dismiss')">
                忽略举报
              </el-button>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无待处理举报" :image-size="88" />
      </el-card>
    </section>

    <el-empty
      v-if="!loading && !hasAnyModule"
      description="当前账号没有分配审核工作台权限"
      :image-size="96"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  delivererManagementApi,
  forumManagementApi,
  reviewWorkbenchApi,
  taskManagementApi,
  userManagementApi,
} from '@/api'

const router = useRouter()
const loading = ref(false)
const modules = reactive({
  students: false,
  deliverers: false,
  posts: false,
  tasks: false,
  reports: false,
})
const stats = reactive({
  totalPending: 0,
  students: 0,
  deliverers: 0,
  posts: 0,
  tasks: 0,
  reports: 0,
  preModeratedPosts: 0,
  preModeratedTasks: 0,
})
const students = ref([])
const deliverers = ref([])
const posts = ref([])
const tasks = ref([])
const reports = ref([])
const hasAnyModule = computed(
  () => modules.students || modules.deliverers || modules.posts || modules.tasks || modules.reports,
)

const fetchWorkbench = async () => {
  loading.value = true
  try {
    const response = await reviewWorkbenchApi.getWorkbench({ limit: 6 })
    const data = response.data || {}
    Object.assign(modules, data.modules || {})
    Object.assign(stats, data.stats || {})
    students.value = data.students || []
    deliverers.value = data.deliverers || []
    posts.value = data.posts || []
    tasks.value = data.tasks || []
    reports.value = data.reports || []
  } catch (error) {
    ElMessage.error(error.message || '获取审核工作台失败')
  } finally {
    loading.value = false
  }
}

const verifyStudent = async (item, verified) => {
  try {
    let payload = { verified }
    if (verified) {
      await ElMessageBox.confirm(`确认通过 ${item.real_name || item.username} 的学生认证？`, '确认审核', {
        type: 'warning',
      })
    } else {
      const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝学生认证', {
        inputValidator: (text) => (text && text.trim() ? true : '请填写原因'),
      })
      payload = { verified, reason: value.trim() }
    }
    const response = await userManagementApi.verifyStudent(item.id, payload)
    if (response.success) {
      ElMessage.success(verified ? '学生认证已通过' : '学生认证已拒绝')
      fetchWorkbench()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('学生认证操作失败')
    }
  }
}

const verifyDeliverer = async (item, approved) => {
  try {
    let payload = { approved, remark: '' }
    if (approved) {
      await ElMessageBox.confirm(`确认通过 ${item.real_name} 的配送员申请？`, '确认审核', {
        type: 'warning',
      })
    } else {
      const { value } = await ElMessageBox.prompt('请输入拒绝原因', '拒绝配送员申请', {
        inputValidator: (text) => (text && text.trim() ? true : '请填写原因'),
      })
      payload = { approved, reason: value.trim(), remark: '' }
    }
    const response = await delivererManagementApi.verifyDeliverer(item.id, payload)
    if (response.success) {
      ElMessage.success(approved ? '配送员申请已通过' : '配送员申请已拒绝')
      fetchWorkbench()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('配送员审核失败')
    }
  }
}

const moderatePost = async (item, action) => {
  try {
    let reason
    if (action === 'reject') {
      const result = await ElMessageBox.prompt('请输入拒绝原因', '拒绝帖子', {
        inputValidator: (text) => (text && text.trim() ? true : '请填写原因'),
      })
      reason = result.value.trim()
    }
    const response = await forumManagementApi.moderatePost(item.id, action, reason)
    if (response.success) {
      ElMessage.success(action === 'approve' ? '帖子审核已通过' : '帖子已拒绝')
      fetchWorkbench()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('帖子审核失败')
    }
  }
}

const moderateTask = async (item, approved) => {
  try {
    let status = 'published'
    let reason
    if (approved) {
      await ElMessageBox.confirm(`确认发布任务“${item.title}”？`, '确认审核', { type: 'warning' })
    } else {
      status = 'cancelled'
      const result = await ElMessageBox.prompt('请输入驳回原因', '拒绝任务', {
        inputValidator: (text) => (text && text.trim() ? true : '请填写原因'),
      })
      reason = result.value.trim()
    }
    const response = await taskManagementApi.updateTaskStatus(item.id, status, reason)
    if (response.success) {
      ElMessage.success(approved ? '任务审核已通过' : '任务已拒绝')
      fetchWorkbench()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('任务审核失败')
    }
  }
}

const handleReport = async (item, action) => {
  try {
    let reason = ''
    if (action === 'accept') {
      const result = await ElMessageBox.prompt('请输入下架原因', '处理举报', {
        inputPlaceholder: '将同步写入内容处理原因',
        inputValidator: (text) => (text && text.trim() ? true : '请填写处理原因'),
      })
      reason = result.value.trim()
    } else {
      const result = await ElMessageBox.prompt('请输入忽略说明', '忽略举报', {
        inputPlaceholder: '例如：举报信息不足/核查后无异常',
      })
      reason = result.value?.trim() || ''
    }

    const response = await reviewWorkbenchApi.handleReport(item.id, action, reason)
    if (response.success) {
      ElMessage.success(action === 'accept' ? '举报已处理并下架内容' : '举报已忽略')
      fetchWorkbench()
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('处理举报失败')
    }
  }
}

const formatTime = (value) => {
  if (!value) return '--'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const formatMoney = (value) => (Number(value || 0) || 0).toFixed(2)

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const getSensitiveWords = (reason) => {
  if (!reason) return []
  const normalized = String(reason)
  const suffix = normalized.split(/[:：]/).slice(1).join('：') || normalized
  return [
    ...new Set(
      suffix
        .split(/[、,，/\s]+/)
        .map((item) => item.trim())
        .filter(
          (item) =>
            item &&
            item.length >= 2 &&
            !item.includes('命中') &&
            !item.includes('人工复核') &&
            !item.includes('高风险') &&
            !item.includes('敏感词'),
        ),
    ),
  ]
}

const getMatchedWords = (item) => {
  if (Array.isArray(item?.matched_words) && item.matched_words.length) {
    return item.matched_words
  }
  return getSensitiveWords(item?.reason)
}

const getHighlightedSegments = (text, words = []) => {
  const source = String(text || '')
  if (!source || !words.length) {
    return [{ text: source || '--', hit: false }]
  }

  const safeWords = [...new Set(words.filter(Boolean))]
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)

  if (!safeWords.length) {
    return [{ text: source, hit: false }]
  }

  const pattern = new RegExp(`(${safeWords.join('|')})`, 'gi')
  const parts = source.split(pattern).filter((part) => part !== '')
  if (!parts.length) {
    return [{ text: source, hit: false }]
  }

  return parts.map((part) => ({
    text: part,
    hit: words.some((word) => word && part.toLowerCase() === word.toLowerCase()),
  }))
}

const vehicleTypeText = (value) =>
  ({ bike: '自行车', electric: '电动车', walk: '步行', car: '汽车' }[value] || value || '--')

const categoryText = (value) =>
  ({ academic: '学术', life: '生活', campus: '校园', task: '任务', skill: '技能' }[value] ||
  value ||
  '--')

const taskCategoryText = (value) =>
  ({ study: '学习', design: '设计', tech: '技术', writing: '文案', life: '生活' }[value] ||
  value ||
  '--')

onMounted(() => {
  fetchWorkbench()
})
</script>

<style scoped>
.review-workbench {
  display: grid;
  gap: 22px;
  max-width: 1600px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.page-header-left {
  display: grid;
  gap: 8px;
}

.page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'Fira Code', monospace;
}

.page-subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 16px;
}

.stat-card {
  display: grid;
  gap: 10px;
  padding: 20px;
  border-radius: 22px;
  border: 1px solid var(--border-color, rgba(203, 213, 225, 0.72));
  background: #fff;
  box-shadow: 0 10px 24px rgba(148, 163, 184, 0.08);
}

.stat-card.primary {
  background: linear-gradient(135deg, #eff6ff, #ffffff);
}

.stat-card span {
  color: #64748b;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.stat-card strong {
  font-size: 2rem;
  line-height: 1;
  color: #0f172a;
}

.stat-card p {
  margin: 0;
  color: #64748b;
  line-height: 1.6;
}

.board-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}

.panel-card {
  border-radius: 24px;
  border: 1px solid var(--border-color, rgba(203, 213, 225, 0.72));
  box-shadow: 0 12px 28px rgba(148, 163, 184, 0.08);
}

.panel-span-2 {
  grid-column: span 2;
}

.panel-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;
}

.panel-title {
  margin-bottom: 4px;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.panel-desc {
  color: #64748b;
  font-size: 0.84rem;
}

.queue-list {
  display: grid;
  gap: 14px;
}

.queue-item {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid #eef2f7;
}

.queue-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.queue-main {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.queue-main strong {
  color: #0f172a;
  font-size: 0.98rem;
}

.queue-title-text {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0;
}

.queue-main span,
.queue-main small {
  color: #64748b;
  line-height: 1.6;
}

.queue-reason {
  color: #b45309;
}

.sensitive-hit {
  padding: 0 4px;
  border-radius: 6px;
  background: rgba(245, 158, 11, 0.18);
  color: #b45309;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.18);
}

.sensitive-word-tag {
  font-weight: 700;
}

.queue-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.queue-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

@media (max-width: 1280px) {
  .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .stats-grid,
  .board-grid {
    grid-template-columns: 1fr;
  }

  .panel-span-2 {
    grid-column: auto;
  }

  .queue-item,
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .queue-actions {
    justify-content: flex-start;
    flex-wrap: wrap;
  }
}
</style>
