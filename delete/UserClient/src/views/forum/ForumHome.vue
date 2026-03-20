<template>
  <div class="forum-home">
    <van-nav-bar title="校园论坛" left-arrow @click-left="goBack">
      <template #right>
        <van-icon name="edit" @click="showPostDialog = true" />
      </template>
    </van-nav-bar>

    <div class="forum-nav">
      <van-tabs v-model:active="activeCategory" @change="setActiveCategory">
        <van-tab
          v-for="category in categories"
          :key="category.id"
          :name="category.id"
          :title="category.name"
        >
          <template #title>
            <van-icon :name="getCategoryIcon(category.id)" />
            <span>{{ category.name }}</span>
          </template>
        </van-tab>
      </van-tabs>
    </div>

    <van-cell-group v-if="hotPosts.length > 0" title="🔥 热门话题" class="hot-topics">
      <van-cell
        v-for="post in hotPosts"
        :key="post.id"
        :title="post.title"
        :value="`${post.views}浏览`"
        is-link
        @click="viewPost(post)"
      >
        <template #icon>
          <van-tag type="danger" size="mini">{{ post.rank }}</van-tag>
        </template>
      </van-cell>
    </van-cell-group>

    <van-cell-group class="post-list">
      <template #title>
        <div class="list-header">
          <span>{{ getCurrentCategoryName() }}</span>
          <div class="sort-options">
            <van-button
              size="mini"
              :type="sortBy === 'latest' ? 'primary' : 'default'"
              @click="setSortBy('latest')"
            >
              最新
            </van-button>
            <van-button
              size="mini"
              :type="sortBy === 'hot' ? 'primary' : 'default'"
              @click="setSortBy('hot')"
            >
              最热
            </van-button>
          </div>
        </div>
      </template>

      <van-card
        v-for="post in filteredPosts"
        :key="post.id"
        :title="post.title"
        :desc="post.content.substring(0, 100) + '...'"
        :thumb="post.images?.[0]"
        @click="viewPost(post)"
      >
        <template #tags>
          <van-tag :type="getCategoryTagType(post.category)">
            {{ getCategoryName(post.category) }}
          </van-tag>
        </template>

        <template #footer>
          <div class="post-meta">
            <div class="user-info">
              <van-icon name="user-circle-o" />
              <span>{{ post.author }}</span>
              <span class="post-time">{{ formatTime(post.createTime) }}</span>
            </div>
            <div class="post-stats">
              <span class="stat-item">
                <van-icon name="like-o" />
                {{ post.likes }}
              </span>
              <span class="stat-item">
                <van-icon name="chat-o" />
                {{ post.comments.length }}
              </span>
              <span class="stat-item">
                <van-icon name="eye-o" />
                {{ post.views }}
              </span>
            </div>
          </div>
        </template>
      </van-card>
    </van-cell-group>

    <!-- 发帖弹窗 -->
    <van-popup v-model:show="showPostDialog" position="bottom" round closeable>
      <div class="post-form">
        <van-nav-bar title="发布新帖" @click-left="showPostDialog = false">
          <template #left>
            <van-icon name="cross" />
          </template>
        </van-nav-bar>

        <van-form @submit="submitPost">
          <van-cell-group>
            <van-field
              v-model="newPost.title"
              name="title"
              label="标题"
              placeholder="请输入帖子标题"
              required
              :rules="[{ required: true, message: '请输入标题' }]"
            />

            <van-field
              name="category"
              label="分类"
              placeholder="请选择分类"
              readonly
              is-link
              :value="getCategoryName(newPost.category)"
              @click="showCategoryPicker = true"
              required
              :rules="[{ required: true, message: '请选择分类' }]"
            />

            <van-field
              v-model="newPost.content"
              name="content"
              label="内容"
              type="textarea"
              placeholder="请输入帖子内容"
              rows="6"
              maxlength="500"
              show-word-limit
              required
              :rules="[{ required: true, message: '请输入内容' }]"
            />
          </van-cell-group>

          <div class="form-actions">
            <van-button block @click="showPostDialog = false">取消</van-button>
            <van-button block type="primary" native-type="submit">发布</van-button>
          </div>
        </van-form>
      </div>
    </van-popup>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
        title="选择分类"
      />
    </van-popup>

    <router-view />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forum'
import { showToast } from 'vant'

const router = useRouter()
const forumStore = useForumStore()

const activeCategory = ref('all')
const sortBy = ref('latest')
const showPostDialog = ref(false)
const showCategoryPicker = ref(false)

const newPost = ref({
  title: '',
  content: '',
  category: 'academic',
})

const categories = computed(() => [
  { id: 'all', name: '全部', icon: 'notes-o' },
  ...forumStore.categories,
])

const categoryOptions = computed(() =>
  forumStore.categories.map((cat) => ({ text: cat.name, value: cat.id })),
)

const hotPosts = computed(() => {
  return forumStore.posts
    .filter((post) => post.views > 100)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)
    .map((post, index) => ({ ...post, rank: index + 1 }))
})

const filteredPosts = computed(() => {
  let posts = forumStore.posts

  if (activeCategory.value !== 'all') {
    posts = forumStore.getPostsByCategory(activeCategory.value)
  }

  if (sortBy.value === 'hot') {
    posts = [...posts].sort((a, b) => b.likes + b.views - (a.likes + a.views))
  } else {
    posts = [...posts].sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
  }

  return posts
})

function goBack() {
  router.push('/')
}

function setActiveCategory(categoryId) {
  activeCategory.value = categoryId
}

function setSortBy(sort) {
  sortBy.value = sort
}

function getCurrentCategoryName() {
  const category = categories.value.find((c) => c.id === activeCategory.value)
  return category ? category.name : '全部'
}

function getCategoryName(categoryId) {
  const category = forumStore.categories.find((c) => c.id === categoryId)
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

function formatTime(time) {
  const now = new Date()
  const postTime = new Date(time)
  const diff = now - postTime
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  return `${Math.floor(hours / 24)}天前`
}

function viewPost(post) {
  forumStore.setCurrentPost(post)
  router.push(`/forum/${post.id}`)
}

function onCategoryConfirm({ selectedOptions }) {
  newPost.value.category = selectedOptions[0].value
  showCategoryPicker.value = false
}

function submitPost() {
  if (!newPost.value.title || !newPost.value.content) {
    showToast('请填写完整信息')
    return
  }

  forumStore.addPost({
    title: newPost.value.title,
    content: newPost.value.content,
    category: newPost.value.category,
    author: '当前用户', // 实际应该从用户store获取
  })

  // 重置表单
  newPost.value = {
    title: '',
    content: '',
    category: 'academic',
  }
  showPostDialog.value = false
  showToast('发布成功')
}

onMounted(() => {
  // 初始化论坛数据
  if (forumStore.posts.length === 0) {
    // 添加一些示例帖子
    forumStore.addPost({
      title: '求助：高等数学期末复习资料',
      content: '马上期末考试了，有没有学长学姐分享一下高数的复习资料和经验？',
      category: 'academic',
      author: '数学小白',
      views: 156,
      likes: 23,
    })

    forumStore.addPost({
      title: '出售：二手自行车，9成新',
      content: '因为即将毕业，出售自行车一辆，捷安特品牌，9成新，价格200元',
      category: 'life',
      author: '即将毕业的学长',
      views: 89,
      likes: 12,
    })

    forumStore.addPost({
      title: '校园招聘会信息汇总',
      content: '整理了下个月的各大公司校园招聘信息，需要的同学可以参考',
      category: 'campus',
      author: '就业指导老师',
      views: 234,
      likes: 45,
    })
  }
})
</script>

<style scoped>
.forum-home {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.forum-nav {
  background: white;
  margin-bottom: 16px;
}

.hot-topics {
  margin: 16px;
}

.post-list {
  margin: 16px;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.sort-options {
  display: flex;
  gap: 8px;
}

.sort-options .van-button {
  padding: 4px 12px;
  font-size: 12px;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: #646566;
}

.post-time {
  font-size: 12px;
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

.post-form {
  background: white;
  border-radius: 16px 16px 0 0;
  min-height: 400px;
}

.form-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
}

/* Vant组件样式覆写 */
:deep(.van-tabs__wrap) {
  padding: 0 16px;
}

:deep(.van-tab) {
  padding: 8px 12px;
}

:deep(.van-cell-group__title) {
  padding: 16px;
  font-weight: 600;
  color: #323233;
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

:deep(.van-popup) {
  max-height: 80vh;
}

:deep(.van-popup .van-nav-bar) {
  background: #f7f8fa;
}

:deep(.van-field__label) {
  font-weight: 500;
}

@media (max-width: 768px) {
  .list-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .post-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .form-actions {
    flex-direction: column;
  }
}
</style>
