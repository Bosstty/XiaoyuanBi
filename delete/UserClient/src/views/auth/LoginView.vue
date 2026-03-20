<template>
  <div class="login-page">
    <van-nav-bar title="登录" left-arrow @click-left="goBack" />

    <div class="login-container">
      <div class="login-header">
        <h1>欢迎回来</h1>
        <p>哈尔滨学院校园综合服务平台</p>
      </div>

      <van-form @submit="handleLogin" class="login-form">
        <van-cell-group>
          <van-field
            v-model="loginForm.email"
            name="email"
            label="邮箱/学号"
            placeholder="请输入邮箱或学号"
            :rules="[{ required: true, message: '请输入邮箱或学号' }]"
            :disabled="userStore.loading"
            required
          >
            <template #left-icon>
              <van-icon name="contact" />
            </template>
          </van-field>

          <van-field
            v-model="loginForm.password"
            name="password"
            label="密码"
            placeholder="请输入密码"
            :type="showPassword ? 'text' : 'password'"
            :rules="[{ required: true, message: '请输入密码' }]"
            :disabled="userStore.loading"
            required
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
        </van-cell-group>

        <div class="form-options">
          <van-checkbox v-model="rememberMe" shape="square">记住我</van-checkbox>
          <van-button type="primary" plain size="mini" @click="goToForgotPassword">
            忘记密码？
          </van-button>
        </div>

        <van-notice-bar
          v-if="userStore.error"
          type="danger"
          :text="userStore.error"
          background="#fef0f0"
          color="#f56c6c"
          class="error-notice"
        />

        <div class="login-actions">
          <van-button
            type="primary"
            size="large"
            block
            :loading="userStore.loading"
            loading-text="登录中..."
            native-type="submit"
            :disabled="!isFormValid"
          >
            登录
          </van-button>
        </div>
      </van-form>

      <div class="login-footer">
        <van-divider>或使用以下方式登录</van-divider>

        <van-button
          type="success"
          size="large"
          block
          :loading="wechatLoading"
          loading-text="登录中..."
          @click="handleWechatLogin"
          class="wechat-btn"
        >
          <template #icon>
            <van-icon name="wechat" />
          </template>
          微信登录
        </van-button>

        <div class="register-link">
          <van-button type="primary" plain size="large" block @click="goToRegister">
            还没有账号？立即注册
          </van-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { showToast } from 'vant'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const showPassword = ref(false)
const wechatLoading = ref(false)

const loginForm = ref({
  email: '',
  password: '',
})

const rememberMe = ref(false)

// 表单验证
const isFormValid = computed(() => {
  return loginForm.value.email && loginForm.value.password
})

function goBack() {
  router.push('/')
}

function goToRegister() {
  router.push('/register')
}

function goToForgotPassword() {
  router.push('/forgot-password')
}

const handleLogin = async () => {
  if (!isFormValid.value) return

  try {
    await userStore.login({
      email: loginForm.value.email,
      password: loginForm.value.password,
    })

    showToast('登录成功')
    const redirectPath = route.query.redirect || '/'
    router.push(redirectPath)
  } catch (error) {
    console.error('登录失败:', error)
    showToast('登录失败，请检查账号密码')
  }
}

const handleWechatLogin = async () => {
  wechatLoading.value = true
  try {
    showToast('微信登录功能待实现')
    console.log('微信登录功能待实现')
  } catch (error) {
    console.error('微信登录失败:', error)
    showToast('微信登录失败')
  } finally {
    wechatLoading.value = false
  }
}
onMounted(() => {
  userStore.clearError()
})
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: #f7f8fa;
}

.login-container {
  padding: 20px;
  max-width: 400px;
  margin: 0 auto;
}

.login-header {
  text-align: center;
  padding: 40px 0 30px;
}

.login-header h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: #323233;
  margin-bottom: 8px;
}

.login-header p {
  color: #646566;
  font-size: 14px;
}

.login-form {
  margin-bottom: 20px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  margin: 16px 0;
}

.error-notice {
  margin: 16px;
}

.login-actions {
  padding: 24px 16px;
}

.login-footer {
  padding: 20px 16px;
}

.wechat-btn {
  margin-bottom: 16px;
}

.register-link {
  margin-top: 16px;
  text-align: center;
}

:deep(.van-field__left-icon) {
  color: #1989fa;
  margin-right: 8px;
}

:deep(.van-field__right-icon) {
  color: #969799;
  cursor: pointer;
}

:deep(.van-field__label) {
  width: 80px;
  font-weight: 500;
  color: #323233;
}

:deep(.van-cell-group) {
  margin: 16px 0;
}

:deep(.van-divider) {
  margin: 24px 0 16px;
  color: #969799;
}

:deep(.van-checkbox__label) {
  color: #646566;
  font-size: 14px;
}
</style>
