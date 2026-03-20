<template>
    <div class="register-container">
        <NCard class="register-card" size="large">
            <template #header>
                <div class="register-header">
                    <NIcon size="48" color="#18a058">
                        <SchoolIcon />
                    </NIcon>
                    <h1>哈尔滨学院校园服务平台</h1>
                    <p>学生注册</p>
                </div>
            </template>

            <NForm
                ref="formRef"
                :model="formData"
                :rules="rules"
                label-placement="top"
                label-width="auto"
                require-mark-placement="right-hanging"
                size="large"
            >
                <NGrid :cols="1" :x-gap="16" :y-gap="16">
                    <!-- 基本信息 -->
                    <NGi>
                        <NFormItem label="学号" path="student_id">
                            <NInput
                                v-model:value="formData.student_id"
                                placeholder="请输入学号"
                                :input-props="{ autocomplete: 'username' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="用户名" path="username">
                            <NInput
                                v-model:value="formData.username"
                                placeholder="请输入用户名"
                                :input-props="{ autocomplete: 'username' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="真实姓名" path="real_name">
                            <NInput
                                v-model:value="formData.real_name"
                                placeholder="请输入真实姓名"
                                :input-props="{ autocomplete: 'name' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="邮箱" path="email">
                            <NInput
                                v-model:value="formData.email"
                                placeholder="请输入邮箱地址"
                                :input-props="{ autocomplete: 'email' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="手机号" path="phone">
                            <NInput
                                v-model:value="formData.phone"
                                placeholder="请输入手机号（可选）"
                                :input-props="{ autocomplete: 'tel' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="学院" path="college">
                            <NSelect
                                v-model:value="formData.college"
                                placeholder="请选择学院"
                                :options="collegeOptions"
                                filterable
                                clearable
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="专业" path="major">
                            <NInput v-model:value="formData.major" placeholder="请输入专业" />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="年级" path="grade">
                            <NSelect
                                v-model:value="formData.grade"
                                placeholder="请选择年级"
                                :options="gradeOptions"
                                clearable
                            />
                        </NFormItem>
                    </NGi>

                    <!-- 密码设置 -->
                    <NGi>
                        <NFormItem label="密码" path="password">
                            <NInput
                                v-model:value="formData.password"
                                type="password"
                                placeholder="请输入密码（至少6位）"
                                show-password-on="mousedown"
                                :input-props="{ autocomplete: 'new-password' }"
                            />
                        </NFormItem>
                    </NGi>

                    <NGi>
                        <NFormItem label="确认密码" path="confirmPassword">
                            <NInput
                                v-model:value="formData.confirmPassword"
                                type="password"
                                placeholder="请再次输入密码"
                                show-password-on="mousedown"
                                :input-props="{ autocomplete: 'new-password' }"
                            />
                        </NFormItem>
                    </NGi>

                    <!-- 协议同意 -->
                    <NGi>
                        <NFormItem path="agreeToTerms">
                            <NCheckbox v-model:checked="formData.agreeToTerms">
                                我已阅读并同意
                                <NButton
                                    text
                                    type="primary"
                                    size="small"
                                    @click="showTermsModal = true"
                                >
                                    《用户协议》
                                </NButton>
                                和
                                <NButton
                                    text
                                    type="primary"
                                    size="small"
                                    @click="showPrivacyModal = true"
                                >
                                    《隐私政策》
                                </NButton>
                            </NCheckbox>
                        </NFormItem>
                    </NGi>

                    <!-- 注册按钮 -->
                    <NGi>
                        <NButton
                            type="primary"
                            size="large"
                            block
                            :loading="userStore.isLoading"
                            @click="handleRegister"
                        >
                            注册
                        </NButton>
                    </NGi>
                </NGrid>
            </NForm>

            <template #footer>
                <div class="register-footer">
                    <p>
                        已有账号？
                        <RouterLink to="/auth/login">
                            <NButton text type="primary">立即登录</NButton>
                        </RouterLink>
                    </p>
                </div>
            </template>
        </NCard>

        <!-- 用户协议模态框 -->
        <NModal
            v-model:show="showTermsModal"
            preset="card"
            title="用户协议"
            style="width: 90%; max-width: 600px"
        >
            <div class="terms-content">
                <h3>欢迎使用哈尔滨学院校园服务平台</h3>
                <p>在使用本平台服务前，请仔细阅读并同意以下条款：</p>

                <h4>1. 服务说明</h4>
                <p>
                    本平台为哈尔滨学院学生提供校园生活服务，包括但不限于代取服务、任务发布、论坛交流等功能。
                </p>

                <h4>2. 用户责任</h4>
                <p>用户须提供真实、准确的个人信息，并对其在平台上的行为负责。</p>

                <h4>3. 平台规则</h4>
                <p>
                    用户须遵守平台相关规则，不得发布违法、违规内容，不得恶意刷单或进行其他不当行为。
                </p>

                <h4>4. 隐私保护</h4>
                <p>我们承诺保护用户隐私，详情请查看隐私政策。</p>

                <h4>5. 服务变更</h4>
                <p>平台有权根据实际情况调整服务内容，并会及时通知用户。</p>
            </div>
        </NModal>

        <!-- 隐私政策模态框 -->
        <NModal
            v-model:show="showPrivacyModal"
            preset="card"
            title="隐私政策"
            style="width: 90%; max-width: 600px"
        >
            <div class="privacy-content">
                <h3>隐私政策</h3>
                <p>我们重视您的隐私保护，特制定本隐私政策：</p>

                <h4>1. 信息收集</h4>
                <p>我们仅收集提供服务所必需的信息，包括基本身份信息、联系方式等。</p>

                <h4>2. 信息使用</h4>
                <p>您的信息仅用于平台服务提供，不会用于其他商业目的。</p>

                <h4>3. 信息共享</h4>
                <p>我们不会向第三方出售、交易或转让您的个人信息。</p>

                <h4>4. 信息安全</h4>
                <p>我们采用合理的安全措施保护您的个人信息安全。</p>

                <h4>5. 联系我们</h4>
                <p>如有隐私相关问题，请联系平台客服。</p>
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import {
    NCard,
    NForm,
    NFormItem,
    NInput,
    NButton,
    NCheckbox,
    NIcon,
    NGrid,
    NGi,
    NSelect,
    NModal,
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { SchoolOutline as SchoolIcon } from '@vicons/ionicons5';
import { useUserStore } from '@/stores';
import type { UserRegisterData } from '@/types';

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const formRef = ref<FormInst | null>(null);
const showTermsModal = ref(false);
const showPrivacyModal = ref(false);

// 表单数据
const formData = reactive<UserRegisterData & { confirmPassword: string; agreeToTerms: boolean }>({
    student_id: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    real_name: '',
    college: '',
    major: '',
    grade: '',
    agreeToTerms: false,
});

// 学院选项
const collegeOptions = [
    { label: '计算机科学与技术学院', value: '计算机科学与技术学院' },
    { label: '电子工程学院', value: '电子工程学院' },
    { label: '机械工程学院', value: '机械工程学院' },
    { label: '经济管理学院', value: '经济管理学院' },
    { label: '外国语学院', value: '外国语学院' },
    { label: '艺术学院', value: '艺术学院' },
    { label: '建筑工程学院', value: '建筑工程学院' },
    { label: '人文学院', value: '人文学院' },
    { label: '理学院', value: '理学院' },
    { label: '体育学院', value: '体育学院' },
];

// 年级选项
const gradeOptions = [
    { label: '2024级', value: '2024级' },
    { label: '2023级', value: '2023级' },
    { label: '2022级', value: '2022级' },
    { label: '2021级', value: '2021级' },
    { label: '2020级', value: '2020级' },
];

// 表单验证规则
const rules: FormRules = {
    student_id: [
        {
            required: true,
            message: '请输入学号',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^[A-Za-z0-9]{8,12}$/,
            message: '学号格式不正确（8-12位字母数字组合）',
            trigger: ['input', 'blur'],
        },
    ],
    username: [
        {
            required: true,
            message: '请输入用户名',
            trigger: ['input', 'blur'],
        },
        {
            min: 2,
            max: 20,
            message: '用户名长度为2-20个字符',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/,
            message: '用户名只能包含中文、英文、数字、下划线和横线',
            trigger: ['input', 'blur'],
        },
    ],
    real_name: [
        {
            required: true,
            message: '请输入真实姓名',
            trigger: ['input', 'blur'],
        },
        {
            min: 2,
            max: 10,
            message: '姓名长度为2-10个字符',
            trigger: ['input', 'blur'],
        },
        {
            pattern: /^[\u4e00-\u9fa5a-zA-Z\s]+$/,
            message: '姓名只能包含中文和英文字母',
            trigger: ['input', 'blur'],
        },
    ],
    email: [
        {
            required: true,
            message: '请输入邮箱地址',
            trigger: ['input', 'blur'],
        },
        {
            type: 'email',
            message: '请输入正确的邮箱格式',
            trigger: ['input', 'blur'],
        },
    ],
    phone: [
        {
            pattern: /^1[3-9]\d{9}$/,
            message: '请输入正确的手机号格式',
            trigger: ['input', 'blur'],
        },
    ],
    college: [
        {
            required: true,
            message: '请选择学院',
            trigger: ['change', 'blur'],
        },
    ],
    major: [
        {
            required: true,
            message: '请输入专业',
            trigger: ['input', 'blur'],
        },
    ],
    grade: [
        {
            required: true,
            message: '请选择年级',
            trigger: ['change', 'blur'],
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
                return value === formData.password;
            },
            message: '两次输入的密码不一致',
            trigger: ['input', 'blur'],
        },
    ],
    agreeToTerms: [
        {
            required: true,
            message: '请阅读并同意用户协议和隐私政策',
            trigger: ['change'],
            validator: (rule: any, value: boolean) => {
                return value === true;
            },
        },
    ],
};

// 注册处理
const handleRegister = async () => {
    try {
        await formRef.value?.validate();

        if (!formData.agreeToTerms) {
            message.error('请先同意用户协议和隐私政策');
            return;
        }

        // 准备注册数据，移除确认密码和协议同意字段
        const registerData: UserRegisterData = {
            student_id: formData.student_id,
            username: formData.username,
            email: formData.email,
            password: formData.password,
            phone: formData.phone || undefined,
            real_name: formData.real_name,
            college: formData.college,
            major: formData.major,
            grade: formData.grade,
        };

        const result = await userStore.register(registerData);

        if (result) {
            message.success('注册成功！正在跳转到首页...');

            // 注册成功后跳转到首页
            setTimeout(() => {
                router.push('/');
            }, 1500);
        }
    } catch (error: any) {
        if (error?.response?.data?.message) {
            message.error(error.response.data.message);
        } else if (error?.message) {
            message.error(error.message);
        } else {
            message.error('注册失败，请重试');
        }
    }
};
</script>

<style scoped>
.register-container {
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #667eea 100%);
    background-size: 200% 200%;
    animation: gradientShift 6s ease infinite;
    padding: 20px;
}

.register-card {
    width: 100%;
    max-width: 600px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.register-header {
    text-align: center;
    margin-bottom: 20px;
}

.register-header h1 {
    font-size: 24px;
    font-weight: 600;
    margin: 16px 0 8px;
    color: var(--text-color-1);
}

.register-header p {
    color: var(--text-color-3);
    font-size: 14px;
}

.register-footer {
    text-align: center;
    margin-top: 16px;
}

.register-footer p {
    color: var(--text-color-3);
    font-size: 14px;
}

.terms-content,
.privacy-content {
    line-height: 1.6;
}

.terms-content h3,
.privacy-content h3 {
    color: var(--text-color-1);
    margin-bottom: 16px;
}

.terms-content h4,
.privacy-content h4 {
    color: var(--text-color-2);
    margin: 16px 0 8px;
    font-weight: 600;
}

.terms-content p,
.privacy-content p {
    color: var(--text-color-3);
    margin-bottom: 12px;
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

.n-select {
    border-radius: 8px;
}

/* 聚焦状态优化 */
.n-input:focus-within,
.n-select:focus-within {
    box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.2);
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

/* 移动端适配 */
@media (max-width: 768px) {
    .register-container {
        padding: 16px;
        min-height: 100vh;
        min-height: 100dvh;
    }

    .register-card {
        max-width: 100%;
        box-shadow: none;
        background: transparent;
    }

    .register-header h1 {
        font-size: 20px;
    }
}

@media (max-width: 480px) {
    .register-container {
        padding: 12px;
    }

    .register-header h1 {
        font-size: 18px;
    }

    .register-header p {
        font-size: 12px;
    }

    /* 增加按钮的触摸区域 */
    .n-button {
        min-height: 44px;
        font-size: 16px;
    }
}
</style>
