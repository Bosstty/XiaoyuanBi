<template>
    <div class="forum-page">
        <!-- 页面头部 -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="page-title">校园论坛</h1>
                <p class="page-subtitle">分享交流，畅所欲言</p>
            </div>
            <NButton circle class="create-btn" type="primary" @click="router.push('/forum/create')">
                <template #icon>
                    <NIcon size="20"><AddOutline /></NIcon>
                </template>
            </NButton>
        </div>

        <!-- 板块标签 -->
        <div class="section-tabs">
            <div class="tabs-scroll hide-scrollbar">
                <div
                    v-for="section in sections"
                    :key="section.id"
                    class="tab-item"
                    :class="{ active: currentSection === section.id }"
                    @click="handleSectionChange(section.id)"
                >
                    <div class="tab-icon" :style="{ background: section.gradient }">
                        <NIcon :size="14" color="white">
                            <component :is="section.icon" />
                        </NIcon>
                    </div>
                    <span class="tab-label">{{ section.name }}</span>
                </div>
            </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
            <NInput
                v-model:value="searchQuery"
                placeholder="搜索帖子..."
                size="large"
                clearable
                round
            >
                <template #prefix>
                    <NIcon><SearchOutline /></NIcon>
                </template>
            </NInput>
        </div>

        <!-- 帖子列表 -->
        <div class="posts-container">
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
            </div>

            <div v-else-if="filteredPosts.length > 0" class="posts-list">
                <div
                    v-for="(post, index) in filteredPosts"
                    :key="post.id"
                    class="post-card ios-card"
                    :style="{ animationDelay: `${index * 60}ms` }"
                    @click="handlePostClick(post)"
                >
                    <!-- 帖子头部 -->
                    <div class="card-header">
                        <div class="author-info">
                            <NAvatar :size="36" round :src="post.author.avatar" />
                            <div class="author-detail">
                                <span class="author-name">{{ post.author.name }}</span>
                                <span class="post-time">{{ formatTime(post.createdAt) }}</span>
                            </div>
                        </div>
                        <div class="post-badges">
                            <NTag v-if="post.isTop" type="warning" size="small" :bordered="false">置顶</NTag>
                            <NTag v-if="post.isHot" type="error" size="small" :bordered="false">热门</NTag>
                        </div>
                    </div>

                    <!-- 帖子内容 -->
                    <div class="card-body">
                        <h3 class="post-title">{{ post.title }}</h3>
                        <p class="post-excerpt">{{ post.excerpt }}</p>

                        <!-- 帖子图片 -->
                        <div v-if="post.images && post.images.length > 0" class="post-images">
                            <div
                                v-for="(img, idx) in post.images.slice(0, 3)"
                                :key="idx"
                                class="post-image"
                                :class="{ 'single': post.images.length === 1 }"
                            >
                                <img :src="img" alt="" />
                            </div>
                            <div v-if="post.images.length > 3" class="more-images">
                                +{{ post.images.length - 3 }}
                            </div>
                        </div>

                        <!-- 帖子话题 -->
                        <div v-if="post.tags && post.tags.length > 0" class="post-tags">
                            <span v-for="tag in post.tags" :key="tag" class="tag-item">#{{ tag }}</span>
                        </div>
                    </div>

                    <!-- 帖子底部 -->
                    <div class="card-footer">
                        <div class="section-badge" :style="{ color: getSectionColor(post.sectionId) }">
                            <NIcon :size="12">
                                <component :is="getSectionIcon(post.sectionId)" />
                            </NIcon>
                            <span>{{ getSectionName(post.sectionId) }}</span>
                        </div>
                        <div class="post-stats">
                            <div class="stat-item">
                                <NIcon :size="14"><EyeOutline /></NIcon>
                                <span>{{ post.views }}</span>
                            </div>
                            <div class="stat-item">
                                <NIcon :size="14"><ChatbubbleOutline /></NIcon>
                                <span>{{ post.replies }}</span>
                            </div>
                            <div class="stat-item">
                                <NIcon :size="14" :class="{ 'liked': post.isLiked }"><HeartOutline /></NIcon>
                                <span :class="{ 'liked': post.isLiked }">{{ post.likes }}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="24" r="8" fill="var(--ios-gray4)"/>
                        <path d="M16 48c0-8.837 7.163-16 16-16s16 7.163 16 16" fill="var(--ios-gray4)"/>
                    </svg>
                </div>
                <h4 class="empty-title">暂无帖子</h4>
                <p class="empty-desc">快来发布第一个帖子吧</p>
                <NButton type="primary" @click="router.push('/forum/create')">
                    发布帖子
                </NButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, NIcon, NTag, NAvatar, NSpin } from 'naive-ui';
import {
    SearchOutline,
    AddOutline,
    EyeOutline,
    ChatbubbleOutline,
    HeartOutline,
    BookOutline,
    LeafOutline,
    NewspaperOutline,
    PeopleOutline,
    BulbOutline,
    ChatbubblesOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();

// 状态
const searchQuery = ref('');
const currentSection = ref('all');
const loading = ref(false);

// 板块数据
const sections = ref([
    { id: 'all', name: '全部', icon: markRaw(ChatbubblesOutline), gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' },
    { id: 'academic', name: '学术交流', icon: markRaw(BookOutline), gradient: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' },
    { id: 'life', name: '生活服务', icon: markRaw(LeafOutline), gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' },
    { id: 'news', name: '校园动态', icon: markRaw(NewspaperOutline), gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)' },
    { id: 'market', name: '二手市场', icon: markRaw(PeopleOutline), gradient: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)' },
    { id: 'skills', name: '技能分享', icon: markRaw(BulbOutline), gradient: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)' },
]);

// 模拟帖子数据
const posts = ref([
    {
        id: 1,
        sectionId: 'academic',
        title: '期末高数复习资料分享',
        excerpt: '整理了一些高数复习资料，希望对大家有帮助...',
        author: { name: '学习达人', avatar: '' },
        views: 234,
        replies: 45,
        likes: 89,
        isLiked: false,
        isTop: true,
        isHot: false,
        isGood: true,
        tags: ['高数', '复习资料', '期末'],
        images: [],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
        id: 2,
        sectionId: 'life',
        title: '校园食堂美食推荐',
        excerpt: '强烈推荐二食堂的烤盘饭，味道超级棒！',
        author: { name: '美食探索者', avatar: '' },
        views: 567,
        replies: 123,
        likes: 234,
        isLiked: true,
        isTop: false,
        isHot: true,
        isGood: false,
        tags: ['美食', '食堂推荐'],
        images: [],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
    },
    {
        id: 3,
        sectionId: 'news',
        title: '校园马拉松活动报名',
        excerpt: '第一届校园马拉松开始报名了，大家快来参加！',
        author: { name: '体育部', avatar: '' },
        views: 890,
        replies: 67,
        likes: 156,
        isLiked: false,
        isTop: false,
        isHot: true,
        isGood: false,
        tags: ['体育', '马拉松', '活动'],
        images: [],
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
        id: 4,
        sectionId: 'market',
        title: '出二手电动车',
        excerpt: '毕业季出电动车，续航能力强，证件齐全',
        author: { name: '毕业学长', avatar: '' },
        views: 345,
        replies: 23,
        likes: 45,
        isLiked: false,
        isTop: false,
        isHot: false,
        isGood: false,
        tags: ['二手', '电动车', '毕业'],
        images: [],
        createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
        id: 5,
        sectionId: 'skills',
        title: 'Python入门学习资源',
        excerpt: '分享一些适合初学者的Python学习资源...',
        author: { name: '程序小新手', avatar: '' },
        views: 456,
        replies: 78,
        likes: 167,
        isLiked: false,
        isTop: false,
        isHot: false,
        isGood: true,
        tags: ['Python', '学习', '编程'],
        images: [],
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
]);

// 筛选帖子
const filteredPosts = computed(() => {
    let result = posts.value;

    if (currentSection.value !== 'all') {
        result = result.filter(p => p.sectionId === currentSection.value);
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.excerpt.toLowerCase().includes(query) ||
            p.tags?.some((t: string) => t.toLowerCase().includes(query))
        );
    }

    return result;
});

// 获取板块图标
const getSectionIcon = (sectionId: string) => {
    const map: Record<string, any> = {
        academic: BookOutline,
        life: LeafOutline,
        news: NewspaperOutline,
        market: PeopleOutline,
        skills: BulbOutline,
    };
    return map[sectionId] || ChatbubblesOutline;
};

// 获取板块颜色
const getSectionColor = (sectionId: string) => {
    const map: Record<string, string> = {
        academic: '#007AFF',
        life: '#34C759',
        news: '#FF9500',
        market: '#AF52DE',
        skills: '#5AC8FA',
    };
    return map[sectionId] || '#007AFF';
};

// 获取板块名称
const getSectionName = (sectionId: string) => {
    const map: Record<string, string> = {
        academic: '学术交流',
        life: '生活服务',
        news: '校园动态',
        market: '二手市场',
        skills: '技能分享',
    };
    return map[sectionId] || '论坛';
};

// 格式化时间
const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
};

// 切换板块
const handleSectionChange = (id: string) => {
    currentSection.value = id;
    appStore.hapticFeedback('light');
};

// 点击帖子
const handlePostClick = (post: any) => {
    appStore.hapticFeedback('light');
    router.push(`/forum/${post.id}`);
};

// 加载数据
onMounted(() => {
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
    }, 500);
});
</script>

<style scoped>
.forum-page {
    min-height: 100vh;
    background: var(--ios-bg-secondary);
    padding-bottom: 100px;
}

/* 页面头部 */
.page-header {
    background: linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%);
    padding: 52px 16px 24px;
    border-radius: 0 0 24px 24px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
}

.dark .page-header {
    background: linear-gradient(135deg, #BF5AF2 0%, #FF375F 100%);
}

.header-content {
    flex: 1;
}

.page-title {
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
}

.page-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
}

.create-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
}

/* 板块标签 */
.section-tabs {
    margin-top: -16px;
    padding: 0 16px;
    position: relative;
    z-index: 10;
}

.tabs-scroll {
    display: flex;
    gap: 8px;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--ios-bg-primary);
    border-radius: 20px;
    box-shadow: var(--ios-shadow-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.96);
}

.tab-item.active {
    background: #AF52DE;
    box-shadow: 0 4px 12px rgba(175, 82, 222, 0.3);
}

.tab-item.active .tab-label {
    color: white;
}

.tab-icon {
    width: 20px;
    height: 20px;
    border-radius: 5px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tab-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--ios-text-primary);
}

/* 搜索栏 */
.search-bar {
    padding: 16px;
}

/* 帖子列表 */
.posts-container {
    padding: 0 16px;
}

.posts-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.post-card {
    padding: 0;
    animation: ios-fade-in 0.4s ease-out backwards;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 14px 16px 0;
}

.author-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.author-detail {
    display: flex;
    flex-direction: column;
}

.author-name {
    font-size: 14px;
    font-weight: 600;
    color: var(--ios-text-primary);
}

.post-time {
    font-size: 12px;
    color: var(--ios-text-tertiary);
}

.post-badges {
    display: flex;
    gap: 6px;
}

.card-body {
    padding: 12px 16px;
}

.post-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ios-text-primary);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.post-excerpt {
    font-size: 14px;
    color: var(--ios-text-secondary);
    margin: 0 0 12px 0;
    line-height: 1.5;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.post-images {
    display: flex;
    gap: 6px;
    margin-bottom: 12px;
}

.post-image {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
}

.post-image.single {
    width: 160px;
    height: 120px;
}

.post-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.more-images {
    width: 80px;
    height: 80px;
    border-radius: 8px;
    background: var(--ios-gray4);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 500;
    color: var(--ios-text-secondary);
}

.post-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

.tag-item {
    font-size: 12px;
    color: var(--ios-blue);
    background: rgba(0, 122, 255, 0.1);
    padding: 4px 8px;
    border-radius: 4px;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 16px;
    border-top: 0.5px solid var(--ios-divider);
}

.section-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    font-weight: 500;
}

.post-stats {
    display: flex;
    gap: 16px;
}

.stat-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ios-text-tertiary);
}

.stat-item .liked {
    color: #FF2D92;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-icon {
    margin-bottom: 20px;
}

.empty-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--ios-text-primary);
    margin: 0 0 8px 0;
}

.empty-desc {
    font-size: 14px;
    color: var(--ios-text-tertiary);
    margin: 0 0 24px 0;
}

/* 加载状态 */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 60px 0;
}

/* 动画 */
@keyframes ios-fade-in {
    from {
        opacity: 0;
        transform: translateY(16px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 小屏优化 */
@media (max-width: 375px) {
    .page-title {
        font-size: 24px;
    }

    .tab-item {
        padding: 6px 12px;
    }

    .tab-label {
        font-size: 12px;
    }
}
</style>
