<template>
  <div class="login-page">
    <!-- 背景动画 -->
    <div class="bg-animation">
      <div class="gradient-orb orb-1"></div>
      <div class="gradient-orb orb-2"></div>
      <div class="gradient-orb orb-3"></div>
      <div class="grid-pattern"></div>
    </div>

    <div class="login-container">
      <!-- 登录卡片 -->
      <div class="login-card">
        <!-- 左侧品牌区 -->
        <div class="brand-section">
          <div class="brand-content">
            <div class="logo">
              <el-icon :size="48"><School /></el-icon>
            </div>
            <h1>哈尔滨学院生活服务平台</h1>
            <p>Harbin University Admin</p>
            <div class="brand-features">
              <div class="feature-item">
                <el-icon><DataBoard /></el-icon>
                <span>数据看板</span>
              </div>
              <div class="feature-item">
                <el-icon><TrendCharts /></el-icon>
                <span>智能分析</span>
              </div>
              <div class="feature-item">
                <el-icon><Setting /></el-icon>
                <span>系统管理</span>
              </div>
            </div>
          </div>
          <div class="brand-decoration">
            <div class="decoration-circle circle-1"></div>
            <div class="decoration-circle circle-2"></div>
            <div class="decoration-circle circle-3"></div>
          </div>
        </div>

        <!-- 右侧登录表单 -->
        <div class="form-section">
          <div class="form-header">
            <h2>欢迎回来</h2>
            <p>请选择登录身份并输入对应账号信息</p>
          </div>

          <div class="login-type-switch">
            <button
              type="button"
              class="type-chip"
              :class="{ active: loginType === 'admin' }"
              @click="switchLoginType('admin')"
            >
              管理员登录
            </button>
            <button
              type="button"
              class="type-chip"
              :class="{ active: loginType === 'service' }"
              @click="switchLoginType('service')"
            >
              客服登录
            </button>
          </div>

          <el-form
            ref="loginFormRef"
            :model="loginForm"
            :rules="loginRules"
            class="login-form-content"
            @submit.prevent="handleLogin"
          >
            <el-form-item prop="username">
              <div class="input-wrapper">
                <el-icon class="input-icon"><User /></el-icon>
                <el-input
                  v-model="loginForm.username"
                  placeholder="请输入用户名"
                  size="large"
                  clearable
                />
              </div>
            </el-form-item>

            <el-form-item prop="password">
              <div class="input-wrapper">
                <el-icon class="input-icon"><Lock /></el-icon>
                <el-input
                  v-model="loginForm.password"
                  type="password"
                  placeholder="请输入密码"
                  size="large"
                  show-password
                  clearable
                  @keyup.enter="handleLogin"
                />
              </div>
            </el-form-item>

            <div class="form-options">
              <el-checkbox v-model="rememberMe">记住我</el-checkbox>
              <el-link type="primary" :underline="false">忘记密码？</el-link>
            </div>

            <el-form-item>
              <el-button
                type="primary"
                size="large"
                :loading="loading"
                @click="handleLogin"
                class="login-btn"
              >
                <span v-if="!loading">
                  <el-icon><Unlock /></el-icon>
                  登 录
                </span>
                <span v-else>登录中...</span>
              </el-button>
            </el-form-item>
          </el-form>

          <div class="form-footer">
            <p>© 2024 哈尔滨学院校园综合服务平台</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { authApi, serviceAuthApi } from '../api/index.js'
import { useAdminStore } from '@/stores/admin'
import { School, DataBoard, TrendCharts, User, Lock, Unlock } from '@element-plus/icons-vue'

const router = useRouter()
const adminStore = useAdminStore()
const loginFormRef = ref()
const loginType = ref('admin')

const loginForm = reactive({
  username: '',
  password: '',
})

const rememberMe = ref(false)
const loading = ref(false)

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, max: 20, message: '用户名长度在 3 到 20 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' },
  ],
}

const handleLogin = async () => {
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return

    loading.value = true

    const response = await (loginType.value === 'service' ? serviceAuthApi.login : authApi.login)({
      username: loginForm.username,
      password: loginForm.password,
    })

    if (response.success) {
      const normalizedUser = {
        ...response.data.user,
        role: loginType.value,
      }

      adminStore.setUserType(loginType.value)
      adminStore.setToken(response.data.token)
      adminStore.setAdmin(normalizedUser)
      localStorage.setItem('admin_user', JSON.stringify(normalizedUser))

      if (rememberMe.value) {
        localStorage.setItem('remember_admin', 'true')
      }

      ElMessage.success('登录成功')
      router.push(loginType.value === 'service' ? '/service/chat' : '/dashboard')
    } else {
      ElMessage.error(response.message || '登录失败')
    }
  } catch (error) {
    console.error('登录错误:', error)
    ElMessage.error(error.message || '登录失败，请重试')
  } finally {
    loading.value = false
  }
}

const switchLoginType = (type) => {
  loginType.value = type
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  background: #0f172a;
}

/* 背景动画 */
.bg-animation {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.gradient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 20s ease-in-out infinite;
}

.orb-1 {
  width: 600px;
  height: 600px;
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  top: -200px;
  left: -100px;
}

.orb-2 {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
  bottom: -150px;
  right: -100px;
  animation-delay: -5s;
}

.orb-3 {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #10b981 0%, #6366f1 100%);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: -10s;
  opacity: 0.3;
}

@keyframes float {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -30px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.02);
  }
}

.grid-pattern {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
}

/* 登录容器 */
.login-container {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 960px;
  padding: 20px;
}

/* 登录卡片 */
.login-card {
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow:
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 255, 255, 0.1);
  min-height: 560px;
}

/* 左侧品牌区 */
.brand-section {
  flex: 1;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  position: relative;
  overflow: hidden;
}

.brand-content {
  position: relative;
  z-index: 2;
  text-align: center;
}

.logo {
  width: 96px;
  height: 96px;
  background: linear-gradient(135deg, #6366f1 0%, #a78bfa 100%);
  border-radius: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  color: white;
  box-shadow: 0 8px 32px rgba(99, 102, 241, 0.4);
}

.brand-section h1 {
  font-size: 1.75rem;
  font-weight: 700;
  color: white;
  margin: 0 0 8px;
  font-family: 'Fira Code', monospace;
}

.brand-section > .brand-content > p {
  font-size: 0.9rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0 0 40px;
  letter-spacing: 2px;
}

.brand-features {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.feature-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.8rem;
}

.feature-item .el-icon {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 品牌装饰 */
.brand-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -50px;
}

.circle-2 {
  width: 200px;
  height: 200px;
  bottom: -50px;
  left: -50px;
}

.circle-3 {
  width: 150px;
  height: 150px;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-color: rgba(99, 102, 241, 0.3);
}

/* 右侧表单区 */
.form-section {
  flex: 1;
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.form-header {
  text-align: center;
  margin-bottom: 36px;
}

.form-header h2 {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0 0 8px;
}

.form-header p {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.login-type-switch {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
}

.type-chip {
  flex: 1;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(99, 102, 241, 0.16);
  background: rgba(255, 255, 255, 0.88);
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 600;
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease;
}

.type-chip.active {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  border-color: transparent;
  color: #fff;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.22);
}

/* 输入框包装 */
.input-wrapper {
  position: relative;
  width: 100%;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
  color: var(--text-tertiary);
  font-size: 18px;
}

.input-wrapper :deep(.el-input__wrapper) {
  padding: 8px 16px 8px 44px;
  border-radius: 12px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  box-shadow: none;
  transition: all 0.2s ease;
}

.input-wrapper :deep(.el-input__wrapper:hover) {
  border-color: var(--primary-light);
}

.input-wrapper :deep(.el-input__wrapper.is-focus) {
  border-color: var(--primary);
  background: white;
  box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
}

/* 表单选项 */
.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

/* 登录按钮 */
.login-btn {
  width: 100%;
  height: 52px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #3172e4 0%, #338ed9 100%);
  border: none;
  box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
  transition: all 0.3s ease;
}

.login-btn:hover {
  /* transform: translateY(-2px); */
  box-shadow: 0 8px 10px rgba(99, 102, 241, 0.5);
}

.login-btn:active {
  transform: translateY(0);
}

.login-btn .el-icon {
  margin-right: 8px;
}

/* 表单底部 */
.form-footer {
  text-align: center;
  margin-top: 32px;
}

.form-footer p {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  margin: 0;
}

/* 响应式 */
@media (max-width: 768px) {
  .login-card {
    flex-direction: column;
    min-height: auto;
  }

  .brand-section {
    padding: 32px;
  }

  .logo {
    width: 72px;
    height: 72px;
    border-radius: 20px;
  }

  .brand-section h1 {
    font-size: 1.5rem;
  }

  .brand-features {
    gap: 16px;
  }

  .feature-item {
    font-size: 0.7rem;
  }

  .form-section {
    padding: 32px 24px;
  }

  .form-header h2 {
    font-size: 1.5rem;
  }
}
</style>
