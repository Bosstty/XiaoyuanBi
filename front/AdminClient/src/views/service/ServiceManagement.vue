<template>
  <div class="page-container">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">客服管理</h1>
        <p class="page-subtitle">配置客服账号、封禁状态与可处理工单类型</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增客服</el-button>
    </div>

    <section class="stats-grid">
      <article class="stat-card primary">
        <span>客服总数</span>
        <strong>{{ services.length }}</strong>
        <p>当前已配置客服账号</p>
      </article>
      <article class="stat-card">
        <span>正常服务</span>
        <strong>{{ activeCount }}</strong>
        <p>可正常处理工单的客服</p>
      </article>
      <article class="stat-card">
        <span>封禁账号</span>
        <strong>{{ bannedCount }}</strong>
        <p>已被限制登录或处理工单</p>
      </article>
      <article class="stat-card">
        <span>类型覆盖</span>
        <strong>{{ coveredTicketTypes }}</strong>
        <p>已分配的工单类型种类</p>
      </article>
    </section>

    <el-card shadow="never" class="panel-card">
      <el-table v-loading="loading" :data="services" stripe>
        <el-table-column prop="username" label="账号" min-width="140" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="phone" label="手机号" min-width="140" />
        <el-table-column prop="role" label="角色" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ getRoleText(row.role) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="处理类型" min-width="220">
          <template #default="{ row }">
            <div class="type-tags">
              <el-tag v-for="type in row.ticket_types || []" :key="type" size="small" type="info">
                {{ getTicketTypeText(type) }}
              </el-tag>
              <span v-if="!(row.ticket_types || []).length" class="muted">未配置</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" text @click="openEditDialog(row)">编辑</el-button>
            <el-button
              :type="row.status === 'banned' ? 'success' : 'danger'"
              text
              @click="toggleStatus(row)"
            >
              {{ row.status === 'banned' ? '解封' : '封禁' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增客服' : '编辑客服'" width="640px">
      <el-form label-position="top" class="service-form">
        <div class="form-grid">
          <el-form-item label="账号">
            <el-input v-model="dialog.form.username" :disabled="dialog.mode === 'edit'" />
          </el-form-item>
          <el-form-item label="姓名">
            <el-input v-model="dialog.form.name" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="dialog.form.phone" />
          </el-form-item>
          <el-form-item label="邮箱">
            <el-input v-model="dialog.form.email" />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="dialog.form.role" style="width: 100%">
              <el-option label="普通客服" value="service" />
              <el-option label="高级客服" value="senior_service" />
              <el-option label="客服经理" value="manager" />
            </el-select>
          </el-form-item>
          <el-form-item :label="dialog.mode === 'create' ? '密码' : '重置密码'">
            <el-input v-model="dialog.form.password" type="password" show-password />
          </el-form-item>
        </div>
        <el-form-item label="可处理工单类型">
          <el-select
            v-model="dialog.form.ticket_types"
            multiple
            collapse-tags
            collapse-tags-tooltip
            :multiple-limit="2"
            style="width: 100%"
          >
            <el-option
              v-for="item in ticketTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.submitting" @click="submitDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { adminServiceApi } from '@/api'

const services = ref([])
const loading = ref(false)
const activeCount = computed(() => services.value.filter((item) => item.status === 'active').length)
const bannedCount = computed(() => services.value.filter((item) => item.status === 'banned').length)
const coveredTicketTypes = computed(() => {
  const values = new Set()
  services.value.forEach((item) => {
    ;(item.ticket_types || []).forEach((type) => values.add(type))
  })
  return values.size
})

const ticketTypeOptions = [
  { label: '投诉', value: 'complaint' },
  { label: '退款', value: 'refund' },
  { label: '争议', value: 'dispute' },
  { label: '建议', value: 'suggestion' },
  { label: '其他', value: 'other' },
]

const dialog = reactive({
  visible: false,
  mode: 'create',
  submitting: false,
  currentId: null,
  form: {
    username: '',
    name: '',
    phone: '',
    email: '',
    role: 'service',
    password: '',
    ticket_types: [],
  },
})

const resetDialog = () => {
  dialog.currentId = null
  dialog.form.username = ''
  dialog.form.name = ''
  dialog.form.phone = ''
  dialog.form.email = ''
  dialog.form.role = 'service'
  dialog.form.password = ''
  dialog.form.ticket_types = []
}

const fetchServices = async () => {
  loading.value = true
  try {
    const response = await adminServiceApi.getServices()
    if (!response.success) throw new Error(response.message || '获取客服列表失败')
    services.value = Array.isArray(response.data) ? response.data : []
  } catch (error) {
    ElMessage.error(error.message || '获取客服列表失败')
  } finally {
    loading.value = false
  }
}

const openCreateDialog = () => {
  dialog.mode = 'create'
  resetDialog()
  dialog.visible = true
}

const openEditDialog = (row) => {
  dialog.mode = 'edit'
  dialog.currentId = row.id
  dialog.form.username = row.username || ''
  dialog.form.name = row.name || ''
  dialog.form.phone = row.phone || ''
  dialog.form.email = row.email || ''
  dialog.form.role = row.role || 'service'
  dialog.form.password = ''
  dialog.form.ticket_types = Array.isArray(row.ticket_types) ? [...row.ticket_types] : []
  dialog.visible = true
}

const submitDialog = async () => {
  if (!dialog.form.username && dialog.mode === 'create') {
    ElMessage.warning('请输入客服账号')
    return
  }
  if (!dialog.form.name) {
    ElMessage.warning('请输入客服姓名')
    return
  }
  if (dialog.mode === 'create' && !dialog.form.password) {
    ElMessage.warning('请输入客服密码')
    return
  }
  if (dialog.form.ticket_types.length > 2) {
    ElMessage.warning('每个客服最多配置2种工单类型')
    return
  }

  dialog.submitting = true
  try {
    const payload = {
      username: dialog.form.username,
      name: dialog.form.name,
      phone: dialog.form.phone,
      email: dialog.form.email,
      role: dialog.form.role,
      ticket_types: dialog.form.ticket_types,
      ...(dialog.form.password ? { password: dialog.form.password } : {}),
    }

    const response =
      dialog.mode === 'create'
        ? await adminServiceApi.createService(payload)
        : await adminServiceApi.updateService(dialog.currentId, payload)

    if (!response.success) throw new Error(response.message || '保存失败')
    dialog.visible = false
    ElMessage.success(dialog.mode === 'create' ? '客服创建成功' : '客服更新成功')
    await fetchServices()
  } catch (error) {
    ElMessage.error(error.message || '保存失败')
  } finally {
    dialog.submitting = false
  }
}

const toggleStatus = async (row) => {
  const nextStatus = row.status === 'banned' ? 'active' : 'banned'
  const actionText = nextStatus === 'banned' ? '封禁' : '解封'

  try {
    await ElMessageBox.confirm(`确定要${actionText}该客服吗？`, `${actionText}客服`, { type: 'warning' })
    const response = await adminServiceApi.updateServiceStatus(row.id, nextStatus)
    if (!response.success) throw new Error(response.message || `${actionText}失败`)
    ElMessage.success(`${actionText}成功`)
    await fetchServices()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') {
      ElMessage.error(error.message || `${actionText}失败`)
    }
  }
}

const getTicketTypeText = (value) => {
  const item = ticketTypeOptions.find((option) => option.value === value)
  return item?.label || value
}

const getRoleText = (value) => {
  const map = {
    service: '普通客服',
    senior_service: '高级客服',
    manager: '客服经理',
  }
  return map[value] || value
}

const getStatusText = (value) => {
  const map = {
    active: '正常',
    inactive: '停用',
    banned: '封禁',
  }
  return map[value] || value
}

const getStatusTagType = (value) => {
  const map = {
    active: 'success',
    inactive: 'info',
    banned: 'danger',
  }
  return map[value] || 'info'
}

onMounted(() => {
  fetchServices()
})
</script>

<style scoped>
.page-container {
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  gap: 20px;
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
  grid-template-columns: repeat(4, minmax(0, 1fr));
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
}

.stat-card strong {
  font-size: 2rem;
  line-height: 1;
  color: #0f172a;
}

.stat-card p {
  margin: 0;
  color: #64748b;
}

.panel-card {
  border-radius: 24px;
  border: 1px solid var(--border-color, rgba(203, 213, 225, 0.72));
  box-shadow: 0 12px 28px rgba(148, 163, 184, 0.08);
}

.type-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.muted {
  color: #9ca3af;
}

.service-form {
  display: grid;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

:deep(.el-card__body) {
  padding: 20px;
}

:deep(.el-dialog) {
  border-radius: 24px;
}

:deep(.el-dialog__body) {
  padding-top: 12px;
}

@media (max-width: 1100px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>
