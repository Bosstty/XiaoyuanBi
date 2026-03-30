<template>
    <div class="mobile-layout" :class="{ 'has-tab-bar': resolvedShowTabBar }">
        <!-- 页面内容区域 -->
        <main class="page-content">
            <router-view v-slot="{ Component, route }">
                <transition
                    :name="transitionName"
                    :mode="transitionMode"
                    @before-enter="onBeforeEnter"
                    @enter="onEnter"
                    @leave="onLeave"
                >
                    <keep-alive :include="keepAlivePages">
                        <component :is="Component" :key="route.path" />
                    </keep-alive>
                </transition>
            </router-view>
        </main>

        <!-- 底部标签栏 -->
        <MobileTabBar v-if="resolvedShowTabBar" />

        <!-- 全局加载遮罩 -->
        <Teleport to="body">
            <MobileLoading
                v-if="appStore.isPageLoading"
                type="default"
                :overlay="true"
                :full-screen="true"
                text="加载中..."
            />
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { MobileTabBar, MobileLoading } from '@/components/mobile';
import { useAppStore } from '@/stores';

interface Props {
    showTabBar?: boolean;
    keepAlivePages?: string[];
}

const props = withDefaults(defineProps<Props>(), {
    showTabBar: true,
    keepAlivePages: () => ['Home', 'PickupList', 'TaskList', 'ForumIndex'],
});

const route = useRoute();
const appStore = useAppStore();
const resolvedShowTabBar = computed(() => {
    const hideForChatConversation =
        route.path === '/chat' && typeof route.query.conversationId === 'string';
    return props.showTabBar && !route.meta.hideTabBar && !hideForChatConversation;
});

// 路由动画状态
const transitionName = ref('slide-left');
const transitionMode = ref(''); // 空字符串让动画同时进行

// 路由层级映射 - 用于判断动画方向
const routeLevels: Record<string, number> = {
    '/': 0,
    '/pickup': 1,
    '/pickup/list': 1,
    '/tasks': 1,
    '/chat': 1,
    '/forum': 1,
    '/forum/index': 1,
    '/profile': 1,
    '/login': 2,
    '/register': 2,
    '/auth/forgot-password': 2,
    '/settings': 2,
};

const mainTabs = [
    { key: 'home', matchBase: '/', entryRoute: '/' },
    { key: 'pickup', matchBase: '/pickup', entryRoute: '/pickup/list' },
    { key: 'tasks', matchBase: '/tasks', entryRoute: '/tasks' },
    { key: 'forum', matchBase: '/forum', entryRoute: '/forum' },
    { key: 'chat', matchBase: '/chat', entryRoute: '/chat' },
    { key: 'profile', matchBase: '/profile', entryRoute: '/profile' },
];

const getMainTab = (path: string) => {
    return (
        mainTabs.find(tab => {
            if (tab.matchBase === '/') {
                return path === '/';
            }

            return path === tab.matchBase || path.startsWith(`${tab.matchBase}/`);
        }) || null
    );
};

const walletForwardTargets = new Set([
    '/wallet/transactions',
    '/wallet/recharge',
    '/wallet/withdraw',
    '/wallet/payment-settings',
    '/pickup/my',
    '/tasks/my',
]);

const authForwardTargets = new Set(['/register', '/auth/forgot-password']);

const resolveWalletTransition = (newPath: string, oldPath: string) => {
    if (oldPath === '/wallet' && walletForwardTargets.has(newPath)) {
        return 'slide-left';
    }

    if (newPath === '/wallet' && walletForwardTargets.has(oldPath)) {
        return 'slide-right';
    }

    return '';
};

const resolveAuthTransition = (newPath: string, oldPath: string) => {
    if (oldPath === '/login' && authForwardTargets.has(newPath)) {
        return 'slide-left';
    }

    if (newPath === '/login' && authForwardTargets.has(oldPath)) {
        return 'slide-right';
    }

    return '';
};

// 监听路由变化，设置转场动画
watch(
    () => route.path,
    (newPath, oldPath) => {
        if (!oldPath || newPath === oldPath) {
            return;
        }

        const oldTab = getMainTab(oldPath);
        const newTab = getMainTab(newPath);
        const walletTransition = resolveWalletTransition(newPath, oldPath);
        const authTransition = resolveAuthTransition(newPath, oldPath);

        if (walletTransition) {
            transitionName.value = walletTransition;
        }
        else if (authTransition) {
            transitionName.value = authTransition;
        }

        // 情况1：标签页切换（主导航栏点击）
        else if (oldTab && newTab && oldTab.key !== newTab.key) {
            const currentIndex = mainTabs.findIndex(tab => tab.key === oldTab.key);
            const targetIndex = mainTabs.findIndex(tab => tab.key === newTab.key);

            if (targetIndex < currentIndex) {
                transitionName.value = 'slide-right';
            } else {
                transitionName.value = 'slide-left';
            }
        }
        // 情况2：从子页面返回到所属标签页
        else if (newTab && !oldTab) {
            transitionName.value = 'slide-right';
        }
        // 情况3：从标签页进入子页面
        else if (oldTab && !newTab && oldPath.startsWith(newPath + '/')) {
            transitionName.value = 'slide-left';
        }
        // 情况4：同标签下的子页面切换
        else if (oldTab && newTab && oldTab.key === newTab.key) {
            if (newPath === newTab.entryRoute && oldPath !== newTab.entryRoute) {
                transitionName.value = 'slide-right';
            } else if (newPath.startsWith(oldPath + '/')) {
                // 进入子页面
                transitionName.value = 'slide-left';
            } else if (oldPath.startsWith(newPath + '/')) {
                // 返回父页面
                transitionName.value = 'slide-right';
            } else {
                transitionName.value = 'fade';
            }
        }
        // 情况5：其他情况
        else {
            const newLevel = getRouteLevel(newPath);
            const oldLevel = getRouteLevel(oldPath);

            if (newLevel > oldLevel) {
                transitionName.value = 'slide-left';
            } else if (newLevel < oldLevel) {
                transitionName.value = 'slide-right';
            } else {
                transitionName.value = 'fade';
            }
        }

        // 触觉反馈
        appStore.hapticFeedback('light');
    },
    { immediate: false }
);

// 获取路由层级
const getRouteLevel = (path: string) => {
    // 精确匹配
    if (routeLevels[path] !== undefined) {
        return routeLevels[path];
    }

    // 模糊匹配
    for (const [routePath, level] of Object.entries(routeLevels)) {
        if (path.startsWith(routePath) && routePath !== '/') {
            return level + path.split('/').length - routePath.split('/').length;
        }
    }

    return 2; // 默认层级
};

// 转场动画事件处理
const onBeforeEnter = (el: Element) => {
    if (appStore.userPreferences.enableTransitions) {
        (el as HTMLElement).style.opacity = '0';
    }
};

const onEnter = (el: Element, done: () => void) => {
    if (appStore.userPreferences.enableTransitions) {
        requestAnimationFrame(() => {
            (el as HTMLElement).style.opacity = '1';
            setTimeout(done, 300);
        });
    } else {
        done();
    }
};

const onLeave = (el: Element, done: () => void) => {
    if (appStore.userPreferences.enableTransitions) {
        setTimeout(done, 150);
    } else {
        done();
    }
};
</script>

<style scoped>
.mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    overflow: hidden;
    background: var(--n-body-color);
}

.mobile-layout.has-tab-bar {
    padding-bottom: 80px;
}

.mobile-layout.has-tab-bar.is-ios {
    padding-bottom: calc(80px + var(--safe-area-bottom, 34px));
}

.page-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    -webkit-overflow-scrolling: touch;
}

/* iOS 风格转场动画 */

/* 左滑动画（前进） */
.slide-left-enter-active,
.slide-left-leave-active {
    transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-left-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.slide-left-leave-to {
    opacity: 0;
    transform: translateX(-30%);
}

/* 右滑动画（后退） */
.slide-right-enter-active,
.slide-right-leave-active {
    transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-right-enter-from {
    opacity: 0;
    transform: translateX(-100%);
}

.slide-right-leave-to {
    opacity: 0;
    transform: translateX(30%);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.25s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

/* 上滑动画（模态框等） */
.slide-up-enter-active,
.slide-up-leave-active {
    transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.slide-up-enter-from {
    opacity: 0;
    transform: translateY(100%);
}

.slide-up-leave-to {
    opacity: 0;
    transform: translateY(100%);
}

/* 缩放动画 */
.scale-enter-active,
.scale-leave-active {
    transition: all 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.scale-enter-from {
    opacity: 0;
    transform: scale(0.9);
}

.scale-leave-to {
    opacity: 0;
    transform: scale(1.1);
}

/* 禁用动画模式 */
@media (prefers-reduced-motion: reduce) {
    .slide-left-enter-active,
    .slide-left-leave-active,
    .slide-right-enter-active,
    .slide-right-leave-active,
    .fade-enter-active,
    .fade-leave-active,
    .slide-up-enter-active,
    .slide-up-leave-active,
    .scale-enter-active,
    .scale-leave-active {
        transition: none !important;
    }
}

/* 页面内容区域样式 */
.page-content {
    background: var(--n-body-color, var(--ios-bg-secondary));
    width: 100%;
}

.page-content > * {
    width: 100%;
    min-height: 100%;
    overflow: visible;
}

/* 深色模式适配 */
.dark-theme .mobile-layout,
:root.dark .mobile-layout {
    background: var(--n-body-color, #000000);
}

.light-theme .mobile-layout,
:root:not(.dark) .mobile-layout {
    background: var(--n-body-color, #f2f2f7);
}

/* 状态栏颜色自动适配 */
.mobile-layout:has(.dark-theme) {
    color-scheme: dark;
}

.mobile-layout:has(.light-theme) {
    color-scheme: light;
}
</style>
