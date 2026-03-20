<template>
    <div class="ios-login-container" :class="{ 'dark-mode': isDarkMode }">
        <!-- iOS风格状态栏 -->
        <div class="ios-status-bar">
            <div class="status-time">{{ currentTime }}</div>
            <div class="status-indicators">
                <div class="signal-icon"></div>
                <div class="wifi-icon"></div>
                <div class="battery-icon">
                    <div class="battery-level"></div>
                </div>
            </div>
        </div>

        <!-- 导航栏 -->
        <div class="ios-nav-bar">
            <div class="nav-back" @click="goBack">
                <NIcon size="24">
                    <ChevronBackOutline />
                </NIcon>
            </div>
            <div class="nav-title">登录</div>
            <div class="nav-action"></div>
        </div>

        <!-- 滚动内容区域 -->
        <div class="ios-scroll-view">
            <!-- 品牌标识区域 -->
            <div class="ios-brand-section">
                <div class="brand-logo">
                    <NIcon size="80" color="var(--ios-primary-color)">
                        <SchoolIcon />
                    </NIcon>
                </div>
                <h1 class="brand-title">哈尔滨学院</h1>
                <p class="brand-subtitle">校园服务平台</p>
                <p class="brand-description">让校园生活更便捷</p>
            </div>

            <!-- iOS风格表单 -->
            <div class="ios-form-section">
                <div class="ios-form-group">
                    <div class="ios-form-header">
                        <h2>登录您的账户</h2>
                        <p>请输入您的登录凭据</p>
                    </div>

                    <!-- 账号输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <PersonOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.email"
                                type="text"
                                class="ios-input"
                                placeholder="邮箱、手机号或学号"
                                autocomplete="username"
                                :class="{ 'has-error': emailError }"
                                @blur="validateEmail"
                                @focus="clearEmailError"
                            />
                            <div v-if="formData.email" class="ios-input-clear" @click="clearEmail">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <CloseCircleOutline />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="emailError" class="ios-error-text">{{ emailError }}</div>
                    </div>

                    <!-- 密码输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <LockClosedOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.password"
                                :type="showPassword ? 'text' : 'password'"
                                class="ios-input"
                                placeholder="密码"
                                autocomplete="current-password"
                                :class="{ 'has-error': passwordError }"
                                @blur="validatePassword"
                                @focus="clearPasswordError"
                                @keydown.enter="handleLogin"
                            />
                            <div class="ios-input-toggle" @click="togglePassword">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <EyeOutline v-if="!showPassword" />
                                    <EyeOffOutline v-else />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="passwordError" class="ios-error-text">{{ passwordError }}</div>
                    </div>

                    <!-- 记住我和忘记密码 -->
                    <div class="ios-form-options">
                        <div class="ios-checkbox-group" @click="toggleRememberMe">
                            <div class="ios-checkbox" :class="{ checked: rememberMe }">
                                <NIcon v-if="rememberMe" size="12" color="white">
                                    <CheckmarkOutline />
                                </NIcon>
                            </div>
                            <span class="ios-checkbox-label">记住我</span>
                        </div>
                        <button
                            type="button"
                            class="ios-link-button"
                            @click="$router.push('/auth/forgot-password')"
                        >
                            忘记密码？
                        </button>
                    </div>

                    <!-- 登录按钮 -->
                    <div class="ios-button-group">
                        <button
                            type="button"
                            class="ios-primary-button"
                            :class="{ loading: isLoading }"
                            :disabled="isLoading || !isFormValid"
                            @click="handleLogin"
                        >
                            <div v-if="isLoading" class="ios-loading-spinner"></div>
                            <span v-else>登录</span>
                        </button>
                    </div>

                    <!-- 分割线 -->
                    <div class="ios-divider">
                        <span>或者</span>
                    </div>

                    <!-- 微信登录 -->
                    <div class="ios-button-group">
                        <button
                            type="button"
                            class="ios-secondary-button ios-wechat-button"
                            :disabled="wechatLoading"
                            @click="handleWechatLogin"
                        >
                            <div class="ios-button-icon">
                                <NIcon size="20" color="#07C160">
                                    <LogoWechat />
                                </NIcon>
                            </div>
                            <span>使用微信登录</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 注册链接 -->
            <div class="ios-footer-section">
                <p class="ios-footer-text">
                    还没有账户？
                    <button
                        type="button"
                        class="ios-link-button"
                        @click="$router.push('/auth/register')"
                    >
                        立即注册
                    </button>
                </p>
            </div>

            <!-- 底部安全区域 -->
            <div class="ios-safe-area-bottom"></div>
        </div>

        <!-- iOS风格加载覆盖层 -->
        <div v-if="isLoading" class="ios-loading-overlay">
            <div class="ios-loading-content">
                <div class="ios-loading-spinner large"></div>
                <p class="ios-loading-text">正在登录...</p>
            </div>
        </div>

        <!-- iOS风格提示消息 -->
        <Transition name="ios-toast">
            <div v-if="toastMessage" class="ios-toast" :class="toastType">
                <NIcon size="16" color="white">
                    <CheckmarkCircleOutline v-if="toastType === 'success'" />
                    <CloseCircleOutline v-else />
                </NIcon>
                <span>{{ toastMessage }}</span>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import {
    SchoolOutline as SchoolIcon,
    PersonOutline,
    LockClosedOutline,
    EyeOutline,
    EyeOffOutline,
    CheckmarkOutline,
    CloseCircleOutline,
    CheckmarkCircleOutline,
    ChevronBackOutline,
    LogoWechat,
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// 响应式数据
const isLoading = ref(false);
const wechatLoading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);
const isDarkMode = ref(false);
const currentTime = ref('');
const emailError = ref('');
const passwordError = ref('');
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

// 表单数据
const formData = reactive({
    email: '',
    password: '',
});

// 计算属性
const isFormValid = computed(() => {
    return (
        formData.email.trim() !== '' &&
        formData.password.trim() !== '' &&
        !emailError.value &&
        !passwordError.value
    );
});

// 时间更新
const updateTime = () => {
    const now = new Date();
    currentTime.value = now.toLocaleTimeString('zh-CN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
};

// 检测暗色主题
const detectDarkMode = () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        isDarkMode.value = savedTheme === 'dark';
    } else {
        isDarkMode.value = window.matchMedia('(prefers-color-scheme: dark)').matches;
    }

    // 更新CSS变量
    document.documentElement.setAttribute('data-theme', isDarkMode.value ? 'dark' : 'light');
};

// 返回操作
const goBack = () => {
    if (window.history.length > 1) {
        router.go(-1);
    } else {
        router.push('/');
    }
};

// 表单验证
const validateEmail = () => {
    const email = formData.email.trim();
    if (!email) {
        emailError.value = '请输入邮箱、手机号或学号';
        return false;
    }

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // 手机号格式验证 (中国大陆手机号)
    const phoneRegex = /^1[3-9]\d{9}$/;
    // 学号格式验证 (假设为8-12位数字或字母数字组合)
    const studentIdRegex = /^[A-Za-z0-9]{8,12}$/;

    if (!emailRegex.test(email) && !phoneRegex.test(email) && !studentIdRegex.test(email)) {
        emailError.value = '请输入正确的邮箱、手机号或学号格式';
        return false;
    }

    emailError.value = '';
    return true;
};

const validatePassword = () => {
    const password = formData.password.trim();
    if (!password) {
        passwordError.value = '请输入密码';
        return false;
    }

    if (password.length < 6) {
        passwordError.value = '密码长度至少6位';
        return false;
    }

    passwordError.value = '';
    return true;
};

// 清除错误状态
const clearEmailError = () => {
    emailError.value = '';
};

const clearPasswordError = () => {
    passwordError.value = '';
};

// 清除输入
const clearEmail = () => {
    formData.email = '';
    emailError.value = '';
};

// 切换密码显示
const togglePassword = () => {
    showPassword.value = !showPassword.value;
};

// 切换记住我
const toggleRememberMe = () => {
    rememberMe.value = !rememberMe.value;
    // 触觉反馈
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
};

// 显示提示消息
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message;
    toastType.value = type;

    setTimeout(() => {
        toastMessage.value = '';
    }, 3000);
};

// 登录处理
const handleLogin = async () => {
    // 验证表单
    const isEmailValid = validateEmail();
    const isPasswordValid = validatePassword();

    if (!isEmailValid || !isPasswordValid) {
        return;
    }

    isLoading.value = true;

    try {
        const result = await userStore.login(formData);

        if (result) {
            // 处理"记住我"功能
            if (rememberMe.value) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            showToast('登录成功！', 'success');

            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
                const redirectPath = (route.query.redirect as string) || '/';
                router.push(redirectPath);
            }, 1000);
        }
    } catch (error: any) {
        let errorMessage = '登录失败，请重试';

        if (error?.response?.data?.message) {
            errorMessage = error.response.data.message;
        } else if (error?.message) {
            errorMessage = error.message;
        }

        showToast(errorMessage, 'error');
    } finally {
        isLoading.value = false;
    }
};

// 微信登录处理
const handleWechatLogin = async () => {
    wechatLoading.value = true;
    try {
        // 这里实现微信登录逻辑
        showToast('微信登录功能开发中...', 'error');
    } catch (error) {
        showToast('微信登录失败', 'error');
    } finally {
        wechatLoading.value = false;
    }
};

// 生命周期
onMounted(() => {
    detectDarkMode();
    updateTime();

    // 定时更新时间
    const timeInterval = setInterval(updateTime, 1000);

    // 监听主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectDarkMode);

    // 恢复记住的登录信息
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        formData.email = savedEmail;
        rememberMe.value = true;
    }

    // 清理函数
    onUnmounted(() => {
        clearInterval(timeInterval);
        mediaQuery.removeEventListener('change', detectDarkMode);
    });
});
</script>

<style scoped>
/* iOS风格CSS变量 */
:root {
    /* 亮色主题 */
    --ios-bg-primary: #f2f2f7;
    --ios-bg-secondary: #ffffff;
    --ios-bg-tertiary: #f2f2f7;
    --ios-primary-color: #007aff;
    --ios-primary-text: #000000;
    --ios-secondary-text: #8e8e93;
    --ios-tertiary-text: #c7c7cc;
    --ios-border-color: #c6c6c8;
    --ios-error-color: #ff3b30;
    --ios-success-color: #34c759;
    --ios-warning-color: #ff9500;
    --ios-separator: #c6c6c8;
    --ios-overlay: rgba(0, 0, 0, 0.4);
}

[data-theme='dark'] {
    /* 暗色主题 */
    --ios-bg-primary: #000000;
    --ios-bg-secondary: #1c1c1e;
    --ios-bg-tertiary: #2c2c2e;
    --ios-primary-color: #0a84ff;
    --ios-primary-text: #ffffff;
    --ios-secondary-text: #8e8e93;
    --ios-tertiary-text: #48484a;
    --ios-border-color: #38383a;
    --ios-error-color: #ff453a;
    --ios-success-color: #30d158;
    --ios-warning-color: #ff9f0a;
    --ios-separator: #38383a;
    --ios-overlay: rgba(0, 0, 0, 0.6);
}

/* 主容器 */
.ios-login-container {
    min-height: 100vh;
    background: var(--ios-bg-primary);
    display: flex;
    flex-direction: column;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
}

/* iOS状态栏 */
.ios-status-bar {
    height: 44px;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--ios-bg-secondary);
    font-size: 17px;
    font-weight: 600;
    color: var(--ios-primary-text);
    position: sticky;
    top: 0;
    z-index: 100;
}

.status-time {
    font-variant-numeric: tabular-nums;
}

.status-indicators {
    display: flex;
    align-items: center;
    gap: 4px;
}

.signal-icon,
.wifi-icon {
    width: 18px;
    height: 12px;
    background: var(--ios-primary-text);
    border-radius: 2px;
    opacity: 0.8;
}

.battery-icon {
    width: 24px;
    height: 12px;
    border: 1px solid var(--ios-primary-text);
    border-radius: 2px;
    position: relative;
    opacity: 0.8;
}

.battery-icon::after {
    content: '';
    position: absolute;
    right: -3px;
    top: 3px;
    width: 2px;
    height: 6px;
    background: var(--ios-primary-text);
    border-radius: 0 1px 1px 0;
}

.battery-level {
    position: absolute;
    left: 1px;
    top: 1px;
    bottom: 1px;
    width: 70%;
    background: var(--ios-success-color);
    border-radius: 1px;
}

/* iOS导航栏 */
.ios-nav-bar {
    height: 44px;
    padding: 0 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: var(--ios-bg-secondary);
    border-bottom: 0.5px solid var(--ios-separator);
    position: sticky;
    top: 44px;
    z-index: 99;
}

.nav-back {
    width: 44px;
    height: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--ios-primary-color);
    cursor: pointer;
    transition: opacity 0.2s ease;
}

.nav-back:active {
    opacity: 0.3;
}

.nav-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--ios-primary-text);
}

.nav-action {
    width: 44px;
    height: 44px;
}

/* 滚动视图 */
.ios-scroll-view {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

/* 品牌区域 */
.ios-brand-section {
    padding: 60px 20px 40px;
    text-align: center;
    background: var(--ios-bg-secondary);
}

.brand-logo {
    margin-bottom: 20px;
}

.brand-title {
    font-size: 32px;
    font-weight: 700;
    color: var(--ios-primary-text);
    margin: 0 0 8px 0;
}

.brand-subtitle {
    font-size: 20px;
    font-weight: 600;
    color: var(--ios-secondary-text);
    margin: 0 0 8px 0;
}

.brand-description {
    font-size: 16px;
    color: var(--ios-secondary-text);
    margin: 0;
}

/* 表单区域 */
.ios-form-section {
    padding: 20px;
}

.ios-form-group {
    background: var(--ios-bg-secondary);
    border-radius: 12px;
    padding: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ios-form-header {
    margin-bottom: 30px;
    text-align: center;
}

.ios-form-header h2 {
    font-size: 24px;
    font-weight: 700;
    color: var(--ios-primary-text);
    margin: 0 0 8px 0;
}

.ios-form-header p {
    font-size: 16px;
    color: var(--ios-secondary-text);
    margin: 0;
}

/* 输入组 */
.ios-input-group {
    margin-bottom: 20px;
}

.ios-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--ios-bg-tertiary);
    border: 1px solid var(--ios-border-color);
    border-radius: 12px;
    padding: 0 16px;
    height: 50px;
    transition: all 0.2s ease;
}

.ios-input-wrapper:focus-within {
    border-color: var(--ios-primary-color);
    box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.1);
}

.ios-input-wrapper.has-error {
    border-color: var(--ios-error-color);
}

.ios-input-icon {
    margin-right: 12px;
    flex-shrink: 0;
}

.ios-input {
    flex: 1;
    border: none;
    background: transparent;
    font-size: 16px;
    color: var(--ios-primary-text);
    outline: none;
    height: 100%;
}

.ios-input::placeholder {
    color: var(--ios-secondary-text);
}

.ios-input-clear,
.ios-input-toggle {
    margin-left: 8px;
    padding: 8px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    transition: background-color 0.2s ease;
}

.ios-input-clear:active,
.ios-input-toggle:active {
    background-color: var(--ios-border-color);
}

.ios-error-text {
    font-size: 14px;
    color: var(--ios-error-color);
    margin-top: 8px;
    padding-left: 16px;
}

/* 表单选项 */
.ios-form-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30px;
}

.ios-checkbox-group {
    display: flex;
    align-items: center;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.ios-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--ios-border-color);
    border-radius: 4px;
    margin-right: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
}

.ios-checkbox.checked {
    background: var(--ios-primary-color);
    border-color: var(--ios-primary-color);
}

.ios-checkbox-label {
    font-size: 16px;
    color: var(--ios-primary-text);
}

.ios-link-button {
    background: transparent;
    border: none;
    color: var(--ios-primary-color);
    font-size: 16px;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.ios-link-button:active {
    opacity: 0.3;
    background-color: var(--ios-border-color);
}

/* 按钮组 */
.ios-button-group {
    margin-bottom: 20px;
}

.ios-primary-button,
.ios-secondary-button {
    width: 100%;
    height: 50px;
    border: none;
    border-radius: 12px;
    font-size: 17px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.ios-primary-button {
    background: var(--ios-primary-color);
    color: white;
}

.ios-primary-button:active {
    transform: scale(0.98);
    opacity: 0.8;
}

.ios-primary-button:disabled {
    background: var(--ios-tertiary-text);
    cursor: not-allowed;
    transform: none;
    opacity: 1;
}

.ios-secondary-button {
    background: var(--ios-bg-tertiary);
    color: var(--ios-primary-text);
    border: 1px solid var(--ios-border-color);
}

.ios-secondary-button:active {
    transform: scale(0.98);
    background-color: var(--ios-border-color);
}

.ios-wechat-button {
    color: #07c160;
}

.ios-button-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

/* 分割线 */
.ios-divider {
    display: flex;
    align-items: center;
    margin: 30px 0;
    color: var(--ios-secondary-text);
}

.ios-divider::before,
.ios-divider::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--ios-separator);
}

.ios-divider span {
    padding: 0 16px;
    font-size: 14px;
}

/* 底部区域 */
.ios-footer-section {
    padding: 40px 20px 20px;
    text-align: center;
}

.ios-footer-text {
    font-size: 16px;
    color: var(--ios-secondary-text);
    margin: 0;
}

.ios-safe-area-bottom {
    height: env(safe-area-inset-bottom, 34px);
}

/* 加载状态 */
.ios-loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: ios-spin 1s linear infinite;
}

.ios-loading-spinner.large {
    width: 40px;
    height: 40px;
    border-width: 3px;
}

@keyframes ios-spin {
    to {
        transform: rotate(360deg);
    }
}

.ios-loading-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--ios-overlay);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 200;
}

.ios-loading-content {
    background: var(--ios-bg-secondary);
    border-radius: 16px;
    padding: 30px;
    text-align: center;
    min-width: 120px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.ios-loading-text {
    font-size: 16px;
    color: var(--ios-primary-text);
    margin: 16px 0 0 0;
}

/* Toast消息 */
.ios-toast {
    position: fixed;
    top: 100px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 20px;
    border-radius: 20px;
    font-size: 16px;
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
    z-index: 300;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
}

.ios-toast.success {
    background: rgba(52, 199, 89, 0.9);
}

.ios-toast.error {
    background: rgba(255, 59, 48, 0.9);
}

/* Toast动画 */
.ios-toast-enter-active {
    transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.ios-toast-leave-active {
    transition: all 0.3s ease;
}

.ios-toast-enter-from {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
}

.ios-toast-leave-to {
    opacity: 0;
    transform: translateX(-50%) translateY(-20px) scale(0.9);
}

/* 暗色模式优化 */
.dark-mode .ios-primary-button {
    background: var(--ios-primary-color);
}

.dark-mode .ios-secondary-button {
    background: var(--ios-bg-tertiary);
    border-color: var(--ios-border-color);
}

/* 适配不同屏幕尺寸 */
@media (max-width: 375px) {
    .ios-brand-section {
        padding: 40px 20px 30px;
    }

    .brand-title {
        font-size: 28px;
    }

    .brand-subtitle {
        font-size: 18px;
    }

    .ios-form-header h2 {
        font-size: 20px;
    }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
    .ios-brand-section {
        padding: 20px 20px 20px;
    }

    .brand-logo {
        margin-bottom: 10px;
    }

    .brand-logo .n-icon {
        font-size: 60px !important;
    }

    .brand-title {
        font-size: 24px;
    }

    .brand-subtitle {
        font-size: 16px;
    }
}

/* 支持触摸设备的优化 */
@media (hover: none) and (pointer: coarse) {
    .ios-input-wrapper:focus-within {
        transform: none;
    }

    .ios-primary-button:active,
    .ios-secondary-button:active {
        transform: scale(0.95);
    }
}
</style>
