<template>
    <div class="campus-home">
        <section class="campus-home__hero">
            <div class="campus-home__hero-top">
                <div>
                    <span class="campus-home__eyebrow">哈尔滨学院校园生活服务平台</span>
                    <h1>今天想发订单，还是找任务？</h1>
                    <p>把校园里的即时需求、技能协作和内容交流放进同一个 App。</p>
                </div>
                <div v-if="userStore.isAuthenticated" class="campus-home__identity">
                    <NAvatar
                        :size="42"
                        round
                        :src="userStore.userAvatar"
                        fallback-src="/default-avatar.png"
                    />
                    <div>
                        <strong>{{ userStore.userName }}</strong>
                        <span>{{ userStore.user?.college || '校园用户' }}</span>
                    </div>
                </div>
            </div>

            <div class="campus-home__hero-grid">
                <article class="campus-home__primary-card campus-home__primary-card--orders touch-feedback" @click="go('/pickup')">
                    <div class="campus-home__primary-icon">
                        <NIcon :size="30"><BagHandleOutline /></NIcon>
                    </div>
                    <div class="campus-home__primary-copy">
                        <span>即时履约</span>
                        <h2>订单中心</h2>
                        <p>快递代取、外卖代拿、药品代购、生活用品采购</p>
                    </div>
                    <div class="campus-home__metric-row">
                        <div v-for="item in orderMetrics" :key="item.label" class="campus-home__metric">
                            <strong>{{ item.value }}</strong>
                            <span>{{ item.label }}</span>
                        </div>
                    </div>
                </article>

                <article class="campus-home__primary-card campus-home__primary-card--tasks touch-feedback" @click="go('/tasks')">
                    <div class="campus-home__primary-icon">
                        <NIcon :size="30"><BriefcaseOutline /></NIcon>
                    </div>
                    <div class="campus-home__primary-copy">
                        <span>校园协作</span>
                        <h2>任务中心</h2>
                        <p>学习、设计、技术、文案和生活互助都能在这里快速成交</p>
                    </div>
                    <div class="campus-home__metric-row">
                        <div v-for="item in taskMetrics" :key="item.label" class="campus-home__metric">
                            <strong>{{ item.value }}</strong>
                            <span>{{ item.label }}</span>
                        </div>
                    </div>
                </article>
            </div>
        </section>

        <section class="campus-home__section">
            <div class="campus-home__section-head">
                <h3>今日看板</h3>
                <button type="button" @click="go('/pickup')">进入订单</button>
            </div>
            <div class="campus-home__board-grid">
                <article v-for="card in dashboardCards" :key="card.title" class="campus-home__board-card">
                    <div class="campus-home__board-icon" :style="{ background: card.tint }">
                        <NIcon :size="20"><component :is="card.icon" /></NIcon>
                    </div>
                    <strong>{{ card.value }}</strong>
                    <h4>{{ card.title }}</h4>
                    <p>{{ card.description }}</p>
                </article>
            </div>
        </section>

        <section class="campus-home__section">
            <div class="campus-home__section-head">
                <h3>快捷入口</h3>
            </div>
            <div class="campus-home__shortcut-grid">
                <button
                    v-for="shortcut in shortcuts"
                    :key="shortcut.title"
                    type="button"
                    class="campus-home__shortcut-card touch-feedback"
                    @click="go(shortcut.route)"
                >
                    <div class="campus-home__shortcut-icon" :style="{ background: shortcut.tint }">
                        <NIcon :size="20"><component :is="shortcut.icon" /></NIcon>
                    </div>
                    <strong>{{ shortcut.title }}</strong>
                    <span>{{ shortcut.description }}</span>
                </button>
            </div>
        </section>

        <section class="campus-home__section">
            <div class="campus-home__section-head">
                <h3>论坛精选</h3>
                <button type="button" @click="go('/forum')">进入论坛</button>
            </div>
            <div class="campus-home__post-list">
                <article
                    v-for="post in featuredPosts"
                    :key="post.id"
                    class="campus-home__post-card touch-feedback"
                    @click="go('/forum')"
                >
                    <div class="campus-home__post-meta">
                        <NTag size="small" :bordered="false" :type="post.tagType">{{ post.tag }}</NTag>
                        <span>{{ post.time }}</span>
                    </div>
                    <h4>{{ post.title }}</h4>
                    <p>{{ post.excerpt }}</p>
                    <div class="campus-home__post-footer">
                        <span>{{ post.author }}</span>
                        <span>{{ post.stats }}</span>
                    </div>
                </article>
            </div>
        </section>

        <div class="campus-home__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NAvatar, NIcon, NTag } from 'naive-ui';
import {
    BagHandleOutline,
    BriefcaseOutline,
    FlashOutline,
    TrendingUpOutline,
    TimeOutline,
    WalletOutline,
    ReceiptOutline,
    RocketOutline,
    ChatbubblesOutline,
} from '@vicons/ionicons5';
import { useAppStore, useUserStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();

const orderMetrics = [
    { label: '待接订单', value: '36' },
    { label: '平均送达', value: '22m' },
    { label: '今日完成', value: '128' },
];

const taskMetrics = [
    { label: '新任务', value: '54' },
    { label: '正在招募', value: '31' },
    { label: '本周收入', value: '¥860' },
];

const dashboardCards = [
    {
        title: '订单热度',
        value: '南区宿舍',
        description: '午间外卖和晚间快递需求最集中',
        icon: markRaw(FlashOutline),
        tint: 'linear-gradient(135deg, rgba(47,107,255,0.18), rgba(75,184,255,0.18))',
    },
    {
        title: '任务趋势',
        value: '设计类 +18%',
        description: '活动海报、社团招新和短视频需求上升',
        icon: markRaw(TrendingUpOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.2), rgba(247,199,95,0.2))',
    },
    {
        title: '响应时效',
        value: '8 分钟',
        description: '当前平台平均首次响应时间',
        icon: markRaw(TimeOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.18), rgba(75,184,255,0.12))',
    },
];

const shortcuts = [
    { title: '发布订单', description: '下单找人代取', route: '/pickup/create', icon: markRaw(ReceiptOutline), tint: '#eaf0ff' },
    { title: '发布任务', description: '发起协作需求', route: '/tasks/create', icon: markRaw(RocketOutline), tint: '#eef9f3' },
    { title: '论坛交流', description: '看文章与讨论', route: '/forum', icon: markRaw(ChatbubblesOutline), tint: '#fff3e8' },
    { title: '钱包记录', description: '查看收益与支出', route: '/wallet', icon: markRaw(WalletOutline), tint: '#eef5fb' },
];

const featuredPosts = [
    {
        id: 1,
        tag: '校园动态',
        tagType: 'info' as const,
        time: '12 分钟前',
        title: '图书馆自习区新开放夜间座位预约',
        excerpt: '不少同学已经在讨论最适合复习的楼层和时间段，帖子热度持续上涨。',
        author: '校园助手',
        stats: '236 浏览 · 18 回复',
    },
    {
        id: 2,
        tag: '技能分享',
        tagType: 'success' as const,
        time: '1 小时前',
        title: '接设计类任务前，怎么快速确认需求不翻车',
        excerpt: '从需求澄清、交付节点到返工边界，适合做海报和视频任务的同学收藏。',
        author: '视觉社成员',
        stats: '189 浏览 · 26 点赞',
    },
    {
        id: 3,
        tag: '生活服务',
        tagType: 'warning' as const,
        time: '2 小时前',
        title: '快递驿站高峰时段避雷时间表更新',
        excerpt: '结合最近一周的排队情况，整理了早中晚三个时间段的真实取件体验。',
        author: '宿舍区观察员',
        stats: '302 浏览 · 41 回复',
    },
];

const go = (route: string) => {
    appStore.hapticFeedback('light');
    router.push(route);
};
</script>

<style scoped>
.campus-home {
    min-height: 100%;
    padding: 18px 16px 0;
    background:
        radial-gradient(circle at top left, rgba(75, 184, 255, 0.16), transparent 28%),
        linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
}

.campus-home__hero {
    padding: 20px;
    border-radius: 32px;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 48%, #6fe3c1 100%);
    box-shadow: 0 18px 42px rgba(47, 107, 255, 0.2);
    color: #ffffff;
    margin-bottom: 24px;
}

.campus-home__hero-top {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 20px;
}

.campus-home__eyebrow {
    display: inline-block;
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.16);
    font-size: 12px;
    margin-bottom: 12px;
}

.campus-home__hero h1 {
    font-size: 28px;
    line-height: 1.2;
    font-weight: 800;
    margin-bottom: 10px;
}

.campus-home__hero p {
    max-width: 520px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.92);
}

.campus-home__identity {
    min-width: 122px;
    height: fit-content;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px;
    border-radius: 20px;
    background: rgba(255, 255, 255, 0.18);
    backdrop-filter: blur(10px);
}

.campus-home__identity strong,
.campus-home__identity span {
    display: block;
}

.campus-home__identity strong {
    font-size: 14px;
}

.campus-home__identity span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.88);
}

.campus-home__hero-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.campus-home__primary-card {
    padding: 18px;
    border-radius: 26px;
    min-height: 220px;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    color: #172033;
}

.campus-home__primary-card--orders {
    background: linear-gradient(180deg, #ffffff 0%, #edf4ff 100%);
}

.campus-home__primary-card--tasks {
    background: linear-gradient(180deg, #ffffff 0%, #effaf3 100%);
}

.campus-home__primary-icon {
    width: 56px;
    height: 56px;
    border-radius: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.88);
    box-shadow: 0 8px 20px rgba(23, 48, 79, 0.08);
}

.campus-home__primary-copy span {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    color: #5b667a;
    margin: 12px 0 6px;
}

.campus-home__primary-copy h2 {
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 8px;
}

.campus-home__primary-copy p {
    font-size: 13px;
    line-height: 1.7;
    color: #5b667a;
}

.campus-home__metric-row {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
}

.campus-home__metric {
    padding: 10px 8px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.72);
    text-align: center;
}

.campus-home__metric strong,
.campus-home__metric span {
    display: block;
}

.campus-home__metric strong {
    font-size: 15px;
    font-weight: 800;
}

.campus-home__metric span {
    font-size: 11px;
    color: #6f7890;
    margin-top: 2px;
}

.campus-home__section {
    margin-bottom: 24px;
}

.campus-home__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 0 2px;
}

.campus-home__section-head h3 {
    font-size: 20px;
    font-weight: 800;
    color: #17304f;
}

.campus-home__section-head button {
    font-size: 13px;
    color: #5f78a8;
}

.campus-home__board-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
}

.campus-home__board-card {
    padding: 18px 16px;
    border-radius: 24px;
    background: rgba(255, 255, 255, 0.92);
    border: 1px solid rgba(47, 107, 255, 0.06);
    box-shadow: 0 10px 26px rgba(23, 48, 79, 0.05);
}

.campus-home__board-icon {
    width: 42px;
    height: 42px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #17304f;
    margin-bottom: 16px;
}

.campus-home__board-card strong {
    display: block;
    font-size: 20px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.campus-home__board-card h4 {
    font-size: 14px;
    font-weight: 700;
    color: #17304f;
    margin-bottom: 6px;
}

.campus-home__board-card p {
    font-size: 12px;
    line-height: 1.6;
    color: #667287;
}

.campus-home__shortcut-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(148px, 1fr));
    gap: 12px;
}

.campus-home__shortcut-card {
    padding: 16px 12px;
    border-radius: 22px;
    background: #ffffff;
    border: 1px solid rgba(23, 48, 79, 0.05);
    box-shadow: 0 10px 24px rgba(23, 48, 79, 0.05);
    text-align: left;
    min-height: 146px;
    display: grid;
    align-content: start;
}

.campus-home__shortcut-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #17304f;
    margin-bottom: 16px;
}

.campus-home__shortcut-card strong,
.campus-home__shortcut-card span {
    display: block;
}

.campus-home__shortcut-card strong {
    font-size: 14px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 6px;
}

.campus-home__shortcut-card span {
    font-size: 12px;
    line-height: 1.6;
    color: #6a7487;
}

.campus-home__post-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.campus-home__post-card {
    padding: 18px;
    border-radius: 24px;
    background: #ffffff;
    border: 1px solid rgba(23, 48, 79, 0.05);
    box-shadow: 0 10px 26px rgba(23, 48, 79, 0.05);
}

.campus-home__post-meta,
.campus-home__post-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.campus-home__post-meta {
    margin-bottom: 12px;
}

.campus-home__post-meta span,
.campus-home__post-footer span {
    font-size: 12px;
    color: #7c879d;
}

.campus-home__post-card h4 {
    font-size: 17px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.campus-home__post-card p {
    font-size: 13px;
    line-height: 1.7;
    color: #5b667a;
    margin-bottom: 14px;
}

.campus-home__safe-space {
    height: calc(108px + var(--safe-area-bottom, 0px));
}

@media (max-width: 768px) {
    .campus-home__hero-top,
    .campus-home__hero-grid,
    .campus-home__board-grid {
        grid-template-columns: 1fr;
        display: grid;
    }

    .campus-home__hero-top {
        gap: 14px;
    }

    .campus-home__identity {
        min-width: 0;
    }

    .campus-home__shortcut-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
    }
}

@media (max-width: 375px) {
    .campus-home {
        padding-inline: 12px;
    }

    .campus-home__hero {
        padding: 18px;
    }

    .campus-home__hero h1 {
        font-size: 24px;
    }

    .campus-home__shortcut-grid {
        grid-template-columns: 1fr;
    }
}

.dark-theme .campus-home {
    background:
        radial-gradient(circle at top, rgba(47, 107, 255, 0.18), transparent 28%),
        linear-gradient(180deg, #0b1220 0%, #10192c 100%);
}

.dark-theme .campus-home__hero {
    background: linear-gradient(135deg, #1d4fb5 0%, #2469d9 55%, #167d66 100%);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.dark-theme .campus-home__identity {
    background: rgba(255, 255, 255, 0.08);
    color: #e8f0ff;
}

.dark-theme .campus-home__primary-card {
    box-shadow: 0 16px 34px rgba(0, 0, 0, 0.28);
}

.dark-theme .campus-home__primary-card--orders {
    background: linear-gradient(180deg, rgba(25, 46, 82, 0.96), rgba(18, 31, 56, 0.96));
}

.dark-theme .campus-home__primary-card--tasks {
    background: linear-gradient(180deg, rgba(19, 46, 41, 0.96), rgba(15, 34, 31, 0.96));
}

.dark-theme .campus-home__primary-icon,
.dark-theme .campus-home__metric {
    background: rgba(255, 255, 255, 0.08);
    box-shadow: none;
}

.dark-theme .campus-home__primary-copy span,
.dark-theme .campus-home__primary-copy h2,
.dark-theme .campus-home__primary-copy p,
.dark-theme .campus-home__metric strong,
.dark-theme .campus-home__metric span {
    color: rgba(233, 240, 255, 0.92);
}

.dark-theme .campus-home__section-head h3,
.dark-theme .campus-home__board-card strong,
.dark-theme .campus-home__board-card h4,
.dark-theme .campus-home__shortcut-card strong,
.dark-theme .campus-home__post-card h4 {
    color: #f3f7ff;
}

.dark-theme .campus-home__board-card p,
.dark-theme .campus-home__shortcut-card span,
.dark-theme .campus-home__post-card p,
.dark-theme .campus-home__post-meta span,
.dark-theme .campus-home__post-footer span,
.dark-theme .campus-home__section-head button {
    color: #aebbd1;
}

.dark-theme .campus-home__board-card,
.dark-theme .campus-home__shortcut-card,
.dark-theme .campus-home__post-card {
    background: rgba(17, 26, 43, 0.92);
    border-color: rgba(109, 145, 222, 0.14);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
}

.dark-theme .campus-home__board-icon,
.dark-theme .campus-home__shortcut-icon {
    color: #d6e4ff;
}

.dark-theme .campus-home__shortcut-icon {
    background: rgba(255, 255, 255, 0.08) !important;
}

.dark-theme .campus-home__board-icon :deep(svg),
.dark-theme .campus-home__shortcut-icon :deep(svg),
.dark-theme .campus-home__primary-icon :deep(svg) {
    color: inherit;
    stroke: currentColor;
}

.dark-theme .campus-home__section-head button {
    color: #86a6e8;
}
</style>
