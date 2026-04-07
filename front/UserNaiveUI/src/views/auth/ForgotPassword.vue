<template>
    <div class="forgot-page">
        <div class="forgot-shell">
            <section class="forgot-brand">
                <button type="button" class="back-chevron" aria-label="返回登录" @click="goToLogin">
                    <span class="back-chevron__icon"></span>
                </button>
            </section>

            <NCard class="forgot-card" :bordered="false">
                <template #header>
                    <div class="card-header">
                        <div class="card-icon">
                            <NIcon size="22">
                                <MailOpenOutline />
                            </NIcon>
                        </div>
                        <div>
                            <h2>邮箱找回</h2>
                            <p>完成验证码校验后立即重置密码</p>
                        </div>
                    </div>
                </template>

                <NAlert
                    v-if="successMessage"
                    type="success"
                    class="status-alert"
                    :show-icon="false"
                >
                    {{ successMessage }}
                </NAlert>

                <NAlert v-else type="info" class="status-alert" :show-icon="false">
                    验证码会发送到你的注册邮箱。发送成功后，直接填写验证码和新密码即可提交。
                </NAlert>

                <NForm
                    ref="formRef"
                    :model="formData"
                    :rules="rules"
                    label-placement="top"
                    size="large"
                    class="forgot-form"
                >
                    <NFormItem label="邮箱" path="account">
                        <div class="field-row">
                            <NInput
                                v-model:value="formData.account"
                                class="field-main"
                                placeholder="请输入注册邮箱"
                                :input-props="{ autocomplete: 'email' }"
                            />
                            <NButton
                                class="send-button"
                                type="primary"
                                ghost
                                :loading="sendingCode"
                                :disabled="countdown > 0"
                                @click="sendVerificationCode"
                            >
                                {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
                            </NButton>
                        </div>
                    </NFormItem>

                    <NFormItem label="验证码" path="code">
                        <NInput
                            v-model:value="formData.code"
                            placeholder="请输入 6 位验证码"
                            maxlength="6"
                            :input-props="{ autocomplete: 'one-time-code' }"
                        />
                    </NFormItem>

                    <div class="password-grid">
                        <NFormItem label="新密码" path="password">
                            <NInput
                                v-model:value="formData.password"
                                type="password"
                                placeholder="至少 6 位"
                                show-password-on="mousedown"
                                :input-props="{ autocomplete: 'new-password' }"
                            />
                        </NFormItem>

                        <NFormItem label="确认密码" path="confirmPassword">
                            <NInput
                                v-model:value="formData.confirmPassword"
                                type="password"
                                placeholder="再次输入新密码"
                                show-password-on="mousedown"
                                :input-props="{ autocomplete: 'new-password' }"
                            />
                        </NFormItem>
                    </div>

                    <NButton
                        type="primary"
                        size="large"
                        block
                        class="submit-button"
                        :loading="submitting"
                        @click="submitReset"
                    >
                        验证并重置密码
                    </NButton>
                </NForm>

                <div class="card-footer">
                    <span>想起密码了？</span>
                    <NButton text type="primary" @click="goToLogin">返回登录</NButton>
                </div>
            </NCard>
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import {
    NAlert,
    NButton,
    NCard,
    NForm,
    NFormItem,
    NIcon,
    NInput,
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { MailOpenOutline } from '@vicons/ionicons5';
import { AuthApi } from '@/api';

const router = useRouter();
const message = useMessage();

const formRef = ref<FormInst | null>(null);
const sendingCode = ref(false);
const submitting = ref(false);
const countdown = ref(0);
const successMessage = ref('');
const resetToken = ref('');
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const formData = reactive({
    account: '',
    code: '',
    password: '',
    confirmPassword: '',
});

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const validateAccountOnly = () => {
    const account = formData.account.trim();

    if (!account) {
        message.error('请输入邮箱');
        return false;
    }

    if (!emailRegex.test(account)) {
        message.error('请输入正确的邮箱格式');
        return false;
    }

    return true;
};

const rules: FormRules = {
    account: [
        {
            required: true,
            message: '请输入邮箱',
            trigger: ['input', 'blur'],
        },
        {
            validator: (_rule: unknown, value: string) => emailRegex.test(value),
            message: '请输入正确的邮箱格式',
            trigger: ['input', 'blur'],
        },
    ],
    code: [
        {
            required: true,
            message: '请输入验证码',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^\d{6}$/,
            message: '验证码必须为 6 位数字',
            trigger: ['input', 'blur'],
        },
    ],
    password: [
        {
            required: true,
            message: '请输入新密码',
            trigger: ['input', 'blur'],
        },
        {
            min: 6,
            message: '密码至少 6 位',
            trigger: ['input', 'blur'],
        },
    ],
    confirmPassword: [
        {
            required: true,
            message: '请再次输入密码',
            trigger: ['input', 'blur'],
        },
        {
            validator: (_rule: unknown, value: string) => value === formData.password,
            message: '两次输入的密码不一致',
            trigger: ['input', 'blur'],
        },
    ],
};

const startCountdown = () => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }

    countdown.value = 60;
    countdownTimer = setInterval(() => {
        countdown.value -= 1;
        if (countdown.value <= 0 && countdownTimer) {
            clearInterval(countdownTimer);
            countdownTimer = null;
        }
    }, 1000);
};

const sendVerificationCode = async () => {
    try {
        if (!validateAccountOnly()) {
            return;
        }

        sendingCode.value = true;
        successMessage.value = '';

        await AuthApi.sendVerificationCode({
            type: 'email',
            target: formData.account.trim(),
        });

        message.success('验证码已发送，请查收邮箱');
        startCountdown();
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('验证码发送失败，请稍后重试');
        }
    } finally {
        sendingCode.value = false;
    }
};

const submitReset = async () => {
    try {
        await formRef.value?.validate();
        submitting.value = true;
        successMessage.value = '';

        if (!resetToken.value) {
            const verifyResponse = await AuthApi.verifyCode({
                type: 'email',
                target: formData.account.trim(),
                code: formData.code.trim(),
            });

            const token = verifyResponse.data?.resetToken || verifyResponse.data?.reset_token;
            if (!verifyResponse.success || !token) {
                throw new Error(verifyResponse.message || '验证码校验失败');
            }

            resetToken.value = token;
        }

        await AuthApi.resetPassword({
            resetToken: resetToken.value,
            newPassword: formData.password,
        });

        successMessage.value = '密码已重置成功，现在可以直接返回登录页使用新密码登录。';
        message.success('密码重置成功');
        formData.code = '';
        formData.password = '';
        formData.confirmPassword = '';
        resetToken.value = '';
        window.setTimeout(() => {
            goToLogin();
        }, 600);
    } catch (error: any) {
        resetToken.value = '';

        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('密码重置失败，请重试');
        }
    } finally {
        submitting.value = false;
    }
};

const goToLogin = () => {
    router.replace('/login');
};

onBeforeUnmount(() => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
});
</script>

<style scoped>
.forgot-page {
    min-height: 100vh;
    min-height: 100dvh;
    padding: 0;
    background: #f5f5f4;
}

.forgot-shell {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-height: 100dvh;
}

.forgot-brand {
    padding: 16px 20px 0;
}

.back-chevron {
    position: relative;
    width: 40px;
    height: 40px;
    margin-bottom: 4px;
    padding: 0;
    border: none;
    background: transparent;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.back-chevron__icon {
    position: absolute;
    top: 50%;
    left: 12px;
    width: 10px;
    height: 10px;
    border-left: 2px solid #183153;
    border-bottom: 2px solid #183153;
    transform: translateY(-50%) rotate(45deg);
    border-radius: 1px;
}

.brand-badge {
    display: inline-flex;
    align-items: center;
    height: 24px;
    padding: 0 10px;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.05);
    color: #6b7280;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 10px;
}

.forgot-brand h1 {
    margin: 0 0 6px;
    font-size: 26px;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #111827;
    font-weight: 600;
}

.forgot-brand p {
    margin: 0 0 20px;
    font-size: 13px;
    line-height: 1.75;
    color: #6b7280;
}

.forgot-card {
    flex: 1;
    border-radius: 0 !important;
    background: #fff !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
}

.card-header {
    display: flex;
    align-items: center;
    gap: 12px;
}

.card-icon {
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 12px;
    background: #f3f4f6;
    border: 1px solid #e5e7eb;
    color: #6b7280;
}

.card-header h2 {
    margin: 0;
    font-size: 17px;
    color: #111827;
    font-weight: 600;
}

.card-header p {
    margin: 3px 0 0;
    color: #9ca3af;
    font-size: 12px;
}

.status-alert {
    margin-bottom: 18px;
    border-radius: 10px !important;
    font-size: 13px;
}

.forgot-form {
    display: grid;
    gap: 4px;
}

.field-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    width: 100%;
}

.field-main {
    min-width: 0;
}

.send-button {
    min-width: 96px;
    min-height: 44px;
    border-radius: 10px !important;
    font-size: 13px;
    flex-shrink: 0;
}

.password-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 4px;
}

.submit-button {
    margin-top: 8px;
    min-height: 50px;
    border-radius: 12px !important;
    font-size: 15px;
    font-weight: 600;
}

.card-footer {
    margin-top: 20px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 6px;
    color: #9ca3af;
    font-size: 13px;
}

:deep(.n-card) {
    padding: 0;
}

:deep(.n-card__content) {
    padding: 16px 20px 32px !important;
}

:deep(.n-card-header) {
    padding: 16px 20px !important;
    border-bottom: 1px solid #f3f4f6;
}

:deep(.n-input),
:deep(.n-input-wrapper),
:deep(.n-base-selection) {
    border-radius: 10px !important;
}

:deep(.n-input-wrapper) {
    min-height: 44px;
}

:deep(.n-form-item-label) {
    font-size: 12px !important;
    font-weight: 500;
    color: #6b7280 !important;
    padding-bottom: 5px !important;
}

@media (prefers-reduced-motion: no-preference) {
    .back-chevron,
    .send-button,
    .submit-button {
        transition:
            opacity 150ms ease,
            transform 150ms ease;
    }

    .back-chevron:active,
    .send-button:active,
    .submit-button:active {
        opacity: 0.7;
        transform: scale(0.97);
    }
}
</style>
