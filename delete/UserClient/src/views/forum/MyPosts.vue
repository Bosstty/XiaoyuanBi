<template>
  <div class="my-posts">
    <van-nav-bar title="我的帖子" left-arrow @click-left="goBack">
      <template #right>
        <van-button type="primary" size="mini" @click="goToPost">
          发布帖子
        </van-button>
      </template>
    </van-nav-bar>

    <!-- 分类导航 -->
    <van-tabs v-model:active="currentCategory" @change="handleCategoryChange">
      <van-tab title="全部" name="all">
        <template #title>
          <van-icon name="apps-o" />
          全部
        </template>
      </van-tab>
      <van-tab title="学术交流" name="academic">
        <template #title>
          <van-icon name="book-o" />
          学术交流
        </template>
      </van-tab>
      <van-tab title="生活服务" name="life">
        <template #title>
          <van-icon name="home-o" />
          生活服务
        </template>
      </van-tab>
      <van-tab title="校园动态" name="campus">
        <template #title>
          <van-icon name="building-o" />
          校园动态
        </template>
      </van-tab>
      <van-tab title="任务交流" name="task">
        <template #title>
          <van-icon name="todo-list-o" />
          任务交流
        </template>
      </van-tab>
      <van-tab title="技能分享" name="skill">
        <template #title>
          <van-icon name="bulb-o" />
          技能分享
        </template>
      </van-tab>
    </van-tabs>

    <!-- 搜索和筛选 -->
    <van-cell-group>
      <van-field
        v-model="searchQuery"
        name="search"
        placeholder="搜索帖子标题或内容..."
        left-icon="search"
        clearable
        @keyup.enter="searchPosts"
      >
        <template #button>
          <van-button size="small" @click="searchPosts">搜索</van-button>
        </template>
      </van-field>

      <van-field
        name="sort"
        label="排序"
        placeholder="请选择排序方式"
        readonly
        is-link
        :value="getSortText(sortBy)"
        @click="showSortPicker = true"
      />

      <van-field
        name="time"
        label="时间"
        placeholder="请选择时间筛选"
        readonly
        is-link
        :value="getTimeText(timeFilter)"
        @click="showTimePicker = true"
      />
    </van-cell-group>

    <!-- 帖子列表 -->
    <div class="posts-container">
      <van-loading v-if="loading" class="loading-container" vertical>
        加载中...
      </van-loading>

      <van-empty v-else-if="posts.length === 0" description="暂无帖子" />

      <div v-else class="posts-list">
        <van-card
          v-for="post in posts"
          :key="post.id"
          :title="post.title"
          :desc="post.excerpt || post.content?.substring(0, 200) + '...'"
          :thumb="post.images?.[0]"
          @click="goToPostDetail(post.id)"
        >
          <template #tags>
            <van-tag :type="getCategoryTagType(post.category)" size="small">
              {{ getCategoryText(post.category) }}
            </van-tag>
          </template>

          <template #footer>
            <div class="post-footer">
              <div class="post-user">
                <van-image
                  v-if="post.author?.avatar"
                  :src="post.author.avatar"
                  width="24"
                  height="24"
                  round
                />
                <van-icon v-else name="user-circle-o" size="24" />
                <div class="user-info">
                  <span class="username">{{ post.author?.real_name }}</span>
                  <span class="post-time">{{ formatTime(post.created_at) }}</span>
                </div>
              </div>

              <div class="post-stats">
                <span class="stat-item">
                  <van-icon name="eye-o" />
                  {{ post.view_count }}
                </span>
                <span class="stat-item">
                  <van-icon name="chat-o" />
                  {{ post.comment_count }}
                </span>
                <span class="stat-item">
                  <van-icon name="like-o" :class="{ liked: post.is_liked }" @click.stop="toggleLike(post)" />
                  {{ post.like_count }}
                </span>
              </div>
            </div>
          </template>
        </van-card>
      </div>

      <!-- 分页 -->
      <van-pagination
        v-if="total > 0"
        v-model="currentPage"
        :total-items="total"
        :items-per-page="pageSize"
        mode="simple"
        @change="handleCurrentChange"
      />
    </div>
    <!-- 排序选择器 -->
    <van-popup v-model:show="showSortPicker" position="bottom">
      <van-picker
        :columns="sortColumns"
        @confirm="onSortConfirm"
        @cancel="showSortPicker = false"
        title="选择排序方式"
      />
    </van-popup>

    <!-- 时间筛选器 -->
    <van-popup v-model:show="showTimePicker" position="bottom">
      <van-picker
        :columns="timeColumns"
        @confirm="onTimeConfirm"
        @cancel="showTimePicker = false"
        title="选择时间筛选"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { forumAPI } from '@/utils/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(false)
const posts = ref([])
const currentCategory = ref('all')
const searchQuery = ref('')
const sortBy = ref('created_at')
const timeFilter = ref('all')
const showSortPicker = ref(false)
const showTimePicker = ref(false)

// 分页
const currentPage = ref(1)
const pageSize = ref(20)
const total = ref(0)

// 选择器选项
const sortColumns = [
  { text: '最新发布', value: 'created_at' },
  { text: '最多回复', value: 'comment_count' },
  { text: '最多点赞', value: 'like_count' },
  { text: '最多浏览', value: 'view_count' },
]

const timeColumns = [
  { text: '全部时间', value: 'all' },
  { text: '今天', value: 'today' },
  { text: '本周', value: 'week' },
  { text: '本月', value: 'month' },
]

// 计算属性
const categoryTitle = computed(() => {
  const categoryMap = {
    all: '全部帖子',
    academic: '学术交流',
    life: '生活服务',
    campus: '校园动态',
    task: '任务交流',
    skill: '技能分享',
  }
  return categoryMap[currentCategory.value] || '论坛'
})

// 方法
const loadPosts = async () => {
  loading.value = true
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      sort: sortBy.value,
      order: 'desc',
    }

    if (currentCategory.value !== 'all') {
      params.category = currentCategory.value
    }

    if (searchQuery.value) {
      params.search = searchQuery.value
    }

    if (timeFilter.value !== 'all') {
      params.time_filter = timeFilter.value
    }

    const response = await forumAPI.getPosts(params)
    if (response.success) {
      posts.value = response.data.posts
      total.value = response.data.pagination.total
    }
  } catch (error) {
    showToast('加载帖子失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const handleCategoryChange = (category) => {
  currentCategory.value = category
  currentPage.value = 1
  loadPosts()
}

const searchPosts = () => {
  currentPage.value = 1
  loadPosts()
}

const goBack = () => {
  router.go(-1)
}

const getSortText = (value) => {
  const item = sortColumns.find(item => item.value === value)
  return item ? item.text : '最新发布'
}

const getTimeText = (value) => {
  const item = timeColumns.find(item => item.value === value)
  return item ? item.text : '全部时间'
}

const onSortConfirm = ({ selectedOptions }) => {
  sortBy.value = selectedOptions[0].value
  showSortPicker.value = false
  loadPosts()
}

const onTimeConfirm = ({ selectedOptions }) => {
  timeFilter.value = selectedOptions[0].value
  showTimePicker.value = false
  loadPosts()
}

const handleCurrentChange = (val) => {
  currentPage.value = val
  loadPosts()
}

const goToPost = () => {
  router.push('/forum/post')
}

const goToPostDetail = (id) => {
  router.push(`/forum/${id}`)
}

const toggleLike = async (post) => {
  try {
    const response = await forumAPI.likePost(post.id)
    if (response.success) {
      post.is_liked = !post.is_liked
      post.like_count += post.is_liked ? 1 : -1
      showToast(post.is_liked ? '点赞成功' : '取消点赞')
    }
  } catch (error) {
    showToast('操作失败: ' + error.message)
  }
}

const getCategoryText = (category) => {
  const categoryMap = {
    academic: '学术交流',
    life: '生活服务',
    campus: '校园动态',
    task: '任务交流',
    skill: '技能分享',
  }
  return categoryMap[category] || category
}

const getCategoryTagType = (category) => {
  const typeMap = {
    academic: 'primary',
    life: 'success',
    campus: 'warning',
    task: 'info',
    skill: 'danger',
  }
  return typeMap[category] || ''
}

const formatTime = (time) => {
  const now = new Date()
  const postTime = new Date(time)
  const diff = now - postTime
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}天前`
  return postTime.toLocaleDateString()
}

// 监听路由变化
watch(
  () => route.params.category,
  (newCategory) => {
    if (newCategory) {
      currentCategory.value = newCategory
      loadPosts()
    }
  },
  { immediate: true },
)

// 生命周期
onMounted(() => {
  loadPosts()
})
</script>

<style scoped>
.my-posts {
  background: #f7f8fa;
  min-height: 100vh;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.posts-container {
  padding: 16px;
}

.posts-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.post-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.username {
  font-size: 12px;
  color: #323233;
  font-weight: 500;
}

.post-time {
  font-size: 11px;
  color: #969799;
}

.post-stats {
  display: flex;
  gap: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #646566;
  font-size: 12px;
}

.stat-item .van-icon.liked {
  color: #ee0a24;
}

/* Vant组件样式覆写 */
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

:deep(.van-cell-group) {
  margin-bottom: 16px;
}

:deep(.van-card) {
  margin-bottom: 12px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

:deep(.van-card__content) {
  padding: 12px;
}

:deep(.van-card__title) {
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 8px;
}

:deep(.van-card__desc) {
  color: #646566;
  line-height: 1.5;
}

:deep(.van-pagination) {
  margin-top: 16px;
  justify-content: center;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .post-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .post-stats {
    align-self: flex-end;
  }
}
</style>
