<template>
  <div class="register-page">
    <van-nav-bar title="注册" left-arrow @click-left="goBack" />

    <div class="register-container">
      <div class="register-header">
        <h1>加入哈尔滨学院校园综合服务平台</h1>
        <p>为您提供便捷的校园生活服务</p>
      </div>

      <van-form @submit="handleRegister" class="register-form">
        <van-cell-group>
          <van-field
            v-model="registerForm.student_id"
            name="student_id"
            label="学号"
            placeholder="请输入学号"
            required
            :rules="[{ required: true, message: '请输入学号' }]"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="id-card-o" />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.username"
            name="username"
            label="用户名"
            placeholder="请输入用户名"
            required
            :rules="[{ required: true, message: '请输入用户名' }]"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="contact" />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.email"
            name="email"
            label="邮箱"
            placeholder="请输入邮箱"
            type="email"
            required
            :rules="[{ required: true, message: '请输入邮箱' }]"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="envelop-o" />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :type="showPassword ? 'text' : 'password'"
            required
            :rules="[{ required: true, message: '请输入密码' }]"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="lock" />
            </template>
            <template #right-icon>
              <van-icon
                :name="showPassword ? 'eye-o' : 'closed-eye'"
                @click="showPassword = !showPassword"
              />
            </template>
          </van-field>

          <van-field
            v-model="confirmPassword"
            name="confirmPassword"
            label="确认密码"
            placeholder="请再次输入密码"
            :type="showConfirmPassword ? 'text' : 'password'"
            required
            :rules="[{ required: true, message: '请再次输入密码' }]"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="lock" />
            </template>
            <template #right-icon>
              <van-icon
                :name="showConfirmPassword ? 'eye-o' : 'closed-eye'"
                @click="showConfirmPassword = !showConfirmPassword"
              />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.phone"
            name="phone"
            label="手机号"
            placeholder="请输入手机号"
            type="tel"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="phone-o" />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.real_name"
            name="real_name"
            label="真实姓名"
            placeholder="请输入真实姓名"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="contact" />
            </template>
          </van-field>

          <van-field
            v-model="collegeText"
            name="college"
            label="学院"
            placeholder="请选择学院"
            readonly
            is-link
            @click="showCollegePicker = true"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="home-o" />
            </template>
          </van-field>

          <van-field
            v-model="registerForm.major"
            name="major"
            label="专业"
            placeholder="请输入专业"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="bookmark-o" />
            </template>
          </van-field>

          <van-field
            v-model="gradeText"
            name="grade"
            label="年级"
            placeholder="请选择年级"
            readonly
            is-link
            @click="showGradePicker = true"
            :disabled="userStore.loading"
          >
            <template #left-icon>
              <van-icon name="calendar-o" />
            </template>
          </van-field>
        </van-cell-group>

        <div class="form-agreement">
          <van-checkbox v-model="agreeTerms" shape="square" required>
            我已阅读并同意
            <router-link to="/terms" target="_blank">用户协议</router-link>
            和
            <router-link to="/privacy" target="_blank">隐私政策</router-link>
          </van-checkbox>
        </div>

        <van-notice-bar
          v-if="userStore.error"
          type="danger"
          :text="userStore.error"
          background="#fef0f0"
          color="#f56c6c"
          class="error-notice"
        />

        <van-notice-bar
          v-if="passwordMismatch"
          type="warning"
          text="两次输入的密码不一致"
          background="#fff3cd"
          color="#856404"
          class="error-notice"
        />

        <van-button
          type="primary"
          native-type="submit"
          size="large"
          block
          :loading="userStore.loading"
          loading-text="注册中..."
          :disabled="!isFormValid"
          class="register-btn"
        >
          注册
        </van-button>
      </van-form>

      <div class="register-footer">
        <p>
          已有账号？
          <router-link to="/login">立即登录</router-link>
        </p>
      </div>
    </div>

    <!-- 学院选择器 -->
    <van-popup v-model:show="showCollegePicker" position="bottom">
      <van-picker
        :columns="collegeOptions"
        @confirm="onCollegeConfirm"
        @cancel="showCollegePicker = false"
        title="选择学院"
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const router = useRouter()
const userStore = useUserStore()

const showPassword = ref(false)
const showConfirmPassword = ref(false)
const showCollegePicker = ref(false)
const showGradePicker = ref(false)

const registerForm = ref({
  student_id: '',
  username: '',
  email: '',
  password: '',
  phone: '',
  real_name: '',
  college: '',
  major: '',
  grade: '',
})

const confirmPassword = ref('')
const agreeTerms = ref(false)

const collegeOptions = [
  { text: '计算机科学与技术学院', value: '计算机科学与技术学院' },
  { text: '外国语学院', value: '外国语学院' },
  { text: '经济管理学院', value: '经济管理学院' },
  { text: '艺术学院', value: '艺术学院' },
  { text: '体育学院', value: '体育学院' },
  { text: '其他', value: '其他' },
]

const gradeOptions = [
  { text: '2024级', value: '2024' },
  { text: '2023级', value: '2023' },
  { text: '2022级', value: '2022' },
  { text: '2021级', value: '2021' },
  { text: '2020级', value: '2020' },
]

const collegeText = computed(() => {
  const college = collegeOptions.find((c) => c.value === registerForm.value.college)
  return college ? college.text : ''
})

const gradeText = computed(() => {
  const grade = gradeOptions.find((g) => g.value === registerForm.value.grade)
  return grade ? grade.text : ''
})

// 表单验证
const isFormValid = computed(() => {
  return (
    registerForm.value.student_id &&
    registerForm.value.username &&
    registerForm.value.email &&
    registerForm.value.password &&
    confirmPassword.value &&
    !passwordMismatch.value &&
    agreeTerms.value
  )
})

const passwordMismatch = computed(() => {
  return confirmPassword.value && registerForm.value.password !== confirmPassword.value
})

function goBack() {
  router.push('/login')
}

function onCollegeConfirm({ selectedOptions }) {
  registerForm.value.college = selectedOptions[0].value
  showCollegePicker.value = false
}

function onGradeConfirm({ selectedOptions }) {
  registerForm.value.grade = selectedOptions[0].value
  showGradePicker.value = false
}

const handleRegister = async () => {
  if (!isFormValid.value) return

  try {
    await userStore.register(registerForm.value)
    showToast('注册成功')
    router.push('/')
  } catch (error) {
    console.error('注册失败:', error)
    showToast('注册失败，请重试')
  }
}
onMounted(() => {
  userStore.clearError()
})
</script>

<style scoped>
.register-page {
  background: #f7f8fa;
  min-height: 100vh;
}

.register-container {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
  padding: 20px;
}

.register-header h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.register-header p {
  color: #646566;
  font-size: 0.9rem;
}

.register-form {
  margin-bottom: 30px;
}

.form-agreement {
  padding: 16px;
  margin: 16px 0;
}

.form-agreement a {
  color: #1989fa;
  text-decoration: none;
}

.form-agreement a:hover {
  text-decoration: underline;
}

.error-notice {
  margin: 16px;
}

.register-btn {
  margin: 16px;
}

.register-footer {
  text-align: center;
  padding: 20px;
}

.register-footer p {
  color: #646566;
  font-size: 14px;
}

.register-footer a {
  color: #1989fa;
  text-decoration: none;
  font-weight: 500;
}

.register-footer a:hover {
  text-decoration: underline;
}

:deep(.van-field__left-icon) {
  color: #1989fa;
  margin-right: 8px;
}

:deep(.van-field__right-icon) {
  color: #969799;
  cursor: pointer;
}

:deep(.van-checkbox__label) {
  color: #646566;
  font-size: 14px;
  line-height: 1.5;
}
</style>
