<template>
    <div class="order-center" :class="{ 'is-dark': appStore.isDark }">
        <section class="order-center__hero">
            <div>
                <span>Campus Order Center</span>
                <h1>订单中心</h1>
                <p>{{ heroDescription }}</p>
            </div>
            <div class="order-center__hero-actions">
                <button
                    v-if="isDeliverer"
                    type="button"
                    class="order-center__hero-btn order-center__hero-btn--ghost touch-feedback"
                    @click="router.push('/pickup/hall')"
                >
                    订单中心
                </button>
                <button
                    type="button"
                    class="order-center__hero-btn touch-feedback"
                    @click="router.push('/pickup/create')"
                >
                    发布订单
                </button>
            </div>
        </section>

        <section v-if="isDeliverer" class="order-center__section">
            <div class="order-center__section-head">
                <h3>可接订单预览</h3>
                <button
                    type="button"
                    class="order-center__link-btn"
                    @click="router.push('/pickup/hall')"
                >
                    进入大厅
                </button>
            </div>
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
            </div>
            <div v-else-if="filteredOrders.length > 0" class="order-center__list">
                <article
                    v-for="order in filteredOrders.slice(0, 3)"
                    :key="order.id"
                    class="order-center__card touch-feedback"
                    @click="handleOrderClick(order)"
                >
                    <div class="order-center__card-top">
                        <div class="order-center__type">
                            <div class="order-center__type-icon">
                                <NIcon :size="18">
                                    <component :is="getOrderTypeIcon(order.type)" />
                                </NIcon>
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
                        <span>
                            <NIcon :size="14"><LocationOutline /></NIcon>
                            {{ order.pickup_location }}
                        </span>
                        <span>
                            <NIcon :size="14"><TimeOutline /></NIcon>
                            {{ formatTime(order.createdAt) }}
                        </span>
                    </div>
                    <div class="order-center__card-foot">
                        <div class="order-center__publisher">
                            <NAvatar :size="28" round />
                            <span>
                                {{ order.user?.username || order.user?.real_name || '匿名用户' }}
                            </span>
                        </div>
                        <strong>¥{{ formatMoney(order.price) }}</strong>
                    </div>
                </article>
            </div>
            <div v-else class="order-center__empty">
                <h4>暂无订单</h4>
                <p>当前没有符合筛选条件的订单，发布一个新的需求试试。</p>
                <NButton type="primary" round @click="router.push('/pickup/create')">
                    去发布
                </NButton>
            </div>
        </section>

        <section v-else class="order-center__section">
            <div class="order-center__section-head">
                <h3>订单操作</h3>
            </div>
            <div class="order-center__action-grid">
                <button
                    type="button"
                    class="order-center__action-card touch-feedback"
                    @click="router.push('/pickup/my')"
                >
                    <strong>我的订单</strong>
                    <p>查看已发布订单、配送进度和历史记录。</p>
                </button>
                <button
                    type="button"
                    class="order-center__action-card touch-feedback"
                    @click="router.push('/pickup/create')"
                >
                    <strong>创建订单</strong>
                    <p>发起新的代取需求，等待已认证配送员接单。</p>
                </button>
            </div>
        </section>

        <section class="order-center__section">
            <div class="order-center__section-head">
                <h3>订单状态</h3>
            </div>
            <div v-if="loadingMyOrders" class="loading-state">
                <NSpin size="large" />
            </div>
            <div v-else-if="activeOrder" class="order-center__status-board">
                <button
                    type="button"
                    class="order-center__status-card order-center__status-card--active touch-feedback"
                    @click="handleOrderClick(activeOrder)"
                >
                    <div class="order-center__status-top">
                        <div>
                            <strong>{{ getStatusLabel(activeOrder.status) }}</strong>
                            <span>{{ getOrderTypeLabel(activeOrder.type) }}</span>
                        </div>
                        <NTag
                            size="small"
                            :bordered="false"
                            :type="getStatusType(activeOrder.status)"
                        >
                            {{ isDeliverer ? '当前接单' : '当前订单' }}
                        </NTag>
                    </div>
                    <h4 class="order-center__status-title">{{ activeOrder.title }}</h4>
                    <div class="order-center__status-fields">
                        <div class="order-center__status-route">
                            <div class="order-center__status-field">
                                <span>取货地点</span>
                                <strong>{{ activeOrder.pickup_location }}</strong>
                            </div>
                            <div class="order-center__status-arrow" aria-hidden="true">
                                <span></span>
                            </div>
                            <div class="order-center__status-field">
                                <span>送达地点</span>
                                <strong>{{ activeOrder.delivery_location }}</strong>
                            </div>
                        </div>
                        <div class="order-center__status-meta-row">
                            <div class="order-center__status-field">
                                <span>联系人</span>
                                <strong>
                                    {{ activeOrder.contact_name }} {{ activeOrder.contact_phone }}
                                </strong>
                            </div>
                            <div class="order-center__status-field">
                                <span>创建时间</span>
                                <strong>{{ formatTime(activeOrder.createdAt) }}</strong>
                            </div>
                        </div>
                    </div>
                </button>
            </div>
            <div v-else class="order-center__empty order-center__empty--compact">
                <h4>暂无进行中的订单</h4>
                <p>
                    {{
                        isDeliverer
                            ? '当前没有正在处理的订单，新的订单状态会显示在这里。'
                            : '当前没有需要跟进的订单，创建或接单后会在这里显示状态。'
                    }}
                </p>
                <NButton
                    type="primary"
                    round
                    @click="router.push(isDeliverer ? '/pickup/my' : '/pickup/create')"
                >
                    {{ isDeliverer ? '查看订单' : '创建订单' }}
                </NButton>
            </div>
        </section>

        <div class="order-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NTag, NAvatar, NSpin, useMessage } from 'naive-ui';
import {
    BagHandleOutline,
    CartOutline,
    FastFoodOutline,
    LocationOutline,
    MedicalOutline,
    TimeOutline,
} from '@vicons/ionicons5';
import { DelivererOrderApi, PickupApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { PickupOrder } from '@/types';

const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const message = useMessage();

const loading = ref(false);
const loadingMyOrders = ref(false);
const myOrders = ref<PickupOrder[]>([]);
const orders = ref<PickupOrder[]>([]);
const isDeliverer = computed(() => Boolean(userStore.user?.is_deliverer));
const heroDescription = computed(() =>
    isDeliverer.value
        ? '面向校园即时需求的代取代购大厅，这里会展示当前可接的订单。'
        : '当前账号可查看我的订单并发布新订单，接单能力仅对已认证配送员开放。'
);

const filteredOrders = computed(() => orders.value);

const activeOrder = computed<PickupOrder | null>(() => {
    const statusPriority: PickupOrder['status'][] = [
        'delivering',
        'picking',
        'accepted',
        'pending',
    ];
    for (const status of statusPriority) {
        const matched = myOrders.value.find(order => order.status === status);
        if (matched) return matched;
    }
    return null;
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
        accepted: 'info',
        picking: 'info',
        delivering: 'info',
        processing: 'info',
        completed: 'success',
        cancelled: 'error',
    };
    return map[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        pending: '等待接单',
        accepted: '已接单',
        picking: '取货中',
        delivering: '配送中',
        processing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return map[status] || '未知';
};

const formatTime = (date: string | Date | null | undefined) => {
    if (!date) return '未知时间';

    const targetDate = date instanceof Date ? date : new Date(date);
    if (Number.isNaN(targetDate.getTime())) return '未知时间';

    const diff = Date.now() - targetDate.getTime();
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const handleOrderClick = (order: { id: number }) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${order.id}`);
};

const formatMoney = (value: string | number | null | undefined) => {
    const amount = Number(value || 0);
    return amount.toFixed(2);
};

const fetchAvailableOrders = async () => {
    if (!isDeliverer.value) {
        orders.value = [];
        return;
    }

    loading.value = true;
    try {
        const response = await DelivererOrderApi.getAvailableOrders({
            page: 1,
            limit: 20,
        });
        if (!response.success) {
            throw new Error(response.message || '获取可接订单失败');
        }
        orders.value = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('获取可接订单失败:', error);
        message.error(error instanceof Error ? error.message : '获取可接订单失败');
        orders.value = [];
    } finally {
        loading.value = false;
    }
};

const fetchMyOrders = async () => {
    if (!userStore.isAuthenticated) {
        myOrders.value = [];
        loadingMyOrders.value = false;
        return;
    }

    loadingMyOrders.value = true;
    try {
        const response = isDeliverer.value
            ? await DelivererOrderApi.getMyOrders({ limit: 20 })
            : await PickupApi.getMyOrders({ type: 'published', limit: 20 });
        myOrders.value = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        console.error('获取当前用户订单状态失败:', error);
        message.error(error instanceof Error ? error.message : '获取当前用户订单状态失败');
        myOrders.value = [];
    } finally {
        loadingMyOrders.value = false;
    }
};

onMounted(async () => {
    await fetchMyOrders();
    await fetchAvailableOrders();
});
</script>

<style scoped>
.order-center {
    --action-card-bg: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(244, 247, 255, 0.96));
    --action-card-border: rgba(59, 130, 246, 0.14);
    --action-card-title: #0f172a;
    --action-card-text: rgba(51, 65, 85, 0.78);
    --action-card-hover-border: rgba(59, 130, 246, 0.24);
    --action-card-hover-shadow: 0 18px 40px rgba(15, 23, 42, 0.16);
}

.order-center.is-dark {
    --action-card-bg: linear-gradient(180deg, rgba(24, 34, 56, 0.96), rgba(17, 24, 39, 0.94));
    --action-card-border: rgba(96, 165, 250, 0.18);
    --action-card-title: #f8fafc;
    --action-card-text: rgba(226, 232, 240, 0.82);
    --action-card-hover-border: rgba(96, 165, 250, 0.4);
    --action-card-hover-shadow: 0 18px 40px rgba(2, 6, 23, 0.32);
}

.order-center__hero-actions {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
}

.order-center__hero-btn--ghost {
    background: rgba(255, 255, 255, 0.14);
    border: 1px solid rgba(255, 255, 255, 0.28);
}

.order-center__link-btn {
    border: 0;
    background: transparent;
    color: #3b82f6;
    font-size: 14px;
    font-weight: 700;
}

.order-center__action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
}

.order-center__status-board {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}

.order-center__status-card {
    border: 1px solid var(--action-card-border);
    border-radius: 24px;
    padding: 18px 18px 16px;
    background: var(--action-card-bg);
    color: var(--action-card-title);
    text-align: left;
}

.order-center__status-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 10px;
}

.order-center__status-top strong {
    display: block;
    font-size: 17px;
    line-height: 1.2;
    margin-bottom: 8px;
}

.order-center__status-top span {
    font-size: 14px;
    font-weight: 600;
    line-height: 1.4;
    color: var(--action-card-text);
}

.order-center__status-title {
    margin: 0 0 8px;
    font-size: 20px;
    line-height: 1.4;
}

.order-center__status-fields {
    display: grid;
    gap: 14px;
}

.order-center__status-route {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 36px minmax(0, 1fr);
    gap: 8px;
    align-items: center;
}

.order-center__status-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
}

.order-center__status-arrow span {
    position: relative;
    display: block;
    width: 20px;
    height: 2px;
    border-radius: 999px;
    background: var(--action-card-text);
    opacity: 0.7;
}

.order-center__status-arrow span::after {
    content: '';
    position: absolute;
    right: -1px;
    top: 50%;
    width: 7px;
    height: 7px;
    border-top: 2px solid var(--action-card-text);
    border-right: 2px solid var(--action-card-text);
    transform: translateY(-50%) rotate(45deg);
}

.order-center__status-meta-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 16px;
}

.order-center__status-field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.order-center__status-field span {
    font-size: 12px;
    color: var(--action-card-text);
}

.order-center__status-field strong {
    font-size: 14px;
    line-height: 1.5;
    color: var(--action-card-title);
    word-break: break-all;
}

.order-center__status-card--active {
    cursor: pointer;
    transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}

.order-center__status-card--active:hover {
    transform: translateY(-2px);
    border-color: var(--action-card-hover-border);
    box-shadow: var(--action-card-hover-shadow);
}

.order-center__status-card p {
    margin: 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--action-card-text);
}

.order-center__empty--compact {
    margin-top: 0;
}

.order-center__action-card {
    border: 1px solid var(--action-card-border);
    border-radius: 24px;
    padding: 20px;
    text-align: left;
    cursor: pointer;
    background: var(--action-card-bg);
    color: var(--action-card-title);
    transition:
        transform 0.2s ease,
        border-color 0.2s ease,
        box-shadow 0.2s ease;
}

.order-center__action-card strong {
    display: block;
    margin-bottom: 8px;
    font-size: 18px;
}

.order-center__action-card p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--action-card-text);
}

.order-center__action-card:hover {
    transform: translateY(-2px);
    border-color: var(--action-card-hover-border);
    box-shadow: var(--action-card-hover-shadow);
}

@media (max-width: 768px) {
    .order-center__hero-actions {
        width: 100%;
    }

    .order-center__hero-actions .order-center__hero-btn {
        flex: 1;
        justify-content: center;
    }

    .order-center__action-grid {
        grid-template-columns: 1fr;
    }

    .order-center__status-route {
        grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr);
        gap: 6px;
    }

    .order-center__status-meta-row {
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
    }
}
</style>
