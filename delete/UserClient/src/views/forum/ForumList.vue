<template>
  <div class="forum-list">
    <van-nav-bar title="校园论坛" left-arrow @click-left="goBack">
      <template #right>
        <van-button type="primary" size="mini" @click="goToPost">
          发布帖子
        </van-button>
      </template>
    </van-nav-bar>

    <div class="forum-nav">
      <van-tabs v-model:active="currentCategory" @change="handleCategoryChange">
        <van-tab
          v-for="category in categories"
          :key="category.id"
          :name="category.id"
          :title="category.name"
        >
          <template #title>
            <van-icon :name="getCategoryIcon(category.id)" />
            <span>{{ category.name }}</span>
            <van-badge
              v-if="getCategoryPostCount(category.id) > 0"
              :content="getCategoryPostCount(category.id)"
              max="99"
            />
          </template>
        </van-tab>
      </van-tabs>
    </div>

    <van-cell-group class="controls-section">
      <van-field
        v-model="searchKeyword"
        name="search"
        placeholder="搜索帖子..."
        left-icon="search"
        clearable
      />

      <van-field
        name="sort"
        label="排序"
        placeholder="请选择排序方式"
        readonly
        is-link
        :value="getSortText(sortBy)"
        @click="showSortPicker = true"
      />
    </van-cell-group>

    <div class="forum-content">
      <van-loading v-if="forumStore.loading" class="loading-container" vertical>
        加载中...
      </van-loading>

      <div v-else-if="filteredPosts.length" class="posts-list">
        <van-card
          v-for="post in filteredPosts"
          :key="post.id"
          :title="post.title"
          :desc="post.content"
          :thumb="post.author?.avatar"
          @click="viewPost(post.id)"
        >
          <template #tags>
            <van-tag :type="getCategoryTagType(post.category)">
              {{ getCategoryName(post.category) }}
            </van-tag>
            <van-tag v-if="post.is_pinned" type="warning" size="mini">
              <van-icon name="flag-o" />
              置顶
            </van-tag>
            <van-tag v-if="post.is_hot" type="danger" size="mini">
              <van-icon name="fire-o" />
              热门
            </van-tag>
          </template>

          <template #footer>
            <div class="post-footer">
              <div class="post-meta">
                <span class="post-time">{{ formatTime(post.created_at) }}</span>
                <span class="post-author">{{ post.author?.name || '匿名用户' }}</span>
              </div>

              <div class="post-stats">
                <span class="stat-item">
                  <van-icon name="eye-o" />
                  {{ post.view_count || 0 }}
                </span>
                <span class="stat-item">
                  <van-icon name="like-o" />
                  {{ post.like_count || 0 }}
                </span>
                <span class="stat-item">
                  <van-icon name="chat-o" />
                  {{ post.comment_count || 0 }}
                </span>
              </div>
            </div>

            <div v-if="post.tags && post.tags.length" class="post-tags">
              <van-tag
                v-for="tag in post.tags.slice(0, 4)"
                :key="tag"
                size="mini"
                type="primary"
                plain
              >
                {{ tag }}
              </van-tag>
            </div>
          </template>
        </van-card>
      </div>

      <van-empty v-else description="暂无符合条件的帖子" class="empty-state">
        <template #image>
          <van-icon name="chat-o" size="64" color="#dcdee0" />
        </template>
        <template #description>
          <div class="empty-desc">
            <p>还没有{{ getCurrentCategoryName() }}的帖子，来发布第一个吧！</p>
            <van-button type="primary" @click="goToPost">
              发布帖子
            </van-button>
          </div>
        </template>
      </van-empty>
    </div>

    <van-cell-group v-if="hotTopics.length" title="🔥 热门话题" class="hot-topics">
      <van-cell
        v-for="topic in hotTopics"
        :key="topic.id"
        :title="`#${topic.name}`"
        :value="`${topic.post_count}个帖子`"
        is-link
        @click="searchTopic(topic.name)"
      />
    </van-cell-group>

    <van-cell-group v-if="activeUsers.length" title="👥 活跃用户" class="active-users">
      <van-cell
        v-for="user in activeUsers"
        :key="user.id"
        :title="user.name"
        :label="`${user.post_count}个帖子`"
      >
        <template #icon>
          <van-image
            v-if="user.avatar"
            :src="user.avatar"
            :alt="user.name"
            width="32"
            height="32"
            round
          />
          <van-icon v-else name="user-circle-o" size="32" />
        </template>
      </van-cell>
    </van-cell-group>

    <!-- 排序选择器 -->
    <van-popup v-model:show="showSortPicker" position="bottom">
      <van-picker
        :columns="sortOptions"
        @confirm="onSortConfirm"
        @cancel="showSortPicker = false"
        title="选择排序方式"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forum'
import { showToast } from 'vant'

const router = useRouter()
const forumStore = useForumStore()

const currentCategory = ref('all')
const searchKeyword = ref('')
const sortBy = ref('latest')
const showSortPicker = ref(false)

const hotTopics = ref([])
const activeUsers = ref([])

const categories = [
  { id: 'all', name: '全部' },
  { id: 'academic', name: '学术交流' },
  { id: 'life', name: '生活服务' },
  { id: 'campus', name: '校园动态' },
  { id: 'task', name: '任务交流' },
  { id: 'skill', name: '技能分享' }
]

const sortOptions = [
  { text: '最新发布', value: 'latest' },
  { text: '最热帖子', value: 'hot' },
  { text: '最多点赞', value: 'most_liked' },
  { text: '最多评论', value: 'most_comments' }
]

const filteredPosts = computed(() => {
  let posts = forumStore.posts

  // 分类过滤
  if (currentCategory.value !== 'all') {
    posts = posts.filter(post => post.category === currentCategory.value)
  }

  // 搜索过滤
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase()
    posts = posts.filter(post =>
      post.title.toLowerCase().includes(keyword) ||
      post.content.toLowerCase().includes(keyword) ||
      (post.tags && post.tags.some(tag => tag.toLowerCase().includes(keyword)))
    )
  }

  // 排序
  switch (sortBy.value) {
    case 'hot':
      posts = posts.sort((a, b) => {
        const hotScoreA = (a.like_count || 0) * 2 + (a.comment_count || 0) + (a.view_count || 0) * 0.1
        const hotScoreB = (b.like_count || 0) * 2 + (b.comment_count || 0) + (b.view_count || 0) * 0.1
        return hotScoreB - hotScoreA
      })
      break
    case 'most_liked':
      posts = posts.sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
      break
    case 'most_comments':
      posts = posts.sort((a, b) => (b.comment_count || 0) - (a.comment_count || 0))
      break
    default: // latest
      posts = posts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  }

  // 置顶帖子排在前面
  posts = posts.sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1
    if (!a.is_pinned && b.is_pinned) return 1
    return 0
  })

  return posts
})

function goBack() {
  router.push('/')
}

function goToPost() {
  router.push('/forum/post')
}

function getCategoryName(categoryId) {
  const category = categories.find(cat => cat.id === categoryId)
  return category ? category.name : categoryId
}

function getCategoryIcon(categoryId) {
  const iconMap = {
    all: 'notes-o',
    academic: 'book-o',
    life: 'home-o',
    campus: 'building-o',
    task: 'todo-list-o',
    skill: 'bulb-o',
  }
  return iconMap[categoryId] || 'notes-o'
}

function getCategoryTagType(categoryId) {
  const typeMap = {
    academic: 'primary',
    life: 'success',
    campus: 'warning',
    task: 'default',
    skill: 'danger',
  }
  return typeMap[categoryId] || 'default'
}

function getCurrentCategoryName() {
  if (currentCategory.value === 'all') return '论坛'
  return getCategoryName(currentCategory.value)
}

function getCategoryPostCount(categoryId) {
  if (categoryId === 'all') return forumStore.posts.length
  return forumStore.posts.filter(post => post.category === categoryId).length
}

function getSortText(value) {
  const option = sortOptions.find(opt => opt.value === value)
  return option ? option.text : ''
}

function handleCategoryChange(categoryId) {
  currentCategory.value = categoryId
}

function onSortConfirm({ selectedOptions }) {
  sortBy.value = selectedOptions[0].value
  showSortPicker.value = false
}

function formatTime(timeString) {
  const date = new Date(timeString)
  const now = new Date()
  const diffMs = now - date
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return '刚刚'
  if (diffMins < 60) return `${diffMins}分钟前`
  if (diffMins < 1440) return `${Math.floor(diffMins / 60)}小时前`
  if (diffMins < 43200) return `${Math.floor(diffMins / 1440)}天前`
  return date.toLocaleDateString()
}

function viewPost(postId) {
  router.push(`/forum/${postId}`)
}

function searchTopic(topicName) {
  searchKeyword.value = topicName
}

async function fetchPosts() {
  try {
    await forumStore.fetchPosts()
  } catch (error) {
    console.error('获取帖子列表失败:', error)
    showToast('获取帖子列表失败')
  }
}

async function fetchHotTopics() {
  try {
    hotTopics.value = await forumStore.fetchHotTopics()
  } catch (error) {
    console.error('获取热门话题失败:', error)
  }
}

async function fetchActiveUsers() {
  try {
    activeUsers.value = await forumStore.fetchActiveUsers()
  } catch (error) {
    console.error('获取活跃用户失败:', error)
  }
}

onMounted(() => {
  fetchPosts()
  fetchHotTopics()
  fetchActiveUsers()
})
</script>

<style scoped>
.forum-list {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.forum-nav {
  background: white;
  margin-bottom: 16px;
}

.controls-section {
  margin: 16px;
}

.forum-content {
  margin: 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
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

.post-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #646566;
}

.post-time {
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
  font-size: 12px;
  color: #969799;
}

.post-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.empty-desc {
  text-align: center;
}

.empty-desc p {
  color: #646566;
  margin-bottom: 16px;
  font-size: 14px;
}

.hot-topics,
.active-users {
  margin: 16px;
}

/* Vant组件样式覆写 */
:deep(.van-tabs__wrap) {
  padding: 0 16px;
}

:deep(.van-tab) {
  padding: 8px 12px;
}

:deep(.van-badge) {
  transform: scale(0.8);
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
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

:deep(.van-card__thumb) {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  overflow: hidden;
}

:deep(.van-cell-group__title) {
  padding: 16px;
  font-weight: 600;
  color: #323233;
}

:deep(.van-field__left-icon) {
  color: #1989fa;
  margin-right: 8px;
}

:deep(.van-empty) {
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .post-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .post-meta {
    align-self: stretch;
  }

  .post-stats {
    justify-content: space-between;
    align-self: stretch;
  }
}
</style>