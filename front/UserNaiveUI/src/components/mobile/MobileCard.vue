<template>
    <div
        class="mobile-card"
        :class="{
            hoverable: hoverable,
            clickable: clickable,
            [`size-${size}`]: true,
            [`shadow-${shadow}`]: true,
        }"
        @click="handleClick"
    >
        <div v-if="$slots.header" class="card-header">
            <slot name="header" />
        </div>

        <div class="card-content">
            <slot />
        </div>

        <div v-if="$slots.footer" class="card-footer">
            <slot name="footer" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores';

interface Props {
    hoverable?: boolean;
    clickable?: boolean;
    size?: 'small' | 'medium' | 'large';
    shadow?: 'none' | 'small' | 'medium' | 'large';
    padding?: string;
}

const props = withDefaults(defineProps<Props>(), {
    hoverable: false,
    clickable: false,
    size: 'medium',
    shadow: 'small',
    padding: '',
});

const emit = defineEmits<{
    click: [event: MouseEvent];
}>();

const appStore = useAppStore();

const handleClick = (event: MouseEvent) => {
    if (props.clickable) {
        appStore.hapticFeedback('light');
    }
    emit('click', event);
};
</script>

<style scoped>
.mobile-card {
    background: var(--n-card-color);
    border-radius: 16px;
    overflow: hidden;
    transition: all 0.3s ease;
    border: 0.5px solid var(--n-border-color);
}

/* 尺寸 */
.mobile-card.size-small {
    border-radius: 12px;
}

.mobile-card.size-medium {
    border-radius: 16px;
}

.mobile-card.size-large {
    border-radius: 20px;
}

/* 阴影 */
.mobile-card.shadow-none {
    box-shadow: none;
}

.mobile-card.shadow-small {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.mobile-card.shadow-medium {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.mobile-card.shadow-large {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

/* 交互状态 */
.mobile-card.hoverable:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.mobile-card.clickable {
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.mobile-card.clickable:active {
    transform: scale(0.98);
    opacity: 0.9;
}

/* 卡片内容 */
.card-header {
    padding: 16px 16px 0 16px;
    border-bottom: 0.5px solid var(--n-border-color);
    margin-bottom: 16px;
}

.card-content {
    padding: v-bind(padding || '16px');
}

.card-footer {
    padding: 0 16px 16px 16px;
    border-top: 0.5px solid var(--n-border-color);
    margin-top: 16px;
}

/* 深色模式 */
.dark-theme .mobile-card {
    background: rgba(28, 28, 30, 1);
    border-color: rgba(56, 56, 58, 1);
}

.dark-theme .mobile-card.shadow-small {
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.dark-theme .mobile-card.shadow-medium {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.dark-theme .mobile-card.shadow-large {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
}

.dark-theme .mobile-card.hoverable:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

/* 浅色模式 */
.light-theme .mobile-card {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(198, 198, 200, 1);
}

/* 加载状态 */
.mobile-card.loading {
    pointer-events: none;
    opacity: 0.7;
}

.mobile-card.loading::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent);
    animation: loading-shimmer 1.5s infinite;
}

@keyframes loading-shimmer {
    0% {
        transform: translateX(-100%);
    }
    100% {
        transform: translateX(100%);
    }
}
</style>
