<template>
    <div class="campus-forum">
        <section class="campus-forum__hero">
            <div>
                <span>Campus Content Feed</span>
                <h1>校园论坛</h1>
                <p>承接校园动态、经验分享、服务信息和技能文章，让内容成为交易与互助的补充场。</p>
            </div>
            <button type="button" class="campus-forum__hero-btn touch-feedback" @click="go('/forum/create')">
                发帖子
            </button>
        </section>

        <section class="campus-forum__section">
            <div class="campus-forum__section-head">
                <h3>热门板块</h3>
                <button type="button" @click="go('/forum/index')">全部内容</button>
            </div>
            <div class="campus-forum__section-grid">
                <article
                    v-for="section in forumSections"
                    :key="section.id"
                    class="campus-forum__section-card touch-feedback"
                    @click="go(section.route)"
                >
                    <div class="campus-forum__section-icon" :style="{ background: section.tint }">
                        <NIcon :size="20"><component :is="section.icon" /></NIcon>
                    </div>
                    <h4>{{ section.name }}</h4>
                    <p>{{ section.description }}</p>
                    <span>{{ section.postCount }} 帖 · {{ section.memberCount }} 人关注</span>
                </article>
            </div>
        </section>

        <section class="campus-forum__section">
            <div class="campus-forum__section-head">
                <h3>精选文章</h3>
            </div>
            <div class="campus-forum__post-list">
                <article
                    v-for="post in hotPosts"
                    :key="post.id"
                    class="campus-forum__post-card touch-feedback"
                    @click="go(`/forum/post/${post.id}`)"
                >
                    <div class="campus-forum__post-top">
                        <div class="campus-forum__post-tag">
                            <NIcon :size="16"><component :is="getSectionIcon(post.sectionId)" /></NIcon>
                            <span>{{ getSectionName(post.sectionId) }}</span>
                        </div>
                        <div class="campus-forum__badge-group">
                            <NTag v-if="post.isTop" size="small" type="warning" :bordered="false">置顶</NTag>
                            <NTag v-if="post.isHot" size="small" type="error" :bordered="false">热门</NTag>
                        </div>
                    </div>
                    <h4>{{ post.title }}</h4>
                    <p>{{ post.excerpt }}</p>
                    <div class="campus-forum__post-footer">
                        <div class="campus-forum__author">
                            <div class="campus-forum__author-avatar">{{ post.author.name.slice(0, 1) }}</div>
                            <span>{{ post.author.name }}</span>
                        </div>
                        <div class="campus-forum__post-stats">
                            <span><NIcon :size="14"><EyeIcon /></NIcon>{{ post.views }}</span>
                            <span><NIcon :size="14"><ChatIcon /></NIcon>{{ post.replies }}</span>
                            <span><NIcon :size="14"><HeartIcon /></NIcon>{{ post.likes }}</span>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="campus-forum__section">
            <div class="campus-forum__section-head">
                <h3>论坛热度</h3>
            </div>
            <div class="campus-forum__stats-grid">
                <article v-for="stat in forumStats" :key="stat.key" class="campus-forum__stats-card">
                    <strong :style="{ color: stat.color }">{{ stat.value }}</strong>
                    <h4>{{ stat.label }}</h4>
                    <p>{{ stat.note }}</p>
                </article>
            </div>
        </section>

        <section class="campus-forum__section">
            <div class="campus-forum__section-head">
                <h3>最新动态</h3>
            </div>
            <div class="campus-forum__activity-list">
                <article v-for="activity in recentActivities" :key="activity.id" class="campus-forum__activity-card">
                    <div class="campus-forum__activity-icon">
                        <NIcon :size="18"><component :is="activity.icon" /></NIcon>
                    </div>
                    <div class="campus-forum__activity-copy">
                        <strong>{{ activity.title }}</strong>
                        <p>{{ activity.description }}</p>
                    </div>
                    <span>{{ activity.extra }}</span>
                </article>
            </div>
        </section>

        <button type="button" class="campus-forum__fab touch-feedback" @click="go('/forum/create')">
            <NIcon :size="24"><AddIcon /></NIcon>
        </button>
        <div class="campus-forum__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NTag } from 'naive-ui';
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
    FlashOutline as FlashIcon,
} from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();

const forumSections = [
    { id: 1, name: '学术交流', description: '课程讨论、资料与学习心得', icon: StudyIcon, route: '/forum/index?section=academic', postCount: 1248, memberCount: 892, tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))' },
    { id: 2, name: '生活服务', description: '二手交易、失物招领、生活互助', icon: LifeIcon, route: '/forum/index?section=life', postCount: 856, memberCount: 1156, tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))' },
    { id: 3, name: '校园动态', description: '通知、活动、社团新鲜事', icon: NewsIcon, route: '/forum/index?section=news', postCount: 432, memberCount: 2341, tint: 'linear-gradient(135deg, rgba(25,179,107,0.18), rgba(75,184,255,0.12))' },
    { id: 4, name: '技能分享', description: '技术经验、创作心得、方法论', icon: TechIcon, route: '/forum/index?section=tech', postCount: 674, memberCount: 587, tint: 'linear-gradient(135deg, rgba(111,95,255,0.14), rgba(75,184,255,0.12))' },
];

const hotPosts = ref([
    {
        id: 1,
        sectionId: 1,
        title: '如何高效学习高等数学？',
        excerpt: '从理解定义、建立错题本到整理常见题型，分享一套在考试周特别有效的复习方法。',
        views: 1248,
        replies: 89,
        likes: 156,
        isTop: true,
        isHot: true,
        author: { name: '数学小王子' },
    },
    {
        id: 2,
        sectionId: 2,
        title: '出售二手自行车，九成新',
        excerpt: '因为即将毕业，准备转让一辆骑行状态不错的山地车，适合校园代步与短途出行。',
        views: 567,
        replies: 23,
        likes: 45,
        isTop: false,
        isHot: true,
        author: { name: '骑行达人' },
    },
    {
        id: 3,
        sectionId: 4,
        title: 'Vue3 + TypeScript 项目搭建经验分享',
        excerpt: '从目录组织、路由管理到组件复用，总结一次真实项目搭建过程中的踩坑与优化点。',
        views: 892,
        replies: 67,
        likes: 123,
        isTop: false,
        isHot: true,
        author: { name: '前端小李' },
    },
]);

const forumStats = ref([
    { key: 'posts', label: '总帖数', value: '3.2k', color: '#2F6BFF', note: '服务信息和经验帖持续增长' },
    { key: 'members', label: '活跃用户', value: '1.8k', color: '#19B36B', note: '夜间和考试周互动更集中' },
    { key: 'today', label: '今日发帖', value: '89', color: '#FF9B3D', note: '校园动态与技能分享最活跃' },
    { key: 'hot', label: '热帖峰值', value: '236', color: '#17304F', note: '最高单帖互动仍有提升空间' },
]);

const recentActivities = ref([
    { id: 1, title: '张同学发布了新帖子', description: '《期末复习资料分享》正在快速传播。', extra: '5 分钟前', icon: ForumIcon },
    { id: 2, title: '生活服务板块出现热帖', description: '快递驿站高峰避雷帖已被大量收藏。', extra: '15 分钟前', icon: FlashIcon },
    { id: 3, title: '校园动态更新', description: '社团节活动安排和报名链接已同步。', extra: '1 小时前', icon: NewsIcon },
]);

const getSectionIcon = (sectionId: number) => {
    const section = forumSections.find(s => s.id === sectionId);
    return section?.icon || ForumIcon;
};

const getSectionName = (sectionId: number) => {
    const section = forumSections.find(s => s.id === sectionId);
    return section?.name || '其他';
};

const go = (route: string) => {
    appStore.hapticFeedback('light');
    router.push(route);
};
</script>

<style scoped>
.campus-forum {
    min-height: 100%;
    padding: 18px 16px 0;
    background:
        radial-gradient(circle at top left, rgba(255, 155, 61, 0.12), transparent 24%),
        linear-gradient(180deg, #f6f8fc 0%, #eef4fb 100%);
}

.campus-forum__hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 16px;
    padding: 24px 22px;
    border-radius: 30px;
    background: linear-gradient(135deg, #17304f 0%, #355f95 48%, #ff9b3d 100%);
    color: #ffffff;
    box-shadow: 0 18px 42px rgba(23, 48, 79, 0.18);
    margin-bottom: 24px;
}

.campus-forum__hero span {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
}

.campus-forum__hero h1 {
    font-size: 30px;
    font-weight: 800;
    margin-bottom: 10px;
}

.campus-forum__hero p {
    max-width: 500px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.9);
}

.campus-forum__hero-btn {
    min-width: 100px;
    height: 46px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.campus-forum__section {
    margin-bottom: 24px;
}

.campus-forum__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 0 2px;
}

.campus-forum__section-head h3 {
    font-size: 20px;
    font-weight: 800;
    color: #17304f;
}

.campus-forum__section-head button {
    font-size: 13px;
    color: #7f6a54;
}

.campus-forum__section-grid,
.campus-forum__stats-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.campus-forum__section-card,
.campus-forum__post-card,
.campus-forum__stats-card,
.campus-forum__activity-card {
    background: #ffffff;
    border: 1px solid rgba(23, 48, 79, 0.05);
    box-shadow: 0 10px 26px rgba(23, 48, 79, 0.05);
}

.campus-forum__section-card {
    padding: 18px 16px;
    border-radius: 24px;
}

.campus-forum__section-icon {
    width: 44px;
    height: 44px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #17304f;
    margin-bottom: 16px;
}

.campus-forum__section-card h4,
.campus-forum__stats-card h4 {
    font-size: 16px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.campus-forum__section-card p,
.campus-forum__stats-card p {
    font-size: 13px;
    line-height: 1.7;
    color: #5b667a;
}

.campus-forum__section-card span {
    display: inline-block;
    margin-top: 12px;
    font-size: 12px;
    color: #7c879d;
}

.campus-forum__post-list,
.campus-forum__activity-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.campus-forum__post-card {
    padding: 18px;
    border-radius: 24px;
}

.campus-forum__post-top,
.campus-forum__post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
}

.campus-forum__post-top {
    margin-bottom: 14px;
}

.campus-forum__post-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #fff3e8;
    color: #ff9b3d;
    font-size: 12px;
    font-weight: 700;
}

.campus-forum__badge-group {
    display: flex;
    gap: 6px;
}

.campus-forum__post-card h4 {
    font-size: 18px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.campus-forum__post-card p {
    font-size: 14px;
    line-height: 1.7;
    color: #5b667a;
    margin-bottom: 16px;
}

.campus-forum__author {
    display: inline-flex;
    align-items: center;
    gap: 8px;
}

.campus-forum__author-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: #eef3fb;
    color: #2f6bff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 800;
}

.campus-forum__author span,
.campus-forum__post-stats span {
    font-size: 12px;
    color: #7c879d;
}

.campus-forum__post-stats {
    display: flex;
    gap: 10px;
}

.campus-forum__post-stats span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}

.campus-forum__stats-card {
    padding: 18px;
    border-radius: 24px;
}

.campus-forum__stats-card strong {
    display: block;
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 10px;
}

.campus-forum__activity-card {
    padding: 16px 18px;
    border-radius: 22px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
}

.campus-forum__activity-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: #fff3e8;
    color: #ff9b3d;
    display: flex;
    align-items: center;
    justify-content: center;
}

.campus-forum__activity-copy strong {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 4px;
}

.campus-forum__activity-copy p,
.campus-forum__activity-card span {
    font-size: 12px;
    color: #7c879d;
}

.campus-forum__fab {
    position: fixed;
    right: 22px;
    bottom: calc(104px + var(--safe-area-bottom, 0px));
    width: 62px;
    height: 62px;
    border-radius: 50%;
    background: linear-gradient(135deg, #ff9b3d 0%, #f7c75f 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 14px 28px rgba(255, 155, 61, 0.28);
    z-index: 120;
}

.campus-forum__safe-space {
    height: calc(108px + var(--safe-area-bottom, 0px));
}

@media (max-width: 768px) {
    .campus-forum__hero {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 375px) {
    .campus-forum {
        padding-inline: 12px;
    }

    .campus-forum__section-grid,
    .campus-forum__stats-grid {
        grid-template-columns: 1fr;
    }

    .campus-forum__post-footer {
        flex-direction: column;
        align-items: flex-start;
    }
}

.dark-theme .campus-forum {
    background:
        radial-gradient(circle at top, rgba(255, 155, 61, 0.16), transparent 24%),
        linear-gradient(180deg, #0b1220 0%, #10192c 100%);
}

.dark-theme .campus-forum__hero {
    background: linear-gradient(135deg, #7c4b17 0%, #b96e1f 55%, #db9f32 100%);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.dark-theme .campus-forum__hero-btn {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.14);
}

.dark-theme .campus-forum__section-head h3,
.dark-theme .campus-forum__section-card h4,
.dark-theme .campus-forum__stats-card h4,
.dark-theme .campus-forum__post-card h4,
.dark-theme .campus-forum__stats-card strong,
.dark-theme .campus-forum__activity-copy strong {
    color: #f7f4ee;
}

.dark-theme .campus-forum__section-head button,
.dark-theme .campus-forum__section-card p,
.dark-theme .campus-forum__stats-card p,
.dark-theme .campus-forum__section-card span,
.dark-theme .campus-forum__post-card p,
.dark-theme .campus-forum__author span,
.dark-theme .campus-forum__post-stats span,
.dark-theme .campus-forum__activity-copy p,
.dark-theme .campus-forum__activity-card span {
    color: #c5baab;
}

.dark-theme .campus-forum__section-card,
.dark-theme .campus-forum__post-card,
.dark-theme .campus-forum__stats-card,
.dark-theme .campus-forum__activity-card {
    background: rgba(23, 23, 29, 0.94);
    border-color: rgba(214, 166, 97, 0.14);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.3);
}

.dark-theme .campus-forum__post-tag,
.dark-theme .campus-forum__activity-icon,
.dark-theme .campus-forum__author-avatar {
    background: rgba(255, 189, 102, 0.12);
    color: #ffc374;
}

.dark-theme .campus-forum__section-icon {
    color: #ffd28f;
}

.dark-theme .campus-forum__section-icon :deep(svg),
.dark-theme .campus-forum__activity-icon :deep(svg),
.dark-theme .campus-forum__author-avatar :deep(svg),
.dark-theme .campus-forum__post-tag :deep(svg),
.dark-theme .campus-forum__post-stats :deep(svg) {
    color: inherit;
    stroke: currentColor;
}

.dark-theme .campus-forum__fab {
    background: linear-gradient(135deg, #d88724 0%, #f0b54f 100%);
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.34);
}
</style>
