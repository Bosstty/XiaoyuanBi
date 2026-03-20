<template>
    <div class="mobile-empty" :class="[`size-${size}`, { 'full-height': fullHeight }]">
        <div class="empty-content">
            <!-- 图标或插图 -->
            <div class="empty-icon" :class="{ 'custom-icon': !!icon }">
                <slot name="icon">
                    <NIcon v-if="icon" :size="iconSize" :color="iconColor">
                        <component :is="icon" />
                    </NIcon>
                    <div v-else class="default-illustration" :class="type">
                        <svg v-if="type === 'data'" viewBox="0 0 64 64" fill="none">
                            <rect
                                x="8"
                                y="16"
                                width="48"
                                height="32"
                                rx="4"
                                fill="currentColor"
                                opacity="0.1"
                            />
                            <rect
                                x="12"
                                y="24"
                                width="8"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="12"
                                y="28"
                                width="12"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="12"
                                y="32"
                                width="6"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="12"
                                y="36"
                                width="10"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="12"
                                y="40"
                                width="8"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                        </svg>

                        <svg v-else-if="type === 'search'" viewBox="0 0 64 64" fill="none">
                            <circle
                                cx="26"
                                cy="26"
                                r="12"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <path
                                d="35 35L42 42"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                opacity="0.3"
                            />
                            <circle cx="26" cy="26" r="6" fill="currentColor" opacity="0.1" />
                        </svg>

                        <svg v-else-if="type === 'network'" viewBox="0 0 64 64" fill="none">
                            <path
                                d="M32 8C24 8 16 16 16 32C16 48 24 56 32 56C40 56 48 48 48 32C48 16 40 8 32 8Z"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <path
                                d="M32 16C28 16 24 20 24 32C24 44 28 48 32 48C36 48 40 44 40 32C40 20 36 16 32 16Z"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <line
                                x1="8"
                                y1="32"
                                x2="56"
                                y2="32"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <line
                                x1="32"
                                y1="8"
                                x2="32"
                                y2="56"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                        </svg>

                        <svg v-else-if="type === 'permission'" viewBox="0 0 64 64" fill="none">
                            <rect
                                x="20"
                                y="24"
                                width="24"
                                height="24"
                                rx="2"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <rect
                                x="24"
                                y="28"
                                width="16"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="24"
                                y="32"
                                width="12"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <rect
                                x="24"
                                y="36"
                                width="14"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.3"
                            />
                            <path
                                d="M22 24V20C22 16 26 12 32 12C38 12 42 16 42 20V24"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <circle cx="32" cy="38" r="2" fill="currentColor" opacity="0.5" />
                        </svg>

                        <svg v-else viewBox="0 0 64 64" fill="none">
                            <rect
                                x="16"
                                y="20"
                                width="32"
                                height="24"
                                rx="2"
                                stroke="currentColor"
                                stroke-width="2"
                                opacity="0.3"
                            />
                            <rect
                                x="20"
                                y="24"
                                width="6"
                                height="4"
                                rx="1"
                                fill="currentColor"
                                opacity="0.2"
                            />
                            <rect
                                x="28"
                                y="24"
                                width="8"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.2"
                            />
                            <rect
                                x="20"
                                y="30"
                                width="12"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.2"
                            />
                            <rect
                                x="20"
                                y="34"
                                width="8"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.2"
                            />
                            <rect
                                x="20"
                                y="38"
                                width="10"
                                height="2"
                                rx="1"
                                fill="currentColor"
                                opacity="0.2"
                            />
                        </svg>
                    </div>
                </slot>
            </div>

            <!-- 标题 -->
            <h3 v-if="title || $slots.title" class="empty-title">
                <slot name="title">{{ title }}</slot>
            </h3>

            <!-- 描述 -->
            <p v-if="description || $slots.description" class="empty-description">
                <slot name="description">{{ description }}</slot>
            </p>

            <!-- 操作按钮 -->
            <div v-if="showAction && (actionText || $slots.action)" class="empty-action">
                <slot name="action">
                    <NButton
                        :type="actionType"
                        :size="actionSize"
                        :loading="actionLoading"
                        :disabled="actionDisabled"
                        @click="handleAction"
                    >
                        <template v-if="actionIcon" #icon>
                            <NIcon>
                                <component :is="actionIcon" />
                            </NIcon>
                        </template>
                        {{ actionText }}
                    </NButton>
                </slot>
            </div>

            <!-- 自定义内容 -->
            <div v-if="$slots.extra" class="empty-extra">
                <slot name="extra" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NButton } from 'naive-ui';
import { useAppStore } from '@/stores';

interface Props {
    type?: 'default' | 'data' | 'search' | 'network' | 'permission';
    size?: 'small' | 'medium' | 'large';
    title?: string;
    description?: string;
    icon?: any;
    iconSize?: number;
    iconColor?: string;
    fullHeight?: boolean;
    showAction?: boolean;
    actionText?: string;
    actionType?: 'primary' | 'success' | 'warning' | 'error' | 'default';
    actionSize?: 'small' | 'medium' | 'large';
    actionIcon?: any;
    actionLoading?: boolean;
    actionDisabled?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    type: 'default',
    size: 'medium',
    title: '',
    description: '',
    icon: null,
    iconSize: 64,
    iconColor: 'var(--n-text-color-3)',
    fullHeight: false,
    showAction: false,
    actionText: '重试',
    actionType: 'primary',
    actionSize: 'medium',
    actionIcon: null,
    actionLoading: false,
    actionDisabled: false,
});

const emit = defineEmits<{
    action: [];
}>();

const appStore = useAppStore();

// 根据类型获取默认文案
const defaultContent = computed(() => {
    const contentMap = {
        default: {
            title: '暂无内容',
            description: '这里还没有任何内容',
        },
        data: {
            title: '暂无数据',
            description: '当前没有可显示的数据',
        },
        search: {
            title: '暂无搜索结果',
            description: '尝试调整搜索条件或关键词',
        },
        network: {
            title: '网络连接失败',
            description: '请检查网络设置后重试',
        },
        permission: {
            title: '权限不足',
            description: '您暂无访问此内容的权限',
        },
    };

    return contentMap[props.type] || contentMap.default;
});

const finalTitle = computed(() => props.title || defaultContent.value.title);
const finalDescription = computed(() => props.description || defaultContent.value.description);

const handleAction = () => {
    appStore.hapticFeedback('light');
    emit('action');
};
</script>

<style scoped>
.mobile-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    min-height: 200px;
    padding: 24px;
}

.mobile-empty.full-height {
    min-height: 50vh;
}

.mobile-empty.size-small {
    min-height: 120px;
    padding: 16px;
}

.mobile-empty.size-large {
    min-height: 300px;
    padding: 32px;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    max-width: 300px;
    width: 100%;
}

/* 图标区域 */
.empty-icon {
    margin-bottom: 16px;
    color: var(--n-text-color-3);
    opacity: 0.6;
}

.empty-icon.custom-icon {
    opacity: 1;
}

.default-illustration {
    width: 64px;
    height: 64px;
    color: var(--n-text-color-3);
}

.size-small .default-illustration {
    width: 48px;
    height: 48px;
}

.size-large .default-illustration {
    width: 80px;
    height: 80px;
}

/* 不同类型的颜色 */
.default-illustration.search {
    color: var(--n-info-color);
}

.default-illustration.network {
    color: var(--n-warning-color);
}

.default-illustration.permission {
    color: var(--n-error-color);
}

.default-illustration.data {
    color: var(--n-text-color-3);
}

/* 标题 */
.empty-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.size-small .empty-title {
    font-size: 16px;
    margin-bottom: 4px;
}

.size-large .empty-title {
    font-size: 20px;
    margin-bottom: 12px;
}

/* 描述 */
.empty-description {
    font-size: 14px;
    color: var(--n-text-color-2);
    line-height: 1.5;
    margin: 0 0 20px 0;
}

.size-small .empty-description {
    font-size: 13px;
    margin-bottom: 16px;
}

.size-large .empty-description {
    font-size: 15px;
    margin-bottom: 24px;
}

/* 操作按钮 */
.empty-action {
    margin-bottom: 16px;
}

.empty-action .n-button {
    border-radius: 12px;
    font-weight: 600;
    min-width: 100px;
}

.size-small .empty-action .n-button {
    min-width: 80px;
}

.size-large .empty-action .n-button {
    min-width: 120px;
}

/* 额外内容 */
.empty-extra {
    width: 100%;
}

/* 动画效果 */
.empty-icon {
    animation: empty-fade-in 0.6s ease-out;
}

.empty-title,
.empty-description {
    animation: empty-slide-up 0.6s ease-out;
}

.empty-action {
    animation: empty-slide-up 0.6s ease-out 0.1s both;
}

@keyframes empty-fade-in {
    from {
        opacity: 0;
        transform: scale(0.8);
    }
    to {
        opacity: 0.6;
        transform: scale(1);
    }
}

@keyframes empty-slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 深色模式适配 */
.dark-theme .default-illustration {
    opacity: 0.8;
}

.light-theme .default-illustration {
    opacity: 0.6;
}

/* 移动端适配 */
@media (max-width: 375px) {
    .mobile-empty {
        padding: 20px 16px;
        min-height: 180px;
    }

    .mobile-empty.size-small {
        padding: 12px;
        min-height: 100px;
    }

    .empty-content {
        max-width: 280px;
    }

    .empty-title {
        font-size: 16px;
    }

    .empty-description {
        font-size: 13px;
    }

    .default-illustration {
        width: 56px;
        height: 56px;
    }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
    .empty-icon {
        opacity: 1;
    }

    .default-illustration {
        opacity: 1;
    }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
    .empty-icon,
    .empty-title,
    .empty-description,
    .empty-action {
        animation: none;
    }
}

/* 状态指示器 */
.empty-icon::before {
    content: '';
    position: absolute;
    top: -4px;
    right: -4px;
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: currentColor;
    opacity: 0;
    animation: status-pulse 2s infinite;
}

.default-illustration.network::before {
    opacity: 1;
    background: var(--n-error-color);
}

@keyframes status-pulse {
    0%,
    100% {
        opacity: 0;
        transform: scale(0.8);
    }
    50% {
        opacity: 0.6;
        transform: scale(1.2);
    }
}
</style>
