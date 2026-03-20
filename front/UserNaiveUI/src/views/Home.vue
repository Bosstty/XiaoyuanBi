<template>
    <div class="mobile-home">
        <!-- 动态背景 -->
        <div class="home-bg"></div>

        <!-- 欢迎横幅 -->
        <div class="welcome-section">
            <div class="welcome-card ios-card-glass">
                <div class="welcome-content">
                    <div class="welcome-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="24" r="24" fill="url(#gradient-welcome)"/>
                            <path d="M14 18h20M14 24h16M14 30h12" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
                            <defs>
                                <linearGradient id="gradient-welcome" x1="0" y1="0" x2="48" y2="48">
                                    <stop stop-color="#007AFF"/>
                                    <stop offset="1" stop-color="#5856D6"/>
                                </linearGradient>
                            </defs>
                        </svg>
                    </div>
                    <div class="welcome-text">
                        <h1 class="welcome-title">哈尔滨学院</h1>
                        <p class="welcome-desc">校园生活服务平台</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 用户信息卡片 -->
        <div v-if="userStore.isAuthenticated" class="user-section animate-fade-in">
            <div class="ios-card user-card">
                <div class="user-content">
                    <div class="user-avatar-wrap">
                        <NAvatar
                            :size="56"
                            :src="userStore.userAvatar"
                            fallback-src="/default-avatar.png"
                            round
                        />
                        <div class="user-level-badge">Lv.{{ userStore.user?.level || 1 }}</div>
                    </div>
                    <div class="user-info">
                        <h3 class="user-name">{{ userStore.userName }}</h3>
                        <p class="user-college">{{ userStore.user?.college || '未设置学院' }}</p>
                        <div class="user-points">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                            </svg>
                            <span>{{ userStore.user?.points || 0 }} 积分</span>
                        </div>
                    </div>
                    <NButton circle quaternary size="small" @click="router.push('/profile')">
                        <template #icon>
                            <NIcon :size="20"><ChevronForwardOutline /></NIcon>
                        </template>
                    </NButton>
                </div>
            </div>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions-section">
            <h3 class="section-title">快捷服务</h3>
            <div class="actions-grid">
                <div
                    v-for="(action, index) in quickActions"
                    :key="action.id"
                    class="action-item touch-feedback"
                    :style="{ animationDelay: `${index * 80}ms` }"
                    @click="handleActionClick(action)"
                >
                    <div class="action-icon" :style="{ background: action.gradient }">
                        <NIcon size="24" color="white">
                            <component :is="action.icon" />
                        </NIcon>
                    </div>
                    <span class="action-label">{{ action.label }}</span>
                </div>
            </div>
        </div>

        <!-- 平台服务列表 -->
        <div class="services-section">
            <h3 class="section-title">平台服务</h3>
            <div class="services-list ios-card">
                <div
                    v-for="(service, index) in services"
                    :key="service.id"
                    class="service-item touch-feedback"
                    :class="{ 'last-item': index === services.length - 1 }"
                    @click="handleServiceClick(service)"
                >
                    <div class="service-icon" :style="{ background: service.gradient }">
                        <NIcon size="20" color="white">
                            <component :is="service.icon" />
                        </NIcon>
                    </div>
                    <div class="service-content">
                        <h4 class="service-title">{{ service.title }}</h4>
                        <p class="service-desc">{{ service.description }}</p>
                    </div>
                    <NIcon :size="20" class="service-arrow">
                        <ChevronForwardOutline />
                    </NIcon>
                </div>
            </div>
        </div>

        <!-- 最近活动 -->
        <div v-if="userStore.isAuthenticated" class="activities-section">
            <div class="section-header">
                <h3 class="section-title">最近活动</h3>
                <NButton text size="small" type="primary">查看全部</NButton>
            </div>
            <div class="activities-list ios-card">
                <div
                    v-for="activity in recentActivities"
                    :key="activity.id"
                    class="activity-item"
                >
                    <div class="activity-icon" :style="{ background: activity.gradient }">
                        <NIcon size="16" color="white">
                            <component :is="activity.icon" />
                        </NIcon>
                    </div>
                    <div class="activity-content">
                        <span class="activity-title">{{ activity.title }}</span>
                        <span class="activity-time">{{ formatTime(activity.time) }}</span>
                    </div>
                    <NTag :type="activity.statusType" size="small" :bordered="false">
                        {{ activity.status }}
                    </NTag>
                </div>
            </div>
        </div>

        <!-- 平台数据 -->
        <div class="stats-section">
            <h3 class="section-title">平台数据</h3>
            <div class="stats-grid">
                <div v-for="(stat, index) in platformStats" :key="stat.key" class="stat-card ios-card" :style="{ animationDelay: `${index * 100}ms` }">
                    <div class="stat-value">{{ stat.value }}</div>
                    <div class="stat-label">{{ stat.label }}</div>
                </div>
            </div>
        </div>

        <!-- 未登录状态 -->
        <div v-if="!userStore.isAuthenticated" class="auth-section animate-fade-in">
            <div class="ios-card auth-card">
                <div class="auth-content">
                    <div class="auth-icon">
                        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                            <circle cx="24" cy="16" r="8" fill="var(--ios-gray3)"/>
                            <path d="M12 40c0-6.627 5.373-12 12-12s12 5.373 12 12" fill="var(--ios-gray3)"/>
                        </svg>
                    </div>
                    <h4>开启校园生活新体验</h4>
                    <p>登录后享受更多便捷服务</p>
                    <div class="auth-buttons">
                        <NButton type="primary" size="large" block @click="router.push('/login')">
                            立即登录
                        </NButton>
                        <NButton size="large" block quaternary @click="router.push('/register')">
                            注册账号
                        </NButton>
                    </div>
                </div>
            </div>
        </div>

        <!-- 底部安全区域 -->
        <div class="bottom-safe-area"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NAvatar, NTag } from 'naive-ui';
import {
    BagHandleOutline,
    DocumentTextOutline,
    ChatbubblesOutline,
    PersonOutline,
    StarOutline,
    CheckmarkCircleOutline,
    TimeOutline,
    ChevronForwardOutline,
    FastFoodOutline,
    CartOutline,
    CreateOutline,
    HardwareChipOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();

// 快捷操作 - 使用 markRaw 优化性能
const quickActions = ref([
    {
        id: 1,
        label: '代取快递',
        icon: markRaw(BagHandleOutline),
        gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
        route: '/pickup',
    },
    {
        id: 2,
        label: '外卖代取',
        icon: markRaw(FastFoodOutline),
        gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
        route: '/pickup?type=food',
    },
    {
        id: 3,
        label: '任务大厅',
        icon: markRaw(DocumentTextOutline),
        gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
        route: '/tasks',
    },
    {
        id: 4,
        label: '校园论坛',
        icon: markRaw(ChatbubblesOutline),
        gradient: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)',
        route: '/forum',
    },
]);

// 平台服务
const services = ref([
    {
        id: 1,
        title: '代取服务',
        description: '快递代取、外卖代取、药品代购',
        icon: markRaw(BagHandleOutline),
        gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
        route: '/pickup',
    },
    {
        id: 2,
        title: '任务大厅',
        description: '学习辅导、设计制作、技术开发',
        icon: markRaw(CreateOutline),
        gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
        route: '/tasks',
    },
    {
        id: 3,
        title: '技能市场',
        description: '发布技能、接取任务、赚取积分',
        icon: markRaw(HardwareChipOutline),
        gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
        route: '/skills',
    },
    {
        id: 4,
        title: '校园论坛',
        description: '学术交流、生活分享、二手交易',
        icon: markRaw(ChatbubblesOutline),
        gradient: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)',
        route: '/forum',
    },
    {
        id: 5,
        title: '二手市场',
        description: '闲置物品买卖、免费转让',
        icon: markRaw(CartOutline),
        gradient: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)',
        route: '/market',
    },
]);

// 最近活动
const recentActivities = ref([
    {
        id: 1,
        title: '快递代取已完成',
        time: new Date(Date.now() - 1800000).toISOString(),
        status: '已完成',
        statusType: 'success',
        icon: markRaw(CheckmarkCircleOutline),
        gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
    },
    {
        id: 2,
        title: '新任务待接取',
        time: new Date(Date.now() - 3600000).toISOString(),
        status: '待接取',
        statusType: 'warning',
        icon: markRaw(TimeOutline),
        gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
    },
]);

// 平台数据
const platformStats = ref([
    { key: 'users', label: '注册用户', value: '2,568' },
    { key: 'orders', label: '完成订单', value: '8,742' },
    { key: 'tasks', label: '发布任务', value: '3,291' },
    { key: 'posts', label: '论坛帖子', value: '5,847' },
]);

// 格式化时间
const formatTime = (timeStr: string) => {
    const diff = Date.now() - new Date(timeStr).getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
};

// 处理操作点击
const handleActionClick = (action: any) => {
    appStore.hapticFeedback('light');
    router.push(action.route);
};

// 处理服务点击
const handleServiceClick = (service: any) => {
    appStore.hapticFeedback('light');
    router.push(service.route);
};

// 页面加载
onMounted(async () => {
    if (userStore.isAuthenticated) {
        try {
            await userStore.fetchUserProfile();
            await userStore.fetchUserStats();
        } catch (error) {
            console.error('加载用户信息失败:', error);
        }
    }
});
</script>

<style scoped>
.mobile-home {
    min-height: 100vh;
    width: 100%;
    background: var(--n-body-color, var(--ios-bg-secondary));
    position: relative;
    overflow-x: hidden;
}

/* 动态背景 */
.home-bg {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    height: 280px;
    background: linear-gradient(180deg, var(--n-primary-color, #007AFF) 0%, #5856D6 100%);
    border-radius: 0 0 32px 32px;
    z-index: -1;
}

.dark .home-bg,
:root.dark .home-bg {
    background: linear-gradient(180deg, #0A84FF 0%, #5E5CE6 100%);
}

/* 欢迎区域 */
.welcome-section {
    padding: 16px;
    padding-top: 48px;
}

.welcome-card {
    background: rgba(255, 255, 255, 0.25);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
}

.dark .welcome-card,
:root.dark .welcome-card {
    background: rgba(44, 44, 46, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.welcome-content {
    display: flex;
    align-items: center;
    gap: 16px;
}

.welcome-icon {
    flex-shrink: 0;
}

.welcome-text {
    flex: 1;
}

.welcome-title {
    font-size: 22px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.welcome-desc {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.85);
    margin: 0;
}

/* 用户信息 */
.user-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.user-card {
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-lg);
    box-shadow: var(--ios-shadow);
}

.user-content {
    display: flex;
    align-items: center;
    gap: 14px;
}

.user-avatar-wrap {
    position: relative;
}

.user-level-badge {
    position: absolute;
    bottom: -2px;
    right: -2px;
    background: linear-gradient(135deg, #FF9500 0%, #FF3B30 100%);
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 8px;
    border: 2px solid var(--n-card-color, var(--ios-bg-primary));
}

.user-info {
    flex: 1;
    min-width: 0;
}

.user-name {
    font-size: 17px;
    font-weight: 600;
    color: var(--n-text-color-1, var(--ios-text-primary));
    margin: 0 0 4px 0;
}

.user-college {
    font-size: 13px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
    margin: 0 0 6px 0;
}

.user-points {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--n-warning-color, #FF9500);
    font-weight: 500;
}

/* 快捷操作 */
.quick-actions-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.actions-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-md);
    box-shadow: var(--ios-shadow-sm);
    animation: ios-fade-in 0.4s ease-out backwards;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.action-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.action-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--n-text-color-1, var(--ios-text-primary));
    text-align: center;
}

/* 平台服务 */
.services-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.services-list {
    padding: 0;
    overflow: hidden;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-lg);
}

.service-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 16px;
    border-bottom: 0.5px solid var(--n-divider-color, var(--ios-divider));
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.service-item.last-item {
    border-bottom: none;
}

.service-item:active {
    background: var(--n-color-hover, var(--ios-gray6));
}

.dark .service-item:active,
:root.dark .service-item:active {
    background: var(--ios-gray5);
}

.service-icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.service-content {
    flex: 1;
    min-width: 0;
}

.service-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1, var(--ios-text-primary));
    margin: 0 0 4px 0;
}

.service-desc {
    font-size: 13px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
    margin: 0;
}

.service-arrow {
    color: var(--n-text-color-3, var(--ios-gray3));
    flex-shrink: 0;
}

/* 最近活动 */
.activities-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
}

.activities-list {
    padding: 0;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-lg);
}

.activity-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    border-bottom: 0.5px solid var(--n-divider-color, var(--ios-divider));
}

.activity-item:last-child {
    border-bottom: none;
}

.activity-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.activity-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.activity-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1, var(--ios-text-primary));
}

.activity-time {
    font-size: 12px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
}

/* 平台数据 */
.stats-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.stat-card {
    text-align: center;
    padding: 20px 12px;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-lg);
    animation: ios-fade-in 0.4s ease-out backwards;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--n-primary-color, #007AFF);
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
}

/* 认证区域 */
.auth-section {
    padding: 0 16px;
    margin-bottom: 24px;
}

.auth-card {
    background: var(--n-card-color, var(--ios-bg-primary));
    text-align: center;
    padding: 32px 24px;
    border-radius: var(--ios-radius-lg);
}

.auth-icon {
    margin-bottom: 16px;
}

.auth-content h4 {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1, var(--ios-text-primary));
    margin: 0 0 8px 0;
}

.auth-content p {
    font-size: 14px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
    margin: 0 0 24px 0;
}

.auth-buttons {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

/* 底部安全区域 */
.bottom-safe-area {
    height: 100px;
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
    .welcome-title {
        font-size: 20px;
    }

    .actions-grid {
        gap: 8px;
    }

    .action-item {
        padding: 12px 4px;
    }

    .action-icon {
        width: 40px;
        height: 40px;
    }

    .action-label {
        font-size: 11px;
    }
}
</style>
