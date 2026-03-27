<template>
    <NModal
        v-model:show="modalVisible"
        :mask-closable="maskClosable"
        :close-on-esc="closeOnEsc"
        :auto-focus="autoFocus"
        :trap-focus="trapFocus"
        transform-origin="center"
        class="mobile-modal"
        :class="`modal-${size}`"
    >
        <div
            class="modal-container"
            :class="{
                'modal-fullscreen': fullscreen,
                'modal-bottom-sheet': bottomSheet,
                'dark-theme': appStore.currentTheme === 'dark',
                'light-theme': appStore.currentTheme === 'light',
                'is-ios': appStore.isIOS,
                [`modal-${type}`]: true,
            }"
        >
            <!-- 顶部拖拽条（仅 bottomSheet 模式） -->
            <div v-if="bottomSheet && showDragHandle" class="modal-drag-handle">
                <div class="drag-indicator" />
            </div>

            <!-- 头部 -->
            <div v-if="showHeader" class="modal-header" :class="{ 'no-border': !showHeaderBorder }">
                <div class="modal-title-area">
                    <h2 v-if="title" class="modal-title">{{ title }}</h2>
                    <p v-if="subtitle" class="modal-subtitle">{{ subtitle }}</p>
                    <slot name="header" />
                </div>

                <div v-if="showCloseButton" class="modal-close">
                    <NButton quaternary circle size="medium" @click="handleClose">
                        <template #icon>
                            <NIcon size="20">
                                <Close />
                            </NIcon>
                        </template>
                    </NButton>
                </div>
            </div>

            <!-- 内容区域 -->
            <div
                class="modal-content"
                :class="{
                    scrollable: scrollable,
                    'no-padding': noPadding,
                }"
            >
                <slot />
            </div>

            <!-- 底部操作区 -->
            <div
                v-if="showFooter || $slots.footer"
                class="modal-footer"
                :class="{ 'no-border': !showFooterBorder }"
            >
                <slot name="footer">
                    <div class="modal-actions">
                        <NButton
                            v-if="showCancelButton"
                            :size="buttonSize"
                            :disabled="loading"
                            @click="handleCancel"
                        >
                            {{ cancelText }}
                        </NButton>

                        <NButton
                            v-if="showConfirmButton"
                            :type="confirmType"
                            :size="buttonSize"
                            :loading="loading"
                            @click="handleConfirm"
                        >
                            {{ confirmText }}
                        </NButton>
                    </div>
                </slot>
            </div>
        </div>
    </NModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { NModal, NButton, NIcon } from 'naive-ui';
import { Close } from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

interface Props {
    show?: boolean;
    title?: string;
    subtitle?: string;
    type?: 'default' | 'info' | 'success' | 'warning' | 'error';
    size?: 'small' | 'medium' | 'large' | 'auto';
    fullscreen?: boolean;
    bottomSheet?: boolean;
    showHeader?: boolean;
    showFooter?: boolean;
    showHeaderBorder?: boolean;
    showFooterBorder?: boolean;
    showCloseButton?: boolean;
    showDragHandle?: boolean;
    showCancelButton?: boolean;
    showConfirmButton?: boolean;
    cancelText?: string;
    confirmText?: string;
    confirmType?: 'primary' | 'success' | 'warning' | 'error';
    buttonSize?: 'small' | 'medium' | 'large';
    maskClosable?: boolean;
    closeOnEsc?: boolean;
    autoFocus?: boolean;
    trapFocus?: boolean;
    scrollable?: boolean;
    noPadding?: boolean;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    show: false,
    title: '',
    subtitle: '',
    type: 'default',
    size: 'medium',
    fullscreen: false,
    bottomSheet: false,
    showHeader: true,
    showFooter: false,
    showHeaderBorder: true,
    showFooterBorder: true,
    showCloseButton: true,
    showDragHandle: true,
    showCancelButton: true,
    showConfirmButton: true,
    cancelText: '取消',
    confirmText: '确定',
    confirmType: 'primary',
    buttonSize: 'large',
    maskClosable: true,
    closeOnEsc: true,
    autoFocus: true,
    trapFocus: true,
    scrollable: true,
    noPadding: false,
    loading: false,
});

const emit = defineEmits<{
    'update:show': [show: boolean];
    close: [];
    cancel: [];
    confirm: [];
    maskClick: [];
    escPress: [];
}>();

const appStore = useAppStore();

const modalVisible = computed({
    get: () => props.show,
    set: (value: boolean) => {
        emit('update:show', value);
        if (!value) {
            emit('close');
        }
    },
});

const handleClose = () => {
    appStore.hapticFeedback('light');
    modalVisible.value = false;
};

const handleCancel = () => {
    appStore.hapticFeedback('light');
    emit('cancel');
    modalVisible.value = false;
};

const handleConfirm = () => {
    appStore.hapticFeedback('light');
    emit('confirm');
};

// 监听键盘事件
watch(modalVisible, visible => {
    if (visible) {
        document.addEventListener('keydown', handleKeydown);
    } else {
        document.removeEventListener('keydown', handleKeydown);
    }
});

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && props.closeOnEsc) {
        emit('escPress');
        handleClose();
    }
};
</script>

<style scoped>
/* 模态框容器 */
.mobile-modal :deep(.n-modal) {
    padding: 16px;
}

.modal-container {
    background: var(--n-card-color);
    border-radius: 20px;
    overflow: hidden;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    position: relative;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 尺寸变体 */
.modal-small .modal-container {
    width: 90vw;
    max-width: 320px;
}

.modal-medium .modal-container {
    width: 90vw;
    max-width: 400px;
}

.modal-large .modal-container {
    width: 90vw;
    max-width: 500px;
}

.modal-auto .modal-container {
    width: auto;
    min-width: 280px;
    max-width: 90vw;
}

/* 全屏模态框 */
.modal-fullscreen {
    width: 100vw !important;
    height: 100vh !important;
    max-width: none !important;
    max-height: none !important;
    border-radius: 0 !important;
    margin: 0 !important;
}

.modal-fullscreen .mobile-modal :deep(.n-modal) {
    padding: 0;
}

/* 底部抽屉样式 */
.modal-bottom-sheet {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    width: 100% !important;
    max-width: none !important;
    border-radius: 20px 20px 0 0 !important;
    margin: 0 !important;
    transform: translateY(0);
    animation: slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

@keyframes slideUp {
    from {
        transform: translateY(100%);
    }
    to {
        transform: translateY(0);
    }
}

/* 拖拽手柄 */
.modal-drag-handle {
    padding: 8px 0 4px 0;
    display: flex;
    justify-content: center;
    cursor: grab;
}

.drag-indicator {
    width: 40px;
    height: 4px;
    background: var(--n-text-color-3);
    border-radius: 2px;
    transition: background-color 0.2s ease;
}

.modal-drag-handle:hover .drag-indicator {
    background: var(--n-text-color-2);
}

/* 头部 */
.modal-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 20px 20px 16px 20px;
    border-bottom: 0.5px solid var(--n-border-color);
    flex-shrink: 0;
}

.modal-header.no-border {
    border-bottom: none;
    padding-bottom: 8px;
}

.modal-title-area {
    flex: 1;
    min-width: 0;
}

.modal-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
    line-height: 1.3;
}

.modal-subtitle {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0;
    line-height: 1.4;
}

.modal-close {
    margin-left: 16px;
    flex-shrink: 0;
}

/* 内容区域 */
.modal-content {
    flex: 1;
    min-height: 0;
    padding: 20px;
}

.modal-content.scrollable {
    overflow-y: auto;
    overflow-x: hidden;
}

.modal-content.no-padding {
    padding: 0;
}

/* 底部操作区 */
.modal-footer {
    padding: 16px 20px 20px 20px;
    border-top: 0.5px solid var(--n-border-color);
    flex-shrink: 0;
}

.modal-footer.no-border {
    border-top: none;
    padding-top: 8px;
}

.modal-actions {
    display: flex;
    gap: 12px;
}

.modal-actions .n-button {
    flex: 1;
    height: 50px;
    border-radius: 12px;
    font-size: 17px;
    font-weight: 600;
}

/* 模态框类型样式 */
.modal-info .modal-title {
    color: var(--n-info-color);
}

.modal-success .modal-title {
    color: var(--n-success-color);
}

.modal-warning .modal-title {
    color: var(--n-warning-color);
}

.modal-error .modal-title {
    color: var(--n-error-color);
}

/* 深色模式适配 */
.modal-container.dark-theme {
    background: rgba(28, 28, 30, 1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.modal-container.light-theme {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
}

/* 移动端响应式 */
@media (max-width: 375px) {
    .mobile-modal :deep(.n-modal) {
        padding: 12px;
    }

    .modal-header {
        padding: 16px 16px 12px 16px;
    }

    .modal-content {
        padding: 16px;
    }

    .modal-footer {
        padding: 12px 16px 16px 16px;
    }

    .modal-title {
        font-size: 18px;
    }

    .modal-actions .n-button {
        height: 46px;
        font-size: 16px;
    }
}

/* iOS 安全区域适配 */
.modal-fullscreen.is-ios {
    padding-top: var(--status-bar-height, 44px);
    padding-bottom: var(--safe-area-bottom, 34px);
}

.modal-bottom-sheet.is-ios {
    padding-bottom: var(--safe-area-bottom, 34px);
}

/* 自定义滚动条 */
.modal-content.scrollable::-webkit-scrollbar {
    width: 4px;
}

.modal-content.scrollable::-webkit-scrollbar-track {
    background: transparent;
}

.modal-content.scrollable::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.1);
    border-radius: 2px;
}

.modal-container.dark-theme .modal-content.scrollable::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.1);
}

/* 加载状态 */
.modal-actions .n-button[loading] {
    pointer-events: none;
}

/* 动画优化 */
.mobile-modal :deep(.n-modal-container) {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mobile-modal :deep(.n-modal-mask) {
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
}
</style>
