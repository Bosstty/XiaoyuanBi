<template>
    <div class="forum-home" :class="{ 'is-dark': appStore.isDark }">
        <section class="hero-card">
            <div>
                <span class="hero-kicker">Campus Forum</span>
                <h1>校园论坛</h1>
                <p>浏览热门帖子、进入分类内容，或者直接发布新的讨论。</p>
            </div>
            <div class="hero-actions">
                <button
                    type="button"
                    class="hero-btn hero-btn--ghost"
                    @click="router.push('/forum/index')"
                >
                    进入列表
                </button>
                <button type="button" class="hero-btn" @click="router.push('/forum/create')">
                    发布帖子
                </button>
            </div>
        </section>

        <section class="section-block">
            <div class="section-head">
                <h2>论坛分类</h2>
                <button type="button" @click="router.push('/forum/my')">我的帖子</button>
            </div>
            <div class="section-list">
                <article
                    v-for="item in sections"
                    :key="item.value"
                    class="section-card"
                    @click="router.push(`/forum/index?category=${item.value}`)"
                >
                    <div class="section-icon" :style="{ background: item.tint }">
                        <NIcon :size="22">
                            <component :is="item.icon" />
                        </NIcon>
                    </div>
                    <div class="section-copy">
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.description }}</p>
                        <span>{{ item.count }} 个帖子</span>
                    </div>
                    <div class="section-arrow">
                        <NIcon :size="18"><ChevronForwardOutline /></NIcon>
                    </div>
                </article>
            </div>
        </section>

        <section class="section-block">
            <div class="section-head">
                <h2>热门帖子</h2>
                <button type="button" @click="router.push('/forum/index')">查看全部</button>
            </div>

            <div v-if="loading" class="loading-wrap">
                <NSpin size="large" />
            </div>

            <div v-else-if="hotPosts.length" class="hot-list">
                <article
                    v-for="post in hotPosts"
                    :key="post.id"
                    class="post-card"
                    @click="router.push(`/forum/${post.id}`)"
                >
                    <span class="post-category">{{ getCategoryLabel(post.category) }}</span>
                    <h3>{{ post.title }}</h3>
                    <p>{{ post.summary || sliceContent(post.content) }}</p>
                    <div class="post-footer">
                        <span>{{ getAuthorName(post) }}</span>
                        <span>浏览 {{ post.viewCount || post.view_count || 0 }}</span>
                        <span>点赞 {{ post.likeCount || post.like_count || 0 }}</span>
                    </div>
                </article>
            </div>

            <NEmpty v-else description="暂无热门帖子" />
        </section>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NEmpty, NIcon, NSpin, useMessage } from 'naive-ui';
import {
    BookOutline,
    BulbOutline,
    ChevronForwardOutline,
    LeafOutline,
    NewspaperOutline,
    PeopleOutline,
} from '@vicons/ionicons5';
import type { ForumPost } from '@/types';
import { forumApi } from '@/api';
import { useAppStore } from '@/stores';

const router = useRouter();
const message = useMessage();
const appStore = useAppStore();

const loading = ref(false);
const hotPosts = ref<ForumPost[]>([]);
const sections = ref([
    {
        value: 'academic',
        label: '学术交流',
        description: '辅导、笔记、论文、研究',
        count: 0,
        icon: BookOutline,
        tint: 'linear-gradient(135deg, #dbe7ff 0%, #c8ddff 100%)',
    },
    {
        value: 'life',
        label: '生活服务',
        description: '海报、LOGO、视频包装',
        count: 0,
        icon: BulbOutline,
        tint: 'linear-gradient(135deg, #ffefd9 0%, #ffe4b8 100%)',
    },
    {
        value: 'campus',
        label: '校园动态',
        description: '编程、网站、小程序、系统',
        count: 0,
        icon: NewspaperOutline,
        tint: 'linear-gradient(135deg, #daf1e9 0%, #c9e8f7 100%)',
    },
    {
        value: 'task',
        label: '任务互助',
        description: '文章、策划、翻译、简历优化',
        count: 0,
        icon: PeopleOutline,
        tint: 'linear-gradient(135deg, #e4e3ff 0%, #d7e7ff 100%)',
    },
    {
        value: 'skill',
        label: '技能分享',
        description: '跑腿、搬运、陪同、日常协助',
        count: 0,
        icon: LeafOutline,
        tint: 'linear-gradient(135deg, #def7f2 0%, #d9eef8 100%)',
    },
]);

const getCategoryLabel = (value?: string) => {
    return sections.value.find(section => section.value === value)?.label || '论坛';
};

const getAuthorName = (post: ForumPost) =>
    post.author?.real_name || post.author?.username || '匿名用户';

const sliceContent = (value?: string) => {
    if (!value) return '';
    return value.length > 88 ? `${value.slice(0, 88)}...` : value;
};

const loadForumOverview = async () => {
    loading.value = true;
    try {
        const [hotRes, statsRes] = await Promise.all([
            forumApi.getHotPosts({ limit: 6 }),
            forumApi.getCategoryStats(),
        ]);

        if (hotRes.success) {
            hotPosts.value = hotRes.data || [];
        }

        if (statsRes.success) {
            const statsMap = Object.fromEntries(
                (statsRes.data?.stats || []).map(item => [item.category, item.count])
            );

            sections.value = sections.value.map(section => ({
                ...section,
                count: Number(statsMap[section.value] || 0),
            }));
        }

        if (!hotRes.success && !statsRes.success) {
            throw new Error(hotRes.message || statsRes.message || '获取论坛数据失败');
        }
    } catch (error: any) {
        message.error(error?.message || '获取论坛数据失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    void loadForumOverview();
});
</script>

<style scoped>
.forum-home {
    min-height: 100%;
    padding: 18px 16px calc(96px + var(--safe-area-bottom, 0px));
    background:
        radial-gradient(circle at top left, rgba(255, 155, 61, 0.16), transparent 24%),
        linear-gradient(180deg, #f6f8fc 0%, #eef4fb 100%);
}

.forum-home.is-dark {
    background:
        radial-gradient(circle at top left, rgba(59, 130, 246, 0.14), transparent 24%),
        linear-gradient(180deg, #0f172a 0%, #111827 100%);
    color: #e2e8f0;
}

.hero-card,
.section-card,
.post-card {
    background: rgba(255, 255, 255, 0.96);
    box-shadow: 0 16px 40px rgba(23, 48, 79, 0.08);
}

.hero-card {
    padding: 24px;
    border-radius: 30px;
    background: linear-gradient(135deg, #17304f 0%, #355f95 55%, #ff9b3d 100%);
    color: #fff;
}

.hero-kicker {
    display: inline-block;
    margin-bottom: 10px;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
}

.hero-card h1 {
    margin: 0 0 10px;
    font-size: 30px;
}

.hero-card p {
    margin: 0;
    max-width: 420px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.92);
}

.hero-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
}

.hero-btn {
    flex: 1;
    min-width: 0;
    height: 42px;
    border: none;
    border-radius: 999px;
    background: #fff;
    color: #17304f;
    font-weight: 700;
}

.hero-btn--ghost {
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
    border: 1px solid rgba(255, 255, 255, 0.22);
}

.section-block {
    margin-top: 24px;
}

.section-head,
.post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.section-head {
    margin-bottom: 14px;
    padding: 0 2px;
}

.section-head h2 {
    margin: 0;
    color: #17304f;
    font-size: 20px;
}

.section-head button {
    border: none;
    background: transparent;
    color: #7f6a54;
}

.section-list,
.hot-list {
    display: grid;
    gap: 12px;
}

.section-card,
.post-card {
    border-radius: 24px;
}

.section-card {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 20px 16px;
}

.section-icon {
    width: 48px;
    height: 48px;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 16px;
    color: #17304f;
}

.section-copy {
    flex: 1;
    min-width: 0;
}

.section-copy strong,
.post-card h3 {
    color: #17304f;
}

.section-copy strong {
    display: block;
    margin-bottom: 6px;
    font-size: 16px;
    font-weight: 800;
}

.section-copy p,
.post-card p,
.post-footer,
.section-copy span {
    color: #66758b;
}

.section-copy p {
    margin: 0 0 8px;
    line-height: 1.6;
    font-size: 13px;
}

.section-copy span {
    font-size: 12px;
    color: #5f83c3;
}

.section-arrow {
    flex-shrink: 0;
    color: #94a9ca;
}

.post-card {
    padding: 18px;
}

.post-category {
    display: inline-flex;
    margin-bottom: 10px;
    padding: 5px 10px;
    border-radius: 999px;
    background: #eef4ff;
    color: #2f6bff;
    font-size: 12px;
    font-weight: 600;
}

.post-card h3 {
    margin: 0 0 8px;
    font-size: 18px;
}

.post-card p {
    margin: 0;
    line-height: 1.7;
}

.post-footer {
    margin-top: 14px;
    font-size: 12px;
}

.loading-wrap {
    display: flex;
    justify-content: center;
    padding: 64px 0;
}

.forum-home.is-dark .section-card,
.forum-home.is-dark .post-card {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: 0 16px 36px rgba(2, 6, 23, 0.28);
}

.forum-home.is-dark .section-head h2,
.forum-home.is-dark .section-copy strong,
.forum-home.is-dark .post-card h3 {
    color: #f8fafc;
}

.forum-home.is-dark .section-head button,
.forum-home.is-dark .section-copy p,
.forum-home.is-dark .post-card p,
.forum-home.is-dark .post-footer {
    color: #94a3b8;
}

.forum-home.is-dark .section-copy span {
    color: #93c5fd;
}

.forum-home.is-dark .section-arrow {
    color: #64748b;
}

.forum-home.is-dark .post-category {
    background: rgba(37, 99, 235, 0.18);
    color: #93c5fd;
}

.forum-home.is-dark :deep(.n-empty-description) {
    color: #94a3b8;
}
</style>
