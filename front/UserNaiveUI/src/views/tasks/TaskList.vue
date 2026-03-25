<template>
    <div class="campus-tasks" :class="{ 'is-dark': appStore.isDark }">
        <!-- ───── 顶部导航 ───── -->
        <header class="top-bar">
            <div class="nav-row">
                <button type="button" class="back-btn" @click="goBackToTaskCenter">
                    <svg viewBox="0 0 24 24" width="22" height="22">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="tab-group">
                    <button
                        v-for="tab in viewTabs"
                        :key="tab.key"
                        type="button"
                        class="view-tab"
                        :class="{ active: currentView === tab.key }"
                        @click="handleViewChange(tab.key)"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </div>

            <!-- 分类筛选条 -->
            <div class="category-bar">
                <button
                    v-for="cat in categoryTabs"
                    :key="cat.key"
                    type="button"
                    class="cat-chip"
                    :class="{ active: currentCategory === cat.key }"
                    @click="handleCategoryChange(cat.key)"
                >
                    {{ cat.label }}
                </button>
            </div>
        </header>

        <!-- ───── 任务列表 ───── -->
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
                        <span class="status-badge" :class="`s-${task.status}`">
                            {{ getStatusLabel(task.status) }}
                        </span>
                    </div>

                    <!-- 标题 + 发布者 -->
                    <div class="card-title-row">
                        <h3 class="card-title">{{ task.title }}</h3>
                        <div class="publisher">
                            <div class="pub-avatar">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </div>
                            <span>
                                {{
                                    task.publisher?.real_name || task.publisher?.username || '匿名'
                                }}
                            </span>
                        </div>
                    </div>

                    <!-- 描述 -->
                    <p class="card-desc">{{ task.description }}</p>

                    <!-- meta 标签行 -->
                    <div class="card-meta">
                        <span v-if="task.deadline">
                            <svg viewBox="0 0 24 24" width="13" height="13">
                                <path
                                    d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
                                    fill="currentColor"
                                />
                            </svg>
                            截止 {{ formatDateTime(task.deadline) }}
                        </span>
                        <span v-if="task.location">
                            <svg viewBox="0 0 24 24" width="13" height="13">
                                <path
                                    d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                                    fill="currentColor"
                                />
                            </svg>
                            {{ task.location }}
                        </span>
                        <span v-if="task.remote_work" class="tag-pill">远程</span>
                        <span v-if="task.urgent" class="tag-pill urgent">加急</span>
                    </div>

                    <div class="divider"></div>

                    <!-- 底栏：报酬 + 人数 + 发布时间 + 申请按钮 -->
                    <div class="card-foot">
                        <div class="foot-info">
                            <div class="info-item">
                                <span class="info-label">报酬</span>
                                <span class="info-price">¥{{ formatAmount(task.price) }}</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">人数</span>
                                <span class="info-val">{{ task.max_applicants || 1 }} 人</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">发布</span>
                                <span class="info-val">
                                    {{ formatRelativeTime(task.createdAt) }}
                                </span>
                            </div>
                        </div>
                        <div class="foot-actions" @click.stop>
                            <NButton
                                v-if="canChat(task)"
                                size="small"
                                class="chat-btn"
                                round
                                @click="handleChat(task)"
                            >
                                聊一聊
                            </NButton>
                            <NButton
                                v-if="canApply(task)"
                                size="small"
                                type="primary"
                                round
                                @click="handleApply(task)"
                            >
                                申请
                            </NButton>
                            <NButton v-else-if="task.has_applied" size="small" round disabled>
                                已申请
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
                <p class="empty-text">暂无任务</p>
            </div>
        </main>

        <!-- FAB -->
        <button type="button" class="fab" @click="router.push('/tasks/create')">
            <NIcon :size="22"><AddOutline /></NIcon>
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NIcon, NSpin, useMessage } from 'naive-ui';
import { AddOutline } from '@vicons/ionicons5';
import { TaskApi, chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { Task } from '@/types';

type ViewKey = 'all' | 'mine' | 'accepted';
type CategoryKey = 'all' | 'study' | 'design' | 'tech' | 'writing' | 'life';

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const userStore = useUserStore();
const message = useMessage();

const loading = ref(true);
const loadingMore = ref(false);
const tasks = ref<Task[]>([]);
const currentView = ref<ViewKey>('all');
const currentCategory = ref<CategoryKey>('all');
const currentPage = ref(1);
const totalPages = ref(1);
const latestRequestId = ref(0);

const viewTabs: Array<{ key: ViewKey; label: string }> = [{ key: 'all', label: '全部任务' }];

const categoryTabs: Array<{ key: CategoryKey; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'study', label: '学习' },
    { key: 'design', label: '设计' },
    { key: 'tech', label: '技术' },
    { key: 'writing', label: '文案' },
    { key: 'life', label: '生活' },
];

const parseCategoryFromRoute = (value: unknown): CategoryKey => {
    if (typeof value === 'string' && categoryTabs.some(tab => tab.key === value)) {
        return value as CategoryKey;
    }
    return 'all';
};

const hasNextPage = computed(() => currentPage.value < totalPages.value);

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

const fetchTasks = async (page = 1, append = false) => {
    const requestId = ++latestRequestId.value;
    (page > 1 ? loadingMore : loading).value = true;
    try {
        const response = await TaskApi.getTasks({
            page,
            limit: 10,
            category: currentCategory.value === 'all' ? undefined : currentCategory.value,
            status: 'published',
            sort: 'created_at',
            order: 'desc',
        });
        if (!response.success) throw new Error(response.message);
        if (requestId !== latestRequestId.value) return;
        const list = response.data?.tasks || [];
        tasks.value = append ? [...tasks.value, ...list] : list;
        currentPage.value = response.data?.pagination?.current || page;
        totalPages.value = response.data?.pagination?.totalPages || 1;
    } catch (e) {
        console.error(e);
        if (requestId !== latestRequestId.value) return;
        if (!append) {
            tasks.value = [];
            currentPage.value = 1;
            totalPages.value = 1;
        }
    } finally {
        if (requestId === latestRequestId.value) {
            loading.value = false;
            loadingMore.value = false;
        }
    }
};

const handleViewChange = (key: ViewKey) => {
    currentView.value = key;
    appStore.hapticFeedback('light');
    fetchTasks(1, false);
};

const handleCategoryChange = (key: CategoryKey) => {
    appStore.hapticFeedback('light');
    const routeCategory = parseCategoryFromRoute(route.query.category);
    if (key === currentCategory.value && routeCategory === key) {
        fetchTasks(1, false);
        return;
    }

    router.replace({
        path: '/tasks/list',
        query: key === 'all' ? {} : { category: key },
    });
};

const loadMore = () => hasNextPage.value && fetchTasks(currentPage.value + 1, true);

const goBackToTaskCenter = () => {
    appStore.hapticFeedback('light');
    router.push('/tasks');
};

const viewTaskDetail = (id: number) => {
    appStore.hapticFeedback('light');
    router.push(`/tasks/${id}`);
};

const canApply = (task: Task) =>
    task.status === 'published' &&
    task.publisher_id !== userStore.user?.id &&
    !task.assignee_id &&
    !task.has_applied;

const canChat = (task: Task) => task.publisher_id !== userStore.user?.id;

const handleChat = async (task: Task) => {
    try {
        const response = await chatApi.createConversation({
            peer_user_id: task.publisher_id,
            task_id: task.id,
            initial_message: `想咨询任务「${task.title}」的具体要求和细节。`,
        });
        appStore.hapticFeedback('light');
        router.push({
            path: '/chat',
            query: response.data?.id ? { conversationId: String(response.data.id) } : {},
        });
    } catch (e: any) {
        message.error(e?.message || '打开聊天失败');
    }
};

const handleApply = async (task: Task) => {
    try {
        const r = await TaskApi.applyTask(task.id, {});
        if (!r.success) throw new Error(r.message);
        message.success('申请已提交');
        task.has_applied = true;
        task.current_user_application_status = 'pending';
        appStore.hapticFeedback('medium');
    } catch (e: any) {
        message.error(e?.message || '申请失败');
    }
};

onMounted(() => {
    currentCategory.value = parseCategoryFromRoute(route.query.category);
    fetchTasks(1, false);
});

watch(
    () => route.query.category,
    newCategory => {
        const nextCategory = parseCategoryFromRoute(newCategory);
        if (route.name !== 'TaskList') return;
        currentCategory.value = nextCategory;
        fetchTasks(1, false);
    }
);
</script>

<style scoped>
.campus-tasks {
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

.campus-tasks.is-dark {
    --surface: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --sub: #64748b;
    --border: #334155;
}

/* ── 顶部 ── */
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
    padding: 12px 16px 8px;
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
    flex-shrink: 0;
    margin-right: 2px;
}

.tab-group {
    display: flex;
}

.view-tab {
    border: none;
    background: none;
    padding: 4px 10px;
    font-size: 15px;
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

/* ── 分类筛选条 ── */
.category-bar {
    display: flex;
    gap: 8px;
    padding: 8px 16px 12px;
    overflow-x: auto;
    scrollbar-width: none;
}
.category-bar::-webkit-scrollbar {
    display: none;
}

.cat-chip {
    border: none;
    border-radius: 20px;
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 500;
    white-space: nowrap;
    cursor: pointer;
    background: var(--surface);
    color: var(--sub);
    transition: all 0.18s;
}

.cat-chip.active {
    background: var(--blue);
    color: #fff;
    font-weight: 600;
}

/* ── 列表 ── */
.list-area {
    padding: 12px 16px 100px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* ── 任务卡片 ── */
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
.status-badge.s-pending {
    background: #ffedd5;
    color: #ea580c;
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

/* 标题行 */
.card-title-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
}

.card-title {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
    line-height: 1.4;
    flex: 1;
}

.publisher {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--sub);
    font-size: 12px;
    flex-shrink: 0;
    white-space: nowrap;
}

.pub-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--sub);
}

/* 描述 */
.card-desc {
    margin: 0 0 10px;
    font-size: 13px;
    color: var(--sub);
    line-height: 1.6;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

/* meta 行 */
.card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 14px;
    align-items: center;
    font-size: 12px;
    color: var(--sub);
}

.card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.tag-pill {
    background: var(--surface);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 11px;
    font-weight: 600;
    color: var(--sub) !important;
}

.tag-pill.urgent {
    background: #fff1f0;
    color: #ef4444 !important;
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

.foot-info {
    display: flex;
    gap: 16px;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.info-label {
    font-size: 11px;
    color: var(--sub);
}

.info-price {
    font-size: 16px;
    font-weight: 700;
    color: var(--blue);
}

.info-val {
    font-size: 13px;
    font-weight: 600;
    color: var(--text);
}

.foot-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
}

.chat-btn {
    background: var(--surface) !important;
    border: 1px solid var(--border) !important;
    color: var(--sub) !important;
}

/* 空/加载 */
.state-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 72px 20px;
    color: var(--sub);
    gap: 12px;
}

.empty-text {
    margin: 0;
    font-size: 15px;
}

.load-more {
    display: flex;
    justify-content: center;
    padding: 4px 0;
}

/* FAB */
.fab {
    position: fixed;
    right: 20px;
    bottom: 88px;
    width: 52px;
    height: 52px;
    border: none;
    border-radius: 50%;
    background: var(--blue);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.35);
    cursor: pointer;
    transition: transform 0.15s;
}
.fab:active {
    transform: scale(0.93);
}
</style>
