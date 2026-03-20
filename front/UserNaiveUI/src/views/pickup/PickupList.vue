<template>
    <div class="pickup-list-page">
        <!-- 顶部背景 -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="page-title">代取服务</h1>
                <p class="page-subtitle">快递、外卖、药品一键代取</p>
            </div>
        </div>

        <!-- 分类标签 -->
        <div class="category-tabs">
            <div class="tabs-scroll hide-scrollbar">
                <div
                    v-for="tab in categoryTabs"
                    :key="tab.key"
                    class="tab-item"
                    :class="{ active: currentTab === tab.key }"
                    @click="handleTabChange(tab.key)"
                >
                    <div class="tab-icon" :style="{ background: tab.gradient }">
                        <NIcon :size="16" color="white">
                            <component :is="tab.icon" />
                        </NIcon>
                    </div>
                    <span class="tab-label">{{ tab.label }}</span>
                </div>
            </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
            <NInput
                v-model:value="searchQuery"
                placeholder="搜索代取订单..."
                size="large"
                clearable
                round
            >
                <template #prefix>
                    <NIcon><SearchOutline /></NIcon>
                </template>
            </NInput>
        </div>

        <!-- 订单列表 -->
        <div class="orders-container">
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
            </div>

            <div v-else-if="filteredOrders.length > 0" class="orders-list">
                <div
                    v-for="(order, index) in filteredOrders"
                    :key="order.id"
                    class="order-card ios-card"
                    :style="{ animationDelay: `${index * 80}ms` }"
                    @click="handleOrderClick(order)"
                >
                    <!-- 订单头部 -->
                    <div class="card-header">
                        <div
                            class="type-badge"
                            :style="{ background: getTypeGradient(order.type) }"
                        >
                            <NIcon :size="14" color="white">
                                <component :is="getOrderTypeIcon(order.type)" />
                            </NIcon>
                            <span>{{ getOrderTypeLabel(order.type) }}</span>
                        </div>
                        <NTag :type="getStatusType(order.status)" size="small" :bordered="false">
                            {{ getStatusLabel(order.status) }}
                        </NTag>
                    </div>

                    <!-- 订单内容 -->
                    <div class="card-body">
                        <h3 class="order-title">{{ order.title }}</h3>
                        <p class="order-desc">{{ order.description }}</p>

                        <div class="order-meta">
                            <div class="meta-item">
                                <NIcon :size="14" class="meta-icon"><LocationOutline /></NIcon>
                                <span>{{ order.location }}</span>
                            </div>
                            <div class="meta-item">
                                <NIcon :size="14" class="meta-icon"><TimeOutline /></NIcon>
                                <span>{{ formatTime(order.createdAt) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 订单底部 -->
                    <div class="card-footer">
                        <div class="publisher-info">
                            <NAvatar :size="24" round />
                            <span class="publisher-name">{{ order.publisher.name }}</span>
                        </div>
                        <div class="price-info">
                            <span class="price-label">赏金</span>
                            <span class="price-value">¥{{ order.fee }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <circle cx="32" cy="32" r="30" fill="var(--ios-gray6)" />
                        <path
                            d="M22 28h20M22 36h12"
                            stroke="var(--ios-gray3)"
                            stroke-width="3"
                            stroke-linecap="round"
                        />
                    </svg>
                </div>
                <h4 class="empty-title">暂无订单</h4>
                <p class="empty-desc">当前没有可接取的代取订单</p>
                <NButton type="primary" @click="router.push('/pickup/create')">发布订单</NButton>
            </div>
        </div>

        <!-- 发布订单按钮 -->
        <div class="create-btn-wrap">
            <NButton
                type="primary"
                size="large"
                circle
                class="create-btn"
                @click="router.push('/pickup/create')"
            >
                <template #icon>
                    <NIcon size="24"><AddOutline /></NIcon>
                </template>
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, NIcon, NTag, NAvatar, NSpin } from 'naive-ui';
import {
    SearchOutline,
    LocationOutline,
    TimeOutline,
    AddOutline,
    BagHandleOutline,
    FastFoodOutline,
    MedicalOutline,
    CartOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();

// 状态
const searchQuery = ref('');
const currentTab = ref('all');
const loading = ref(false);

// 分类标签
const categoryTabs = ref([
    {
        key: 'all',
        label: '全部',
        icon: markRaw(BagHandleOutline),
        gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)',
    },
    {
        key: 'express',
        label: '快递',
        icon: markRaw(BagHandleOutline),
        gradient: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
    },
    {
        key: 'food',
        label: '外卖',
        icon: markRaw(FastFoodOutline),
        gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
    },
    {
        key: 'medicine',
        label: '药品',
        icon: markRaw(MedicalOutline),
        gradient: 'linear-gradient(135deg, #FF2D92 0%, #AF52DE 100%)',
    },
    {
        key: 'daily',
        label: '生活',
        icon: markRaw(CartOutline),
        gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
    },
]);

// 模拟订单数据
const orders = ref([
    {
        id: 1,
        type: 'express',
        title: '快递代取 - 菜鸟驿站',
        description: '帮忙取一个包裹，取件码：1234，重量较轻',
        location: '菜鸟驿站 · 宿舍楼下',
        fee: 3,
        status: 'pending',
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        publisher: { id: 1, name: '张同学' },
    },
    {
        id: 2,
        type: 'food',
        title: '外卖代取 - 沙县小吃',
        description: '帮忙买一份沙县小吃，蒸饺+炒河粉',
        location: '沙县小吃 · 南门店',
        fee: 5,
        status: 'processing',
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        publisher: { id: 2, name: '李同学' },
    },
    {
        id: 3,
        type: 'medicine',
        title: '药品代购 - 感冒药',
        description: '帮忙买一盒感冒灵，有处方',
        location: '校医院药房',
        fee: 2,
        status: 'pending',
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        publisher: { id: 3, name: '王同学' },
    },
    {
        id: 4,
        type: 'daily',
        title: '生活用品代购',
        description: '帮忙买一瓶洗发水，海飞丝的',
        location: '校园超市',
        fee: 2,
        status: 'pending',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        publisher: { id: 4, name: '赵同学' },
    },
]);

// 筛选订单
const filteredOrders = computed(() => {
    let result = orders.value;

    if (currentTab.value !== 'all') {
        result = result.filter(o => o.type === currentTab.value);
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            o =>
                o.title.toLowerCase().includes(query) || o.description.toLowerCase().includes(query)
        );
    }

    return result;
});

// 获取类型图标
const getOrderTypeIcon = (type: string) => {
    const map: Record<string, any> = {
        express: BagHandleOutline,
        food: FastFoodOutline,
        medicine: MedicalOutline,
        daily: CartOutline,
    };
    return map[type] || BagHandleOutline;
};

// 获取类型渐变
const getTypeGradient = (type: string) => {
    const map: Record<string, string> = {
        express: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
        food: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
        medicine: 'linear-gradient(135deg, #FF2D92 0%, #AF52DE 100%)',
        daily: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
    };
    return map[type] || map.express;
};

// 获取类型标签
const getOrderTypeLabel = (type: string) => {
    const map: Record<string, string> = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活用品',
    };
    return map[type] || '代取服务';
};

// 获取状态类型
const getStatusType = (status: string) => {
    const map: Record<string, any> = {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        cancelled: 'error',
    };
    return map[status] || 'default';
};

// 获取状态标签
const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        pending: '等待接单',
        processing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return map[status] || '未知';
};

// 格式化时间
const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    return `${Math.floor(diff / 86400000)}天前`;
};

// 切换标签
const handleTabChange = (key: string) => {
    currentTab.value = key;
    appStore.hapticFeedback('light');
};

// 点击订单
const handleOrderClick = (order: any) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${order.id}`);
};

// 加载数据
onMounted(() => {
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
    }, 500);
});
</script>

<style scoped>
.pickup-list-page {
    min-height: 100vh;
    width: 100%;
    background: var(--n-body-color, var(--ios-bg-secondary));
    padding-bottom: 100px;
}

/* 页面头部 */
.page-header {
    background: linear-gradient(135deg, var(--n-primary-color, #007aff) 0%, #5856d6 100%);
    padding: 52px 16px 32px;
    border-radius: 0 0 24px 24px;
}

.dark .page-header,
:root.dark .page-header {
    background: linear-gradient(135deg, #0a84ff 0%, #5e5ce6 100%);
}

.header-content {
    text-align: center;
}

.page-title {
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
}

.page-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
}

/* 分类标签 */
.category-tabs {
    margin-top: -20px;
    padding: 0 16px;
    position: relative;
    z-index: 10;
}

.tabs-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: 24px;
    box-shadow: var(--ios-shadow-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.96);
}

.tab-item.active {
    background: var(--n-primary-color, var(--ios-blue));
    box-shadow: 0 4px 12px rgba(0, 122, 255, 0.3);
}

.tab-item.active .tab-label {
    color: white;
}

.tab-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tab-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1, var(--ios-text-primary));
}

/* 搜索栏 */
.search-bar {
    padding: 20px 16px 12px;
}

/* 订单列表 */
.orders-container {
    padding: 0 16px;
}

.orders-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.order-card {
    padding: 0;
    overflow: hidden;
    background: var(--n-card-color, var(--ios-bg-primary));
    border-radius: var(--ios-radius-lg);
    box-shadow: var(--ios-shadow);
    animation: ios-fade-in 0.4s ease-out backwards;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 0.5px solid var(--n-divider-color, var(--ios-divider));
}

.type-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 10px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    color: white;
}

.card-body {
    padding: 14px 16px;
}

.order-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1, var(--ios-text-primary));
    margin: 0 0 6px 0;
}

.order-desc {
    font-size: 14px;
    color: var(--n-text-color-2, var(--ios-text-secondary));
    margin: 0 0 12px 0;
    line-height: 1.4;
}

.order-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
}

.meta-icon {
    opacity: 0.7;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--n-color-hover, var(--ios-gray6));
}

.dark .card-footer,
:root.dark .card-footer {
    background: var(--ios-gray5);
}

.publisher-info {
    display: flex;
    align-items: center;
    gap: 8px;
}

.publisher-name {
    font-size: 13px;
    color: var(--n-text-color-2, var(--ios-text-secondary));
}

.price-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.price-label {
    font-size: 12px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
}

.price-value {
    font-size: 18px;
    font-weight: 700;
    color: var(--n-warning-color, #ff9500);
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-icon {
    margin-bottom: 20px;
}

.empty-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--n-text-color-1, var(--ios-text-primary));
    margin: 0 0 8px 0;
}

.empty-desc {
    font-size: 14px;
    color: var(--n-text-color-3, var(--ios-text-tertiary));
    margin: 0 0 24px 0;
}

/* 创建按钮 */
.create-btn-wrap {
    position: fixed;
    bottom: 100px;
    right: 20px;
    z-index: 100;
}

.create-btn {
    width: 56px;
    height: 56px;
    box-shadow: 0 8px 24px rgba(0, 122, 255, 0.4);
}

.dark .create-btn,
:root.dark .create-btn {
    box-shadow: 0 8px 24px rgba(10, 132, 255, 0.4);
}

/* 加载状态 */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 60px 0;
}

/* 动画 */
@keyframes ios-fade-in {
    from {
        opacity: 0;
        transform: translateY(16px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 小屏优化 */
@media (max-width: 375px) {
    .page-title {
        font-size: 24px;
    }

    .tab-item {
        padding: 8px 12px;
    }

    .tab-label {
        font-size: 13px;
    }
}

/* iOS 安全区域 */
@media (min-width: 440px) {
    .create-btn-wrap {
        right: calc(50% - 210px);
    }
}
</style>
