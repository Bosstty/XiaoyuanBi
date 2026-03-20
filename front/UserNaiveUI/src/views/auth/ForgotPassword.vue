<template>
    <div class="forgot-password-container">
        <NCard class="forgot-password-card" size="large">
            <template #header>
                <div class="forgot-password-header">
                    <NIcon size="48" color="#18a058">
                        <LockClosedIcon />
                    </NIcon>
                    <h1>忘记密码</h1>
                    <p>重置您的密码</p>
                </div>
            </template>

            <!-- 步骤指示器 -->
            <NSteps
                :current="currentStep"
                size="small"
                style="margin-bottom: 24px;"
            >
                <NStep title="验证身份" />
                <NStep title="验证码" />
                <NStep title="重置密码" />
                <NStep title="完成" />
            </NSteps>

            <!-- 第一步：输入邮箱或手机号 -->
            <div v-if="currentStep === 1" class="step-content">
                <NForm
                    ref="emailFormRef"
                    :model="emailForm"
                    :rules="emailRules"
                    label-placement="top"
                    size="large"
                >
                    <NFormItem label="邮箱或手机号" path="account">
                        <NInput
                            v-model:value="emailForm.account"
                            placeholder="请输入您的邮箱或手机号"
                            :input-props="{ autocomplete: 'username' }"
                        />
                    </NFormItem>

                    <NFormItem>
                        <NButton
                            type="primary"
                            size="large"
                            block
                            :loading="loading"
                            @click="sendVerificationCode"
                        >
                            发送验证码
                        </NButton>
                    </NFormItem>
                </NForm>
            </div>

            <!-- 第二步：输入验证码 -->
            <div v-if="currentStep === 2" class="step-content">
                <NAlert type="info" style="margin-bottom: 16px;">
                    验证码已发送到 {{ maskedAccount }}，请检查您的{{ accountType === 'email' ? '邮箱' : '短信' }}
                </NAlert>

                <NForm
                    ref="codeFormRef"
                    :model="codeForm"
                    :rules="codeRules"
                    label-placement="top"
                    size="large"
                >
                    <NFormItem label="验证码" path="code">
                        <NInput
                            v-model:value="codeForm.code"
                            placeholder="请输入6位验证码"
                            maxlength="6"
                            :input-props="{ autocomplete: 'one-time-code' }"
                        />
                    </NFormItem>

                    <NFormItem>
                        <NSpace vertical style="width: 100%;">
                            <NButton
                                type="primary"
                                size="large"
                                block
                                :loading="loading"
                                @click="verifyCode"
                            >
                                验证
                            </NButton>

                            <div class="resend-section">
                                <span v-if="countdown > 0" class="countdown-text">
                                    {{ countdown }}秒后可重新发送
                                </span>
                                <NButton
                                    v-else
                                    text
                                    type="primary"
                                    @click="resendCode"
                                    :loading="resendLoading"
                                >
                                    重新发送验证码
                                </NButton>
                            </div>
                        </NSpace>
                    </NFormItem>
                </NForm>
            </div>

            <!-- 第三步：重置密码 -->
            <div v-if="currentStep === 3" class="step-content">
                <NForm
                    ref="passwordFormRef"
                    :model="passwordForm"
                    :rules="passwordRules"
                    label-placement="top"
                    size="large"
                >
                    <NFormItem label="新密码" path="password">
                        <NInput
                            v-model:value="passwordForm.password"
                            type="password"
                            placeholder="请输入新密码（至少6位）"
                            show-password-on="mousedown"
                            :input-props="{ autocomplete: 'new-password' }"
                        />
                    </NFormItem>

                    <NFormItem label="确认密码" path="confirmPassword">
                        <NInput
                            v-model:value="passwordForm.confirmPassword"
                            type="password"
                            placeholder="请再次输入新密码"
                            show-password-on="mousedown"
                            :input-props="{ autocomplete: 'new-password' }"
                        />
                    </NFormItem>

                    <NFormItem>
                        <NButton
                            type="primary"
                            size="large"
                            block
                            :loading="loading"
                            @click="resetPassword"
                        >
                            重置密码
                        </NButton>
                    </NFormItem>
                </NForm>
            </div>

            <!-- 第四步：完成 -->
            <div v-if="currentStep === 4" class="step-content success-content">
                <NResult
                    status="success"
                    title="密码重置成功"
                    description="您的密码已成功重置，现在可以使用新密码登录了。"
                >
                    <template #footer>
                        <NButton
                            type="primary"
                            size="large"
                            @click="goToLogin"
                        >
                            去登录
                        </NButton>
                    </template>
                </NResult>
            </div>

            <template #footer>
                <div class="forgot-password-footer">
                    <p>
                        想起密码了？
                        <RouterLink to="/auth/login">
                            <NButton text type="primary">返回登录</NButton>
                        </RouterLink>
                    </p>
                </div>
            </template>
        </NCard>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NButton,
    NIcon,
    NSteps,
    NStep,
    NAlert,
    NSpace,
    NResult,
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { LockClosedOutline as LockClosedIcon } from '@vicons/ionicons5';
import { AuthApi } from '@/api';

const router = useRouter();
const message = useMessage();

const currentStep = ref(1);
const loading = ref(false);
const resendLoading = ref(false);
const countdown = ref(0);
let countdownTimer: NodeJS.Timeout | null = null;

const emailFormRef = ref<FormInst | null>(null);
const codeFormRef = ref<FormInst | null>(null);
const passwordFormRef = ref<FormInst | null>(null);

// 表单数据
const emailForm = reactive({
    account: '',
});

const codeForm = reactive({
    code: '',
});

const passwordForm = reactive({
    password: '',
    confirmPassword: '',
});

// 验证重置token
const resetToken = ref('');

// 计算账号类型和遮蔽显示
const accountType = computed(() => {
    const account = emailForm.account;
    if (!account) return '';

    // 邮箱格式验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    // 手机号格式验证
    const phoneRegex = /^1[3-9]\d{9}$/;

    if (emailRegex.test(account)) return 'email';
    if (phoneRegex.test(account)) return 'phone';
    return '';
});

const maskedAccount = computed(() => {
    const account = emailForm.account;
    if (!account) return '';

    if (accountType.value === 'email') {
        const [username, domain] = account.split('@');
        const maskedUsername = username.length > 2
            ? username.substring(0, 2) + '*'.repeat(username.length - 2)
            : username;
        return `${maskedUsername}@${domain}`;
    } else if (accountType.value === 'phone') {
        return account.substring(0, 3) + '****' + account.substring(7);
    }
    return account;
});

// 表单验证规则
const emailRules: FormRules = {
    account: [
        {
            required: true,
            message: '请输入邮箱或手机号',
            trigger: ['input', 'blur'],
        },
        {
            validator: (rule: any, value: string) => {
                if (!value) return false;

                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const phoneRegex = /^1[3-9]\d{9}$/;

                return emailRegex.test(value) || phoneRegex.test(value);
            },
            message: '请输入正确的邮箱或手机号格式',
            trigger: ['input', 'blur'],
        },
    ],
};

const codeRules: FormRules = {
    code: [
        {
            required: true,
            message: '请输入验证码',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^\d{6}$/,
            message: '验证码为6位数字',
            trigger: ['input', 'blur'],
        },
    ],
};

const passwordRules: FormRules = {
    password: [
        {
            required: true,
            message: '请输入新密码',
            trigger: ['input', 'blur'],
        },
        {
            min: 6,
            message: '密码长度至少6位',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/,
            message: '密码必须包含字母和数字',
            trigger: ['input', 'blur'],
        },
    ],
    confirmPassword: [
        {
            required: true,
            message: '请确认密码',
            trigger: ['input', 'blur'],
        },
        {
            validator: (rule: any, value: string) => {
                return value === passwordForm.password;
            },
            message: '两次输入的密码不一致',
            trigger: ['input', 'blur'],
        },
    ],
};

// 发送验证码
const sendVerificationCode = async () => {
    try {
        await emailFormRef.value?.validate();

        loading.value = true;

        await AuthApi.sendVerificationCode({
            type: accountType.value as 'email' | 'phone',
            target: emailForm.account,
        });

        message.success('验证码发送成功');
        currentStep.value = 2;
        startCountdown();

    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('验证码发送失败，请重试');
        }
    } finally {
        loading.value = false;
    }
};

// 验证验证码
const verifyCode = async () => {
    try {
        await codeFormRef.value?.validate();

        loading.value = true;

        const response = await AuthApi.verifyCode({
            type: accountType.value as 'email' | 'phone',
            target: emailForm.account,
            code: codeForm.code,
        });

        if (response.success && response.data?.resetToken) {
            resetToken.value = response.data.resetToken;
            message.success('验证成功');
            currentStep.value = 3;
        } else {
            message.error('验证失败，请检查验证码');
        }

    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('验证失败，请重试');
        }
    } finally {
        loading.value = false;
    }
};

// 重置密码
const resetPassword = async () => {
    try {
        await passwordFormRef.value?.validate();

        loading.value = true;

        await AuthApi.resetPassword({
            resetToken: resetToken.value,
            newPassword: passwordForm.password,
        });

        message.success('密码重置成功');
        currentStep.value = 4;

    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('密码重置失败，请重试');
        }
    } finally {
        loading.value = false;
    }
};

// 重新发送验证码
const resendCode = async () => {
    try {
        resendLoading.value = true;

        await AuthApi.sendVerificationCode({
            type: accountType.value as 'email' | 'phone',
            target: emailForm.account,
        });

        message.success('验证码重新发送成功');
        startCountdown();

    } catch (error: any) {
        message.error('验证码发送失败，请重试');
    } finally {
        resendLoading.value = false;
    }
};

// 开始倒计时
const startCountdown = () => {
    countdown.value = 60;
    countdownTimer = setInterval(() => {
        countdown.value--;
        if (countdown.value <= 0) {
            clearInterval(countdownTimer!);
            countdownTimer = null;
        }
    }, 1000);
};

// 跳转到登录页
const goToLogin = () => {
    router.push('/auth/login');
};

// 清理定时器
onBeforeUnmount(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
});
</script>

<style scoped>
.forgot-password-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg,
        #667eea 0%,
        #764ba2 50%,
        #667eea 100%);
    background-size: 200% 200%;
    animation: gradientShift 6s ease infinite;
    padding: 20px;
}

.forgot-password-card {
    width: 100%;
    max-width: 480px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.forgot-password-header {
    text-align: center;
    margin-bottom: 20px;
}

.forgot-password-header h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 16px 0 8px;
    color: var(--text-color-1);
}

.forgot-password-header p {
    color: var(--text-color-3);
    font-size: 14px;
}

.step-content {
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
}

.success-content {
    text-align: center;
}

.resend-section {
    text-align: center;
    margin-top: 8px;
}

.countdown-text {
    color: var(--text-color-3);
    font-size: 14px;
}

.forgot-password-footer {
    text-align: center;
    margin-top: 16px;
}

.forgot-password-footer p {
    color: var(--text-color-3);
    font-size: 14px;
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

@keyframes gradientShift {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
}

/* 移动端适配 */
@media (max-width: 768px) {
    .forgot-password-container {
        padding: 16px;
        min-height: 100vh;
        min-height: 100dvh;
    }

    .forgot-password-card {
        max-width: 100%;
        box-shadow: none;
        background: transparent;
    }

    .forgot-password-header h1 {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    .forgot-password-container {
        padding: 12px;
    }

    .forgot-password-header h1 {
        font-size: 18px;
    }

    .forgot-password-header p {
        font-size: 12px;
    }

    /* 增加按钮的触摸区域 */
    .n-button {
        min-height: 44px;
        font-size: 16px;
    }
}
</style>