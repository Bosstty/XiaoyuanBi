<template>
    <div class="my-pickups-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar
                title="我的订单"
                show-back
                @back="router.back()"
            />
        </div>

        <!-- 筛选标签 -->
        <div class="filter-section">
            <MobileCard :padding="'12px 16px'">
                <div class="filter-tabs">
                    <div
                        v-for="tab in filterTabs"
                        :key="tab.key"
                        class="filter-tab"
                        :class="{ active: currentTab === tab.key }"
                        @click="handleTabChange(tab.key)"
                    >
                        <span class="tab-label">{{ tab.label }}</span>
                        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 搜索框 -->
        <div class="search-section">
            <MobileCard :padding="'12px 16px'">
                <NInput
                    v-model:value="searchQuery"
                    placeholder="搜索我的订单..."
                    size="medium"
                    clearable
                    @update:value="handleSearch"
                >
                    <template #prefix>
                        <NIcon size="16">
                            <SearchIcon />
                        </NIcon>
                    </template>
                </NInput>
            </MobileCard>
        </div>

        <!-- 订单列表 -->
        <div class="orders-section">
            <div v-if="loading" class="loading-container">
                <MobileLoading type="default" text="加载中..." />
            </div>

            <div v-else-if="filteredOrders.length > 0">
                <div
                    v-for="order in filteredOrders"
                    :key="order.id"
                    class="order-item"
                >
                    <MobileCard
                        :hoverable="true"
                        @click="viewOrderDetail(order)"
                    >
                        <div class="order-content">
                            <!-- 订单头部 -->
                            <div class="order-header">
                                <div class="order-type">
                                    <NIcon size="18" :color="getTypeColor(order.type)">
                                        <component :is="getTypeIcon(order.type)" />
                                    </NIcon>
                                    <span class="type-label">{{ getTypeLabel(order.type) }}</span>
                                </div>
                                <div class="order-status">
                                    <NTag :type="getStatusType(order.status)" size="small">
                                        {{ getStatusLabel(order.status) }}
                                    </NTag>
                                </div>
                            </div>

                            <!-- 订单信息 -->
                            <div class="order-info">
                                <h4 class="order-title">{{ order.title }}</h4>
                                <p class="order-description">{{ order.description }}</p>

                                <div class="order-meta">
                                    <div class="meta-item">
                                        <NIcon size="12">
                                            <LocationIcon />
                                        </NIcon>
                                        <span>{{ order.pickupLocation }} → {{ order.deliveryLocation }}</span>
                                    </div>
                                    <div class="meta-item">
                                        <NIcon size="12">
                                            <TimeIcon />
                                        </NIcon>
                                        <span>{{ formatTime(order.createdAt) }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 订单底部 -->
                            <div class="order-footer">
                                <div class="price-info">
                                    <span class="price-label">{{ order.role === 'publisher' ? '支付：' : '收入：' }}</span>
                                    <span class="price-value">¥{{ order.totalAmount }}</span>
                                </div>
                                <div class="order-actions">
                                    <NButton
                                        v-if="order.status === 'pending' && order.role === 'publisher'"
                                        size="small"
                                        type="warning"
                                        @click.stop="cancelOrder(order)"
                                    >
                                        取消订单
                                    </NButton>
                                    <NButton
                                        v-else-if="order.status === 'processing' && order.role === 'accepter'"
                                        size="small"
                                        type="primary"
                                        @click.stop="completeOrder(order)"
                                    >
                                        完成订单
                                    </NButton>
                                    <NButton
                                        v-else-if="order.status === 'completed' && order.role === 'publisher' && !order.rated"
                                        size="small"
                                        type="primary"
                                        @click.stop="rateOrder(order)"
                                    >
                                        评价
                                    </NButton>
                                    <NButton
                                        v-else
                                        size="small"
                                        @click.stop="contactUser(order)"
                                    >
                                        联系
                                    </NButton>
                                </div>
                            </div>
                        </div>
                    </MobileCard>
                </div>

                <!-- 加载更多 -->
                <div v-if="hasMore" class="load-more">
                    <NButton
                        block
                        :loading="loadingMore"
                        @click="loadMore"
                    >
                        加载更多
                    </NButton>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else>
                <MobileEmpty
                    :type="getEmptyType()"
                    :title="getEmptyTitle()"
                    :description="getEmptyDescription()"
                    :show-action="currentTab === 'published'"
                    action-text="发布订单"
                    @action="router.push('/pickup/create')"
                />
            </div>
        </div>

        <!-- 统计信息 -->
        <div v-if="!loading && stats" class="stats-section">
            <MobileCard>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.published }}</div>
                        <div class="stat-label">发布订单</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.accepted }}</div>
                        <div class="stat-label">接受订单</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.completed }}</div>
                        <div class="stat-label">完成订单</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">¥{{ stats.totalEarnings }}</div>
                        <div class="stat-label">总收入</div>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 确认弹窗 -->
        <MobileModal
            v-model:show="showConfirmModal"
            :title="confirmModalData.title"
            @confirm="handleConfirm"
        >
            <p>{{ confirmModalData.content }}</p>
        </MobileModal>

        <!-- 评价弹窗 -->
        <MobileModal
            v-model:show="showRatingModal"
            title="评价订单"
            @confirm="submitRating"
        >
            <div class="rating-form">
                <div class="rating-stars">
                    <div
                        v-for="star in 5"
                        :key="star"
                        class="rating-star"
                        :class="{ active: star <= rating }"
                        @click="rating = star"
                    >
                        <NIcon size="24">
                            <StarIcon />
                        </NIcon>
                    </div>
                </div>
                <NInput
                    v-model:value="ratingComment"
                    type="textarea"
                    placeholder="请输入评价内容..."
                    :rows="3"
                    maxlength="200"
                    show-count
                />
            </div>
        </MobileModal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
    NInput,
    NButton,
    NIcon,
    NTag,
    useMessage,
} from 'naive-ui';
import {
    SearchOutline as SearchIcon,
    LocationOutline as LocationIcon,
    TimeOutline as TimeIcon,
    BagHandleOutline as BagIcon,
    FastFoodOutline as FoodIcon,
    MedkitOutline as MedIcon,
    ShirtOutline as ShopIcon,
    StarOutline as StarIcon,
} from '@vicons/ionicons5';
import { MobileNavBar, MobileCard, MobileLoading, MobileEmpty, MobileModal } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 数据状态
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentTab = ref('all');
const searchQuery = ref('');
const showConfirmModal = ref(false);
const showRatingModal = ref(false);
const rating = ref(0);
const ratingComment = ref('');
const currentOrder = ref(null);

// 确认弹窗数据
const confirmModalData = ref({
    title: '',
    content: '',
    action: '',
});

// 筛选标签
const filterTabs = [
    { key: 'all', label: '全部', count: 0 },
    { key: 'published', label: '我发布的', count: 0 },
    { key: 'accepted', label: '我接受的', count: 0 },
    { key: 'pending', label: '待接单', count: 0 },
    { key: 'processing', label: '进行中', count: 0 },
    { key: 'completed', label: '已完成', count: 0 },
];

// 模拟订单数据
const orders = ref([
    {
        id: 1,
        type: 'express',
        title: '快递代取 - 菜鸟驿站',
        description: '帮忙取一个包裹，取件码：1234',
        pickupLocation: '菜鸟驿站',
        deliveryLocation: '宿舍D栋',
        status: 'completed',
        role: 'publisher', // 'publisher' 或 'accepter'
        fee: 3,
        totalAmount: 3.3,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        rated: true,
        accepter: {
            id: 3,
            name: '李代取',
            avatar: '',
        },
    },
    {
        id: 2,
        type: 'food',
        title: '外卖代取 - 沙县小吃',
        description: '帮忙买一份沙县小吃',
        pickupLocation: '沙县小吃',
        deliveryLocation: '图书馆',
        status: 'processing',
        role: 'accepter',
        fee: 5,
        totalAmount: 4.5,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        rated: false,
        publisher: {
            id: 2,
            name: '张同学',
            avatar: '',
        },
    },
    {
        id: 3,
        type: 'medicine',
        title: '药品代购 - 感冒药',
        description: '帮忙买一盒感冒灵',
        pickupLocation: '校医院',
        deliveryLocation: '宿舍A栋',
        status: 'pending',
        role: 'publisher',
        fee: 2,
        totalAmount: 2.2,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        rated: false,
    },
    {
        id: 4,
        type: 'daily',
        title: '生活用品代购 - 洗发水',
        description: '帮忙买一瓶洗发水',
        pickupLocation: '超市',
        deliveryLocation: '宿舍B栋',
        status: 'completed',
        role: 'accepter',
        fee: 3,
        totalAmount: 2.7,
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        rated: false,
        publisher: {
            id: 4,
            name: '王同学',
            avatar: '',
        },
    },
]);

// 统计数据
const stats = ref({
    published: 15,
    accepted: 23,
    completed: 35,
    totalEarnings: 128.50,
});

// 计算属性
const filteredOrders = computed(() => {
    let result = orders.value;

    // 按标签筛选
    if (currentTab.value !== 'all') {
        if (currentTab.value === 'published') {
            result = result.filter(order => order.role === 'publisher');
        } else if (currentTab.value === 'accepted') {
            result = result.filter(order => order.role === 'accepter');
        } else {
            result = result.filter(order => order.status === currentTab.value);
        }
    }

    // 按搜索关键词筛选
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(order =>
            order.title.toLowerCase().includes(query) ||
            order.description.toLowerCase().includes(query) ||
            order.pickupLocation.toLowerCase().includes(query) ||
            order.deliveryLocation.toLowerCase().includes(query)
        );
    }

    return result;
});

// 方法
const getTypeIcon = (type: string) => {
    const iconMap = {
        express: BagIcon,
        food: FoodIcon,
        medicine: MedIcon,
        daily: ShopIcon,
    };
    return iconMap[type] || BagIcon;
};

const getTypeColor = (type: string) => {
    const colorMap = {
        express: 'var(--n-primary-color)',
        food: 'var(--n-warning-color)',
        medicine: 'var(--n-error-color)',
        daily: 'var(--n-success-color)',
    };
    return colorMap[type] || 'var(--n-primary-color)';
};

const getTypeLabel = (type: string) => {
    const labelMap = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活用品',
    };
    return labelMap[type] || '代取服务';
};

const getStatusType = (status: string) => {
    const typeMap = {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        cancelled: 'error',
    };
    return typeMap[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const labelMap = {
        pending: '等待接单',
        processing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return labelMap[status] || '未知状态';
};

const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
        return '刚刚';
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else {
        return date.toLocaleDateString();
    }
};

const getEmptyType = () => {
    if (searchQuery.value.trim()) return 'search';
    if (currentTab.value === 'published') return 'data';
    return 'data';
};

const getEmptyTitle = () => {
    if (searchQuery.value.trim()) return '暂无搜索结果';
    if (currentTab.value === 'published') return '暂无发布订单';
    if (currentTab.value === 'accepted') return '暂无接受订单';
    return '暂无订单';
};

const getEmptyDescription = () => {
    if (searchQuery.value.trim()) return '尝试调整搜索条件或关键词';
    if (currentTab.value === 'published') return '您还没有发布任何代取订单';
    if (currentTab.value === 'accepted') return '您还没有接受任何代取订单';
    return '您还没有相关的代取订单';
};

// 更新标签数量
const updateTabCounts = () => {
    filterTabs[0].count = orders.value.length; // 全部
    filterTabs[1].count = orders.value.filter(o => o.role === 'publisher').length; // 我发布的
    filterTabs[2].count = orders.value.filter(o => o.role === 'accepter').length; // 我接受的
    filterTabs[3].count = orders.value.filter(o => o.status === 'pending').length; // 待接单
    filterTabs[4].count = orders.value.filter(o => o.status === 'processing').length; // 进行中
    filterTabs[5].count = orders.value.filter(o => o.status === 'completed').length; // 已完成
};

// 事件处理
const handleTabChange = (tabKey: string) => {
    currentTab.value = tabKey;
    appStore.hapticFeedback('light');
};

const handleSearch = (value: string) => {
    // 实际应用中这里可以添加防抖
    console.log('搜索:', value);
};

const viewOrderDetail = (order: any) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${order.id}`);
};

const cancelOrder = (order: any) => {
    currentOrder.value = order;
    confirmModalData.value = {
        title: '取消订单',
        content: '确定要取消这个代取订单吗？取消后无法恢复。',
        action: 'cancel',
    };
    showConfirmModal.value = true;
};

const completeOrder = (order: any) => {
    currentOrder.value = order;
    confirmModalData.value = {
        title: '完成订单',
        content: '确认已经完成这个代取订单了吗？',
        action: 'complete',
    };
    showConfirmModal.value = true;
};

const rateOrder = (order: any) => {
    currentOrder.value = order;
    rating.value = 0;
    ratingComment.value = '';
    showRatingModal.value = true;
};

const contactUser = (order: any) => {
    message.info('联系功能开发中...');
    appStore.hapticFeedback('light');
};

const handleConfirm = async () => {
    if (!currentOrder.value) return;

    try {
        if (confirmModalData.value.action === 'cancel') {
            // 模拟取消订单
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentOrder.value.status = 'cancelled';
            message.success('订单已取消');
        } else if (confirmModalData.value.action === 'complete') {
            // 模拟完成订单
            await new Promise(resolve => setTimeout(resolve, 1500));
            currentOrder.value.status = 'completed';
            message.success('订单已完成');
        }

        updateTabCounts();
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('操作失败');
    } finally {
        showConfirmModal.value = false;
        currentOrder.value = null;
    }
};

const submitRating = () => {
    if (rating.value === 0) {
        message.warning('请选择评分');
        return;
    }

    if (currentOrder.value) {
        currentOrder.value.rated = true;
    }

    message.success('评价提交成功');
    showRatingModal.value = false;
    currentOrder.value = null;
    rating.value = 0;
    ratingComment.value = '';
};

const loadMore = async () => {
    loadingMore.value = true;
    try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 这里应该加载更多数据
        hasMore.value = false; // 暂时设置为没有更多数据
    } catch (error) {
        message.error('加载失败');
    } finally {
        loadingMore.value = false;
    }
};

// 获取订单列表
const fetchOrders = async () => {
    loading.value = true;
    try {
        // 这里应该调用API获取真实数据
        await new Promise(resolve => setTimeout(resolve, 800));
        updateTabCounts();
    } catch (error) {
        message.error('获取订单列表失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchOrders();
});
</script>

<style scoped>
.my-pickups-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.filter-section,
.search-section {
    margin: 16px 16px 0 16px;
}

.search-section {
    margin-top: 8px;
}

/* 筛选标签 */
.filter-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.filter-tabs::-webkit-scrollbar {
    display: none;
}

.filter-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
    border: 1px solid var(--n-border-color);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.filter-tab:hover {
    background: var(--n-color-target);
}

.filter-tab.active {
    background: var(--n-primary-color);
    border-color: var(--n-primary-color);
    color: white;
}

.tab-label {
    font-size: 13px;
    font-weight: 500;
}

.tab-count {
    font-size: 12px;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
}

.filter-tab:not(.active) .tab-count {
    background: var(--n-primary-color);
    color: white;
}

/* 订单列表 */
.orders-section {
    margin: 16px;
    margin-bottom: 32px;
}

.loading-container {
    padding: 60px 0;
    text-align: center;
}

.order-item {
    margin-bottom: 12px;
}

.order-item:last-child {
    margin-bottom: 0;
}

.order-content {
    padding: 4px;
}

/* 订单头部 */
.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.order-type {
    display: flex;
    align-items: center;
    gap: 6px;
}

.type-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

/* 订单信息 */
.order-info {
    margin-bottom: 12px;
}

.order-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 6px 0;
    line-height: 1.3;
}

.order-description {
    font-size: 13px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.order-meta {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 订单底部 */
.order-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--n-border-color);
}

.price-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.price-label {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.price-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--n-error-color);
}

.order-actions {
    display: flex;
    gap: 8px;
}

/* 加载更多 */
.load-more {
    margin-top: 20px;
}

/* 统计信息 */
.stats-section {
    margin: 0 16px 32px 16px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 4px;
}

.stat-item {
    text-align: center;
    padding: 16px 8px;
}

.stat-value {
    font-size: 20px;
    font-weight: 700;
    color: var(--n-primary-color);
    line-height: 1;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    font-weight: 500;
}

/* 确认弹窗 */
.rating-form {
    padding: 16px 0;
}

.rating-stars {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
}

.rating-star {
    cursor: pointer;
    color: var(--n-border-color);
    transition: all 0.2s ease;
}

.rating-star.active {
    color: var(--n-warning-color);
}

.rating-star:hover {
    transform: scale(1.1);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .filter-section,
    .search-section,
    .orders-section,
    .stats-section {
        margin-left: 12px;
        margin-right: 12px;
    }

    .order-content {
        padding: 2px;
    }

    .order-title {
        font-size: 14px;
    }

    .order-description {
        font-size: 12px;
    }

    .stats-grid {
        gap: 16px;
    }

    .stat-value {
        font-size: 18px;
    }

    .filter-tab {
        padding: 6px 10px;
    }

    .tab-label {
        font-size: 12px;
    }
}

/* iOS 安全区域适配 */
.my-pickups-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.my-pickups-page {
    animation: ios-fade-in 0.4s ease-out;
}

.filter-section,
.search-section,
.orders-section {
    animation: ios-fade-in 0.6s ease-out;
}

.filter-section {
    animation-delay: 0.1s;
}

.search-section {
    animation-delay: 0.2s;
}

.orders-section {
    animation-delay: 0.3s;
}

/* 深色模式优化 */
.dark-theme .filter-tab:hover {
    background: var(--ios-dark-gray4);
}

.light-theme .filter-tab:hover {
    background: var(--ios-gray5);
}

/* 卡片悬停效果 */
.order-item .mobile-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark-theme .order-item .mobile-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 按钮样式覆盖 */
.load-more :deep(.n-button) {
    border-radius: 8px;
    height: 40px;
    font-weight: 500;
}

.order-actions :deep(.n-button) {
    border-radius: 6px;
    height: 28px;
    font-size: 12px;
}
</style>
