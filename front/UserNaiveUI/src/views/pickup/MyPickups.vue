<template>
    <div class="campus-orders" :class="{ 'is-dark': appStore.isDark }">
        <header class="campus-nav-sticky">
            <div class="nav-row">
                <button type="button" class="nav-back-btn" @click="router.back()">
                    <svg viewBox="0 0 24 24" class="icon-svg">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="tabs-group">
                    <button
                        v-for="tab in tabs"
                        :key="tab.key"
                        type="button"
                        class="tab-link"
                        :class="{ active: currentType === tab.key }"
                        @click="changeType(tab.key)"
                    >
                        {{ tab.label }}
                    </button>
                </div>
            </div>

            <div class="filter-section">
                <div class="filter-flex">
                    <button
                        v-for="item in statusOptions"
                        :key="item.value"
                        class="status-pill"
                        :class="{ active: currentStatus === item.value }"
                        @click="changeStatus(item.value)"
                    >
                        {{ item.label }}
                    </button>
                </div>
            </div>
        </header>

        <main class="order-viewport">
            <div v-if="loading" class="loading-wrap">
                <NSpin size="large" class="orders-loading-spinner" />
            </div>
            <div v-else>
                <div v-if="orders.length === 0" class="no-data-view">
                    <div class="no-data-icon">
                        <svg viewBox="0 0 24 24" class="svg-large">
                            <path
                                d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4.86 8.86l-3 3.87L9 13.14 6 17h12l-3.86-5.14z"
                                fill="currentColor"
                            />
                        </svg>
                    </div>
                    <h3>{{ emptyTitle }}</h3>
                    <p>{{ emptyDescription }}</p>
                </div>

                <div v-else class="order-stack">
                    <article
                        v-for="(order, index) in orders"
                        :key="order.id"
                        class="order-node touch-feedback"
                        :style="{ animationDelay: `${0.1 + index * 0.05}s` }"
                        @click="viewOrderDetail(order.id)"
                    >
                        <div class="node-top">
                            <div class="node-tag-group" :data-type="order.type">
                                <i class="v-line"></i>
                                <span class="v-text">{{ getTypeLabel(order.type) }}</span>
                            </div>
                            <NTag
                                size="small"
                                :bordered="false"
                                :type="getStatusTagType(order.status)"
                            >
                                {{ getStatusLabel(order.status) }}
                            </NTag>
                        </div>

                        <h3 class="node-title">{{ order.title }}</h3>

                        <div class="location-map">
                            <div class="map-line"></div>
                            <div class="map-point">
                                <span class="dot-p"></span>
                                <span class="label-p">取</span>
                                <span class="text-p">{{ order.pickup_location }}</span>
                            </div>
                            <div class="map-point">
                                <span class="dot-d"></span>
                                <span class="label-p">送</span>
                                <span class="text-p">{{ order.delivery_location }}</span>
                            </div>
                        </div>

                        <div class="node-details">
                            <div class="detail-item">
                                <label>订单编号</label>
                                <span>{{ order.order_no }}</span>
                            </div>
                            <div class="detail-item price-accent">
                                <label>{{ isPublisher(order) ? '应付' : '收益' }}</label>
                                <span class="val">¥{{ formatAmount(order.price, order.tip) }}</span>
                            </div>
                        </div>

                        <div class="node-footer">
                            <div class="user-info">
                                <div class="u-avatar">
                                    <svg viewBox="0 0 24 24" class="u-svg">
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                </div>
                                <span>{{ partnerLabel(order) }}: {{ partnerName(order) }}</span>
                            </div>

                            <div class="actions-group" @click.stop>
                                <NButton
                                    v-if="canCancel(order)"
                                    size="tiny"
                                    tertiary
                                    round
                                    @click="handleCancel(order)"
                                >
                                    取消
                                </NButton>
                                <NButton
                                    v-if="canConfirm(order)"
                                    size="tiny"
                                    type="primary"
                                    round
                                    @click="handleConfirm(order)"
                                >
                                    确认收货
                                </NButton>
                                <NButton
                                    v-if="canRate(order)"
                                    size="tiny"
                                    type="primary"
                                    quaternary
                                    @click="openRating(order)"
                                >
                                    评价
                                </NButton>
                            </div>
                        </div>
                    </article>
                </div>

                <div v-if="pagination?.has_next && orders.length > 0" class="more-trigger">
                    <NButton quaternary round :loading="loadingMore" @click="loadMore">
                        显示更多订单
                    </NButton>
                </div>
            </div>
        </main>

        <NModal
            v-model:show="showRatingModal"
            preset="card"
            title="评价订单"
            style="width: 92vw; max-width: 420px"
        >
            <div class="rating-modal">
                <div class="rating-stars">
                    <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        class="rating-star"
                        :class="{ active: star <= rating }"
                        @click="rating = star"
                    >
                        ★
                    </button>
                </div>
                <NInput
                    v-model:value="ratingComment"
                    type="textarea"
                    placeholder="请输入评价内容"
                    :rows="3"
                    maxlength="200"
                    show-count
                />
                <div class="rating-images">
                    <div class="rating-images__head">
                        <span>评价图片</span>
                        <button
                            type="button"
                            class="rating-images__upload"
                            :disabled="ratingUploading || ratingImages.length >= 6"
                            @click="handleSelectRatingImages"
                        >
                            {{ ratingUploading ? '上传中...' : '上传图片' }}
                        </button>
                    </div>
                    <div v-if="ratingImages.length" class="rating-images__grid">
                        <div
                            v-for="(image, index) in ratingImages"
                            :key="`${image}-${index}`"
                            class="rating-images__item"
                        >
                            <img
                                :src="resolveAssetUrl(image)"
                                alt="评价图片"
                                class="rating-images__preview"
                            />
                            <button
                                type="button"
                                class="rating-images__remove"
                                @click="removeRatingImage(index)"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                </div>
                <div class="rating-modal__actions">
                    <NButton @click="showRatingModal = false">取消</NButton>
                    <NButton type="primary" :loading="submittingRating" @click="submitRating">
                        提交评价
                    </NButton>
                </div>
            </div>
        </NModal>
        <input
            ref="ratingImageInputRef"
            type="file"
            accept="image/*"
            multiple
            style="display: none"
            @change="handleRatingImagesSelected"
        />
        <div class="safe-bottom"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NInput, NModal, NSpin, NTag, useDialog, useMessage } from 'naive-ui';
import { DelivererOrderApi, PickupApi, chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { PaginationMeta, PickupOrder } from '@/types';

type OrderTypeFilter = 'all' | 'published' | 'accepted';
type OrderStatusFilter = '' | PickupOrder['status'];

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();

const loading = ref(true);
const loadingMore = ref(false);
const currentType = ref<OrderTypeFilter>('published');
const currentStatus = ref<OrderStatusFilter>('');
const orders = ref<PickupOrder[]>([]);
const pagination = ref<PaginationMeta | null>(null);

const showRatingModal = ref(false);
const submittingRating = ref(false);
const currentOrder = ref<PickupOrder | null>(null);
const rating = ref(5);
const ratingComment = ref('');
const ratingImages = ref<string[]>([]);
const ratingUploading = ref(false);
const ratingImageInputRef = ref<HTMLInputElement | null>(null);

const tabs = computed(() =>
    userStore.user?.is_deliverer
        ? [
              { key: 'published' as OrderTypeFilter, label: '我发布的' },
              { key: 'accepted' as OrderTypeFilter, label: '我接的' },
          ]
        : [{ key: 'published' as OrderTypeFilter, label: '我发布的' }]
);

const statusOptions: Array<{ label: string; value: OrderStatusFilter }> = [
    { label: '全部状态', value: '' },
    { label: '待接单', value: 'pending' },
    { label: '已接单', value: 'accepted' },
    { label: '取货中', value: 'picking' },
    { label: '配送中', value: 'delivering' },
    { label: '已完成', value: 'completed' },
    { label: '已取消', value: 'cancelled' },
];

const emptyTitle = computed(() => {
    if (currentType.value === 'published') return '暂无发布订单';
    if (currentType.value === 'accepted') return '暂无承接订单';
    return '暂无订单记录';
});

const emptyDescription = computed(() => {
    if (currentStatus.value) {
        return '当前筛选条件下没有匹配的订单。';
    }
    return '创建一笔新订单后，这里会开始沉淀你的履约记录。';
});

const fetchOrders = async (page = 1, append = false) => {
    const target = page > 1 ? loadingMore : loading;
    target.value = true;

    try {
        const response =
            currentType.value === 'accepted' && userStore.user?.is_deliverer
                ? await DelivererOrderApi.getMyOrders({
                      page,
                      limit: 10,
                      status: currentStatus.value || undefined,
                  })
                : await PickupApi.getMyOrders({
                      page,
                      limit: 10,
                      type: currentType.value,
                      status: currentStatus.value || undefined,
                  });

        if (!response.success) {
            throw new Error(response.message || '获取订单失败');
        }

        const list = response.data || [];
        orders.value = append ? [...orders.value, ...list] : list;
        pagination.value = response.pagination || null;
    } catch (error: any) {
        message.error(error?.message || '获取订单失败');
    } finally {
        loading.value = false;
        loadingMore.value = false;
    }
};

const loadMore = async () => {
    if (!pagination.value?.has_next) return;
    await fetchOrders(pagination.value.current_page + 1, true);
};

const changeType = async (value: OrderTypeFilter) => {
    currentType.value = value;
    appStore.hapticFeedback('light');
    await fetchOrders(1, false);
};

const changeStatus = async (value: OrderStatusFilter) => {
    currentStatus.value = value;
    appStore.hapticFeedback('light');
    await fetchOrders(1, false);
};

const isPublisher = (order: PickupOrder) => order.user_id === userStore.user?.id;

const getTypeLabel = (type: PickupOrder['type']) => {
    const map = {
        express: '快递代取',
        food: '外卖代拿',
        medicine: '药品代购',
        daily: '生活用品',
    };
    return map[type] || '代取订单';
};

const getStatusLabel = (status: PickupOrder['status']) => {
    const map = {
        pending: '待接单',
        accepted: '已接单',
        picking: '取货中',
        delivering: '配送中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return map[status] || status;
};

const getStatusTagType = (status: PickupOrder['status']) => {
    const map = {
        pending: 'warning',
        accepted: 'info',
        picking: 'info',
        delivering: 'info',
        completed: 'success',
        cancelled: 'default',
    } as const;
    return map[status] || 'default';
};

const formatAmount = (price?: number, tip?: number) => Number(price || 0) + Number(tip || 0);

const formatDateTime = (value?: string) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}`;
};

const resolveAssetUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('/uploads/')) return `${window.location.origin}${value}`;
    return value;
};

const partnerLabel = (order: PickupOrder) => (isPublisher(order) ? '配送员' : '发布人');

const partnerName = (order: PickupOrder) => {
    if (isPublisher(order)) {
        return order.deliverer?.username || order.deliverer?.real_name || '暂未接单';
    }
    return order.user?.username || order.user?.real_name || '匿名用户';
};

const canCancel = (order: PickupOrder) => isPublisher(order) && order.status === 'pending';

const canConfirm = (order: PickupOrder) => isPublisher(order) && order.status === 'delivering';

const canRate = (order: PickupOrder) =>
    isPublisher(order) && order.status === 'completed' && !order.rating;

const viewOrderDetail = (id: number) => {
    appStore.hapticFeedback('light');
    router.push(`/pickup/${id}`);
};

const handleCancel = (order: PickupOrder) => {
    dialog.warning({
        title: '取消订单',
        content: '确认取消这笔订单吗？',
        positiveText: '确认',
        negativeText: '再想想',
        async onPositiveClick() {
            try {
                const response = await PickupApi.cancelOrder(order.id);
                if (!response.success) {
                    throw new Error(response.message || '取消订单失败');
                }
                message.success('订单已取消');
                await fetchOrders(1, false);
            } catch (error: any) {
                message.error(error?.message || '取消订单失败');
            }
        },
    });
};

const handleConfirm = (order: PickupOrder) => {
    dialog.warning({
        title: '确认收货',
        content: '确认已收到货物吗？确认后订单将完成，并结算款项给配送员。',
        positiveText: '确认收货',
        negativeText: '再看看',
        async onPositiveClick() {
            try {
                const response = await PickupApi.confirmOrder(order.id);
                if (!response.success) {
                    throw new Error(response.message || '确认收货失败');
                }
                message.success('已确认收货，订单已完成');
                await fetchOrders(1, false);
            } catch (error: any) {
                message.error(error?.message || '确认收货失败');
            }
        },
    });
};

const resetRatingForm = () => {
    rating.value = 5;
    ratingComment.value = '';
    ratingImages.value = [];
    ratingUploading.value = false;
    if (ratingImageInputRef.value) {
        ratingImageInputRef.value.value = '';
    }
};

const openRating = (order: PickupOrder) => {
    currentOrder.value = order;
    resetRatingForm();
    showRatingModal.value = true;
};

const handleSelectRatingImages = () => {
    ratingImageInputRef.value?.click();
};

const handleRatingImagesSelected = async (event: Event) => {
    const input = event.target as HTMLInputElement | null;
    const files = Array.from(input?.files || []);
    if (!files.length) return;

    const availableSlots = Math.max(0, 6 - ratingImages.value.length);
    const selectedFiles = files.slice(0, availableSlots);

    if (!selectedFiles.length) {
        if (input) input.value = '';
        message.warning('最多上传 6 张评价图片');
        return;
    }

    ratingUploading.value = true;
    try {
        const uploadedUrls = await Promise.all(
            selectedFiles.map(async file => {
                const uploadRes = await chatApi.uploadImage(file, 'order-review');
                const imageUrl = uploadRes.data?.path || uploadRes.data?.url;
                if (!imageUrl) {
                    throw new Error('评价图片上传失败');
                }
                return imageUrl;
            })
        );
        ratingImages.value = [...ratingImages.value, ...uploadedUrls];
        if (files.length > availableSlots) {
            message.warning('最多上传 6 张评价图片，其余图片已忽略');
        }
    } catch (error: any) {
        message.error(error?.message || '评价图片上传失败');
    } finally {
        ratingUploading.value = false;
        if (input) input.value = '';
    }
};

const removeRatingImage = (index: number) => {
    ratingImages.value = ratingImages.value.filter((_, currentIndex) => currentIndex !== index);
};

const submitRating = async () => {
    if (!currentOrder.value) return;

    submittingRating.value = true;
    try {
        const response = await PickupApi.rateOrder(currentOrder.value.id, {
            rating: rating.value,
            comment: ratingComment.value || undefined,
            images: ratingImages.value.length ? ratingImages.value : undefined,
        });

        if (!response.success) {
            throw new Error(response.message || '评价失败');
        }

        message.success('评价成功');
        showRatingModal.value = false;
        resetRatingForm();
        await fetchOrders(1, false);
    } catch (error: any) {
        message.error(error?.message || '评价失败');
    } finally {
        submittingRating.value = false;
    }
};

onMounted(async () => {
    currentType.value = userStore.user?.is_deliverer ? 'accepted' : 'published';
    await fetchOrders();
});
</script>

<style scoped>
.campus-orders {
    --primary: #3b82f6;
    --cyan: #06b6d4;
    --grad: linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%);
    --surface: #f8fafc;
    --card: #ffffff;
    --text: #1e293b;
    --muted: #94a3b8;
    min-height: 100vh;
    background-color: var(--surface);
    color: var(--text);
}

.campus-orders.is-dark {
    --surface: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
}

.campus-nav-sticky {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-main {
    display: flex;
    align-items: center;
    padding: 12px 16px;
}

.nav-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 16px 10px;
}

.nav-back-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--text);
    cursor: pointer;
    flex-shrink: 0;
}

.icon-svg {
    width: 20px;
    height: 20px;
}

.tabs-group {
    display: flex;
    gap: 16px;
    overflow-x: auto;
    scrollbar-width: none;
    min-width: 0;
}

.tab-link {
    white-space: nowrap;
    border: none;
    background: transparent;
    font-size: 17px;
    font-weight: 600;
    color: var(--muted);
    padding: 4px 0;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tab-link.active {
    color: var(--text);
    font-size: 19px;
    transform: translateY(-1px);
}

.filter-section {
    padding: 8px 0 16px;
}

.filter-flex {
    display: flex;
    gap: 8px;
    padding: 0 16px;
    overflow-x: auto;
    scrollbar-width: none;
}

.status-pill {
    white-space: nowrap;
    border: none;
    background: var(--card);
    border-radius: 99px;
    padding: 7px 16px;
    font-size: 13px;
    color: var(--muted);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

.status-pill.active {
    background: var(--grad);
    color: #ffffff;
    box-shadow: 0 4px 12px rgba(6, 182, 212, 0.25);
}

.order-viewport {
    padding: 8px 16px;
}

.loading-wrap {
    min-height: 240px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.orders-loading-spinner :deep(.n-base-loading__container) {
    color: #3b82f6;
}

.order-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.order-node {
    background: var(--card);
    border-radius: 24px;
    padding: 20px;
    box-shadow: 0 8px 24px -4px rgba(0, 0, 0, 0.04);
    animation: slide-up 0.5s ease-out both;
}

.node-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.node-tag-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.v-line {
    width: 3px;
    height: 12px;
    border-radius: 2px;
    background: var(--primary);
}

.node-tag-group[data-type='food'] .v-line {
    background: #f97316;
}
.node-tag-group[data-type='medicine'] .v-line {
    background: #10b981;
}

.v-text {
    font-size: 11px;
    font-weight: 700;
    color: var(--muted);
}

.node-title {
    margin: 0 0 16px;
    font-size: 18px;
    font-weight: 700;
}

.location-map {
    background: rgba(148, 163, 184, 0.05);
    border-radius: 16px;
    padding: 16px;
    margin-bottom: 16px;
    position: relative;
}

.map-line {
    position: absolute;
    left: 21px;
    top: 24px;
    bottom: 24px;
    width: 1px;
    border-left: 1px dashed #cbd5e1;
}

.map-point {
    display: flex;
    align-items: center;
    gap: 12px;
    position: relative;
    z-index: 1;
}

.map-point:first-of-type {
    margin-bottom: 12px;
}

.dot-p,
.dot-d {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: white;
    border: 2px solid var(--primary);
}

.dot-d {
    border-color: #f97316;
}

.label-p {
    font-size: 10px;
    font-weight: 800;
    color: var(--muted);
}

.text-p {
    font-size: 14px;
    font-weight: 500;
}

.node-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 16px;
}

.detail-item label {
    display: block;
    font-size: 10px;
    color: var(--muted);
    margin-bottom: 4px;
}

.detail-item span {
    font-size: 13px;
    font-weight: 600;
}

.price-accent .val {
    color: var(--primary);
    font-size: 16px;
}

.node-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 14px;
    border-top: 1px solid rgba(148, 163, 184, 0.1);
}

.user-info {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--muted);
}

.u-avatar {
    width: 24px;
    height: 24px;
    background: #e2e8f0;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
}

.u-svg {
    width: 14px;
    height: 14px;
}

.actions-group {
    display: flex;
    gap: 8px;
}

.rating-modal {
    display: grid;
    gap: 14px;
}

.rating-stars {
    display: flex;
    gap: 10px;
}

.rating-star {
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.14);
    color: #94a3b8;
    font-size: 22px;
}

.rating-star.active {
    background: rgba(59, 130, 246, 0.14);
    color: #f59e0b;
}

.rating-images {
    display: grid;
    gap: 10px;
}

.rating-images__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.rating-images__head span {
    font-size: 13px;
    font-weight: 700;
    color: var(--muted);
}

.rating-images__upload {
    border: none;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: var(--primary);
    font-size: 12px;
    font-weight: 700;
    padding: 7px 12px;
}

.rating-images__grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
}

.rating-images__item {
    position: relative;
    overflow: hidden;
    border-radius: 14px;
    background: #eef4ff;
    aspect-ratio: 1;
}

.rating-images__preview {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.rating-images__remove {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 24px;
    height: 24px;
    border: none;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.72);
    color: #fff;
    font-size: 16px;
    line-height: 1;
}

.rating-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
}

.no-data-view {
    padding: 100px 20px;
    text-align: center;
}

.no-data-icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 20px;
    background: #f1f5f9;
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #cbd5e1;
}

.svg-large {
    width: 32px;
    height: 32px;
}

@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(24px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.safe-bottom {
    height: 100px;
}
</style>
