<template>
    <div class="mobile-skeleton" :class="{ animated: animated }">
        <!-- 预设布局 -->
        <template v-if="preset === 'card'">
            <div class="skeleton-card">
                <div class="skeleton-avatar" />
                <div class="skeleton-content">
                    <div class="skeleton-title" />
                    <div class="skeleton-text" />
                    <div class="skeleton-text short" />
                </div>
            </div>
        </template>

        <template v-else-if="preset === 'list'">
            <div v-for="i in rows" :key="i" class="skeleton-list-item">
                <div class="skeleton-avatar small" />
                <div class="skeleton-content">
                    <div class="skeleton-title small" />
                    <div class="skeleton-text" />
                </div>
            </div>
        </template>

        <template v-else-if="preset === 'article'">
            <div class="skeleton-article">
                <div class="skeleton-title large" />
                <div class="skeleton-meta">
                    <div class="skeleton-avatar tiny" />
                    <div class="skeleton-text mini" />
                </div>
                <div class="skeleton-image" />
                <div v-for="i in 4" :key="i" class="skeleton-text" />
                <div class="skeleton-text short" />
            </div>
        </template>

        <template v-else-if="preset === 'profile'">
            <div class="skeleton-profile">
                <div class="skeleton-avatar large" />
                <div class="skeleton-title" />
                <div class="skeleton-text short" />
                <div class="skeleton-stats">
                    <div v-for="i in 3" :key="i" class="skeleton-stat">
                        <div class="skeleton-number" />
                        <div class="skeleton-label" />
                    </div>
                </div>
            </div>
        </template>

        <!-- 自定义布局 -->
        <template v-else>
            <slot>
                <div v-for="i in rows" :key="i" class="skeleton-row">
                    <div
                        v-for="j in cols"
                        :key="j"
                        class="skeleton-block"
                        :style="{
                            width: getBlockWidth(j),
                            height: height,
                        }"
                    />
                </div>
            </slot>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

interface Props {
    preset?: 'card' | 'list' | 'article' | 'profile' | 'custom';
    rows?: number;
    cols?: number;
    height?: string;
    animated?: boolean;
    loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
    preset: 'custom',
    rows: 3,
    cols: 1,
    height: '20px',
    animated: true,
    loading: true,
});

const getBlockWidth = (index: number) => {
    if (props.cols === 1) return '100%';

    // 随机宽度变化，模拟真实内容
    const widths = ['100%', '85%', '92%', '78%', '96%'];
    return widths[index % widths.length];
};
</script>

<style scoped>
.mobile-skeleton {
    display: block;
    width: 100%;
}

/* 基础骨架块 */
.skeleton-block,
.skeleton-avatar,
.skeleton-title,
.skeleton-text,
.skeleton-image,
.skeleton-number,
.skeleton-label {
    background: linear-gradient(
        90deg,
        var(--skeleton-color) 25%,
        var(--skeleton-shine-color) 50%,
        var(--skeleton-color) 75%
    );
    background-size: 200% 100%;
    border-radius: 8px;
    display: block;
}

/* 动画效果 */
.mobile-skeleton.animated .skeleton-block,
.mobile-skeleton.animated .skeleton-avatar,
.mobile-skeleton.animated .skeleton-title,
.mobile-skeleton.animated .skeleton-text,
.mobile-skeleton.animated .skeleton-image,
.mobile-skeleton.animated .skeleton-number,
.mobile-skeleton.animated .skeleton-label {
    animation: skeleton-loading 1.5s ease-in-out infinite;
}

@keyframes skeleton-loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

/* 基础行布局 */
.skeleton-row {
    display: flex;
    flex-direction: column;
    gap: 12px;
    margin-bottom: 16px;
}

.skeleton-row:last-child {
    margin-bottom: 0;
}

.skeleton-block {
    width: 100%;
    height: 20px;
}

/* 头像变体 */
.skeleton-avatar {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    flex-shrink: 0;
}

.skeleton-avatar.tiny {
    width: 24px;
    height: 24px;
}

.skeleton-avatar.small {
    width: 36px;
    height: 36px;
}

.skeleton-avatar.large {
    width: 72px;
    height: 72px;
}

/* 标题变体 */
.skeleton-title {
    height: 24px;
    width: 70%;
    border-radius: 6px;
}

.skeleton-title.small {
    height: 18px;
    width: 60%;
}

.skeleton-title.large {
    height: 32px;
    width: 85%;
}

/* 文本变体 */
.skeleton-text {
    height: 16px;
    width: 100%;
    margin: 8px 0;
    border-radius: 4px;
}

.skeleton-text.short {
    width: 60%;
}

.skeleton-text.mini {
    height: 12px;
    width: 40%;
}

/* 图片 */
.skeleton-image {
    width: 100%;
    height: 200px;
    border-radius: 12px;
    margin: 16px 0;
}

/* 数字和标签 */
.skeleton-number {
    height: 24px;
    width: 40px;
    margin-bottom: 4px;
}

.skeleton-label {
    height: 14px;
    width: 60px;
}

/* 预设布局样式 */

/* 卡片布局 */
.skeleton-card {
    display: flex;
    padding: 16px;
    gap: 12px;
    background: var(--n-card-color);
    border-radius: 16px;
    border: 0.5px solid var(--n-border-color);
}

.skeleton-card .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

/* 列表项布局 */
.skeleton-list-item {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    gap: 12px;
    border-bottom: 0.5px solid var(--n-border-color);
}

.skeleton-list-item:last-child {
    border-bottom: none;
}

.skeleton-list-item .skeleton-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

/* 文章布局 */
.skeleton-article {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.skeleton-meta {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
}

/* 个人资料布局 */
.skeleton-profile {
    padding: 24px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
}

.skeleton-stats {
    display: flex;
    justify-content: center;
    gap: 24px;
    margin-top: 16px;
}

.skeleton-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

/* CSS 变量定义 */
:root {
    --skeleton-color: rgba(0, 0, 0, 0.08);
    --skeleton-shine-color: rgba(0, 0, 0, 0.04);
}

.dark-theme {
    --skeleton-color: rgba(255, 255, 255, 0.08);
    --skeleton-shine-color: rgba(255, 255, 255, 0.04);
}

.light-theme {
    --skeleton-color: rgba(0, 0, 0, 0.08);
    --skeleton-shine-color: rgba(0, 0, 0, 0.04);
}

/* 移动端适配 */
@media (max-width: 375px) {
    .skeleton-card {
        padding: 12px;
    }

    .skeleton-list-item {
        padding: 10px 12px;
    }

    .skeleton-article {
        padding: 16px;
    }

    .skeleton-profile {
        padding: 20px;
    }

    .skeleton-image {
        height: 160px;
    }
}

/* 高对比度模式 */
@media (prefers-contrast: high) {
    :root {
        --skeleton-color: rgba(0, 0, 0, 0.15);
        --skeleton-shine-color: rgba(0, 0, 0, 0.08);
    }

    .dark-theme {
        --skeleton-color: rgba(255, 255, 255, 0.15);
        --skeleton-shine-color: rgba(255, 255, 255, 0.08);
    }
}

/* 减少动画模式 */
@media (prefers-reduced-motion: reduce) {
    .mobile-skeleton.animated .skeleton-block,
    .mobile-skeleton.animated .skeleton-avatar,
    .mobile-skeleton.animated .skeleton-title,
    .mobile-skeleton.animated .skeleton-text,
    .mobile-skeleton.animated .skeleton-image,
    .mobile-skeleton.animated .skeleton-number,
    .mobile-skeleton.animated .skeleton-label {
        animation: none;
    }
}
</style>
