<template>
  <div class="task-create">
    <van-nav-bar title="发布任务" left-arrow @click-left="goBack">
      <template #subtitle>详细描述你的需求，找到合适的帮手</template>
    </van-nav-bar>

    <van-form @submit="handleSubmit" class="create-form">
      <!-- 基本信息 -->
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

        <van-field
          v-model="categoryText"
          name="category"
          label="任务类型"
          placeholder="请选择任务类型"
          readonly
          is-link
          @click="showCategoryPicker = true"
          required
          :rules="[{ required: true, message: '请选择任务类型' }]"
        />

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
        </van-field>

        <van-field
          v-model="taskForm.description"
          name="description"
          label="任务描述"
          type="textarea"
          placeholder="请详细描述任务内容、要求、交付物等信息，描述越详细越容易找到合适的人选"
          maxlength="1000"
          show-word-limit
          rows="4"
          required
          :rules="[{ required: true, message: '请输入任务描述' }]"
        />
      </van-cell-group>

      <!-- 要求与条件 -->
      <van-cell-group title="要求与条件" class="form-section">
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

        <van-field
          v-model="experienceText"
          name="experience"
          label="经验要求"
          placeholder="请选择经验要求"
          readonly
          is-link
          @click="showExperiencePicker = true"
        />

        <van-field
          v-model="taskForm.deadline"
          name="deadline"
          label="完成期限"
          placeholder="请选择完成期限"
          type="datetime-local"
        />

        <van-field
          v-model="priorityText"
          name="priority"
          label="紧急程度"
          placeholder="请选择紧急程度"
          readonly
          is-link
          @click="showPriorityPicker = true"
        />
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

        <van-field name="location_type" label="工作地点">
          <template #input>
            <van-radio-group v-model="taskForm.location_type" direction="horizontal">
              <van-radio name="remote">远程工作</van-radio>
              <van-radio name="onsite">现场工作</van-radio>
              <van-radio name="flexible">灵活安排</van-radio>
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

        <van-field name="contact_preferences" label="联系方式偏好">
          <template #input>
            <van-checkbox-group v-model="taskForm.contact_preferences" direction="horizontal">
              <van-checkbox name="phone">电话</van-checkbox>
              <van-checkbox name="wechat">微信</van-checkbox>
              <van-checkbox name="qq">QQ</van-checkbox>
              <van-checkbox name="email">邮箱</van-checkbox>
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
        <van-cell title="自动分配任务" size="large">
          <template #right-icon>
            <van-switch v-model="taskForm.auto_assign" />
          </template>
          <template #label>
            <div class="setting-help">开启后，系统会根据申请者的条件自动选择最合适的人选</div>
          </template>
        </van-cell>

        <van-cell title="允许多人协作" size="large">
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

      <!-- 操作按钮 -->
      <div class="form-actions">
        <van-button block @click="saveDraft" :loading="taskStore.loading" loading-text="保存中...">
          保存草稿
        </van-button>
        <van-button
          type="primary"
          block
          native-type="submit"
          :loading="taskStore.loading"
          :disabled="!isFormValid"
          loading-text="发布中..."
        >
          立即发布
        </van-button>
      </div>
    </van-form>

    <!-- 任务类型选择器 -->
    <van-popup v-model:show="showCategoryPicker" position="bottom">
      <van-picker
        :columns="categoryOptions"
        @confirm="onCategoryConfirm"
        @cancel="showCategoryPicker = false"
        title="选择任务类型"
      />
    </van-popup>

    <!-- 经验要求选择器 -->
    <van-popup v-model:show="showExperiencePicker" position="bottom">
      <van-picker
        :columns="experienceOptions"
        @confirm="onExperienceConfirm"
        @cancel="showExperiencePicker = false"
        title="选择经验要求"
      />
    </van-popup>

    <!-- 紧急程度选择器 -->
    <van-popup v-model:show="showPriorityPicker" position="bottom">
      <van-picker
        :columns="priorityOptions"
        @confirm="onPriorityConfirm"
        @cancel="showPriorityPicker = false"
        title="选择紧急程度"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTaskStore } from '@/stores/task'
import { showToast } from 'vant'

const router = useRouter()
const taskStore = useTaskStore()

const newSkill = ref('')
const newTag = ref('')

// 选择器显示状态
const showCategoryPicker = ref(false)
const showExperiencePicker = ref(false)
const showPriorityPicker = ref(false)

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

// 选择器选项
const categoryOptions = [
  { text: '学习类', value: 'academic' },
  { text: '设计类', value: 'design' },
  { text: '技术类', value: 'tech' },
  { text: '文案类', value: 'writing' },
  { text: '生活服务', value: 'life_service' },
]

const experienceOptions = [
  { text: '不限经验', value: '' },
  { text: '初学者', value: 'beginner' },
  { text: '有一定经验', value: 'intermediate' },
  { text: '经验丰富', value: 'advanced' },
  { text: '专业级别', value: 'expert' },
]

const priorityOptions = [
  { text: '普通', value: 'normal' },
  { text: '紧急', value: 'urgent' },
  { text: '非常紧急', value: 'very_urgent' },
]

// 计算属性
const categoryText = computed(() => {
  const option = categoryOptions.find((opt) => opt.value === taskForm.value.category)
  return option ? option.text : ''
})

const experienceText = computed(() => {
  const option = experienceOptions.find(
    (opt) => opt.value === taskForm.value.requirements.experience,
  )
  return option ? option.text : ''
})

const priorityText = computed(() => {
  const option = priorityOptions.find((opt) => opt.value === taskForm.value.priority)
  return option ? option.text : ''
})

const isFormValid = computed(() => {
  return (
    taskForm.value.title.trim() &&
    taskForm.value.category &&
    taskForm.value.price > 0 &&
    taskForm.value.description.trim()
  )
})

// 方法
function goBack() {
  router.push('/tasks')
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

// 选择器确认事件
function onCategoryConfirm({ selectedOptions }) {
  taskForm.value.category = selectedOptions[0].value
  showCategoryPicker.value = false
}

function onExperienceConfirm({ selectedOptions }) {
  taskForm.value.requirements.experience = selectedOptions[0].value
  showExperiencePicker.value = false
}

function onPriorityConfirm({ selectedOptions }) {
  taskForm.value.priority = selectedOptions[0].value
  showPriorityPicker.value = false
}

async function handleSubmit() {
  if (!isFormValid.value) return

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
.task-create {
  background: #f7f8fa;
  min-height: 100vh;
  padding-bottom: 16px;
}

.create-form {
  background: #f7f8fa;
}

.form-section {
  margin-bottom: 16px;
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

.setting-help {
  font-size: 12px;
  color: #969799;
  margin-top: 4px;
  line-height: 1.4;
}

.form-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  padding: 12px 16px;
  border-top: 1px solid #ebedf0;
  display: flex;
  gap: 12px;
  box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.form-actions .van-button {
  flex: 1;
  height: 44px;
}

/* 为底部按钮留出空间 */
.create-form {
  padding-bottom: 80px;
}
</style>
