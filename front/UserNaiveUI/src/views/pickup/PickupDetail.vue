<template>
    <div class="campus-detail" :class="{ 'is-dark': appStore.isDark }">
        <header class="campus-nav-sticky">
            <div class="nav-main">
                <button type="button" class="back-icon-btn touch-feedback" @click="router.back()">
                    <svg viewBox="0 0 24 24" class="icon-svg" aria-hidden="true">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="title-block">
                    <strong>订单详情</strong>
                    <span>{{ getTypeLabel(order?.type) }}</span>
                </div>
            </div>
        </header>

        <main class="order-viewport">
            <div v-if="loading" class="loading-wrap">
                <MobileLoading type="default" text="加载中..." />
            </div>

            <div v-else-if="order" class="detail-stack">
                <article class="order-node">
                    <div class="node-top">
                        <div class="node-tag-group" :data-type="order.type">
                            <i class="v-line"></i>
                            <span class="v-text">{{ getTypeLabel(order.type) }}</span>
                        </div>
                        <NTag size="small" :bordered="false" :type="getStatusTagType(order.status)">
                            {{ getStatusLabel(order.status) }}
                        </NTag>
                    </div>

                    <h1 class="node-title">{{ order.title }}</h1>
                    <p v-if="order.description" class="node-desc">{{ order.description }}</p>

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
                            <label>{{ isPublisher ? '应付' : '金额' }}</label>
                            <span class="val">¥{{ formatAmount(order.price, order.tip) }}</span>
                        </div>
                    </div>

                    <div class="detail-grid">
                        <div class="detail-box">
                            <label>联系人</label>
                            <span>{{ order.contact_name }}</span>
                        </div>
                        <div class="detail-box">
                            <label>联系电话</label>
                            <span>{{ order.contact_phone }}</span>
                        </div>
                        <div class="detail-box">
                            <label>创建时间</label>
                            <span>{{ formatDateTime(order.createdAt) }}</span>
                        </div>
                        <div class="detail-box">
                            <label>支付状态</label>
                            <span>{{ getPaymentLabel(order.payment_status) }}</span>
                        </div>
                        <div v-if="order.pickup_code" class="detail-box">
                            <label>取件码</label>
                            <span>{{ order.pickup_code }}</span>
                        </div>
                        <div v-if="order.delivery_time" class="detail-box">
                            <label>期望送达</label>
                            <span>{{ formatDateTime(order.delivery_time) }}</span>
                        </div>
                    </div>

                    <div v-if="optionTags.length" class="chip-row">
                        <span v-for="tag in optionTags" :key="tag" class="info-chip">
                            {{ tag }}
                        </span>
                    </div>

                    <div v-if="timelineItems.length" class="timeline-panel">
                        <div
                            v-for="item in timelineItems"
                            :key="item.key"
                            class="timeline-item"
                            :class="{ active: item.active, done: item.done }"
                        >
                            <span class="timeline-dot"></span>
                            <div class="timeline-content">
                                <strong>{{ item.title }}</strong>
                                <p>{{ item.text }}</p>
                                <span v-if="item.time">{{ item.time }}</span>
                            </div>
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
                            <span>{{ counterpartLabel }}: {{ counterpartName }}</span>
                        </div>

                        <div class="actions-group" @click.stop>
                            <NButton
                                v-if="canCancel"
                                size="tiny"
                                tertiary
                                round
                                :loading="cancelling"
                                @click="handleCancel"
                            >
                                取消
                            </NButton>
                            <NButton
                                v-if="canConfirm"
                                size="tiny"
                                type="primary"
                                round
                                :loading="confirming"
                                @click="handleConfirm"
                            >
                                确认送达
                            </NButton>
                            <NButton
                                v-if="canRate"
                                size="tiny"
                                type="primary"
                                quaternary
                                @click="showRatingModal = true"
                            >
                                评价
                            </NButton>
                            <NButton
                                v-if="counterpartUserId"
                                size="tiny"
                                round
                                quaternary
                                @click="handleChat"
                            >
                                聊一聊
                            </NButton>
                            <NButton
                                v-if="counterpartPhone"
                                tag="a"
                                :href="`tel:${counterpartPhone}`"
                                size="tiny"
                                round
                                quaternary
                            >
                                联系
                            </NButton>
                        </div>
                    </div>
                </article>
            </div>

            <div v-else class="error-wrap">
                <MobileEmpty
                    type="error"
                    title="订单不存在"
                    description="该订单可能已被删除或您没有权限查看"
                    :show-action="true"
                    action-text="返回列表"
                    @action="router.push('/pickup/my')"
                />
            </div>
        </main>

        <MobileModal v-model:show="showRatingModal" title="评价订单" @confirm="submitRating">
            <div class="rating-form">
                <div class="rating-stars">
                    <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        class="rating-star"
                        :class="{ active: star <= rating }"
                        @click="rating = star"
                    >
                        <NIcon size="22">
                            <StarOutline />
                        </NIcon>
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
            </div>
        </MobileModal>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NIcon, NInput, NTag, useDialog, useMessage } from 'naive-ui';
import { StarOutline } from '@vicons/ionicons5';
import { PickupApi, chatApi } from '@/api';
import { MobileEmpty, MobileLoading, MobileModal } from '@/components/mobile';
import { useAppStore, useUserStore } from '@/stores';
import type { PickupOrder } from '@/types';

const router = useRouter();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();

const loading = ref(true);
const cancelling = ref(false);
const confirming = ref(false);
const showRatingModal = ref(false);
const rating = ref(5);
const ratingComment = ref('');
const order = ref<PickupOrder | null>(null);

const isPublisher = computed(() => order.value?.user_id === userStore.user?.id);

const optionTags = computed(() => {
    if (!order.value) return [];
    const tags: string[] = [];
    if (order.value.urgent) tags.push('加急订单');
    if (order.value.fragile) tags.push('易碎物品');
    return tags;
});

const counterpartLabel = computed(() => (isPublisher.value ? '配送员' : '发布人'));
const counterpartName = computed(() => {
    if (!order.value) return '--';
    if (isPublisher.value) {
        return order.value.deliverer?.username || order.value.deliverer?.real_name || '暂未接单';
    }
    return order.value.user?.username || order.value.user?.real_name || '匿名用户';
});
const counterpartPhone = computed(() => {
    if (!order.value) return '';
    return isPublisher.value ? order.value.deliverer?.phone || '' : order.value.user?.phone || '';
});
const counterpartUserId = computed(() => {
    if (!order.value) return null;
    if (isPublisher.value) {
        return order.value.deliverer?.id || order.value.deliverer_id || null;
    }
    return order.value.user?.id || order.value.user_id || null;
});

const canCancel = computed(() =>
    Boolean(
        order.value && isPublisher.value && ['pending', 'accepted'].includes(order.value.status)
    )
);
const canConfirm = computed(() =>
    Boolean(order.value && isPublisher.value && order.value.status === 'delivering')
);
const canRate = computed(() =>
    Boolean(
        order.value &&
        isPublisher.value &&
        order.value.status === 'completed' &&
        !order.value.rating
    )
);

const timelineItems = computed(() => {
    if (!order.value) return [];

    const current = order.value.status;
    const acceptedDone = ['accepted', 'picking', 'delivering', 'completed'].includes(current);
    const pickingDone = ['picking', 'delivering', 'completed'].includes(current);
    const deliveringDone = ['delivering', 'completed'].includes(current);

    return [
        {
            key: 'created',
            title: '订单创建',
            text: '需求已提交，等待后续处理。',
            time: formatDateTime(order.value.createdAt),
            active: current === 'pending',
            done: true,
        },
        {
            key: 'accepted',
            title: '订单接单',
            text: current === 'cancelled' ? '订单未进入接单流程。' : '配送员已接单，准备开始处理。',
            time: formatDateTime(order.value.accept_time),
            active: current === 'accepted',
            done: acceptedDone,
        },
        {
            key: 'picking',
            title: '取货处理中',
            text: '订单正在取货或代购。',
            time: formatDateTime(order.value.pickup_complete_time),
            active: current === 'picking',
            done: pickingDone,
        },
        {
            key: 'delivering',
            title: current === 'cancelled' ? '订单终止' : '配送送达',
            text:
                current === 'cancelled'
                    ? order.value.cancel_reason || '订单已取消。'
                    : current === 'completed'
                      ? '订单已送达完成。'
                      : '订单正在配送途中。',
            time:
                current === 'cancelled'
                    ? formatDateTime(order.value.cancel_time)
                    : formatDateTime(order.value.delivery_complete_time),
            active: current === 'delivering' || current === 'cancelled',
            done: deliveringDone || current === 'cancelled',
        },
    ].filter(item => item.done || item.active || item.key === 'created');
});

const getTypeLabel = (type?: PickupOrder['type']) => {
    const map = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活代购',
    };
    return type ? map[type] || '订单' : '订单';
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

const getPaymentLabel = (status: PickupOrder['payment_status']) => {
    const map = {
        unpaid: '未支付',
        paid: '已支付',
        refunded: '已退款',
    };
    return map[status] || status;
};

const formatAmount = (price?: string | number, tip?: string | number) =>
    (Number(price || 0) + Number(tip || 0)).toFixed(2);

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
        date.getDate()
    ).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(
        date.getMinutes()
    ).padStart(2, '0')}`;
};

const fetchOrderDetail = async () => {
    loading.value = true;
    try {
        const response = await PickupApi.getOrder(Number(route.params.id));
        if (!response.success) {
            throw new Error(response.message || '获取订单详情失败');
        }
        order.value = response.data || null;
    } catch (error: any) {
        message.error(error?.message || '获取订单详情失败');
        order.value = null;
    } finally {
        loading.value = false;
    }
};

const handleChat = async () => {
    if (!order.value || !counterpartUserId.value) return;

    try {
        const response = await chatApi.createConversation({
            peer_user_id: Number(counterpartUserId.value),
            order_id: order.value.id,
            initial_message: `想沟通订单「${order.value.title}」的配送细节。`,
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

const handleCancel = () => {
    if (!order.value) return;
    dialog.warning({
        title: '取消订单',
        content: '确认取消这笔订单吗？',
        positiveText: '确认',
        negativeText: '再想想',
        async onPositiveClick() {
            cancelling.value = true;
            try {
                const response = await PickupApi.cancelOrder(order.value!.id);
                if (!response.success) {
                    throw new Error(response.message || '取消订单失败');
                }
                order.value = response.data || order.value;
                message.success('订单已取消');
                appStore.hapticFeedback('medium');
            } catch (error: any) {
                message.error(error?.message || '取消订单失败');
            } finally {
                cancelling.value = false;
            }
        },
    });
};

const handleConfirm = async () => {
    if (!order.value) return;
    confirming.value = true;
    try {
        const response = await PickupApi.confirmOrder(order.value.id);
        if (!response.success) {
            throw new Error(response.message || '确认完成失败');
        }
        order.value = response.data || order.value;
        message.success('订单已确认完成');
        appStore.hapticFeedback('medium');
    } catch (error: any) {
        message.error(error?.message || '确认完成失败');
    } finally {
        confirming.value = false;
    }
};

const submitRating = async () => {
    if (!order.value) return;
    try {
        const response = await PickupApi.rateOrder(order.value.id, {
            rating: rating.value,
            comment: ratingComment.value || undefined,
        });
        if (!response.success) {
            throw new Error(response.message || '评价失败');
        }
        order.value = response.data || order.value;
        showRatingModal.value = false;
        message.success('评价成功');
    } catch (error: any) {
        message.error(error?.message || '评价失败');
    }
};

onMounted(() => {
    fetchOrderDetail();
});
</script>

<style scoped>
.campus-detail {
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

.campus-detail.is-dark {
    --surface: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
}

.campus-nav-sticky {
    position: sticky;
    top: 0;
    z-index: 100;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.02);
}

.nav-main {
    display: flex;
    align-items: center;
    padding: 12px 16px 10px;
}

.back-icon-btn {
    border: none;
    background: none;
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    margin-right: 8px;
}

.icon-svg {
    width: 24px;
    height: 24px;
}

.title-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.title-block strong {
    font-size: 19px;
    line-height: 1.2;
}

.title-block span {
    font-size: 12px;
    color: var(--muted);
}

.order-viewport {
    padding: 16px;
}

.loading-wrap,
.error-wrap {
    padding: 72px 0;
}

.detail-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.order-node {
    background: var(--card);
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
    animation: slide-up 0.45s ease-out both;
}

.node-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.node-tag-group {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-size: 14px;
    font-weight: 700;
}

.v-line {
    width: 4px;
    height: 18px;
    border-radius: 99px;
    background: var(--primary);
}

.node-tag-group[data-type='food'] .v-line {
    background: #f97316;
}

.node-tag-group[data-type='medicine'] .v-line {
    background: #10b981;
}

.node-tag-group[data-type='daily'] .v-line {
    background: #8b5cf6;
}

.node-title {
    margin: 18px 0 0;
    font-size: 22px;
    line-height: 1.45;
    font-weight: 800;
}

.node-desc {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 14px;
    line-height: 1.7;
}

.location-map {
    position: relative;
    margin-top: 20px;
    border-radius: 20px;
    background: color-mix(in srgb, var(--surface) 86%, var(--card));
    padding: 18px 18px 18px 20px;
}

.map-line {
    position: absolute;
    left: 25px;
    top: 33px;
    bottom: 33px;
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
    border: 2px solid var(--primary);
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
}

.node-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 20px;
    padding-bottom: 18px;
    border-bottom: 1px solid color-mix(in srgb, var(--muted) 16%, transparent);
}

.detail-item,
.detail-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.detail-item label,
.detail-box label {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
}

.detail-item span,
.detail-box span {
    font-size: 14px;
    font-weight: 700;
    line-height: 1.5;
    word-break: break-all;
}

.price-accent .val {
    color: var(--primary);
    font-size: 17px;
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    margin-top: 18px;
}

.chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 18px;
}

.info-chip {
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
    color: var(--primary);
    background: rgba(59, 130, 246, 0.08);
}

.timeline-panel {
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid color-mix(in srgb, var(--muted) 16%, transparent);
}

.timeline-item {
    position: relative;
    display: flex;
    gap: 12px;
    padding: 10px 0 10px 2px;
}

.timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 7px;
    top: 28px;
    width: 2px;
    height: calc(100% - 8px);
    background: rgba(148, 163, 184, 0.22);
}

.timeline-dot {
    width: 14px;
    height: 14px;
    margin-top: 4px;
    border-radius: 50%;
    border: 2px solid #cbd5e1;
    background: #fff;
    flex-shrink: 0;
}

.timeline-item.active .timeline-dot {
    border-color: var(--primary);
    background: var(--primary);
}

.timeline-item.done .timeline-dot {
    border-color: #10b981;
    background: #10b981;
}

.timeline-content strong {
    display: block;
    font-size: 14px;
}

.timeline-content p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--muted);
}

.timeline-content span {
    display: inline-block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--muted);
}

.node-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid color-mix(in srgb, var(--muted) 16%, transparent);
}

.user-info {
    display: flex;
    align-items: center;
    gap: 10px;
    color: var(--muted);
    font-weight: 700;
}

.u-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--surface) 72%, var(--card));
    color: #94a3b8;
}

.u-svg {
    width: 18px;
    height: 18px;
}

.actions-group {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.rating-form {
    padding: 16px 0;
}

.rating-stars {
    display: flex;
    justify-content: center;
    gap: 10px;
    margin-bottom: 16px;
}

.rating-star {
    border: none;
    background: transparent;
    color: #cbd5e1;
    padding: 4px;
}

.rating-star.active {
    color: #f59e0b;
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

@media (max-width: 768px) {
    .order-node {
        padding: 22px 20px;
    }

    .node-details,
    .detail-grid {
        grid-template-columns: 1fr 1fr;
    }
}

@media (max-width: 560px) {
    .node-details,
    .detail-grid {
        grid-template-columns: 1fr;
    }

    .node-footer {
        flex-direction: column;
        align-items: flex-start;
    }
}
</style>
