<template>
    <div class="auth-shell auth-shell--register">
        <div class="auth-topbar">
            <button
                type="button"
                class="auth-back touch-feedback"
                aria-label="返回"
                @click="goBack"
            >
                <NIcon :size="20"><ChevronBackOutline /></NIcon>
            </button>
            <span>创建校园账户</span>
            <button type="button" class="auth-link-btn" @click="router.push('/login')">登录</button>
        </div>

        <section class="auth-hero">
            <div class="auth-hero-badge">
                <NIcon :size="30"><PersonAddOutline /></NIcon>
            </div>
            <div>
                <span class="auth-eyebrow">Campus Register</span>
                <h1>注册你的校园服务身份</h1>
                <p>注册后即可发布订单、参与任务协作、加入校园论坛，并同步钱包和服务记录。</p>
            </div>
        </section>

        <div class="auth-register-layout">
            <section class="auth-card">
                <h2 class="auth-section-title">基础信息</h2>

                <div class="auth-split">
                    <div class="auth-field">
                        <label class="auth-label" for="student_id">学号</label>
                        <div class="auth-input-wrap" :class="{ 'has-error': !!errors.student_id }">
                            <span class="auth-input-icon">
                                <NIcon :size="18"><CardOutline /></NIcon>
                            </span>
                            <input
                                id="student_id"
                                v-model="formData.student_id"
                                class="auth-input"
                                type="text"
                                placeholder="请输入学号"
                                @blur="validateField('student_id')"
                            />
                        </div>
                        <div v-if="errors.student_id" class="auth-error">
                            {{ errors.student_id }}
                        </div>
                    </div>

                    <div class="auth-field">
                        <label class="auth-label" for="username">用户名</label>
                        <div class="auth-input-wrap" :class="{ 'has-error': !!errors.username }">
                            <span class="auth-input-icon">
                                <NIcon :size="18"><PersonOutline /></NIcon>
                            </span>
                            <input
                                id="username"
                                v-model="formData.username"
                                class="auth-input"
                                type="text"
                                placeholder="请输入用户名"
                                @blur="validateField('username')"
                            />
                        </div>
                        <div v-if="errors.username" class="auth-error">{{ errors.username }}</div>
                    </div>
                </div>

                <div class="auth-split">
                    <div class="auth-field">
                        <label class="auth-label" for="real_name">真实姓名</label>
                        <div class="auth-input-wrap" :class="{ 'has-error': !!errors.real_name }">
                            <span class="auth-input-icon">
                                <NIcon :size="18"><PersonOutline /></NIcon>
                            </span>
                            <input
                                id="real_name"
                                v-model="formData.real_name"
                                class="auth-input"
                                type="text"
                                placeholder="请输入真实姓名"
                                @blur="validateField('real_name')"
                            />
                        </div>
                        <div v-if="errors.real_name" class="auth-error">{{ errors.real_name }}</div>
                    </div>

                    <div class="auth-field">
                        <label class="auth-label" for="phone">手机号</label>
                        <div class="auth-input-wrap" :class="{ 'has-error': !!errors.phone }">
                            <span class="auth-input-icon">
                                <NIcon :size="18"><CallOutline /></NIcon>
                            </span>
                            <input
                                id="phone"
                                v-model="formData.phone"
                                class="auth-input"
                                type="tel"
                                placeholder="选填"
                                @blur="validateField('phone')"
                            />
                        </div>
                        <div v-if="errors.phone" class="auth-error">{{ errors.phone }}</div>
                    </div>
                </div>

                <div class="auth-field">
                    <label class="auth-label" for="email">邮箱</label>
                    <div class="auth-input-wrap" :class="{ 'has-error': !!errors.email }">
                        <span class="auth-input-icon">
                            <NIcon :size="18"><MailOutline /></NIcon>
                        </span>
                        <input
                            id="email"
                            v-model="formData.email"
                            class="auth-input"
                            type="email"
                            placeholder="请输入常用邮箱"
                            @blur="validateField('email')"
                        />
                    </div>
                    <div v-if="errors.email" class="auth-error">{{ errors.email }}</div>
                </div>
            </section>

            <section class="auth-card">
                <h2 class="auth-section-title">校园信息</h2>

                <div class="auth-split">
                    <div class="auth-field">
                        <label class="auth-label" for="college">学院</label>
                        <NDropdown
                            trigger="click"
                            :options="collegeOptions"
                            :show="collegeDropdownVisible"
                            @update:show="collegeDropdownVisible = $event"
                            @select="value => handleDropdownSelect('college', value)"
                        >
                            <button
                                id="college"
                                type="button"
                                class="auth-dropdown-trigger"
                                :class="{
                                    'has-error': !!errors.college,
                                    'is-active': collegeDropdownVisible,
                                }"
                            >
                                <span class="auth-dropdown-icon">
                                    <NIcon :size="18"><BusinessOutline /></NIcon>
                                </span>
                                <span
                                    class="auth-dropdown-value"
                                    :class="{ 'is-placeholder': !formData.college }"
                                >
                                    {{ formData.college || '请选择学院' }}
                                </span>
                                <span class="auth-dropdown-arrow">
                                    <NIcon :size="16"><ChevronDownOutline /></NIcon>
                                </span>
                            </button>
                        </NDropdown>
                        <div v-if="errors.college" class="auth-error">{{ errors.college }}</div>
                    </div>

                    <div class="auth-field">
                        <label class="auth-label" for="grade">年级</label>
                        <NDropdown
                            trigger="click"
                            :options="gradeOptions"
                            :show="gradeDropdownVisible"
                            @update:show="gradeDropdownVisible = $event"
                            @select="value => handleDropdownSelect('grade', value)"
                        >
                            <button
                                id="grade"
                                type="button"
                                class="auth-dropdown-trigger"
                                :class="{
                                    'has-error': !!errors.grade,
                                    'is-active': gradeDropdownVisible,
                                }"
                            >
                                <span class="auth-dropdown-icon">
                                    <NIcon :size="18"><CalendarOutline /></NIcon>
                                </span>
                                <span
                                    class="auth-dropdown-value"
                                    :class="{ 'is-placeholder': !formData.grade }"
                                >
                                    {{ formData.grade || '请选择年级' }}
                                </span>
                                <span class="auth-dropdown-arrow">
                                    <NIcon :size="16"><ChevronDownOutline /></NIcon>
                                </span>
                            </button>
                        </NDropdown>
                        <div v-if="errors.grade" class="auth-error">{{ errors.grade }}</div>
                    </div>
                </div>

                <div class="auth-field">
                    <label class="auth-label" for="major">专业</label>
                    <div class="auth-input-wrap" :class="{ 'has-error': !!errors.major }">
                        <span class="auth-input-icon">
                            <NIcon :size="18"><BookOutline /></NIcon>
                        </span>
                        <input
                            id="major"
                            v-model="formData.major"
                            class="auth-input"
                            type="text"
                            placeholder="请输入专业名称"
                            @blur="validateField('major')"
                        />
                    </div>
                    <div v-if="errors.major" class="auth-error">{{ errors.major }}</div>
                </div>
            </section>

            <section class="auth-card">
                <h2 class="auth-section-title">设置密码</h2>

                <div class="auth-field">
                    <label class="auth-label" for="password">密码</label>
                    <div class="auth-input-wrap" :class="{ 'has-error': !!errors.password }">
                        <span class="auth-input-icon">
                            <NIcon :size="18"><LockClosedOutline /></NIcon>
                        </span>
                        <input
                            id="password"
                            v-model="formData.password"
                            class="auth-input"
                            :type="showPassword ? 'text' : 'password'"
                            placeholder="至少 6 位，建议字母 + 数字"
                            @blur="validateField('password')"
                        />
                        <span class="auth-input-action" @click="showPassword = !showPassword">
                            <NIcon :size="16">
                                <EyeOffOutline v-if="showPassword" />
                                <EyeOutline v-else />
                            </NIcon>
                        </span>
                    </div>
                    <div v-if="errors.password" class="auth-error">{{ errors.password }}</div>
                </div>

                <div class="auth-field">
                    <label class="auth-label" for="confirm-password">确认密码</label>
                    <div class="auth-input-wrap" :class="{ 'has-error': !!errors.confirmPassword }">
                        <span class="auth-input-icon">
                            <NIcon :size="18"><ShieldCheckmarkOutline /></NIcon>
                        </span>
                        <input
                            id="confirm-password"
                            v-model="formData.confirmPassword"
                            class="auth-input"
                            :type="showConfirmPassword ? 'text' : 'password'"
                            placeholder="再次输入密码"
                            @blur="validateField('confirmPassword')"
                            @keydown.enter="handleRegister"
                        />
                        <span
                            class="auth-input-action"
                            @click="showConfirmPassword = !showConfirmPassword"
                        >
                            <NIcon :size="16">
                                <EyeOffOutline v-if="showConfirmPassword" />
                                <EyeOutline v-else />
                            </NIcon>
                        </span>
                    </div>
                    <div v-if="errors.confirmPassword" class="auth-error">
                        {{ errors.confirmPassword }}
                    </div>
                </div>

                <div class="auth-options">
                    <label class="auth-checkbox auth-agreement">
                        <span
                            class="auth-checkbox-box"
                            :class="{ 'is-checked': formData.agreeToTerms }"
                        >
                            <NIcon v-if="formData.agreeToTerms" :size="12">
                                <CheckmarkOutline />
                            </NIcon>
                        </span>
                        <input v-model="formData.agreeToTerms" type="checkbox" hidden />
                        <span class="auth-agreement-text">
                            我已阅读并同意
                            <button type="button" class="auth-link-btn" @click.stop>
                                《用户协议》
                            </button>
                            和
                            <button type="button" class="auth-link-btn" @click.stop>
                                《隐私政策》
                            </button>
                        </span>
                    </label>
                    <div v-if="errors.agreeToTerms" class="auth-error">
                        {{ errors.agreeToTerms }}
                    </div>
                </div>

                <button
                    type="button"
                    class="auth-submit touch-feedback"
                    :class="{ 'is-loading': isLoading }"
                    :disabled="isLoading || !isFormValid"
                    @click="handleRegister"
                >
                    {{ isLoading ? '注册中...' : '创建账户' }}
                </button>

                <p class="auth-inline-note">注册成功后会自动登录并返回校园服务首页。</p>
            </section>
        </div>

        <div class="auth-footer">
            <span class="auth-footer-text">已经有账户？</span>
            <button type="button" class="auth-link-btn" @click="router.push('/login')">
                立即登录
            </button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NDropdown, NIcon } from 'naive-ui';
import {
    BookOutline,
    BusinessOutline,
    CalendarOutline,
    CallOutline,
    CardOutline,
    CheckmarkOutline,
    ChevronBackOutline,
    ChevronDownOutline,
    EyeOffOutline,
    EyeOutline,
    LockClosedOutline,
    MailOutline,
    PersonAddOutline,
    PersonOutline,
    ShieldCheckmarkOutline,
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores';
import type { UserRegisterData } from '@/types';

const router = useRouter();
const userStore = useUserStore();

const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const collegeDropdownVisible = ref(false);
const gradeDropdownVisible = ref(false);

const collegeOptions = [
    { label: '计算机学院', key: '计算机学院' },
    { label: '经济管理学院', key: '经济管理学院' },
    { label: '艺术学院', key: '艺术学院' },
    { label: '外国语学院', key: '外国语学院' },
    { label: '教育学院', key: '教育学院' },
];
const gradeOptions = [
    { label: '2021级', key: '2021级' },
    { label: '2022级', key: '2022级' },
    { label: '2023级', key: '2023级' },
    { label: '2024级', key: '2024级' },
    { label: '2025级', key: '2025级' },
];

const formData = reactive({
    student_id: '',
    username: '',
    real_name: '',
    email: '',
    phone: '',
    college: '',
    major: '',
    grade: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
});

const errors = reactive<Record<string, string>>({
    student_id: '',
    username: '',
    real_name: '',
    email: '',
    phone: '',
    college: '',
    major: '',
    grade: '',
    password: '',
    confirmPassword: '',
    agreeToTerms: '',
});

const isFormValid = computed(() => {
    return Boolean(
        formData.student_id &&
        formData.username &&
        formData.real_name &&
        formData.email &&
        formData.college &&
        formData.major &&
        formData.grade &&
        formData.password &&
        formData.confirmPassword &&
        formData.agreeToTerms &&
        Object.values(errors).every(value => !value)
    );
});

const validateField = (field: string) => {
    switch (field) {
        case 'student_id':
            errors.student_id = formData.student_id.trim() ? '' : '请输入学号';
            break;
        case 'username':
            errors.username = formData.username.trim().length >= 2 ? '' : '用户名至少 2 位';
            break;
        case 'real_name':
            errors.real_name = formData.real_name.trim() ? '' : '请输入真实姓名';
            break;
        case 'email':
            errors.email = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email.trim())
                ? ''
                : '请输入正确邮箱';
            break;
        case 'phone':
            errors.phone =
                !formData.phone || /^1[3-9]\d{9}$/.test(formData.phone) ? '' : '手机号格式不正确';
            break;
        case 'college':
            errors.college = formData.college ? '' : '请选择学院';
            break;
        case 'major':
            errors.major = formData.major.trim() ? '' : '请输入专业';
            break;
        case 'grade':
            errors.grade = formData.grade ? '' : '请选择年级';
            break;
        case 'password':
            errors.password = formData.password.length >= 6 ? '' : '密码至少 6 位';
            if (formData.confirmPassword) {
                validateField('confirmPassword');
            }
            break;
        case 'confirmPassword':
            errors.confirmPassword =
                formData.confirmPassword === formData.password ? '' : '两次输入的密码不一致';
            break;
    }
};

const handleDropdownSelect = (field: 'college' | 'grade', value: string) => {
    formData[field] = value;
    validateField(field);

    if (field === 'college') {
        collegeDropdownVisible.value = false;
        return;
    }

    gradeDropdownVisible.value = false;
};

const goBack = () => {
    if (window.history.length > 1) {
        router.back();
        return;
    }
    router.push('/');
};

const handleRegister = async () => {
    [
        'student_id',
        'username',
        'real_name',
        'email',
        'phone',
        'college',
        'major',
        'grade',
        'password',
        'confirmPassword',
    ].forEach(validateField);

    errors.agreeToTerms = formData.agreeToTerms ? '' : '请先同意用户协议和隐私政策';

    if (Object.values(errors).some(Boolean)) {
        return;
    }

    isLoading.value = true;
    try {
        const payload: UserRegisterData = {
            student_id: formData.student_id.trim(),
            username: formData.username.trim(),
            real_name: formData.real_name.trim(),
            email: formData.email.trim(),
            phone: formData.phone.trim() || undefined,
            college: formData.college,
            major: formData.major.trim(),
            grade: formData.grade,
            password: formData.password,
        };

        const result = await userStore.register(payload);
        if (result) {
            router.push('/');
        }
    } catch (error: any) {
        const message = error?.response?.data?.message || error?.message || '注册失败，请重试';
        errors.confirmPassword = message;
    } finally {
        isLoading.value = false;
    }
};
</script>

<style scoped>
.auth-dropdown-trigger {
    width: 100%;
    min-height: 56px;
    padding: 0 14px;
    border: 1px solid #dde8f7;
    border-radius: 18px;
    background: #f7faff;
    display: flex;
    align-items: center;
    gap: 10px;
    text-align: left;
    transition:
        border-color 0.2s ease,
        box-shadow 0.2s ease,
        background-color 0.2s ease;
}

.auth-dropdown-trigger.is-active {
    border-color: rgba(47, 107, 255, 0.5);
    box-shadow: 0 0 0 4px rgba(47, 107, 255, 0.1);
}

.auth-dropdown-trigger.has-error {
    border-color: rgba(255, 92, 92, 0.55);
}

.auth-dropdown-icon,
.auth-dropdown-arrow {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #8b99ae;
    flex-shrink: 0;
}

.auth-dropdown-value {
    flex: 1;
    min-width: 0;
    font-size: 15px;
    color: #172033;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.auth-dropdown-value.is-placeholder {
    color: #94a1b4;
}
</style>
