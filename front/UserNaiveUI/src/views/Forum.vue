<template>
    <div class="forum-page">
        <!-- 顶部横幅 -->
        <div class="forum-header">
            <MobileCard class="header-card" :padding="'20px'">
                <div class="header-content">
                    <div class="header-icon">
                        <NIcon size="48" color="var(--n-primary-color)">
                            <ForumIcon />
                        </NIcon>
                    </div>
                    <h1 class="header-title">校园论坛</h1>
                    <p class="header-desc">学术交流 · 生活分享 · 技能互助</p>
                </div>
            </MobileCard>
        </div>

        <!-- 论坛分区 -->
        <div class="forum-sections">
            <h3 class="section-title">热门板块</h3>
            <div class="sections-grid">
                <div
                    v-for="section in forumSections"
                    :key="section.id"
                    class="section-card"
                    @click="handleSectionClick(section)"
                >
                    <MobileCard class="section-content" :hoverable="true">
                        <div class="section-icon" :style="{ backgroundColor: section.color + '20' }">
                            <NIcon size="24" :color="section.color">
                                <component :is="section.icon" />
                            </NIcon>
                        </div>
                        <h4 class="section-name">{{ section.name }}</h4>
                        <p class="section-desc">{{ section.description }}</p>
                        <div class="section-stats">
                            <span class="post-count">{{ section.postCount }}帖</span>
                            <span class="member-count">{{ section.memberCount }}人</span>
                        </div>
                    </MobileCard>
                </div>
            </div>
        </div>

        <!-- 热门帖子 -->
        <div class="hot-posts">
            <div class="section-header">
                <h3 class="section-title">热门讨论</h3>
                <NButton text type="primary" @click="router.push('/forum/index')">
                    查看全部
                </NButton>
            </div>

            <div v-if="hotPosts.length > 0">
                <div
                    v-for="post in hotPosts"
                    :key="post.id"
                    class="post-item"
                    @click="handlePostClick(post)"
                >
                    <MobileCard :hoverable="true">
                        <div class="post-content">
                            <!-- 帖子头部 -->
                            <div class="post-header">
                                <div class="post-category">
                                    <NIcon size="16" :color="getSectionColor(post.sectionId)">
                                        <component :is="getSectionIcon(post.sectionId)" />
                                    </NIcon>
                                    <span class="category-label">{{ getSectionName(post.sectionId) }}</span>
                                </div>
                                <div class="post-status">
                                    <NTag v-if="post.isTop" type="warning" size="small">置顶</NTag>
                                    <NTag v-if="post.isHot" type="error" size="small">热门</NTag>
                                </div>
                            </div>

                            <!-- 帖子信息 -->
                            <div class="post-info">
                                <h4 class="post-title">{{ post.title }}</h4>
                                <p class="post-excerpt">{{ post.excerpt }}</p>

                                <div class="post-meta">
                                    <div class="author-info">
                                        <img :src="post.author.avatar || '/default-avatar.png'" :alt="post.author.name" class="author-avatar" />
                                        <span class="author-name">{{ post.author.name }}</span>
                                    </div>
                                    <div class="meta-stats">
                                        <div class="meta-item">
                                            <NIcon size="12">
                                                <EyeIcon />
                                            </NIcon>
                                            <span>{{ post.views }}</span>
                                        </div>
                                        <div class="meta-item">
                                            <NIcon size="12">
                                                <ChatIcon />
                                            </NIcon>
                                            <span>{{ post.replies }}</span>
                                        </div>
                                        <div class="meta-item">
                                            <NIcon size="12">
                                                <HeartIcon />
                                            </NIcon>
                                            <span>{{ post.likes }}</span>
                                        </div>
                                    </div>
                                </div>

                                <div class="post-time">
                                    {{ formatTime(post.createdAt) }}
                                </div>
                            </div>
                        </div>
                    </MobileCard>
                </div>
            </div>
            <div v-else>
                <MobileEmpty
                    type="data"
                    title="暂无热门讨论"
                    description="当前没有热门帖子，快来发布第一个吧"
                    :show-action="true"
                    action-text="发布帖子"
                    @action="router.push('/forum/create')"
                />
            </div>
        </div>

        <!-- 论坛统计 -->
        <div class="forum-stats">
            <h3 class="section-title">论坛数据</h3>
            <MobileCard>
                <div class="stats-grid">
                    <div v-for="stat in forumStats" :key="stat.key" class="stat-item">
                        <div class="stat-value" :style="{ color: stat.color }">{{ stat.value }}</div>
                        <div class="stat-label">{{ stat.label }}</div>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 最新动态 -->
        <div class="recent-activity">
            <h3 class="section-title">最新动态</h3>
            <div v-if="recentActivities.length > 0">
                <MobileList
                    :items="recentActivities"
                    :show-border="true"
                    :show-divider="true"
                    @item-click="handleActivityClick"
                />
            </div>
            <div v-else>
                <MobileEmpty
                    type="data"
                    title="暂无最新动态"
                    description="论坛暂时比较安静"
                />
            </div>
        </div>

        <!-- 悬浮按钮 -->
        <div class="floating-buttons">
            <NButton
                type="primary"
                size="large"
                circle
                class="fab"
                @click="router.push('/forum/create')"
            >
                <template #icon>
                    <NIcon size="24">
                        <AddIcon />
                    </NIcon>
                </template>
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NButton, NTag, useMessage } from 'naive-ui';
import {
    ChatbubblesOutline as ForumIcon,
    SchoolOutline as StudyIcon,
    BagHandleOutline as LifeIcon,
    NewspaperOutline as NewsIcon,
    BulbOutline as ShareIcon,
    CodeSlashOutline as TechIcon,
    EyeOutline as EyeIcon,
    ChatbubbleOutline as ChatIcon,
    HeartOutline as HeartIcon,
    AddOutline as AddIcon,
} from '@vicons/ionicons5';
import { MobileCard, MobileList, MobileEmpty } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 论坛板块
const forumSections = [
    {
        id: 1,
        name: '学术交流',
        description: '课程讨论、学习心得',
        icon: StudyIcon,
        color: 'var(--n-primary-color)',
        route: '/forum/index?section=academic',
        postCount: 1248,
        memberCount: 892,
    },
    {
        id: 2,
        name: '生活服务',
        description: '二手交易、失物招领',
        icon: LifeIcon,
        color: 'var(--n-warning-color)',
        route: '/forum/index?section=life',
        postCount: 856,
        memberCount: 1156,
    },
    {
        id: 3,
        name: '校园动态',
        description: '新闻公告、活动信息',
        icon: NewsIcon,
        color: 'var(--n-info-color)',
        route: '/forum/index?section=news',
        postCount: 432,
        memberCount: 2341,
    },
    {
        id: 4,
        name: '技能分享',
        description: '技术交流、经验分享',
        icon: TechIcon,
        color: 'var(--n-success-color)',
        route: '/forum/index?section=tech',
        postCount: 674,
        memberCount: 587,
    },
    {
        id: 5,
        name: '创意分享',
        description: '创意作品、灵感交流',
        icon: ShareIcon,
        color: 'var(--n-error-color)',
        route: '/forum/index?section=creative',
        postCount: 298,
        memberCount: 423,
    },
];

// 热门帖子数据
const hotPosts = ref([
    {
        id: 1,
        sectionId: 1,
        title: '如何高效学习高等数学？',
        excerpt: '分享一些学习高数的方法和技巧，包括理解概念、练习题目、总结规律等方面的经验...',
        views: 1248,
        replies: 89,
        likes: 156,
        isTop: true,
        isHot: true,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        author: {
            id: 1,
            name: '数学小王子',
            avatar: '',
        },
    },
    {
        id: 2,
        sectionId: 2,
        title: '出售二手自行车，九成新',
        excerpt: '因为即将毕业，出售一辆九成新的山地自行车，骑行体验良好，价格优惠...',
        views: 567,
        replies: 23,
        likes: 45,
        isTop: false,
        isHot: true,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        author: {
            id: 2,
            name: '骑行达人',
            avatar: '',
        },
    },
    {
        id: 3,
        sectionId: 4,
        title: 'Vue3 + TypeScript 项目搭建经验分享',
        excerpt: '最近用Vue3和TypeScript搭建了一个项目，踩了不少坑，分享一些经验给大家...',
        views: 892,
        replies: 67,
        likes: 123,
        isTop: false,
        isHot: true,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        author: {
            id: 3,
            name: '前端小李',
            avatar: '',
        },
    },
]);

// 论坛统计数据
const forumStats = ref([
    {
        key: 'posts',
        label: '总帖数',
        value: '3.2k',
        color: 'var(--n-primary-color)',
    },
    {
        key: 'members',
        label: '活跃用户',
        value: '1.8k',
        color: 'var(--n-success-color)',
    },
    {
        key: 'today',
        label: '今日发帖',
        value: '89',
        color: 'var(--n-warning-color)',
    },
    {
        key: 'online',
        label: '在线用户',
        value: '234',
        color: 'var(--n-info-color)',
    },
]);

// 最近动态数据
const recentActivities = ref([
    {
        id: 1,
        title: '张同学 发布了新帖子',
        description: '《期末复习资料分享》',
        extra: '5分钟前',
        icon: ForumIcon,
        iconColor: 'var(--n-primary-color)',
        showArrow: true,
    },
    {
        id: 2,
        title: '李社长 回复了帖子',
        description: '《社团活动策划讨论》',
        extra: '15分钟前',
        icon: ChatIcon,
        iconColor: 'var(--n-success-color)',
        showArrow: true,
    },
    {
        id: 3,
        title: '王老师 置顶了帖子',
        description: '《重要通知：期末考试安排》',
        extra: '1小时前',
        icon: NewsIcon,
        iconColor: 'var(--n-warning-color)',
        showArrow: true,
    },
]);

// 方法
const getSectionIcon = (sectionId: number) => {
    const section = forumSections.find(s => s.id === sectionId);
    return section?.icon || ForumIcon;
};

const getSectionColor = (sectionId: number) => {
    const section = forumSections.find(s => s.id === sectionId);
    return section?.color || 'var(--n-primary-color)';
};

const getSectionName = (sectionId: number) => {
    const section = forumSections.find(s => s.id === sectionId);
    return section?.name || '其他';
};

const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
        return '刚刚';
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else {
        return date.toLocaleDateString();
    }
};

// 处理点击事件
const handleSectionClick = (section: any) => {
    appStore.hapticFeedback('light');
    router.push(section.route);
};

const handlePostClick = (post: any) => {
    appStore.hapticFeedback('light');
    router.push(`/forum/post/${post.id}`);
};

const handleActivityClick = (activity: any) => {
    appStore.hapticFeedback('light');
    // 根据活动类型跳转到相应页面
    console.log('活动点击:', activity);
};

// 获取数据
const fetchData = async () => {
    try {
        // 这里应该调用API获取真实数据
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
        console.error('获取数据失败:', error);
    }
};

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.forum-page {
    padding: 16px;
    padding-bottom: 100px;
    min-height: 100vh;
    background: var(--n-body-color);
}

/* 顶部横幅 */
.forum-header {
    margin-bottom: 24px;
}

.header-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.header-icon {
    margin-bottom: 8px;
}

.header-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--n-text-color-1);
    margin: 0;
}

.header-desc {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0;
}

/* 区块标题 */
.section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 16px 0;
    padding: 0 4px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

/* 论坛分区 */
.forum-sections {
    margin-bottom: 32px;
}

.sections-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.section-card {
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.section-card:active {
    transform: scale(0.95);
}

.section-content {
    text-align: center;
    padding: 20px 16px;
}

.section-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
}

.section-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.section-desc {
    font-size: 13px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
}

.section-stats {
    display: flex;
    justify-content: center;
    gap: 12px;
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 热门帖子 */
.hot-posts {
    margin-bottom: 32px;
}

.post-item {
    margin-bottom: 12px;
    cursor: pointer;
}

.post-item:last-child {
    margin-bottom: 0;
}

.post-content {
    padding: 4px;
}

/* 帖子头部 */
.post-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.post-category {
    display: flex;
    align-items: center;
    gap: 6px;
}

.category-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

.post-status {
    display: flex;
    gap: 6px;
}

/* 帖子信息 */
.post-info {
    margin-bottom: 8px;
}

.post-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 6px 0;
    line-height: 1.3;
}

.post-excerpt {
    font-size: 13px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.post-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.author-info {
    display: flex;
    align-items: center;
    gap: 6px;
}

.author-avatar {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    object-fit: cover;
}

.author-name {
    font-size: 12px;
    color: var(--n-text-color-2);
    font-weight: 500;
}

.meta-stats {
    display: flex;
    gap: 12px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    color: var(--n-text-color-3);
}

.post-time {
    font-size: 11px;
    color: var(--n-text-color-3);
    text-align: right;
}

/* 论坛统计 */
.forum-stats {
    margin-bottom: 32px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 4px;
}

.stat-item {
    text-align: center;
    padding: 16px 8px;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    font-weight: 500;
}

/* 最近活动 */
.recent-activity {
    margin-bottom: 32px;
}

/* 悬浮按钮 */
.floating-buttons {
    position: fixed;
    bottom: 100px;
    right: 20px;
    z-index: 100;
}

.fab {
    width: 56px;
    height: 56px;
    box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .forum-page {
        padding: 12px;
        padding-bottom: 100px;
    }

    .sections-grid {
        gap: 8px;
    }

    .section-content {
        padding: 16px 12px;
    }

    .section-icon {
        width: 40px;
        height: 40px;
    }

    .section-name {
        font-size: 14px;
    }

    .section-desc {
        font-size: 12px;
    }

    .header-title {
        font-size: 20px;
    }

    .section-title {
        font-size: 16px;
    }

    .stats-grid {
        gap: 16px;
    }

    .stat-value {
        font-size: 20px;
    }

    .floating-buttons {
        bottom: 95px;
        right: 16px;
    }

    .fab {
        width: 48px;
        height: 48px;
    }

    .post-meta {
        flex-direction: column;
        align-items: flex-start;
        gap: 6px;
    }

    .meta-stats {
        gap: 8px;
    }
}

/* iOS 安全区域适配 */
.forum-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

.floating-buttons.is-ios {
    bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.forum-page {
    animation: ios-fade-in 0.4s ease-out;
}

.forum-header,
.forum-sections,
.hot-posts,
.forum-stats,
.recent-activity {
    animation: ios-fade-in 0.6s ease-out;
}

.forum-sections {
    animation-delay: 0.1s;
}

.hot-posts {
    animation-delay: 0.2s;
}

.forum-stats {
    animation-delay: 0.3s;
}

.recent-activity {
    animation-delay: 0.4s;
}

/* 深色模式优化 */
.dark-theme .section-card:active .section-content {
    background: var(--ios-dark-gray4);
}

.light-theme .section-card:active .section-content {
    background: var(--ios-gray5);
}

/* 卡片悬停效果 */
.post-item .mobile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.dark-theme .post-item .mobile-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
</style>