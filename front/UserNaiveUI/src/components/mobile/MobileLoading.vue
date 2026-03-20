<template>
    <div
        class="mobile-loading"
        :class="[`type-${type}`, `size-${size}`, { 'full-screen': fullScreen, overlay: overlay }]"
    >
        <div class="loading-content">
            <!-- 加载图标 -->
            <div class="loading-icon">
                <!-- 旋转器 -->
                <div v-if="type === 'spinner'" class="spinner">
                    <div class="spinner-circle" />
                </div>

                <!-- 点跳动 -->
                <div v-else-if="type === 'dots'" class="dots">
                    <div
                        v-for="i in 3"
                        :key="i"
                        class="dot"
                        :style="{ animationDelay: `${(i - 1) * 0.2}s` }"
                    />
                </div>

                <!-- 脉冲圆圈 -->
                <div v-else-if="type === 'pulse'" class="pulse">
                    <div class="pulse-circle" />
                    <div class="pulse-circle" />
                </div>

                <!-- 波浪 -->
                <div v-else-if="type === 'wave'" class="wave">
                    <div
                        v-for="i in 5"
                        :key="i"
                        class="wave-bar"
                        :style="{ animationDelay: `${(i - 1) * 0.1}s` }"
                    />
                </div>

                <!-- 骨架屏 -->
                <div v-else-if="type === 'skeleton'" class="skeleton">
                    <div class="skeleton-line" />
                    <div class="skeleton-line short" />
                    <div class="skeleton-line" />
                </div>

                <!-- 自定义图标 -->
                <div v-else-if="type === 'custom' && icon" class="custom-icon">
                    <NIcon :size="iconSize" class="rotating">
                        <component :is="icon" />
                    </NIcon>
                </div>

                <!-- 默认 iOS 风格 -->
                <div v-else class="ios-spinner">
                    <svg viewBox="0 0 50 50" class="ios-spinner-svg">
                        <circle
                            cx="25"
                            cy="25"
                            r="20"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="3"
                            stroke-linecap="round"
                            stroke-dasharray="31.416"
                            stroke-dashoffset="31.416"
                        />
                    </svg>
                </div>
            </div>

            <!-- 加载文本 -->
            <div v-if="showText && (text || $slots.default)" class="loading-text">
                <slot>{{ text }}</slot>
            </div>

            <!-- 进度条（可选） -->
            <div v-if="showProgress && progress !== undefined" class="loading-progress">
                <div class="progress-bar">
                    <div class="progress-fill" :style="{ width: `${progress}%` }" />
                </div>
                <div class="progress-text">{{ Math.round(progress) }}%</div>
            </div>
        </div>

        <!-- 遮罩层点击处理 -->
        <div v-if="overlay && maskClosable" class="loading-mask" @click="handleMaskClick" />
    </div>
</template>

<script setup lang="ts">
import { NIcon } from 'naive-ui';

interface Props {
    type?: 'default' | 'spinner' | 'dots' | 'pulse' | 'wave' | 'skeleton' | 'custom';
    size?: 'small' | 'medium' | 'large';
    text?: string;
    showText?: boolean;
    showProgress?: boolean;
    progress?: number;
    fullScreen?: boolean;
    overlay?: boolean;
    maskClosable?: boolean;
    icon?: any;
    iconSize?: number;
    duration?: number;
}

const props = withDefaults(defineProps<Props>(), {
    type: 'default',
    size: 'medium',
    text: '加载中...',
    showText: true,
    showProgress: false,
    progress: undefined,
    fullScreen: false,
    overlay: false,
    maskClosable: false,
    icon: null,
    iconSize: 24,
    duration: 1.5,
});

const emit = defineEmits<{
    maskClick: [];
}>();

const handleMaskClick = () => {
    emit('maskClick');
};
</script>

<style scoped>
.mobile-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
}

.mobile-loading.full-screen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: var(--n-body-color);
}

.mobile-loading.overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    background: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}

.loading-mask {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    cursor: pointer;
}

.loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    background: var(--n-card-color);
    padding: 24px;
    border-radius: 16px;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    position: relative;
    z-index: 1;
}

.mobile-loading.full-screen .loading-content,
.mobile-loading:not(.overlay) .loading-content {
    background: transparent;
    box-shadow: none;
    padding: 0;
}

/* 尺寸变体 */
.mobile-loading.size-small .loading-content {
    padding: 16px;
    gap: 8px;
}

.mobile-loading.size-large .loading-content {
    padding: 32px;
    gap: 16px;
}

.mobile-loading.size-small .loading-icon {
    width: 24px;
    height: 24px;
}

.mobile-loading.size-medium .loading-icon {
    width: 32px;
    height: 32px;
}

.mobile-loading.size-large .loading-icon {
    width: 48px;
    height: 48px;
}

/* 加载图标基础样式 */
.loading-icon {
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--n-primary-color);
}

/* iOS 风格旋转器 */
.ios-spinner {
    width: 100%;
    height: 100%;
}

.ios-spinner-svg {
    width: 100%;
    height: 100%;
    animation: ios-rotate 1s linear infinite;
}

.ios-spinner-svg circle {
    animation: ios-dash 1.5s ease-in-out infinite;
}

@keyframes ios-rotate {
    100% {
        transform: rotate(360deg);
    }
}

@keyframes ios-dash {
    0% {
        stroke-dasharray: 1, 150;
        stroke-dashoffset: 0;
    }
    50% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -35;
    }
    100% {
        stroke-dasharray: 90, 150;
        stroke-dashoffset: -124;
    }
}

/* 普通旋转器 */
.spinner {
    width: 100%;
    height: 100%;
    position: relative;
}

.spinner-circle {
    width: 100%;
    height: 100%;
    border: 3px solid var(--n-border-color);
    border-top: 3px solid var(--n-primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

/* 点跳动 */
.dots {
    display: flex;
    gap: 4px;
    align-items: center;
}

.dot {
    width: 6px;
    height: 6px;
    background: var(--n-primary-color);
    border-radius: 50%;
    animation: dot-bounce 1.4s ease-in-out infinite both;
}

@keyframes dot-bounce {
    0%,
    80%,
    100% {
        transform: scale(0);
    }
    40% {
        transform: scale(1);
    }
}

/* 脉冲圆圈 */
.pulse {
    position: relative;
    width: 100%;
    height: 100%;
}

.pulse-circle {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    border: 2px solid var(--n-primary-color);
    border-radius: 50%;
    animation: pulse-animation 2s ease-in-out infinite;
}

.pulse-circle:nth-child(2) {
    animation-delay: 1s;
}

@keyframes pulse-animation {
    0% {
        transform: scale(0);
        opacity: 1;
    }
    100% {
        transform: scale(1);
        opacity: 0;
    }
}

/* 波浪 */
.wave {
    display: flex;
    gap: 2px;
    align-items: end;
    height: 100%;
}

.wave-bar {
    width: 4px;
    height: 40%;
    background: var(--n-primary-color);
    border-radius: 2px;
    animation: wave-animation 1.2s ease-in-out infinite;
}

@keyframes wave-animation {
    0%,
    40%,
    100% {
        transform: scaleY(0.4);
    }
    20% {
        transform: scaleY(1);
    }
}

/* 骨架屏 */
.skeleton {
    width: 100px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.skeleton-line {
    height: 12px;
    background: linear-gradient(
        90deg,
        var(--n-border-color) 25%,
        rgba(255, 255, 255, 0.5) 50%,
        var(--n-border-color) 75%
    );
    background-size: 200% 100%;
    border-radius: 6px;
    animation: skeleton-loading 1.5s ease-in-out infinite;
}

.skeleton-line.short {
    width: 60%;
}

@keyframes skeleton-loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

/* 自定义图标 */
.custom-icon {
    display: flex;
    align-items: center;
    justify-content: center;
}

.rotating {
    animation: rotate 2s linear infinite;
}

@keyframes rotate {
    from {
        transform: rotate(0deg);
    }
    to {
        transform: rotate(360deg);
    }
}

/* 加载文本 */
.loading-text {
    font-size: 14px;
    color: var(--n-text-color-2);
    text-align: center;
    font-weight: 500;
    white-space: nowrap;
}

.mobile-loading.size-small .loading-text {
    font-size: 12px;
}

.mobile-loading.size-large .loading-text {
    font-size: 16px;
}

/* 进度条 */
.loading-progress {
    width: 150px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: center;
}

.progress-bar {
    width: 100%;
    height: 4px;
    background: var(--n-border-color);
    border-radius: 2px;
    overflow: hidden;
}

.progress-fill {
    height: 100%;
    background: var(--n-primary-color);
    border-radius: 2px;
    transition: width 0.3s ease;
}

.progress-text {
    font-size: 12px;
    color: var(--n-text-color-3);
    font-weight: 600;
}

/* 深色模式适配 */
.dark-theme .mobile-loading.overlay {
    background: rgba(0, 0, 0, 0.7);
}

.dark-theme .loading-content {
    background: rgba(28, 28, 30, 0.95);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.light-theme .mobile-loading.overlay {
    background: rgba(255, 255, 255, 0.7);
}

.light-theme .loading-content {
    background: rgba(255, 255, 255, 0.95);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

/* 移动端适配 */
@media (max-width: 375px) {
    .loading-content {
        padding: 20px;
    }

    .mobile-loading.size-small .loading-content {
        padding: 12px;
    }

    .loading-progress {
        width: 120px;
    }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
    .ios-spinner-svg,
    .spinner-circle,
    .dot,
    .pulse-circle,
    .wave-bar,
    .skeleton-line,
    .rotating {
        animation-duration: 3s;
    }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
    .loading-icon {
        filter: contrast(1.2);
    }
}

/* 聚焦可见性 */
.mobile-loading:focus-within {
    outline: 2px solid var(--n-primary-color);
    outline-offset: 2px;
}
</style>
