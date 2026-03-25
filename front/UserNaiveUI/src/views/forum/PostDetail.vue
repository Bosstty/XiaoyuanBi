<template>
    <div class="post-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <!-- 顶部导航 -->
        <header class="top-nav">
            <button type="button" class="back-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="24" height="24">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <span class="nav-title">帖子详情</span>
            <div class="nav-actions">
                <button
                    v-if="post && Number(post.author_id) === Number(userStore.user?.id)"
                    class="action-btn delete-btn"
                    @click="handleDelete"
                    aria-label="删除"
                >
                    <svg viewBox="0 0 24 24" width="20" height="20">
                        <path
                            d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
            </div>
        </header>

        <main class="detail-main">
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
                <p>加载中...</p>
            </div>

            <template v-else-if="post">
                <!-- 帖子主体 -->
                <article class="post-article">
                    <!-- 分类和状态 -->
                    <div class="post-meta-top">
                        <div class="category-badge" :data-type="post.category">
                            <span class="cat-dot"></span>
                            <span class="cat-text">{{ getCategoryLabel(post.category) }}</span>
                        </div>
                        <span class="status-tag" :data-status="post.status">
                            {{ getStatusLabel(post.status) }}
                        </span>
                    </div>

                    <!-- 标题 -->
                    <h1 class="post-title">{{ post.title }}</h1>

                    <!-- 作者信息栏 -->
                    <div class="author-bar">
                        <div class="author-avatar">
                            <img
                                v-if="resolveAvatarUrl(post.author?.avatar)"
                                :src="resolveAvatarUrl(post.author?.avatar)"
                                :alt="authorName"
                            />
                            <span v-else>{{ authorName.charAt(0) }}</span>
                        </div>
                        <div class="author-info">
                            <span class="author-name">{{ authorName }}</span>
                            <span class="author-sub">
                                <span v-if="post.author?.college">{{ post.author.college }}</span>
                                <span v-if="post.author?.major">· {{ post.author.major }}</span>
                            </span>
                        </div>
                        <div class="post-time">
                            {{ formatTime(post.createdAt || post.created_at) }}
                        </div>
                    </div>

                    <!-- 内容区 -->
                    <div class="post-content">
                        <p v-if="post.summary" class="post-summary">{{ post.summary }}</p>
                        <div class="content-text">{{ post.content }}</div>

                        <!-- 图片画廊 -->
                        <div v-if="post.images?.length" class="image-gallery">
                            <div
                                v-for="(img, idx) in post.images"
                                :key="idx"
                                class="gallery-item"
                                @click="previewingImage = img"
                            >
                                <img :src="img" :alt="`图片 ${idx + 1}`" />
                            </div>
                        </div>
                    </div>

                    <!-- 标签 -->
                    <div v-if="post.tags?.length" class="tag-list">
                        <span v-for="tag in post.tags" :key="tag" class="tag-item">#{{ tag }}</span>
                    </div>

                    <!-- 统计数据 -->
                    <div class="post-stats">
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ post.viewCount || post.view_count || 0 }} 浏览</span>
                        </div>
                        <div class="stat-item">
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ post.commentCount || post.comment_count || 0 }} 评论</span>
                        </div>
                        <div
                            class="stat-item like-item"
                            :class="{ 'is-liked': isLiked }"
                            @click="handleLikePost"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18">
                                <path
                                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ post.likeCount || post.like_count || 0 }} 点赞</span>
                        </div>
                    </div>
                </article>

                <!-- 评论区 -->
                <section class="comments-section">
                    <div class="section-header">
                        <h2 class="section-title">
                            <svg viewBox="0 0 24 24" width="22" height="22">
                                <path
                                    d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"
                                    fill="currentColor"
                                />
                            </svg>
                            评论
                            <span class="comment-count">{{ comments.length }}</span>
                        </h2>
                    </div>

                    <!-- 评论输入 -->
                    <div class="comment-input-area">
                        <div class="input-avatar">
                            <span>
                                {{
                                    userStore.user?.real_name?.charAt(0) ||
                                    userStore.user?.username?.charAt(0) ||
                                    '我'
                                }}
                            </span>
                        </div>
                        <div class="input-wrapper">
                            <NInput
                                v-model:value="commentInput"
                                type="textarea"
                                :autosize="{ minRows: 2, maxRows: 4 }"
                                placeholder="写下你的看法..."
                                class="comment-textarea"
                            />
                            <NButton
                                type="primary"
                                :loading="commentSubmitting"
                                :disabled="!commentInput.trim()"
                                @click="handleCreateComment"
                                class="submit-btn"
                            >
                                发布
                            </NButton>
                        </div>
                    </div>

                    <!-- 评论列表 -->
                    <div v-if="comments.length" class="comment-list">
                        <article v-for="comment in comments" :key="comment.id" class="comment-item">
                            <div class="comment-avatar">
                                <img
                                    v-if="resolveAvatarUrl(comment.author?.avatar)"
                                    :src="resolveAvatarUrl(comment.author?.avatar)"
                                    :alt="getCommentAuthor(comment)"
                                />
                                <span v-else>{{ getCommentAuthor(comment).charAt(0) }}</span>
                            </div>
                            <div class="comment-body">
                                <div class="comment-header">
                                    <span class="comment-author">
                                        {{ getCommentAuthor(comment) }}
                                    </span>
                                    <span class="comment-time">
                                        {{ formatTime(comment.createdAt || comment.created_at) }}
                                    </span>
                                </div>
                                <div class="comment-content">{{ comment.content }}</div>
                                <div class="comment-actions">
                                    <button
                                        class="like-btn"
                                        :class="{ 'is-liked': likedComments.has(comment.id) }"
                                        @click="handleLikeComment(comment.id)"
                                    >
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path
                                                d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                        {{ comment.likeCount || comment.like_count || 0 }}
                                    </button>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-comments">
                        <svg viewBox="0 0 24 24" width="48" height="48">
                            <path
                                d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z"
                                fill="currentColor"
                                opacity="0.3"
                            />
                        </svg>
                        <p>暂无评论</p>
                        <span>来说点什么吧</span>
                    </div>
                </section>
            </template>

            <div v-else class="error-state">
                <svg viewBox="0 0 24 24" width="64" height="64">
                    <path
                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"
                        fill="currentColor"
                        opacity="0.3"
                    />
                </svg>
                <h2>帖子不存在</h2>
                <p>这条帖子可能已被删除</p>
                <NButton type="primary" round @click="router.back()">返回</NButton>
            </div>
        </main>

        <!-- 图片预览弹窗 -->
        <div v-if="previewingImage" class="image-preview-modal" @click="previewingImage = ''">
            <button class="preview-close" @click="previewingImage = ''">×</button>
            <img :src="previewingImage" alt="预览图片" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NInput, NSpin, useDialog, useMessage } from 'naive-ui';
import type { ForumComment, ForumPost } from '@/types';
import { forumApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const userStore = useUserStore();
const appStore = useAppStore();

const loading = ref(false);
const commentSubmitting = ref(false);
const post = ref<ForumPost | null>(null);
const comments = ref<ForumComment[]>([]);
const commentInput = ref('');
const isLiked = ref(false);
const likedComments = ref<Set<number>>(new Set());
const previewingImage = ref('');

const postId = computed(() => Number(route.params.id || 0));
const authorName = computed(() => {
    const author = post.value?.author;
    return author?.real_name || author?.username || '匿名用户';
});

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

const getCategoryLabel = (category?: string) =>
    ({
        academic: '学术交流',
        life: '生活服务',
        campus: '校园动态',
        task: '任务互助',
        skill: '技能分享',
    })[category || ''] ?? '论坛';

const getStatusLabel = (status?: string) =>
    ({
        published: '已发布',
        pending_review: '待审核',
        draft: '草稿',
        rejected: '已拒绝',
        hidden: '已隐藏',
    })[status || ''] ?? '未知';

const formatTime = (value?: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';

    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return date.toLocaleString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const getCommentAuthor = (comment: ForumComment) =>
    comment.author?.real_name || comment.author?.username || '匿名用户';

const loadPost = async () => {
    if (!postId.value) return;

    loading.value = true;
    try {
        const [postRes, commentRes] = await Promise.all([
            forumApi.getPost(postId.value),
            forumApi.getComments(postId.value, { page: 1, limit: 50, order: 'desc' }),
        ]);

        if (!postRes.success || !postRes.data) {
            throw new Error(postRes.message || '获取帖子失败');
        }

        post.value = postRes.data;
        comments.value = commentRes.success ? commentRes.data?.comments || [] : [];
    } catch (error: any) {
        message.error(error?.message || '获取帖子失败');
    } finally {
        loading.value = false;
    }
};

const handleLikePost = async () => {
    if (!post.value) return;

    try {
        const res = await forumApi.likePost(post.value.id);
        if (res.success) {
            const nextCount =
                res.data?.likeCount ?? (post.value.likeCount || post.value.like_count || 0) + 1;
            post.value.likeCount = nextCount;
            post.value.like_count = nextCount;
        }
    } catch (error: any) {
        message.error(error?.message || '点赞失败');
    }
};

const handleCreateComment = async () => {
    if (!post.value || !commentInput.value.trim()) return;

    commentSubmitting.value = true;
    try {
        const res = await forumApi.createComment(post.value.id, {
            content: commentInput.value.trim(),
        });

        if (!res.success || !res.data) {
            throw new Error(res.message || '评论失败');
        }

        comments.value = [res.data, ...comments.value];
        commentInput.value = '';
        const nextCount = (post.value.commentCount || post.value.comment_count || 0) + 1;
        post.value.commentCount = nextCount;
        post.value.comment_count = nextCount;
        message.success('评论成功');
    } catch (error: any) {
        message.error(error?.message || '评论失败');
    } finally {
        commentSubmitting.value = false;
    }
};

const handleLikeComment = async (commentId: number) => {
    try {
        const res = await forumApi.likeComment(commentId);
        if (!res.success) return;

        comments.value = comments.value.map(comment => {
            if (comment.id !== commentId) return comment;
            const nextCount =
                res.data?.likeCount ?? (comment.likeCount || comment.like_count || 0) + 1;
            return {
                ...comment,
                likeCount: nextCount,
                like_count: nextCount,
            };
        });

        likedComments.value.add(commentId);
    } catch (error: any) {
        message.error(error?.message || '点赞失败');
    }
};

const handleDelete = () => {
    if (!post.value) return;

    dialog.warning({
        title: '删除帖子',
        content: '删除后不可恢复，是否继续？',
        positiveText: '删除',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const res = await forumApi.deletePost(post.value!.id);
                if (!res.success) {
                    throw new Error(res.message || '删除失败');
                }
                message.success('删除成功');
                router.replace('/forum/my');
            } catch (error: any) {
                message.error(error?.message || '删除失败');
            }
        },
    });
};

onMounted(() => {
    void loadPost();
});
</script>

<style scoped>
/* ===== 页面基础 ===== */
.post-detail-page {
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

.is-dark .back-btn:hover {
    background: rgba(255, 255, 255, 0.12);
}

.nav-title {
    flex: 1;
    margin-left: 12px;
    font-size: 17px;
    font-weight: 600;
    color: #1e293b;
}

.is-dark .nav-title {
    color: #f1f5f9;
}

.nav-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    width: 40px;
    height: 40px;
    padding: 0;
    border: none;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    background: rgba(239, 68, 68, 0.15);
}

/* ===== 主内容区 ===== */
.detail-main {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px 16px 40px;
}

/* ===== 加载和错误状态 ===== */
.loading-state,
.error-state {
    min-height: 60vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 16px;
    color: #64748b;
}

.error-state h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #475569;
}

.error-state p {
    margin: 0;
    color: #94a3b8;
}

/* ===== 帖子文章 ===== */
.post-article {
    background: #ffffff;
    border-radius: 20px;
    padding: 24px;
    box-shadow:
        0 1px 3px rgba(0, 0, 0, 0.05),
        0 4px 12px rgba(0, 0, 0, 0.03);
}

.is-dark .post-article {
    background: #1e293b;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* 分类和状态 */
.post-meta-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
}

.category-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 6px 14px;
    border-radius: 20px;
    background: #f1f5f9;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
}

.is-dark .category-badge {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

.cat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #3b82f6;
}

.category-badge[data-type='life'] .cat-dot {
    background: #f97316;
}
.category-badge[data-type='campus'] .cat-dot {
    background: #22c55e;
}
.category-badge[data-type='task'] .cat-dot {
    background: #8b5cf6;
}
.category-badge[data-type='skill'] .cat-dot {
    background: #06b6d4;
}
.category-badge[data-type='academic'] .cat-dot {
    background: #3b82f6;
}

.status-tag {
    padding: 4px 12px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    background: #dcfce7;
    color: #16a34a;
}

.status-tag[data-status='pending_review'] {
    background: #fef9c3;
    color: #ca8a04;
}

.status-tag[data-status='draft'] {
    background: #f1f5f9;
    color: #64748b;
}

.status-tag[data-status='rejected'],
.status-tag[data-status='hidden'] {
    background: #fee2e2;
    color: #dc2626;
}

/* 标题 */
.post-title {
    margin: 0 0 20px;
    font-size: 26px;
    line-height: 1.35;
    font-weight: 800;
    color: #0f172a;
}

.is-dark .post-title {
    color: #f8fafc;
}

/* 作者栏 */
.author-bar {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    margin-bottom: 20px;
    background: #f8fafc;
    border-radius: 16px;
}

.is-dark .author-bar {
    background: rgba(255, 255, 255, 0.04);
}

.author-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
}

.author-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.author-info {
    flex: 1;
    min-width: 0;
}

.author-name {
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: #1e293b;
}

.is-dark .author-name {
    color: #f1f5f9;
}

.author-sub {
    font-size: 13px;
    color: #94a3b8;
}

.post-time {
    font-size: 13px;
    color: #94a3b8;
}

/* 内容区 */
.post-content {
    margin-bottom: 20px;
}

.post-summary {
    margin: 0 0 16px;
    padding: 16px;
    background: #f8fafc;
    border-radius: 12px;
    font-size: 15px;
    line-height: 1.7;
    color: #475569;
    border-left: 4px solid #3b82f6;
}

.is-dark .post-summary {
    background: rgba(59, 130, 246, 0.1);
    color: #94a3b8;
}

.content-text {
    font-size: 15px;
    line-height: 1.8;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
}

.is-dark .content-text {
    color: #cbd5e1;
}

/* 图片画廊 */
.image-gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    margin-top: 20px;
}

.gallery-item {
    aspect-ratio: 1;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: transform 0.2s;
}

.gallery-item:hover {
    transform: scale(1.02);
}

.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 标签 */
.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 20px;
}

.tag-item {
    padding: 6px 14px;
    border-radius: 16px;
    background: #f1f5f9;
    font-size: 13px;
    font-weight: 500;
    color: #64748b;
}

.is-dark .tag-item {
    background: rgba(255, 255, 255, 0.08);
    color: #94a3b8;
}

/* 统计数据 */
.post-stats {
    display: flex;
    align-items: center;
    gap: 20px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
}

.is-dark .post-stats {
    border-color: rgba(255, 255, 255, 0.08);
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    color: #64748b;
}

.stat-item svg {
    opacity: 0.7;
}

.like-item {
    margin-left: auto;
    padding: 8px 16px;
    border-radius: 20px;
    background: #fee2e2;
    color: #ef4444;
    cursor: pointer;
    transition: all 0.2s;
}

.like-item:hover {
    background: #fecaca;
}

.like-item.is-liked {
    background: #ef4444;
    color: #fff;
}

.is-dark .like-item {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
}

.is-dark .like-item.is-liked {
    background: #ef4444;
    color: #fff;
}

/* ===== 评论区 ===== */
.comments-section {
    margin-top: 20px;
}

.section-header {
    margin-bottom: 16px;
}

.section-title {
    display: flex;
    align-items: center;
    gap: 10px;
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #1e293b;
}

.is-dark .section-title {
    color: #f1f5f9;
}

.comment-count {
    padding: 2px 10px;
    border-radius: 10px;
    background: #e2e8f0;
    font-size: 13px;
    font-weight: 600;
    color: #64748b;
}

.is-dark .comment-count {
    background: rgba(255, 255, 255, 0.1);
    color: #94a3b8;
}

/* 评论输入 */
.comment-input-area {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #ffffff;
    border-radius: 16px;
    margin-bottom: 20px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.is-dark .comment-input-area {
    background: #1e293b;
    box-shadow: none;
}

.input-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
}

.input-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.comment-textarea {
    border-radius: 12px;
}

.submit-btn {
    align-self: flex-end;
}

/* 评论列表 */
.comment-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.comment-item {
    display: flex;
    gap: 12px;
    padding: 16px;
    background: #ffffff;
    border-radius: 16px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.is-dark .comment-item {
    background: #1e293b;
    box-shadow: none;
}

.comment-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
    color: #3b82f6;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 700;
    flex-shrink: 0;
    overflow: hidden;
}

.comment-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.comment-body {
    flex: 1;
    min-width: 0;
}

.comment-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
}

.comment-author {
    font-size: 14px;
    font-weight: 700;
    color: #1e293b;
}

.is-dark .comment-author {
    color: #f1f5f9;
}

.comment-time {
    font-size: 12px;
    color: #94a3b8;
}

.comment-content {
    font-size: 14px;
    line-height: 1.7;
    color: #475569;
    word-break: break-word;
}

.is-dark .comment-content {
    color: #cbd5e1;
}

.comment-actions {
    margin-top: 10px;
}

.like-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    border: none;
    border-radius: 8px;
    background: transparent;
    font-size: 13px;
    color: #94a3b8;
    cursor: pointer;
    transition: all 0.2s;
}

.like-btn:hover {
    background: #f1f5f9;
}

.like-btn.is-liked {
    color: #ef4444;
}

.is-dark .like-btn:hover {
    background: rgba(255, 255, 255, 0.08);
}

/* 空评论状态 */
.empty-comments {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 20px;
    color: #94a3b8;
}

.empty-comments p {
    margin: 12px 0 4px;
    font-size: 15px;
    font-weight: 600;
    color: #64748b;
}

.empty-comments span {
    font-size: 13px;
}

/* ===== 图片预览 ===== */
.image-preview-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.85);
    cursor: zoom-out;
}

.preview-close {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
    font-size: 24px;
    line-height: 1;
    cursor: pointer;
}

.image-preview-modal img {
    max-width: 100%;
    max-height: 90vh;
    border-radius: 12px;
    object-fit: contain;
}

/* ===== 响应式 ===== */
@media (max-width: 640px) {
    .post-title {
        font-size: 22px;
    }

    .post-article {
        padding: 18px;
        border-radius: 16px;
    }

    .author-bar {
        padding: 12px;
    }

    .post-stats {
        flex-wrap: wrap;
        gap: 12px;
    }

    .like-item {
        margin-left: 0;
    }

    .image-gallery {
        grid-template-columns: repeat(2, 1fr);
    }
}
</style>
