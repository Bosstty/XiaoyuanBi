<template>
  <div class="user-center">
    <div class="container">
      <!-- 侧边栏 -->
      <div class="sidebar" :class="{ 'sidebar-hidden': !showSidebar }">
        <div class="sidebar-content">
          <div class="user-info">
            <van-image
              :src="userStore.user?.avatar"
              round
              width="80px"
              height="80px"
              fit="cover"
              :show-error="false"
              :show-loading="false"
              class="avatar"
            >
              <template #error>
                <div class="avatar-fallback">
                  {{ userStore.user?.username?.charAt(0) }}
                </div>
              </template>
            </van-image>
            <h3>{{ userStore.user?.username }}</h3>
            <p>{{ userStore.user?.email }}</p>
          </div>

          <van-sidebar v-model="activeMenuIndex" @change="handleMenuSelect" class="user-menu">
            <van-sidebar-item title="个人资料" name="profile">
              <template #icon>
                <van-icon name="user-o" />
              </template>
            </van-sidebar-item>
            <van-sidebar-item title="我的订单" name="orders">
              <template #icon>
                <van-icon name="orders-o" />
              </template>
            </van-sidebar-item>
            <van-sidebar-item title="我的任务" name="tasks">
              <template #icon>
                <van-icon name="list-o" />
              </template>
            </van-sidebar-item>
            <van-sidebar-item title="我的钱包" name="wallet">
              <template #icon>
                <van-icon name="balance-o" />
              </template>
            </van-sidebar-item>
            <van-sidebar-item title="设置" name="settings">
              <template #icon>
                <van-icon name="setting-o" />
              </template>
            </van-sidebar-item>
          </van-sidebar>
        </div>
      </div>

      <!-- 移动端菜单按钮 -->
      <van-button
        class="mobile-menu-btn"
        type="primary"
        size="small"
        @click="showSidebar = !showSidebar"
        icon="bars"
      />

      <!-- 主内容区 -->
      <div class="main-content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const showSidebar = ref(false)

const activeMenuIndex = computed(() => {
  const routeName = route.name
  if (routeName === 'user-profile') return 0
  if (routeName === 'user-orders') return 1
  if (routeName === 'user-tasks') return 2
  if (routeName === 'user-wallet') return 3
  if (routeName === 'user-settings') return 4
  return 0
})

const handleMenuSelect = (index) => {
  const menuNames = ['profile', 'orders', 'tasks', 'wallet', 'settings']
  const routes = {
    profile: '/user/profile',
    orders: '/user/orders',
    tasks: '/user/tasks',
    wallet: '/user/wallet',
    settings: '/user/settings',
  }
  const menuName = menuNames[index]
  router.push(routes[menuName])
  showSidebar.value = false
}

onMounted(() => {
  // 确保用户已登录
  if (!userStore.isLoggedIn) {
    router.push('/login')
  }
})
</script>

<style scoped>
.user-center {
  min-height: calc(100vh - 60px);
  background: #f5f5f5;
}

.container {
  display: flex;
  min-height: calc(100vh - 60px);
  position: relative;
}

.sidebar {
  width: 240px;
  background: white;
  box-shadow: 2px 0 6px rgba(0, 0, 0, 0.1);
  position: relative;
  z-index: 10;
  transition: transform 0.3s;
}

.sidebar-content {
  height: 100%;
}

.user-info {
  padding: 30px 20px;
  text-align: center;
  border-bottom: 1px solid #ebeef5;
}

.avatar {
  margin: 0 auto;
}

.avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: #409eff;
  color: white;
  font-size: 32px;
  font-weight: bold;
}

.user-info h3 {
  margin: 15px 0 5px 0;
  color: #303133;
  font-size: 18px;
}

.user-info p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.user-menu {
  border: none;
}

.mobile-menu-btn {
  position: fixed;
  top: 80px;
  left: 10px;
  z-index: 20;
  display: none;
}

.main-content {
  flex: 1;
  padding: 20px;
  background: #f5f5f5;
  overflow-x: auto;
}

@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    left: 0;
    height: 100vh;
    width: 200px;
    transform: translateX(-100%);
  }

  .sidebar-hidden {
    transform: translateX(-100%);
  }

  .sidebar:not(.sidebar-hidden) {
    transform: translateX(0);
  }

  .mobile-menu-btn {
    display: block;
  }

  .user-info {
    padding: 20px 15px;
  }

  .user-info h3 {
    font-size: 16px;
  }

  .main-content {
    padding: 15px;
  }
}
</style>
