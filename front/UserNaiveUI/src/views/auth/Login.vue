<template>
    <div class="login-container">
        <NCard class="login-card" size="large">
            <template #header>
                <div class="login-header">
                    <NIcon size="48" color="#18a058">
                        <SchoolIcon />
                    </NIcon>
                    <h1>哈尔滨学院校园服务平台</h1>
                    <p>学生登录</p>
                </div>
            </template>

            <NForm
                ref="formRef"
                :model="formData"
                :rules="rules"
                label-placement="left"
                label-width="auto"
                require-mark-placement="right-hanging"
                size="large"
            >
                <NFormItem label="邮箱/手机号/学号" path="email">
                    <NInput
                        v-model:value="formData.email"
                        placeholder="请输入邮箱、手机号或学号"
                        :input-props="{ autocomplete: 'username' }"
                    />
                </NFormItem>

                <NFormItem label="密码" path="password">
                    <NInput
                        v-model:value="formData.password"
                        type="password"
                        placeholder="请输入密码"
                        show-password-on="mousedown"
                        :input-props="{ autocomplete: 'current-password' }"
                    />
                </NFormItem>

                <NFormItem>
                    <div class="login-options">
                        <NCheckbox v-model:checked="rememberMe">记住我</NCheckbox>
                        <NButton text type="primary" @click="$router.push('/auth/forgot-password')">
                            忘记密码？
                        </NButton>
                    </div>
                </NFormItem>

                <NFormItem>
                    <NButton
                        type="primary"
                        size="large"
                        block
                        :loading="userStore.isLoading"
                        @click="handleLogin"
                    >
                        登录
                    </NButton>
                </NFormItem>

                <NDivider>其他登录方式</NDivider>

                <NFormItem>
                    <NButton
                        size="large"
                        block
                        secondary
                        :loading="wechatLoading"
                        @click="handleWechatLogin"
                    >
                        <template #icon>
                            <NIcon>
                                <WechatIcon />
                            </NIcon>
                        </template>
                        微信登录
                    </NButton>
                </NFormItem>
            </NForm>

            <template #footer>
                <div class="login-footer">
                    <p>
                        还没有账号？
                        <RouterLink to="/register">
                            <NButton text type="primary">立即注册</NButton>
                        </RouterLink>
                    </p>
                </div>
            </template>
        </NCard>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NButton,
    NCheckbox,
    NIcon,
    NDivider,
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { SchoolOutline as SchoolIcon, LogoWechat as WechatIcon } from '@vicons/ionicons5';
import { useUserStore } from '@/stores';
import type { UserLoginData } from '@/types';

const router = useRouter();
const route = useRoute();
const message = useMessage();
const userStore = useUserStore();

const formRef = ref<FormInst | null>(null);
const rememberMe = ref(false);
const wechatLoading = ref(false);

// 表单数据
const formData = reactive<UserLoginData>({
    email: '',
    password: '',
});

// 表单验证规则
const rules: FormRules = {
    email: [
        {
            required: true,
            message: '请输入邮箱、手机号或学号',
            trigger: ['input', 'blur'],
        },
        {
            validator: (_rule: any, value: string) => {
                if (!value) return false;

                // 邮箱格式验证
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                // 手机号格式验证 (中国大陆手机号)
                const phoneRegex = /^1[3-9]\d{9}$/;
                // 学号格式验证 (假设为8-12位数字或字母数字组合)
                const studentIdRegex = /^[A-Za-z0-9]{8,12}$/;

                if (
                    emailRegex.test(value) ||
                    phoneRegex.test(value) ||
                    studentIdRegex.test(value)
                ) {
                    return true;
                }
                return false;
            },
            message: '请输入正确的邮箱、手机号或学号格式',
            trigger: ['input', 'blur'],
        },
    ],
    password: [
        {
            required: true,
            message: '请输入密码',
            trigger: ['input', 'blur'],
        },
        {
            min: 6,
            message: '密码长度至少6位',
            trigger: ['input', 'blur'],
        },
    ],
};

// 登录处理
const handleLogin = async () => {
    try {
        await formRef.value?.validate();

        const result = await userStore.login(formData);

        if (result) {
            // 处理"记住我"功能
            if (rememberMe.value) {
                localStorage.setItem('rememberedEmail', formData.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            message.success('登录成功！');

            // 登录成功后跳转
            const redirectPath = (route.query.redirect as string) || '/';
            router.push(redirectPath);
        }
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('登录失败，请重试');
        }
    }
};

// 微信登录处理
const handleWechatLogin = async () => {
    wechatLoading.value = true;
    try {
        // 这里实现微信登录逻辑
        message.info('微信登录功能开发中...');
    } catch (error) {
        message.error('微信登录失败');
    } finally {
        wechatLoading.value = false;
    }
};

// 回车登录
const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter') {
        handleLogin();
    }
};

onMounted(() => {
    // 监听键盘事件
    document.addEventListener('keydown', handleKeyDown);

    // 如果有记住的登录信息，填充表单
    const savedEmail = localStorage.getItem('rememberedEmail');
    if (savedEmail) {
        formData.email = savedEmail;
        rememberMe.value = true;
    }
});

// 组件卸载时清理事件监听
import { onUnmounted } from 'vue';
onUnmounted(() => {
    document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.login-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 20px;
}

.login-card {
    width: 100%;
    max-width: 400px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.login-header {
    text-align: center;
    margin-bottom: 20px;
}

.login-header h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 16px 0 8px;
    color: var(--text-color-1);
}

.login-header p {
    color: var(--text-color-3);
    font-size: 14px;
}

.login-options {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
}

.login-footer {
    text-align: center;
    margin-top: 16px;
}

.login-footer p {
    color: var(--text-color-3);
    font-size: 14px;
}

@media (max-width: 768px) {
    .login-container {
        padding: 16px;
        min-height: 100vh;
        min-height: 100dvh; /* 动态视口高度，适配移动端 */
    }

    .login-card {
        max-width: 100%;
        box-shadow: none; /* 移动端移除阴影 */
        background: transparent;
    }

    .login-header h1 {
        font-size: 20px;
    }

    .login-options {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
    }

    .login-options .n-button {
        align-self: flex-end;
    }
}

/* 增强的移动端适配 */
@media (max-width: 480px) {
    .login-container {
        padding: 12px;
    }

    .login-header h1 {
        font-size: 18px;
    }

    .login-header p {
        font-size: 12px;
    }

    /* 确保表单项在小屏幕上的可用性 */
    .n-form-item {
        margin-bottom: 20px;
    }

    /* 增加按钮的触摸区域 */
    .n-button {
        min-height: 44px;
        font-size: 16px;
    }
}

/* iOS 风格增强 */
.n-input {
    border-radius: 8px;
}

.n-button {
    border-radius: 8px;
    transition: all 0.2s ease;
}

.n-button:active {
    transform: scale(0.98);
}

/* 聚焦状态优化 */
.n-input:focus-within {
    box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
}

/* 渐变背景优化 */
.login-container {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    background-size: 200% 200%;
    animation: gradientShift 6s ease infinite;
}

@keyframes gradientShift {
    0% {
        background-position: 0% 50%;
    }
    50% {
        background-position: 100% 50%;
    }
    100% {
        background-position: 0% 50%;
    }
}
</style>
