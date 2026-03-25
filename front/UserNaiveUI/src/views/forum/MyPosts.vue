<template>
    <div class="my-posts-page" :class="{ 'is-dark': appStore.isDark }">
        <!-- 顶部导航 -->
        <header class="top-nav">
            <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <span class="nav-title">我的帖子</span>
            <button class="create-btn" @click="router.push('/forum/create')">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor" />
                </svg>
            </button>
        </header>

        <main class="page-main">
            <!-- 状态筛选 -->
            <div class="filter-tabs">
                <button
                    v-for="tab in statusTabs"
                    :key="tab.value"
                    class="filter-tab"
                    :class="{ active: status === tab.value }"
                    @click="
                        status = tab.value;
                        loadPosts();
                    "
                >
                    {{ tab.label }}
                </button>
            </div>

            <!-- 加载状态 -->
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
                <p>加载中...</p>
            </div>

            <!-- 帖子列表 -->
            <div v-else-if="posts.length" class="post-list">
                <article
                    v-for="post in posts"
                    :key="post.id"
                    class="post-card"
                    :class="{
                        'is-rejected': post.status === 'rejected' || post.status === 'hidden',
                    }"
                    @click="router.push(`/forum/${post.id}`)"
                >
                    <div class="post-header">
                        <div class="post-meta">
                            <span class="category-tag" :data-type="post.category">
                                {{ getCategoryLabel(post.category) }}
                            </span>
                            <span class="post-time">
                                {{ formatTime(post.createdAt || post.created_at) }}
                            </span>
                        </div>
                        <span class="status-badge" :data-status="post.status">
                            {{ statusLabel(post.status) }}
                        </span>
                    </div>

                    <h2 class="post-title">{{ post.title }}</h2>

                    <p class="post-summary">
                        {{ truncateText(post.summary || post.content, 120) }}
                    </p>

                    <!-- 拒绝/隐藏原因 -->
                    <div v-if="post.rejectReason" class="reject-reason">
                        <svg viewBox="0 0 24 24" width="16" height="16">
                            <path
                                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                                fill="currentColor"
                            />
                        </svg>
                        <span>{{ post.rejectReason }}</span>
                    </div>

                    <div class="post-footer">
                        <div class="post-stats">
                            <span class="stat-item">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path
                                        d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {{ post.viewCount || 0 }}
                            </span>
                            <span class="stat-item">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path
                                        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {{ post.likeCount || 0 }}
                            </span>
                            <span class="stat-item">
                                <svg viewBox="0 0 24 24" width="16" height="16">
                                    <path
                                        d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"
                                        fill="currentColor"
                                    />
                                </svg>
                                {{ post.commentCount || 0 }}
                            </span>
                        </div>
                        <div class="post-actions" @click.stop>
                            <NButton size="small" round @click="router.push(`/forum/${post.id}`)">
                                查看详情
                            </NButton>
                            <NButton
                                v-if="post.status === 'draft'"
                                size="small"
                                round
                                type="primary"
                                @click="router.push(`/forum/edit/${post.id}`)"
                            >
                                编辑
                            </NButton>
                            <NButton size="small" round type="error" @click="handleDelete(post.id)">
                                删除
                            </NButton>
                        </div>
                    </div>
                </article>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
                <svg viewBox="0 0 24 24" width="64" height="64">
                    <path
                        d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"
                        fill="currentColor"
                        opacity="0.2"
                    />
                </svg>
                <h3>暂无帖子</h3>
                <p>你还没有发布过帖子，快去发布第一篇吧</p>
                <NButton type="primary" round @click="router.push('/forum/create')">
                    发布帖子
                </NButton>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpin, useDialog, useMessage } from 'naive-ui';
import type { ForumPost } from '@/types';
import { forumApi } from '@/api';
import { useAppStore } from '@/stores';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const appStore = useAppStore();

const loading = ref(false);
const posts = ref<ForumPost[]>([]);
const status = ref<
    'all' | 'published' | 'draft' | 'pending_review' | 'rejected' | 'hidden' | 'rejected'
>('all');

const statusTabs = computed(() => [
    { label: '全部', value: 'all' as const },
    { label: '已发布', value: 'published' as const },
    { label: '待审核', value: 'pending_review' as const },
    { label: '草稿', value: 'draft' as const },
    { label: '已拒绝', value: 'rejected' as const },
    { label: '已隐藏', value: 'hidden' as const },
]);

const getCategoryLabel = (category?: string) =>
    ({
        academic: '学术交流',
        life: '生活服务',
        campus: '校园动态',
        task: '任务互助',
        skill: '技能分享',
    })[category || ''] ?? '论坛';

const statusLabel = (value?: string) => {
    const map: Record<string, string> = {
        published: '已发布',
        draft: '草稿',
        pending_review: '待审核',
        rejected: '已拒绝',
        hidden: '已隐藏',
    };
    return map[value || ''] || '未知状态';
};

const formatTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';

    const diff = Date.now() - date.getTime();
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`;
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
};

const truncateText = (text: string = '', maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

const loadPosts = async () => {
    loading.value = true;
    try {
        const res = await forumApi.getMyPosts({
            page: 1,
            limit: 50,
            status: status.value === 'all' ? undefined : status.value,
        });

        if (!res.success) {
            throw new Error(res.message || '获取我的帖子失败');
        }

        posts.value = res.data?.posts || [];
    } catch (error: any) {
        message.error(error?.message || '获取我的帖子失败');
    } finally {
        loading.value = false;
    }
};

const handleDelete = (postId: number) => {
    dialog.warning({
        title: '删除帖子',
        content: '删除后无法恢复，是否继续？',
        positiveText: '删除',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const res = await forumApi.deletePost(postId);
                if (!res.success) {
                    throw new Error(res.message || '删除失败');
                }
                posts.value = posts.value.filter(post => post.id !== postId);
                message.success('删除成功');
            } catch (error: any) {
                message.error(error?.message || '删除失败');
            }
        },
    });
};

onMounted(() => {
    void loadPosts();
});
</script>

<style scoped>
/* ===== 页面基础 ===== */
.my-posts-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    color: #1e293b;
}

.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #e2e8f0;
}

/* ===== 顶部导航 ===== */
.top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    display: flex;
    align-items: center;
    padding: 12px 16px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.is-dark .top-nav {
    background: rgba(15, 23, 42, 0.85);
    border-color: rgba(255, 255, 255, 0.08);
}

.back-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    color: #475569;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.back-btn:hover {
    background: rgba(0, 0, 0, 0.1);
}

.is-dark .back-btn {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

.nav-title {
    flex: 1;
    margin-left: 12px;
    font-size: 17px;
    font-weight: 600;
}

.create-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.create-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

/* ===== 主内容区 ===== */
.page-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 16px 16px 32px;
}

/* ===== 状态筛选 ===== */
.filter-tabs {
    display: flex;
    gap: 8px;
    padding: 4px;
    margin-bottom: 20px;
    background: #ffffff;
    border-radius: 16px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.filter-tabs::-webkit-scrollbar {
    display: none;
}

.is-dark .filter-tabs {
    background: #1e293b;
}

.filter-tab {
    flex-shrink: 0;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border: none;
    border-radius: 12px;
    background: transparent;
    font-size: 14px;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
}

.filter-tab:hover {
    background: rgba(0, 0, 0, 0.04);
}

.filter-tab.active {
    background: #3b82f6;
    color: #fff;
}

.is-dark .filter-tab:hover {
    background: rgba(255, 255, 255, 0.08);
}

.tab-count {
    padding: 2px 8px;
    border-radius: 10px;
    background: rgba(0, 0, 0, 0.08);
    font-size: 12px;
    font-weight: 600;
}

.filter-tab.active .tab-count {
    background: rgba(255, 255, 255, 0.25);
}

/* ===== 加载状态 ===== */
.loading-state {
    min-height: 300px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #64748b;
}

/* ===== 帖子列表 ===== */
.post-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.post-card {
    background: #ffffff;
    border-radius: 20px;
    padding: 20px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 4px 12px rgba(0, 0, 0, 0.03);
}

.post-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.is-dark .post-card {
    background: #1e293b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

.is-dark .post-card:hover {
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
}

.is-dark .post-card.is-rejected {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.2);
}

/* 帖子头部 */
.post-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.post-meta {
    display: flex;
    align-items: center;
    gap: 10px;
}

.category-tag {
    padding: 4px 12px;
    border-radius: 12px;
    background: #f1f5f9;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
}

.category-tag[data-type='life'] {
    background: #fff7ed;
    color: #ea580c;
}
.category-tag[data-type='campus'] {
    background: #f0fdf4;
    color: #16a34a;
}
.category-tag[data-type='task'] {
    background: #faf5ff;
    color: #7c3aed;
}
.category-tag[data-type='skill'] {
    background: #ecfeff;
    color: #0891b2;
}
.category-tag[data-type='academic'] {
    background: #eff6ff;
    color: #2563eb;
}

.is-dark .category-tag {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

.post-time {
    font-size: 12px;
    color: #94a3b8;
}

.status-badge {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: #dcfce7;
    color: #16a34a;
}

.status-badge[data-status='pending_review'] {
    background: #fef9c3;
    color: #ca8a04;
}

.status-badge[data-status='draft'] {
    background: #f1f5f9;
    color: #64748b;
}

.status-badge[data-status='rejected'],
.status-badge[data-status='hidden'] {
    background: #fee2e2;
    color: #dc2626;
}

.is-dark .status-badge[data-status='draft'] {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

/* 帖子标题 */
.post-title {
    margin: 0 0 10px;
    font-size: 18px;
    font-weight: 700;
    color: #0f172a;
    line-height: 1.4;
}

.is-dark .post-title {
    color: #f8fafc;
}

/* 帖子摘要 */
.post-summary {
    margin: 0 0 16px;
    font-size: 14px;
    line-height: 1.6;
    color: #64748b;
}

.is-dark .post-summary {
    color: #94a3b8;
}

/* 拒绝原因 */
.reject-reason {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    margin-bottom: 16px;
    background: rgba(239, 68, 68, 0.08);
    border-radius: 12px;
    font-size: 13px;
    color: #dc2626;
}

.is-dark .reject-reason {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
}

/* 帖子底部 */
.post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
}

.is-dark .post-footer {
    border-color: rgba(255, 255, 255, 0.08);
}

.post-stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 13px;
    color: #94a3b8;
}

.stat-item svg {
    opacity: 0.6;
}

.post-actions {
    display: flex;
    gap: 8px;
}

.post-actions :deep(.n-button) {
    border-radius: 16px;
    font-size: 13px;
}

/* ===== 空状态 ===== */
.empty-state {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
    text-align: center;
}

.empty-state h3 {
    margin: 8px 0 0;
    font-size: 18px;
    font-weight: 600;
    color: #64748b;
}

.is-dark .empty-state h3 {
    color: #94a3b8;
}

.empty-state p {
    margin: 0;
    font-size: 14px;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
    .filter-tabs {
        padding: 4px;
    }

    .filter-tab {
        padding: 8px 12px;
        font-size: 13px;
    }

    .post-footer {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
    }

    .post-actions {
        width: 100%;
    }

    .post-actions :deep(.n-button) {
        flex: 1;
    }
}
</style>
