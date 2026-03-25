<template>
    <div class="forum-index-page">
        <header class="page-header">
            <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <div class="header-main">
                <h1>{{ pageTitle }}</h1>
                <NButton
                    round
                    type="primary"
                    class="create-btn"
                    @click="router.push('/forum/create')"
                >
                    添加帖子
                </NButton>
            </div>
        </header>

        <section v-if="!lockedCategory" class="tab-wrap">
            <button
                v-for="section in sections"
                :key="section.value"
                type="button"
                class="tab-btn"
                :class="{ active: category === section.value }"
                @click="handleCategoryChange(section.value)"
            >
                {{ section.shortLabel }}
            </button>
        </section>

        <section class="toolbar">
            <NInput
                v-model:value="searchQuery"
                clearable
                round
                class="search-input"
                placeholder="搜索帖子标题或内容"
                @keyup.enter="handleSearch"
            >
                <template #suffix>
                    <button type="button" class="search-btn" @click="handleSearch">搜索</button>
                </template>
            </NInput>
        </section>

        <div v-if="loading" class="loading-wrap">
            <NSpin size="large" />
        </div>

        <section v-else-if="posts.length" class="card-list">
            <article
                v-for="post in posts"
                :key="post.id"
                class="forum-card"
                @click="router.push(`/forum/${post.id}`)"
            >
                <div class="card-head">
                    <div class="meta-type">
                        <span class="type-bar"></span>
                        <span>{{ getCategoryLabel(post.category) }}</span>
                    </div>
                    <span class="status-badge" :class="statusClass(post)">
                        {{ statusText(post) }}
                    </span>
                </div>

                <div class="card-body">
                    <div class="body-main">
                        <h3>{{ post.title }}</h3>
                        <p class="summary">{{ post.summary || sliceContent(post.content) }}</p>
                        <div class="time-row">
                            <span class="time-icon">◷</span>
                            <span>{{ formatTime(post.createdAt || post.created_at) }}</span>
                        </div>
                    </div>

                        <div class="author-info">
                            <div class="author-line">
                                <div class="avatar">
                                    <img
                                        v-if="resolveAvatarUrl(post.author?.avatar)"
                                        :src="resolveAvatarUrl(post.author?.avatar)"
                                        :alt="getAuthorName(post)"
                                    />
                                    <span v-else>{{ getAuthorName(post).slice(0, 1) }}</span>
                                </div>
                                <span>{{ getAuthorName(post) }}</span>
                            </div>
                        </div>
                </div>

                <div class="card-footer" @click.stop>
                    <div class="stats-group">
                        <div class="stat-item stat-item--accent">
                            <span class="stat-label">点赞</span>
                            <strong>{{ post.likeCount || post.like_count || 0 }}</strong>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">评论</span>
                            <strong>{{ post.commentCount || post.comment_count || 0 }}</strong>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">浏览</span>
                            <strong>{{ post.viewCount || post.view_count || 0 }}</strong>
                        </div>
                    </div>

                    <div class="action-group">
                        <NButton round secondary class="ghost-btn" @click="handleLike(post.id)">
                            点赞
                        </NButton>
                        <NButton round type="primary" @click="router.push(`/forum/${post.id}`)">
                            详情
                        </NButton>
                    </div>
                </div>
            </article>
        </section>

        <NEmpty v-else description="暂无帖子" class="empty-block" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NEmpty, NInput, NSpin, useMessage } from 'naive-ui';
import type { ForumPost } from '@/types';
import { forumApi } from '@/api';

const route = useRoute();
const router = useRouter();
const message = useMessage();

const loading = ref(false);
const posts = ref<ForumPost[]>([]);
const category = ref<string>((route.query.category as string) || 'all');
const searchQuery = ref((route.query.search as string) || '');

const sections = [
    { label: '全部', shortLabel: '全部', value: 'all' },
    { label: '学术交流', shortLabel: '学习', value: 'academic' },
    { label: '技能分享', shortLabel: '设计', value: 'skill' },
    { label: '校园动态', shortLabel: '技术', value: 'campus' },
    { label: '任务互助', shortLabel: '文案', value: 'task' },
    { label: '生活服务', shortLabel: '生活', value: 'life' },
];

const lockedCategory = computed(() => {
    const value = (route.query.category as string) || '';
    return value && value !== 'all' ? value : '';
});

const pageTitle = computed(() =>
    lockedCategory.value ? getCategoryLabel(lockedCategory.value) : '全部论坛'
);

function getCategoryLabel(value?: string) {
    return sections.find(section => section.value === value)?.label || '论坛';
}

const getAuthorName = (post: ForumPost) =>
    post.author?.real_name || post.author?.username || '匿名用户';

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }
    if (value.startsWith('/uploads/')) {
        return `${window.location.origin}${value}`;
    }
    return value;
};

const formatTime = (value?: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
        2,
        '0'
    )}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const sliceContent = (value?: string) => {
    if (!value) return '';
    return value.length > 56 ? `${value.slice(0, 56)}...` : value;
};

const statusText = (post: ForumPost) => {
    if (post.isHot || post.is_hot) return '热门';
    if (post.isPinned || post.is_pinned) return '置顶';
    return '讨论中';
};

const statusClass = (post: ForumPost) => {
    if (post.isHot || post.is_hot) return 'is-hot';
    if (post.isPinned || post.is_pinned) return 'is-pinned';
    return 'is-open';
};

const loadPosts = async () => {
    loading.value = true;
    try {
        const effectiveCategory = lockedCategory.value || category.value;
        const trimmedSearch = searchQuery.value.trim();

        const res = await forumApi.getPosts({
            page: 1,
            limit: 50,
            category:
                effectiveCategory && effectiveCategory !== 'all'
                    ? (effectiveCategory as any)
                    : undefined,
            search: trimmedSearch || undefined,
        });

        if (!res.success) {
            throw new Error(res.message || '获取帖子失败');
        }

        posts.value = res.data?.posts || [];
    } catch (error: any) {
        message.error(error?.message || '获取帖子失败');
    } finally {
        loading.value = false;
    }
};

const handleCategoryChange = (value: string) => {
    const trimmedSearch = searchQuery.value.trim();
    router.replace({
        path: '/forum/index',
        query: {
            ...(value && value !== 'all' ? { category: value } : {}),
            ...(trimmedSearch ? { search: trimmedSearch } : {}),
        },
    });
};

const handleSearch = () => {
    const effectiveCategory = lockedCategory.value || category.value;
    const trimmedSearch = searchQuery.value.trim();

    router.replace({
        path: '/forum/index',
        query: {
            ...(effectiveCategory && effectiveCategory !== 'all'
                ? { category: effectiveCategory }
                : {}),
            ...(trimmedSearch ? { search: trimmedSearch } : {}),
        },
    });
};

const handleLike = async (postId: number) => {
    try {
        const res = await forumApi.likePost(postId);
        if (!res.success) {
            throw new Error(res.message || '点赞失败');
        }

        posts.value = posts.value.map(post =>
            post.id === postId
                ? {
                      ...post,
                      likeCount:
                          res.data?.likeCount ?? (post.likeCount || post.like_count || 0) + 1,
                      like_count:
                          res.data?.likeCount ?? (post.likeCount || post.like_count || 0) + 1,
                  }
                : post
        );
    } catch (error: any) {
        message.error(error?.message || '点赞失败');
    }
};

watch(
    () => [route.query.category, route.query.search],
    () => {
        if (route.name !== 'ForumIndex') return;
        category.value = (route.query.category as string) || 'all';
        searchQuery.value = (route.query.search as string) || '';
        void loadPosts();
    },
    { immediate: true }
);
</script>

<style scoped>
.forum-index-page {
    min-height: 100vh;
    padding: 18px 16px 24px;
    background: linear-gradient(180deg, #f7f9fc 0%, #edf2f8 100%);
    color: #132946;
}

.page-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
}

.back-btn {
    width: 30px;
    height: 30px;
    padding: 0;
    border: none;
    background: transparent;
    color: #132946;
    display: flex;
    align-items: center;
    justify-content: center;
}

.header-main {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    min-width: 0;
}

.page-header h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 900;
    line-height: 1.2;
}

.create-btn {
    flex-shrink: 0;
    height: 36px;
    padding: 0 14px;
    font-weight: 800;
}

.tab-wrap {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin-bottom: 14px;
    padding-bottom: 2px;
}

.tab-btn {
    flex-shrink: 0;
    min-width: 56px;
    height: 32px;
    padding: 0 14px;
    border: none;
    border-radius: 999px;
    background: #eef2f7;
    color: #8795ab;
    font-size: 14px;
    font-weight: 700;
}

.tab-btn.active {
    background: linear-gradient(135deg, #4f8dff 0%, #2f6bff 100%);
    color: #fff;
    box-shadow: 0 8px 18px rgba(47, 107, 255, 0.24);
}

.toolbar {
    margin-bottom: 16px;
}

.search-input :deep(.n-input-wrapper) {
    min-height: 42px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 2px 10px rgba(23, 48, 79, 0.04);
}

.search-btn {
    border: none;
    background: transparent;
    color: #677a98;
    font-size: 14px;
    font-weight: 700;
}

.card-list {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.forum-card {
    padding: 14px 16px 16px;
    border-radius: 22px;
    background: #fff;
    box-shadow: 0 10px 30px rgba(23, 48, 79, 0.08);
}

.card-head,
.card-body,
.card-footer,
.meta-type,
.author-line,
.action-group {
    display: flex;
    align-items: center;
}

.card-head,
.card-footer {
    justify-content: space-between;
}

.meta-type {
    gap: 8px;
    color: #6f819e;
    font-size: 13px;
    font-weight: 700;
}

.type-bar {
    width: 3px;
    height: 14px;
    border-radius: 999px;
    background: #ff9b3d;
}

.status-badge {
    min-width: 62px;
    height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.status-badge.is-open {
    background: #e5f6ec;
    color: #17a05d;
}

.status-badge.is-hot {
    background: #ffe7e0;
    color: #ff6b4d;
}

.status-badge.is-pinned {
    background: #fff4df;
    color: #d99000;
}

.card-body {
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-top: 12px;
}

.body-main {
    flex: 1;
    min-width: 0;
}

.body-main h3 {
    margin: 0 0 10px;
    font-size: 20px;
    line-height: 1.25;
    font-weight: 900;
    color: #132946;
}

.summary {
    margin: 0 0 12px;
    color: #6f819e;
    line-height: 1.7;
    font-size: 15px;
}

.time-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #8d9ab0;
    font-size: 14px;
}

.time-icon {
    font-size: 13px;
}

.author-info {
    flex-shrink: 0;
}

.author-line {
    gap: 8px;
    color: #8d9ab0;
    font-size: 14px;
}

.avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: linear-gradient(135deg, #e7eefb 0%, #d5e0f7 100%);
    color: #607390;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
    overflow: hidden;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-footer {
    gap: 14px;
    margin-top: 16px;
    padding-top: 14px;
    border-top: 1px solid #edf1f6;
}

.stats-group {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
}

.stat-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.stat-label {
    color: #8c98ad;
    font-size: 12px;
}

.stat-item strong {
    color: #1d304d;
    font-size: 15px;
    font-weight: 900;
}

.stat-item--accent strong {
    color: #2f6bff;
    font-size: 18px;
}

.action-group {
    gap: 10px;
}

.ghost-btn {
    background: #eef1f6;
    color: #6f7f99;
}

.loading-wrap {
    display: flex;
    justify-content: center;
    padding: 90px 0;
}

.empty-block {
    padding-top: 80px;
}

@media (max-width: 480px) {
    .card-body,
    .card-footer {
        flex-direction: column;
        align-items: flex-start;
    }

    .action-group {
        width: 100%;
    }

    .action-group :deep(.n-button) {
        flex: 1;
    }
}
</style>
