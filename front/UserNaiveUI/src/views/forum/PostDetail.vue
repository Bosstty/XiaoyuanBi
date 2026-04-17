<template>
    <div class="post-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-nav">
            <button type="button" class="nav-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="20" height="20">
                    <path
                        d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
                        fill="currentColor"
                    />
                </svg>
            </button>
            <span class="nav-title">帖子</span>
            <button
                v-if="post && Number(post.author_id) === Number(userStore.user?.id)"
                type="button"
                class="nav-btn nav-btn--danger"
                @click="handleDelete"
                aria-label="删除"
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                        fill="currentColor"
                    />
                </svg>
            </button>
            <button
                v-else-if="canReportPost"
                type="button"
                class="nav-btn nav-btn--warn"
                :disabled="post?.has_reported"
                @click="openReportPostModal"
                aria-label="举报"
            >
                <svg viewBox="0 0 24 24" width="18" height="18">
                    <path
                        d="M12 2 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3zm0 10h-2V7h2v5zm0 4h-2v-2h2v2z"
                        fill="currentColor"
                    />
                </svg>
            </button>
            <span v-else class="nav-btn nav-btn--ghost"></span>
        </header>

        <main class="page-body">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
                <p>加载中...</p>
            </div>

            <template v-else-if="post">
                <article class="article">
                    <div class="article-meta">
                        <span class="category-tag" :data-type="post.category">
                            {{ getCategoryLabel(post.category) }}
                        </span>
                        <span>{{ formatTime(post.createdAt || post.created_at) }}</span>
                        <span
                            v-if="post.status !== 'published'"
                            class="status-tag"
                            :data-status="post.status"
                        >
                            {{ getStatusLabel(post.status) }}
                        </span>
                    </div>

                    <div class="author-row">
                        <div class="author-main">
                            <div class="avatar">
                                <img
                                    v-if="resolveAvatarUrl(post.author?.avatar)"
                                    :src="resolveAvatarUrl(post.author?.avatar)"
                                    :alt="authorName"
                                />
                                <span v-else>{{ authorName.charAt(0) }}</span>
                            </div>
                            <div class="author-copy">
                                <strong>{{ authorName }}</strong>
                                <span>
                                    {{ post.author?.college || '校园用户' }}
                                    <template v-if="post.author?.major">
                                        · {{ post.author.major }}
                                    </template>
                                </span>
                            </div>
                        </div>
                    </div>

                    <h1 class="article-title">{{ post.title }}</h1>

                    <p v-if="post.summary" class="article-summary">{{ post.summary }}</p>

                    <div class="article-content">{{ post.content }}</div>

                    <div v-if="post.images?.length" class="image-grid">
                        <button
                            v-for="(img, idx) in post.images"
                            :key="idx"
                            type="button"
                            class="image-item"
                            @click="previewingImage = resolveAssetUrl(img)"
                        >
                            <img :src="resolveAssetUrl(img)" :alt="`帖子图片 ${idx + 1}`" />
                        </button>
                    </div>

                    <div v-if="post.tags?.length" class="tag-list">
                        <span v-for="tag in post.tags" :key="tag" class="tag-item">#{{ tag }}</span>
                    </div>
                </article>

                <section class="discussion">
                    <div class="article-stats article-stats--discussion">
                        <button
                            type="button"
                            class="stat-link"
                            :class="{ 'is-active': isLiked }"
                            @click="handleLikePost"
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
                                    d="M12 5c-5.5 0-9.5 4.3-10.8 6 .4.54 1.08 1.33 2 2.15C5 14.74 8.02 17 12 17s7-2.26 8.8-3.85c.92-.82 1.6-1.61 2-2.15C21.5 9.3 17.5 5 12 5zm0 10c-2.2 0-4-1.79-4-4s1.8-4 4-4 4 1.79 4 4-1.8 4-4 4zm0-2.2A1.8 1.8 0 1012 9.2a1.8 1.8 0 000 3.6z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ post.viewCount || post.view_count || 0 }}</span>
                        </div>
                        <div class="stat-link">
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    d="M4 5.5A2.5 2.5 0 016.5 3h11A2.5 2.5 0 0120 5.5v7A2.5 2.5 0 0117.5 15H9l-4.5 4v-4A2.5 2.5 0 012 12.5v-7A2.5 2.5 0 014.5 3H5"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ post.commentCount || post.comment_count || 0 }}</span>
                        </div>
                    </div>

                    <div class="discussion-head">
                        <div>
                            <h2>评论区</h2>
                        </div>
                        <span>{{ comments.length }} 条</span>
                    </div>

                    <div v-if="threadedComments.length" class="comment-list">
                        <article
                            v-for="comment in threadedComments"
                            :key="comment.id"
                            class="comment-item"
                        >
                            <div class="comment-shell">
                                <div class="avatar avatar--small avatar--comment">
                                    <img
                                        v-if="resolveAvatarUrl(comment.author?.avatar)"
                                        :src="resolveAvatarUrl(comment.author?.avatar)"
                                        :alt="getCommentAuthor(comment)"
                                    />
                                    <span v-else>
                                        {{ getCommentAuthor(comment).charAt(0) }}
                                    </span>
                                </div>
                                <div class="comment-body">
                                    <div class="comment-author-copy">
                                        <div class="comment-name-row">
                                            <strong>{{ getCommentAuthor(comment) }}</strong>
                                            <span
                                                v-if="isPostAuthor(comment.author_id)"
                                                class="identity-badge"
                                            >
                                                楼主
                                            </span>
                                        </div>
                                        <div class="comment-meta"></div>
                                    </div>

                                    <div class="comment-content">{{ comment.content }}</div>

                                    <div class="comment-actions">
                                        <span class="comment-time">
                                            {{
                                                formatTime(comment.createdAt || comment.created_at)
                                            }}
                                        </span>
                                        <button
                                            type="button"
                                            class="text-action"
                                            @click="handleReply(comment)"
                                        >
                                            回复
                                        </button>
                                    </div>

                                    <div v-if="comment.replies?.length" class="reply-block">
                                        <article
                                            v-for="reply in comment.replies"
                                            :key="reply.id"
                                            class="reply-item"
                                        >
                                            <div class="reply-shell">
                                                <div class="avatar avatar--xsmall avatar--comment">
                                                    <img
                                                        v-if="
                                                            resolveAvatarUrl(reply.author?.avatar)
                                                        "
                                                        :src="
                                                            resolveAvatarUrl(reply.author?.avatar)
                                                        "
                                                        :alt="getCommentAuthor(reply)"
                                                    />
                                                    <span v-else>
                                                        {{ getCommentAuthor(reply).charAt(0) }}
                                                    </span>
                                                </div>
                                                <div class="reply-main">
                                                    <div class="reply-author">
                                                        <div class="comment-name-row">
                                                            <strong>
                                                                {{ getCommentAuthor(reply) }}
                                                            </strong>
                                                            <template v-if="reply.replyToUser">
                                                                <span class="reply-target-arrow">
                                                                    ▸
                                                                </span>
                                                                <span class="reply-target-name">
                                                                    {{
                                                                        reply.replyToUser
                                                                            .real_name ||
                                                                        reply.replyToUser.username
                                                                    }}
                                                                </span>
                                                            </template>
                                                            <span
                                                                v-if="isPostAuthor(reply.author_id)"
                                                                class="identity-badge"
                                                            >
                                                                楼主
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div class="comment-content">
                                                        {{ reply.content }}
                                                    </div>
                                                    <div class="reply-actions">
                                                        <span class="comment-time">
                                                            {{
                                                                formatTime(
                                                                    reply.createdAt ||
                                                                        reply.created_at
                                                                )
                                                            }}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            class="text-action"
                                                            @click="handleReply(reply)"
                                                        >
                                                            回复
                                                        </button>
                                                    </div>
                                                </div>
                                                <button
                                                    type="button"
                                                    class="icon-action"
                                                    :class="{
                                                        'is-active': likedComments.has(reply.id),
                                                    }"
                                                    @click="handleLikeComment(reply.id)"
                                                    aria-label="点赞回复"
                                                >
                                                    <svg viewBox="0 0 24 24" aria-hidden="true">
                                                        <path
                                                            d="M12.1 21.35l-1.1-1C5.14 15.24 2 12.39 2 8.86 2 6 4.24 4 7.05 4c1.54 0 3.02.73 3.95 1.88C11.93 4.73 13.41 4 14.95 4 17.76 4 20 6 20 8.86c0 3.53-3.14 6.38-8.99 11.49l-1.11 1z"
                                                            fill="currentColor"
                                                        />
                                                    </svg>
                                                    <span>
                                                        {{
                                                            reply.likeCount || reply.like_count || 0
                                                        }}
                                                    </span>
                                                </button>
                                            </div>
                                        </article>
                                    </div>
                                </div>
                                <div class="comment-side">
                                    <button
                                        type="button"
                                        class="icon-action"
                                        :class="{
                                            'is-active': likedComments.has(comment.id),
                                        }"
                                        @click="handleLikeComment(comment.id)"
                                        aria-label="点赞评论"
                                    >
                                        <svg viewBox="0 0 24 24" aria-hidden="true">
                                            <path
                                                d="M12.1 21.35l-1.1-1C5.14 15.24 2 12.39 2 8.86 2 6 4.24 4 7.05 4c1.54 0 3.02.73 3.95 1.88C11.93 4.73 13.41 4 14.95 4 17.76 4 20 6 20 8.86c0 3.53-3.14 6.38-8.99 11.49l-1.11 1z"
                                                fill="currentColor"
                                            />
                                        </svg>
                                        <span>
                                            {{ comment.likeCount || comment.like_count || 0 }}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-box">
                        <p>还没有评论</p>
                        <span>这条帖子还在等第一条认真回复</span>
                    </div>
                </section>
            </template>

            <div v-else class="state-box">
                <p>帖子不存在或已被删除</p>
                <NButton type="primary" round @click="router.back()">返回</NButton>
            </div>
        </main>

        <div v-if="post" class="floating-composer-shell">
            <div class="floating-composer">
                <div class="composer-main">
                    <div v-if="replyTarget" class="reply-banner">
                        <span>回复 {{ getCommentAuthor(replyTarget) }}</span>
                        <button type="button" @click="clearReplyTarget">取消</button>
                    </div>
                    <div class="composer-row">
                        <NInput
                            ref="commentInputRef"
                            v-model:value="commentInput"
                            type="textarea"
                            :autosize="{ minRows: 1, maxRows: 3 }"
                            :placeholder="composerPlaceholder"
                        />
                        <NButton
                            type="primary"
                            class="composer-submit"
                            :loading="commentSubmitting"
                            :disabled="!commentInput.trim()"
                            @click="handleCreateComment"
                        >
                            {{ replyTarget ? '回复' : '发布' }}
                        </NButton>
                    </div>
                </div>
            </div>
        </div>

        <div v-if="previewingImage" class="preview-mask" @click="previewingImage = ''">
            <button type="button" class="preview-close" @click="previewingImage = ''">×</button>
            <img :src="previewingImage" alt="预览图片" />
        </div>

        <div
            v-if="showReportPostModal"
            class="preview-mask"
            @click.self="showReportPostModal = false"
        >
            <div class="report-modal">
                <div class="report-modal__head">
                    <h2>举报帖子</h2>
                    <button
                        type="button"
                        class="preview-close preview-close--static"
                        @click="showReportPostModal = false"
                    >
                        ×
                    </button>
                </div>
                <p class="report-modal__hint">举报会进入管理员审核工作台，请仅举报真实违规内容。</p>
                <NSelect
                    v-model:value="postReportReasonType"
                    :options="reportReasonOptions"
                    placeholder="请选择举报原因"
                />
                <NInput
                    v-model:value="postReportReasonText"
                    type="textarea"
                    :autosize="{ minRows: 3, maxRows: 5 }"
                    placeholder="补充具体情况，便于管理员快速判断"
                    style="margin-top: 12px"
                />
                <div class="report-modal__actions">
                    <NButton round @click="showReportPostModal = false">取消</NButton>
                    <NButton
                        type="warning"
                        round
                        :loading="submittingPostReport"
                        @click="submitPostReport"
                    >
                        提交举报
                    </NButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NInput, NSelect, NSpin, useDialog, useMessage } from 'naive-ui';
import type { ForumComment, ForumPost } from '@/types';
import { forumApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import { resolveAssetUrl } from '@/utils/apiBase';

type ThreadComment = ForumComment & { replies: ForumComment[] };

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
const likedComments = ref(new Set<number>());
const previewingImage = ref('');
const replyTarget = ref<ForumComment | null>(null);
const commentInputRef = ref<any>(null);
const showReportPostModal = ref(false);
const submittingPostReport = ref(false);
const postReportReasonType = ref<string | null>(null);
const postReportReasonText = ref('');

const postId = computed(() => Number(route.params.id || 0));
const authorName = computed(
    () => post.value?.author?.real_name || post.value?.author?.username || '匿名用户'
);
const canReportPost = computed(
    () =>
        !!post.value &&
        Number(userStore.user?.id || 0) > 0 &&
        Number(post.value.author_id) !== Number(userStore.user?.id || 0) &&
        !post.value.has_reported
);
const reportReasonOptions = [
    { label: '诈骗/虚假', value: 'fraud' },
    { label: '广告引流', value: 'ad' },
    { label: '色情低俗', value: 'vulgar' },
    { label: '违法违规', value: 'illegal' },
    { label: '辱骂攻击', value: 'abuse' },
    { label: '不实信息', value: 'false_info' },
    { label: '危险交易', value: 'unsafe_trade' },
    { label: '其他', value: 'other' },
];
const composerPlaceholder = computed(() =>
    replyTarget.value ? `回复 ${getCommentAuthor(replyTarget.value)}...` : '写下你的看法...'
);
const isPostAuthor = (authorId?: number) =>
    Number(authorId) > 0 && Number(authorId) === Number(post.value?.author_id);

const threadedComments = computed<ThreadComment[]>(() => {
    const roots = comments.value
        .filter(item => !item.parent_id)
        .map(item => ({ ...item, replies: [] as ForumComment[] }));
    const rootMap = new Map<number, ThreadComment>();
    roots.forEach(item => rootMap.set(item.id, item));
    comments.value
        .filter(item => item.parent_id)
        .forEach(item => {
            const root = rootMap.get(Number(item.parent_id));
            if (root) root.replies.push(item);
        });
    roots.forEach(item =>
        item.replies.sort(
            (a, b) =>
                new Date(a.createdAt || a.created_at || 0).getTime() -
                new Date(b.createdAt || b.created_at || 0).getTime()
        )
    );
    return roots.sort(
        (a, b) =>
            new Date(b.createdAt || b.created_at || 0).getTime() -
            new Date(a.createdAt || a.created_at || 0).getTime()
    );
});

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    return resolveAssetUrl(value);
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

const clearReplyTarget = () => {
    replyTarget.value = null;
};

const handleReply = async (comment: ForumComment) => {
    replyTarget.value = comment;
    await nextTick();
    commentInputRef.value?.focus?.();
    commentInputRef.value?.textareaElRef?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
};

const loadPost = async () => {
    if (!postId.value) return;
    loading.value = true;
    try {
        const [postRes, commentRes] = await Promise.all([
            forumApi.getPost(postId.value),
            forumApi.getComments(postId.value, { page: 1, limit: 100, order: 'desc' }),
        ]);
        if (!postRes.success || !postRes.data) throw new Error(postRes.message || '获取帖子失败');
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
        if (!res.success) return;
        const nextCount =
            res.data?.likeCount ?? (post.value.likeCount || post.value.like_count || 0) + 1;
        post.value.likeCount = nextCount;
        post.value.like_count = nextCount;
        isLiked.value = true;
    } catch (error: any) {
        message.error(error?.message || '点赞失败');
    }
};

const handleCreateComment = async () => {
    if (!post.value || !commentInput.value.trim()) return;
    commentSubmitting.value = true;
    try {
        const target = replyTarget.value;
        const res = await forumApi.createComment(post.value.id, {
            content: commentInput.value.trim(),
            parent_id: target ? target.parent_id || target.id : undefined,
            reply_to_id: target ? target.author_id : undefined,
        });
        if (!res.success || !res.data) throw new Error(res.message || '评论失败');
        comments.value = [res.data, ...comments.value];
        commentInput.value = '';
        replyTarget.value = null;
        const nextCount = (post.value.commentCount || post.value.comment_count || 0) + 1;
        post.value.commentCount = nextCount;
        post.value.comment_count = nextCount;
        message.success(target ? '回复成功' : '评论成功');
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
        comments.value = comments.value.map(comment =>
            comment.id === commentId
                ? {
                      ...comment,
                      likeCount:
                          res.data?.likeCount ?? (comment.likeCount || comment.like_count || 0) + 1,
                      like_count:
                          res.data?.likeCount ?? (comment.likeCount || comment.like_count || 0) + 1,
                  }
                : comment
        );
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
                if (!res.success) throw new Error(res.message || '删除失败');
                message.success('删除成功');
                router.replace('/forum/my');
            } catch (error: any) {
                message.error(error?.message || '删除失败');
            }
        },
    });
};

const submitPostReport = async () => {
    if (!post.value || !canReportPost.value || submittingPostReport.value) return;
    if (!postReportReasonType.value) {
        message.warning('请选择举报原因');
        return;
    }

    submittingPostReport.value = true;
    try {
        const res = await forumApi.reportPost(post.value.id, {
            reason_type: postReportReasonType.value,
            reason_text: postReportReasonText.value.trim() || undefined,
        });
        if (!res.success) throw new Error(res.message || '提交举报失败');
        showReportPostModal.value = false;
        message.success('举报已提交');
        await loadPost();
    } catch (error: any) {
        message.error(error?.message || '提交举报失败');
    } finally {
        submittingPostReport.value = false;
    }
};

const openReportPostModal = () => {
    if (!canReportPost.value) return;
    postReportReasonType.value = null;
    postReportReasonText.value = '';
    showReportPostModal.value = true;
};

onMounted(() => {
    void loadPost();
});
</script>

<style scoped>
.post-detail-page {
    min-height: 100vh;
    background: #f8fafc;
    color: #0f172a;
}

.is-dark {
    background: #0f172a;
    color: #e2e8f0;
}

.top-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: grid;
    grid-template-columns: 40px 1fr 40px;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(248, 250, 252, 0.92);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(148, 163, 184, 0.14);
}

.is-dark .top-nav {
    background: rgba(15, 23, 42, 0.92);
    border-color: rgba(148, 163, 184, 0.12);
}

.nav-btn,
.nav-placeholder {
    width: 40px;
    height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.nav-btn {
    border: none;
    color: #334155;
}

.is-dark .nav-btn {
    color: #e2e8f0;
}

.nav-btn--danger {
    color: #dc2626;
}

.nav-btn--warn {
    color: #ea580c;
}

.nav-title {
    text-align: center;
    font-size: 15px;
    font-weight: 700;
}

.page-body {
    max-width: 760px;
    margin: 0 auto;
    padding: 18px 16px 176px;
}

.state-box {
    min-height: 56vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #64748b;
}

.article {
    padding: 8px 0 0;
}

.article-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 8px;
    color: #64748b;
    font-size: 12px;
    margin-bottom: 14px;
}

.category-tag,
.status-tag,
.tag-item,
.inline-action,
.text-action {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: 700;
}

.category-tag {
    min-height: 28px;
    padding: 0 12px;
    background: #dbeafe;
    color: #1d4ed8;
}

.category-tag[data-type='life'] {
    background: #ffedd5;
    color: #c2410c;
}

.category-tag[data-type='campus'] {
    background: #dcfce7;
    color: #15803d;
}

.category-tag[data-type='task'] {
    background: #e0e7ff;
    color: #4338ca;
}

.category-tag[data-type='skill'] {
    background: #cffafe;
    color: #0f766e;
}

.status-tag {
    min-height: 26px;
    padding: 0 10px;
    background: #fef3c7;
    color: #b45309;
}

.status-tag[data-status='draft'] {
    background: #e2e8f0;
    color: #64748b;
}

.status-tag[data-status='rejected'],
.status-tag[data-status='hidden'] {
    background: #fee2e2;
    color: #dc2626;
}

.article-title {
    margin: 20px 0 0;
    max-width: 15ch;
    font-size: clamp(2.2rem, 4vw, 3.2rem);
    line-height: 1.08;
    letter-spacing: -0.05em;
    font-weight: 900;
}

.author-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-top: 8px;
    padding-bottom: 18px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.16);
}

.author-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
}

.avatar {
    width: 44px;
    height: 44px;
    border-radius: 999px;
    background: linear-gradient(135deg, #cbd5e1, #94a3b8);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 800;
    overflow: hidden;
    flex-shrink: 0;
}

.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.avatar--small {
    width: 38px;
    height: 38px;
}

.avatar--xsmall {
    width: 28px;
    height: 28px;
    font-size: 12px;
}

.avatar--comment {
    background: #dbeafe;
    color: #2563eb;
}

.author-copy strong {
    display: block;
    font-size: 15px;
    font-weight: 800;
}

.author-copy span {
    display: block;
    margin-top: 3px;
    font-size: 13px;
    color: #64748b;
}

.article-stats {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 18px;
    flex-wrap: wrap;
    margin-top: 14px;
}

.article-stats--discussion {
    margin-top: 0;
    margin-bottom: 18px;
    padding-bottom: 14px;
}

.stat-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: none;
    padding: 0;
    background: transparent;
    color: #475569;
    font-size: 14px;
    line-height: 1;
}

.stat-link svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}

.stat-link.is-active {
    color: #be123c;
}

.stat-link span {
    font-size: 14px;
}

.article-summary {
    margin: 24px 0 0;
    max-width: 54ch;
    color: #475569;
    font-size: 1rem;
    line-height: 1.9;
}

.article-content {
    margin-top: 24px;
    max-width: 42rem;
    color: #1e293b;
    font-size: 1.08rem;
    line-height: 2;
    white-space: pre-wrap;
    word-break: break-word;
}

.is-dark .article-content,
.is-dark .comment-content {
    color: #dbe4ef;
}

.image-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 28px;
}

.image-item {
    aspect-ratio: 1.12;
    border: none;
    padding: 0;
    border-radius: 16px;
    overflow: hidden;
    background: #e2e8f0;
}

.image-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.tag-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
}

.tag-item {
    min-height: 32px;
    padding: 0 12px;
    background: #f1f5f9;
    color: #475569;
    font-size: 13px;
}

.discussion {
    margin-top: 42px;
    padding-top: 22px;
}

.discussion-head {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 12px;
}

.discussion-head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}

.discussion-head span,
.discussion-head p {
    margin: 0;
    color: #64748b;
    font-size: 13px;
}

.floating-composer-shell {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 24;
    pointer-events: none;
    padding: 0 12px calc(12px + env(safe-area-inset-bottom));
    background: linear-gradient(
        180deg,
        rgba(248, 250, 252, 0) 0%,
        rgba(248, 250, 252, 0.92) 36%,
        #f8fafc 100%
    );
}

.is-dark .floating-composer-shell {
    background: linear-gradient(
        180deg,
        rgba(15, 23, 42, 0) 0%,
        rgba(15, 23, 42, 0.9) 36%,
        #0f172a 100%
    );
}

.floating-composer {
    display: flex;
    gap: 12px;
    max-width: 760px;
    margin: 0 auto;
    padding: 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.96);
    border: 1px solid rgba(226, 232, 240, 0.92);
    box-shadow: 0 -8px 30px rgba(15, 23, 42, 0.08);
    pointer-events: auto;
}

.is-dark .floating-composer {
    background: rgba(17, 24, 39, 0.74);
    border-color: rgba(51, 65, 85, 0.9);
    box-shadow: 0 -8px 30px rgba(2, 6, 23, 0.28);
}

.composer-main {
    flex: 1;
    min-width: 0;
}

.composer-row {
    display: flex;
    align-items: flex-end;
    gap: 12px;
}

.composer-row :deep(.n-input) {
    flex: 1;
}

.composer-submit {
    flex-shrink: 0;
    min-width: 84px;
    height: 42px;
}

.composer-submit :deep(.n-button__content) {
    color: #ffffff;
    font-weight: 700;
}

.reply-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 12px;
    background: #eff6ff;
    color: #1d4ed8;
    font-size: 13px;
    font-weight: 700;
}

.reply-banner button {
    border: none;
    background: transparent;
    color: #2563eb;
    font-size: 13px;
}

.comment-list {
    display: grid;
    gap: 14px;
    margin-top: 18px;
}

.comment-item {
    padding: 16px 0;
    border-bottom: 1px solid rgba(226, 232, 240, 0.8);
}

.comment-item:last-child {
    border-bottom: none;
}

.comment-shell {
    display: flex;
    align-items: flex-start;
    gap: 12px;
}

.comment-body {
    flex: 1;
    min-width: 0;
}

.comment-side {
    width: 32px;
    display: flex;
    justify-content: center;
    flex-shrink: 0;
    padding-top: 2px;
}

.comment-side--reply {
    width: 28px;
    padding-top: 0;
    margin-left: auto;
}

.reply-shell {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
}

.reply-main {
    flex: 1;
    min-width: 0;
}

.comment-top,
.reply-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.comment-author-copy {
    min-width: 0;
}

.comment-name-row {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
}

.reply-target-arrow {
    color: #94a3b8;
    font-size: 12px;
    line-height: 1;
}

.reply-target-name {
    color: #64748b;
    font-size: 13px;
    font-weight: 600;
}

.comment-author-copy strong,
.reply-author strong {
    font-size: 14px;
    font-weight: 800;
}

.comment-meta,
.reply-author {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
    margin-top: 0;
    color: #64748b;
    font-size: 12px;
}

.identity-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    background: #dbeafe;
    color: #2563eb;
    font-size: 11px;
    font-weight: 800;
}

.comment-time {
    color: #94a3b8;
    font-size: 12px;
    line-height: 1;
}

.comment-actions,
.reply-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    margin-top: 8px;
}

.text-action {
    min-height: 24px;
    padding: 0;
    border: none;
    background: transparent;
    color: #94a3b8;
    font-size: 12px;
}

.icon-action {
    min-height: auto;
    padding: 0;
    border: none;
    background: transparent;
    color: #94a3b8;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    font-size: 11px;
    line-height: 1;
}

.icon-action svg {
    width: 18px;
    height: 18px;
    flex-shrink: 0;
}

.icon-action span {
    min-width: 10px;
    line-height: 1;
    text-align: center;
}

.icon-action.is-active {
    color: #ef4444;
}

.text-action.is-active {
    color: #dc2626;
}

.comment-content {
    margin-top: 6px;
    color: #334155;
    font-size: 14px;
    line-height: 1.7;
    word-break: break-word;
}

.reply-block {
    display: grid;
    gap: 12px;
    margin-top: 12px;
    padding-left: 0;
    border-left: none;
    background: transparent;
}

.reply-item {
    padding: 0;
}

.reply-item em {
    margin-right: 6px;
    color: #2563eb;
    font-style: normal;
    font-weight: 700;
}

.empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 40px 20px;
    color: #64748b;
}

.empty-box p {
    margin: 0 0 6px;
    font-size: 16px;
    font-weight: 800;
    color: #334155;
}

.preview-mask {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(2, 6, 23, 0.88);
}

.preview-close {
    position: absolute;
    top: 18px;
    right: 18px;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: #fff;
    font-size: 24px;
}

.preview-mask img {
    max-width: 100%;
    max-height: 90vh;
    object-fit: contain;
    border-radius: 16px;
}

.report-modal {
    width: min(100%, 420px);
    padding: 20px;
    border-radius: 24px;
    background: #fff;
    color: #172033;
}

.report-modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.report-modal__head h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 800;
}

.report-modal__hint {
    margin: 12px 0 14px;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
}

.is-dark .report-modal {
    background: rgba(15, 23, 42, 0.98);
    color: #f8fafc;
    box-shadow: 0 20px 48px rgba(2, 6, 23, 0.42);
}

.is-dark .report-modal__head h2 {
    color: #f8fafc;
}

.is-dark .report-modal__hint {
    color: #94a3b8;
}

.is-dark .report-modal :deep(.n-base-selection),
.is-dark .report-modal :deep(.n-input-wrapper) {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.68);
}

.is-dark .report-modal :deep(.n-base-selection-label),
.is-dark .report-modal :deep(.n-base-selection-placeholder),
.is-dark .report-modal :deep(.n-base-selection-placeholder__inner),
.is-dark .report-modal :deep(.n-base-selection-input),
.is-dark .report-modal :deep(.n-base-selection-input__content),
.is-dark .report-modal :deep(.n-input__input-el),
.is-dark .report-modal :deep(.n-input__textarea-el),
.is-dark .report-modal :deep(.n-input__placeholder),
.is-dark .report-modal :deep(.n-button__content) {
    color: #f8fafc;
}

.is-dark .report-modal :deep(.n-base-selection-placeholder),
.is-dark .report-modal :deep(.n-base-selection-placeholder__inner),
.is-dark .report-modal :deep(.n-input__placeholder) {
    opacity: 0.72;
}

.report-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 14px;
}

.preview-close--static {
    position: static;
}

@media (max-width: 640px) {
    .page-body {
        padding: 16px 14px 188px;
    }

    .article-title {
        max-width: none;
        font-size: 2.2rem;
    }

    .author-row,
    .comment-top,
    .reply-top {
        flex-direction: column;
        align-items: flex-start;
    }

    .article-stats {
        gap: 16px;
    }

    .composer-row,
    .comment-actions {
        width: 100%;
    }

    .composer-row {
        align-items: stretch;
    }

    .comment-shell,
    .reply-shell {
        gap: 10px;
    }

    .floating-composer-shell {
        padding: 0 10px calc(10px + env(safe-area-inset-bottom));
    }

    .floating-composer {
        padding: 14px;
        border-radius: 20px 20px 16px 16px;
    }

    .image-grid {
        grid-template-columns: 1fr;
    }
}
</style>
