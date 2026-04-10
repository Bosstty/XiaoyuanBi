<template>
    <div class="profile-settings">
        <header class="top-nav">
            <div class="nav-back-group" @click="router.back()">
                <svg viewBox="0 0 24 24" class="back-icon">
                    <path
                        d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
                        fill="currentColor"
                    />
                </svg>
                <span class="nav-title">编辑个人资料</span>
            </div>
        </header>

        <section class="profile-settings__panel">
            <div class="profile-settings__avatar-row">
                <div class="profile-settings__avatar-wrap">
                    <div class="profile-settings__avatar-shell">
                        <img
                            v-if="avatarPreview || userStore.userAvatar"
                            :key="avatarPreview || userStore.userAvatar"
                            :src="avatarPreview || userStore.userAvatar"
                            alt="avatar"
                            class="profile-settings__avatar-image"
                        />
                        <span v-else class="profile-settings__avatar-fallback">{{ userInitial }}</span>
                    </div>
                </div>
                <div class="profile-settings__avatar-copy">
                    <strong>{{ userStore.userName }}</strong>
                    <p>{{ form.college || '未设置学院' }}<span v-if="form.major"> · {{ form.major }}</span></p>
                    <div class="profile-settings__avatar-actions">
                        <button
                            type="button"
                            class="profile-settings__upload"
                            :disabled="avatarUploading"
                            @click="triggerAvatarUpload"
                        >
                            {{ avatarUploading ? '上传中...' : '更换头像' }}
                        </button>
                        <span>支持 jpg / png</span>
                    </div>
                </div>
                <input
                    ref="avatarInputRef"
                    type="file"
                    accept="image/*"
                    class="profile-settings__file-input"
                    @change="handleAvatarChange"
                />
            </div>
        </section>

        <section class="profile-settings__panel">
            <div class="profile-settings__section-head">
                <h3>基础信息</h3>
            </div>
            <div class="profile-settings__grid">
                <div class="profile-settings__field">
                    <span>昵称</span>
                    <NInput v-model:value="form.username" placeholder="请输入昵称" />
                </div>
                <div class="profile-settings__field">
                    <span>真实姓名</span>
                    <NInput v-model:value="form.real_name" placeholder="请输入真实姓名" />
                </div>
                <div class="profile-settings__field">
                    <span>手机号</span>
                    <NInput v-model:value="form.phone" placeholder="请输入手机号" />
                </div>
                <div class="profile-settings__field">
                    <span>性别</span>
                    <NSelect
                        v-model:value="form.gender"
                        placeholder="请选择性别"
                        :options="genderOptions"
                        clearable
                    />
                </div>
                <div class="profile-settings__field">
                    <span>学院</span>
                    <NInput v-model:value="form.college" placeholder="请输入学院" />
                </div>
                <div class="profile-settings__field">
                    <span>专业</span>
                    <NInput v-model:value="form.major" placeholder="请输入专业" />
                </div>
                <div class="profile-settings__field">
                    <span>年级</span>
                    <NInput v-model:value="form.grade" placeholder="例如 2023级" />
                </div>
                <div class="profile-settings__field">
                    <span>宿舍</span>
                    <NInput v-model:value="form.dormitory" placeholder="请输入宿舍信息" />
                </div>
            </div>
        </section>

        <section class="profile-settings__panel">
            <div class="profile-settings__section-head">
                <h3>个性资料</h3>
            </div>
            <div class="profile-settings__field">
                <span>个人简介</span>
                <NInput
                    v-model:value="form.bio"
                    type="textarea"
                    placeholder="介绍一下你擅长的事情、日常提供的帮助或你的校园标签"
                    :autosize="{ minRows: 4, maxRows: 6 }"
                />
            </div>
            <div class="profile-settings__field">
                <span>技能标签</span>
                <NInput
                    v-model:value="skillsInput"
                    placeholder="多个技能请用中文逗号分隔，例如：PPT，美工，前端"
                />
            </div>
        </section>

        <section class="profile-settings__panel">
            <div class="profile-settings__section-head">
                <h3>账号状态</h3>
            </div>
            <div class="profile-settings__status-grid">
                <article class="profile-settings__status-card">
                    <span>邮箱</span>
                    <strong>{{ userStore.user?.email || '--' }}</strong>
                    <p>{{ userStore.user?.email_verified ? '已验证' : '未验证' }}</p>
                    <button
                        v-if="userStore.user?.email && !userStore.user?.email_verified"
                        type="button"
                        class="profile-settings__verify-button"
                        :disabled="emailSending"
                        @click="openEmailVerificationModal"
                    >
                        {{ emailSending ? '发送中...' : '验证邮箱' }}
                    </button>
                </article>
                <article class="profile-settings__status-card">
                    <span>学生认证</span>
                    <strong>{{ studentVerificationLabel }}</strong>
                    <p>{{ studentVerificationHint }}</p>
                    <button
                        v-if="!userStore.user?.student_verified"
                        type="button"
                        class="profile-settings__verify-button"
                        :disabled="studentVerificationUploading"
                        @click="triggerStudentCardUpload"
                    >
                        {{ studentVerificationUploading ? '上传中...' : '上传学生证' }}
                    </button>
                </article>
                <article class="profile-settings__status-card">
                    <span>账户等级</span>
                    <strong>Lv.{{ userStore.user?.level || 1 }}</strong>
                    <p>{{ userStore.user?.points || 0 }} 积分</p>
                </article>
            </div>
        </section>

        <section class="profile-settings__footer">
            <NButton quaternary round size="large" @click="router.back()">返回</NButton>
            <NButton type="primary" round size="large" :loading="saving" @click="handleSave">
                保存资料
            </NButton>
        </section>

        <div class="profile-settings__safe-space"></div>

        <input
            ref="studentCardInputRef"
            type="file"
            accept="image/*"
            class="profile-settings__file-input"
            @change="handleStudentCardChange"
        />

        <NModal
            v-model:show="emailVerificationVisible"
            preset="card"
            class="profile-settings__email-modal"
            title="验证邮箱"
            :bordered="false"
            :mask-closable="!emailSending && !emailVerifying"
        >
            <div class="profile-settings__email-modal-copy">
                <p>验证码将发送到当前绑定邮箱</p>
                <strong>{{ userStore.user?.email || '--' }}</strong>
            </div>

            <div class="profile-settings__field">
                <span>邮箱验证码</span>
                <div class="profile-settings__code-row">
                    <NInput
                        v-model:value="emailVerificationCode"
                        placeholder="请输入 6 位验证码"
                        maxlength="6"
                    />
                    <NButton
                        type="primary"
                        secondary
                        :disabled="emailSending || countdown > 0 || !userStore.user?.email"
                        @click="sendEmailVerificationCode"
                    >
                        {{ countdown > 0 ? `${countdown}s 后重发` : '发送验证码' }}
                    </NButton>
                </div>
            </div>

            <template #footer>
                <div class="profile-settings__email-modal-actions">
                    <NButton quaternary @click="emailVerificationVisible = false">取消</NButton>
                    <NButton
                        type="primary"
                        :loading="emailVerifying"
                        :disabled="emailVerificationCode.trim().length !== 6"
                        @click="handleEmailVerification"
                    >
                        确认验证
                    </NButton>
                </div>
            </template>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NInput, NModal, NSelect, useMessage } from 'naive-ui';
import { useUserStore } from '@/stores';
import { UserApi } from '@/api';
import type { User } from '@/types';

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();

const avatarInputRef = ref<HTMLInputElement | null>(null);
const studentCardInputRef = ref<HTMLInputElement | null>(null);
const avatarPreview = ref('');
const avatarUploading = ref(false);
const studentVerificationUploading = ref(false);
const saving = ref(false);
const skillsInput = ref('');
const emailVerificationVisible = ref(false);
const emailVerificationCode = ref('');
const emailSending = ref(false);
const emailVerifying = ref(false);
const countdown = ref(0);
let countdownTimer: ReturnType<typeof setInterval> | null = null;

const form = reactive({
    username: '',
    real_name: '',
    phone: '',
    gender: null as User['gender'] | null,
    college: '',
    major: '',
    grade: '',
    dormitory: '',
    bio: '',
});

const genderOptions = [
    { label: '男', value: 'male' },
    { label: '女', value: 'female' },
    { label: '其他', value: 'other' },
];

const userInitial = computed(() => userStore.userName?.slice(0, 1).toUpperCase() || 'U');
const studentVerificationStatus = computed(
    () => userStore.user?.verification_data?.status || (userStore.user?.student_verified ? 'approved' : 'none')
);
const studentVerificationLabel = computed(() => {
    if (userStore.user?.student_verified) return '已认证';
    if (studentVerificationStatus.value === 'pending') return '审核中';
    if (studentVerificationStatus.value === 'rejected') return '认证未通过';
    return '未认证';
});
const studentVerificationHint = computed(() => {
    if (userStore.user?.student_verified) {
        return '学生身份已认证';
    }
    if (studentVerificationStatus.value === 'pending') {
        return '学生证已提交，等待管理员审核';
    }
    if (studentVerificationStatus.value === 'rejected') {
        return userStore.user?.verification_data?.review_reason || '学生认证未通过，可重新上传学生证';
    }
    return '上传学生证后提交审核';
});

const syncFormFromUser = () => {
    const user = userStore.user;
    if (!user) return;

    form.username = user.username || '';
    form.real_name = user.real_name || '';
    form.phone = user.phone || '';
    form.gender = user.gender || null;
    form.college = user.college || '';
    form.major = user.major || '';
    form.grade = user.grade || '';
    form.dormitory = user.dormitory || '';
    form.bio = user.bio || '';
    skillsInput.value = Array.isArray(user.skills) ? user.skills.join('，') : '';
}

const triggerAvatarUpload = () => {
    avatarInputRef.value?.click();
}

const triggerStudentCardUpload = () => {
    studentCardInputRef.value?.click();
}

const clearCountdown = () => {
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
};

const startCountdown = () => {
    clearCountdown();
    countdown.value = 60;
    countdownTimer = setInterval(() => {
        if (countdown.value <= 1) {
            countdown.value = 0;
            clearCountdown();
            return;
        }
        countdown.value -= 1;
    }, 1000);
};

const openEmailVerificationModal = async () => {
    if (!userStore.user?.email || userStore.user.email_verified) {
        return;
    }

    emailVerificationVisible.value = true;
    emailVerificationCode.value = '';

    if (countdown.value === 0) {
        await sendEmailVerificationCode();
    }
};

const sendEmailVerificationCode = async () => {
    if (!userStore.user?.email || emailSending.value) {
        return;
    }

    emailSending.value = true;

    try {
        await userStore.sendVerificationCode('email', userStore.user.email);
        startCountdown();
        message.success('验证码已发送到邮箱');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '验证码发送失败');
    } finally {
        emailSending.value = false;
    }
};

const handleEmailVerification = async () => {
    const email = userStore.user?.email;
    const code = emailVerificationCode.value.trim();

    if (!email) {
        message.error('当前账号未绑定邮箱');
        return;
    }

    if (code.length !== 6) {
        message.error('请输入 6 位验证码');
        return;
    }

    emailVerifying.value = true;

    try {
        await userStore.verifyCode('email', email, code);
        message.success('邮箱验证成功');
        emailVerificationVisible.value = false;
        emailVerificationCode.value = '';
    } catch (error) {
        message.error(error instanceof Error ? error.message : '邮箱验证失败');
    } finally {
        emailVerifying.value = false;
    }
};

const handleAvatarChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    avatarPreview.value = URL.createObjectURL(file);
    avatarUploading.value = true;

    try {
        await userStore.uploadAvatar(file);
        message.success('头像已更新');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '头像上传失败');
        avatarPreview.value = '';
    } finally {
        avatarUploading.value = false;
        input.value = '';
    }
}

const handleSave = async () => {
    saving.value = true;

    try {
        await userStore.updateProfile({
            username: form.username.trim(),
            real_name: form.real_name.trim(),
            phone: form.phone.trim(),
            gender: form.gender || undefined,
            college: form.college.trim(),
            major: form.major.trim(),
            grade: form.grade.trim(),
            dormitory: form.dormitory.trim(),
            bio: form.bio.trim(),
            skills: skillsInput.value
                .split(/[，,]/)
                .map(item => item.trim())
                .filter(Boolean),
        });
        message.success('个人资料已保存');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '保存失败');
    } finally {
        saving.value = false;
    }
}

const handleStudentCardChange = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    if (!file) {
        return;
    }

    studentVerificationUploading.value = true;

    try {
        const response = await UserApi.submitStudentVerification(file);
        if (response.success && response.data?.user) {
            userStore.user = response.data.user;
            localStorage.setItem('user', JSON.stringify(response.data.user));
        } else {
            await userStore.fetchUserProfile();
        }
        message.success(response.message || '学生认证材料已提交');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '学生认证提交失败');
    } finally {
        studentVerificationUploading.value = false;
        input.value = '';
    }
}

watch(
    () => userStore.user,
    () => {
        syncFormFromUser();
    },
    { immediate: true }
)

onMounted(async () => {
    if (userStore.isAuthenticated && !userStore.user) {
        await userStore.fetchUserProfile();
    }
    syncFormFromUser();
})

onBeforeUnmount(() => {
    clearCountdown();
})
</script>

<style scoped>
.profile-settings {
    min-height: 100%;
    padding: 0 16px;
    background:
        radial-gradient(circle at top right, rgba(47, 107, 255, 0.12), transparent 24%),
        linear-gradient(180deg, #f4f7fb 0%, #eef5fb 100%);
}

.profile-settings__panel {
    border-radius: 26px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(23, 48, 79, 0.06);
    box-shadow: 0 14px 34px rgba(23, 48, 79, 0.08);
}

.top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    padding: 16px 0 14px;
    margin: 0 -16px 18px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-back-group {
    display: flex;
    align-items: center;
    cursor: pointer;
    width: fit-content;
    min-height: 28px;
    padding: 0 16px;
}

.back-icon {
    width: 20px;
    height: 20px;
    color: #1a1a1a;
}

.nav-title {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin-left: 6px;
}

.profile-settings__panel {
    padding: 18px;
    margin-bottom: 16px;
}

.profile-settings__avatar-row {
    display: flex;
    align-items: center;
    gap: 16px;
}

.profile-settings__avatar-copy {
    min-width: 0;
    flex: 1;
}

.profile-settings__avatar-shell {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    overflow: hidden;
    background: linear-gradient(135deg, #17304f, #2f6bff);
    display: flex;
    align-items: center;
    justify-content: center;
}

.profile-settings__avatar-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.profile-settings__avatar-fallback {
    color: #ffffff;
    font-size: 28px;
    font-weight: 800;
}

.profile-settings__avatar-copy strong {
    display: block;
    font-size: 18px;
    font-weight: 800;
    color: #17304f;
}

.profile-settings__avatar-copy p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #6c7890;
}

.profile-settings__avatar-actions {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 12px;
}

.profile-settings__avatar-actions span {
    font-size: 12px;
    color: #8a95aa;
}

.profile-settings__upload {
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    background: linear-gradient(135deg, #17304f, #2f6bff);
    color: #fff;
    font-size: 13px;
    font-weight: 700;
}

.profile-settings__upload:disabled {
    opacity: 0.7;
}

.profile-settings__file-input {
    display: none;
}

.profile-settings__section-head {
    margin-bottom: 14px;
}

.profile-settings__section-head h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 800;
    color: #17304f;
}

.profile-settings__grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.profile-settings__field {
    display: grid;
    gap: 8px;
}

.profile-settings__field span {
    font-size: 13px;
    font-weight: 700;
    color: #5f78a8;
}

.profile-settings__status-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.profile-settings__status-card {
    padding: 16px;
    border-radius: 20px;
    background: linear-gradient(180deg, #f8fbff 0%, #eef4fd 100%);
}

.profile-settings__status-card span {
    display: block;
    font-size: 12px;
    color: #6e7a91;
}

.profile-settings__status-card strong {
    display: block;
    margin-top: 6px;
    font-size: 18px;
    font-weight: 800;
    color: #17304f;
}

.profile-settings__status-card p {
    margin: 8px 0 0;
    font-size: 12px;
    color: #8692a8;
}

.profile-settings__verify-button {
    margin-top: 12px;
    border: 0;
    border-radius: 999px;
    padding: 9px 14px;
    background: rgba(47, 107, 255, 0.12);
    color: #2f6bff;
    font-size: 13px;
    font-weight: 700;
}

.profile-settings__verify-button:disabled {
    opacity: 0.7;
}

.profile-settings__email-modal {
    width: min(92vw, 420px);
    border-radius: 24px;
}

.profile-settings__email-modal-copy {
    margin-bottom: 18px;
}

.profile-settings__email-modal-copy p {
    margin: 0;
    font-size: 13px;
    color: #6e7a91;
}

.profile-settings__email-modal-copy strong {
    display: block;
    margin-top: 8px;
    font-size: 20px;
    font-weight: 800;
    color: #17304f;
    word-break: break-all;
}

.profile-settings__code-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 10px;
}

.profile-settings__email-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.profile-settings__footer {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-top: 8px;
}

.profile-settings__safe-space {
    height: calc(108px + var(--safe-area-bottom, 0px));
}

@media (max-width: 768px) {
    .profile-settings__grid,
    .profile-settings__status-grid,
    .profile-settings__footer {
        grid-template-columns: 1fr;
    }

    .profile-settings__avatar-row {
        align-items: flex-start;
    }

    .profile-settings__code-row {
        grid-template-columns: 1fr;
    }

    .profile-settings__email-modal-actions {
        justify-content: stretch;
    }

    .profile-settings__email-modal-actions :deep(.n-button) {
        flex: 1;
    }
}
</style>
