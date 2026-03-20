<template>
  <div class="academic-forum">
    <van-nav-bar title="学术交流" left-arrow @click-left="goBack">
      <template #right>
        <van-button type="primary" size="mini" @click="quickPost">
          发布
        </van-button>
      </template>
    </van-nav-bar>

    <div class="forum-header">
      <p>学术讨论、论文分享、研究交流</p>
    </div>

    <div class="forum-content">
      <!-- 学术公告栏 -->
      <van-cell-group class="announcement-card">
        <template #title>
          <div class="card-header">
            <h3>学术公告</h3>
            <van-button type="primary" size="mini" plain @click="viewAllAnnouncements">
              查看全部
            </van-button>
          </div>
        </template>
        <van-steps direction="vertical" :active="-1">
          <van-step
            v-for="announcement in announcements"
            :key="announcement.id"
          >
            <template #active-icon>
              <van-icon name="bell-o" />
            </template>
            <div class="announcement-item" @click="viewAnnouncement(announcement.id)">
              <div class="announcement-title">{{ announcement.title }}</div>
              <div class="announcement-time">{{ formatDate(announcement.created_at) }}</div>
            </div>
          </van-step>
        </van-steps>
      </van-cell-group>

      <!-- 学术分类 -->
      <van-tabs v-model:active="activeTab" @change="handleTabChange">
        <van-tab title="全部" name="all">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="论文讨论" name="paper">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="学术资源" name="resource">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="研究分享" name="research">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="问答互助" name="qa">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import PostList from '@/components/forum/PostList.vue'
import { forumAPI } from '@/utils/api'

const router = useRouter()

// 响应式数据
const loading = ref(false)
const posts = ref([])
const announcements = ref([])
const activeTab = ref('all')

// 方法
const goBack = () => {
  router.push('/forum')
}

const quickPost = () => {
  router.push('/forum/post?category=academic')
}

const loadPosts = async () => {
  loading.value = true
  try {
    const params = {
      category: 'academic',
      sub_category: activeTab.value !== 'all' ? activeTab.value : undefined,
    }

    const response = await forumAPI.getPosts(params)
    if (response.success) {
      posts.value = response.data.posts
    }
  } catch (error) {
    showToast('加载帖子失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  loadPosts()
}

const loadMore = () => {
  // 加载更多逻辑
  loadPosts()
}

const viewAllAnnouncements = () => {
  router.push('/announcements')
}

const viewAnnouncement = (id) => {
  router.push(`/announcements/${id}`)
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载公告
const loadAnnouncements = () => {
  announcements.value = [
    {
      id: 1,
      title: '2024年学术年会征稿通知',
      created_at: new Date(Date.now() - 86400000),
    },
    {
      id: 2,
      title: '图书馆学术数据库使用培训',
      created_at: new Date(Date.now() - 172800000),
    },
    {
      id: 3,
      title: '研究生学术沙龙活动安排',
      created_at: new Date(Date.now() - 259200000),
    },
  ]
}

// 生命周期
onMounted(() => {
  loadPosts()
  loadAnnouncements()
})
</script>

<style scoped>
.academic-forum {
  background: #f7f8fa;
  min-height: 100vh;
}

.forum-header {
  padding: 16px;
  background: white;
  text-align: center;
  color: #646566;
  font-size: 14px;
  border-bottom: 1px solid #ebedf0;
}

.forum-content {
  padding: 16px;
}

.announcement-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.card-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.announcement-item {
  cursor: pointer;
  padding: 8px 0;
  border-radius: 4px;
  transition: background 0.3s;
}

.announcement-item:hover {
  background: #f5f7fa;
}

.announcement-title {
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 14px;
}

.announcement-time {
  color: #969799;
  font-size: 12px;
}

/* Vant组件样式覆写 */
:deep(.van-cell-group__title) {
  padding: 16px;
  font-weight: 600;
  color: #323233;
  font-size: 16px;
}

:deep(.van-nav-bar) {
  background: white;
  border-bottom: 1px solid #ebedf0;
}

:deep(.van-tabs__wrap) {
  background: white;
}

:deep(.van-tab) {
  color: #646566;
}

:deep(.van-tab--active) {
  color: #1989fa;
}

:deep(.van-steps--vertical) {
  padding: 16px 0;
}

:deep(.van-step__circle) {
  background: #1989fa;
  color: white;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .forum-content {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>