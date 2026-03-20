<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const activeTab = ref(0)

// 监听路由变化更新activeTab
router.afterEach((to) => {
  const tabRoutes = ['/', '/pickup', '/tasks', '/forum', '/user']
  activeTab.value = tabRoutes.indexOf(to.path)
})

const onTabChange = (active) => {
  const tabRoutes = ['/', '/pickup', '/tasks', '/forum', '/user']
  router.push(tabRoutes[active])
}
</script>

<template>
  <div id="app">
    <!-- 主要内容区域 -->
    <main class="app-main">
      <router-view />
    </main>

    <!-- 底部导航栏   -->
    <van-tabbar v-model="activeTab" @change="onTabChange" placeholder>
      <van-tabbar-item icon="home-o"> 首页 </van-tabbar-item>
      <van-tabbar-item icon="logistics"> 代取 </van-tabbar-item>
      <van-tabbar-item icon="orders-o"> 任务 </van-tabbar-item>
      <van-tabbar-item icon="chat-o"> 论坛 </van-tabbar-item>
      <van-tabbar-item icon="user-o"> 我的 </van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: #f7f8fa;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 主要内容区域 */
.app-main {
  flex: 1;
  overflow-x: hidden;
}

/* Vant组件样式自定义 */
.van-tabbar {
  border-top: 1px solid #ebedf0;
  background: white;
}

.van-tabbar-item--active {
  color: #1989fa !important;
}

.van-tabbar-item__icon--active {
  color: #1989fa !important;
}

/* 导航栏样式 */
.van-nav-bar {
  background: #1989fa;
}

.van-nav-bar .van-nav-bar__title {
  color: white !important;
  font-weight: 600;
}

.van-nav-bar .van-icon {
  color: white !important;
}

.van-nav-bar .van-nav-bar__text {
  color: white !important;
}

/* 页面容器通用样式 */
.page-container {
  padding: 16px;
  min-height: calc(100vh - 50px);
  background: #f7f8fa;
}

.page-content {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08);
}

/* 卡片样式 */
.card {
  background: white;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08);
  border: 1px solid #ebedf0;
}

/* 按钮样式覆盖 */
.van-button--primary {
  background: #1989fa !important;
  border: none !important;
  border-radius: 20px !important;
}

.van-button--primary:active {
  background: #1989fa !important;
}

/* 加载状态 */
.loading-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  min-height: 200px;
}

/* 空状态 */
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  min-height: 200px;
  color: #969799;
  text-align: center;
}

.empty-text {
  font-size: 14px;
  line-height: 20px;
  margin-top: 16px;
}

/* 通用间距 */
.mb-8 {
  margin-bottom: 8px;
}
.mb-12 {
  margin-bottom: 12px;
}
.mb-16 {
  margin-bottom: 16px;
}
.mb-20 {
  margin-bottom: 20px;
}
.mb-24 {
  margin-bottom: 24px;
}

.mt-8 {
  margin-top: 8px;
}
.mt-12 {
  margin-top: 12px;
}
.mt-16 {
  margin-top: 16px;
}
.mt-20 {
  margin-top: 20px;
}
.mt-24 {
  margin-top: 24px;
}

.p-16 {
  padding: 16px;
}
.p-20 {
  padding: 20px;
}

/* 文字样式 */
.text-primary {
  color: #1989fa;
}
.text-secondary {
  color: #969799;
}
.text-success {
  color: #07c160;
}
.text-warning {
  color: #ff976a;
}
.text-danger {
  color: #ee0a24;
}

.text-center {
  text-align: center;
}
.text-right {
  text-align: right;
}

/* Flex布局 */
.flex {
  display: flex;
}
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}
.flex-between {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.flex-column {
  display: flex;
  flex-direction: column;
}

/* 圆角 */
.rounded {
  border-radius: 8px;
}
.rounded-full {
  border-radius: 50%;
}

/* 阴影 */
.shadow {
  box-shadow: 0 2px 12px rgba(100, 101, 102, 0.08);
}
</style>
