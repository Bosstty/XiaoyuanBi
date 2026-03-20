<template>
    <div class="ios-register-container" :class="{ 'dark-mode': isDarkMode }">
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
            <div class="nav-title">注册</div>
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
                <h1 class="brand-title">加入我们</h1>
                <p class="brand-subtitle">创建您的校园账户</p>
            </div>

            <!-- iOS风格表单 -->
            <div class="ios-form-section">
                <div class="ios-form-group">
                    <!-- 基本信息表单 -->
                    <div class="ios-form-header">
                        <h2>基本信息</h2>
                        <p>请填写您的基本信息</p>
                    </div>

                    <!-- 学号输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <CardOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.student_id"
                                type="text"
                                class="ios-input"
                                placeholder="学号"
                                autocomplete="username"
                                :class="{ 'has-error': errors.student_id }"
                                @blur="validateField('student_id')"
                                @focus="clearError('student_id')"
                            />
                        </div>
                        <div v-if="errors.student_id" class="ios-error-text">
                            {{ errors.student_id }}
                        </div>
                    </div>

                    <!-- 用户名输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <PersonOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.username"
                                type="text"
                                class="ios-input"
                                placeholder="用户名"
                                :class="{ 'has-error': errors.username }"
                                @blur="validateField('username')"
                                @focus="clearError('username')"
                            />
                        </div>
                        <div v-if="errors.username" class="ios-error-text">
                            {{ errors.username }}
                        </div>
                    </div>

                    <!-- 真实姓名输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <DocumentTextOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.real_name"
                                type="text"
                                class="ios-input"
                                placeholder="真实姓名"
                                autocomplete="name"
                                :class="{ 'has-error': errors.real_name }"
                                @blur="validateField('real_name')"
                                @focus="clearError('real_name')"
                            />
                        </div>
                        <div v-if="errors.real_name" class="ios-error-text">
                            {{ errors.real_name }}
                        </div>
                    </div>

                    <!-- 邮箱输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <MailOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.email"
                                type="email"
                                class="ios-input"
                                placeholder="邮箱地址"
                                autocomplete="email"
                                :class="{ 'has-error': errors.email }"
                                @blur="validateField('email')"
                                @focus="clearError('email')"
                            />
                        </div>
                        <div v-if="errors.email" class="ios-error-text">{{ errors.email }}</div>
                    </div>

                    <!-- 手机号输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <CallOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.phone"
                                type="tel"
                                class="ios-input"
                                placeholder="手机号（可选）"
                                autocomplete="tel"
                                :class="{ 'has-error': errors.phone }"
                                @blur="validateField('phone')"
                                @focus="clearError('phone')"
                            />
                        </div>
                        <div v-if="errors.phone" class="ios-error-text">{{ errors.phone }}</div>
                    </div>

                    <!-- 学院选择 -->
                    <div class="ios-input-group">
                        <div class="ios-selector-wrapper" @click="showCollegeModal = true">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <BusinessOutline />
                                </NIcon>
                            </div>
                            <div
                                class="ios-selector-text"
                                :class="{ placeholder: !formData.college }"
                            >
                                {{ formData.college || '选择学院' }}
                            </div>
                            <div class="ios-selector-arrow">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <ChevronForwardOutline />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="errors.college" class="ios-error-text">{{ errors.college }}</div>
                    </div>

                    <!-- 专业输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <BookOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.major"
                                type="text"
                                class="ios-input"
                                placeholder="专业"
                                :class="{ 'has-error': errors.major }"
                                @blur="validateField('major')"
                                @focus="clearError('major')"
                            />
                        </div>
                        <div v-if="errors.major" class="ios-error-text">{{ errors.major }}</div>
                    </div>

                    <!-- 年级选择 -->
                    <div class="ios-input-group">
                        <div class="ios-selector-wrapper" @click="showGradeModal = true">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <CalendarOutline />
                                </NIcon>
                            </div>
                            <div
                                class="ios-selector-text"
                                :class="{ placeholder: !formData.grade }"
                            >
                                {{ formData.grade || '选择年级' }}
                            </div>
                            <div class="ios-selector-arrow">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <ChevronForwardOutline />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="errors.grade" class="ios-error-text">{{ errors.grade }}</div>
                    </div>
                </div>

                <!-- 密码设置表单 -->
                <div class="ios-form-group">
                    <div class="ios-form-header">
                        <h2>设置密码</h2>
                        <p>请设置一个安全的登录密码</p>
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
                                placeholder="密码（至少6位，包含字母和数字）"
                                autocomplete="new-password"
                                :class="{ 'has-error': errors.password }"
                                @blur="validateField('password')"
                                @focus="clearError('password')"
                            />
                            <div class="ios-input-toggle" @click="togglePassword">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <EyeOutline v-if="!showPassword" />
                                    <EyeOffOutline v-else />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="errors.password" class="ios-error-text">
                            {{ errors.password }}
                        </div>
                    </div>

                    <!-- 确认密码输入 -->
                    <div class="ios-input-group">
                        <div class="ios-input-wrapper">
                            <div class="ios-input-icon">
                                <NIcon size="20" color="var(--ios-secondary-text)">
                                    <LockClosedOutline />
                                </NIcon>
                            </div>
                            <input
                                v-model="formData.confirmPassword"
                                :type="showConfirmPassword ? 'text' : 'password'"
                                class="ios-input"
                                placeholder="确认密码"
                                autocomplete="new-password"
                                :class="{ 'has-error': errors.confirmPassword }"
                                @blur="validateField('confirmPassword')"
                                @focus="clearError('confirmPassword')"
                                @keydown.enter="handleRegister"
                            />
                            <div class="ios-input-toggle" @click="toggleConfirmPassword">
                                <NIcon size="16" color="var(--ios-secondary-text)">
                                    <EyeOutline v-if="!showConfirmPassword" />
                                    <EyeOffOutline v-else />
                                </NIcon>
                            </div>
                        </div>
                        <div v-if="errors.confirmPassword" class="ios-error-text">
                            {{ errors.confirmPassword }}
                        </div>
                    </div>
                </div>

                <!-- 协议同意 -->
                <div class="ios-form-group">
                    <div class="ios-agreement-section">
                        <div class="ios-checkbox-group" @click="toggleAgreement">
                            <div class="ios-checkbox" :class="{ checked: formData.agreeToTerms }">
                                <NIcon v-if="formData.agreeToTerms" size="12" color="white">
                                    <CheckmarkOutline />
                                </NIcon>
                            </div>
                            <div class="ios-agreement-text">
                                我已阅读并同意
                                <button
                                    type="button"
                                    class="ios-link-button"
                                    @click.stop="showTermsModal = true"
                                >
                                    《用户协议》
                                </button>
                                和
                                <button
                                    type="button"
                                    class="ios-link-button"
                                    @click.stop="showPrivacyModal = true"
                                >
                                    《隐私政策》
                                </button>
                            </div>
                        </div>
                        <div v-if="errors.agreeToTerms" class="ios-error-text">
                            {{ errors.agreeToTerms }}
                        </div>
                    </div>

                    <!-- 注册按钮 -->
                    <div class="ios-button-group">
                        <button
                            type="button"
                            class="ios-primary-button"
                            :class="{ loading: isLoading }"
                            :disabled="isLoading || !isFormValid"
                            @click="handleRegister"
                        >
                            <div v-if="isLoading" class="ios-loading-spinner"></div>
                            <span v-else>注册</span>
                        </button>
                    </div>
                </div>
            </div>

            <!-- 登录链接 -->
            <div class="ios-footer-section">
                <p class="ios-footer-text">
                    已有账户？
                    <button
                        type="button"
                        class="ios-link-button"
                        @click="$router.push('/auth/login')"
                    >
                        立即登录
                    </button>
                </p>
            </div>

            <!-- 底部安全区域 -->
            <div class="ios-safe-area-bottom"></div>
        </div>

        <!-- 学院选择模态框 -->
        <Transition name="ios-modal">
            <div
                v-if="showCollegeModal"
                class="ios-modal-overlay"
                @click="showCollegeModal = false"
            >
                <div class="ios-modal-content" @click.stop>
                    <div class="ios-modal-header">
                        <button class="ios-modal-cancel" @click="showCollegeModal = false">
                            取消
                        </button>
                        <h3>选择学院</h3>
                        <button class="ios-modal-confirm" @click="confirmCollege">确定</button>
                    </div>
                    <div class="ios-modal-body">
                        <div
                            v-for="college in collegeOptions"
                            :key="college.value"
                            class="ios-option-item"
                            :class="{ selected: tempCollege === college.value }"
                            @click="tempCollege = college.value"
                        >
                            {{ college.label }}
                            <NIcon
                                v-if="tempCollege === college.value"
                                size="16"
                                color="var(--ios-primary-color)"
                            >
                                <CheckmarkOutline />
                            </NIcon>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 年级选择模态框 -->
        <Transition name="ios-modal">
            <div v-if="showGradeModal" class="ios-modal-overlay" @click="showGradeModal = false">
                <div class="ios-modal-content" @click.stop>
                    <div class="ios-modal-header">
                        <button class="ios-modal-cancel" @click="showGradeModal = false">
                            取消
                        </button>
                        <h3>选择年级</h3>
                        <button class="ios-modal-confirm" @click="confirmGrade">确定</button>
                    </div>
                    <div class="ios-modal-body">
                        <div
                            v-for="grade in gradeOptions"
                            :key="grade.value"
                            class="ios-option-item"
                            :class="{ selected: tempGrade === grade.value }"
                            @click="tempGrade = grade.value"
                        >
                            {{ grade.label }}
                            <NIcon
                                v-if="tempGrade === grade.value"
                                size="16"
                                color="var(--ios-primary-color)"
                            >
                                <CheckmarkOutline />
                            </NIcon>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 协议模态框 -->
        <Transition name="ios-modal">
            <div v-if="showTermsModal" class="ios-modal-overlay" @click="showTermsModal = false">
                <div class="ios-modal-content large" @click.stop>
                    <div class="ios-modal-header">
                        <button class="ios-modal-cancel" @click="showTermsModal = false">
                            关闭
                        </button>
                        <h3>用户协议</h3>
                        <div></div>
                    </div>
                    <div class="ios-modal-body scrollable">
                        <div class="terms-content">
                            <h4>欢迎使用哈尔滨学院校园服务平台</h4>
                            <p>在使用本平台服务前，请仔细阅读并同意以下条款：</p>
                            <h5>1. 服务说明</h5>
                            <p>
                                本平台为哈尔滨学院学生提供校园生活服务，包括但不限于代取服务、任务发布、论坛交流等功能。
                            </p>
                            <h5>2. 用户责任</h5>
                            <p>用户须提供真实、准确的个人信息，并对其在平台上的行为负责。</p>
                            <h5>3. 平台规则</h5>
                            <p>
                                用户须遵守平台相关规则，不得发布违法、违规内容，不得恶意刷单或进行其他不当行为。
                            </p>
                            <h5>4. 隐私保护</h5>
                            <p>我们承诺保护用户隐私，详情请查看隐私政策。</p>
                            <h5>5. 服务变更</h5>
                            <p>平台有权根据实际情况调整服务内容，并会及时通知用户。</p>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- 隐私政策模态框 -->
        <Transition name="ios-modal">
            <div
                v-if="showPrivacyModal"
                class="ios-modal-overlay"
                @click="showPrivacyModal = false"
            >
                <div class="ios-modal-content large" @click.stop>
                    <div class="ios-modal-header">
                        <button class="ios-modal-cancel" @click="showPrivacyModal = false">
                            关闭
                        </button>
                        <h3>隐私政策</h3>
                        <div></div>
                    </div>
                    <div class="ios-modal-body scrollable">
                        <div class="privacy-content">
                            <h4>隐私政策</h4>
                            <p>我们重视您的隐私保护，特制定本隐私政策：</p>
                            <h5>1. 信息收集</h5>
                            <p>我们仅收集提供服务所必需的信息，包括基本身份信息、联系方式等。</p>
                            <h5>2. 信息使用</h5>
                            <p>您的信息仅用于平台服务提供，不会用于其他商业目的。</p>
                            <h5>3. 信息共享</h5>
                            <p>我们不会向第三方出售、交易或转让您的个人信息。</p>
                            <h5>4. 信息安全</h5>
                            <p>我们采用合理的安全措施保护您的个人信息安全。</p>
                            <h5>5. 联系我们</h5>
                            <p>如有隐私相关问题，请联系平台客服。</p>
                        </div>
                    </div>
                </div>
            </div>
        </Transition>

        <!-- iOS风格加载覆盖层 -->
        <div v-if="isLoading" class="ios-loading-overlay">
            <div class="ios-loading-content">
                <div class="ios-loading-spinner large"></div>
                <p class="ios-loading-text">正在注册...</p>
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
import { useRouter } from 'vue-router';
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
    ChevronForwardOutline,
    CardOutline,
    DocumentTextOutline,
    MailOutline,
    CallOutline,
    BusinessOutline,
    BookOutline,
    CalendarOutline,
} from '@vicons/ionicons5';
import { useUserStore } from '@/stores';
import type { UserRegisterData } from '@/types';

const router = useRouter();
const userStore = useUserStore();

// 响应式数据
const isLoading = ref(false);
const showPassword = ref(false);
const showConfirmPassword = ref(false);
const isDarkMode = ref(false);
const currentTime = ref('');
const toastMessage = ref('');
const toastType = ref<'success' | 'error'>('success');

// 模态框状态
const showCollegeModal = ref(false);
const showGradeModal = ref(false);
const showTermsModal = ref(false);
const showPrivacyModal = ref(false);

// 临时选择值
const tempCollege = ref('');
const tempGrade = ref('');

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

// 错误状态
const errors = reactive<Record<string, string>>({});

// 选项数据
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

const gradeOptions = [
    { label: '2024级', value: '2024级' },
    { label: '2023级', value: '2023级' },
    { label: '2022级', value: '2022级' },
    { label: '2021级', value: '2021级' },
    { label: '2020级', value: '2020级' },
];

// 计算属性
const isFormValid = computed(() => {
    const requiredFields = [
        'student_id',
        'username',
        'real_name',
        'email',
        'college',
        'major',
        'grade',
        'password',
        'confirmPassword',
    ];

    // 检查所有必填字段是否填写
    const allFieldsFilled = requiredFields.every(field => {
        if (field === 'confirmPassword') return formData.confirmPassword.trim() !== '';
        if (field === 'agreeToTerms') return formData.agreeToTerms;
        return formData[field as keyof UserRegisterData]?.toString().trim() !== '';
    });

    // 检查是否有错误
    const hasErrors = Object.values(errors).some(error => error !== '');

    // 检查协议是否同意
    const agreementAccepted = formData.agreeToTerms;

    return allFieldsFilled && !hasErrors && agreementAccepted;
});

// 验证方法
const validateField = (fieldName: string) => {
    const value =
        fieldName === 'confirmPassword'
            ? formData.confirmPassword
            : formData[fieldName as keyof UserRegisterData];

    switch (fieldName) {
        case 'student_id':
            if (!value) {
                errors.student_id = '请输入学号';
            } else if (!/^[A-Za-z0-9]{8,12}$/.test(value.toString())) {
                errors.student_id = '学号格式不正确（8-12位字母数字组合）';
            } else {
                errors.student_id = '';
            }
            break;

        case 'username':
            if (!value) {
                errors.username = '请输入用户名';
            } else if (value.toString().length < 2 || value.toString().length > 20) {
                errors.username = '用户名长度为2-20个字符';
            } else if (!/^[a-zA-Z0-9\u4e00-\u9fa5_-]+$/.test(value.toString())) {
                errors.username = '用户名只能包含中文、英文、数字、下划线和横线';
            } else {
                errors.username = '';
            }
            break;

        case 'real_name':
            if (!value) {
                errors.real_name = '请输入真实姓名';
            } else if (value.toString().length < 2 || value.toString().length > 10) {
                errors.real_name = '姓名长度为2-10个字符';
            } else if (!/^[\u4e00-\u9fa5a-zA-Z\s]+$/.test(value.toString())) {
                errors.real_name = '姓名只能包含中文和英文字母';
            } else {
                errors.real_name = '';
            }
            break;

        case 'email':
            if (!value) {
                errors.email = '请输入邮箱地址';
            } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.toString())) {
                errors.email = '请输入正确的邮箱格式';
            } else {
                errors.email = '';
            }
            break;

        case 'phone':
            if (value && !/^1[3-9]\d{9}$/.test(value.toString())) {
                errors.phone = '请输入正确的手机号格式';
            } else {
                errors.phone = '';
            }
            break;

        case 'college':
            if (!value) {
                errors.college = '请选择学院';
            } else {
                errors.college = '';
            }
            break;

        case 'major':
            if (!value) {
                errors.major = '请输入专业';
            } else {
                errors.major = '';
            }
            break;

        case 'grade':
            if (!value) {
                errors.grade = '请选择年级';
            } else {
                errors.grade = '';
            }
            break;

        case 'password':
            if (!value) {
                errors.password = '请输入密码';
            } else if (value.toString().length < 6) {
                errors.password = '密码长度至少6位';
            } else if (!/^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{6,}$/.test(value.toString())) {
                errors.password = '密码必须包含字母和数字';
            } else {
                errors.password = '';
                // 如果确认密码已填写，重新验证确认密码
                if (formData.confirmPassword) {
                    validateField('confirmPassword');
                }
            }
            break;

        case 'confirmPassword':
            if (!formData.confirmPassword) {
                errors.confirmPassword = '请确认密码';
            } else if (formData.confirmPassword !== formData.password) {
                errors.confirmPassword = '两次输入的密码不一致';
            } else {
                errors.confirmPassword = '';
            }
            break;
    }
};

// 清除错误状态
const clearError = (fieldName: string) => {
    errors[fieldName] = '';
};

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

// 切换密码显示
const togglePassword = () => {
    showPassword.value = !showPassword.value;
};

const toggleConfirmPassword = () => {
    showConfirmPassword.value = !showConfirmPassword.value;
};

// 切换协议同意
const toggleAgreement = () => {
    formData.agreeToTerms = !formData.agreeToTerms;
    if (formData.agreeToTerms) {
        errors.agreeToTerms = '';
    }
    // 触觉反馈
    if (navigator.vibrate) {
        navigator.vibrate(10);
    }
};

// 学院选择确认
const confirmCollege = () => {
    formData.college = tempCollege.value;
    errors.college = '';
    showCollegeModal.value = false;
};

// 年级选择确认
const confirmGrade = () => {
    formData.grade = tempGrade.value;
    errors.grade = '';
    showGradeModal.value = false;
};

// 显示提示消息
const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    toastMessage.value = message;
    toastType.value = type;

    setTimeout(() => {
        toastMessage.value = '';
    }, 3000);
};

// 注册处理
const handleRegister = async () => {
    // 验证所有字段
    const fieldsToValidate = [
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
    ];

    let hasErrors = false;
    fieldsToValidate.forEach(field => {
        validateField(field);
        if (errors[field]) {
            hasErrors = true;
        }
    });

    // 检查协议同意
    if (!formData.agreeToTerms) {
        errors.agreeToTerms = '请阅读并同意用户协议和隐私政策';
        hasErrors = true;
    }

    if (hasErrors) {
        showToast('请检查表单信息', 'error');
        return;
    }

    isLoading.value = true;

    try {
        // 准备注册数据
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
            showToast('注册成功！正在跳转...', 'success');

            // 延迟跳转，让用户看到成功提示
            setTimeout(() => {
                router.push('/');
            }, 1500);
        }
    } catch (error: any) {
        let errorMessage = '注册失败，请重试';

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

// 生命周期
onMounted(() => {
    detectDarkMode();
    updateTime();

    // 定时更新时间
    const timeInterval = setInterval(updateTime, 1000);

    // 监听主题变化
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', detectDarkMode);

    // 初始化临时选择值
    tempCollege.value = formData.college;
    tempGrade.value = formData.grade;

    // 清理函数
    onUnmounted(() => {
        clearInterval(timeInterval);
        mediaQuery.removeEventListener('change', detectDarkMode);
    });
});
</script>

<style scoped>
/* 继承所有Login页面的CSS变量和基础样式 */
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
.ios-register-container {
    min-height: 100vh;
    background: var(--ios-bg-primary);
    display: flex;
    flex-direction: column;
    position: relative;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
}

/* 复用登录页面的状态栏和导航栏样式 */
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
    padding: 40px 20px 30px;
    text-align: center;
    background: var(--ios-bg-secondary);
}

.brand-logo {
    margin-bottom: 16px;
}

.brand-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--ios-primary-text);
    margin: 0 0 6px 0;
}

.brand-subtitle {
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
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.ios-form-header {
    margin-bottom: 24px;
    text-align: center;
}

.ios-form-header h2 {
    font-size: 20px;
    font-weight: 700;
    color: var(--ios-primary-text);
    margin: 0 0 6px 0;
}

.ios-form-header p {
    font-size: 14px;
    color: var(--ios-secondary-text);
    margin: 0;
}

/* 输入组样式 - 继承登录页面 */
.ios-input-group {
    margin-bottom: 16px;
}

.ios-input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--ios-bg-tertiary);
    border: 1px solid var(--ios-border-color);
    border-radius: 12px;
    padding: 0 16px;
    height: 48px;
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

.ios-input-toggle:active {
    background-color: var(--ios-border-color);
}

.ios-error-text {
    font-size: 13px;
    color: var(--ios-error-color);
    margin-top: 6px;
    padding-left: 16px;
}

/* 选择器样式 */
.ios-selector-wrapper {
    position: relative;
    display: flex;
    align-items: center;
    background: var(--ios-bg-tertiary);
    border: 1px solid var(--ios-border-color);
    border-radius: 12px;
    padding: 0 16px;
    height: 48px;
    cursor: pointer;
    transition: all 0.2s ease;
}

.ios-selector-wrapper:active {
    background-color: var(--ios-border-color);
}

.ios-selector-text {
    flex: 1;
    font-size: 16px;
    color: var(--ios-primary-text);
    margin-left: 44px;
}

.ios-selector-text.placeholder {
    color: var(--ios-secondary-text);
}

.ios-selector-arrow {
    margin-left: 8px;
    flex-shrink: 0;
}

/* 协议区域 */
.ios-agreement-section {
    margin-bottom: 24px;
}

.ios-checkbox-group {
    display: flex;
    align-items: flex-start;
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
    gap: 12px;
}

.ios-checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid var(--ios-border-color);
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    flex-shrink: 0;
    margin-top: 2px;
}

.ios-checkbox.checked {
    background: var(--ios-primary-color);
    border-color: var(--ios-primary-color);
}

.ios-agreement-text {
    font-size: 14px;
    color: var(--ios-primary-text);
    line-height: 1.4;
}

.ios-link-button {
    background: transparent;
    border: none;
    color: var(--ios-primary-color);
    font-size: 14px;
    cursor: pointer;
    padding: 2px 4px;
    border-radius: 4px;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.ios-link-button:active {
    opacity: 0.3;
    background-color: var(--ios-border-color);
}

/* 按钮样式 - 继承登录页面 */
.ios-button-group {
    margin-bottom: 20px;
}

.ios-primary-button {
    width: 100%;
    height: 48px;
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

/* 底部区域 */
.ios-footer-section {
    padding: 30px 20px 20px;
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

/* 模态框样式 */
.ios-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--ios-overlay);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 0;
}

.ios-modal-content {
    background: var(--ios-bg-secondary);
    border-radius: 20px 20px 0 0;
    width: 100%;
    max-height: 70vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.ios-modal-content.large {
    max-height: 80vh;
}

.ios-modal-header {
    padding: 16px 20px;
    border-bottom: 0.5px solid var(--ios-separator);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.ios-modal-header h3 {
    font-size: 17px;
    font-weight: 600;
    color: var(--ios-primary-text);
    margin: 0;
}

.ios-modal-cancel,
.ios-modal-confirm {
    background: transparent;
    border: none;
    color: var(--ios-primary-color);
    font-size: 16px;
    cursor: pointer;
    padding: 8px;
    border-radius: 6px;
    transition: all 0.2s ease;
}

.ios-modal-cancel:active,
.ios-modal-confirm:active {
    opacity: 0.3;
    background-color: var(--ios-border-color);
}

.ios-modal-body {
    flex: 1;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
}

.ios-modal-body.scrollable {
    padding: 20px;
}

.ios-option-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 20px;
    border-bottom: 0.5px solid var(--ios-separator);
    cursor: pointer;
    transition: background-color 0.2s ease;
    font-size: 16px;
    color: var(--ios-primary-text);
}

.ios-option-item:last-child {
    border-bottom: none;
}

.ios-option-item:active {
    background-color: var(--ios-bg-tertiary);
}

.ios-option-item.selected {
    color: var(--ios-primary-color);
}

/* 协议内容样式 */
.terms-content,
.privacy-content {
    line-height: 1.6;
}

.terms-content h4,
.privacy-content h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--ios-primary-text);
    margin: 0 0 12px 0;
}

.terms-content h5,
.privacy-content h5 {
    font-size: 16px;
    font-weight: 600;
    color: var(--ios-primary-text);
    margin: 16px 0 8px 0;
}

.terms-content p,
.privacy-content p {
    font-size: 14px;
    color: var(--ios-secondary-text);
    margin: 0 0 12px 0;
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

/* 动画 */
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

.ios-modal-enter-active {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.ios-modal-leave-active {
    transition: all 0.3s ease;
}

.ios-modal-enter-from {
    opacity: 0;
}

.ios-modal-enter-from .ios-modal-content {
    transform: translateY(100%);
}

.ios-modal-leave-to {
    opacity: 0;
}

.ios-modal-leave-to .ios-modal-content {
    transform: translateY(100%);
}

/* 适配不同屏幕尺寸 */
@media (max-width: 375px) {
    .ios-brand-section {
        padding: 30px 20px 20px;
    }

    .brand-title {
        font-size: 24px;
    }

    .ios-form-header h2 {
        font-size: 18px;
    }

    .ios-input-wrapper,
    .ios-selector-wrapper,
    .ios-primary-button {
        height: 46px;
    }
}

/* 横屏适配 */
@media (orientation: landscape) and (max-height: 500px) {
    .ios-brand-section {
        padding: 20px 20px 15px;
    }

    .brand-logo {
        margin-bottom: 8px;
    }

    .brand-logo .n-icon {
        font-size: 60px !important;
    }

    .brand-title {
        font-size: 24px;
    }

    .ios-form-group {
        padding: 16px;
        margin-bottom: 16px;
    }

    .ios-form-header {
        margin-bottom: 20px;
    }

    .ios-input-group {
        margin-bottom: 12px;
    }
}

/* 支持触摸设备的优化 */
@media (hover: none) and (pointer: coarse) {
    .ios-input-wrapper:focus-within {
        transform: none;
    }

    .ios-primary-button:active {
        transform: scale(0.95);
    }
}
</style>
