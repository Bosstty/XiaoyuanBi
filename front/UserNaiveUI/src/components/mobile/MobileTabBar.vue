<template>
    <div class="mobile-tab-bar" :class="{ 'has-safe-area': appStore.isIOS }">
        <div class="tab-bar-background" />
        <div class="tab-bar-content">
            <div
                v-for="tab in tabs"
                :key="tab.name"
                class="tab-item"
                :class="{ active: activeTab === tab.name }"
                @click="handleTabClick(tab)"
            >
                <div class="tab-icon">
                    <NIcon :size="24">
                        <component :is="tab.icon" />
                    </NIcon>
                    <div v-if="tab.badge" class="tab-badge">{{ tab.badge }}</div>
                </div>
                <span class="tab-label">{{ tab.label }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import {
    HomeOutline,
    Home,
    BagHandleOutline,
    BagHandle,
    BriefcaseOutline,
    Briefcase,
    ChatbubblesOutline,
    Chatbubbles,
    PersonOutline,
    Person,
} from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

interface TabItem {
    name: string;
    label: string;
    icon: any;
    activeIcon: any;
    route: string;
    badge?: number | string;
}

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();

const tabs: TabItem[] = [
    {
        name: 'home',
        label: '首页',
        icon: HomeOutline,
        activeIcon: Home,
        route: '/',
    },
    {
        name: 'pickup',
        label: '代取',
        icon: BagHandleOutline,
        activeIcon: BagHandle,
        route: '/pickup',
        badge: 3, // 示例：有3个新订单
    },
    {
        name: 'tasks',
        label: '任务',
        icon: BriefcaseOutline,
        activeIcon: Briefcase,
        route: '/tasks',
    },
    {
        name: 'forum',
        label: '论坛',
        icon: ChatbubblesOutline,
        activeIcon: Chatbubbles,
        route: '/forum',
    },
    {
        name: 'profile',
        label: '我的',
        icon: PersonOutline,
        activeIcon: Person,
        route: '/profile',
    },
];

const activeTab = computed(() => {
    const currentPath = route.path;
    return (
        tabs.find(
            tab =>
                currentPath === tab.route ||
                (tab.route !== '/' && currentPath.startsWith(tab.route))
        )?.name || 'home'
    );
});

const handleTabClick = (tab: TabItem) => {
    if (route.path !== tab.route) {
        appStore.hapticFeedback('light');
        router.push(tab.route);
    }
};
</script>

<style scoped>
.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    height: 80px;
    background: transparent;
}

.mobile-tab-bar.has-safe-area {
    height: calc(80px + var(--safe-area-bottom));
    padding-bottom: var(--safe-area-bottom);
}

.tab-bar-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: var(--n-card-color);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 0.5px solid var(--n-border-color);
}

.tab-bar-content {
    display: flex;
    height: 80px;
    align-items: center;
    justify-content: space-around;
    padding: 0 8px;
    position: relative;
}

.tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    padding: 8px 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.9);
    background: var(--n-border-color);
}

.tab-icon {
    position: relative;
    margin-bottom: 4px;
    color: var(--n-text-color-3);
    transition: color 0.2s ease, transform 0.2s ease;
}

.tab-item.active .tab-icon {
    color: var(--n-primary-color);
    transform: scale(1.1);
}

.tab-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 18px;
    height: 18px;
    background: var(--n-error-color);
    color: white;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    padding: 0 4px;
    line-height: 1;
}

.tab-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--n-text-color-3);
    transition: color 0.2s ease;
    text-align: center;
    line-height: 1;
}

.tab-item.active .tab-label {
    color: var(--n-primary-color);
    font-weight: 600;
}

/* 深色模式适配 */
.dark-theme .tab-bar-background {
    background: rgba(28, 28, 30, 0.8);
}

.light-theme .tab-bar-background {
    background: rgba(255, 255, 255, 0.8);
}

/* 动画效果 */
@keyframes tab-bounce {
    0% {
        transform: scale(1);
    }
    50% {
        transform: scale(1.2);
    }
    100% {
        transform: scale(1.1);
    }
}

.tab-item.active .tab-icon {
    animation: tab-bounce 0.3s ease;
}
</style>
