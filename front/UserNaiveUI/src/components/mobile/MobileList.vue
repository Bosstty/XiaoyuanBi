<template>
    <div class="mobile-list" :class="{ 'no-border': !showBorder }">
        <div
            v-for="(item, index) in items"
            :key="getItemKey(item, index)"
            class="list-item"
            :class="{
                'list-item-clickable': item.clickable !== false,
                'list-item-disabled': item.disabled,
                'has-divider': showDivider && index < items.length - 1,
            }"
            @click="handleItemClick(item, index)"
        >
            <!-- 左侧图标 -->
            <div v-if="item.icon || $slots.icon" class="list-item-prefix">
                <slot name="icon" :item="item" :index="index">
                    <div class="list-item-icon" :class="item.iconClass">
                        <NIcon :size="item.iconSize || 22" :color="item.iconColor">
                            <component :is="item.icon" />
                        </NIcon>
                    </div>
                </slot>
            </div>

            <!-- 主要内容 -->
            <div class="list-item-content">
                <div class="list-item-main">
                    <!-- 标题 -->
                    <div
                        class="list-item-title"
                        :class="{ 'list-item-title-large': item.titleLarge }"
                    >
                        <slot name="title" :item="item" :index="index">
                            {{ item.title }}
                        </slot>
                    </div>

                    <!-- 描述 -->
                    <div
                        v-if="item.description || $slots.description"
                        class="list-item-description"
                    >
                        <slot name="description" :item="item" :index="index">
                            {{ item.description }}
                        </slot>
                    </div>
                </div>

                <!-- 右侧内容 -->
                <div v-if="item.extra || item.showArrow || $slots.extra" class="list-item-suffix">
                    <slot name="extra" :item="item" :index="index">
                        <span v-if="item.extra" class="list-item-extra">{{ item.extra }}</span>
                    </slot>

                    <!-- 箭头图标 -->
                    <NIcon
                        v-if="item.showArrow !== false && item.clickable !== false"
                        size="16"
                        class="list-item-arrow"
                        :class="{ 'arrow-disabled': item.disabled }"
                    >
                        <ChevronForward />
                    </NIcon>
                </div>
            </div>

            <!-- 右侧按钮/操作 -->
            <div v-if="item.actions || $slots.actions" class="list-item-actions">
                <slot name="actions" :item="item" :index="index">
                    <div v-for="action in item.actions" :key="action.key" class="list-action">
                        <NButton
                            :type="action.type || 'default'"
                            :size="action.size || 'small'"
                            :disabled="action.disabled || item.disabled"
                            @click.stop="handleActionClick(action, item, index)"
                        >
                            {{ action.label }}
                        </NButton>
                    </div>
                </slot>
            </div>
        </div>

        <!-- 空状态 -->
        <div v-if="items.length === 0" class="list-empty">
            <slot name="empty">
                <div class="empty-content">
                    <NIcon size="48" color="var(--n-text-color-3)">
                        <DocumentTextOutline />
                    </NIcon>
                    <p class="empty-text">{{ emptyText }}</p>
                </div>
            </slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { NIcon, NButton } from 'naive-ui';
import { ChevronForward, DocumentTextOutline } from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

interface ListAction {
    key: string;
    label: string;
    type?: 'primary' | 'success' | 'warning' | 'error' | 'default';
    size?: 'tiny' | 'small' | 'medium' | 'large';
    disabled?: boolean;
    handler?: (action: ListAction, item: ListItem, index: number) => void;
}

interface ListItem {
    id?: string | number;
    title: string;
    description?: string;
    titleLarge?: boolean;
    icon?: any;
    iconSize?: number;
    iconColor?: string;
    iconClass?: string;
    extra?: string;
    showArrow?: boolean;
    clickable?: boolean;
    disabled?: boolean;
    actions?: ListAction[];
    [key: string]: any;
}

interface Props {
    items: ListItem[];
    showBorder?: boolean;
    showDivider?: boolean;
    keyField?: string;
    emptyText?: string;
}

const props = withDefaults(defineProps<Props>(), {
    items: () => [],
    showBorder: true,
    showDivider: true,
    keyField: 'id',
    emptyText: '暂无数据',
});

const emit = defineEmits<{
    itemClick: [item: ListItem, index: number];
    actionClick: [action: ListAction, item: ListItem, index: number];
}>();

const appStore = useAppStore();

const getItemKey = (item: ListItem, index: number) => {
    return item[props.keyField] || index;
};

const handleItemClick = (item: ListItem, index: number) => {
    if (item.disabled || item.clickable === false) return;

    appStore.hapticFeedback('light');
    emit('itemClick', item, index);
};

const handleActionClick = (action: ListAction, item: ListItem, index: number) => {
    if (action.disabled || item.disabled) return;

    appStore.hapticFeedback('light');

    if (action.handler) {
        action.handler(action, item, index);
    }

    emit('actionClick', action, item, index);
};
</script>

<style scoped>
.mobile-list {
    background: var(--n-card-color);
    border-radius: 16px;
    overflow: hidden;
    border: 0.5px solid var(--n-border-color);
}

.mobile-list.no-border {
    border: none;
    border-radius: 0;
}

.list-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    transition: all 0.2s ease;
    position: relative;
    min-height: 52px;
}

.list-item.has-divider::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 16px;
    right: 16px;
    height: 0.5px;
    background: var(--n-border-color);
}

.list-item-clickable {
    cursor: pointer;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.list-item-clickable:active {
    background: var(--n-border-color);
    transform: scale(0.98);
}

.list-item-disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.list-item-disabled:active {
    background: transparent;
    transform: none;
}

.list-item-prefix {
    margin-right: 12px;
    flex-shrink: 0;
}

.list-item-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--n-primary-color-suppl);
    color: var(--n-primary-color);
}

.list-item-content {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
}

.list-item-main {
    flex: 1;
    min-width: 0;
}

.list-item-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--n-text-color-1);
    line-height: 1.4;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.list-item-title-large {
    font-size: 18px;
    font-weight: 600;
}

.list-item-description {
    font-size: 14px;
    color: var(--n-text-color-2);
    line-height: 1.4;
    margin-top: 2px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.list-item-suffix {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-left: 12px;
    flex-shrink: 0;
}

.list-item-extra {
    font-size: 14px;
    color: var(--n-text-color-2);
    white-space: nowrap;
}

.list-item-arrow {
    color: var(--n-text-color-3);
    transition: color 0.2s ease;
}

.list-item-clickable:hover .list-item-arrow {
    color: var(--n-text-color-2);
}

.arrow-disabled {
    opacity: 0.3;
}

.list-item-actions {
    display: flex;
    gap: 8px;
    margin-left: 12px;
    flex-shrink: 0;
}

.list-action {
    flex-shrink: 0;
}

/* 空状态 */
.list-empty {
    padding: 40px 20px;
    text-align: center;
}

.empty-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.empty-text {
    font-size: 14px;
    color: var(--n-text-color-3);
    margin: 0;
}

/* 深色模式适配 */
.dark-theme .mobile-list {
    background: rgba(28, 28, 30, 1);
    border-color: rgba(56, 56, 58, 1);
}

.dark-theme .list-item-clickable:active {
    background: rgba(56, 56, 58, 0.6);
}

.light-theme .mobile-list {
    background: rgba(255, 255, 255, 1);
    border-color: rgba(198, 198, 200, 1);
}

.light-theme .list-item-clickable:active {
    background: rgba(198, 198, 200, 0.3);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .list-item {
        padding: 10px 12px;
    }

    .list-item-title {
        font-size: 15px;
    }

    .list-item-description {
        font-size: 13px;
    }
}
</style>
