<template>
  <div class="campus-forum">
    <van-nav-bar title="校园动态" left-arrow @click-left="goBack">
      <template #right>
        <van-button type="primary" size="small" @click="quickPost">
          <van-icon name="plus" />
          发布动态
        </van-button>
      </template>
    </van-nav-bar>

    <div class="forum-header">
      <p>校园新闻、活动通知、社团动态</p>
    </div>

    <div class="forum-content">
      <!-- 校园热点 -->
      <div class="forum-layout">
        <div class="main-content">
          <!-- 轮播新闻 -->
          <van-cell-group class="news-carousel-card">
            <van-swipe height="200px" indicator-color="white">
              <van-swipe-item v-for="news in featuredNews" :key="news.id">
                <div class="carousel-item" @click="goToPost(news.id)">
                  <div class="carousel-bg" :style="{ backgroundImage: `url(${news.cover})` }">
                    <div class="carousel-overlay">
                      <h3>{{ news.title }}</h3>
                      <p>{{ news.summary }}</p>
                    </div>
                  </div>
                </div>
              </van-swipe-item>
            </van-swipe>
          </van-cell-group>

          <!-- 分类导航 -->
          <van-cell-group class="category-nav-card">
            <div class="category-tabs">
              <van-tabs v-model:active="activeTab" @change="handleTabChange">
                <van-tab title="全部动态" name="all">
                  <div class="tab-content">
                    <div class="sort-controls">
                      <van-button-group>
                        <van-button
                          :type="sortBy === 'created_at' ? 'primary' : 'default'"
                          size="small"
                          @click="setSortBy('created_at')"
                        >
                          最新发布
                        </van-button>
                        <van-button
                          :type="sortBy === 'view_count' ? 'primary' : 'default'"
                          size="small"
                          @click="setSortBy('view_count')"
                        >
                          最多浏览
                        </van-button>
                        <van-button
                          :type="sortBy === 'comment_count' ? 'primary' : 'default'"
                          size="small"
                          @click="setSortBy('comment_count')"
                        >
                          最多评论
                        </van-button>
                      </van-button-group>
                    </div>
                    <PostList :posts="posts" :loading="loading" />
                  </div>
                </van-tab>
                <van-tab title="校园新闻" name="news">
                  <PostList :posts="posts" :loading="loading" />
                </van-tab>
                <van-tab title="活动通知" name="activity">
                  <PostList :posts="posts" :loading="loading" />
                </van-tab>
                <van-tab title="社团动态" name="club">
                  <PostList :posts="posts" :loading="loading" />
                </van-tab>
                <van-tab title="学术讲座" name="lecture">
                  <PostList :posts="posts" :loading="loading" />
                </van-tab>
              </van-tabs>
            </div>
          </van-cell-group>
        </div>

        <div class="sidebar">
          <!-- 校历 -->
          <van-cell-group class="calendar-card">
            <template #title>
              <h3>校园日历</h3>
            </template>
            <van-calendar
              v-model="calendarValue"
              :poppable="false"
              :show-mark="false"
              :show-subtitle="false"
              :show-confirm="false"
            >
              <template #day="dayInfo">
                <div class="calendar-cell">
                  <span>{{ dayInfo.date.getDate() }}</span>
                  <div v-if="getEventsForDate(dayInfo.date).length" class="event-indicator">
                    <van-badge :content="getEventsForDate(dayInfo.date).length" />
                  </div>
                </div>
              </template>
            </van-calendar>
          </van-cell-group>

          <!-- 近期活动 -->
          <van-cell-group class="upcoming-events-card">
            <template #title>
              <div class="card-header">
                <h3>近期活动</h3>
                <van-button type="primary" size="mini" plain @click="viewAllEvents">查看全部</van-button>
              </div>
            </template>
            <van-steps direction="vertical" :active="-1">
              <van-step
                v-for="event in upcomingEvents"
                :key="event.id"
              >
                <template #active-icon>
                  <van-icon name="calendar-o" />
                </template>
                <template #inactive-icon>
                  <van-icon name="calendar-o" />
                </template>
                <div class="event-item" @click="goToEvent(event.id)">
                  <div class="event-title">{{ event.title }}</div>
                  <div class="event-time">{{ formatEventDate(event.date) }}</div>
                  <div class="event-location">📍 {{ event.location }}</div>
                  <div class="event-organizer">主办：{{ event.organizer }}</div>
                </div>
              </van-step>
            </van-steps>
          </van-cell-group>

          <!-- 公告栏 -->
          <van-cell-group class="announcement-card">
            <template #title>
              <h3>校园公告</h3>
            </template>
            <van-cell
              v-for="announcement in announcements"
              :key="announcement.id"
              :title="announcement.title"
              is-link
              @click="viewAnnouncement(announcement.id)"
            >
              <template #label>
                <div class="announcement-meta">
                  <span>{{ announcement.department }}</span>
                  <span>{{ formatDate(announcement.created_at) }}</span>
                </div>
              </template>
            </van-cell>
          </van-cell-group>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <van-pagination
          v-if="total > 0"
          v-model="currentPage"
          :total-items="total"
          :items-per-page="pageSize"
          mode="simple"
          @change="handlePageChange"
        />
      </div>
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
const featuredNews = ref([])
const upcomingEvents = ref([])
const announcements = ref([])
const calendarValue = ref(new Date())
const calendarEvents = ref([])

const activeTab = ref('all')
const sortBy = ref('created_at')

// 分页
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)

// 方法
const goBack = () => {
  router.push('/forum')
}

const quickPost = () => {
  router.push('/forum/post?category=campus')
}

const loadPosts = async () => {
  loading.value = true
  try {
    const params = {
      category: 'campus',
      page: currentPage.value,
      limit: pageSize.value,
      sort: sortBy.value,
    }

    if (activeTab.value !== 'all') {
      params.sub_category = activeTab.value
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

const setSortBy = (sort) => {
  sortBy.value = sort
  loadPosts()
}

const handleTabChange = (tab) => {
  activeTab.value = tab
  currentPage.value = 1
  loadPosts()
}

const handlePageChange = (page) => {
  currentPage.value = page
  loadPosts()
}

const goToPost = (id) => {
  router.push(`/forum/${id}`)
}

const goToEvent = (id) => {
  // 跳转到活动详情页
  router.push(`/events/${id}`)
}

const viewAnnouncement = (id) => {
  // 查看公告详情
  router.push(`/announcements/${id}`)
}

const viewAllEvents = () => {
  router.push('/events')
}

const getEventsForDate = (date) => {
  const dateStr = date.toISOString().split('T')[0]
  return calendarEvents.value.filter((event) => event.date.startsWith(dateStr))
}

const getEventType = (type) => {
  const typeMap = {
    lecture: 'primary',
    activity: 'success',
    competition: 'warning',
    meeting: 'info',
  }
  return typeMap[type] || 'primary'
}

const formatEventDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
  })
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载轮播新闻
const loadFeaturedNews = () => {
  featuredNews.value = [
    {
      id: 1,
      title: '2024年春季招聘会圆满举办',
      summary: '超过200家企业参展，为学生提供丰富就业机会',
      cover: 'https://via.placeholder.com/600x200/4A90E2/FFFFFF?text=招聘会',
    },
    {
      id: 2,
      title: '图书馆新增电子资源数据库',
      summary: '新增多个学术数据库，为学术研究提供更多支持',
      cover: 'https://via.placeholder.com/600x200/7ED321/FFFFFF?text=图书馆',
    },
    {
      id: 3,
      title: '校园文化节精彩纷呈',
      summary: '各院系展示特色文化，丰富校园文化生活',
      cover: 'https://via.placeholder.com/600x200/F5A623/FFFFFF?text=文化节',
    },
  ]
}

// 加载近期活动
const loadUpcomingEvents = () => {
  upcomingEvents.value = [
    {
      id: 1,
      title: '计算机学院学术讲座',
      date: new Date(Date.now() + 86400000).toISOString(),
      location: '学术报告厅',
      organizer: '计算机学院',
      type: 'lecture',
    },
    {
      id: 2,
      title: '校园马拉松比赛',
      date: new Date(Date.now() + 172800000).toISOString(),
      location: '校园环路',
      organizer: '体育部',
      type: 'activity',
    },
    {
      id: 3,
      title: '社团招新宣讲会',
      date: new Date(Date.now() + 259200000).toISOString(),
      location: '学生活动中心',
      organizer: '学生会',
      type: 'activity',
    },
  ]
}

// 加载公告
const loadAnnouncements = () => {
  announcements.value = [
    {
      id: 1,
      title: '关于期末考试安排的通知',
      department: '教务处',
      created_at: new Date(Date.now() - 86400000),
    },
    {
      id: 2,
      title: '校园网络维护通知',
      department: '信息中心',
      created_at: new Date(Date.now() - 172800000),
    },
    {
      id: 3,
      title: '食堂营业时间调整',
      department: '后勤处',
      created_at: new Date(Date.now() - 259200000),
    },
  ]
}

// 加载日历事件
const loadCalendarEvents = () => {
  const today = new Date()
  calendarEvents.value = [
    {
      date: today.toISOString().split('T')[0],
      title: '学术讲座',
      type: 'lecture',
    },
    {
      date: new Date(today.getTime() + 86400000).toISOString().split('T')[0],
      title: '社团活动',
      type: 'activity',
    },
  ]
}

// 生命周期
onMounted(() => {
  loadPosts()
  loadFeaturedNews()
  loadUpcomingEvents()
  loadAnnouncements()
  loadCalendarEvents()
})
</script>

<style scoped>
.campus-forum {
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

.forum-layout {
  display: flex;
  gap: 16px;
}

.main-content {
  flex: 2;
  min-width: 0;
}

.sidebar {
  flex: 1;
  min-width: 280px;
}

/* 轮播新闻 */
.news-carousel-card {
  margin-bottom: 16px;
  border-radius: 8px;
  overflow: hidden;
}

.carousel-item {
  height: 200px;
  cursor: pointer;
}

.carousel-bg {
  height: 100%;
  background-size: cover;
  background-position: center;
  position: relative;
  border-radius: 4px;
}

.carousel-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.7));
  color: white;
  padding: 20px;
}

.carousel-overlay h3 {
  margin: 0 0 8px 0;
  font-size: 1.2rem;
}

.carousel-overlay p {
  margin: 0;
  opacity: 0.9;
}

/* 分类导航 */
.category-nav-card {
  margin-bottom: 16px;
}

.sort-controls {
  padding: 16px;
  background: #f7f8fa;
}

/* 侧边栏 */
.calendar-card,
.upcoming-events-card,
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

.calendar-cell {
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
}

.event-indicator {
  position: absolute;
  top: 2px;
  right: 2px;
}

.event-item {
  cursor: pointer;
  padding: 8px 0;
  border-radius: 4px;
  transition: background 0.3s;
}

.event-item:hover {
  background: #f5f7fa;
}

.event-title {
  font-weight: 500;
  margin-bottom: 4px;
  font-size: 14px;
}

.event-time {
  color: #969799;
  font-size: 12px;
  margin-bottom: 4px;
}

.event-location,
.event-organizer {
  font-size: 12px;
  color: #646566;
  margin-bottom: 2px;
}

.announcement-meta {
  font-size: 12px;
  color: #969799;
  display: flex;
  justify-content: space-between;
  margin-top: 4px;
}

.pagination-container {
  padding: 16px;
  text-align: center;
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

:deep(.van-nav-bar__title) {
  color: #323233;
  font-weight: 600;
}

:deep(.van-swipe) {
  border-radius: 8px;
  overflow: hidden;
}

:deep(.van-tabs__wrap) {
  background: white;
}

:deep(.van-tabs__nav) {
  background: white;
}

:deep(.van-tab) {
  color: #646566;
}

:deep(.van-tab--active) {
  color: #1989fa;
}

:deep(.van-button-group) {
  border-radius: 4px;
  overflow: hidden;
}

:deep(.van-calendar) {
  border-radius: 8px;
}

:deep(.van-steps--vertical) {
  padding: 16px 0;
}

:deep(.van-step__circle) {
  background: #1989fa;
  color: white;
}

:deep(.van-cell) {
  padding: 12px 16px;
}

:deep(.van-cell__title) {
  font-size: 14px;
  font-weight: 500;
}

:deep(.van-cell__label) {
  margin-top: 4px;
}

:deep(.van-pagination) {
  justify-content: center;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .forum-layout {
    flex-direction: column;
  }

  .sidebar {
    min-width: auto;
  }

  .forum-content {
    padding: 8px;
  }

  .sort-controls {
    padding: 8px;
  }

  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }

  .announcement-meta {
    flex-direction: column;
    gap: 4px;
  }
}
</style>
