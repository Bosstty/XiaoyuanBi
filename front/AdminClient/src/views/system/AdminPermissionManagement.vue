<template>
  <div class="page-container admin-permission-page">
    <div class="page-header">
      <div class="page-header-left">
        <h1 class="page-title">管理员权限</h1>
        <p class="page-subtitle">由 super_admin 统一配置管理员账号、角色与审核权限</p>
      </div>
      <el-button type="primary" @click="openCreateDialog">新增管理员</el-button>
    </div>

    <section class="stats-grid">
      <article class="stat-card primary">
        <span>管理员总数</span>
        <strong>{{ admins.length }}</strong>
        <p>当前后台可登录管理员账号</p>
      </article>
      <article class="stat-card">
        <span>启用账号</span>
        <strong>{{ activeAdminCount }}</strong>
        <p>可正常进入后台的管理员</p>
      </article>
      <article class="stat-card">
        <span>审核专员</span>
        <strong>{{ reviewAdminCount }}</strong>
        <p>至少拥有 1 项审核权限</p>
      </article>
      <article class="stat-card">
        <span>系统管理</span>
        <strong>{{ systemAdminCount }}</strong>
        <p>拥有系统配置或全局权限</p>
      </article>
    </section>

    <el-card shadow="never" class="panel-card">
      <el-table v-loading="loading" :data="admins" stripe>
        <el-table-column prop="id" label="ID" width="72" />
        <el-table-column prop="username" label="用户名" min-width="140" />
        <el-table-column prop="name" label="姓名" min-width="120" />
        <el-table-column prop="email" label="邮箱" min-width="220" />
        <el-table-column label="角色" width="120">
          <template #default="{ row }">
            <el-tag size="small" :type="row.role === 'super_admin' ? 'danger' : 'info'">
              {{ roleText(row.role) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="row.status === 'active' ? 'success' : 'warning'">
              {{ row.status === 'active' ? '启用' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="权限" min-width="320">
          <template #default="{ row }">
            <div class="permission-chip-list">
              <el-tag
                v-for="item in formatPermissionList(row.permissions)"
                :key="`${row.id}-${item}`"
                size="small"
                effect="plain"
              >
                {{ permissionLabelMap[item] || item }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="openEditDialog(row)">编辑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="dialog.visible" :title="dialog.mode === 'create' ? '新增管理员' : '编辑管理员'" width="720px">
      <el-form label-position="top" class="admin-form">
        <div class="form-grid">
          <el-form-item label="用户名" required>
            <el-input v-model="dialog.form.username" :disabled="dialog.mode !== 'create'" />
          </el-form-item>
          <el-form-item label="姓名" required>
            <el-input v-model="dialog.form.name" />
          </el-form-item>
          <el-form-item label="邮箱" required>
            <el-input v-model="dialog.form.email" />
          </el-form-item>
          <el-form-item label="手机号">
            <el-input v-model="dialog.form.phone" />
          </el-form-item>
          <el-form-item label="角色">
            <el-select v-model="dialog.form.role">
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="管理员" value="admin" />
              <el-option label="版主" value="moderator" />
            </el-select>
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="dialog.form.status">
              <el-option label="启用" value="active" />
              <el-option label="停用" value="inactive" />
            </el-select>
          </el-form-item>
          <el-form-item v-if="dialog.mode === 'create'" label="初始密码" required>
            <el-input v-model="dialog.form.password" type="password" show-password />
          </el-form-item>
          <el-form-item v-else label="重置密码">
            <el-input
              v-model="dialog.form.password"
              type="password"
              show-password
              placeholder="留空则不修改"
            />
          </el-form-item>
          <el-form-item label="部门">
            <el-input v-model="dialog.form.department" />
          </el-form-item>
        </div>

        <el-form-item label="审核与系统权限">
          <el-collapse v-model="dialog.expandedGroups" class="permission-collapse">
            <el-collapse-item
              v-for="group in permissionGroups"
              :key="group.key"
              :name="group.key"
              class="permission-collapse__item"
            >
              <template #title>
                <div class="permission-section__header">
                  <el-checkbox
                    :model-value="isGroupEnabled(group.key)"
                    :disabled="isSuperAdminRole"
                    @click.stop
                    @change="togglePermissionGroup(group.key, $event)"
                  >
                    <span class="permission-section__title">{{ group.title }}</span>
                  </el-checkbox>
                </div>
              </template>
              <el-checkbox-group v-model="dialog.form.permissions" class="permission-list">
                <el-checkbox
                  v-for="item in group.items"
                  :key="item.value"
                  :value="item.value"
                  :disabled="isSuperAdminRole || !isGroupEnabled(group.key)"
                  class="permission-list__item"
                >
                  {{ item.label }}
                </el-checkbox>
              </el-checkbox-group>
            </el-collapse-item>
          </el-collapse>
        </el-form-item>

        <el-form-item label="备注">
          <el-input v-model="dialog.form.notes" type="textarea" :rows="3" />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="dialog.loading" @click="submitDialog">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { adminManagementApi } from '@/api'

const loading = ref(false)
const admins = ref([])
const permissionOptions = [
  { value: 'review:student', label: '学生认证审核' },
  { value: 'review:deliverer', label: '配送员审核' },
  { value: 'review:forum', label: '帖子审核' },
  { value: 'review:task', label: '任务审核' },
  { value: 'review:report', label: '举报处理' },
  { value: 'forum:moderate', label: '论坛管理' },
  { value: 'task:admin', label: '任务管理' },
  { value: 'deliverer:admin', label: '配送员管理' },
  { value: 'user:admin_read', label: '用户管理' },
  { value: 'system:manage', label: '系统管理' },
  { value: 'analytics:read', label: '数据分析查看' },
]
const permissionLabelMap = Object.fromEntries(permissionOptions.map((item) => [item.value, item.label]))
const allPermissionValues = permissionOptions.map((item) => item.value)
const permissionGroups = [
  {
    key: 'review',
    title: '审核权限',
    items: permissionOptions.filter((item) => item.value.startsWith('review:')),
  },
  {
    key: 'business',
    title: '业务管理权限',
    items: permissionOptions.filter(
      (item) => !item.value.startsWith('review:') && item.value !== 'system:manage' && item.value !== 'analytics:read',
    ),
  },
  {
    key: 'platform',
    title: '平台与分析权限',
    items: permissionOptions.filter((item) => ['system:manage', 'analytics:read'].includes(item.value)),
  },
]
const permissionGroupMap = Object.fromEntries(
  permissionGroups.map((group) => [group.key, group.items.map((item) => item.value)]),
)
const normalizePermissions = (permissions) => {
  if (Array.isArray(permissions)) {
    return permissions.filter((item) => typeof item === 'string' && item.trim())
  }

  if (typeof permissions === 'string' && permissions.trim()) {
    try {
      const parsed = JSON.parse(permissions)
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === 'string' && item.trim())
        : []
    } catch (_error) {
      return []
    }
  }

  return []
}
const activeAdminCount = computed(() => admins.value.filter((item) => item.status === 'active').length)
const reviewAdminCount = computed(() =>
  admins.value.filter((item) => normalizePermissions(item.permissions).some((permission) => permission.startsWith('review:'))).length,
)
const systemAdminCount = computed(() =>
  admins.value.filter(
    (item) =>
      item.role === 'super_admin' ||
      normalizePermissions(item.permissions).includes('system:manage'),
  ).length,
)

const buildDefaultForm = () => ({
  id: null,
  username: '',
  name: '',
  email: '',
  phone: '',
  role: 'admin',
  status: 'active',
  password: '',
  department: '',
  notes: '',
  permissions: [],
})

const dialog = reactive({
  visible: false,
  loading: false,
  mode: 'create',
  form: buildDefaultForm(),
  enabledGroups: [],
  expandedGroups: permissionGroups.map((group) => group.key),
})

const isSuperAdminRole = computed(() => dialog.form.role === 'super_admin')
const isGroupEnabled = (groupKey) => dialog.enabledGroups.includes(groupKey)

const syncEnabledGroupsFromPermissions = (permissions = []) => {
  dialog.enabledGroups = permissionGroups
    .filter((group) => group.items.some((item) => permissions.includes(item.value)))
    .map((group) => group.key)
}

const togglePermissionGroup = (groupKey, checked) => {
  if (isSuperAdminRole.value) {
    return
  }

  const nextChecked = Boolean(checked)

  if (nextChecked) {
    if (!dialog.enabledGroups.includes(groupKey)) {
      dialog.enabledGroups = [...dialog.enabledGroups, groupKey]
    }
    return
  }

  dialog.enabledGroups = dialog.enabledGroups.filter((key) => key !== groupKey)
  const groupPermissions = permissionGroupMap[groupKey] || []
  dialog.form.permissions = dialog.form.permissions.filter((permission) => !groupPermissions.includes(permission))
}

const applySuperAdminPermissions = () => {
  dialog.enabledGroups = permissionGroups.map((group) => group.key)
  dialog.expandedGroups = permissionGroups.map((group) => group.key)
  dialog.form.permissions = [...allPermissionValues]
}

const fetchAdmins = async () => {
  loading.value = true
  try {
    const response = await adminManagementApi.getAdmins()
    admins.value = (response.data || []).map((item) => ({
      ...item,
      permissions: normalizePermissions(item.permissions),
    }))
  } catch (error) {
    ElMessage.error(error.message || '获取管理员列表失败')
  } finally {
    loading.value = false
  }
}

const roleText = (role) =>
  ({
    super_admin: '超级管理员',
    admin: '管理员',
    moderator: '版主',
    service: '客服',
  }[role] || role || '--')

const formatPermissionList = (permissions) => {
  const normalizedPermissions = normalizePermissions(permissions)
  if (!normalizedPermissions.length) return ['无单独权限']
  return normalizedPermissions
}

const openCreateDialog = () => {
  dialog.mode = 'create'
  dialog.form = buildDefaultForm()
  dialog.enabledGroups = []
  dialog.expandedGroups = permissionGroups.map((group) => group.key)
  dialog.visible = true
}

const openEditDialog = (row) => {
  dialog.mode = 'edit'
  dialog.form = {
    id: row.id,
    username: row.username || '',
    name: row.name || '',
    email: row.email || '',
    phone: row.phone || '',
    role: row.role || 'admin',
    status: row.status || 'active',
    password: '',
    department: row.department || '',
    notes: row.notes || '',
    permissions: normalizePermissions(row.permissions),
  }
  if (dialog.form.role === 'super_admin') {
    applySuperAdminPermissions()
  } else {
    syncEnabledGroupsFromPermissions(dialog.form.permissions)
    dialog.expandedGroups = permissionGroups.map((group) => group.key)
  }
  dialog.visible = true
}

const submitDialog = async () => {
  if (!dialog.form.username || !dialog.form.name || !dialog.form.email) {
    ElMessage.warning('请填写用户名、姓名和邮箱')
    return
  }

  if (dialog.mode === 'create' && !dialog.form.password) {
    ElMessage.warning('请填写初始密码')
    return
  }

  dialog.loading = true
  try {
    const payload = {
      username: dialog.form.username,
      name: dialog.form.name,
      email: dialog.form.email,
      phone: dialog.form.phone,
      role: dialog.form.role,
      status: dialog.form.status,
      password: dialog.form.password,
      department: dialog.form.department,
      notes: dialog.form.notes,
      permissions: normalizePermissions(dialog.form.permissions),
    }

    const response =
      dialog.mode === 'create'
        ? await adminManagementApi.createAdmin(payload)
        : await adminManagementApi.updateAdmin(dialog.form.id, payload)

    if (response.success) {
      ElMessage.success(dialog.mode === 'create' ? '管理员创建成功' : '管理员更新成功')
      dialog.visible = false
      fetchAdmins()
    }
  } catch (error) {
    ElMessage.error(error.message || '保存管理员失败')
  } finally {
    dialog.loading = false
  }
}

onMounted(() => {
  fetchAdmins()
})

watch(
  () => dialog.form.role,
  (role, previousRole) => {
    if (!dialog.visible) return

    if (role === 'super_admin') {
      applySuperAdminPermissions()
      return
    }

    if (previousRole === 'super_admin') {
      dialog.form.permissions = []
      dialog.enabledGroups = []
      dialog.expandedGroups = permissionGroups.map((group) => group.key)
    }
  },
)
</script>

<style scoped>
.admin-permission-page {
  display: grid;
  gap: 20px;
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

.panel-card {
  border-radius: 24px;
  border: 1px solid var(--border-color, rgba(203, 213, 225, 0.72));
  box-shadow: 0 12px 28px rgba(148, 163, 184, 0.08);
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

.permission-chip-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.admin-form {
  display: grid;
  gap: 8px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.permission-section__header {
  display: flex;
  align-items: center;
  width: 100%;
}

.permission-section__title {
  color: #334155;
  font-size: 13px;
  font-weight: 700;
}

.permission-collapse {
  width: 100%;
  border-top: none;
  border-bottom: none;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 14px 28px;
  width: 100%;
  padding-top: 4px;
}

.permission-list__item {
  margin-right: 0;
  min-width: max-content;
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

:deep(.permission-collapse .el-collapse-item) {
  margin-bottom: 16px;
  border: 1px solid rgba(226, 232, 240, 0.9);
  border-radius: 20px;
  background: #f8fafc;
  overflow: hidden;
}

:deep(.permission-collapse .el-collapse-item:last-child) {
  margin-bottom: 0;
}

:deep(.permission-collapse .el-collapse-item__header) {
  min-height: 58px;
  padding: 0 18px;
  border-bottom: none;
  background: transparent;
  line-height: 1.2;
}

:deep(.permission-collapse .el-collapse-item__wrap) {
  border-bottom: none;
  background: transparent;
}

:deep(.permission-collapse .el-collapse-item__content) {
  padding: 0 18px 18px;
}

@media (max-width: 900px) {
  .form-grid,
  .stats-grid {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
  }
}
</style>
