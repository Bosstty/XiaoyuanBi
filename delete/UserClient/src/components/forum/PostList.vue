<template>
  <div class="post-list">
    <van-empty v-if="posts.length === 0 && !loading" :description="emptyText" />

    <van-list
      v-else
      loading="loading"
      :finished="!showLoadMore"
      finished-text="没有更多了"
      @load="$emit('load-more')"
      class="posts-container"
    >
      <van-cell
        v-for="post in posts"
        :key="post.id"
        class="post-item"
        @click="$emit('post-click', post)"
      >
        <template #title>
          <div class="post-header">
            <div class="author-info">
              <van-image
                :src="post.author?.avatar"
                width="40"
                height="40"
                round
                fit="cover"
                :alt="post.author?.username"
              >
                <template #error>
                  <div class="avatar-fallback">
                    {{ post.author?.username?.charAt(0) || '?' }}
                  </div>
                </template>
              </van-image>
              <div class="author-details">
                <div class="author-name">{{ post.author?.real_name || post.author?.username }}</div>
                <div class="post-time">{{ formatTime(post.created_at) }}</div>
              </div>
            </div>
            <div class="post-category">
              <van-tag v-if="post.category" :type="getCategoryTagType(post.category)" size="small">
                {{ getCategoryText(post.category) }}
              </van-tag>
            </div>
          </div>
        </template>

        <template #label>
          <div class="post-content">
            <h3 class="post-title">{{ post.title }}</h3>
            <div class="post-excerpt">
              {{ post.excerpt || post.content?.substring(0, 150) + '...' }}
            </div>

            <div v-if="post.images && post.images.length" class="post-images">
              <van-image
                v-for="(image, index) in post.images.slice(0, 3)"
                :key="index"
                :src="image"
                width="80"
                height="80"
                fit="cover"
                class="post-image"
                @click.stop="previewImages(post.images, index)"
              />
              <div
                v-if="post.images.length > 3"
                class="more-images"
                @click.stop="previewImages(post.images, 2)"
              >
                +{{ post.images.length - 3 }}
              </div>
            </div>

            <div class="post-footer">
              <div class="post-stats">
                <span class="stat-item">
                  <van-icon name="eye-o" />
                  {{ post.view_count || 0 }}
                </span>
                <span class="stat-item">
                  <van-icon name="chat-o" />
                  {{ post.comment_count || 0 }}
                </span>
                <span class="stat-item">
                  <van-icon name="star-o" />
                  {{ post.like_count || 0 }}
                </span>
              </div>

              <div class="post-actions" @click.stop>
                <van-button
                  type="primary"
                  size="mini"
                  :plain="!post.is_liked"
                  @click="handleLike(post)"
                >
                  <van-icon name="star-o" />
                  {{ post.is_liked ? '已赞' : '点赞' }}
                </van-button>
                <van-button type="primary" size="mini" plain @click="handleComment(post)">
                  <van-icon name="chat-o" />
                  评论
                </van-button>
                <van-popover v-if="showMoreActions" placement="bottom-end" theme="dark">
                  <template #reference>
                    <van-button type="primary" size="mini" plain>
                      <van-icon name="ellipsis" />
                      更多
                    </van-button>
                  </template>
                  <van-cell-group>
                    <van-cell title="分享" clickable @click="handleMore(post, 'share')" />
                    <van-cell title="举报" clickable @click="handleMore(post, 'report')" />
                  </van-cell-group>
                </van-popover>
              </div>
            </div>
          </div>
        </template>
      </van-cell>
    </van-list>
  </div>
</template>

<script setup>
import { ImagePreview } from 'vant'

defineProps({
  posts: {
    type: Array,
    default: () => [],
  },
  loading: {
    type: Boolean,
    default: false,
  },
  loadingMore: {
    type: Boolean,
    default: false,
  },
  emptyText: {
    type: String,
    default: '暂无帖子',
  },
  showLoadMore: {
    type: Boolean,
    default: false,
  },
  showMoreActions: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['post-click', 'like', 'comment', 'more', 'load-more'])

const getCategoryText = (category) => {
  const categoryMap = {
    academic: '学术交流',
    life: '生活服务',
    campus: '校园动态',
    task: '任务交流',
    skill: '技能分享',
    news: '校园新闻',
    activity: '活动通知',
    club: '社团动态',
    lecture: '学术讲座',
    secondhand: '二手交易',
    'lost-found': '失物招领',
    sharing: '生活分享',
    help: '互助求助',
    paper: '论文讨论',
    resource: '学术资源',
    research: '研究分享',
    qa: '问答互助',
  }
  return categoryMap[category] || category
}

const getCategoryTagType = (category) => {
  const typeMap = {
    academic: 'primary',
    life: 'success',
    campus: 'warning',
    task: 'primary',
    skill: 'danger',
    news: 'primary',
    activity: 'warning',
    club: 'success',
    lecture: 'primary',
    secondhand: 'success',
    'lost-found': 'warning',
    sharing: 'primary',
    help: 'danger',
    paper: 'primary',
    resource: 'primary',
    research: 'success',
    qa: 'warning',
  }
  return typeMap[category] || 'primary'
}

const formatTime = (time) => {
  if (!time) return ''
  const now = new Date()
  const postTime = new Date(time)
  const diff = now - postTime
  const hours = Math.floor(diff / (1000 * 60 * 60))

  if (hours < 1) return '刚刚'
  if (hours < 24) return `${hours}小时前`
  if (hours < 24 * 7) return `${Math.floor(hours / 24)}天前`
  return postTime.toLocaleDateString('zh-CN')
}

const previewImages = (images, startIndex = 0) => {
  ImagePreview({
    images,
    startPosition: startIndex,
    closeable: true,
  })
}

const handleLike = (post) => {
  emit('like', post)
}

const handleComment = (post) => {
  emit('comment', post)
}

const handleMore = (post, action = null) => {
  emit('more', { post, action })
}
</script>

<style scoped>
.post-list {
  width: 100%;
  background: #f7f8fa;
}

.posts-container {
  background: #f7f8fa;
}

.post-item {
  margin-bottom: 8px;
  background: white;
  border-radius: 8px;
  transition: all 0.3s;
}

.post-item:active {
  transform: scale(0.98);
}

.post-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar-fallback {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: #667eea;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.author-details {
  display: flex;
  flex-direction: column;
}

.author-name {
  font-weight: 500;
  color: #323233;
  font-size: 14px;
  margin-bottom: 2px;
}

.post-time {
  font-size: 11px;
  color: #c8c9cc;
}

.post-content {
  width: 100%;
}

.post-title {
  margin: 0 0 8px 0;
  font-size: 15px;
  font-weight: 600;
  color: #323233;
  line-height: 1.4;
}

.post-excerpt {
  color: #969799;
  line-height: 1.5;
  font-size: 13px;
  margin-bottom: 8px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.post-images {
  display: flex;
  gap: 8px;
  margin: 8px 0;
  position: relative;
}

.post-image {
  border-radius: 4px;
  flex-shrink: 0;
}

.more-images {
  position: absolute;
  top: 0;
  right: 0;
  width: 80px;
  height: 80px;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.post-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f0f0f0;
}

.post-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c8c9cc;
  font-size: 12px;
}

.post-actions {
  display: flex;
  gap: 8px;
}

:deep(.van-cell) {
  padding: 16px;
}

:deep(.van-cell__title) {
  width: 100%;
}

:deep(.van-cell__label) {
  width: 100%;
  margin-top: 8px;
}

:deep(.van-list) {
  background: #f7f8fa;
}

:deep(.van-button--mini) {
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
}

:deep(.van-icon) {
  font-size: 12px;
}

:deep(.van-tag) {
  margin: 0;
}

:deep(.van-image) {
  background: #f7f8fa;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .post-images {
    gap: 6px;
  }

  .post-image {
    width: 70px !important;
    height: 70px !important;
  }

  .more-images {
    width: 70px;
    height: 70px;
    font-size: 11px;
  }

  .post-stats {
    gap: 12px;
  }

  .stat-item {
    font-size: 11px;
  }

  .post-actions {
    gap: 6px;
  }

  :deep(.van-button--mini) {
    height: 22px;
    padding: 0 6px;
    font-size: 10px;
  }
}
</style>
