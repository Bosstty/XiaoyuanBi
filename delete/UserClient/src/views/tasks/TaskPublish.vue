<template>
  <div class="task-publish">
    <van-nav-bar title="发布任务" left-arrow @click-left="goBack">
      <template #subtitle>详细描述你的需求，找到合适的帮手</template>
    </van-nav-bar>

    <!-- 步骤指示器 -->
    <van-steps :active="currentStep - 1" class="publish-steps">
      <van-step>基本信息</van-step>
      <van-step>详细要求</van-step>
      <van-step>确认发布</van-step>
    </van-steps>

    <van-form @submit="handleSubmit" class="publish-form">
      <!-- 第一步：基本信息 -->
      <div v-show="currentStep === 1" class="step-content">
        <van-cell-group title="基本信息" class="form-section">
          <van-field
            v-model="taskForm.title"
            name="title"
            label="任务标题"
            placeholder="请输入简洁明确的任务标题"
            maxlength="50"
            show-word-limit
            required
            :rules="[{ required: true, message: '请输入任务标题' }]"
          />

          <van-field name="category" label="任务类型" required>
            <template #input>
              <div class="category-grid">
                <div
                  v-for="category in categories"
                  :key="category.value"
                  class="category-item"
                  :class="{ active: taskForm.category === category.value }"
                  @click="taskForm.category = category.value"
                >
                  <div class="category-icon">
                    <van-icon :name="getCategoryIcon(category.value)" />
                  </div>
                  <div class="category-name">{{ category.name }}</div>
                  <div class="category-desc">{{ category.description }}</div>
                </div>
              </div>
            </template>
          </van-field>

          <van-field
            v-model="taskForm.price"
            name="price"
            label="任务报酬"
            placeholder="0.00"
            type="digit"
            required
            :rules="[{ required: true, message: '请输入任务报酬' }]"
          >
            <template #left-icon>
              <span class="price-symbol">¥</span>
            </template>
            <template #button>
              <van-button size="small" type="primary" plain>
                参考价格：{{ getPriceReference(taskForm.category) }}
              </van-button>
            </template>
          </van-field>

          <van-field
            v-model="taskForm.description"
            name="description"
            label="任务描述"
            type="textarea"
            placeholder="请详细描述任务内容、要求、交付物等信息，描述越详细越容易找到合适的人选"
            maxlength="1000"
            show-word-limit
            rows="6"
            required
            :rules="[{ required: true, message: '请输入任务描述' }]"
          />
        </van-cell-group>

        <div class="step-actions">
          <van-button type="primary" block size="large" @click="nextStep" :disabled="!isStep1Valid">
            下一步
          </van-button>
        </div>
      </div>

      <!-- 第二步：详细要求 -->
      <div v-show="currentStep === 2" class="step-content">
        <van-cell-group title="技能与经验要求" class="form-section">
          <van-field name="skills" label="技能要求">
            <template #input>
              <div class="skills-container">
                <van-space v-if="taskForm.requirements.skills.length" class="skills-list">
                  <van-tag
                    v-for="(skill, index) in taskForm.requirements.skills"
                    :key="index"
                    type="primary"
                    closeable
                    @close="removeSkill(index)"
                  >
                    {{ skill }}
                  </van-tag>
                </van-space>
                <div class="add-skill">
                  <van-field
                    v-model="newSkill"
                    placeholder="输入技能"
                    maxlength="20"
                    @keypress.enter.prevent="addSkill"
                  />
                  <van-button size="small" type="primary" @click="addSkill">添加</van-button>
                </div>
              </div>
            </template>
          </van-field>

          <van-field name="experience" label="经验要求">
            <template #input>
              <van-radio-group v-model="taskForm.requirements.experience" direction="vertical">
                <van-radio
                  v-for="exp in experiences"
                  :key="exp.value"
                  :name="exp.value"
                  class="experience-option"
                >
                  <div class="experience-content">
                    <div class="experience-name">{{ exp.name }}</div>
                    <div class="experience-desc">{{ exp.description }}</div>
                  </div>
                </van-radio>
              </van-radio-group>
            </template>
          </van-field>
        </van-cell-group>

        <van-cell-group title="时间与地点" class="form-section">
          <van-field
            v-model="taskForm.deadline"
            name="deadline"
            label="完成期限"
            type="datetime-local"
            placeholder="请选择完成期限"
          />

          <van-field name="priority" label="紧急程度">
            <template #input>
              <van-radio-group v-model="taskForm.priority" direction="horizontal">
                <van-radio
                  v-for="priority in priorities"
                  :key="priority.value"
                  :name="priority.value"
                  class="priority-option"
                >
                  <span class="priority-label" :class="priority.value">{{ priority.name }}</span>
                </van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field name="location_type" label="工作地点">
            <template #input>
              <van-radio-group v-model="taskForm.location_type" direction="vertical">
                <van-radio
                  v-for="location in locationTypes"
                  :key="location.value"
                  :name="location.value"
                  class="location-option"
                >
                  <div class="location-content">
                    <div class="location-name">{{ location.name }}</div>
                    <div class="location-desc">{{ location.description }}</div>
                  </div>
                </van-radio>
              </van-radio-group>
            </template>
          </van-field>

          <van-field
            v-if="taskForm.location_type === 'onsite'"
            v-model="taskForm.location"
            name="location"
            label="具体地点"
            placeholder="请输入具体工作地点"
          />
        </van-cell-group>

        <div class="step-actions">
          <van-space fill>
            <van-button size="large" @click="prevStep">上一步</van-button>
            <van-button type="primary" size="large" @click="nextStep">下一步</van-button>
          </van-space>
        </div>
      </div>

      <!-- 第三步：确认发布 -->
      <div v-show="currentStep === 3" class="step-content">
        <!-- 任务预览 -->
        <van-cell-group title="任务预览" class="form-section">
          <div class="task-preview">
            <van-cell :title="taskForm.title" size="large">
              <template #label>
                <van-space>
                  <van-tag type="primary">{{ getCategoryName(taskForm.category) }}</van-tag>
                  <van-tag :type="getPriorityTagType(taskForm.priority)">
                    {{ getPriorityName(taskForm.priority) }}
                  </van-tag>
                </van-space>
              </template>
              <template #value>
                <div class="preview-price">¥{{ taskForm.price }}</div>
              </template>
            </van-cell>

            <van-cell title="任务描述">
              <div class="preview-description">{{ taskForm.description }}</div>
            </van-cell>

            <van-cell v-if="taskForm.requirements.skills.length" title="技能要求">
              <van-space>
                <van-tag
                  v-for="skill in taskForm.requirements.skills"
                  :key="skill"
                  type="primary"
                  size="medium"
                >
                  {{ skill }}
                </van-tag>
              </van-space>
            </van-cell>

            <van-cell
              v-if="taskForm.requirements.experience"
              title="经验要求"
              :value="getExperienceName(taskForm.requirements.experience)"
            />

            <van-cell
              v-if="taskForm.deadline"
              title="完成期限"
              :value="formatDateTime(taskForm.deadline)"
            />

            <van-cell title="工作地点" :value="getLocationText()" />
          </div>
        </van-cell-group>

        <!-- 补充信息 -->
        <van-cell-group title="补充信息" class="form-section">
          <van-field name="tags" label="标签">
            <template #input>
              <div class="tags-container">
                <van-space v-if="taskForm.tags.length" class="tags-list">
                  <van-tag
                    v-for="(tag, index) in taskForm.tags"
                    :key="index"
                    type="success"
                    plain
                    closeable
                    @close="removeTag(index)"
                  >
                    {{ tag }}
                  </van-tag>
                </van-space>
                <div class="add-tag">
                  <van-field
                    v-model="newTag"
                    placeholder="输入标签"
                    maxlength="15"
                    @keypress.enter.prevent="addTag"
                  />
                  <van-button size="small" type="success" plain @click="addTag">添加</van-button>
                </div>
              </div>
            </template>
          </van-field>

          <van-field name="contact_preferences" label="联系方式偏好">
            <template #input>
              <van-checkbox-group v-model="taskForm.contact_preferences" direction="horizontal">
                <van-checkbox
                  v-for="contact in contactTypes"
                  :key="contact.value"
                  :name="contact.value"
                >
                  {{ contact.name }}
                </van-checkbox>
              </van-checkbox-group>
            </template>
          </van-field>

          <van-field
            v-model="taskForm.notes"
            name="notes"
            label="其他说明"
            type="textarea"
            placeholder="其他需要说明的内容，如工作时间、特殊要求等"
            maxlength="500"
            show-word-limit
            rows="3"
          />
        </van-cell-group>

        <!-- 发布设置 -->
        <van-cell-group title="发布设置" class="form-section">
          <van-cell title="自动分配任务">
            <template #right-icon>
              <van-switch v-model="taskForm.auto_assign" />
            </template>
            <template #label>
              <div class="setting-help">开启后，系统会根据申请者的条件自动选择最合适的人选</div>
            </template>
          </van-cell>

          <van-cell title="允许多人协作">
            <template #right-icon>
              <van-switch v-model="taskForm.allow_multiple" />
            </template>
            <template #label>
              <div class="setting-help">多人可以同时参与这个任务</div>
            </template>
          </van-cell>
        </van-cell-group>

        <!-- 错误信息 -->
        <van-notice-bar
          v-if="taskStore.error"
          type="danger"
          :text="taskStore.error"
          background="#fef0f0"
          color="#f56c6c"
        />

        <div class="step-actions">
          <van-space fill>
            <van-button size="large" @click="prevStep">上一步</van-button>
            <van-button
              size="large"
              @click="saveDraft"
              :loading="taskStore.loading"
              loading-text="保存中..."
            >
              保存草稿
            </van-button>
            <van-button
              type="primary"
              size="large"
              native-type="submit"
              :loading="taskStore.loading"
              loading-text="发布中..."
            >
              立即发布
            </van-button>
          </van-space>
        </div>
      </div>
    </van-form>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const currentStep = ref(1)
const newSkill = ref('')
const newTag = ref('')

const categories = [
  { value: 'academic', name: '学习类', description: '辅导、笔记、研究等' },
  { value: 'design', name: '设计类', description: '海报、logo、视频剪辑等' },
  { value: 'tech', name: '技术类', description: '编程、网站、系统维护等' },
  { value: 'writing', name: '文案类', description: '文章、策划、翻译等' },
  { value: 'life_service', name: '生活服务', description: '排队、办事、清洁等' },
]

const experiences = [
  { value: '', name: '不限经验', description: '适合所有人' },
  { value: 'beginner', name: '初学者', description: '刚开始学习相关技能' },
  { value: 'intermediate', name: '有一定经验', description: '有基础实践经验' },
  { value: 'advanced', name: '经验丰富', description: '熟练掌握相关技能' },
  { value: 'expert', name: '专业级别', description: '专业水准，经验丰富' },
]

const priorities = [
  { value: 'normal', name: '普通' },
  { value: 'urgent', name: '紧急' },
  { value: 'very_urgent', name: '非常紧急' },
]

const locationTypes = [
  { value: 'remote', name: '远程工作', description: '可以在任何地方完成' },
  { value: 'onsite', name: '现场工作', description: '需要到指定地点工作' },
  { value: 'flexible', name: '灵活安排', description: '根据具体情况安排' },
]

const contactTypes = [
  { value: 'phone', name: '电话' },
  { value: 'wechat', name: '微信' },
  { value: 'qq', name: 'QQ' },
  { value: 'email', name: '邮箱' },
]

const taskForm = ref({
  title: '',
  category: '',
  price: '',
  description: '',
  requirements: {
    skills: [],
    experience: '',
  },
  deadline: '',
  priority: 'normal',
  tags: [],
  location_type: 'flexible',
  location: '',
  contact_preferences: [],
  notes: '',
  auto_assign: false,
  allow_multiple: false,
})

const isStep1Valid = computed(() => {
  return (
    taskForm.value.title.trim() &&
    taskForm.value.category &&
    taskForm.value.price > 0 &&
    taskForm.value.description.trim()
  )
})

function goBack() {
  router.push('/tasks')
}

function getCategoryIcon(category) {
  const icons = {
    academic: 'todo-list-o',
    design: 'photo-o',
    tech: 'setting-o',
    writing: 'edit',
    life_service: 'home-o',
  }
  return icons[category] || 'orders-o'
}

function getCategoryName(category) {
  const cat = categories.find((c) => c.value === category)
  return cat ? cat.name : category
}

function getExperienceName(experience) {
  const exp = experiences.find((e) => e.value === experience)
  return exp ? exp.name : '不限'
}

function getPriorityName(priority) {
  const pri = priorities.find((p) => p.value === priority)
  return pri ? pri.name : priority
}

function getPriorityTagType(priority) {
  const types = {
    normal: 'default',
    urgent: 'warning',
    very_urgent: 'danger',
  }
  return types[priority] || 'default'
}

function getPriceReference(category) {
  const references = {
    academic: '10-50元/小时',
    design: '50-200元/项目',
    tech: '100-500元/项目',
    writing: '30-100元/千字',
    life_service: '10-30元/小时',
  }
  return references[category] || '根据具体内容而定'
}

function getLocationText() {
  if (taskForm.value.location_type === 'onsite') {
    return taskForm.value.location || '现场工作'
  }
  const locationType = locationTypes.find((l) => l.value === taskForm.value.location_type)
  return locationType ? locationType.name : '未指定'
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString().slice(0, 5)
}

function nextStep() {
  if (currentStep.value < 3) {
    currentStep.value++
  }
}

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function addSkill() {
  const skill = newSkill.value.trim()
  if (skill && !taskForm.value.requirements.skills.includes(skill)) {
    taskForm.value.requirements.skills.push(skill)
    newSkill.value = ''
  }
}

function removeSkill(index) {
  taskForm.value.requirements.skills.splice(index, 1)
}

function addTag() {
  const tag = newTag.value.trim()
  if (tag && !taskForm.value.tags.includes(tag) && taskForm.value.tags.length < 5) {
    taskForm.value.tags.push(tag)
    newTag.value = ''
  }
}

function removeTag(index) {
  taskForm.value.tags.splice(index, 1)
}

async function handleSubmit() {
  try {
    await taskStore.createTask({
      ...taskForm.value,
      status: 'published',
    })

    showToast('任务发布成功')
    router.push('/tasks')
  } catch (error) {
    console.error('发布任务失败:', error)
    showToast('发布失败，请重试')
  }
}

async function saveDraft() {
  try {
    await taskStore.createTask({
      ...taskForm.value,
      status: 'draft',
    })

    showToast('草稿保存成功')
    router.push('/tasks/my')
  } catch (error) {
    console.error('保存草稿失败:', error)
    showToast('保存失败，请重试')
  }
}
</script>

<style scoped>
.task-publish {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.publish-steps {
  margin: 16px;
  background: white;
  padding: 16px;
  border-radius: 8px;
}

.publish-form {
  background: #f7f8fa;
}

.step-content {
  padding: 0 16px;
  min-height: 400px;
}

.form-section {
  margin-bottom: 16px;
}

.category-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-top: 8px;
}

.category-item {
  border: 1px solid #ebedf0;
  border-radius: 8px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.category-item:hover {
  border-color: #1989fa;
}

.category-item.active {
  border-color: #1989fa;
  background: #f0f9ff;
}

.category-icon {
  font-size: 20px;
  margin-bottom: 4px;
  color: #1989fa;
}

.category-name {
  font-weight: 600;
  font-size: 14px;
  margin-bottom: 2px;
  color: #323233;
}

.category-desc {
  font-size: 11px;
  color: #969799;
}

.price-symbol {
  font-weight: 600;
  color: #1989fa;
}

.skills-container,
.tags-container {
  width: 100%;
}

.skills-list,
.tags-list {
  margin-bottom: 8px;
  min-height: 32px;
}

.add-skill,
.add-tag {
  display: flex;
  gap: 8px;
  align-items: center;
}

.add-skill .van-field,
.add-tag .van-field {
  flex: 1;
}

.experience-option,
.location-option {
  padding: 8px 0;
  border-bottom: 1px solid #ebedf0;
}

.experience-option:last-child,
.location-option:last-child {
  border-bottom: none;
}

.experience-content,
.location-content {
  margin-left: 8px;
}

.experience-name,
.location-name {
  font-weight: 500;
  color: #323233;
}

.experience-desc,
.location-desc {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.priority-option {
  margin-right: 16px;
}

.priority-label {
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}

.priority-label.normal {
  background: #f0f2ff;
  color: #1989fa;
}

.priority-label.urgent {
  background: #fff3cd;
  color: #ff976a;
}

.priority-label.very_urgent {
  background: #fef0f0;
  color: #ee0a24;
}

.task-preview {
  border-radius: 8px;
  overflow: hidden;
}

.preview-price {
  font-size: 18px;
  font-weight: 600;
  color: #1989fa;
}

.preview-description {
  line-height: 1.6;
  color: #646566;
  white-space: pre-wrap;
  margin-top: 8px;
}

.setting-help {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
  line-height: 1.4;
}

.step-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  border-top: 1px solid #ebedf0;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.step-actions .van-button {
  height: 44px;
}

/* 为底部按钮留出空间 */
.step-content {
  padding-bottom: 80px;
}
</style>
