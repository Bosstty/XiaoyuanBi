<template>
    <div class="campus-my-tasks" :class="{ 'is-dark': appStore.isDark }">
        <!-- ───── 顶部导航 ───── -->
        <header class="top-bar">
            <div class="nav-row">
                <button type="button" class="back-btn" @click="router.back()">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="tab-group">
                    <button
                        v-for="tab in tabs"
                        :key="tab.key"
                        type="button"
                        class="view-tab"
                        :class="{ active: currentType === tab.key }"
                        @click="changeType(tab.key)"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </div>

            <!-- 状态筛选条 -->
            <div class="status-bar">
                <button
                    v-for="item in statusOptions"
                    :key="item.value"
                    type="button"
                    class="status-chip"
                    :class="{ active: currentStatus === item.value }"
                    @click="changeStatus(item.value)"
                >
                    {{ item.label }}
                </button>
            </div>
        </header>

        <!-- ───── 列表 ───── -->
        <main class="list-area">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
            </div>

            <template v-else-if="tasks.length > 0">
                <article
                    v-for="(task, index) in tasks"
                    :key="task.id"
                    class="task-card"
                    :style="{ animationDelay: `${index * 0.05}s` }"
                    @click="viewTaskDetail(task.id)"
                >
                    <!-- 头部：分类标签 + 状态 badge -->
                    <div class="card-head">
                        <div class="cat-tag" :data-type="task.category">
                            <span class="cat-bar"></span>
                            <span class="cat-label">{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <span class="status-badge" :class="getTaskStatusClass(task)">
                            {{ getTaskStatusLabel(task) }}
                        </span>
                    </div>

                    <!-- 标题 -->
                    <h3 class="card-title">{{ task.title }}</h3>

                    <!-- 描述 -->
                    <p class="card-desc">{{ task.description }}</p>

                    <!-- 四格信息 -->
                    <div class="card-grid">
                        <div class="grid-item">
                            <span class="gi-label">任务编号</span>
                            <span class="gi-val mono">{{ task.task_no }}</span>
                        </div>
                        <div class="grid-item">
                            <span class="gi-label">{{ isPublisher(task) ? '支付' : '收入' }}</span>
                            <span class="gi-val price">¥{{ formatAmount(task.price) }}</span>
                        </div>
                        <div class="grid-item">
                            <span class="gi-label">截止时间</span>
                            <span class="gi-val">{{ formatDateTime(task.deadline) }}</span>
                        </div>
                        <div class="grid-item">
                            <span class="gi-label">发布时间</span>
                            <span class="gi-val">{{ formatRelativeTime(task.createdAt) }}</span>
                        </div>
                    </div>

                    <div class="divider"></div>

                    <!-- 底栏：对方信息 + 操作 -->
                    <div class="card-foot">
                        <div class="partner">
                            <div class="partner-avatar">
                                <img
                                    v-if="resolveAvatarUrl(partnerAvatar(task))"
                                    :src="resolveAvatarUrl(partnerAvatar(task))"
                                    :alt="partnerName(task)"
                                />
                                <span v-else>{{ partnerName(task).charAt(0) }}</span>
                            </div>
                            <span>{{ partnerLabel(task) }}：{{ partnerName(task) }}</span>
                        </div>

                        <div class="foot-actions" @click.stop>
                            <NButton
                                v-if="canCancelPublish(task)"
                                size="small"
                                class="del-btn"
                                @click="handleCancelPublish(task)"
                            >
                                取消发布
                            </NButton>
                            <NButton
                                v-if="canDelete(task)"
                                size="small"
                                class="del-btn"
                                @click="handleDelete(task)"
                            >
                                删除
                            </NButton>
                            <NButton
                                v-if="canComplete(task)"
                                size="small"
                                type="primary"
                                round
                                @click="handleComplete(task)"
                            >
                                完成任务
                            </NButton>
                        </div>
                    </div>
                </article>

                <div v-if="hasNextPage" class="load-more">
                    <NButton quaternary round :loading="loadingMore" @click="loadMore">
                        显示更多
                    </NButton>
                </div>
            </template>

            <div v-else class="state-box">
                <svg viewBox="0 0 24 24" width="48" height="48" style="color: var(--sub)">
                    <path
                        d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                        fill="currentColor"
                    />
                </svg>
                <p class="empty-title">{{ emptyTitle }}</p>
                <p class="empty-sub">{{ emptyDescription }}</p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpin, useDialog, useMessage } from 'naive-ui';
import { TaskApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { Task } from '@/types';

type TaskTypeFilter = 'all' | 'published' | 'assigned';
type TaskStatusFilter = '' | Task['status'];

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();

const loading = ref(true);
const loadingMore = ref(false);
const currentType = ref<TaskTypeFilter>('all');
const currentStatus = ref<TaskStatusFilter>('');
const tasks = ref<Task[]>([]);
const currentPage = ref(1);
const totalPages = ref(1);

const tabs = [
    { key: 'all' as TaskTypeFilter, label: '全部任务' },
    { key: 'published' as TaskTypeFilter, label: '我发布的' },
    { key: 'assigned' as TaskTypeFilter, label: '我接的' },
];

const statusOptions: Array<{ label: string; value: TaskStatusFilter }> = [
    { label: '全部状态', value: '' },
    { label: '审核中', value: 'pending' },
    { label: '招募中', value: 'published' },
    { label: '进行中', value: 'in_progress' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
    { label: '已过期', value: 'expired' },
];

const hasNextPage = computed(() => currentPage.value < totalPages.value);

const emptyTitle = computed(() => {
    if (currentType.value === 'published') return '暂无发布任务';
    if (currentType.value === 'assigned') return '暂无承接任务';
    return '暂无任务记录';
});

const emptyDescription = computed(() =>
    currentStatus.value ? '当前筛选条件下没有匹配的任务。' : '后续你发布或承接的任务会显示在这里。'
);

const fetchTasks = async (page = 1, append = false) => {
    (page > 1 ? loadingMore : loading).value = true;
    try {
        const response = await TaskApi.getMyTasks({
            page,
            limit: 10,
            type: currentType.value,
            status: currentStatus.value || undefined,
        });
        if (!response.success) throw new Error(response.message || '获取任务失败');
        const list = response.data?.tasks || [];
        tasks.value = append ? [...tasks.value, ...list] : list;
        currentPage.value = response.data?.pagination?.current || page;
        totalPages.value = response.data?.pagination?.totalPages || 1;
    } catch (error: any) {
        message.error(error?.message || '获取任务失败');
        if (!append) {
            tasks.value = [];
            currentPage.value = 1;
            totalPages.value = 1;
        }
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

const changeType = (value: TaskTypeFilter) => {
    currentType.value = value;
    appStore.hapticFeedback('light');
    fetchTasks(1, false);
};

const changeStatus = (value: TaskStatusFilter) => {
    currentStatus.value = value;
    appStore.hapticFeedback('light');
    fetchTasks(1, false);
};

const loadMore = () => hasNextPage.value && fetchTasks(currentPage.value + 1, true);

const isPublisher = (task: Task) => task.publisher_id === userStore.user?.id;

const getCategoryLabel = (cat: string) =>
    ({
        study: '学习辅导类',
        design: '艺术设计类',
        tech: '专业技术类',
        writing: '文章编辑类',
        life: '生活服务类',
    })[cat] ?? '任务';

const getStatusLabel = (status: string) =>
    ({
        pending: '审核中',
        published: '招募中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        expired: '已过期',
    })[status] ?? status;

const getTaskStatusLabel = (task: Task) => {
    if (task.cancellation_status === 'pending') return '待确认取消';
    if (task.cancellation_status === 'disputed') return '争议处理中';
    return getStatusLabel(task.status);
};

const getTaskStatusClass = (task: Task) => {
    if (task.cancellation_status === 'pending') return 's-cancellation-pending';
    if (task.cancellation_status === 'disputed') return 's-cancellation-disputed';
    return `s-${task.status}`;
};

const formatAmount = (v?: string | number | null) => Number(v || 0).toFixed(2);

const formatDateTime = (v?: string | null) => {
    if (!v) return '--';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '--';
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const formatRelativeTime = (v?: string | null) => {
    if (!v) return '--';
    const diff = Date.now() - new Date(v).getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const partnerLabel = (task: Task) => (isPublisher(task) ? '承接人' : '发布人');
const partnerAvatar = (task: Task) => {
    if (isPublisher(task)) return task.assignee?.avatar;
    return task.publisher?.avatar;
};
const partnerName = (task: Task) => {
    if (isPublisher(task)) return task.assignee?.real_name || task.assignee?.username || '暂未指派';
    return task.publisher?.real_name || task.publisher?.username || '匿名用户';
};
const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('/uploads/')) return `${window.location.origin}${value}`;
    return value;
};

const canDelete = (_task: Task) => false;
const canCancelPublish = (task: Task) =>
    isPublisher(task) && ['pending', 'published'].includes(task.status);
const canComplete = (task: Task) => !isPublisher(task) && task.status === 'in_progress';

const viewTaskDetail = (id: number) => {
    appStore.hapticFeedback('light');
    router.push(`/tasks/${id}`);
};

const handleDelete = (task: Task) => {
    dialog.warning({
        title: '删除任务',
        content: '确认删除这条任务吗？',
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const r = await TaskApi.deleteTask(task.id);
                if (!r.success) throw new Error(r.message || '删除失败');
                message.success('任务已删除');
                fetchTasks(1, false);
            } catch (e: any) {
                message.error(e?.message || '删除失败');
            }
        },
    });
};

const handleCancelPublish = (task: Task) => {
    dialog.warning({
        title: '取消发布',
        content:
            task.status === 'pending' ? '确认撤回这条审核中的任务吗？' : '确认取消发布这条任务吗？',
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const r = await TaskApi.cancelTask(task.id);
                if (!r.success) throw new Error(r.message || '取消发布失败');
                message.success('任务已取消发布');
                fetchTasks(1, false);
            } catch (e: any) {
                message.error(e?.message || '取消发布失败');
            }
        },
    });
};

const handleComplete = (task: Task) => {
    dialog.info({
        title: '完成任务',
        content: '确认提交该任务为已完成？',
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const r = await TaskApi.completeTask(task.id, {});
                if (!r.success) throw new Error(r.message || '提交失败');
                message.success('任务已提交完成');
                fetchTasks(1, false);
            } catch (e: any) {
                message.error(e?.message || '提交失败');
            }
        },
    });
};

onMounted(() => fetchTasks());
</script>

<style scoped>
/* ──────────── CSS 变量（与 TaskList 完全统一） ──────────── */
.campus-my-tasks {
    --blue: #3b82f6;
    --orange: #f97316;
    --green: #10b981;
    --purple: #8b5cf6;
    --cyan: #06b6d4;
    --surface: #f5f7fa;
    --card: #ffffff;
    --text: #1a1f2e;
    --sub: #8b95a7;
    --border: #eef0f4;
    --shadow: 0 2px 12px rgba(0, 0, 0, 0.06);

    min-height: 100vh;
    background: var(--surface);
    color: var(--text);
    font-family: -apple-system, 'PingFang SC', 'Helvetica Neue', sans-serif;
}

.campus-my-tasks.is-dark {
    --surface: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --sub: #64748b;
    --border: #334155;
}

/* ──────────── 顶部导航 ──────────── */
.top-bar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--card);
    border-bottom: 1px solid var(--border);
}

.nav-row {
    display: flex;
    align-items: center;
    padding: 12px 16px 10px;
    gap: 4px;
}

.back-btn {
    border: none;
    background: none;
    padding: 4px;
    color: var(--text);
    display: flex;
    align-items: center;
    cursor: pointer;
    margin-right: 4px;
    flex-shrink: 0;
}

.tab-group {
    display: flex;
    gap: 0;
}

.view-tab {
    border: none;
    background: none;
    padding: 4px 12px;
    font-size: 16px;
    font-weight: 500;
    color: var(--sub);
    cursor: pointer;
    white-space: nowrap;
    transition: color 0.2s;
}

.view-tab.active {
    color: var(--text);
    font-weight: 700;
}

/* 状态筛选条 */
.status-bar {
    display: flex;
    gap: 8px;
    padding: 8px 16px 12px;
    overflow-x: auto;
    scrollbar-width: none;
}
.status-bar::-webkit-scrollbar {
    display: none;
}

.status-chip {
    border: none;
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    background: var(--surface);
    color: var(--sub);
    transition: all 0.18s;
}

.status-chip.active {
    background: var(--blue);
    color: #fff;
    font-weight: 600;
}

/* ──────────── 列表区域 ──────────── */
.list-area {
    padding: 12px 16px 100px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ──────────── 任务卡片 ──────────── */
.task-card {
    background: var(--card);
    border-radius: 16px;
    padding: 16px;
    box-shadow: var(--shadow);
    cursor: pointer;
    animation: fade-up 0.3s ease-out both;
    transition: box-shadow 0.15s;
}
.task-card:active {
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

@keyframes fade-up {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 头部 */
.card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 10px;
}

.cat-tag {
    display: flex;
    align-items: center;
    gap: 6px;
}

.cat-bar {
    width: 3px;
    height: 14px;
    border-radius: 2px;
    background: var(--blue);
}
.cat-tag[data-type='design'] .cat-bar {
    background: var(--orange);
}
.cat-tag[data-type='tech'] .cat-bar {
    background: var(--green);
}
.cat-tag[data-type='writing'] .cat-bar {
    background: var(--purple);
}
.cat-tag[data-type='life'] .cat-bar {
    background: var(--cyan);
}

.cat-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--sub);
}

/* 状态 badge */
.status-badge {
    font-size: 12px;
    font-weight: 600;
    padding: 3px 10px;
    border-radius: 20px;
    background: #dcfce7;
    color: #16a34a;
}
.status-badge.s-in_progress {
    background: #dbeafe;
    color: #2563eb;
}
.status-badge.s-cancellation-pending {
    background: #ffedd5;
    color: #ea580c;
}
.status-badge.s-cancellation-disputed {
    background: #fee2e2;
    color: #dc2626;
}
.status-badge.s-completed {
    background: #f1f5f9;
    color: #64748b;
}
.status-badge.s-cancelled {
    background: #fee2e2;
    color: #dc2626;
}
.status-badge.s-expired {
    background: #fef9c3;
    color: #ca8a04;
}

/* 标题 */
.card-title {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
}

/* 描述 */
.card-desc {
    margin: 0 0 14px;
    font-size: 13px;
    color: var(--sub);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* 四格信息 */
.card-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.grid-item {
    background: var(--surface);
    border-radius: 10px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 3px;
}

.gi-label {
    font-size: 11px;
    color: var(--sub);
    font-weight: 500;
}

.gi-val {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
    word-break: break-all;
}

.gi-val.mono {
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 11px;
    letter-spacing: 0.3px;
}

.gi-val.price {
    color: var(--blue);
    font-size: 16px;
    font-weight: 700;
}

/* 分割线 */
.divider {
    height: 1px;
    background: var(--border);
    margin: 12px 0;
}

/* 底栏 */
.card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.partner {
    display: flex;
    align-items: center;
    gap: 7px;
    font-size: 13px;
    color: var(--sub);
}

.partner-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sub);
    flex-shrink: 0;
    overflow: hidden;
    font-size: 12px;
    font-weight: 700;
}

.partner-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.foot-actions {
    display: flex;
    gap: 8px;
    align-items: center;
}

.del-btn {
    border: 1px solid var(--border) !important;
    background: var(--card) !important;
    color: var(--sub) !important;
    border-radius: 8px !important;
}

/* ──────────── 空状态 / 加载 ──────────── */
.state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 72px 20px;
    color: var(--sub);
    gap: 8px;
    text-align: center;
}

.empty-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    color: var(--text);
}

.empty-sub {
    margin: 0;
    font-size: 13px;
    color: var(--sub);
}

/* 加载更多 */
.load-more {
    display: flex;
    justify-content: center;
    padding: 4px 0;
}
</style>
