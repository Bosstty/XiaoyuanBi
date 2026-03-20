<template>
  <div class="post-detail">
    <van-nav-bar title="帖子详情" left-arrow @click-left="goBack" />

    <!-- 帖子内容 -->
    <van-loading v-if="loading" class="loading-container" vertical> 加载中... </van-loading>

    <div v-else-if="post" class="post-content">
      <!-- 帖子头部 -->
      <van-cell-group class="post-header">
        <van-cell>
          <template #title>
            <div class="header-content">
              <van-tag :type="getCategoryType(post.category)">
                {{ post.category }}
              </van-tag>
              <h1 class="post-title">{{ post.title }}</h1>
            </div>
          </template>

          <template #value>
            <div class="post-meta">
              <div class="author-info">
                <van-image
                  v-if="post.author.avatar"
                  :src="post.author.avatar"
                  width="40"
                  height="40"
                  round
                />
                <van-icon v-else name="user-circle-o" size="40" />
                <div class="author-detail">
                  <div class="author-name">{{ post.author.nickname }}</div>
                  <div class="post-time">{{ formatTime(post.createdAt) }}</div>
                </div>
              </div>

              <div class="post-stats">
                <span class="stat-item">
                  <van-icon name="eye-o" />
                  {{ post.viewCount }}
                </span>
                <span class="stat-item">
                  <van-icon name="chat-o" />
                  {{ post.commentCount }}
                </span>
                <span class="stat-item">
                  <van-icon name="like-o" />
                  {{ post.likeCount }}
                </span>
              </div>
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 帖子正文 -->
      <van-cell-group class="post-body">
        <van-cell>
          <template #title>
            <div v-html="post.content" class="content-html"></div>

            <!-- 图片展示 -->
            <div v-if="post.images && post.images.length" class="post-images">
              <van-image
                v-for="(image, index) in post.images"
                :key="index"
                :src="image"
                :alt="`图片${index + 1}`"
                width="100"
                height="100"
                fit="cover"
                @click="previewImage(index)"
              />
            </div>
          </template>
        </van-cell>
      </van-cell-group>

      <!-- 操作按钮 -->
      <div class="post-actions">
        <van-button
          @click="toggleLike"
          :type="post.isLiked ? 'primary' : 'default'"
          :loading="likeLoading"
          size="large"
        >
          <van-icon name="like-o" />
          {{ post.isLiked ? '已点赞' : '点赞' }}
          ({{ post.likeCount }})
        </van-button>

        <van-button @click="showCommentForm = !showCommentForm" size="large">
          <van-icon name="chat-o" />
          评论
        </van-button>

        <van-button @click="sharePost" size="large">
          <van-icon name="share-o" />
          分享
        </van-button>
      </div>
    </div>

    <!-- 评论区 -->
    <van-cell-group v-if="post" class="comment-section">
      <template #title>
        <h3>评论 ({{ comments.length }})</h3>
      </template>

      <!-- 发表评论 -->
      <van-collapse-item v-if="showCommentForm" name="comment-form">
        <template #title>发表评论</template>
        <van-form @submit="submitComment">
          <van-field
            v-model="commentForm.content"
            name="content"
            type="textarea"
            rows="3"
            placeholder="写下你的评论..."
            maxlength="500"
            show-word-limit
            required
            :rules="[{ required: true, message: '请输入评论内容' }]"
          />
          <div class="comment-actions">
            <van-button @click="showCommentForm = false">取消</van-button>
            <van-button
              type="primary"
              native-type="submit"
              :loading="commentLoading"
              :disabled="!commentForm.content.trim()"
            >
              发表评论
            </van-button>
          </div>
        </van-form>
      </van-collapse-item>

      <!-- 评论列表 -->
      <div class="comment-list">
        <van-loading
          v-if="commentLoading && comments.length === 0"
          class="loading-container"
          vertical
        >
          加载评论中...
        </van-loading>

        <van-empty v-else-if="comments.length === 0" description="暂无评论，来抢沙发吧~">
          <template #image>
            <van-icon name="chat-o" size="64" color="#dcdee0" />
          </template>
        </van-empty>

        <div v-else>
          <van-cell v-for="comment in comments" :key="comment.id" class="comment-item">
            <template #icon>
              <van-image
                v-if="comment.author.avatar"
                :src="comment.author.avatar"
                width="32"
                height="32"
                round
              />
              <van-icon v-else name="user-circle-o" size="32" />
            </template>

            <template #title>
              <div class="comment-content">
                <div class="comment-header">
                  <span class="comment-author">{{ comment.author.nickname }}</span>
                  <span class="comment-time">{{ formatTime(comment.createdAt) }}</span>
                </div>

                <div class="comment-text">{{ comment.content }}</div>

                <!-- 回复 -->
                <div v-if="comment.replies && comment.replies.length" class="replies">
                  <van-cell
                    v-for="reply in comment.replies"
                    :key="reply.id"
                    class="reply-item"
                    size="small"
                  >
                    <template #icon>
                      <van-image
                        v-if="reply.author.avatar"
                        :src="reply.author.avatar"
                        width="24"
                        height="24"
                        round
                      />
                      <van-icon v-else name="user-circle-o" size="24" />
                    </template>

                    <template #title>
                      <div class="reply-content">
                        <span class="reply-author">{{ reply.author.nickname }}</span>
                        <span class="reply-to" v-if="reply.replyTo">
                          回复 {{ reply.replyTo.nickname }}
                        </span>
                        <span class="reply-text">: {{ reply.content }}</span>
                        <span class="reply-time">{{ formatTime(reply.createdAt) }}</span>
                      </div>
                    </template>
                  </van-cell>
                </div>

                <div class="comment-actions">
                  <van-button type="primary" size="mini" plain @click="showReplyForm(comment.id)">
                    回复
                  </van-button>

                  <van-button
                    size="mini"
                    plain
                    @click="likeComment(comment.id)"
                    :class="{ liked: comment.isLiked }"
                  >
                    <van-icon name="like-o" />
                    {{ comment.likeCount || 0 }}
                  </van-button>
                </div>

                <!-- 回复表单 -->
                <van-collapse-item
                  v-if="replyingTo === comment.id"
                  name="reply-form"
                  class="reply-form"
                >
                  <van-field
                    v-model="replyForm.content"
                    placeholder="写下你的回复..."
                    maxlength="300"
                    show-word-limit
                  />
                  <div class="reply-actions">
                    <van-button size="small" @click="cancelReply">取消</van-button>
                    <van-button
                      size="small"
                      type="primary"
                      @click="submitReply(comment.id)"
                      :loading="replyLoading"
                      :disabled="!replyForm.content.trim()"
                    >
                      回复
                    </van-button>
                  </div>
                </van-collapse-item>
              </div>
            </template>
          </van-cell>
        </div>
      </div>

      <!-- 加载更多 -->
      <div v-if="hasMoreComments" class="load-more">
        <van-button @click="loadMoreComments" :loading="loadingMore" block>
          加载更多评论
        </van-button>
      </div>
    </van-cell-group>

    <!-- 图片预览 -->
    <van-image-preview
      v-model:show="showImagePreview"
      :images="post?.images || []"
      :start-position="currentImageIndex"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast, showConfirmDialog } from 'vant'
import { forumAPI } from '@/utils/api'

const route = useRoute()
const router = useRouter()

// 响应式数据
const loading = ref(true)
const post = ref(null)
const comments = ref([])
const commentLoading = ref(false)
const likeLoading = ref(false)
const replyLoading = ref(false)
const loadingMore = ref(false)
const showCommentForm = ref(false)
const replyingTo = ref(null)
const hasMoreComments = ref(false)
const commentPage = ref(1)
const showImagePreview = ref(false)
const currentImageIndex = ref(0)

// 表单数据
const commentForm = reactive({
  content: '',
})

const replyForm = reactive({
  content: '',
})

// 计算属性
const postId = computed(() => route.params.id)

// 方法
const goBack = () => {
  router.go(-1)
}

const getCategoryType = (category) => {
  const types = {
    学术交流: 'primary',
    生活服务: 'success',
    校园动态: 'warning',
    任务交流: 'default',
    技能分享: 'danger',
  }
  return types[category] || 'default'
}

const formatTime = (time) => {
  const date = new Date(time)
  const now = new Date()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`

  return date.toLocaleDateString('zh-CN')
}

const previewImage = (index) => {
  currentImageIndex.value = index
  showImagePreview.value = true
}

const loadPost = async () => {
  try {
    loading.value = true
    const response = await forumAPI.getPostById(postId.value)
    post.value = response.data
  } catch (error) {
    showToast('加载帖子失败: ' + error.message)
  } finally {
    loading.value = false
  }
}

const loadComments = async (page = 1) => {
  try {
    commentLoading.value = page === 1
    loadingMore.value = page > 1

    const response = await forumAPI.getComments(postId.value, {
      page,
      limit: 10,
    })

    if (page === 1) {
      comments.value = response.data.comments
    } else {
      comments.value.push(...response.data.comments)
    }

    hasMoreComments.value = response.data.hasMore
    commentPage.value = page
  } catch (error) {
    showToast('加载评论失败: ' + error.message)
  } finally {
    commentLoading.value = false
    loadingMore.value = false
  }
}

const toggleLike = async () => {
  try {
    likeLoading.value = true
    await forumAPI.likePost(postId.value)

    post.value.isLiked = !post.value.isLiked
    post.value.likeCount += post.value.isLiked ? 1 : -1

    showToast(post.value.isLiked ? '点赞成功' : '取消点赞')
  } catch (error) {
    showToast('操作失败: ' + error.message)
  } finally {
    likeLoading.value = false
  }
}

const submitComment = async () => {
  if (!commentForm.content.trim()) {
    showToast('请输入评论内容')
    return
  }

  try {
    commentLoading.value = true
    const response = await forumAPI.createComment(postId.value, commentForm)

    comments.value.unshift(response.data)
    post.value.commentCount++
    commentForm.content = ''
    showCommentForm.value = false

    showToast('评论发表成功')
  } catch (error) {
    showToast('评论发表失败: ' + error.message)
  } finally {
    commentLoading.value = false
  }
}

const showReplyForm = (commentId) => {
  replyingTo.value = commentId
  replyForm.content = ''
}

const cancelReply = () => {
  replyingTo.value = null
  replyForm.content = ''
}

const submitReply = async (commentId) => {
  if (!replyForm.content.trim()) {
    showToast('请输入回复内容')
    return
  }

  try {
    replyLoading.value = true
    const response = await forumAPI.createComment(postId.value, {
      content: replyForm.content,
      parentId: commentId,
    })

    // 找到对应评论并添加回复
    const comment = comments.value.find((c) => c.id === commentId)
    if (comment) {
      if (!comment.replies) comment.replies = []
      comment.replies.push(response.data)
    }
    replyForm.content = ''
    replyingTo.value = null
    showToast('回复成功')
  } catch (error) {
    console.log(error)
    showToast('回复失败: ' + error.message)
  } finally {
    replyLoading.value = false
  }
}

const likeComment = async (commentId) => {
  try {
    await forumAPI.likeComment(commentId)

    const comment = comments.value.find((c) => c.id === commentId)
    if (comment) {
      comment.isLiked = !comment.isLiked
      comment.likeCount = (comment.likeCount || 0) + (comment.isLiked ? 1 : -1)
    }
  } catch (error) {
    showToast('操作失败: ' + error.message)
  }
}

const loadMoreComments = () => {
  loadComments(commentPage.value + 1)
}

const sharePost = async () => {
  try {
    await navigator.clipboard.writeText(window.location.href)
    showToast('链接已复制到剪贴板')
  } catch (error) {
    console.log(error)
    showToast('分享功能不可用')
  }
}

// 生命周期
onMounted(() => {
  loadPost()
  loadComments()
})
</script>

<style scoped>
.post-detail {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.loading-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 200px;
}

.post-header {
  margin: 16px;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.post-title {
  font-size: 20px;
  font-weight: bold;
  margin: 0;
  color: #323233;
  line-height: 1.4;
}

.post-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.author-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-detail {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.author-name {
  font-weight: 500;
  color: #323233;
  font-size: 14px;
}

.post-time {
  font-size: 12px;
  color: #969799;
}

.post-stats {
  display: flex;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #646566;
  font-size: 12px;
}

.post-body {
  margin: 16px;
}

.content-html {
  line-height: 1.6;
  color: #323233;
  margin-bottom: 16px;
}

.content-html :deep(p) {
  margin-bottom: 12px;
}

.post-images {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
  margin-top: 16px;
}

.post-actions {
  display: flex;
  gap: 12px;
  padding: 16px;
  position: sticky;
  bottom: 0;
  background: white;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 100;
}

.comment-section {
  margin: 16px;
}

.comment-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 12px;
}

.comment-list {
  margin-top: 16px;
}

.comment-item {
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-content {
  width: 100%;
}

.comment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.comment-author {
  font-weight: 500;
  color: #323233;
  font-size: 14px;
}

.comment-time {
  font-size: 12px;
  color: #969799;
}

.comment-text {
  color: #323233;
  line-height: 1.5;
  margin-bottom: 12px;
}

.comment-actions {
  display: flex;
  gap: 12px;
  margin-top: 12px;
}

.liked {
  color: #1989fa;
}

.replies {
  margin: 12px 0;
  padding-left: 16px;
  border-left: 2px solid #f0f0f0;
}

.reply-item {
  margin-bottom: 8px;
  padding: 8px 0;
}

.reply-content {
  font-size: 14px;
  line-height: 1.4;
}

.reply-author {
  font-weight: 500;
  color: #1989fa;
}

.reply-to {
  color: #646566;
}

.reply-text {
  color: #323233;
}

.reply-time {
  font-size: 12px;
  color: #969799;
  margin-left: 8px;
}

.reply-form {
  margin-top: 12px;
  padding: 12px;
  background: #f7f8fa;
  border-radius: 8px;
}

.reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
}

.load-more {
  margin-top: 16px;
  text-align: center;
}

/* Vant组件样式覆写 */
:deep(.van-cell-group__title) {
  padding: 16px;
  font-weight: 600;
  color: #323233;
  font-size: 16px;
}

:deep(.van-cell) {
  padding: 16px;
}

:deep(.van-cell__title) {
  flex: 1;
}

:deep(.van-cell__value) {
  flex: none;
}

:deep(.van-button) {
  border-radius: 6px;
}

:deep(.van-field__control) {
  font-size: 14px;
}

:deep(.van-collapse-item__content) {
  padding: 16px;
}

:deep(.van-empty) {
  padding: 40px 20px;
}

@media (max-width: 768px) {
  .post-actions {
    flex-direction: column;
    gap: 8px;
  }

  .post-meta {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .comment-actions {
    flex-direction: column;
    gap: 8px;
  }
}
</style>
