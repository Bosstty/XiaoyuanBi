<template>
    <div class="forum-index-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-bar">
            <div class="nav-row">
                <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="nav-copy nav-copy--inline">
                    <strong>{{ pageTitle }}</strong>
                </div>
                <NDropdown
                    trigger="click"
                    :options="sortOptions"
                    :value="sortKey"
                    @select="handleSortChange"
                >
                    <button type="button" class="sort-btn" aria-label="切换排序">
                        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                            <path
                                d="M3 17h6v2H3v-2zm0-6h12v2H3v-2zm0-6h18v2H3V5zm14 14 4-4 4 4h-3v4h-2v-4h-3z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </NDropdown>
            </div>

            <div class="category-bar">
                <button
                    v-for="section in sections"
                    :key="section.value"
                    type="button"
                    class="cat-chip"
                    :class="{ active: category === section.value }"
                    @click="handleCategoryChange(section.value)"
                >
                    {{ section.label }}
                </button>
            </div>
        </header>

        <div class="search-strip">
            <NInput
                v-model:value="searchQuery"
                clearable
                round
                class="search-input"
                placeholder="搜索帖子标题、摘要或正文"
                @keyup.enter="handleSearch"
            >
                <template #suffix>
                    <button type="button" class="search-btn" @click="handleSearch">搜索</button>
                </template>
            </NInput>
        </div>

        <main class="list-area">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
            </div>

            <template v-else-if="posts.length">
                <article
                    v-for="(post, index) in sortedPosts"
                    :key="post.id"
                    class="forum-card"
                    :style="{ animationDelay: `${index * 0.05}s` }"
                    @click="router.push(`/forum/${post.id}`)"
                >
                    <div class="card-head">
                        <div class="cat-tag" :data-type="post.category">
                            <span class="cat-bar"></span>
                            <span class="cat-label">{{ getCategoryLabel(post.category) }}</span>
                        </div>
                    </div>

                    <div class="publisher">
                        <div class="pub-avatar">
                            <img
                                v-if="resolveAvatarUrl(post.author?.avatar)"
                                :src="resolveAvatarUrl(post.author?.avatar)"
                                :alt="getAuthorName(post)"
                                loading="lazy"
                                decoding="async"
                            />
                            <span v-else>{{ getAuthorName(post).charAt(0) }}</span>
                        </div>
                        <span>{{ getAuthorName(post) }}</span>
                    </div>

                    <h3 class="card-title">{{ post.title }}</h3>

                    <p class="card-desc">{{ post.summary || sliceContent(post.content) }}</p>

                    <div v-if="post.tags?.length || post.images?.length" class="card-meta">
                        <span v-for="tag in post.tags || []" :key="tag" class="tag-pill">
                            #{{ tag }}
                        </span>
                        <span v-if="post.images?.length" class="tag-pill tag-pill--soft">
                            {{ post.images.length }} 张图片
                        </span>
                    </div>

                    <div class="card-foot" @click.stop>
                        <div class="foot-info">
                            <button
                                type="button"
                                class="stat-link stat-link--like"
                                @click="handleLike(post.id)"
                            >
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M12.1 21.35l-1.1-1C5.14 15.24 2 12.39 2 8.86 2 6 4.24 4 7.05 4c1.54 0 3.02.73 3.95 1.88C11.93 4.73 13.41 4 14.95 4 17.76 4 20 6 20 8.86c0 3.53-3.14 6.38-8.99 11.49l-1.11 1z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>{{ post.likeCount || post.like_count || 0 }}</span>
                            </button>
                            <div class="stat-link">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v7A2.5 2.5 0 0117.5 15H9l-4.5 4v-4A2.5 2.5 0 012 12.5v-7A2.5 2.5 0 014.5 3H5"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>{{ post.commentCount || post.comment_count || 0 }}</span>
                            </div>
                            <div class="stat-link">
                                <svg viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        d="M12 5c-5.5 0-9.5 4.3-10.8 6 .4.54 1.08 1.33 2 2.15C5 14.74 8.02 17 12 17s7-2.26 8.8-3.85c.92-.82 1.6-1.61 2-2.15C21.5 9.3 17.5 5 12 5zm0 10c-2.2 0-4-1.79-4-4s1.8-4 4-4 4 1.79 4 4-1.8 4-4 4zm0-2.2A1.8 1.8 0 1012 9.2a1.8 1.8 0 000 3.6z"
                                        fill="currentColor"
                                    />
                                </svg>
                                <span>{{ post.viewCount || post.view_count || 0 }}</span>
                            </div>
                        </div>
                        <span class="time-meta">
                            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                                <path
                                    d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm.75 10.41V7h-1.5v6l4.6 2.76.77-1.28z"
                                    fill="currentColor"
                                />
                            </svg>
                            {{ formatRelativeTime(post.createdAt || post.created_at) }}
                        </span>
                    </div>
                </article>
            </template>

            <div v-else class="state-box">
                <svg viewBox="0 0 24 24" width="48" height="48" style="color: var(--sub)">
                    <path
                        d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"
                        fill="currentColor"
                    />
                </svg>
                <p class="empty-text">暂无帖子</p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { forumApi } from '@/api';
import { useAppStore } from '@/stores';
import type { ForumPost } from '@/types';
import { resolveAssetUrl } from '@/utils/apiBase';
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NDropdown, NInput, NSpin, useMessage } from 'naive-ui';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const appStore = useAppStore();

const loading = ref(false);
const posts = ref<ForumPost[]>([]);
const category = ref<string>((route.query.category as string) || 'all');
const searchQuery = ref((route.query.search as string) || '');
const sortKey = ref<string>((route.query.sort as string) || 'created_desc');

const sections = [
    { label: '全部', value: 'all' },
    { label: '学术交流', value: 'academic' },
    { label: '生活服务', value: 'life' },
    { label: '校园动态', value: 'campus' },
    { label: '任务互助', value: 'task' },
    { label: '技能分享', value: 'skill' },
];

const sortOptions = [
    { label: '最晚发布', key: 'created_desc' },
    { label: '最早发布', key: 'created_asc' },
    { label: '浏览量最多', key: 'view_desc' },
    { label: '浏览量最少', key: 'view_asc' },
    { label: '点赞最多', key: 'like_desc' },
    { label: '点赞最少', key: 'like_asc' },
];

const pageTitle = computed(() => '论坛广场');
const sortedPosts = computed(() => {
    const list = [...posts.value];
    if (sortKey.value === 'view_desc') {
        return list.sort(
            (left, right) =>
                (right.viewCount || right.view_count || 0) -
                (left.viewCount || left.view_count || 0)
        );
    }
    if (sortKey.value === 'view_asc') {
        return list.sort(
            (left, right) =>
                (left.viewCount || left.view_count || 0) -
                (right.viewCount || right.view_count || 0)
        );
    }
    if (sortKey.value === 'like_desc') {
        return list.sort(
            (left, right) =>
                (right.likeCount || right.like_count || 0) -
                (left.likeCount || left.like_count || 0)
        );
    }
    if (sortKey.value === 'like_asc') {
        return list.sort(
            (left, right) =>
                (left.likeCount || left.like_count || 0) -
                (right.likeCount || right.like_count || 0)
        );
    }
    if (sortKey.value === 'created_asc') {
        return list.sort((left, right) => {
            const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
            const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();
            return leftTime - rightTime;
        });
    }
    return list.sort((left, right) => {
        const rightTime = new Date(right.createdAt || right.created_at || 0).getTime();
        const leftTime = new Date(left.createdAt || left.created_at || 0).getTime();
        return rightTime - leftTime;
    });
});

function getCategoryLabel(value?: string) {
    return sections.find(section => section.value === value)?.label || '论坛';
}

const getAuthorName = (post: ForumPost) =>
    post.author?.real_name || post.author?.username || '匿名用户';

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    return resolveAssetUrl(value);
};

const formatRelativeTime = (value?: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
        2,
        '0'
    )}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const sliceContent = (value?: string) => {
    if (!value) return '';
    return value.length > 72 ? `${value.slice(0, 72)}...` : value;
};

const getPostStatusLabel = (post: ForumPost) => {
    if (post.isHot || post.is_hot) return '热门';
    if (post.isPinned || post.is_pinned) return '置顶';
    return '最新';
};

const getPostStatusClass = (post: ForumPost) => {
    if (post.isHot || post.is_hot) return 'is-hot';
    if (post.isPinned || post.is_pinned) return 'is-pinned';
    return 'is-latest';
};

const loadPosts = async () => {
    loading.value = true;
    try {
        const effectiveCategory = category.value;
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
    const effectiveCategory = category.value;
    const trimmedSearch = searchQuery.value.trim();

    router.replace({
        path: '/forum/index',
        query: {
            ...(effectiveCategory && effectiveCategory !== 'all'
                ? { category: effectiveCategory }
                : {}),
            ...(trimmedSearch ? { search: trimmedSearch } : {}),
            ...(sortKey.value && sortKey.value !== 'created_desc' ? { sort: sortKey.value } : {}),
        },
    });
};

const handleSortChange = (value: string) => {
    sortKey.value = value;
    const trimmedSearch = searchQuery.value.trim();
    router.replace({
        path: '/forum/index',
        query: {
            ...(category.value && category.value !== 'all' ? { category: category.value } : {}),
            ...(trimmedSearch ? { search: trimmedSearch } : {}),
            ...(value && value !== 'created_desc' ? { sort: value } : {}),
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
    () => [route.query.category, route.query.search, route.query.sort],
    () => {
        if (route.name !== 'ForumIndex') return;
        category.value = (route.query.category as string) || 'all';
        searchQuery.value = (route.query.search as string) || '';
        sortKey.value = (route.query.sort as string) || 'created_desc';
        void loadPosts();
    },
    { immediate: true }
);
</script>

<style scoped>
.forum-index-page {
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
    color: #1e293b;
}

.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #1e293b 100%);
    color: #e2e8f0;
}

.top-bar {
    position: sticky;
    top: 0;
    z-index: 10;
    padding: 10px 16px 8px;
    backdrop-filter: blur(14px);
    background: rgba(248, 250, 252, 0.96);
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.is-dark .top-bar {
    background: rgba(15, 23, 42, 0.9);
    border-color: rgba(148, 163, 184, 0.12);
}

.nav-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #1e293b;
    display: flex;
    align-items: center;
    justify-content: center;
}

.sort-btn {
    width: 32px;
    height: 32px;
    padding: 0;
    border: none;
    border-radius: 10px;
    background: transparent;
    color: #64748b;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.is-dark .sort-btn {
    color: #cbd5e1;
}

.is-dark .back-btn {
    background: rgba(30, 41, 59, 0.92);
    color: #e2e8f0;
    box-shadow: none;
}

.nav-copy {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.nav-copy--inline {
    flex: 0 1 auto;
}

.nav-copy strong {
    font-size: 16px;
    line-height: 1.2;
    font-weight: 700;
    letter-spacing: -0.02em;
}

.nav-row .sort-btn {
    margin-left: auto;
}

.nav-copy span {
    font-size: 12px;
    color: #64748b;
}

.is-dark .nav-copy span {
    color: #94a3b8;
}

.header-action {
    flex-shrink: 0;
    border: none;
    background: transparent;
    color: #2563eb;
    height: 32px;
    padding: 0 4px;
    font-weight: 800;
    font-size: 13px;
}

.category-bar {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    margin-top: 10px;
    padding-bottom: 4px;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.category-bar::-webkit-scrollbar {
    display: none;
}

.cat-chip {
    flex-shrink: 0;
    min-width: 68px;
    height: 32px;
    padding: 0 13px;
    border: none;
    border-radius: 999px;
    background: rgba(226, 232, 240, 0.84);
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
}

.is-dark .cat-chip {
    background: rgba(51, 65, 85, 0.9);
    color: #cbd5e1;
}

.cat-chip.active {
    background: linear-gradient(135deg, #4f8dff 0%, #2f6bff 100%);
    color: #fff;
}

.search-strip {
    padding: 10px 16px 0;
}

.search-input :deep(.n-input-wrapper) {
    min-height: 40px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 2px 10px rgba(23, 48, 79, 0.03);
}

.is-dark .search-input :deep(.n-input-wrapper) {
    background: rgba(30, 41, 59, 0.9);
    box-shadow: none;
    border: none;
}

.search-btn {
    border: none;
    background: transparent;
    color: #677a98;
    font-size: 13px;
    font-weight: 700;
}

.list-area {
    padding: 16px 16px 28px;
}

.state-box {
    min-height: 52vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #94a3b8;
}

.forum-card {
    padding: 16px 16px 18px;
    border-radius: 22px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 10px 30px rgba(23, 48, 79, 0.08);
    animation: fadeInUp 0.4s ease both;
}

.forum-card + .forum-card {
    margin-top: 14px;
}

.is-dark .forum-card {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: none;
}

.card-head,
.card-foot,
.cat-tag,
.publisher,
.card-meta {
    display: flex;
    align-items: center;
}

.card-head,
.card-foot {
    justify-content: flex-start;
}

.card-head {
    justify-content: space-between;
}

.cat-tag {
    gap: 8px;
    color: #64748b;
    font-size: 13px;
    font-weight: 700;
}

.cat-bar {
    width: 4px;
    height: 16px;
    border-radius: 999px;
    background: #3b82f6;
}

.cat-tag[data-type='life'] .cat-bar {
    background: #fb923c;
}

.cat-tag[data-type='campus'] .cat-bar {
    background: #10b981;
}

.cat-tag[data-type='task'] .cat-bar {
    background: #6366f1;
}

.cat-tag[data-type='skill'] .cat-bar {
    background: #06b6d4;
}

.card-title {
    flex: 1;
    min-width: 0;
    margin: 18px 0 0;
    font-size: 20px;
    line-height: 1.25;
    font-weight: 900;
    color: #0f172a;
}

.is-dark .card-title {
    color: #f8fafc;
}

.publisher {
    margin-top: 16px;
    gap: 8px;
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
}

.pub-avatar {
    width: 28px;
    height: 28px;
    border-radius: 999px;
    background: linear-gradient(135deg, #dbeafe, #bfdbfe);
    color: #2563eb;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    font-size: 12px;
    font-weight: 800;
}

.pub-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.card-desc {
    margin: 18px 0 0;
    color: #64748b;
    line-height: 1.7;
    font-size: 15px;
}

.card-meta {
    gap: 10px;
    flex-wrap: wrap;
    margin-top: 16px;
}

.tag-pill {
    color: #2563eb;
    font-weight: 600;
}

.tag-pill--soft {
    color: #64748b;
}

.card-foot {
    gap: 14px;
    margin-top: 18px;
    padding-top: 14px;
    border-top: 1px solid rgba(226, 232, 240, 0.9);
    justify-content: space-between;
}

.foot-info {
    display: flex;
    align-items: center;
    gap: 18px;
    flex-wrap: wrap;
}

.stat-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    padding: 0;
    background: transparent;
    color: #64748b;
    font-size: 14px;
    line-height: 1;
}

.stat-link svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.stat-link--like {
    color: #2563eb;
}

.time-meta {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    margin-left: auto;
    color: #64748b;
    font-size: 13px;
}

.empty-text {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
}

@media (max-width: 480px) {
    .search-strip {
        padding: 10px 12px 0;
    }

    .list-area {
        padding: 14px 12px 24px;
    }

    .top-bar {
        padding: 10px 12px 8px;
    }

    .card-title-row {
        flex-direction: column;
        align-items: flex-start;
    }

    .nav-copy strong {
        font-size: 16px;
    }

    .header-action {
        width: auto;
    }

    .card-title {
        font-size: 18px;
    }

    .foot-info {
        gap: 16px;
    }
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(8px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
