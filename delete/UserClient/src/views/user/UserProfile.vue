<template>
  <div class="user-profile">
    <div class="profile-card">
      <div class="card-header">
        <span>个人资料</span>
      </div>

      <div class="profile-content">
        <!-- 头像区域 -->
        <div class="avatar-section">
          <van-image
            :src="form.avatar"
            round
            width="120px"
            height="120px"
            fit="cover"
            class="avatar"
          >
            <template #error>
              <div class="avatar-fallback">
                {{ form.username?.charAt(0) }}
              </div>
            </template>
          </van-image>
          <div class="avatar-actions">
            <van-uploader
              :after-read="handleAvatarUpload"
              :max-count="1"
              :max-size="2 * 1024 * 1024"
            >
              <van-button type="primary" size="small" icon="photograph"> 更换头像 </van-button>
            </van-uploader>
          </div>
        </div>

        <!-- 基本信息表单 -->
        <van-form ref="formRef" @submit="updateProfile" class="profile-form" label-width="100px">
          <van-row gutter="20">
            <van-col span="12">
              <van-field
                v-model="form.username"
                name="username"
                label="用户名"
                placeholder="请输入用户名"
                :rules="[{ required: true, message: '请输入用户名' }]"
              />
            </van-col>
            <van-col span="12">
              <van-field
                v-model="form.student_id"
                name="student_id"
                label="学号"
                placeholder="请输入学号"
                disabled
              />
            </van-col>
          </van-row>

          <van-row gutter="20">
            <van-col span="12">
              <van-field
                v-model="form.real_name"
                name="real_name"
                label="真实姓名"
                placeholder="请输入真实姓名"
                :rules="[{ required: true, message: '请输入真实姓名' }]"
              />
            </van-col>
            <van-col span="12">
              <van-field
                v-model="form.email"
                name="email"
                label="邮箱"
                placeholder="请输入邮箱"
                type="email"
                :rules="[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入正确的邮箱地址' },
                ]"
              />
            </van-col>
          </van-row>

          <van-row gutter="20">
            <van-col span="12">
              <van-field
                v-model="form.phone"
                name="phone"
                label="手机号"
                placeholder="请输入手机号"
                :rules="[{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' }]"
              />
            </van-col>
            <van-col span="12">
              <van-field
                name="gender"
                label="性别"
                placeholder="请选择性别"
                :model-value="getGenderText(form.gender)"
                is-link
                readonly
                @click="showGenderPicker = true"
              />
            </van-col>
          </van-row>

          <van-row gutter="20">
            <van-col span="12">
              <van-field
                v-model="form.college"
                name="college"
                label="学院"
                placeholder="请输入学院"
              />
            </van-col>
            <van-col span="12">
              <van-field v-model="form.major" name="major" label="专业" placeholder="请输入专业" />
            </van-col>
          </van-row>

          <van-row gutter="20">
            <van-col span="12">
              <van-field
                name="grade"
                label="年级"
                placeholder="请选择年级"
                :model-value="getGradeText(form.grade)"
                is-link
                readonly
                @click="showGradePicker = true"
              />
            </van-col>
            <van-col span="12">
              <van-field
                v-model="form.class_name"
                name="class_name"
                label="班级"
                placeholder="请输入班级"
              />
            </van-col>
          </van-row>

          <van-field
            v-model="form.bio"
            name="bio"
            label="个人简介"
            type="textarea"
            placeholder="请输入个人简介"
            maxlength="200"
            show-word-limit
            :autosize="{ minHeight: '60px' }"
          />

          <van-field name="skills" label="技能标签">
            <template #input>
              <div class="skills-container">
                <van-tag
                  v-for="skill in form.skills"
                  :key="skill"
                  closeable
                  @close="removeSkill(skill)"
                  class="skill-tag"
                  type="primary"
                >
                  {{ skill }}
                </van-tag>
                <van-field
                  v-if="inputVisible"
                  ref="inputRef"
                  v-model="inputValue"
                  size="small"
                  class="skill-input"
                  placeholder="输入技能"
                  @keyup.enter="handleInputConfirm"
                  @blur="handleInputConfirm"
                />
                <van-button v-else size="small" @click="showInput" type="primary" plain>
                  + 添加技能
                </van-button>
              </div>
            </template>
          </van-field>

          <div class="form-actions">
            <van-button type="primary" :loading="loading" native-type="submit" block>
              保存修改
            </van-button>
            <van-button @click="resetForm" block>重置</van-button>
          </div>
        </van-form>
      </div>
    </div>

    <!-- 账号安全 -->
    <div class="security-card">
      <div class="card-header">
        <span>账号安全</span>
      </div>

      <div class="security-content">
        <van-cell
          title="登录密码"
          label="安全性高的密码可以保护账号"
          is-link
          @click="showPasswordDialog = true"
        >
          <template #right-icon>
            <van-icon name="arrow" />
          </template>
        </van-cell>

        <van-cell
          title="手机绑定"
          :label="form.phone ? `已绑定：${form.phone}` : '未绑定手机号'"
          is-link
          @click="showPhoneDialog = true"
        >
          <template #right-icon>
            <van-icon name="arrow" />
          </template>
        </van-cell>

        <van-cell
          title="邮箱绑定"
          :label="form.email ? `已绑定：${form.email}` : '未绑定邮箱'"
          is-link
          @click="showEmailDialog = true"
        >
          <template #right-icon>
            <van-icon name="arrow" />
          </template>
        </van-cell>
      </div>
    </div>

    <!-- 修改密码对话框 -->
    <van-popup v-model:show="showPasswordDialog" position="bottom" :style="{ height: '60%' }">
      <div class="dialog-container">
        <div class="dialog-header">
          <van-button type="primary" size="small" text @click="showPasswordDialog = false">
            取消
          </van-button>
          <span class="dialog-title">修改密码</span>
          <van-button
            type="primary"
            size="small"
            text
            @click="changePassword"
            :loading="passwordLoading"
          >
            确认
          </van-button>
        </div>
        <div class="dialog-content">
          <van-form ref="passwordFormRef" label-width="100px">
            <van-field
              v-model="passwordForm.oldPassword"
              name="oldPassword"
              label="当前密码"
              type="password"
              placeholder="请输入当前密码"
              :rules="[{ required: true, message: '请输入当前密码' }]"
            />
            <van-field
              v-model="passwordForm.newPassword"
              name="newPassword"
              label="新密码"
              type="password"
              placeholder="请输入新密码"
              :rules="[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码长度至少6位' },
              ]"
            />
            <van-field
              v-model="passwordForm.confirmPassword"
              name="confirmPassword"
              label="确认密码"
              type="password"
              placeholder="请再次输入新密码"
              :rules="[
                { required: true, message: '请确认新密码' },
                { validator: validateConfirmPassword },
              ]"
            />
          </van-form>
        </div>
      </div>
    </van-popup>

    <!-- 性别选择器 -->
    <van-popup v-model:show="showGenderPicker" position="bottom">
      <van-picker
        :columns="genderOptions"
        @confirm="onGenderConfirm"
        @cancel="showGenderPicker = false"
        title="选择性别"
      />
    </van-popup>

    <!-- 年级选择器 -->
    <van-popup v-model:show="showGradePicker" position="bottom">
      <van-picker
        :columns="gradeOptions"
        @confirm="onGradeConfirm"
        @cancel="showGradePicker = false"
        title="选择年级"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, nextTick } from 'vue'
import { showToast } from 'vant'
import { userAPI } from '@/utils/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

// 表单数据
const form = reactive({
  username: '',
  student_id: '',
  real_name: '',
  email: '',
  phone: '',
  gender: '',
  college: '',
  major: '',
  grade: '',
  class_name: '',
  bio: '',
  avatar: '',
  skills: [],
})

// 表单验证规则
const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' },
  ],
  real_name: [{ required: true, message: '请输入真实姓名', trigger: 'blur' }],
  email: [
    { required: true, message: '请输入邮箱地址', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱地址', trigger: 'blur' },
  ],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }],
}

// 密码表单
const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const passwordRules = {
  oldPassword: [{ required: true, message: '请输入当前密码', trigger: 'blur' }],
  newPassword: [
    { required: true, message: '请输入新密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' },
  ],
  confirmPassword: [
    { required: true, message: '请确认新密码', trigger: 'blur' },
    {
      validator: (rule, value, callback) => {
        if (value !== passwordForm.newPassword) {
          callback(new Error('两次输入的密码不一致'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 响应式数据
const formRef = ref()
const passwordFormRef = ref()
const inputRef = ref()
const loading = ref(false)
const passwordLoading = ref(false)
const showPasswordDialog = ref(false)
const showPhoneDialog = ref(false)
const showEmailDialog = ref(false)
const inputVisible = ref(false)
const inputValue = ref('')

// 上传配置
const uploadUrl = ref(`${import.meta.env.VITE_API_BASE_URL}/user/avatar`)
const uploadHeaders = ref({
  Authorization: `Bearer ${localStorage.getItem('token')}`,
})

// 生命周期
onMounted(() => {
  loadUserProfile()
})

// 方法
const loadUserProfile = async () => {
  try {
    const response = await userAPI.getProfile()
    Object.assign(form, response.data)
    if (typeof form.skills === 'string') {
      form.skills = form.skills ? form.skills.split(',') : []
    }
  } catch (error) {
    showToast('加载用户信息失败')
  }
}

const updateProfile = async () => {
  try {
    await formRef.value.validate()
    loading.value = true

    const data = { ...form }
    data.skills = form.skills.join(',')

    await userAPI.updateProfile(data)
    userStore.updateUser(data)
    showToast('保存成功')
  } catch (error) {
    if (error.message) {
      showToast(error.message)
    }
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  loadUserProfile()
}

const changePassword = async () => {
  try {
    await passwordFormRef.value.validate()
    passwordLoading.value = true

    await userAPI.changePassword(passwordForm)
    showToast('密码修改成功')
    showPasswordDialog.value = false
    Object.assign(passwordForm, {
      oldPassword: '',
      newPassword: '',
      confirmPassword: '',
    })
  } catch (error) {
    showToast(error.message || '密码修改失败')
  } finally {
    passwordLoading.value = false
  }
}

// 头像上传处理
const handleAvatarUpload = async (file) => {
  // 验证文件类型和大小
  const isJPG = file.type === 'image/jpeg' || file.type === 'image/png'
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isJPG) {
    showToast('头像图片只能是 JPG/PNG 格式!')
    return
  }
  if (!isLt2M) {
    showToast('头像图片大小不能超过 2MB!')
    return
  }

  try {
    const formData = new FormData()
    formData.append('avatar', file.file)

    const response = await userAPI.uploadAvatar(formData)
    if (response.success) {
      form.avatar = response.data.avatar
      userStore.updateUser({ avatar: response.data.avatar })
      showToast('头像更新成功')
    } else {
      showToast(response.message || '头像上传失败')
    }
  } catch (error) {
    showToast('头像上传失败')
  }
}

// 表单验证函数
const validateConfirmPassword = (value) => {
  if (value !== passwordForm.newPassword) {
    return '两次输入的密码不一致'
  }
  return true
}

// 性别和年级选择器数据
const showGenderPicker = ref(false)
const showGradePicker = ref(false)

const genderOptions = [
  { text: '男', value: 'male' },
  { text: '女', value: 'female' },
  { text: '其他', value: 'other' },
]

const gradeOptions = [
  { text: '大一', value: 'freshman' },
  { text: '大二', value: 'sophomore' },
  { text: '大三', value: 'junior' },
  { text: '大四', value: 'senior' },
  { text: '研一', value: 'master1' },
  { text: '研二', value: 'master2' },
  { text: '研三', value: 'master3' },
  { text: '博士', value: 'phd' },
]

const getGenderText = (value) => {
  const option = genderOptions.find((item) => item.value === value)
  return option ? option.text : '请选择性别'
}

const getGradeText = (value) => {
  const option = gradeOptions.find((item) => item.value === value)
  return option ? option.text : '请选择年级'
}

const onGenderConfirm = ({ selectedOptions }) => {
  form.gender = selectedOptions[0].value
  showGenderPicker.value = false
}

const onGradeConfirm = ({ selectedOptions }) => {
  form.grade = selectedOptions[0].value
  showGradePicker.value = false
}

// 技能标签管理
const removeSkill = (skill) => {
  const index = form.skills.indexOf(skill)
  if (index > -1) {
    form.skills.splice(index, 1)
  }
}

const showInput = () => {
  inputVisible.value = true
  nextTick(() => {
    inputRef.value?.input?.focus()
  })
}

const handleInputConfirm = () => {
  if (inputValue.value && !form.skills.includes(inputValue.value)) {
    form.skills.push(inputValue.value)
  }
  inputVisible.value = false
  inputValue.value = ''
}
</script>

<style scoped>
.user-profile {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.profile-content {
  display: flex;
  gap: 40px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
  min-width: 160px;
}

.profile-form {
  flex: 1;
}

.skill-tag {
  margin-right: 8px;
  margin-bottom: 8px;
}

.skill-input {
  width: 100px;
}

.security-card {
  margin-top: 20px;
}

.security-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
}

.security-info h4 {
  margin: 0 0 5px 0;
  color: #303133;
}

.security-info p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

@media (max-width: 768px) {
  .profile-content {
    flex-direction: column;
    gap: 20px;
  }

  .security-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }
}
</style>
