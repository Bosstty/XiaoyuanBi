<template>
    <div class="mobile-layout" :class="{ 'has-tab-bar': showTabBar }">
        <!-- 主导航栏 -->
        <MobileNavBar
            v-if="showNavBar && !hideNavBar"
            :title="pageTitle"
            :show-back="showBackButton"
            :transparent="navBarTransparent"
            :right-action="rightAction"
            :right-icon="rightIcon"
            @back="handleBack"
            @right-action="handleRightAction"
        >
            <template v-if="$slots.navLeft" #left>
                <slot name="navLeft" />
            </template>
            <template v-if="$slots.navCenter" #center>
                <slot name="navCenter" />
            </template>
            <template v-if="$slots.navRight" #right>
                <slot name="navRight" />
            </template>
        </MobileNavBar>

        <!-- 页面内容区域 -->
        <main
            class="page-content"
            :class="{
                'with-nav': showNavBar && !hideNavBar,
                'no-nav': hideNavBar,
            }"
        >
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
        <MobileTabBar v-if="showTabBar" />

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
import { useRoute, useRouter } from 'vue-router';
import { MobileNavBar, MobileTabBar, MobileLoading } from '@/components/mobile';
import { useAppStore } from '@/stores';

interface Props {
    showTabBar?: boolean;
    showNavBar?: boolean;
    navBarTransparent?: boolean;
    keepAlivePages?: string[];
}

const props = withDefaults(defineProps<Props>(), {
    showTabBar: true,
    showNavBar: true,
    navBarTransparent: false,
    keepAlivePages: () => ['Home', 'PickupList', 'TaskList', 'ForumIndex'],
});

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();

// 路由动画状态
const transitionName = ref('slide-left');
const transitionMode = ref('out-in');
const isNavigating = ref(false);

// 路由层级映射 - 用于判断动画方向
const routeLevels: Record<string, number> = {
    '/': 0,
    '/pickup': 1,
    '/tasks': 1,
    '/forum': 1,
    '/profile': 1,
    '/login': 2,
    '/register': 2,
    '/settings': 2,
};

// 计算页面标题
const pageTitle = computed(() => {
    return (route.meta.title as string) || '校园服务平台';
});

// 计算是否隐藏导航栏
const hideNavBar = computed(() => {
    return route.meta.hideNavBar || false;
});

// 计算是否显示返回按钮
const showBackButton = computed(() => {
    const mainPages = ['/', '/pickup', '/tasks', '/forum', '/profile'];
    return !mainPages.includes(route.path);
});

// 右侧操作配置
const rightAction = computed(() => {
    // 根据不同页面返回不同的右侧操作
    if (route.path === '/profile') {
        return () => router.push('/settings');
    }
    return undefined;
});

const rightIcon = computed(() => {
    if (route.path === '/profile') {
        return 'SettingsOutline';
    }
    return undefined;
});

// 监听路由变化，设置转场动画
watch(
    () => route.path,
    (newPath, oldPath) => {
        if (!oldPath || isNavigating.value) {
            isNavigating.value = false;
            return;
        }

        const newLevel = getRouteLevel(newPath);
        const oldLevel = getRouteLevel(oldPath);

        // 判断是前进还是后退
        if (newLevel > oldLevel) {
            // 前进 - 新页面从右侧滑入
            transitionName.value = 'slide-left';
        } else if (newLevel < oldLevel) {
            // 后退 - 新页面从左侧滑入
            transitionName.value = 'slide-right';
        } else {
            // 同级页面 - 淡入淡出
            transitionName.value = 'fade';
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

// 返回按钮处理
const handleBack = () => {
    isNavigating.value = true;

    // 检查是否有历史记录
    if (window.history.length > 1) {
        router.back();
    } else {
        // 没有历史记录时返回首页
        router.push('/');
    }
};

// 右侧操作处理
const handleRightAction = () => {
    // 由具体页面处理
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
    overflow: hidden;
    position: relative;
}

.page-content.with-nav {
    padding-top: 44px;
}

.page-content.with-nav.is-ios {
    padding-top: calc(44px + var(--status-bar-height, 44px));
}

.page-content.no-nav {
    padding-top: 0;
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
    overflow-y: auto;
    overflow-x: hidden;
}

/* 深色模式适配 */
.dark-theme .mobile-layout,
:root.dark .mobile-layout {
    background: var(--n-body-color, #000000);
}

.light-theme .mobile-layout,
:root:not(.dark) .mobile-layout {
    background: var(--n-body-color, #F2F2F7);
}

/* 状态栏颜色自动适配 */
.mobile-layout:has(.dark-theme) {
    color-scheme: dark;
}

.mobile-layout:has(.light-theme) {
    color-scheme: light;
}
</style>
