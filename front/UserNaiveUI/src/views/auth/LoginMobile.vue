<template>
    <div class="auth-shell auth-shell--login">
        <div class="auth-topbar">
            <button type="button" class="auth-back touch-feedback" aria-label="返回" @click="goBack">
                <NIcon :size="20"><ChevronBackOutline /></NIcon>
            </button>
            <span>校园服务登录</span>
            <button type="button" class="auth-link-btn" @click="router.push('/register')">注册</button>
        </div>

        <section class="auth-hero">
            <div class="auth-hero-badge">
                <NIcon :size="30"><SchoolOutline /></NIcon>
            </div>
            <div>
                <span class="auth-eyebrow">Campus Access</span>
                <h1>登录校园生活服务平台</h1>
                <p>继续查看订单、任务、论坛动态和钱包记录，让你的校园服务进度保持同步。</p>
            </div>
        </section>

        <section class="auth-card">
            <h2 class="auth-section-title">账户登录</h2>

            <div class="auth-field">
                <label class="auth-label" for="login-email">邮箱 / 手机号 / 学号</label>
                <div class="auth-input-wrap" :class="{ 'has-error': !!emailError }">
                    <span class="auth-input-icon">
                        <NIcon :size="18"><PersonOutline /></NIcon>
                    </span>
                    <input
                        id="login-email"
                        v-model="formData.email"
                        class="auth-input"
                        type="text"
                        placeholder="请输入邮箱、手机号或学号"
                        autocomplete="username"
                        @blur="validateEmail"
                        @keydown.enter="handleLogin"
                    />
                    <span v-if="formData.email" class="auth-input-action" @click="formData.email = ''">
                        <NIcon :size="16"><CloseCircleOutline /></NIcon>
                    </span>
                </div>
                <div v-if="emailError" class="auth-error">{{ emailError }}</div>
            </div>

            <div class="auth-field">
                <label class="auth-label" for="login-password">密码</label>
                <div class="auth-input-wrap" :class="{ 'has-error': !!passwordError }">
                    <span class="auth-input-icon">
                        <NIcon :size="18"><LockClosedOutline /></NIcon>
                    </span>
                    <input
                        id="login-password"
                        v-model="formData.password"
                        class="auth-input"
                        :type="showPassword ? 'text' : 'password'"
                        placeholder="请输入登录密码"
                        autocomplete="current-password"
                        @blur="validatePassword"
                        @keydown.enter="handleLogin"
                    />
                    <span class="auth-input-action" @click="showPassword = !showPassword">
                        <NIcon :size="16">
                            <EyeOffOutline v-if="showPassword" />
                            <EyeOutline v-else />
                        </NIcon>
                    </span>
                </div>
                <div v-if="passwordError" class="auth-error">{{ passwordError }}</div>
            </div>

            <div class="auth-options auth-inline">
                <label class="auth-checkbox">
                    <span class="auth-checkbox-box" :class="{ 'is-checked': rememberMe }">
                        <NIcon v-if="rememberMe" :size="12"><CheckmarkOutline /></NIcon>
                    </span>
                    <input v-model="rememberMe" type="checkbox" hidden />
                    <span>记住我</span>
                </label>
                <button type="button" class="auth-link-btn" @click="router.push('/auth/forgot-password')">
                    忘记密码？
                </button>
            </div>

            <button
                type="button"
                class="auth-submit touch-feedback"
                :class="{ 'is-loading': isLoading }"
                :disabled="isLoading || !isFormValid"
                @click="handleLogin"
            >
                {{ isLoading ? '登录中...' : '登录' }}
            </button>

            <div class="auth-divider"><span>快速入口</span></div>

            <button type="button" class="auth-ghost touch-feedback" @click="router.push('/')">先逛一逛首页</button>
        </section>

        <section class="auth-feature-grid">
            <article class="auth-feature">
                <div class="auth-feature-icon" style="background: linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))">
                    <NIcon :size="18"><BagHandleOutline /></NIcon>
                </div>
                <strong>订单同步</strong>
                <p>查看代取、代购状态与消息提醒。</p>
            </article>
            <article class="auth-feature">
                <div class="auth-feature-icon" style="background: linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))">
                    <NIcon :size="18"><DocumentTextOutline /></NIcon>
                </div>
                <strong>任务协作</strong>
                <p>管理发布需求和参与记录。</p>
            </article>
            <article class="auth-feature">
                <div class="auth-feature-icon" style="background: linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))">
                    <NIcon :size="18"><WalletOutline /></NIcon>
                </div>
                <strong>钱包记录</strong>
                <p>统一查看收益、支出与结算入口。</p>
            </article>
        </section>

        <div class="auth-footer">
            <span class="auth-footer-text">还没有账户？</span>
            <button type="button" class="auth-link-btn" @click="router.push('/register')">立即注册</button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NIcon } from 'naive-ui';
import {
    BagHandleOutline,
    CheckmarkOutline,
    ChevronBackOutline,
    CloseCircleOutline,
    DocumentTextOutline,
    EyeOffOutline,
    EyeOutline,
    LockClosedOutline,
    PersonOutline,
    SchoolOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

const isLoading = ref(false);
const showPassword = ref(false);
const rememberMe = ref(false);
const emailError = ref('');
const passwordError = ref('');

const formData = reactive({
    email: '',
    password: '',
});

const isFormValid = computed(() => {
    return formData.email.trim() !== '' && formData.password.trim() !== '' && !emailError.value && !passwordError.value;
});

const validateEmail = () => {
    if (!formData.email.trim()) {
        emailError.value = '请输入邮箱、手机号或学号';
        return false;
    }
    emailError.value = '';
    return true;
};

const validatePassword = () => {
    if (!formData.password.trim()) {
        passwordError.value = '请输入密码';
        return false;
    }
    if (formData.password.trim().length < 6) {
        passwordError.value = '密码长度至少 6 位';
        return false;
    }
    passwordError.value = '';
    return true;
};

const goBack = () => {
    if (window.history.length > 1) {
        router.back();
        return;
    }
    router.push('/');
};

const handleLogin = async () => {
    const emailValid = validateEmail();
    const passwordValid = validatePassword();

    if (!emailValid || !passwordValid) {
        return;
    }

    isLoading.value = true;
    try {
        const result = await userStore.login(formData);
        if (result) {
            if (rememberMe.value) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }
            const redirectPath = (route.query.redirect as string) || '/';
            router.push(redirectPath);
        }
    } catch (error: any) {
        const message = error?.response?.data?.message || error?.message || '登录失败，请重试';
        passwordError.value = message;
    } finally {
        isLoading.value = false;
    }
};

const rememberedEmail = localStorage.getItem('rememberedEmail');
if (rememberedEmail) {
    formData.email = rememberedEmail;
    rememberMe.value = true;
}
</script>
