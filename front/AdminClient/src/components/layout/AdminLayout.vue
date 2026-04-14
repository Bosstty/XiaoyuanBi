<template>
  <el-container class="admin-layout">
    <!-- 毛玻璃侧边栏 -->
    <el-aside :width="sidebarCollapsed ? '72px' : '260px'" class="sidebar">
      <div class="sidebar-bg"></div>
      <div class="logo-section">
        <div class="logo-icon">
          <el-icon :size="22"><School /></el-icon>
        </div>
        <transition name="fade">
          <div v-if="!sidebarCollapsed" class="logo-text">
            <h1>综合服务平台</h1>
            <span>Harbin University</span>
          </div>
        </transition>
      </div>

      <el-menu
        :default-active="activeMenu"
        :collapse="sidebarCollapsed"
        :collapse-transition="false"
        :unique-opened="true"
        router
        class="nav-menu"
        popper-class="dark-popper"
        background-color="transparent"
        text-color="rgba(255,255,255,0.7)"
        active-text-color="#fff"
      >
        <template v-for="item in visibleMenus" :key="item.index">
          <el-sub-menu v-if="item.children" :index="item.index">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.title }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
              <el-icon><component :is="child.icon" /></el-icon>
              <template #title>{{ child.title }}</template>
            </el-menu-item>
          </el-sub-menu>
          <el-menu-item v-else :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <template #title>{{ item.title }}</template>
          </el-menu-item>
        </template>
      </el-menu>

      <div class="sidebar-footer">
        <div class="version-info" v-if="!sidebarCollapsed">
          <span>v1.0.0</span>
        </div>
      </div>
    </el-aside>

    <!-- 主内容区域 -->
    <el-container class="main-content">
      <!-- 顶部导航栏 -->
      <el-header class="topbar">
        <div class="topbar-left">
          <el-button @click="toggleSidebar" :icon="Fold" text class="collapse-btn" />
          <el-breadcrumb separator="/" class="breadcrumbs">
            <el-breadcrumb-item v-for="(item, index) in breadcrumbs" :key="index">
              {{ item }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="topbar-right">
          <!-- 快捷操作 -->
          <div class="quick-actions">
            <el-tooltip content="刷新数据" placement="bottom">
              <el-button :icon="Refresh" circle text @click="refreshData" />
            </el-tooltip>
            <el-tooltip content="全屏" placement="bottom">
              <el-button :icon="FullScreen" circle text @click="toggleFullscreen" />
            </el-tooltip>
          </div>

          <el-divider direction="vertical" />

          <!-- 通知 -->
          <el-dropdown @command="handleNotificationCommand" trigger="click">
            <el-badge :value="unreadCount" :hidden="unreadCount === 0" :max="99">
              <div class="icon-btn">
                <el-icon :size="20"><Bell /></el-icon>
              </div>
            </el-badge>
            <template #dropdown>
              <div class="notification-dropdown">
                <div class="notification-header">
                  <span class="notification-title">通知中心</span>
                  <el-button type="primary" link size="small" @click.stop="markAllRead">
                    全部已读
                  </el-button>
                </div>
                <div class="notification-list" v-if="notifications.length > 0">
                  <div
                    v-for="notification in notifications.slice(0, 5)"
                    :key="notification.id"
                    class="notification-item"
                    :class="{ unread: !notification.read }"
                    @click="handleNotificationClick(notification)"
                  >
                    <div class="notification-icon" :class="notification.type">
                      <el-icon>
                        <component :is="getNotificationIcon(notification.type)" />
                      </el-icon>
                    </div>
                    <div class="notification-content">
                      <div class="notification-item-title">{{ notification.title }}</div>
                      <div class="notification-item-message">{{ notification.message }}</div>
                      <div class="notification-item-time">{{ formatTime(notification.time) }}</div>
                    </div>
                  </div>
                </div>
                <div class="notification-empty" v-else>
                  <el-icon :size="40"><BellFilled /></el-icon>
                  <span>暂无通知</span>
                </div>
              </div>
            </template>
          </el-dropdown>

          <el-divider direction="vertical" />

          <!-- 用户菜单 -->
          <el-dropdown @command="handleUserCommand" trigger="click">
            <div class="user-menu">
              <el-avatar :size="36" class="user-avatar">
                <img v-if="displayUserAvatar" :src="displayUserAvatar" alt="avatar" />
                <template v-else>
                  {{ displayUserName.charAt(0) || 'A' }}
                </template>
              </el-avatar>
              <div class="user-info">
                <span class="user-name">{{ displayUserName }}</span>
                <span class="user-role">{{ userRoleLabel }}</span>
              </div>
              <el-icon><ArrowDown /></el-icon>
            </div>
            <template #dropdown>
              <el-dropdown-menu class="user-dropdown">
                <el-dropdown-item command="profile">
                  <el-icon><User /></el-icon>
                  个人资料
                </el-dropdown-item>
                <el-dropdown-item command="password">
                  <el-icon><Setting /></el-icon>
                  修改密码
                </el-dropdown-item>
                <el-dropdown-item command="logout" divided>
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <!-- 页面内容 -->
      <el-main
        v-loading="globalRefreshing"
        class="page-content"
        element-loading-text="正在刷新页面..."
        element-loading-background="rgba(248, 250, 252, 0.72)"
      >
        <router-view v-if="pageReady" v-slot="{ Component }">
          <transition name="page" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>

    <el-dialog v-model="profileDialog.visible" title="编辑个人资料" width="420px">
      <el-form label-position="top">
        <el-form-item label="头像">
          <div class="profile-avatar-field">
            <el-avatar :size="64" :src="profileDialog.form.avatar || displayUserAvatar || undefined">
              {{ profileDialog.form.name?.charAt(0) || displayUserName.charAt(0) || 'A' }}
            </el-avatar>
            <input
              ref="avatarInputRef"
              type="file"
              accept="image/*"
              class="hidden-avatar-input"
              @change="handleAvatarSelected"
            />
            <el-button :loading="profileDialog.uploading" @click="triggerAvatarUpload">上传头像</el-button>
          </div>
        </el-form-item>
        <el-form-item label="姓名">
          <el-input v-model="profileDialog.form.name" />
        </el-form-item>
        <el-form-item label="手机号">
          <el-input v-model="profileDialog.form.phone" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="profileDialog.form.email" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="profileDialog.submitting" @click="submitProfileDialog">
          保存
        </el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="passwordDialog.visible" title="修改密码" width="420px">
      <el-form label-position="top">
        <el-form-item label="原密码">
          <el-input v-model="passwordDialog.form.old_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="passwordDialog.form.new_password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="passwordDialog.form.confirm_password" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="passwordDialog.visible = false">取消</el-button>
        <el-button type="primary" :loading="passwordDialog.submitting" @click="submitPasswordDialog">
          保存
        </el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup>
import { ref, computed, markRaw, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  DataBoard,
  User,
  Van,
  Box,
  Briefcase,
  ChatDotRound,
  Service,
  Tickets,
  ChatLineRound,
  ShoppingCart,
  Money,
  TrendCharts,
  Setting,
  Fold,
  Bell,
  ArrowDown,
  SwitchButton,
  Refresh,
  FullScreen,
  School,
  BellFilled,
  WarningFilled,
  SuccessFilled,
  InfoFilled,
  Document,
  Check,
} from '@element-plus/icons-vue'
import { useAdminStore } from '@/stores/admin'
import { authApi, publicApi, serviceAuthApi, serviceChatApi } from '@/api'
import { createChatSocket } from '@/utils/chatSocket'

const route = useRoute()
const router = useRouter()
const adminStore = useAdminStore()

const sidebarCollapsed = ref(false)
const globalRefreshing = ref(false)
const pageReady = ref(true)
const chatUnreadCount = ref(0)
const chatSocket = ref(null)
const avatarInputRef = ref(null)
const profileDialog = ref({
  visible: false,
  submitting: false,
  uploading: false,
  form: {
    name: '',
    phone: '',
    email: '',
    avatar: '',
  },
})
const passwordDialog = ref({
  visible: false,
  submitting: false,
  form: {
    old_password: '',
    new_password: '',
    confirm_password: '',
  },
})
let handleChatSocketConnect = null
let handleChatSocketMessageNew = null
let handleChatSocketConversationUpdated = null
let handleChatSocketMessageRead = null
let handleChatSocketConnectError = null

const notifications = ref([
  {
    id: 1,
    type: 'user',
    title: '新用户注册',
    message: '有3个新用户注册了账号',
    time: new Date(),
    read: false,
  },
  {
    id: 2,
    type: 'warning',
    title: '订单异常',
    message: '订单#12345状态异常，需要处理',
    time: new Date(Date.now() - 3600000),
    read: false,
  },
  {
    id: 3,
    type: 'success',
    title: '任务完成',
    message: '今日任务完成率达到95%',
    time: new Date(Date.now() - 7200000),
    read: true,
  },
])

const iconMap = {
  user: markRaw(InfoFilled),
  warning: markRaw(WarningFilled),
  success: markRaw(SuccessFilled),
  info: markRaw(InfoFilled),
}

const menuConfig = [
  { index: '/dashboard', title: '数据看板', icon: markRaw(DataBoard), roles: ['admin', 'service'] },
  { index: '/users', title: '用户管理', icon: markRaw(User), roles: ['admin'] },
  { index: '/services', title: '客服管理', icon: markRaw(Service), roles: ['admin'] },
  {
    index: '/deliverers',
    title: '配送员管理',
    icon: markRaw(Van),
    roles: ['admin'],
    children: [
      { index: '/deliverers', title: '配送员列表', icon: markRaw(Van) },
      { index: '/deliverers/verification', title: '配送员审核', icon: markRaw(Check) },
    ],
  },
  { index: '/orders', title: '订单管理', icon: markRaw(Box), roles: ['admin'] },
  { index: '/tasks', title: '任务管理', icon: markRaw(Briefcase), roles: ['admin'] },
  { index: '/forum', title: '论坛管理', icon: markRaw(ChatDotRound), roles: ['admin'] },
  {
    index: '/service',
    title: '客服中心',
    icon: markRaw(Service),
    roles: ['service'],
    children: [
      { index: '/service/chat', title: '在线客服', icon: markRaw(ChatLineRound) },
      { index: '/service/after-sales', title: '售后管理', icon: markRaw(ShoppingCart) },
    ],
  },
  { index: '/analytics', title: '数据分析', icon: markRaw(TrendCharts), roles: ['admin'] },
  { index: '/finance', title: '财务中心', icon: markRaw(Money), roles: ['admin'] },
  { index: '/system', title: '系统设置', icon: markRaw(Setting), roles: ['admin'] },
  { index: '/system/audit', title: '审计日志', icon: markRaw(Document), roles: ['admin'] },
]

const activeMenu = computed(() => {
  return route.path
})

const breadcrumbs = computed(() => {
  const routeMap = {
    dashboard: '数据看板',
    users: '用户管理',
    services: '客服管理',
    deliverers: '配送员管理',
    orders: '订单管理',
    tasks: '任务管理',
    forum: '论坛管理',
    service: '客服中心',
    tickets: '工单管理',
    chat: '在线客服',
    'after-sales': '售后管理',
    analytics: '数据分析',
    finance: '财务中心',
    system: '系统设置',
    'system-audit': '审计日志',
  }

  const paths = route.path.split('/').filter(Boolean)
  return paths.map((path) => routeMap[path] || path)
})

const unreadCount = computed(() => {
  const notificationCount = notifications.value.filter((n) => !n.read).length
  return notificationCount + chatUnreadCount.value
})

const visibleMenus = computed(() =>
  menuConfig.filter((item) => item.roles.includes(adminStore.userType || 'admin')),
)

const displayUserName = computed(
  () => adminStore.admin?.name || adminStore.admin?.username || '管理员',
)
const displayUserAvatar = computed(() => adminStore.admin?.avatar || '')

const userRoleLabel = computed(() =>
  adminStore.userType === 'service' ? '客服专员' : '超级管理员',
)

const currentAuthApi = computed(() =>
  adminStore.userType === 'service' ? serviceAuthApi : authApi,
)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

async function refreshData() {
  if (globalRefreshing.value) return

  globalRefreshing.value = true
  sessionStorage.setItem('admin:hard-refreshing', '1')
  await nextTick()
  window.setTimeout(() => {
    window.location.reload()
  }, 80)
}

function handleGlobalRefreshShortcut(event) {
  const isRefreshKey =
    event.key === 'F5' || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'r')

  if (!isRefreshKey) return

  event.preventDefault()
  refreshData()
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else {
    document.exitFullscreen()
  }
}

function getNotificationIcon(type) {
  return iconMap[type] || markRaw(InfoFilled)
}

function handleNotificationClick(notification) {
  notification.read = true
}

function markAllRead() {
  notifications.value.forEach((n) => (n.read = true))
  ElMessage.success('已标记全部为已读')
}

function handleUserCommand(command) {
  switch (command) {
    case 'profile':
      openProfileDialog()
      break
    case 'password':
      openPasswordDialog()
      break
    case 'logout':
      adminStore.logout()
      router.push('/login')
      break
  }
}

function openProfileDialog() {
  profileDialog.value.form.name = adminStore.admin?.name || adminStore.admin?.real_name || ''
  profileDialog.value.form.phone = adminStore.admin?.phone || ''
  profileDialog.value.form.email = adminStore.admin?.email || ''
  profileDialog.value.form.avatar = adminStore.admin?.avatar || ''
  profileDialog.value.visible = true
}

function triggerAvatarUpload() {
  avatarInputRef.value?.click()
}

async function handleAvatarSelected(event) {
  const target = event.target
  const file = target?.files?.[0]
  if (!file) return

  profileDialog.value.uploading = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const response = await publicApi.uploadFile(formData)
    const avatarPath = response?.data?.path || response?.data?.url
    if (!avatarPath) {
      throw new Error('头像上传失败')
    }
    profileDialog.value.form.avatar = avatarPath
    ElMessage.success('头像上传成功')
  } catch (error) {
    ElMessage.error(error.message || '头像上传失败')
  } finally {
    profileDialog.value.uploading = false
    if (target) target.value = ''
  }
}

function openPasswordDialog() {
  passwordDialog.value.form.old_password = ''
  passwordDialog.value.form.new_password = ''
  passwordDialog.value.form.confirm_password = ''
  passwordDialog.value.visible = true
}

async function refreshCurrentProfile() {
  const response = await currentAuthApi.value.getProfile()
  if (response?.success && response.data) {
    adminStore.setAdmin(response.data)
  }
}

async function submitProfileDialog() {
  profileDialog.value.submitting = true
  try {
    const payload =
      adminStore.userType === 'service'
        ? {
            name: profileDialog.value.form.name,
            phone: profileDialog.value.form.phone,
            email: profileDialog.value.form.email,
            avatar: profileDialog.value.form.avatar,
          }
        : {
            real_name: profileDialog.value.form.name,
            phone: profileDialog.value.form.phone,
            email: profileDialog.value.form.email,
          }

    const response = await currentAuthApi.value.updateProfile(payload)
    if (!response?.success) {
      throw new Error(response?.message || '更新失败')
    }

    await refreshCurrentProfile()
    profileDialog.value.visible = false
    ElMessage.success('个人资料已更新')
  } catch (error) {
    ElMessage.error(error.message || '更新失败')
  } finally {
    profileDialog.value.submitting = false
  }
}

async function submitPasswordDialog() {
  const { old_password, new_password, confirm_password } = passwordDialog.value.form
  if (!old_password || !new_password) {
    ElMessage.warning('请填写完整密码信息')
    return
  }
  if (new_password !== confirm_password) {
    ElMessage.warning('两次输入的新密码不一致')
    return
  }

  passwordDialog.value.submitting = true
  try {
    const response = await currentAuthApi.value.changePassword({
      old_password,
      new_password,
    })
    if (!response?.success) {
      throw new Error(response?.message || '修改密码失败')
    }

    passwordDialog.value.visible = false
    ElMessage.success('密码修改成功')
  } catch (error) {
    ElMessage.error(error.message || '修改密码失败')
  } finally {
    passwordDialog.value.submitting = false
  }
}

function handleNotificationCommand(command) {
  if (command === 'markAllRead') {
    markAllRead()
  }
}

function formatTime(time) {
  const now = new Date()
  const diff = now - time
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor(diff / (1000 * 60))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

async function fetchChatUnreadCount() {
  if (!adminStore.isLoggedIn || adminStore.userType !== 'service') {
    chatUnreadCount.value = 0
    return
  }

  try {
    const response = await serviceChatApi.getConversations({ page: 1, limit: 100 })
    const list = Array.isArray(response?.data) ? response.data : []
    chatUnreadCount.value = list.reduce(
      (sum, item) => sum + Number(item?.unread_count || 0),
      0,
    )
  } catch (error) {
    chatUnreadCount.value = 0
  }
}

function connectChatUnreadSocket() {
  if (chatSocket.value || !adminStore.isLoggedIn || adminStore.userType !== 'service') return

  const client = createChatSocket()
  if (!client) return

  chatSocket.value = client

  handleChatSocketConnect = () => {
    void fetchChatUnreadCount()
  }

  handleChatSocketMessageNew = () => {
    void fetchChatUnreadCount()
  }

  handleChatSocketConversationUpdated = () => {
    void fetchChatUnreadCount()
  }

  handleChatSocketMessageRead = () => {
    void fetchChatUnreadCount()
  }

  handleChatSocketConnectError = (error) => {
    console.error('管理端消息徽标 Socket 连接失败:', error)
  }

  client.on('connect', handleChatSocketConnect)
  client.on('chat:message:new', handleChatSocketMessageNew)
  client.on('chat:conversation:updated', handleChatSocketConversationUpdated)
  client.on('chat:message:read', handleChatSocketMessageRead)
  client.on('connect_error', handleChatSocketConnectError)
}

function disconnectChatUnreadSocket() {
  if (!chatSocket.value) return
  if (handleChatSocketConnect) {
    chatSocket.value.off('connect', handleChatSocketConnect)
  }
  if (handleChatSocketMessageNew) {
    chatSocket.value.off('chat:message:new', handleChatSocketMessageNew)
  }
  if (handleChatSocketConversationUpdated) {
    chatSocket.value.off('chat:conversation:updated', handleChatSocketConversationUpdated)
  }
  if (handleChatSocketMessageRead) {
    chatSocket.value.off('chat:message:read', handleChatSocketMessageRead)
  }
  if (handleChatSocketConnectError) {
    chatSocket.value.off('connect_error', handleChatSocketConnectError)
  }
  chatSocket.value = null
  handleChatSocketConnect = null
  handleChatSocketMessageNew = null
  handleChatSocketConversationUpdated = null
  handleChatSocketMessageRead = null
  handleChatSocketConnectError = null
}

onMounted(() => {
  if (sessionStorage.getItem('admin:hard-refreshing') === '1') {
    globalRefreshing.value = true
    pageReady.value = false
    window.setTimeout(() => {
      sessionStorage.removeItem('admin:hard-refreshing')
      globalRefreshing.value = false
      window.setTimeout(() => {
        pageReady.value = true
      }, 50)
    }, 650)
  }
  window.addEventListener('keydown', handleGlobalRefreshShortcut)
  connectChatUnreadSocket()
  void fetchChatUnreadCount()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalRefreshShortcut)
  disconnectChatUnreadSocket()
})
</script>

<style scoped>
/* 布局 */
.admin-layout {
  height: 100vh;
  background: var(--bg-primary);
}

/* 侧边栏 */
.sidebar {
  position: relative;
  background: var(--sidebar-bg);
  backdrop-filter: blur(20px);
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.sidebar-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
  z-index: -1;
}

/* Logo区域 */
.logo-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.logo-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-radius: 12px;
  color: white;
  flex-shrink: 0;
}

.logo-text {
  overflow: hidden;
  white-space: nowrap;
}

.logo-text h1 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  font-family: 'Fira Code', monospace;
}

.logo-text span {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.5px;
}

/* 导航菜单 */
.nav-menu {
  border: none;
  padding: 12px 8px;
}

.nav-menu :deep(.el-menu-item),
.nav-menu :deep(.el-sub-menu__title) {
  height: 44px;
  line-height: 44px;
  border-radius: 10px;
  margin-bottom: 4px;
  transition: all 0.2s ease;
}

.nav-menu :deep(.el-menu-item:hover),
.nav-menu :deep(.el-sub-menu__title:hover) {
  background: rgba(255, 255, 255, 0.08) !important;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: linear-gradient(135deg, #6669f0 0%, #7e90d9 100%) !important;
  /* box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4); */
}

.nav-menu :deep(.el-menu-item.is-active)::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 0 3px 3px 0;
}

.nav-menu :deep(.el-sub-menu .el-menu-item) {
  height: 38px;
  line-height: 38px;
  border-radius: 8px;
}

/* 子菜单图标对齐 */
.nav-menu :deep(.el-sub-menu__title),
.nav-menu :deep(.el-menu-item) {
  display: flex;
  align-items: center;
}

.nav-menu :deep(.el-sub-menu__title .el-icon),
.nav-menu :deep(.el-menu-item .el-icon) {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 18px;
}

/* 修复子菜单图标和箭头同一行 */
.nav-menu :deep(.el-sub-menu__title) {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
  justify-content: flex-start !important;
}

.nav-menu :deep(.el-sub-menu__title > .el-icon) {
  /* margin-right: 12px; */
  order: 1;
}

.nav-menu :deep(.el-sub-menu__title > span) {
  flex: 1;
  display: inline-flex !important;
  align-items: center;
  order: 2;
  margin-right: 8px;
}

/* 隐藏子菜单箭头 */
.nav-menu :deep(.el-sub-menu__icon-arrow) {
  display: none !important;
}

/* 侧边栏底部 */
.sidebar-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.version-info {
  text-align: center;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

/* 主内容区域 */
.main-content {
  background: var(--bg-primary);
}

/* 顶部导航栏 */
.topbar {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 64px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.collapse-btn {
  font-size: 18px;
  color: var(--text-secondary);
}

.breadcrumbs {
  font-size: 0.9rem;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quick-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: var(--text-secondary);
}

.icon-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 用户菜单 */
.user-menu {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  padding: 6px 12px 6px 6px;
  border-radius: 12px;
  transition: all 0.2s ease;
}

.user-menu:hover {
  background: var(--bg-secondary);
}

.user-avatar {
  background: #4a9feb;
  font-weight: 600;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar-field {
  display: flex;
  align-items: center;
  gap: 16px;
}

.hidden-avatar-input {
  display: none;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.2;
}

.user-role {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

/* 通知下拉 */
.notification-dropdown {
  width: 320px;
  padding: 0;
}

.notification-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid var(--border-color);
}

.notification-title {
  font-weight: 600;
  color: var(--text-primary);
}

.notification-list {
  max-height: 360px;
  overflow-y: auto;
}

.notification-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  cursor: pointer;
  transition: background 0.2s ease;
  border-bottom: 1px solid var(--border-light);
}

.notification-item:hover {
  background: var(--bg-secondary);
}

.notification-item.unread {
  background: rgba(99, 102, 241, 0.05);
}

.notification-item:last-child {
  border-bottom: none;
}

.notification-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  flex-shrink: 0;
}

.notification-icon.user {
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
}

.notification-icon.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.notification-icon.success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.notification-content {
  flex: 1;
  min-width: 0;
}

.notification-item-title {
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--text-primary);
  margin-bottom: 2px;
}

.notification-item-message {
  font-size: 0.8rem;
  color: var(--text-secondary);
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.notification-item-time {
  font-size: 0.75rem;
  color: var(--text-tertiary);
}

.notification-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-tertiary);
  gap: 8px;
}

/* 页面内容 */
.page-content {
  padding: 24px;
  background: var(--bg-primary);
  overflow-y: auto;
}

.page-content :deep(.el-loading-mask) {
  backdrop-filter: blur(4px);
}

.page-content :deep(.el-loading-spinner .path) {
  stroke: #6366f1;
}

.page-content :deep(.el-loading-spinner .el-loading-text) {
  color: #4338ca;
  font-weight: 600;
  letter-spacing: 0.02em;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.page-enter-active,
.page-leave-active {
  transition: all 0.25s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* 下拉菜单样式 */
.user-dropdown {
  min-width: 160px;
}

.user-dropdown :deep(.el-dropdown-menu__item) {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
}
</style>

<style>
/* 全局菜单弹出层样式 - 非 scoped */
.dark-popper,
.dark-popper.el-menu--popup,
.el-popper.is-light.dark-popper {
  background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%) !important;
  background-color: #0f172a !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.dark-popper .el-menu-item,
.dark-popper.el-menu--popup .el-menu-item {
  color: rgba(255, 255, 255, 0.7) !important;
}

.dark-popper .el-menu-item:hover,
.dark-popper.el-menu--popup .el-menu-item:hover {
  background: rgba(99, 102, 241, 0.3) !important;
  color: white !important;
}
</style>
