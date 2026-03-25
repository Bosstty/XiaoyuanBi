<template>
    <div class="task-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-nav">
            <div class="nav-back-group" @click="router.back()">
                <n-icon size="20" class="back-icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
                            fill="currentColor"
                        />
                    </svg>
                </n-icon>
                <span class="nav-title">任务详情</span>
            </div>
        </header>

        <main class="detail-container">
            <div v-if="loading" class="detail-state">
                <NSpin size="large" />
            </div>

            <div v-else-if="taskError" class="detail-state detail-state--text">
                <p>{{ taskError }}</p>
                <NButton quaternary round @click="refreshDetail">重新加载</NButton>
            </div>

            <NSpace v-else-if="task" vertical size="large">
                <NCard :bordered="false" class="main-info-card">
                    <div class="card-header">
                        <div class="category-tag">
                            <span class="blue-bar"></span>
                            <span class="cat-text">{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <NTag :bordered="false" type="warning" size="small" round>
                            {{ getStatusLabel(task.status) }}
                        </NTag>
                    </div>

                    <h1 class="task-title">{{ task.title }}</h1>
                    <p class="task-desc">{{ task.description }}</p>

                    <div class="divider"></div>

                    <div class="meta-row">
                        <div class="price-text">¥{{ formatAmount(task.price) }}</div>
                        <div class="meta-item">
                            <NIcon :component="PersonOutline" />
                            <span>{{ task.max_applicants || 1 }}人</span>
                        </div>
                        <div class="meta-item">
                            <NIcon :component="TimeOutline" />
                            <span>{{ formatRelativeTime(task.createdAt) }}</span>
                        </div>
                    </div>
                    <div class="deadline-note">截止时间：{{ formatDateTime(task.deadline) }}</div>
                </NCard>

                <NCard
                    :bordered="false"
                    title="任务要求"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <p class="req-text">{{ task.requirements || '暂无具体要求内容' }}</p>
                    <NSpace size="small" style="margin-top: 12px">
                        <NTag
                            v-for="tag in task.tags || []"
                            :key="tag"
                            :bordered="false"
                            size="small"
                        >
                            # {{ tag }}
                        </NTag>
                    </NSpace>
                </NCard>

                <NCard :bordered="false">
                    <div class="user-info-wrapper">
                        <NAvatar
                            round
                            :size="48"
                            :src="resolveAvatarUrl(task.publisher?.avatar)"
                            :fallback-src="null"
                        >
                            {{ publisherName.charAt(0) }}
                        </NAvatar>
                        <div class="user-main">
                            <div class="name-line">
                                <span class="username">{{ publisherName }}</span>
                                <span class="rating">
                                    评分 {{ task.publisher?.rating || '5.0' }}
                                </span>
                            </div>
                            <div class="major">{{ task.publisher?.major || '校友认证' }}</div>
                        </div>
                        <NButton
                            v-if="task.publisher?.id && task.publisher.id !== currentUserId"
                            secondary
                            round
                            size="small"
                            @click="chatWithUser(task.publisher.id)"
                        >
                            聊一聊
                        </NButton>
                    </div>
                </NCard>

                <NCard
                    v-if="isPublisher"
                    :bordered="false"
                    title="申请列表"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <div v-if="applicationLoading" class="application-state">
                        <NSpin size="small" />
                    </div>
                    <div v-else-if="applications.length" class="application-list">
                        <article
                            v-for="application in applications"
                            :key="application.id"
                            class="application-card"
                        >
                            <div class="application-main">
                                <div class="application-user">
                                    <NAvatar
                                        round
                                        :size="42"
                                        :src="resolveAvatarUrl(application.applicant?.avatar)"
                                    >
                                        {{ getApplicantName(application).charAt(0) }}
                                    </NAvatar>
                                    <div class="application-copy">
                                        <div class="application-title-row">
                                            <strong>{{ getApplicantName(application) }}</strong>
                                            <NTag size="small" :bordered="false" round>
                                                {{ getApplicationStatusLabel(application.status) }}
                                            </NTag>
                                        </div>
                                        <p>
                                            {{ application.applicant?.college || '未填写学院' }}
                                            <span v-if="application.applicant?.major">
                                                · {{ application.applicant?.major }}
                                            </span>
                                        </p>
                                        <span>{{ formatDateTime(application.createdAt) }} 提交申请</span>
                                    </div>
                                </div>
                                <div class="application-actions">
                                    <NButton
                                        v-if="application.status === 'pending'"
                                        size="small"
                                        tertiary
                                        round
                                        :loading="processingId === application.id && processingAction === 'reject'"
                                        @click="processApplication(application, 'reject')"
                                    >
                                        拒绝
                                    </NButton>
                                    <NButton
                                        v-if="application.status === 'pending'"
                                        size="small"
                                        type="primary"
                                        round
                                        :loading="processingId === application.id && processingAction === 'accept'"
                                        @click="processApplication(application, 'accept')"
                                    >
                                        同意
                                    </NButton>
                                </div>
                            </div>
                        </article>
                    </div>
                    <div v-else class="application-state application-state--text">
                        暂无申请记录
                    </div>
                </NCard>
            </NSpace>

            <div v-else class="detail-state detail-state--text">
                <p>任务不存在或已下线</p>
                <NButton quaternary round @click="router.push('/tasks/list')">返回任务列表</NButton>
            </div>
        </main>

        <div v-if="task" class="bottom-action-bar">
            <NButton
                v-if="canApply"
                type="primary"
                block
                size="large"
                :loading="applying"
                @click="applyTask"
                style="border-radius: 12px; font-weight: 600"
            >
                立即申请
            </NButton>
            <NButton
                v-else-if="canComplete"
                type="primary"
                block
                size="large"
                :loading="completing"
                @click="completeTask"
                style="border-radius: 12px; font-weight: 600"
            >
                提交完成任务
            </NButton>
            <NButton
                v-else-if="canConfirmCompletion"
                type="primary"
                block
                size="large"
                :loading="confirming"
                @click="confirmTaskCompletion"
                style="border-radius: 12px; font-weight: 600"
            >
                确认完成任务
            </NButton>
            <NButton
                v-else
                block
                size="large"
                disabled
                :class="{
                    'bottom-action-button--rejected': isRejectedApplication,
                    'bottom-action-button--submitted': isSubmittedAwaitingConfirm,
                }"
                style="border-radius: 12px"
            >
                {{ bottomActionText }}
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    NAvatar,
    NButton,
    NCard,
    NIcon,
    NInput,
    NSpace,
    NSpin,
    NTag,
    useDialog,
    useMessage,
} from 'naive-ui';
import { PersonOutline, TimeOutline } from '@vicons/ionicons5';
import { TaskApi, WalletApi, chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { Task, TaskApplication } from '@/types';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const message = useMessage();
const dialog = useDialog();

const loading = ref(true);
const applicationLoading = ref(false);
const applying = ref(false);
const completing = ref(false);
const confirming = ref(false);
const processingId = ref<number | null>(null);
const processingAction = ref<'accept' | 'reject' | null>(null);
const taskError = ref('');
const paymentPassword = ref('');
const setupPaymentPassword = ref('');

const task = ref<Task | null>(null);
const applications = ref<TaskApplication[]>([]);

const taskId = computed(() => Number(route.params.id || 0));
const currentUserId = computed(() => Number(userStore.user?.id || 0));
const isPublisher = computed(() => task.value?.publisher_id === currentUserId.value);
const isAssignee = computed(() => task.value?.assignee_id === currentUserId.value);
const canApply = computed(
    () =>
        !!task.value &&
        task.value.status === 'published' &&
        !isPublisher.value &&
        !task.value.assignee_id &&
        !task.value.has_applied
);
const canComplete = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        isAssignee.value &&
        !task.value.submit_time
);
const canConfirmCompletion = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        isPublisher.value &&
        Boolean(task.value.submit_time)
);
const isRejectedApplication = computed(
    () => task.value?.current_user_application_status === 'rejected'
);
const isSubmittedAwaitingConfirm = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        Boolean(task.value.submit_time) &&
        isAssignee.value
);
const bottomActionText = computed(() => {
    if (!task.value) {
        return '暂不可操作';
    }

    if (isPublisher.value) {
        if (task.value.status === 'in_progress' && task.value.submit_time) {
            return '申请人已提交，待你确认';
        }
        return task.value.status === 'in_progress' ? '任务进行中' : '这是你发布的任务';
    }

    if (task.value.current_user_application_status === 'accepted') {
        if (task.value.status === 'in_progress' && task.value.submit_time) {
            return '已提交完成，等待发布者确认';
        }
        return '你已被录用';
    }

    if (task.value.current_user_application_status === 'rejected') {
        return '申请未通过';
    }

    if (task.value.current_user_application_status === 'pending') {
        return '已申请，等待处理';
    }

    if (task.value.status === 'in_progress') {
        return '任务进行中，暂不可再申请';
    }

    if (task.value.status === 'completed') {
        return '任务已完成';
    }

    if (task.value.status === 'cancelled') {
        return '任务已取消';
    }

    if (task.value.status === 'expired') {
        return '任务已过期';
    }

    return '暂不可申请';
});

const publisherName = computed(
    () => task.value?.publisher?.real_name || task.value?.publisher?.username || '匿名用户'
);

const assigneeName = computed(
    () => task.value?.assignee?.real_name || task.value?.assignee?.username || '承接人'
);

const getCategoryLabel = (cat: string) =>
    ({ study: '学习类', design: '设计类', tech: '技术类', writing: '文案类', life: '生活类' })[
        cat
    ] ?? '任务';

const getStatusLabel = (status: string) =>
    ({
        pending: '审核中',
        published: '招募中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        expired: '已过期',
    })[status] ?? status;

const getApplicationStatusLabel = (status: string) =>
    ({ pending: '待处理', accepted: '已同意', rejected: '已拒绝' })[status] ?? status;

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }
    if (value.startsWith('/uploads/')) {
        return `${window.location.origin}${value}`;
    }
    return value;
};

const formatAmount = (value?: string | number | null) => Number(value || 0).toFixed(2);

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
        2,
        '0'
    )}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatRelativeTime = (value?: string | null) => {
    if (!value) return '--';
    const diff = Date.now() - new Date(value).getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const getApplicantName = (application: TaskApplication) =>
    application.applicant?.real_name || application.applicant?.username || '申请者';

const fetchTask = async () => {
    if (!taskId.value) {
        loading.value = false;
        return;
    }

    loading.value = true;
    taskError.value = '';
    try {
        const response = await TaskApi.getTask(taskId.value);
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取任务详情失败');
        }
        task.value = response.data;
    } catch (error: any) {
        taskError.value = error?.message || '获取任务详情失败';
        task.value = null;
    } finally {
        loading.value = false;
    }
};

const fetchApplications = async () => {
    if (!taskId.value || !isPublisher.value) {
        applications.value = [];
        return;
    }

    applicationLoading.value = true;
    try {
        const response = await TaskApi.getTaskApplications(taskId.value);
        if (!response.success) {
            throw new Error(response.message || '获取申请列表失败');
        }
        applications.value = Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        applications.value = [];
        message.error(error?.message || '获取申请列表失败');
    } finally {
        applicationLoading.value = false;
    }
};

const refreshDetail = async () => {
    await fetchTask();
    await fetchApplications();
};

const applyTask = async () => {
    if (!task.value || applying.value) return;
    applying.value = true;
    try {
        const response = await TaskApi.applyTask(task.value.id, {
            message: `想承接任务「${task.value.title}」，可以进一步沟通细节。`,
        });
        if (!response.success) throw new Error(response.message || '申请失败');
        message.success('申请已提交');
        if (task.value) {
            task.value.has_applied = true;
            task.value.current_user_application_status = 'pending';
        }
        await chatWithUser(
            task.value.publisher_id,
            `想咨询任务「${task.value.title}」的具体要求和细节。`,
            false
        );
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '申请失败');
    } finally {
        applying.value = false;
    }
};

const completeTask = async () => {
    if (!task.value || completing.value) return;
    completing.value = true;
    try {
        const response = await TaskApi.completeTask(task.value.id, {});
        if (!response.success) throw new Error(response.message || '提交失败');
        task.value.submit_time = new Date().toISOString();
        message.success('已提交完成申请，请等待发布者确认');
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '提交失败');
    } finally {
        completing.value = false;
    }
};

const openSetPaymentPasswordDialog = () => {
    setupPaymentPassword.value = '';

    dialog.info({
        title: '设置支付密码',
        positiveText: '保存密码',
        negativeText: '取消',
        content: () =>
            h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
                h(
                    'p',
                    { style: 'margin:0;color:#64748b;font-size:14px;line-height:1.6;' },
                    '当前尚未设置支付密码。请先设置6位数字支付密码，再确认任务完成。'
                ),
                h(NInput, {
                    value: setupPaymentPassword.value,
                    type: 'password',
                    maxlength: 6,
                    showPasswordOn: 'click',
                    placeholder: '请输入6位数字支付密码',
                    onUpdateValue: (value: string) => {
                        setupPaymentPassword.value = value.replace(/\D/g, '').slice(0, 6);
                    },
                }),
            ]),
        async onPositiveClick() {
            if (!/^\d{6}$/.test(setupPaymentPassword.value)) {
                message.warning('请填写6位数字支付密码');
                return false;
            }

            try {
                const response = await WalletApi.setPaymentPassword({
                    payment_password: setupPaymentPassword.value,
                });
                if (!response.success) {
                    throw new Error(response.message || '设置支付密码失败');
                }
                message.success('支付密码设置成功，请重新确认支付');
                return true;
            } catch (error: any) {
                message.error(error?.message || '设置支付密码失败');
                return false;
            }
        },
    });
};

const openTaskPaymentDialog = () => {
    if (!task.value) return;

    paymentPassword.value = '';

    dialog.warning({
        title: '确认支付任务报酬',
        positiveText: '确认支付',
        negativeText: '取消',
        content: () =>
            h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
                h(
                    'p',
                    { style: 'margin:0;color:#0f172a;font-size:14px;font-weight:600;' },
                    `确认申请人已经完成任务后，将支付 ¥${formatAmount(task.value?.price)}`
                ),
                h(
                    'p',
                    { style: 'margin:0;color:#64748b;font-size:13px;line-height:1.6;' },
                    '本次将优先解冻已冻结的任务金额并完成支付，确认后不可撤回。'
                ),
                h(NInput, {
                    value: paymentPassword.value,
                    type: 'password',
                    maxlength: 6,
                    showPasswordOn: 'click',
                    placeholder: '请输入6位支付密码',
                    onUpdateValue: (value: string) => {
                        paymentPassword.value = value.replace(/\D/g, '').slice(0, 6);
                    },
                }),
            ]),
        async onPositiveClick() {
            if (!task.value) return false;
            if (!/^\d{6}$/.test(paymentPassword.value)) {
                message.warning('请输入6位数字支付密码');
                return false;
            }

            try {
                confirming.value = true;
                const response = await TaskApi.confirmTask(task.value.id, {
                    payment_password: paymentPassword.value,
                });
                if (!response.success) throw new Error(response.message || '确认失败');
                message.success('任务已确认完成并完成支付');
                await refreshDetail();
                return true;
            } catch (error: any) {
                message.error(error?.message || '确认失败');
                return false;
            } finally {
                confirming.value = false;
            }
        },
    });
};

const confirmTaskCompletion = async () => {
    if (!task.value || confirming.value) return;

    try {
        confirming.value = true;
        const overviewResponse = await WalletApi.getOverview();
        if (!overviewResponse.success || !overviewResponse.data) {
            throw new Error(overviewResponse.message || '获取支付信息失败');
        }
        confirming.value = false;

        if (!overviewResponse.data.wallet.payment_password_set) {
            openSetPaymentPasswordDialog();
            return;
        }

        openTaskPaymentDialog();
    } catch (error: any) {
        confirming.value = false;
        message.error(error?.message || '获取支付信息失败');
    }
};

const processApplication = (application: TaskApplication, action: 'accept' | 'reject') => {
    if (!task.value) return;

    dialog.warning({
        title: action === 'accept' ? '同意申请' : '拒绝申请',
        content:
            action === 'accept'
                ? `确认选择 ${getApplicantName(application)} 承接这个任务吗？同意后任务将进入进行中，当前任务不可再取消。`
                : `确认拒绝 ${getApplicantName(application)} 的申请吗？`,
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            processingId.value = application.id;
            processingAction.value = action;
            try {
                const response = await TaskApi.processApplication(
                    task.value!.id,
                    application.id,
                    action
                );
                if (!response.success) {
                    throw new Error(response.message || '处理申请失败');
                }
                message.success(action === 'accept' ? '已同意申请' : '已拒绝申请');
                await refreshDetail();
            } catch (error: any) {
                message.error(error?.message || '处理申请失败');
            } finally {
                processingId.value = null;
                processingAction.value = null;
            }
        },
    });
};

const chatWithUser = async (peerUserId: number, initialMessage: string, navigate = true) => {
    if (!peerUserId || peerUserId === currentUserId.value) return;
    try {
        const response = await chatApi.createConversation({
            peer_user_id: peerUserId,
            task_id: taskId.value,
            initial_message: initialMessage,
        });
        if (!response.success || !response.data?.id) {
            throw new Error(response.message || '打开会话失败');
        }
        if (navigate) {
            router.push(`/chat?conversationId=${response.data.id}`);
        }
    } catch (error: any) {
        message.error(error?.message || '打开会话失败');
    }
};

onMounted(async () => {
    await refreshDetail();
});
</script>

<style scoped>
.task-detail-page {
    background-color: #f7f9fc;
    min-height: 100vh;
    padding-bottom: env(safe-area-inset-bottom); /* 适配 iOS 底部 */
}

/* 顶部导航：紧凑风格 */
.top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    padding: 16px 16px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.nav-back-group {
    display: flex;
    align-items: center;
    cursor: pointer;
    width: fit-content;
    min-height: 28px;
}
.nav-title {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin-left: 6px;
}

/* 容器 */
.detail-container {
    padding: 16px;
}

/* 模仿图2左侧蓝色竖条 */
.category-tag {
    display: flex;
    align-items: center;
    gap: 6px;
}
.blue-bar {
    width: 3.5px;
    height: 15px;
    background-color: #3b82f6;
    border-radius: 2px;
}
.cat-text {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
}

/* 标题与内容 */
.task-title {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin: 12px 0 8px 0;
}
.task-desc {
    font-size: 15px;
    color: #475569;
    line-height: 1.6;
}

.divider {
    height: 1px;
    background-color: #f1f5f9;
    margin: 20px 0;
}

/* 元数据行 */
.meta-row {
    display: flex;
    align-items: center;
    gap: 20px;
}
.price-text {
    font-size: 22px;
    font-weight: 800;
    color: #3b82f6;
}
.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-size: 14px;
}
.deadline-note {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
}

/* 用户信息 */
.user-info-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
}
.user-main {
    flex: 1;
}
.name-line {
    display: flex;
    align-items: center;
    gap: 8px;
}
.username {
    font-weight: 600;
    font-size: 15px;
}
.rating {
    font-size: 12px;
    color: #64748b;
}
.major {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
}

/* 底部固定栏 */
.bottom-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 20px 30px;
    background: white;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.03);
}

:deep(.bottom-action-button--rejected.n-button) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.22);
}

:deep(.bottom-action-button--rejected.n-button .n-button__content) {
    color: #dc2626;
}

:deep(.bottom-action-button--submitted.n-button) {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.22);
}

:deep(.bottom-action-button--submitted.n-button .n-button__content) {
    color: #2563eb;
}

.application-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.application-card {
    padding: 14px 0;
    border-bottom: 1px solid #eef2f7;
}

.application-card:last-child {
    border-bottom: 0;
    padding-bottom: 0;
}

.application-main {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.application-user {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.application-copy {
    min-width: 0;
}

.application-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.application-copy strong {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
}

.application-copy p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #64748b;
}

.application-copy span {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #94a3b8;
}

.application-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.application-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 72px;
}

.application-state--text {
    color: #94a3b8;
    font-size: 13px;
}
</style>
