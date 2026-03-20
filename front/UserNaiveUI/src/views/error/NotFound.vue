<template>
    <div class="not-found-page">
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

const router = useRouter();

const goHome = () => {
    router.push('/');
};
</script>

<style scoped>
.not-found-page {
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
}
</style>
