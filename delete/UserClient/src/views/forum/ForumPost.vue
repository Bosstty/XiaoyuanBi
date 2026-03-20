<template>
  <div class="forum-post">
    <van-nav-bar title="发布帖子" left-arrow @click-left="$router.go(-1)" />

    <div class="form-header">
      <h2>发布帖子</h2>
      <p>分享你的想法，与大家一起交流</p>
    </div>

    <van-form @submit="handleSubmit" class="post-form">
      <div class="form-section">
        <h3>基本信息</h3>

        <div class="form-group">
          <h4>帖子分类 *</h4>
          <van-grid :column-num="2" :gutter="10" class="category-grid">
            <van-grid-item
              v-for="category in categories"
              :key="category.id"
              class="category-option"
              :class="{ active: postForm.category === category.id }"
              @click="postForm.category = category.id"
            >
              <div class="category-icon">{{ category.icon }}</div>
              <div class="category-name">{{ category.name }}</div>
              <div class="category-desc">{{ category.description }}</div>
            </van-grid-item>
          </van-grid>
        </div>

        <van-cell-group inset>
          <van-field
            v-model="postForm.title"
            name="title"
            label="帖子标题"
            placeholder="请输入标题，简洁明了地描述你要分享的内容"
            required
            maxlength="100"
            show-word-limit
            :rules="[{ required: true, message: '请输入标题' }]"
          />
        </van-cell-group>
      </div>

      <div class="form-section">
        <h3>帖子内容</h3>

        <van-cell-group inset>
          <van-field
            v-model="postForm.content"
            name="content"
            label="内容详情"
            type="textarea"
            placeholder="在这里分享你的想法、经验、问题等..."
            required
            rows="6"
            maxlength="5000"
            show-word-limit
            :rules="[{ required: true, message: '请输入内容' }]"
          >
            <template #button>
              <div class="editor-toolbar">
                <van-button size="mini" @click="insertText('**', '**')" type="default" plain>
                  <strong>B</strong>
                </van-button>
                <van-button size="mini" @click="insertText('*', '*')" type="default" plain>
                  <em>I</em>
                </van-button>
                <van-button size="mini" @click="insertText('~~', '~~')" type="default" plain>
                  <s>S</s>
                </van-button>
                <van-button size="mini" @click="showEmojiPicker = !showEmojiPicker" type="default" plain>
                  😊
                </van-button>
              </div>
            </template>
          </van-field>
        </van-cell-group>

        <!-- 表情选择器 -->
        <van-popup v-model:show="showEmojiPicker" position="bottom" round>
          <div class="emoji-picker">
            <van-nav-bar title="选择表情" @click-left="showEmojiPicker = false">
              <template #left>
                <van-icon name="cross" />
              </template>
            </van-nav-bar>
            <van-grid :column-num="8" class="emoji-grid">
              <van-grid-item
                v-for="emoji in commonEmojis"
                :key="emoji"
                @click="insertEmoji(emoji)"
                class="emoji-item"
              >
                {{ emoji }}
              </van-grid-item>
            </van-grid>
          </div>
        </van-popup>

        <!-- 上传图片 -->
        <van-cell-group inset>
          <van-cell title="上传图片" icon="photo-o">
            <template #default>
              <van-uploader
                v-model="postForm.images"
                multiple
                :max-count="9"
                :max-size="5 * 1024 * 1024"
                @oversize="onUploadOversize"
                @delete="onDeleteImage"
              >
                <van-button size="small" type="primary" plain>
                  <van-icon name="photograph" />
                  选择图片
                </van-button>
              </van-uploader>
            </template>
          </van-cell>
          <van-cell>
            <template #title>
              <span class="upload-tip">支持 JPG、PNG、GIF 格式，单张图片不超过 5MB</span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <div class="form-section">
        <h3>标签与设置</h3>

        <van-cell-group inset>
          <van-field
            v-model="newTag"
            name="tag"
            label="添加标签"
            placeholder="输入标签并点击添加"
            maxlength="20"
            @keyup.enter="addTag"
          >
            <template #button>
              <van-button size="small" @click="addTag" type="primary" plain>
                添加
              </van-button>
            </template>
          </van-field>

          <van-cell>
            <template #title>
              <div class="tags-list">
                <van-tag
                  v-for="(tag, index) in postForm.tags"
                  :key="index"
                  closeable
                  @close="removeTag(index)"
                  type="primary"
                  size="medium"
                >
                  {{ tag }}
                </van-tag>
              </div>
            </template>
          </van-cell>

          <van-cell title="推荐标签">
            <template #default>
              <div class="suggested-tags">
                <van-tag
                  v-for="suggestedTag in getSuggestedTags()"
                  :key="suggestedTag"
                  @click="addSuggestedTag(suggestedTag)"
                  type="default"
                  size="small"
                  plain
                >
                  {{ suggestedTag }}
                </van-tag>
              </div>
            </template>
          </van-cell>
        </van-cell-group>

        <van-cell-group inset>
          <van-cell>
            <template #title>
              <div class="post-settings">
                <van-checkbox v-model="postForm.allow_comments">允许评论</van-checkbox>
                <van-checkbox v-model="postForm.is_anonymous">匿名发布</van-checkbox>
              </div>
            </template>
          </van-cell>
        </van-cell-group>
      </div>

      <!-- 预览区域 -->
      <van-collapse v-if="showPreview" v-model="activePreview">
        <van-collapse-item title="帖子预览" name="preview">
          <div class="post-preview">
            <van-cell-group>
              <van-cell>
                <template #title>
                  <div class="preview-header">
                    <van-tag :type="getPreviewCategoryType(postForm.category)">
                      {{ getCategoryName(postForm.category) }}
                    </van-tag>
                    <div class="preview-meta">
                      <span class="preview-time">刚刚</span>
                      <span class="preview-author">{{ postForm.is_anonymous ? '匿名用户' : '我' }}</span>
                    </div>
                  </div>
                </template>
              </van-cell>
              <van-cell>
                <template #title>
                  <h4 class="preview-title">{{ postForm.title || '请输入标题' }}</h4>
                  <div class="preview-content" v-html="formatContent(postForm.content)"></div>

                  <div class="preview-images" v-if="postForm.images.length">
                    <van-image
                      v-for="(image, index) in postForm.images"
                      :key="index"
                      :src="image.url || image.content"
                      width="80"
                      height="80"
                      fit="cover"
                      radius="4"
                    />
                  </div>

                  <div class="preview-tags" v-if="postForm.tags.length">
                    <van-tag v-for="tag in postForm.tags" :key="tag" size="small">
                      {{ tag }}
                    </van-tag>
                  </div>
                </template>
              </van-cell>
            </van-cell-group>
          </div>
        </van-collapse-item>
      </van-collapse>

      <!-- 错误消息 -->
      <van-notice-bar
        v-if="forumStore.error"
        type="danger"
        :text="forumStore.error"
        left-icon="warning-o"
      />

      <!-- 操作按钮 -->
      <div class="form-actions">
        <van-button-group>
          <van-button @click="showPreview = !showPreview" type="default" size="large">
            {{ showPreview ? '隐藏预览' : '预览帖子' }}
          </van-button>
          <van-button @click="saveDraft" :loading="forumStore.loading" size="large">
            保存草稿
          </van-button>
        </van-button-group>

        <van-button
          native-type="submit"
          type="primary"
          size="large"
          block
          :loading="forumStore.loading"
          :disabled="!isFormValid"
        >
          {{ forumStore.loading ? '发布中...' : '立即发布' }}
        </van-button>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useForumStore } from '@/stores/forum'
import { showToast } from 'vant'

const router = useRouter()
const forumStore = useForumStore()

const contentTextarea = ref(null)
const showEmojiPicker = ref(false)
const showPreview = ref(false)
const activePreview = ref([])
const newTag = ref('')

const categories = [
  { id: 'academic', name: '学术交流', icon: '📚', description: '学习讨论、学术分享' },
  { id: 'life', name: '生活服务', icon: '🏠', description: '二手交易、失物招领' },
  { id: 'campus', name: '校园动态', icon: '🏫', description: '校园新闻、活动通知' },
  { id: 'task', name: '任务交流', icon: '💼', description: '任务讨论、经验分享' },
  { id: 'skill', name: '技能分享', icon: '💡', description: '技能教学、知识分享' }
]

const commonEmojis = [
  '😊', '😂', '😍', '🤔', '😅', '😢', '😡', '👍', '👎', '❤️',
  '🔥', '💯', '🎉', '👏', '🙏', '💪', '🤝', '✨', '⭐', '🌟'
]

const postForm = ref({
  category: '',
  title: '',
  content: '',
  images: [],
  tags: [],
  allow_comments: true,
  is_anonymous: false
})

const isFormValid = computed(() => {
  return (
    postForm.value.category &&
    postForm.value.title.trim() &&
    postForm.value.content.trim()
  )
})

// 新增的方法
const getPreviewCategoryType = (categoryId) => {
  const typeMap = {
    academic: 'primary',
    life: 'success',
    campus: 'warning',
    task: 'default',
    skill: 'danger',
  }
  return typeMap[categoryId] || 'default'
}

const onUploadOversize = () => {
  showToast('图片大小不能超过 5MB')
}

const onDeleteImage = (file, detail) => {
  showToast('删除成功')
}

function getCategoryName(categoryId) {
  const category = categories.find(cat => cat.id === categoryId)
  return category ? category.name : categoryId
}

function getSuggestedTags() {
  const tagsByCategory = {
    academic: ['学习', '考试', '课程', '教材', '笔记', '复习'],
    life: ['二手', '代购', '拼单', '失物', '招领', '租房'],
    campus: ['活动', '讲座', '比赛', '社团', '通知', '新闻'],
    task: ['兼职', '合作', '技能', '经验', '心得', '求助'],
    skill: ['教程', '分享', '工具', '资源', '技巧', '学习']
  }
  return tagsByCategory[postForm.value.category] || []
}

function insertText(before, after) {
  const content = postForm.value.content
  postForm.value.content = content + before + after
}

function insertEmoji(emoji) {
  postForm.value.content += emoji
  showEmojiPicker.value = false
}


function addTag() {
  const tag = newTag.value.trim()
  if (tag && !postForm.value.tags.includes(tag) && postForm.value.tags.length < 10) {
    postForm.value.tags.push(tag)
    newTag.value = ''
  }
}

function addSuggestedTag(tag) {
  if (!postForm.value.tags.includes(tag) && postForm.value.tags.length < 10) {
    postForm.value.tags.push(tag)
  }
}

function removeTag(index) {
  postForm.value.tags.splice(index, 1)
}

function formatContent(content) {
  if (!content) return ''

  // 简单的markdown格式化
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n/g, '<br>')
    .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
}

async function handleSubmit(values) {
  if (!isFormValid.value) return

  try {
    await forumStore.createPost({
      ...postForm.value,
      status: 'published'
    })

    showToast('发布成功')
    router.push('/forum')
  } catch (error) {
    console.error('发布帖子失败:', error)
    showToast('发布失败')
  }
}

async function saveDraft() {
  try {
    await forumStore.createPost({
      ...postForm.value,
      status: 'draft'
    })

    showToast('保存草稿成功')
    router.push('/forum/my')
  } catch (error) {
    console.error('保存草稿失败:', error)
    showToast('保存失败')
  }
}
</script>

<style scoped>
.forum-post {
  background: #f7f8fa;
  min-height: 100vh;
}

.form-header {
  text-align: center;
  padding: 24px 16px;
  background: white;
  border-bottom: 1px solid #ebedf0;
}

.form-header h2 {
  color: #323233;
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
}

.form-header p {
  color: #646566;
  font-size: 14px;
  margin: 0;
}

.post-form {
  padding: 16px;
}

.form-section {
  margin-bottom: 24px;
}

.form-section h3 {
  color: #323233;
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  padding-left: 16px;
}

.form-section h4 {
  color: #323233;
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  padding-left: 16px;
}

.category-grid {
  margin-bottom: 16px;
}

.category-option {
  border: 1px solid #ebedf0;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
  background: white;
}

.category-option:hover {
  border-color: #1989fa;
}

.category-option.active {
  border-color: #1989fa;
  background: #f0f8ff;
}

.category-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.category-name {
  font-weight: 600;
  margin-bottom: 4px;
  color: #323233;
  font-size: 14px;
}

.category-desc {
  font-size: 12px;
  color: #969799;
}

.editor-toolbar {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.emoji-picker {
  background: white;
}

.emoji-grid {
  padding: 16px;
}

.emoji-item {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 40px;
  font-size: 20px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.3s;
}

.emoji-item:hover {
  background: #f7f8fa;
}

.upload-tip {
  font-size: 12px;
  color: #969799;
  margin: 0;
}

.tags-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  min-height: 32px;
  align-items: center;
}

.suggested-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.post-settings {
  display: flex;
  gap: 24px;
}

.post-preview {
  background: #f7f8fa;
  border-radius: 8px;
  margin: 16px 0;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.preview-meta {
  display: flex;
  gap: 8px;
  font-size: 12px;
  color: #969799;
}

.preview-title {
  color: #323233;
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.preview-content {
  color: #646566;
  line-height: 1.6;
  margin-bottom: 12px;
}

.preview-content :deep(strong) {
  font-weight: 600;
}

.preview-content :deep(em) {
  font-style: italic;
}

.preview-content :deep(del) {
  text-decoration: line-through;
}

.preview-content :deep(code) {
  background: #f2f3f5;
  padding: 2px 4px;
  border-radius: 2px;
  font-family: 'Monaco', 'Consolas', monospace;
  font-size: 13px;
}

.preview-images {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.preview-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.form-actions {
  margin-top: 24px;
  padding: 16px;
  background: white;
  border-top: 1px solid #ebedf0;
  position: sticky;
  bottom: 0;
  z-index: 100;
}

/* Vant组件样式覆写 */
:deep(.van-nav-bar) {
  background: white;
  border-bottom: 1px solid #ebedf0;
}

:deep(.van-cell-group) {
  margin-bottom: 16px;
}

:deep(.van-field__label) {
  font-weight: 500;
  color: #323233;
}

:deep(.van-field__control) {
  font-size: 14px;
}

:deep(.van-uploader__preview) {
  margin: 8px 8px 0 0;
}

:deep(.van-tag) {
  margin: 2px 4px 2px 0;
}

:deep(.van-checkbox) {
  margin-right: 24px;
}

:deep(.van-button-group) {
  margin-bottom: 12px;
}

:deep(.van-button-group .van-button) {
  flex: 1;
}

:deep(.van-collapse-item__content) {
  padding: 16px;
}

:deep(.van-notice-bar) {
  margin-bottom: 16px;
}

/* 响应式布局 */
@media (max-width: 768px) {
  .post-form {
    padding: 8px;
  }

  .form-section h3 {
    padding-left: 8px;
  }

  .form-section h4 {
    padding-left: 8px;
  }

  .category-option {
    padding: 12px;
  }

  .category-icon {
    font-size: 20px;
  }

  .post-settings {
    flex-direction: column;
    gap: 12px;
  }

  .form-actions {
    padding: 12px;
  }
}
</style>