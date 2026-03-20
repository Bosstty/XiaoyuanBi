<template>
    <div class="pickup-redirect">
        <!-- 重定向到代取列表 -->
    </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();

onMounted(() => {
    router.replace('/pickup/list');
});
</script>

<style scoped>
.pickup-redirect {
    display: none;
}
</style>
