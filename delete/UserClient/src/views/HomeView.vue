<template>
  <div class="home">
    <!-- 头部轮播 -->
    <van-swipe :autoplay="3000" indicator-color="white">
      <van-swipe-item>
        <div class="banner">
          <div class="banner-content">
            <h1>哈尔滨学院校园综合服务平台</h1>
            <p>让校园生活更便捷</p>
          </div>
        </div>
      </van-swipe-item>
      <van-swipe-item>
        <div class="banner banner-alt">
          <div class="banner-content">
            <h1>新用户注册送积分</h1>
            <p>立即体验校园便捷服务</p>
          </div>
        </div>
      </van-swipe-item>
    </van-swipe>

    <!-- 服务导航 -->
    <van-grid :column-num="2" :gutter="16" class="service-nav">
      <van-grid-item to="/pickup">
        <van-icon name="logistics" size="36" color="#1989fa" />
        <div class="nav-text">代取服务</div>
      </van-grid-item>
      <van-grid-item to="/tasks">
        <van-icon name="orders-o" size="36" color="#1989fa" />
        <div class="nav-text">任务发布</div>
      </van-grid-item>
      <van-grid-item to="/forum">
        <van-icon name="chat-o" size="36" color="#1989fa" />
        <div class="nav-text">校园论坛</div>
      </van-grid-item>
      <van-grid-item to="/user">
        <van-icon name="user-o" size="36" color="#1989fa" />
        <div class="nav-text">个人中心</div>
      </van-grid-item>
    </van-grid>

    <!-- 快速入口 -->
    <van-cell-group title="快速入口" class="quick-access">
      <van-cell to="/pickup/express" is-link>
        <template #icon>
          <van-icon name="logistics" color="#1989fa" />
        </template>
        <template #title>
          <span class="access-title">快递代取</span>
        </template>
      </van-cell>
      <van-cell to="/pickup/food" is-link>
        <template #icon>
          <van-icon name="shopping-cart-o" color="#1989fa" />
        </template>
        <template #title>
          <span class="access-title">外卖代取</span>
        </template>
      </van-cell>
      <van-cell to="/tasks/publish" is-link>
        <template #icon>
          <van-icon name="edit" color="#1989fa" />
        </template>
        <template #title>
          <span class="access-title">发布任务</span>
        </template>
      </van-cell>
      <van-cell to="/forum/life" is-link>
        <template #icon>
          <van-icon name="shop-o" color="#1989fa" />
        </template>
        <template #title>
          <span class="access-title">二手市场</span>
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 最新动态 -->
    <van-cell-group title="最新动态" class="latest-news">
      <van-cell>
        <template #title>
          <div class="news-item">
            <van-tag type="primary" size="small">公告</van-tag>
            <span class="news-title">平台服务时间调整通知</span>
            <span class="news-time">2小时前</span>
          </div>
        </template>
      </van-cell>
      <van-cell>
        <template #title>
          <div class="news-item">
            <van-tag type="success" size="small">活动</van-tag>
            <span class="news-title">新用户注册送积分活动</span>
            <span class="news-time">1天前</span>
          </div>
        </template>
      </van-cell>
    </van-cell-group>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
const userStore = useUserStore()

onMounted(() => {
  // 初始化页面数据
})
</script>

<style scoped>
.home {
  min-height: 100vh;
  background: #f7f8fa;
}

.banner {
  background: #1989fa;
  color: white;
  padding: 60px 20px;
  text-align: center;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.banner-alt {
  background: #07c160;
}

.banner-content h1 {
  font-size: 1.5rem;
  margin-bottom: 8px;
  font-weight: 600;
}

.banner-content p {
  font-size: 1rem;
  opacity: 0.9;
}

.service-nav {
  margin: 16px;
  background: white;
  border-radius: 8px;
  padding: 16px 0;
}

.nav-text {
  font-size: 14px;
  color: #323233;
  margin-top: 8px;
  font-weight: 500;
}

.quick-access {
  margin: 16px;
}

.access-title {
  font-size: 16px;
  color: #323233;
  font-weight: 500;
}

.latest-news {
  margin: 16px;
  margin-bottom: 80px;
}

.news-item {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 8px;
}

.news-title {
  flex: 1;
  font-size: 14px;
  color: #323233;
  margin-left: 8px;
}

.news-time {
  font-size: 12px;
  color: #969799;
}

:deep(.van-swipe) {
  border-radius: 0;
}

:deep(.van-grid-item__content) {
  padding: 20px 16px;
  background: white;
}

:deep(.van-cell-group__title) {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.van-cell__title) {
  font-size: 16px;
}

:deep(.van-tag) {
  margin-right: 8px;
}
</style>
