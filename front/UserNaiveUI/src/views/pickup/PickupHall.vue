<template>
    <div class="pickup-hall" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-bar">
            <div class="nav-row">
                <button type="button" class="back-btn touch-feedback" @click="router.back()">
                    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="title-group">
                    <strong>全部订单</strong>
                </div>
            </div>

            <div class="category-bar">
                <button
                    v-for="tab in categoryTabs"
                    :key="tab.key"
                    type="button"
                    class="cat-chip"
                    :class="{ active: currentTab === tab.key }"
                    @click="handleTabChange(tab.key)"
                >
                    {{ tab.label }}
                </button>
            </div>
        </header>

        <main class="list-area">
            <div v-if="loading" class="state-box">
                <NSpin size="large" />
            </div>

            <template v-else-if="filteredOrders.length > 0">
                <article
                    v-for="(order, index) in filteredOrders"
                    :key="order.id"
                    class="pickup-card"
                    :style="{ animationDelay: `${index * 0.05}s` }"
                    @click="handleOrderClick(order)"
                >
                    <div class="card-head">
                        <div class="cat-tag" :data-type="order.type">
                            <span class="cat-bar"></span>
                            <span class="cat-label">{{ getOrderTypeLabel(order.type) }}</span>
                        </div>
                        <span class="status-badge">
                            {{ getStatusLabel(order.status) }}
                        </span>
                    </div>

                    <div class="card-title-row">
                        <h3 class="card-title">{{ order.title }}</h3>
                        <div class="publisher">
                            <div class="pub-avatar">
                                <img
                                    v-if="resolveAvatarUrl(order.user?.avatar)"
                                    :src="resolveAvatarUrl(order.user?.avatar)"
                                    :alt="
                                        order.user?.username || order.user?.real_name || '用户头像'
                                    "
                                    class="pub-avatar__image"
                                />
                                <svg
                                    v-else
                                    viewBox="0 0 24 24"
                                    width="16"
                                    height="16"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                        fill="currentColor"
                                    />
                                </svg>
                            </div>
                            <span>
                                {{ order.user?.username || order.user?.real_name || '匿名用户' }}
                            </span>
                        </div>
                    </div>

                    <p v-if="getOrderSummary(order)" class="card-desc">
                        {{ getOrderSummary(order) }}
                    </p>

                    <div class="location-map">
                        <div class="map-line"></div>
                        <div
                            v-for="(location, locationIndex) in getPickupLocations(order)"
                            :key="`pickup-${order.id}-${locationIndex}`"
                            class="map-point"
                        >
                            <span class="dot-p"></span>
                            <span class="label-p">取</span>
                            <span class="text-p">{{ location }}</span>
                        </div>
                        <div
                            v-for="(location, locationIndex) in getDeliveryLocations(order)"
                            :key="`delivery-${order.id}-${locationIndex}`"
                            class="map-point"
                        >
                            <span class="dot-d"></span>
                            <span class="label-p">送</span>
                            <span class="text-p">{{ location }}</span>
                        </div>
                    </div>

                    <div class="card-meta">
                        <span>
                            <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden="true">
                                <path
                                    d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"
                                    fill="currentColor"
                                />
                            </svg>
                            发布 {{ formatRelativeTime(order.createdAt) }}
                        </span>
                        <span v-if="order.urgent" class="tag-pill urgent">加急</span>
                        <span v-if="order.fragile" class="tag-pill">易碎</span>
                    </div>

                    <div class="divider"></div>

                    <div class="card-foot">
                        <div class="foot-info">
                            <div class="info-item">
                                <span class="info-label">应付</span>
                                <span class="info-price">
                                    ¥{{ formatAmount(order.price, order.tip) }}
                                </span>
                            </div>
                        </div>
                        <div class="foot-actions" @click.stop>
                            <NButton
                                size="small"
                                round
                                secondary
                                class="contact-action-btn"
                                @click="handleContactUser(order)"
                            >
                                联系
                            </NButton>
                            <NButton
                                size="small"
                                type="primary"
                                round
                                :loading="acceptingId === order.id"
                                @click="handleAcceptOrder(order)"
                            >
                                接单
                            </NButton>
                        </div>
                    </div>
                </article>
            </template>

            <div v-else class="state-box">
                <p class="empty-text">当前分类下暂无可接订单</p>
            </div>
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NSpin, useMessage } from 'naive-ui';
import { DelivererOrderApi, chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { PickupOrder } from '@/types';

type CategoryKey = 'all' | PickupOrder['type'];

const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const message = useMessage();

const loading = ref(false);
const acceptingId = ref<number | null>(null);
const currentTab = ref<CategoryKey>('all');
const orders = ref<PickupOrder[]>([]);

const categoryTabs: Array<{ key: CategoryKey; label: string }> = [
    { key: 'all', label: '全部' },
    { key: 'express', label: '快递' },
    { key: 'food', label: '外卖' },
    { key: 'medicine', label: '药品' },
    { key: 'daily', label: '生活' },
];

const filteredOrders = computed(() => {
    if (currentTab.value === 'all') return orders.value;
    return orders.value.filter(order => order.type === currentTab.value);
});

const getOrderTypeLabel = (type: PickupOrder['type']) =>
    (
        ({
            express: '快递类',
            food: '外卖类',
            medicine: '药品类',
            daily: '生活类',
        }) as Record<PickupOrder['type'], string>
    )[type] || '订单';

const getStatusLabel = (status: PickupOrder['status']) =>
    (
        ({
            pending: '待接中',
            accepted: '已接单',
            picking: '取货中',
            delivering: '配送中',
            completed: '已完成',
            cancelled: '已取消',
        }) as Record<PickupOrder['status'], string>
    )[status] || status;

const getOrderSummary = (order: PickupOrder) => {
    if (order.type === 'express' || order.type === 'food') {
        return '';
    }
    return order.description || '';
};

const getMaskedContactLabel = (order: PickupOrder) => {
    if (order.type === 'express') return '接单后可见';
    if (order.type === 'food') return '接单后可见';
    return order.contact_name || '接单后可见';
};

const normalizeLocationList = (value?: string[] | string | null) => {
    if (Array.isArray(value)) {
        return Array.from(
            new Set(
                value.map(item => (typeof item === 'string' ? item.trim() : '')).filter(Boolean)
            )
        );
    }

    if (typeof value !== 'string') {
        return [];
    }

    const source = value.trim();
    if (!source) {
        return [];
    }

    const splitValues = source
        .split(/\r?\n|；|;|\|/)
        .map(item => item.trim())
        .filter(Boolean);

    return Array.from(new Set(splitValues.length ? splitValues : [source]));
};

const getPickupLocations = (order: PickupOrder) => {
    const locations = normalizeLocationList(order.pickup_locations || order.pickup_location);
    return locations.length ? locations : ['--'];
};

const getDeliveryLocations = (order: PickupOrder) => {
    const locations = normalizeLocationList(order.delivery_locations || order.delivery_location);
    return locations.length ? locations : ['--'];
};

const formatAmount = (price?: number | string, tip?: number | string) =>
    (Number(price || 0) + Number(tip || 0)).toFixed(2);

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('/uploads/')) return `${window.location.origin}${value}`;
    return value;
};

const formatRelativeTime = (value?: string | null) => {
    if (!value) return '--';
    const diff = Date.now() - new Date(value).getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const fetchAvailableOrders = async () => {
    loading.value = true;
    try {
        const response = await DelivererOrderApi.getAvailableOrders({
            page: 1,
            limit: 20,
            type: currentTab.value,
        });
        if (!response.success) {
            throw new Error(response.message || '获取可接订单失败');
        }
        orders.value = Array.isArray(response.data) ? response.data : [];
    } catch (error) {
        orders.value = [];
        message.error(error instanceof Error ? error.message : '获取可接订单失败');
    } finally {
        loading.value = false;
    }
};

const handleTabChange = async (key: CategoryKey) => {
    currentTab.value = key;
    appStore.hapticFeedback('light');
    await fetchAvailableOrders();
};

const handleOrderClick = (order: { id: number }) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${order.id}`);
};

const handleAcceptOrder = async (order: PickupOrder) => {
    acceptingId.value = order.id;
    try {
        const response = await DelivererOrderApi.acceptOrder(order.id);
        if (!response.success) {
            throw new Error(response.message || '接单失败');
        }
        message.success('接单成功');
        appStore.hapticFeedback('medium');
        await Promise.all([fetchAvailableOrders(), userStore.fetchUserProfile()]);
        router.push(`/pickup/${order.id}`);
    } catch (error) {
        message.error(error instanceof Error ? error.message : '接单失败');
    } finally {
        acceptingId.value = null;
    }
};

const handleContactUser = async (order: PickupOrder) => {
    const peerUserId = Number(order.user?.id || order.user_id || 0);
    if (!peerUserId) {
        message.warning('未找到用户信息');
        return;
    }

    try {
        const response = await chatApi.createConversation({
            peer_user_id: peerUserId,
            order_id: order.id,
            initial_message: `想沟通订单「${order.title}」的配送细节。`,
        });
        appStore.hapticFeedback('light');
        router.push({
            path: '/chat',
            query: response.data?.id ? { conversationId: String(response.data.id) } : {},
        });
    } catch (error: any) {
        message.error(error?.message || '打开聊天失败');
    }
};

onMounted(async () => {
    if (!userStore.user?.is_deliverer) {
        router.replace('/pickup/list');
        return;
    }
    await fetchAvailableOrders();
});
</script>

<style scoped>
.pickup-hall {
    --bg: #f5f7fb;
    --card: #ffffff;
    --text: #111827;
    --muted: #94a3b8;
    --line: #e5e7eb;
    --blue: #3b82f6;
    --green-soft: #dcfce7;
    --green-text: #16a34a;
    min-height: 100vh;
    background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
    color: var(--text);
}

.pickup-hall.is-dark {
    --bg: #0f172a;
    --card: #182235;
    --text: #f8fafc;
    --muted: #94a3b8;
    --line: rgba(148, 163, 184, 0.18);
    background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
}

.top-bar {
    position: sticky;
    top: 0;
    z-index: 30;
    padding: 10px 16px 14px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(16px);
}

.nav-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.back-btn {
    width: 34px;
    height: 34px;
    border: 0;
    border-radius: 50%;
    background: transparent;
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
}

.title-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.title-group {
    font-size: 15px;
    line-height: 1.2;
    font-weight: 800;
}

.title-group span {
    font-size: 12px;
    color: var(--muted);
}

.category-bar {
    display: flex;
    gap: 10px;
    margin-top: 14px;
    overflow-x: auto;
    scrollbar-width: none;
}

.cat-chip {
    white-space: nowrap;
    border: 0;
    border-radius: 999px;
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.65);
    color: #64748b;
    font-size: 14px;
    font-weight: 700;
}

.cat-chip.active {
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: #fff;
    box-shadow: 0 10px 22px rgba(59, 130, 246, 0.25);
}

.list-area {
    padding: 10px 16px calc(120px + env(safe-area-inset-bottom, 0px));
}

.pickup-card {
    background: color-mix(in srgb, var(--card) 96%, transparent);
    border-radius: 22px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.06);
    padding: 18px 18px 16px;
    margin-bottom: 16px;
    animation: slide-up 0.45s ease both;
}

.card-head,
.card-title-row,
.card-foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.cat-tag {
    display: flex;
    align-items: center;
    gap: 8px;
}

.cat-bar {
    width: 3px;
    height: 14px;
    border-radius: 999px;
    background: var(--blue);
}

.cat-tag[data-type='food'] .cat-bar {
    background: #f97316;
}

.cat-tag[data-type='medicine'] .cat-bar {
    background: #10b981;
}

.cat-tag[data-type='daily'] .cat-bar {
    background: #8b5cf6;
}

.cat-label {
    font-size: 13px;
    font-weight: 700;
    color: #64748b;
}

.status-badge {
    flex-shrink: 0;
    padding: 6px 12px;
    border-radius: 999px;
    background: var(--green-soft);
    color: var(--green-text);
    font-size: 13px;
    font-weight: 700;
}

.card-title {
    margin: 12px 0 0;
    font-size: 28px;
    line-height: 1.3;
    font-weight: 800;
}

.publisher {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--muted);
    font-size: 13px;
}

.pub-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #eef2f7;
    color: #94a3b8;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
}

.pub-avatar__image {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.card-desc {
    margin: 8px 0 0;
    font-size: 15px;
    line-height: 1.65;
    color: #64748b;
}

.location-map {
    position: relative;
    margin-top: 16px;
    border-radius: 18px;
    background: rgba(148, 163, 184, 0.06);
    padding: 16px 16px 16px 18px;
}

.map-line {
    position: absolute;
    left: 23px;
    top: 29px;
    bottom: 29px;
    width: 2px;
    background: rgba(148, 163, 184, 0.22);
}

.map-point {
    position: relative;
    display: grid;
    grid-template-columns: 18px 18px 1fr;
    gap: 10px;
    align-items: center;
}

.map-point + .map-point {
    margin-top: 14px;
}

.dot-p,
.dot-d {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid var(--blue);
    z-index: 1;
}

.dot-d {
    border-color: #f97316;
}

.label-p {
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
}

.text-p {
    font-size: 15px;
    line-height: 1.5;
    font-weight: 700;
    color: var(--text);
}

.card-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 10px 14px;
    margin-top: 14px;
    font-size: 13px;
    color: var(--muted);
}

.card-meta span {
    display: inline-flex;
    align-items: center;
    gap: 5px;
}

.tag-pill {
    padding: 4px 10px;
    border-radius: 999px;
    background: #eef2ff;
    color: #475569;
}

.tag-pill.urgent {
    background: #fee2e2;
    color: #dc2626;
}

.divider {
    height: 1px;
    margin: 16px 0 14px;
    background: var(--line);
}

.foot-info {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 0.7fr) minmax(0, 0.8fr);
    gap: 18px;
    min-width: 0;
    flex: 1;
}

.info-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
}

.info-label {
    font-size: 12px;
    color: var(--muted);
}

.info-price {
    font-size: 16px;
    color: var(--blue);
    font-weight: 800;
}

.info-order-no {
    font-size: 14px;
    font-weight: 800;
    color: var(--text);
    word-break: break-all;
    line-height: 1.5;
}

.info-val {
    font-size: 14px;
    font-weight: 700;
    color: var(--text);
    line-height: 1.5;
    word-break: break-word;
}

.foot-actions {
    display: flex;
    align-items: center;
    gap: 10px;
}

.contact-action-btn {
    color: #475569 !important;
}

.state-box {
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.empty-text {
    color: var(--muted);
    font-size: 15px;
}

@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(18px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@media (max-width: 480px) {
    .card-title {
        font-size: 22px;
    }

    .card-title-row,
    .card-foot {
        align-items: flex-start;
        flex-direction: column;
    }

    .foot-info {
        width: 100%;
        grid-template-columns: 1fr;
        gap: 12px;
    }

    .foot-actions {
        width: 100%;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
    }

    .foot-actions :deep(.n-button) {
        width: 100%;
    }
}
</style>
