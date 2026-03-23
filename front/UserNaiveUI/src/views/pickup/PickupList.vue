<template>
    <div class="order-center">
        <section class="order-center__hero">
            <div>
                <span>Campus Order Center</span>
                <h1>订单中心</h1>
                <p>面向校园即时需求的代取代购大厅，后续也将在这里自然接入代取员抢单中心。</p>
            </div>
            <button type="button" class="order-center__hero-btn touch-feedback" @click="router.push('/pickup/create')">
                发布订单
            </button>
        </section>

        <section class="order-center__stats">
            <article v-for="item in summaryCards" :key="item.label" class="order-center__stats-card">
                <strong>{{ item.value }}</strong>
                <h4>{{ item.label }}</h4>
                <p>{{ item.note }}</p>
            </article>
        </section>

        <section class="order-center__section">
            <div class="order-center__section-head">
                <h3>服务筛选</h3>
            </div>
            <div class="order-center__tabs">
                <button
                    v-for="tab in categoryTabs"
                    :key="tab.key"
                    type="button"
                    class="order-center__tab touch-feedback"
                    :class="{ active: currentTab === tab.key }"
                    @click="handleTabChange(tab.key)"
                >
                    <NIcon :size="18"><component :is="tab.icon" /></NIcon>
                    <span>{{ tab.label }}</span>
                </button>
            </div>
        </section>

        <section class="order-center__section">
            <NInput
                v-model:value="searchQuery"
                placeholder="搜索订单、地点或需求"
                size="large"
                clearable
                round
            >
                <template #prefix>
                    <NIcon><SearchOutline /></NIcon>
                </template>
            </NInput>
        </section>

        <section class="order-center__section">
            <div class="order-center__section-head">
                <h3>可接订单</h3>
            </div>
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
            </div>
            <div v-else-if="filteredOrders.length > 0" class="order-center__list">
                <article
                    v-for="order in filteredOrders"
                    :key="order.id"
                    class="order-center__card touch-feedback"
                    @click="handleOrderClick(order)"
                >
                    <div class="order-center__card-top">
                        <div class="order-center__type">
                            <div class="order-center__type-icon">
                                <NIcon :size="18"><component :is="getOrderTypeIcon(order.type)" /></NIcon>
                            </div>
                            <div>
                                <strong>{{ getOrderTypeLabel(order.type) }}</strong>
                                <p>{{ order.title }}</p>
                            </div>
                        </div>
                        <NTag size="small" :bordered="false" :type="getStatusType(order.status)">
                            {{ getStatusLabel(order.status) }}
                        </NTag>
                    </div>
                    <p class="order-center__desc">{{ order.description }}</p>
                    <div class="order-center__meta">
                        <span><NIcon :size="14"><LocationOutline /></NIcon>{{ order.location }}</span>
                        <span><NIcon :size="14"><TimeOutline /></NIcon>{{ formatTime(order.createdAt) }}</span>
                    </div>
                    <div class="order-center__card-foot">
                        <div class="order-center__publisher">
                            <NAvatar :size="28" round />
                            <span>{{ order.publisher.name }}</span>
                        </div>
                        <strong>¥{{ order.fee }}</strong>
                    </div>
                </article>
            </div>
            <div v-else class="order-center__empty">
                <h4>暂无订单</h4>
                <p>当前没有符合筛选条件的订单，发布一个新的需求试试。</p>
                <NButton type="primary" round @click="router.push('/pickup/create')">去发布</NButton>
            </div>
        </section>

        <button type="button" class="order-center__fab touch-feedback" @click="router.push('/pickup/create')">
            <NIcon :size="24"><AddOutline /></NIcon>
        </button>
        <div class="order-center__safe-space"></div>
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
import { useAppStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();

const searchQuery = ref('');
const currentTab = ref('all');
const loading = ref(false);

const categoryTabs = ref([
    { key: 'all', label: '全部', icon: markRaw(BagHandleOutline) },
    { key: 'express', label: '快递', icon: markRaw(BagHandleOutline) },
    { key: 'food', label: '外卖', icon: markRaw(FastFoodOutline) },
    { key: 'medicine', label: '药品', icon: markRaw(MedicalOutline) },
    { key: 'daily', label: '生活', icon: markRaw(CartOutline) },
]);

const summaryCards = [
    { label: '待接订单', value: '36', note: '南区和食堂片区最活跃' },
    { label: '平均送达', value: '22m', note: '午高峰会略有波动' },
    { label: '今日成交', value: '128', note: '外卖与快递需求占比最高' },
];

const orders = ref([
    {
        id: 1,
        type: 'express',
        title: '快递代取 - 菜鸟驿站',
        description: '帮忙取一个包裹，取件码：1234，重量较轻。',
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
        description: '帮忙买一份沙县小吃，蒸饺加炒河粉，越快越好。',
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
        description: '帮忙买一盒感冒灵，有明确药品名称和规格。',
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
        description: '帮忙买一瓶海飞丝洗发水和一包纸巾。',
        location: '校园超市',
        fee: 2,
        status: 'pending',
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        publisher: { id: 4, name: '赵同学' },
    },
]);

const filteredOrders = computed(() => {
    let result = orders.value;

    if (currentTab.value !== 'all') {
        result = result.filter(o => o.type === currentTab.value);
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            o =>
                o.title.toLowerCase().includes(query) ||
                o.description.toLowerCase().includes(query) ||
                o.location.toLowerCase().includes(query)
        );
    }

    return result;
});

const getOrderTypeIcon = (type: string) => {
    const map: Record<string, any> = {
        express: BagHandleOutline,
        food: FastFoodOutline,
        medicine: MedicalOutline,
        daily: CartOutline,
    };
    return map[type] || BagHandleOutline;
};

const getOrderTypeLabel = (type: string) => {
    const map: Record<string, string> = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活用品',
    };
    return map[type] || '代取服务';
};

const getStatusType = (status: string) => {
    const map: Record<string, any> = {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        cancelled: 'error',
    };
    return map[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        pending: '等待接单',
        processing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return map[status] || '未知';
};

const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const handleTabChange = (key: string) => {
    currentTab.value = key;
    appStore.hapticFeedback('light');
};

const handleOrderClick = (order: { id: number }) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${order.id}`);
};

onMounted(() => {
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
    }, 500);
});
</script>
