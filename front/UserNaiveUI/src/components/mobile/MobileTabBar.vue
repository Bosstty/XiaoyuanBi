<template>
    <div
        class="mobile-tab-bar"
        :class="{
            'has-safe-area': appStore.isIOS,
            'dark-mode': appStore.currentTheme === 'dark',
            'light-mode': appStore.currentTheme === 'light',
        }"
    >
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
                        <component :is="activeTab === tab.name ? tab.activeIcon : tab.icon" />
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
    matchBase: string;
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
        matchBase: '/',
    },
    {
        name: 'pickup',
        label: '订单',
        icon: BagHandleOutline,
        activeIcon: BagHandle,
        route: '/pickup/list',
        matchBase: '/pickup',
        badge: 3, // 示例：有3个新订单
    },
    {
        name: 'tasks',
        label: '任务',
        icon: BriefcaseOutline,
        activeIcon: Briefcase,
        route: '/tasks',
        matchBase: '/tasks',
    },
    {
        name: 'forum',
        label: '论坛',
        icon: ChatbubblesOutline,
        activeIcon: Chatbubbles,
        route: '/forum',
        matchBase: '/forum',
    },
    {
        name: 'profile',
        label: '我的',
        icon: PersonOutline,
        activeIcon: Person,
        route: '/profile',
        matchBase: '/profile',
    },
];

const isTabSectionActive = (tab: TabItem, path = route.path) => {
    if (tab.matchBase === '/') {
        return path === '/';
    }

    return path === tab.matchBase || path.startsWith(`${tab.matchBase}/`);
};

const activeTab = computed(() => {
    return tabs.find(tab => isTabSectionActive(tab))?.name || 'home';
});

const handleTabClick = (tab: TabItem) => {
    if (isTabSectionActive(tab)) {
        if (route.path !== tab.route) {
            appStore.hapticFeedback('light');
            router.replace(tab.route);
        }

        return;
    }

    appStore.hapticFeedback('light');
    router.push(tab.route);
};
</script>

<style scoped>
.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    height: 82px;
    background: transparent;
}

.mobile-tab-bar.has-safe-area {
    height: calc(82px + var(--safe-area-bottom));
    padding-bottom: var(--safe-area-bottom);
}

.tab-bar-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(47, 107, 255, 0.08);
    box-shadow: 0 -10px 30px rgba(23, 48, 79, 0.05);
}

.tab-bar-background::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: transparent;
}

.tab-bar-content {
    display: flex;
    height: 82px;
    align-items: center;
    justify-content: space-around;
    padding: 0 10px;
    position: relative;
}

.tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    padding: 10px 6px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 18px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.96);
}

.tab-icon {
    position: relative;
    margin-bottom: 5px;
    color: #6c7892;
    transition: color 0.2s ease, transform 0.2s ease;
}

.tab-item.active .tab-icon {
    color: #2f6bff;
    transform: translateY(-1px);
}

.tab-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
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
    color: #7c879d;
    transition: color 0.2s ease;
    text-align: center;
    line-height: 1;
}

.tab-item.active .tab-label {
    color: #2f6bff;
    font-weight: 700;
}

.mobile-tab-bar.dark-mode .tab-bar-background {
    background: #232326;
    border-top: none;
    box-shadow: 0 -14px 36px rgba(0, 0, 0, 0.36);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

.mobile-tab-bar.dark-mode .tab-bar-background::before {
    background: rgba(82, 90, 110, 0.34);
}

.mobile-tab-bar.dark-mode .tab-icon {
    color: #f5f5f5;
}

.mobile-tab-bar.dark-mode .tab-label {
    color: #a1a1aa;
}

.mobile-tab-bar.dark-mode .tab-item.active .tab-label {
    color: #ffffff;
}
</style>
