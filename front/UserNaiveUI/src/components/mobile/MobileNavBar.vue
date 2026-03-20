<template>
    <div
        class="mobile-nav-bar"
        :class="{
            'has-safe-area': appStore.isIOS,
            'is-transparent': transparent,
            'has-border': !transparent,
        }"
        :style="{ backgroundColor: backgroundColor }"
    >
        <div class="nav-content">
            <!-- 左侧按钮 -->
            <div class="nav-left">
                <slot name="left">
                    <NButton v-if="showBack" text circle size="large" @click="handleBack">
                        <template #icon>
                            <NIcon size="24">
                                <ChevronBackOutline />
                            </NIcon>
                        </template>
                    </NButton>
                </slot>
            </div>

            <!-- 中间标题 -->
            <div class="nav-center">
                <slot name="center">
                    <h1 class="nav-title" :class="{ large: largeTitle }">
                        {{ title }}
                    </h1>
                </slot>
            </div>

            <!-- 右侧按钮 -->
            <div class="nav-right">
                <slot name="right">
                    <NButton v-if="rightAction" text circle size="large" @click="handleRightAction">
                        <template #icon>
                            <NIcon size="20">
                                <component :is="rightIcon" />
                            </NIcon>
                        </template>
                    </NButton>
                </slot>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon } from 'naive-ui';
import { ChevronBackOutline, EllipsisHorizontal, SearchOutline } from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

interface Props {
    title?: string;
    showBack?: boolean;
    transparent?: boolean;
    backgroundColor?: string;
    largeTitle?: boolean;
    rightAction?: () => void;
    rightIcon?: any;
}

const props = withDefaults(defineProps<Props>(), {
    title: '',
    showBack: true,
    transparent: false,
    backgroundColor: '',
    largeTitle: false,
    rightIcon: () => EllipsisHorizontal,
});

const emit = defineEmits<{
    back: [];
    rightAction: [];
}>();

const router = useRouter();
const appStore = useAppStore();

const handleBack = () => {
    appStore.hapticFeedback('light');
    emit('back');
    router.back();
};

const handleRightAction = () => {
    appStore.hapticFeedback('light');
    emit('rightAction');
    if (props.rightAction) {
        props.rightAction();
    }
};
</script>

<style scoped>
.mobile-nav-bar {
    position: relative;
    width: 100%;
    height: 44px;
    display: flex;
    align-items: center;
    background: var(--n-card-color);
    z-index: 100;
    transition: all 0.3s ease;
}

.mobile-nav-bar.has-safe-area {
    padding-top: var(--status-bar-height);
    height: calc(44px + var(--status-bar-height));
}

.mobile-nav-bar.is-transparent {
    background: transparent;
}

.mobile-nav-bar.has-border {
    border-bottom: 0.5px solid var(--n-border-color);
}

.nav-content {
    display: flex;
    align-items: center;
    width: 100%;
    height: 44px;
    padding: 0 16px;
    position: relative;
}

.nav-left,
.nav-right {
    display: flex;
    align-items: center;
    min-width: 44px;
    height: 44px;
}

.nav-right {
    justify-content: flex-end;
}

.nav-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    max-width: calc(100% - 120px);
}

.nav-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--n-text-color-1);
    text-align: center;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0;
    line-height: 1.2;
}

.nav-title.large {
    font-size: 22px;
    font-weight: 700;
}

/* 按钮样式重写 */
.nav-left :deep(.n-button),
.nav-right :deep(.n-button) {
    color: var(--n-primary-color);
    transition: all 0.2s ease;
}

.nav-left :deep(.n-button:hover),
.nav-right :deep(.n-button:hover) {
    background: var(--n-border-color);
}

.nav-left :deep(.n-button:active),
.nav-right :deep(.n-button:active) {
    transform: scale(0.9);
    opacity: 0.6;
}

/* 深色模式适配 */
.dark-theme .mobile-nav-bar {
    background: rgba(28, 28, 30, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

.light-theme .mobile-nav-bar {
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
}

/* 动画效果 */
.nav-title {
    animation: fadeInUp 0.3s ease;
}

@keyframes fadeInUp {
    from {
        opacity: 0;
        transform: translateY(10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
