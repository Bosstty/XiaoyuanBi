<template>
    <div class="not-found-page" :class="`${appStore.currentTheme}-mode`">
        <MobileEmpty
            type="search"
            size="large"
            title="页面未找到"
            description="抱歉，您访问的页面不存在"
            :show-action="true"
            action-text="返回首页"
            @action="goHome"
        />
    </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { MobileEmpty } from '@/components/mobile';
import { useAppStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();

const goHome = () => {
    router.push('/');
};
</script>

<style scoped>
.not-found-page {
    height: 100%;
    min-height: 100dvh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: linear-gradient(180deg, #f6f8fc 0%, #eef3fb 100%);
}

.not-found-page.dark-mode {
    background:
        radial-gradient(circle at top, rgba(47, 107, 255, 0.16), transparent 24%),
        linear-gradient(180deg, #0b1220 0%, #101a2e 100%);
}

.not-found-page :deep(.mobile-empty) {
    min-height: 0;
    height: auto;
    padding: 0;
}

.not-found-page.dark-mode :deep(.mobile-empty) {
    background: transparent;
}

.not-found-page.dark-mode :deep(.empty-title) {
    color: #f3f7ff;
}

.not-found-page.dark-mode :deep(.empty-description) {
    color: #aebbd1;
}

.not-found-page.dark-mode :deep(.default-illustration),
.not-found-page.dark-mode :deep(.empty-icon) {
    color: #9fc0ff;
    opacity: 0.82;
}
</style>
