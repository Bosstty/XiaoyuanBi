<template>
  <div class="life-forum">
    <van-nav-bar title="生活服务" left-arrow @click-left="goBack">
      <template #right>
        <van-button type="primary" size="mini" @click="quickPost">
          发布信息
        </van-button>
      </template>
    </van-nav-bar>

    <div class="forum-header">
      <p>二手交易、失物招领、生活分享</p>
    </div>

    <div class="forum-content">
      <!-- 快捷服务 -->
      <van-grid :column-num="4" class="quick-services">
        <van-grid-item
          v-for="service in services"
          :key="service.id"
          @click="goToCategory(service.category)"
        >
          <div class="service-icon">{{ service.icon }}</div>
          <div class="service-title">{{ service.title }}</div>
        </van-grid-item>
      </van-grid>

      <!-- 分类筛选 -->
      <van-cell-group class="category-filter">
        <template #title>
          <h3>分类筛选</h3>
        </template>
        <div class="filter-tags">
          <van-tag
            v-for="tag in filterTags"
            :key="tag.value"
            :type="activeFilter === tag.value ? 'primary' : 'default'"
            @click="setActiveFilter(tag.value)"
            size="medium"
          >
            {{ tag.label }}
          </van-tag>
        </div>
      </van-cell-group>

      <!-- 帖子列表 -->
      <van-tabs v-model:active="activeTab" @change="handleTabChange">
        <van-tab title="全部" name="all">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="二手交易" name="secondhand">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="失物招领" name="lost-found">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="生活分享" name="sharing">
          <PostList :posts="posts" :loading="loading" @load-more="loadMore" />
        </van-tab>
        <van-tab title="互助求助" name="help">
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
const activeTab = ref('all')
const activeFilter = ref('all')

const services = [
  { id: 1, title: '二手交易', icon: '🛒', category: 'secondhand' },
  { id: 2, title: '失物招领', icon: '🔍', category: 'lost-found' },
  { id: 3, title: '生活分享', icon: '❤️', category: 'sharing' },
  { id: 4, title: '互助求助', icon: '🤝', category: 'help' },
]

const filterTags = [
  { label: '全部', value: 'all' },
  { label: '二手', value: 'secondhand' },
  { label: '招领', value: 'lost' },
  { label: '分享', value: 'share' },
  { label: '求助', value: 'help' },
]

// 方法
const goBack = () => {
  router.push('/forum')
}

const quickPost = () => {
  router.push('/forum/post?category=life')
}

const goToCategory = (category) => {
  activeTab.value = category
  loadPosts()
}

const setActiveFilter = (filter) => {
  activeFilter.value = filter
  loadPosts()
}

const loadPosts = async () => {
  loading.value = true
  try {
    const params = {
      category: 'life',
      sub_category: activeTab.value !== 'all' ? activeTab.value : undefined,
      filter: activeFilter.value !== 'all' ? activeFilter.value : undefined,
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

// 生命周期
onMounted(() => {
  loadPosts()
})
</script>

<style scoped>
.life-forum {
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

.quick-services {
  margin-bottom: 16px;
  background: white;
  border-radius: 8px;
  padding: 16px;
}

.service-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.service-title {
  font-size: 12px;
  color: #323233;
  font-weight: 500;
}

.category-filter {
  margin-bottom: 16px;
}

.category-filter h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}

.filter-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px;
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

:deep(.van-grid-item__content) {
  padding: 16px 8px;
  background: white;
  border-radius: 8px;
  border: 1px solid #ebedf0;
  cursor: pointer;
  transition: all 0.3s;
}

:deep(.van-grid-item__content:hover) {
  border-color: #1989fa;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.15);
}

:deep(.van-tag) {
  margin: 2px 4px 2px 0;
  cursor: pointer;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .forum-content {
    padding: 8px;
  }

  .filter-tags {
    padding: 8px;
  }

  .quick-services {
    padding: 8px;
  }
}
</style>