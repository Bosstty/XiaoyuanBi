<template>
    <div class="post-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="detail-nav">
            <button type="button" class="icon-btn" @click="router.back()" aria-label="返回">
                <svg viewBox="0 0 24 24" width="22" height="22">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
            </button>
            <h1>帖子详情</h1>
            <button
                v-if="post && Number(post.author_id) === Number(userStore.user?.id)"
                type="button"
                class="icon-btn icon-btn--danger"
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
            <div v-else class="nav-spacer"></div>
        </header>

        <main class="detail-shell">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
                <p>加载中...</p>
            </div>

            <template v-else-if="post">
                <article class="post-card">
                    <div class="post-head">
                        <div class="chip-row">
                            <span class="category-chip" :data-type="post.category">
                                <i></i>
                                {{ getCategoryLabel(post.category) }}
                            </span>
                            <span class="status-chip" :data-status="post.status">
                                {{ getStatusLabel(post.status) }}
                            </span>
                        </div>
                        <span class="muted">
                            {{ formatTime(post.createdAt || post.created_at) }}
                        </span>
                    </div>

                    <h1 class="post-title">{{ post.title }}</h1>

                    <div class="author-card">
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
                                {{ post.author?.college || '未填写学院' }}
                                <template v-if="post.author?.major">
                                    · {{ post.author.major }}
                                </template>
                            </span>
                        </div>
                    </div>

                    <div class="content-block">
                        <p v-if="post.summary" class="summary">{{ post.summary }}</p>
                        <div class="content-text">{{ post.content }}</div>
                    </div>

                    <div v-if="post.images?.length" class="gallery">
                        <button
                            v-for="(img, idx) in post.images"
                            :key="idx"
                            type="button"
                            class="gallery-item"
                            @click="previewingImage = resolveAssetUrl(img)"
                        >
                            <img :src="resolveAssetUrl(img)" :alt="`帖子图片 ${idx + 1}`" />
                        </button>
                    </div>

                    <div v-if="post.tags?.length" class="tags">
                        <span v-for="tag in post.tags" :key="tag" class="tag">#{{ tag }}</span>
                    </div>

                    <div class="stats">
                        <span class="stat-pill">
                            {{ post.viewCount || post.view_count || 0 }} 浏览
                        </span>
                        <span class="stat-pill">
                            {{ post.commentCount || post.comment_count || 0 }} 评论
                        </span>
                        <span v-if="post.report_count" class="stat-pill">
                            {{ post.report_count }} 举报
                        </span>
                        <button
                            type="button"
                            class="like-pill"
                            :class="{ 'is-liked': isLiked }"
                            @click="handleLikePost"
                        >
                            {{ post.likeCount || post.like_count || 0 }} 点赞
                        </button>
                        <button
                            v-if="canReportPost"
                            type="button"
                            class="minor-btn report-pill"
                            :disabled="post.has_reported"
                            @click="openReportPostModal"
                        >
                            {{ post.has_reported ? '已举报' : '举报' }}
                        </button>
                    </div>
                </article>

                <section class="comments-card">
                    <div class="section-head">
                        <h2>
                            评论
                            <span>{{ comments.length }}</span>
                        </h2>
                    </div>

                    <div class="composer">
                        <div class="avatar avatar--self">
                            {{
                                userStore.user?.real_name?.charAt(0) ||
                                userStore.user?.username?.charAt(0) ||
                                '我'
                            }}
                        </div>
                        <div class="composer-main">
                            <div v-if="replyTarget" class="reply-banner">
                                <span>正在回复 {{ getCommentAuthor(replyTarget) }}</span>
                                <button type="button" @click="clearReplyTarget">取消</button>
                            </div>
                            <NInput
                                ref="commentInputRef"
                                v-model:value="commentInput"
                                type="textarea"
                                :autosize="{ minRows: 2, maxRows: 5 }"
                                :placeholder="composerPlaceholder"
                            />
                            <div class="composer-actions">
                                <span>
                                    {{
                                        replyTarget
                                            ? '将作为回复发送到评论区'
                                            : '文明评论，友善交流'
                                    }}
                                </span>
                                <NButton
                                    type="primary"
                                    :loading="commentSubmitting"
                                    :disabled="!commentInput.trim()"
                                    @click="handleCreateComment"
                                >
                                    {{ replyTarget ? '回复' : '发布' }}
                                </NButton>
                            </div>
                        </div>
                    </div>

                    <div v-if="threadedComments.length" class="comment-list">
                        <article
                            v-for="comment in threadedComments"
                            :key="comment.id"
                            class="comment-card"
                        >
                            <div class="avatar avatar--comment">
                                <img
                                    v-if="resolveAvatarUrl(comment.author?.avatar)"
                                    :src="resolveAvatarUrl(comment.author?.avatar)"
                                    :alt="getCommentAuthor(comment)"
                                />
                                <span v-else>{{ getCommentAuthor(comment).charAt(0) }}</span>
                            </div>
                            <div class="comment-main">
                                <div class="comment-head">
                                    <div class="author-line">
                                        <strong>{{ getCommentAuthor(comment) }}</strong>
                                        <span
                                            v-if="isPostAuthor(comment.author_id)"
                                            class="identity-badge"
                                        >
                                            楼主
                                        </span>
                                    </div>
                                    <span>
                                        {{ formatTime(comment.createdAt || comment.created_at) }}
                                    </span>
                                </div>
                                <div class="comment-content">{{ comment.content }}</div>
                                <div class="comment-actions">
                                    <button
                                        type="button"
                                        class="minor-btn"
                                        :class="{ 'is-liked': likedComments.has(comment.id) }"
                                        @click="handleLikeComment(comment.id)"
                                    >
                                        点赞 {{ comment.likeCount || comment.like_count || 0 }}
                                    </button>
                                    <button
                                        type="button"
                                        class="minor-btn"
                                        @click="handleReply(comment)"
                                    >
                                        回复
                                    </button>
                                </div>

                                <div v-if="comment.replies?.length" class="reply-list">
                                    <article
                                        v-for="reply in comment.replies"
                                        :key="reply.id"
                                        class="reply-item"
                                    >
                                        <div class="reply-head">
                                            <div class="author-line">
                                                <strong>{{ getCommentAuthor(reply) }}</strong>
                                                <span
                                                    v-if="isPostAuthor(reply.author_id)"
                                                    class="identity-badge"
                                                >
                                                    楼主
                                                </span>
                                            </div>
                                            <span>
                                                {{
                                                    formatTime(reply.createdAt || reply.created_at)
                                                }}
                                            </span>
                                        </div>
                                        <div class="comment-content">
                                            <template v-if="reply.replyToUser">
                                                <em>
                                                    回复 @{{
                                                        reply.replyToUser.real_name ||
                                                        reply.replyToUser.username
                                                    }}
                                                </em>
                                                {{ reply.content }}
                                            </template>
                                            <template v-else>{{ reply.content }}</template>
                                        </div>
                                        <div class="comment-actions">
                                            <button
                                                type="button"
                                                class="minor-btn"
                                                :class="{ 'is-liked': likedComments.has(reply.id) }"
                                                @click="handleLikeComment(reply.id)"
                                            >
                                                点赞 {{ reply.likeCount || reply.like_count || 0 }}
                                            </button>
                                            <button
                                                type="button"
                                                class="minor-btn"
                                                @click="handleReply(reply)"
                                            >
                                                回复
                                            </button>
                                        </div>
                                    </article>
                                </div>
                            </div>
                        </article>
                    </div>

                    <div v-else class="empty-box">
                        <p>还没有评论</p>
                        <span>成为第一个回复的人</span>
                    </div>
                </section>
            </template>

            <div v-else class="state-box">
                <p>帖子不存在或已被删除</p>
                <NButton type="primary" round @click="router.back()">返回</NButton>
            </div>
        </main>

        <div v-if="previewingImage" class="preview-mask" @click="previewingImage = ''">
            <button type="button" class="preview-close" @click="previewingImage = ''">×</button>
            <img :src="previewingImage" alt="预览图片" />
        </div>

        <div v-if="showReportPostModal" class="preview-mask" @click.self="showReportPostModal = false">
            <div class="report-modal">
                <div class="section-head">
                    <h2>举报帖子</h2>
                    <button type="button" class="preview-close preview-close--static" @click="showReportPostModal = false">×</button>
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
                    <NButton type="warning" round :loading="submittingPostReport" @click="submitPostReport">
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
    background:
        radial-gradient(circle at top right, rgba(75, 184, 255, 0.08), transparent 28%),
        linear-gradient(180deg, #f4f7fb 0%, #edf2fa 100%);
    color: #172033;
}
.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #162336 100%);
    color: #e2e8f0;
}
.detail-nav {
    position: sticky;
    top: 0;
    z-index: 20;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(14px);
    border-bottom: 1px solid rgba(23, 32, 51, 0.06);
}
.is-dark .detail-nav {
    background: rgba(15, 23, 42, 0.88);
    border-color: rgba(255, 255, 255, 0.06);
}
.detail-nav h1 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
}
.icon-btn,
.nav-spacer {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    flex-shrink: 0;
}
.icon-btn {
    border: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #4a5d79;
}
.icon-btn--danger {
    color: #ef4444;
}
.detail-shell {
    max-width: 860px;
    margin: 0 auto;
    padding: 18px 16px 40px;
}
.state-box {
    min-height: 55vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    color: #738198;
}
.post-card,
.comments-card {
    background: rgba(255, 255, 255, 0.96);
    border-radius: 24px;
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.08);
}
.is-dark .post-card,
.is-dark .comments-card {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: none;
}
.post-card {
    padding: 22px;
}
.post-head,
.comment-head,
.reply-head,
.composer-actions,
.reply-banner,
.section-head,
.author-card,
.stats,
.comment-actions,
.author-line {
    display: flex;
    align-items: center;
}
.post-head,
.section-head,
.composer-actions,
.reply-banner {
    justify-content: space-between;
}
.post-head {
    gap: 12px;
    margin-bottom: 14px;
}
.chip-row,
.tags,
.stats,
.comment-actions {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}
.category-chip,
.status-chip,
.stat-pill,
.like-pill,
.tag,
.minor-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 999px;
    font-weight: 700;
}
.category-chip,
.status-chip {
    min-height: 34px;
    padding: 0 14px;
    font-size: 13px;
}
.category-chip {
    gap: 8px;
    background: #f1f5fb;
    color: #52627c;
}
.category-chip i {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: #2f6bff;
}
.category-chip[data-type='life'] i {
    background: #ff9b3d;
}
.category-chip[data-type='campus'] i {
    background: #19b36b;
}
.category-chip[data-type='task'] i {
    background: #4b6bff;
}
.category-chip[data-type='skill'] i {
    background: #4bb8ff;
}
.status-chip {
    background: #ddfce7;
    color: #179954;
}
.status-chip[data-status='pending_review'] {
    background: #fff4d6;
    color: #d97706;
}
.status-chip[data-status='draft'] {
    background: #eef2f7;
    color: #64748b;
}
.status-chip[data-status='rejected'],
.status-chip[data-status='hidden'] {
    background: #fee2e2;
    color: #dc2626;
}
.muted {
    font-size: 13px;
    color: #8a96aa;
}
.post-title {
    margin: 0;
    font-size: 34px;
    line-height: 1.28;
    font-weight: 800;
    letter-spacing: -0.02em;
}
.author-card {
    gap: 12px;
    margin: 20px 0 18px;
    padding: 14px 16px;
    border-radius: 18px;
    background: #f6f8fc;
}
.is-dark .author-card {
    background: rgba(255, 255, 255, 0.05);
}
.meta-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 10px;
    margin: 0 0 18px;
}
.meta-item {
    padding: 14px 12px;
    border-radius: 18px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}
.meta-item span {
    display: block;
    margin-bottom: 6px;
    font-size: 12px;
    color: #8a96aa;
}
.meta-item strong {
    font-size: 16px;
    color: #172033;
}
.is-dark .meta-item {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.06);
}
.is-dark .meta-item strong {
    color: #f8fafc;
}
.avatar {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    background: linear-gradient(135deg, #2f6bff, #77b5ff);
    color: #fff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    overflow: hidden;
    flex-shrink: 0;
}
.avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.avatar--self,
.avatar--comment {
    width: 44px;
    height: 44px;
}
.avatar--comment {
    background: linear-gradient(135deg, #dbeafe, #dbe7ff);
    color: #2f6bff;
}
.author-copy,
.comment-main {
    min-width: 0;
    flex: 1;
}
.author-copy strong {
    display: block;
    font-size: 15px;
    color: #172033;
}
.is-dark .author-copy strong {
    color: #f8fafc;
}
.author-copy span,
.comment-head span,
.reply-head span {
    display: block;
    font-size: 13px;
    color: #8a96aa;
}
.content-block {
    display: grid;
    gap: 14px;
}
.summary {
    margin: 0;
    padding: 16px 18px;
    border-radius: 18px;
    background: linear-gradient(90deg, rgba(47, 107, 255, 0.08), rgba(75, 184, 255, 0.04));
    border-left: 4px solid #2f6bff;
    font-size: 15px;
    line-height: 1.7;
    color: #44607f;
}
.content-text {
    font-size: 16px;
    line-height: 1.9;
    color: #334155;
    white-space: pre-wrap;
    word-break: break-word;
}
.is-dark .content-text,
.is-dark .comment-content {
    color: #d2deec;
}
.gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(124px, 1fr));
    gap: 12px;
    margin-top: 4px;
}
.gallery-item {
    aspect-ratio: 1;
    border: none;
    padding: 0;
    border-radius: 16px;
    overflow: hidden;
    background: #dbe7f7;
}
.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}
.tags {
    margin-top: 18px;
}
.tag {
    padding: 8px 14px;
    background: #f1f5fb;
    font-size: 13px;
    color: #607089;
}
.stats {
    gap: 14px;
    flex-wrap: wrap;
    margin-top: 22px;
    padding-top: 18px;
    border-top: 1px solid #e6edf7;
}
.stat-pill,
.like-pill {
    min-height: 40px;
    padding: 0 14px;
    font-size: 14px;
}
.stat-pill {
    background: #f6f8fc;
    color: #66758e;
}
.like-pill {
    margin-left: auto;
    border: none;
    background: #ffe4e6;
    color: #ef4444;
}
.report-pill {
    background: #fff4d6;
    color: #d97706;
}
.like-pill.is-liked {
    background: #ef4444;
    color: #fff;
}
.comments-card {
    margin-top: 18px;
    padding: 20px;
}
.section-head h2 {
    display: inline-flex;
    align-items: center;
    gap: 10px;
    margin: 0 0 16px;
    font-size: 22px;
    font-weight: 800;
}
.section-head span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 30px;
    height: 30px;
    padding: 0 10px;
    border-radius: 999px;
    background: #dbe6f5;
    color: #5a6b86;
    font-size: 14px;
}
.composer {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-radius: 20px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}
.composer-main {
    flex: 1;
}
.reply-banner {
    gap: 12px;
    margin-bottom: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    background: #eef4ff;
    color: #436388;
    font-size: 13px;
    font-weight: 600;
}
.reply-banner button {
    border: none;
    background: transparent;
    color: #2f6bff;
    font-size: 13px;
}
.composer-actions {
    gap: 12px;
    margin-top: 10px;
}
.composer-actions span {
    font-size: 12px;
    color: #8a96aa;
}
.comment-list {
    display: grid;
    gap: 14px;
    margin-top: 18px;
}
.comment-card {
    display: flex;
    gap: 12px;
    padding: 16px;
    border-radius: 20px;
    background: #fbfdff;
    border: 1px solid #e8eff8;
}
.comment-head,
.reply-head {
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
}
.author-line {
    gap: 8px;
}
.identity-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 22px;
    padding: 0 8px;
    border-radius: 999px;
    background: #e8f3ff;
    color: #2f6bff;
    font-size: 11px;
    font-weight: 700;
}
.comment-head strong {
    font-size: 15px;
}
.reply-head strong {
    font-size: 13px;
}
.comment-content {
    font-size: 14px;
    line-height: 1.75;
    color: #40516a;
    word-break: break-word;
}
.minor-btn {
    min-height: 32px;
    padding: 0 12px;
    border: none;
    background: #eef3fb;
    color: #6c7c95;
    font-size: 12px;
}
.minor-btn.is-liked {
    background: #ffe4e6;
    color: #ef4444;
}
.reply-list {
    display: grid;
    gap: 10px;
    margin-top: 14px;
    padding-left: 12px;
    border-left: 2px solid #dbe6f6;
}
.reply-item {
    padding: 12px 14px;
    border-radius: 16px;
    background: #f4f8fd;
}
.reply-item em {
    margin-right: 6px;
    color: #2f6bff;
    font-style: normal;
    font-weight: 700;
}
.empty-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 36px 20px;
    color: #8a96aa;
}
.empty-box p {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 700;
    color: #5e6f89;
}
.preview-mask {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(0, 0, 0, 0.88);
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
.report-modal__hint {
    margin: 0 0 14px;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
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
    .detail-shell {
        padding: 14px 12px 32px;
    }
    .post-card,
    .comments-card {
        border-radius: 20px;
    }
    .post-card {
        padding: 18px;
    }
    .post-title {
        font-size: 28px;
    }
    .meta-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .like-pill {
        margin-left: 0;
    }
    .composer,
    .comment-card {
        padding: 14px;
    }
    .composer-actions {
        flex-direction: column;
        align-items: stretch;
    }
}
</style>
