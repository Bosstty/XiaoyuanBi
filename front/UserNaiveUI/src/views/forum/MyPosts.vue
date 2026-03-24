<template>
    <div class="my-posts-page">
        <div class="page-header">
            <button type="button" class="back-btn" @click="router.back()">返回</button>
            <div>
                <h1>我的帖子</h1>
                <p>查看自己发布的论坛内容</p>
            </div>
        </div>

        <div class="toolbar">
            <NSelect
                v-model:value="status"
                :options="statusOptions"
                placeholder="筛选状态"
                @update:value="loadPosts"
            />
            <NButton type="primary" @click="router.push('/forum/create')">发布新帖</NButton>
        </div>

        <div v-if="loading" class="loading-wrap">
            <NSpin size="large" />
        </div>

        <div v-else-if="posts.length" class="post-list">
            <article v-for="post in posts" :key="post.id" class="post-card">
                <div class="post-top">
                    <div>
                        <h3>{{ post.title }}</h3>
                        <p>{{ formatTime(post.createdAt) }}</p>
                    </div>
                    <NTag :bordered="false" :type="statusTagType(post.status)">
                        {{ statusLabel(post.status) }}
                    </NTag>
                </div>

                <p class="summary">{{ post.summary || post.content }}</p>

                <div class="post-bottom">
                    <span>浏览 {{ post.viewCount || 0 }}</span>
                    <span>点赞 {{ post.likeCount || 0 }}</span>
                    <span>评论 {{ post.commentCount || 0 }}</span>
                </div>

                <div class="action-row">
                    <NButton secondary @click="router.push(`/forum/${post.id}`)">查看</NButton>
                    <NButton type="error" secondary @click="handleDelete(post.id)">删除</NButton>
                </div>
            </article>
        </div>

        <NEmpty v-else description="你还没有发布过帖子" />
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NEmpty, NSelect, NSpin, NTag, useDialog, useMessage } from 'naive-ui';
import type { ForumPost } from '@/types';
import { forumApi } from '@/api';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();

const loading = ref(false);
const posts = ref<ForumPost[]>([]);
const status = ref<'all' | 'published' | 'draft' | 'pending_review' | 'rejected' | 'hidden'>(
    'all'
);

const statusOptions = [
    { label: '全部', value: 'all' },
    { label: '已发布', value: 'published' },
    { label: '草稿', value: 'draft' },
    { label: '待审核', value: 'pending_review' },
    { label: '已拒绝', value: 'rejected' },
    { label: '已隐藏', value: 'hidden' },
];

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

const statusTagType = (value?: string) => {
    const map: Record<string, 'success' | 'warning' | 'error' | 'default'> = {
        published: 'success',
        draft: 'default',
        pending_review: 'warning',
        rejected: 'error',
        hidden: 'default',
    };
    return map[value || ''] || 'default';
};

const formatTime = (value?: string) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('zh-CN');
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
.my-posts-page {
    min-height: 100vh;
    padding: 18px 16px 28px;
    background: linear-gradient(180deg, #f6f8fc 0%, #eef4fb 100%);
}

.page-header {
    display: flex;
    align-items: flex-start;
    gap: 14px;
    margin-bottom: 16px;
}

.back-btn {
    min-width: 52px;
    height: 36px;
    border: none;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(23, 48, 79, 0.08);
}

.page-header h1 {
    margin: 0 0 6px;
    font-size: 26px;
    color: #17304f;
}

.page-header p {
    margin: 0;
    color: #718096;
    font-size: 13px;
}

.toolbar,
.post-top,
.post-bottom,
.action-row {
    display: flex;
    align-items: center;
}

.toolbar,
.post-top,
.post-bottom {
    justify-content: space-between;
}

.toolbar {
    gap: 12px;
    margin-bottom: 16px;
}

.toolbar :deep(.n-select) {
    flex: 1;
}

.post-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.post-card {
    padding: 18px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.08);
}

.post-top h3 {
    margin: 0 0 8px;
    color: #17304f;
    font-size: 18px;
}

.post-top p,
.summary,
.post-bottom {
    color: #6b7a90;
}

.post-top p {
    margin: 0;
    font-size: 12px;
}

.summary {
    margin: 14px 0;
    line-height: 1.7;
}

.post-bottom {
    font-size: 12px;
}

.action-row {
    gap: 10px;
    margin-top: 14px;
}

.action-row :deep(.n-button) {
    flex: 1;
    border-radius: 999px;
}

.loading-wrap {
    display: flex;
    justify-content: center;
    padding: 80px 0;
}
</style>
