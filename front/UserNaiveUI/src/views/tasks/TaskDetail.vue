<template>
    <div class="task-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-bar">
            <div class="nav-row">
                <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="title-copy">
                    <span class="eyebrow">Task Detail</span>
                    <h1>任务详情</h1>
                </div>
            </div>
        </header>

        <main class="detail-area">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
            </div>

            <div v-else-if="task" class="detail-stack">
                <section class="hero-card">
                    <div class="hero-head">
                        <div class="cat-tag" :data-type="task.category">
                            <span class="cat-bar"></span>
                            <span class="cat-label">{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <span class="status-badge" :class="`s-${task.status}`">
                            {{ getStatusLabel(task.status) }}
                        </span>
                    </div>

                    <h2 class="hero-title">{{ task.title }}</h2>
                    <p class="hero-desc">{{ task.description }}</p>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">任务编号</span>
                            <span class="meta-value mono">{{ task.task_no }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">报酬</span>
                            <span class="meta-value price">¥{{ formatAmount(task.price) }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">截止时间</span>
                            <span class="meta-value">{{ formatDateTime(task.deadline) }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">发布时间</span>
                            <span class="meta-value">{{ formatRelativeTime(task.createdAt) }}</span>
                        </div>
                    </div>

                    <div class="chip-row">
                        <span v-if="task.location" class="info-chip">{{ task.location }}</span>
                        <span v-if="task.remote_work" class="info-chip">远程可做</span>
                        <span v-if="task.urgent" class="info-chip info-chip--warn">加急</span>
                        <span class="info-chip">人数上限 {{ task.max_applicants || 1 }}</span>
                    </div>
                </section>

                <section v-if="task.requirements || task.skills_required?.length || task.tags?.length" class="panel-card">
                    <div class="section-head">
                        <h3>任务要求</h3>
                    </div>

                    <p v-if="task.requirements" class="requirements-text">
                        {{ task.requirements }}
                    </p>

                    <div v-if="task.skills_required?.length" class="pill-group">
                        <span v-for="skill in task.skills_required" :key="skill" class="pill">
                            {{ skill }}
                        </span>
                    </div>

                    <div v-if="task.tags?.length" class="pill-group">
                        <span v-for="tag in task.tags" :key="tag" class="pill pill--soft">
                            #{{ tag }}
                        </span>
                    </div>
                </section>

                <section class="panel-card">
                    <div class="section-head">
                        <h3>{{ isPublisher ? '发布者信息' : '雇主信息' }}</h3>
                        <NButton
                            v-if="task.publisher && !isPublisher"
                            size="small"
                            round
                            @click="chatWithUser(task.publisher.id, `想咨询任务「${task.title}」的具体要求和细节。`)"
                        >
                            聊一聊
                        </NButton>
                    </div>

                    <div class="user-card">
                        <div class="user-avatar">
                            <img
                                v-if="task.publisher?.avatar"
                                :src="task.publisher.avatar"
                                :alt="publisherName"
                            />
                            <span v-else>{{ publisherName.charAt(0) }}</span>
                        </div>
                        <div class="user-copy">
                            <div class="user-name">{{ publisherName }}</div>
                            <div class="user-sub">
                                评分 {{ task.publisher?.rating || '暂无' }}
                                <span v-if="task.publisher?.major"> · {{ task.publisher.major }}</span>
                            </div>
                        </div>
                    </div>
                </section>

                <section
                    v-if="task.assignee || task.status === 'in_progress' || task.status === 'completed'"
                    class="panel-card"
                >
                    <div class="section-head">
                        <h3>承接人</h3>
                        <NButton
                            v-if="task.assignee"
                            size="small"
                            round
                            @click="chatWithUser(task.assignee.id, `想沟通任务「${task.title}」的执行细节。`)"
                        >
                            聊一聊
                        </NButton>
                    </div>

                    <div v-if="task.assignee" class="user-card">
                        <div class="user-avatar user-avatar--dark">
                            <img
                                v-if="task.assignee?.avatar"
                                :src="task.assignee.avatar"
                                :alt="assigneeName"
                            />
                            <span v-else>{{ assigneeName.charAt(0) }}</span>
                        </div>
                        <div class="user-copy">
                            <div class="user-name">{{ assigneeName }}</div>
                            <div class="user-sub">
                                评分 {{ task.assignee?.rating || '暂无' }}
                                <span v-if="task.accept_time">
                                    · 接单于 {{ formatDateTime(task.accept_time) }}
                                </span>
                            </div>
                        </div>
                    </div>
                    <div v-else class="empty-inline">当前还没有确认承接人。</div>
                </section>

                <section v-if="isPublisher" class="panel-card">
                    <div class="section-head">
                        <h3>申请者列表</h3>
                        <span class="count-chip">{{ applications.length }}</span>
                    </div>

                    <div v-if="applicationLoading" class="state-box state-box--inner">
                        <NSpin size="small" />
                    </div>

                    <div v-else-if="applications.length" class="application-list">
                        <article
                            v-for="application in applications"
                            :key="application.id"
                            class="application-card"
                            :class="`a-${application.status}`"
                        >
                            <div class="application-head">
                                <div class="user-card user-card--compact">
                                    <div class="user-avatar user-avatar--soft">
                                        <img
                                            v-if="application.applicant?.avatar"
                                            :src="application.applicant.avatar"
                                            :alt="getApplicantName(application)"
                                        />
                                        <span v-else>{{ getApplicantName(application).charAt(0) }}</span>
                                    </div>
                                    <div class="user-copy">
                                        <div class="user-name">{{ getApplicantName(application) }}</div>
                                        <div class="user-sub">
                                            评分 {{ application.applicant?.rating || '暂无' }}
                                            <span v-if="application.applicant?.major">
                                                · {{ application.applicant.major }}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <span class="application-status" :class="`s-${application.status}`">
                                    {{ getApplicationStatusLabel(application.status) }}
                                </span>
                            </div>

                            <div v-if="application.message" class="message-block">
                                <span class="message-label">申请留言</span>
                                <p>{{ application.message }}</p>
                            </div>

                            <div class="application-meta">
                                <span>申请时间 {{ formatRelativeTime(application.createdAt) }}</span>
                                <span v-if="application.expected_completion_time">
                                    期望完成 {{ formatDateTime(application.expected_completion_time) }}
                                </span>
                            </div>

                            <div class="application-actions">
                                <NButton
                                    size="small"
                                    round
                                    @click="
                                        chatWithUser(
                                            application.applicant_id,
                                            `想沟通任务「${task.title}」的申请细节。`
                                        )
                                    "
                                >
                                    聊一聊
                                </NButton>
                                <template v-if="task.status === 'published' && application.status === 'pending'">
                                    <NButton
                                        size="small"
                                        quaternary
                                        round
                                        :loading="processingId === application.id && processingAction === 'reject'"
                                        @click="processApplication(application, 'reject')"
                                    >
                                        拒绝
                                    </NButton>
                                    <NButton
                                        size="small"
                                        type="primary"
                                        round
                                        :loading="processingId === application.id && processingAction === 'accept'"
                                        @click="processApplication(application, 'accept')"
                                    >
                                        同意
                                    </NButton>
                                </template>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-inline">暂时还没有人申请这个任务。</div>
                </section>

                <section class="action-bar">
                    <NButton
                        v-if="canApply"
                        type="primary"
                        size="large"
                        block
                        :loading="applying"
                        @click="applyTask"
                    >
                        申请任务
                    </NButton>
                    <NButton
                        v-else-if="task.has_applied"
                        size="large"
                        block
                        disabled
                    >
                        已申请
                    </NButton>
                    <NButton
                        v-else-if="canComplete"
                        type="primary"
                        size="large"
                        block
                        :loading="completing"
                        @click="completeTask"
                    >
                        完成任务
                    </NButton>
                </section>
            </div>

            <div v-else class="state-box">
                <p class="empty-title">任务不存在</p>
                <p class="empty-sub">这条任务可能已被删除。</p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NSpin, useDialog, useMessage } from 'naive-ui';
import { TaskApi, chatApi } from '@/api';
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
const processingId = ref<number | null>(null);
const processingAction = ref<'accept' | 'reject' | null>(null);

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
    () => !!task.value && task.value.status === 'in_progress' && isAssignee.value
);

const publisherName = computed(
    () =>
        task.value?.publisher?.real_name ||
        task.value?.publisher?.username ||
        '匿名用户'
);

const assigneeName = computed(
    () =>
        task.value?.assignee?.real_name ||
        task.value?.assignee?.username ||
        '承接人'
);

const getCategoryLabel = (cat: string) =>
    ({ study: '学习类', design: '设计类', tech: '技术类', writing: '文案类', life: '生活类' })[
        cat
    ] ?? '任务';

const getStatusLabel = (status: string) =>
    ({
        published: '招募中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        expired: '已过期',
    })[status] ?? status;

const getApplicationStatusLabel = (status: string) =>
    ({ pending: '待处理', accepted: '已同意', rejected: '已拒绝' })[status] ?? status;

const formatAmount = (value?: string | number | null) => Number(value || 0).toFixed(0);

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
    try {
        const response = await TaskApi.getTask(taskId.value);
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取任务详情失败');
        }
        task.value = response.data;
    } catch (error: any) {
        message.error(error?.message || '获取任务详情失败');
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
        await chatWithUser(task.value.publisher_id, `想咨询任务「${task.value.title}」的具体要求和细节。`, false);
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
        message.success('任务已提交完成');
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '提交失败');
    } finally {
        completing.value = false;
    }
};

const processApplication = (application: TaskApplication, action: 'accept' | 'reject') => {
    if (!task.value) return;

    dialog.warning({
        title: action === 'accept' ? '同意申请' : '拒绝申请',
        content:
            action === 'accept'
                ? `确认选择 ${getApplicantName(application)} 承接这个任务吗？`
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

const chatWithUser = async (
    peerUserId: number,
    initialMessage: string,
    navigate = true
) => {
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
    min-height: 100vh;
    background:
        radial-gradient(circle at top right, rgba(75, 184, 255, 0.12), transparent 28%),
        linear-gradient(180deg, #f5f8fd 0%, #edf3fb 100%);
    color: #17304f;
}

.top-bar {
    padding: 14px 16px 10px;
}

.nav-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: #17304f;
    display: flex;
    align-items: center;
    justify-content: center;
}

.title-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.title-copy h1 {
    margin: 0;
    font-size: 34px;
    line-height: 1.05;
    font-weight: 900;
}

.eyebrow {
    font-size: 11px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #94a2ba;
    font-weight: 700;
}

.detail-area {
    padding: 0 16px 28px;
}

.detail-stack {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.hero-card,
.panel-card,
.action-bar {
    border: 1px solid rgba(79, 128, 212, 0.12);
    border-radius: 28px;
    background: rgba(255, 255, 255, 0.94);
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.07);
}

.hero-card,
.panel-card {
    padding: 18px 18px 20px;
}

.hero-head,
.section-head,
.application-head,
.application-actions,
.user-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.hero-head,
.section-head {
    margin-bottom: 14px;
}

.section-head h3 {
    margin: 0;
    font-size: 21px;
    font-weight: 900;
}

.cat-tag {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    font-weight: 700;
    color: #8fa1bc;
}

.cat-bar {
    width: 4px;
    height: 28px;
    border-radius: 999px;
    background: #2f6bff;
}

.cat-tag[data-type='design'] .cat-bar {
    background: #ff8a3d;
}

.cat-tag[data-type='tech'] .cat-bar {
    background: #00b894;
}

.cat-tag[data-type='writing'] .cat-bar {
    background: #6c5ce7;
}

.cat-tag[data-type='life'] .cat-bar {
    background: #22b573;
}

.status-badge,
.application-status,
.count-chip,
.info-chip,
.pill {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: 700;
}

.status-badge,
.application-status {
    min-height: 34px;
    padding: 0 14px;
    font-size: 14px;
}

.s-published,
.s-pending {
    background: #fff2df;
    color: #ff9900;
}

.s-in_progress,
.s-accepted {
    background: #e4f0ff;
    color: #2f6bff;
}

.s-completed {
    background: #e4f7ee;
    color: #17a05d;
}

.s-cancelled,
.s-rejected,
.s-expired {
    background: #eef2f7;
    color: #8a97ab;
}

.hero-title {
    margin: 0 0 10px;
    font-size: 38px;
    line-height: 1.08;
    font-weight: 900;
    color: #1d2d44;
}

.hero-desc,
.requirements-text,
.message-block p {
    margin: 0;
    font-size: 16px;
    line-height: 1.7;
    color: #61718b;
}

.meta-grid {
    margin-top: 16px;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.meta-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 14px 16px;
    border-radius: 20px;
    background: #f6f8fc;
}

.meta-label,
.message-label {
    font-size: 13px;
    color: #95a3b8;
    font-weight: 700;
}

.meta-value {
    font-size: 16px;
    font-weight: 800;
    color: #1d2d44;
}

.mono {
    word-break: break-all;
}

.price {
    color: #2f6bff;
    font-size: 22px;
}

.chip-row,
.pill-group,
.application-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.chip-row {
    margin-top: 16px;
}

.info-chip,
.pill {
    min-height: 34px;
    padding: 0 14px;
    background: #eef4ff;
    color: #476386;
    font-size: 13px;
}

.info-chip--warn {
    background: #fff2df;
    color: #ff9900;
}

.pill--soft {
    background: #f2f5f9;
    color: #6c7c96;
}

.user-card {
    justify-content: flex-start;
}

.user-card--compact {
    flex: 1;
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 800;
    overflow: hidden;
    flex-shrink: 0;
}

.user-avatar--dark {
    background: linear-gradient(135deg, #17304f 0%, #2f6bff 100%);
}

.user-avatar--soft {
    background: linear-gradient(135deg, #dfe9ff 0%, #edf5ff 100%);
    color: #2f6bff;
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-copy {
    min-width: 0;
}

.user-name {
    font-size: 17px;
    font-weight: 800;
    color: #1d2d44;
}

.user-sub,
.application-meta {
    font-size: 13px;
    line-height: 1.6;
    color: #95a3b8;
}

.application-list {
    flex-direction: column;
}

.application-card {
    padding: 16px;
    border-radius: 22px;
    background: #f7f9fc;
    border: 1px solid transparent;
}

.application-card.a-pending {
    border-color: rgba(255, 153, 0, 0.14);
}

.application-card.a-accepted {
    border-color: rgba(47, 107, 255, 0.14);
}

.application-card.a-rejected {
    border-color: rgba(138, 151, 171, 0.12);
}

.message-block {
    margin: 14px 0 10px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.85);
}

.application-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
}

.application-actions {
    margin-top: 14px;
    justify-content: flex-end;
}

.count-chip {
    min-width: 32px;
    height: 32px;
    padding: 0 10px;
    background: #eef4ff;
    color: #2f6bff;
    font-size: 13px;
}

.action-bar {
    padding: 14px;
    position: sticky;
    bottom: 14px;
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
}

.state-box {
    min-height: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    color: #8fa1bc;
}

.state-box--inner {
    min-height: 120px;
}

.empty-inline {
    font-size: 14px;
    color: #95a3b8;
}

.empty-title {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
}

.empty-sub {
    margin: 0;
    color: #95a3b8;
}

.is-dark {
    background:
        radial-gradient(circle at top right, rgba(75, 184, 255, 0.12), transparent 28%),
        linear-gradient(180deg, #0f1726 0%, #111a2b 100%);
    color: #eef4ff;
}

.is-dark .back-btn,
.is-dark .title-copy h1,
.is-dark .hero-title,
.is-dark .section-head h3,
.is-dark .user-name,
.is-dark .meta-value {
    color: #eef4ff;
}

.is-dark .hero-card,
.is-dark .panel-card,
.is-dark .action-bar {
    background: rgba(17, 26, 43, 0.92);
    border-color: rgba(111, 145, 214, 0.12);
    box-shadow: none;
}

.is-dark .meta-item,
.is-dark .application-card,
.is-dark .message-block {
    background: rgba(255, 255, 255, 0.04);
}

.is-dark .hero-desc,
.is-dark .requirements-text,
.is-dark .message-block p,
.is-dark .user-sub,
.is-dark .application-meta,
.is-dark .empty-inline,
.is-dark .empty-sub,
.is-dark .eyebrow,
.is-dark .meta-label,
.is-dark .message-label {
    color: #8ea0bf;
}

@media (max-width: 480px) {
    .title-copy h1 {
        font-size: 30px;
    }

    .hero-title {
        font-size: 28px;
    }

    .meta-grid {
        grid-template-columns: 1fr;
    }
}
</style>
