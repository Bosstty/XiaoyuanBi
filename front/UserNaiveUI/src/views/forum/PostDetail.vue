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
                    <span class="eyebrow">Forum Detail</span>
                    <h1>帖子详情</h1>
                </div>
            </div>
        </header>

        <main class="detail-area">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
            </div>

            <div v-else-if="post" class="detail-stack">
                <section class="hero-card">
                    <div class="hero-head">
                        <div class="cat-tag" :data-type="post.category">
                            <span class="cat-bar"></span>
                            <span class="cat-label">{{ getCategoryLabel(post.category) }}</span>
                        </div>
                        <span class="status-badge">{{ getStatusLabel(post.status) }}</span>
                    </div>

                    <h2 class="hero-title">{{ post.title }}</h2>
                    <p v-if="post.summary" class="hero-desc">{{ post.summary }}</p>
                    <div class="content-block">{{ post.content }}</div>

                    <div class="meta-grid">
                        <div class="meta-item">
                            <span class="meta-label">作者</span>
                            <span class="meta-value">{{ authorName }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">发布时间</span>
                            <span class="meta-value">{{ formatTime(post.createdAt || post.created_at) }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">浏览</span>
                            <span class="meta-value">{{ post.viewCount || post.view_count || 0 }}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-label">评论</span>
                            <span class="meta-value">
                                {{ post.commentCount || post.comment_count || 0 }}
                            </span>
                        </div>
                    </div>

                    <div v-if="post.tags?.length" class="chip-row">
                        <span v-for="tag in post.tags" :key="tag" class="info-chip info-chip--soft">
                            #{{ tag }}
                        </span>
                    </div>
                </section>

                <section class="panel-card">
                    <div class="section-head">
                        <h3>作者信息</h3>
                        <NButton
                            v-if="post && Number(post.author_id) === Number(userStore.user?.id)"
                            size="small"
                            round
                            type="error"
                            @click="handleDelete"
                        >
                            删除帖子
                        </NButton>
                    </div>

                    <div class="user-card">
                        <div class="user-avatar">
                            <img
                                v-if="post.author?.avatar"
                                :src="post.author.avatar"
                                :alt="authorName"
                            />
                            <span v-else>{{ authorName.charAt(0) }}</span>
                        </div>
                        <div class="user-copy">
                            <div class="user-name">{{ authorName }}</div>
                            <div class="user-sub">
                                <span v-if="post.author?.major">{{ post.author.major }}</span>
                                <span v-if="post.author?.college">
                                    {{ post.author?.major ? ' · ' : '' }}{{ post.author.college }}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                <section class="panel-card">
                    <div class="section-head">
                        <h3>评论区</h3>
                        <span class="count-chip">{{ comments.length }}</span>
                    </div>

                    <div class="comment-editor">
                        <NInput
                            v-model:value="commentInput"
                            type="textarea"
                            :autosize="{ minRows: 3, maxRows: 5 }"
                            placeholder="写下你的评论"
                        />
                        <div class="editor-actions">
                            <NButton
                                type="primary"
                                round
                                :loading="commentSubmitting"
                                :disabled="!commentInput.trim()"
                                @click="handleCreateComment"
                            >
                                发表评论
                            </NButton>
                        </div>
                    </div>

                    <div v-if="comments.length" class="comment-list">
                        <article v-for="comment in comments" :key="comment.id" class="comment-card">
                            <div class="application-head">
                                <div class="user-card user-card--compact">
                                    <div class="user-avatar user-avatar--soft">
                                        <img
                                            v-if="comment.author?.avatar"
                                            :src="comment.author.avatar"
                                            :alt="getCommentAuthor(comment)"
                                        />
                                        <span v-else>{{ getCommentAuthor(comment).charAt(0) }}</span>
                                    </div>
                                    <div class="user-copy">
                                        <div class="user-name">{{ getCommentAuthor(comment) }}</div>
                                        <div class="user-sub">
                                            {{ formatTime(comment.createdAt || comment.created_at) }}
                                        </div>
                                    </div>
                                </div>
                                <NButton
                                    size="small"
                                    round
                                    quaternary
                                    @click="handleLikeComment(comment.id)"
                                >
                                    点赞 {{ comment.likeCount || comment.like_count || 0 }}
                                </NButton>
                            </div>

                            <div class="message-block">
                                <p>{{ comment.content }}</p>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-inline">暂无评论，来发表第一条评论。</div>
                </section>

                <section class="action-bar">
                    <div class="action-row">
                        <div class="action-stat">
                            浏览 {{ post.viewCount || post.view_count || 0 }}
                        </div>
                        <NButton round type="primary" @click="handleLikePost">
                            点赞 {{ post.likeCount || post.like_count || 0 }}
                        </NButton>
                    </div>
                </section>
            </div>

            <div v-else class="state-box">
                <p class="empty-title">帖子不存在</p>
                <p class="empty-sub">这条帖子可能已被删除。</p>
            </div>
        </main>
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

const postId = computed(() => Number(route.params.id || 0));
const authorName = computed(() => {
    const author = post.value?.author;
    return author?.real_name || author?.username || '匿名用户';
});

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
            const nextCount = res.data?.likeCount ?? (post.value.likeCount || post.value.like_count || 0) + 1;
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
            const nextCount = res.data?.likeCount ?? (comment.likeCount || comment.like_count || 0) + 1;
            return {
                ...comment,
                likeCount: nextCount,
                like_count: nextCount,
            };
        });
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
.user-card,
.action-row {
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

.cat-tag[data-type='life'] .cat-bar {
    background: #ff8a3d;
}

.cat-tag[data-type='campus'] .cat-bar {
    background: #00b894;
}

.cat-tag[data-type='task'] .cat-bar {
    background: #6c5ce7;
}

.cat-tag[data-type='skill'] .cat-bar {
    background: #22b573;
}

.status-badge,
.count-chip,
.info-chip {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: 700;
}

.status-badge {
    min-height: 34px;
    padding: 0 14px;
    font-size: 14px;
    background: #e4f7ee;
    color: #17a05d;
}

.hero-title {
    margin: 0 0 10px;
    font-size: 38px;
    line-height: 1.08;
    font-weight: 900;
    color: #1d2d44;
}

.hero-desc,
.content-block,
.message-block p {
    margin: 0;
    font-size: 16px;
    line-height: 1.7;
    color: #61718b;
}

.content-block {
    white-space: pre-wrap;
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

.meta-label {
    font-size: 13px;
    color: #95a3b8;
    font-weight: 700;
}

.meta-value {
    font-size: 16px;
    font-weight: 800;
    color: #1d2d44;
}

.chip-row,
.comment-list {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}

.chip-row {
    margin-top: 16px;
}

.info-chip {
    min-height: 34px;
    padding: 0 14px;
    background: #f2f5f9;
    color: #6c7c96;
    font-size: 13px;
}

.info-chip--soft {
    background: #f2f5f9;
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
.empty-inline,
.empty-sub,
.action-stat {
    font-size: 13px;
    line-height: 1.6;
    color: #95a3b8;
}

.comment-editor {
    margin-bottom: 16px;
}

.editor-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 10px;
}

.comment-list {
    flex-direction: column;
}

.comment-card {
    padding: 16px;
    border-radius: 22px;
    background: #f7f9fc;
    border: 1px solid rgba(47, 107, 255, 0.08);
}

.message-block {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.85);
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

.empty-title {
    margin: 0;
    font-size: 24px;
    font-weight: 900;
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
.is-dark .comment-card,
.is-dark .message-block {
    background: rgba(255, 255, 255, 0.04);
}

.is-dark .hero-desc,
.is-dark .content-block,
.is-dark .message-block p,
.is-dark .user-sub,
.is-dark .empty-inline,
.is-dark .empty-sub,
.is-dark .eyebrow,
.is-dark .meta-label,
.is-dark .action-stat {
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
