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

                    <section class="detail-overview">
                        <div class="detail-overview__hero">
                            <div
                                class="detail-overview__summary-card detail-overview__summary-card--single"
                            >
                                <div class="detail-overview__price">
                                    <label>{{ isPublisher ? '应付金额' : '订单金额' }}</label>
                                    <strong>¥{{ formatAmount(order.price, order.tip) }}</strong>
                                </div>
                            </div>
                        </div>

                        <div class="detail-overview__grid">
                            <article class="detail-panel detail-panel--summary">
                                <div class="detail-panel__head">
                                    <span>订单概览</span>
                                </div>
                                <div class="detail-kv detail-kv--stack detail-kv--summary">
                                    <label>订单编号</label>
                                    <strong>{{ order.order_no }}</strong>
                                </div>
                                <div class="detail-kv">
                                    <label>订单金额</label>
                                    <strong>¥{{ formatAmount(order.price, order.tip) }}</strong>
                                </div>
                                <div class="detail-kv">
                                    <label>创建时间</label>
                                    <strong>{{ formatDateTime(order.createdAt) }}</strong>
                                </div>
                            </article>

                            <article class="detail-panel">
                                <div class="detail-panel__head">
                                    <span>联系信息</span>
                                </div>
                                <div class="detail-kv">
                                    <label>联系人</label>
                                    <strong>{{ order.contact_name }}</strong>
                                </div>
                                <div class="detail-kv">
                                    <label>联系电话</label>
                                    <strong>{{ visibleContactPhone }}</strong>
                                </div>
                            </article>

                            <article class="detail-panel">
                                <div class="detail-panel__head">
                                    <span>履约信息</span>
                                </div>
                                <div v-if="order.delivery_time" class="detail-kv">
                                    <label>期望送达</label>
                                    <strong>{{ formatDateTime(order.delivery_time) }}</strong>
                                </div>
                                <div
                                    v-if="order.type === 'express'"
                                    class="detail-kv detail-kv--code"
                                >
                                    <label>取件码</label>
                                    <strong>{{ visiblePickupCode }}</strong>
                                </div>
                                <div v-if="order.pickup_photo" class="detail-kv">
                                    <label>取件照片</label>
                                    <a
                                        class="detail-link"
                                        :href="order.pickup_photo"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        查看照片
                                    </a>
                                </div>
                                <div v-if="order.delivery_photo" class="detail-kv">
                                    <label>送达照片</label>
                                    <a
                                        class="detail-link"
                                        :href="order.delivery_photo"
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        查看照片
                                    </a>
                                </div>
                            </article>
                        </div>
                    </section>

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
                                v-if="canAccept"
                                size="tiny"
                                type="primary"
                                round
                                :loading="delivererAction === 'accept'"
                                @click="handleAccept"
                            >
                                接单
                            </NButton>
                            <NButton
                                v-if="canStartPickup"
                                size="tiny"
                                type="primary"
                                round
                                :loading="delivererAction === 'startPickup'"
                                @click="handleStartPickup"
                            >
                                开始取货
                            </NButton>
                            <NButton
                                v-if="canConfirmPickup"
                                size="tiny"
                                type="primary"
                                round
                                :loading="delivererAction === 'confirmPickup'"
                                @click="handleConfirmPickup"
                            >
                                开始配送
                            </NButton>
                            <NButton
                                v-if="canCompleteDelivery"
                                size="tiny"
                                type="primary"
                                round
                                :loading="delivererAction === 'confirmDelivery'"
                                @click="handleConfirmDelivery"
                            >
                                确认送达
                            </NButton>
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
                                v-if="canChatNow"
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
        <MobileModal
            v-model:show="showProofSourceModal"
            title="选择上传方式"
            bottom-sheet
            :show-footer="false"
        >
            <div class="proof-source-sheet">
                <button
                    type="button"
                    class="proof-source-sheet__action"
                    @click="handleSelectProofSource('camera')"
                >
                    <strong>拍摄照片</strong>
                    <span>直接调用相机拍摄配送凭证</span>
                </button>
                <button
                    type="button"
                    class="proof-source-sheet__action"
                    @click="handleSelectProofSource('album')"
                >
                    <strong>从相册选择</strong>
                    <span>从手机相册中选择已有图片</span>
                </button>
            </div>
        </MobileModal>
        <MobileModal
            v-model:show="showProofPreviewModal"
            :title="pendingProofAction === 'pickup' ? '预览取件照片' : '预览送达照片'"
            bottom-sheet
            confirm-text="确认上传"
            :loading="delivererAction === 'confirmPickup' || delivererAction === 'confirmDelivery'"
            @confirm="handleSubmitProofPhoto"
        >
            <div class="proof-preview-sheet">
                <div class="proof-preview-sheet__frame">
                    <img
                        v-if="selectedProofPreviewUrl"
                        :src="selectedProofPreviewUrl"
                        alt="凭证预览"
                        class="proof-preview-sheet__image"
                    />
                </div>
                <div class="proof-preview-sheet__actions">
                    <button
                        type="button"
                        class="proof-preview-sheet__action"
                        @click="handleReselectProof('camera')"
                    >
                        重新拍摄
                    </button>
                    <button
                        type="button"
                        class="proof-preview-sheet__action"
                        @click="handleReselectProof('album')"
                    >
                        重新上传
                    </button>
                </div>
            </div>
        </MobileModal>
        <MobileModal
            v-model:show="showCameraModal"
            :title="pendingProofAction === 'pickup' ? '拍摄取件照片' : '拍摄送达照片'"
            bottom-sheet
            :show-footer="false"
        >
            <div class="proof-camera-sheet">
                <div class="proof-camera-sheet__viewport">
                    <video
                        ref="cameraVideoRef"
                        class="proof-camera-sheet__video"
                        autoplay
                        playsinline
                        muted
                    ></video>
                    <canvas ref="cameraCanvasRef" class="proof-camera-sheet__canvas"></canvas>
                    <div v-if="cameraErrorMessage" class="proof-camera-sheet__error">
                        {{ cameraErrorMessage }}
                    </div>
                </div>
                <div class="proof-camera-sheet__actions">
                    <button
                        type="button"
                        class="proof-camera-sheet__action"
                        @click="handleCloseCameraModal"
                    >
                        取消
                    </button>
                    <button
                        type="button"
                        class="proof-camera-sheet__capture"
                        :disabled="!cameraReady"
                        @click="handleCapturePhoto"
                    >
                        拍照
                    </button>
                </div>
            </div>
        </MobileModal>
        <input
            ref="pickupPhotoInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handlePickupPhotoSelected"
        />
        <input
            ref="deliveryPhotoInputRef"
            type="file"
            accept="image/*"
            style="display: none"
            @change="handleDeliveryPhotoSelected"
        />
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { NButton, NIcon, NInput, NTag, useDialog, useMessage } from 'naive-ui';
import { StarOutline } from '@vicons/ionicons5';
import { DelivererOrderApi, PickupApi, chatApi } from '@/api';
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
const delivererAction = ref<null | 'accept' | 'startPickup' | 'confirmPickup' | 'confirmDelivery'>(
    null
);
const showRatingModal = ref(false);
const showProofSourceModal = ref(false);
const showProofPreviewModal = ref(false);
const showCameraModal = ref(false);
const rating = ref(5);
const ratingComment = ref('');
const order = ref<PickupOrder | null>(null);
const pickupPhotoInputRef = ref<HTMLInputElement | null>(null);
const deliveryPhotoInputRef = ref<HTMLInputElement | null>(null);
const pendingProofAction = ref<null | 'pickup' | 'delivery'>(null);
const selectedProofFile = ref<File | null>(null);
const selectedProofPreviewUrl = ref('');
const cameraVideoRef = ref<HTMLVideoElement | null>(null);
const cameraCanvasRef = ref<HTMLCanvasElement | null>(null);
const cameraStream = ref<MediaStream | null>(null);
const cameraReady = ref(false);
const cameraErrorMessage = ref('');

const isPublisher = computed(() => order.value?.user_id === userStore.user?.id);
const isDelivererOwner = computed(() =>
    Boolean(
        order.value &&
        userStore.user?.deliverer_id &&
        order.value.deliverer_id === userStore.user.deliverer_id
    )
);
const canRevealSensitiveInfo = computed(() => isPublisher.value || isDelivererOwner.value);

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
        return (
            order.value.delivererInfo?.user?.real_name ||
            order.value.delivererInfo?.user?.username ||
            order.value.deliverer?.username ||
            order.value.deliverer?.real_name ||
            '暂未接单'
        );
    }
    return order.value.user?.username || order.value.user?.real_name || '匿名用户';
});
const counterpartPhone = computed(() => {
    if (!order.value) return '';
    if (!canRevealSensitiveInfo.value) return '';
    return isPublisher.value
        ? order.value.delivererInfo?.user?.phone ||
              order.value.delivererInfo?.phone ||
              order.value.deliverer?.phone ||
              ''
        : order.value.user?.phone || '';
});
const visibleContactPhone = computed(() => {
    if (!order.value) return '--';
    if (!canRevealSensitiveInfo.value) return '接单后可查看';
    return order.value.contact_phone || '--';
});
const visiblePickupCode = computed(() => {
    if (!order.value) return '--';
    if (order.value.type !== 'express') return '--';
    if (!canRevealSensitiveInfo.value) return '接单后可查看';
    return order.value.pickup_code || '无取件码';
});
const counterpartUserId = computed(() => {
    if (!order.value) return null;
    if (isPublisher.value) {
        return order.value.delivererInfo?.user?.id || order.value.deliverer?.id || null;
    }
    return order.value.user?.id || order.value.user_id || null;
});

const canCancel = computed(() =>
    Boolean(
        order.value &&
        ((isPublisher.value && order.value.status === 'pending') ||
            (isDelivererOwner.value && ['accepted', 'picking'].includes(order.value.status)))
    )
);
const canConfirm = computed(() =>
    Boolean(
        order.value &&
        isPublisher.value &&
        order.value.status === 'delivering' &&
        order.value.delivery_photo
    )
);
const canRate = computed(() =>
    Boolean(
        order.value &&
        isPublisher.value &&
        order.value.status === 'completed' &&
        !order.value.rating
    )
);
const canAccept = computed(() =>
    Boolean(order.value && userStore.user?.is_deliverer && order.value.status === 'pending')
);
const canStartPickup = computed(() =>
    Boolean(order.value && isDelivererOwner.value && order.value.status === 'accepted')
);
const canConfirmPickup = computed(() =>
    Boolean(order.value && isDelivererOwner.value && order.value.status === 'picking')
);
const canCompleteDelivery = computed(() =>
    Boolean(
        order.value &&
        isDelivererOwner.value &&
        order.value.status === 'delivering' &&
        !order.value.delivery_photo
    )
);
const canChatNow = computed(() =>
    Boolean(
        order.value &&
        counterpartUserId.value &&
        ((isPublisher.value && order.value.deliverer_id) || isDelivererOwner.value)
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
        const response = userStore.user?.is_deliverer
            ? await DelivererOrderApi.getOrderDetail(Number(route.params.id)).catch(() =>
                  PickupApi.getOrder(Number(route.params.id))
              )
            : await PickupApi.getOrder(Number(route.params.id));
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
        content: isDelivererOwner.value ? '确认申请取消这笔订单吗？' : '确认取消这笔订单吗？',
        positiveText: '确认',
        negativeText: '再想想',
        async onPositiveClick() {
            cancelling.value = true;
            try {
                const response = isDelivererOwner.value
                    ? await DelivererOrderApi.requestCancel(order.value!.id, '配送员主动取消')
                    : await PickupApi.cancelOrder(order.value!.id);
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

const handleAccept = async () => {
    if (!order.value) return;
    delivererAction.value = 'accept';
    try {
        const response = await DelivererOrderApi.acceptOrder(order.value.id);
        if (!response.success) {
            throw new Error(response.message || '接单失败');
        }
        order.value = response.data || order.value;
        message.success('接单成功');
        appStore.hapticFeedback('medium');
    } catch (error: any) {
        message.error(error?.message || '接单失败');
    } finally {
        delivererAction.value = null;
    }
};

const handleStartPickup = async () => {
    if (!order.value) return;
    delivererAction.value = 'startPickup';
    try {
        const response = await DelivererOrderApi.startPickup(order.value.id);
        if (!response.success) {
            throw new Error(response.message || '开始取货失败');
        }
        order.value = response.data || order.value;
        message.success('已开始取货');
        appStore.hapticFeedback('medium');
    } catch (error: any) {
        message.error(error?.message || '开始取货失败');
    } finally {
        delivererAction.value = null;
    }
};

const uploadProofImage = async (file: File) => {
    const uploadRes = await chatApi.uploadImage(file);
    const imageUrl = uploadRes.data?.path || uploadRes.data?.url;
    if (!imageUrl) {
        throw new Error('图片上传失败');
    }
    return imageUrl;
};

const getUserMediaCompat = async (constraints: MediaStreamConstraints) => {
    if (navigator.mediaDevices?.getUserMedia) {
        return navigator.mediaDevices.getUserMedia(constraints);
    }

    const legacyNavigator = navigator as Navigator & {
        getUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (reason?: unknown) => void
        ) => void;
        webkitGetUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (reason?: unknown) => void
        ) => void;
        mozGetUserMedia?: (
            constraints: MediaStreamConstraints,
            success: (stream: MediaStream) => void,
            error: (reason?: unknown) => void
        ) => void;
    };

    const legacyGetUserMedia =
        legacyNavigator.getUserMedia ||
        legacyNavigator.webkitGetUserMedia ||
        legacyNavigator.mozGetUserMedia;

    if (!legacyGetUserMedia) {
        throw new Error('当前浏览器不支持访问摄像头');
    }

    return new Promise<MediaStream>((resolvePromise, rejectPromise) => {
        legacyGetUserMedia.call(navigator, constraints, resolvePromise, rejectPromise);
    });
};

const stopCameraStream = () => {
    cameraStream.value?.getTracks().forEach(track => track.stop());
    cameraStream.value = null;
    cameraReady.value = false;

    if (cameraVideoRef.value) {
        cameraVideoRef.value.srcObject = null;
    }
};

const openCameraModal = async () => {
    cameraErrorMessage.value = '';
    showCameraModal.value = true;

    try {
        const stream = await getUserMediaCompat({
            video: {
                width: 480,
                height: 320,
                facingMode: { ideal: 'environment' },
            },
            audio: false,
        });

        cameraStream.value = stream;

        if (cameraVideoRef.value) {
            cameraVideoRef.value.srcObject = stream;
            await cameraVideoRef.value.play();
        }

        cameraReady.value = true;
    } catch (error: any) {
        cameraErrorMessage.value =
            error?.message || '摄像头打开失败，请检查浏览器权限或改用相册上传';
    }
};

const resetProofSelection = () => {
    if (selectedProofPreviewUrl.value) {
        URL.revokeObjectURL(selectedProofPreviewUrl.value);
    }
    selectedProofFile.value = null;
    selectedProofPreviewUrl.value = '';
};

const prepareProofPreview = (file: File) => {
    resetProofSelection();
    selectedProofFile.value = file;
    selectedProofPreviewUrl.value = URL.createObjectURL(file);
    showProofPreviewModal.value = true;
};

const handlePickupPhotoSelected = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && order.value) {
        prepareProofPreview(file);
    }
    (event.target as HTMLInputElement).value = '';
};

const handleConfirmPickup = async () => {
    if (!order.value) return;
    pendingProofAction.value = 'pickup';
    showProofSourceModal.value = true;
};

const handleDeliveryPhotoSelected = async (event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file && order.value) {
        prepareProofPreview(file);
    }
    (event.target as HTMLInputElement).value = '';
};

const handleConfirmDelivery = async () => {
    if (!order.value) return;
    pendingProofAction.value = 'delivery';
    showProofSourceModal.value = true;
};

const handleSelectProofSource = (source: 'camera' | 'album') => {
    const action = pendingProofAction.value;
    showProofSourceModal.value = false;

    if (!action) {
        return;
    }

    if (action === 'pickup') {
        if (source === 'camera') {
            void openCameraModal();
        } else {
            pickupPhotoInputRef.value?.click();
        }
        return;
    }

    if (source === 'camera') {
        void openCameraModal();
    } else {
        deliveryPhotoInputRef.value?.click();
    }
};

const handleReselectProof = (source: 'camera' | 'album') => {
    showProofPreviewModal.value = false;
    handleSelectProofSource(source);
};

const handleSubmitProofPhoto = async () => {
    if (!order.value || !pendingProofAction.value || !selectedProofFile.value) {
        return;
    }

    delivererAction.value =
        pendingProofAction.value === 'pickup' ? 'confirmPickup' : 'confirmDelivery';

    try {
        const proofUrl = await uploadProofImage(selectedProofFile.value);
        const response =
            pendingProofAction.value === 'pickup'
                ? await DelivererOrderApi.confirmPickup(order.value.id, proofUrl)
                : await DelivererOrderApi.confirmDelivery(order.value.id, {
                      delivery_photo: proofUrl,
                  });

        if (!response.success) {
            throw new Error(
                response.message ||
                    (pendingProofAction.value === 'pickup' ? '开始配送失败' : '确认送达失败')
            );
        }

        order.value = response.data || order.value;
        showProofPreviewModal.value = false;
        message.success(
            pendingProofAction.value === 'pickup'
                ? '取件照片已上传，订单已开始配送'
                : '送达照片已上传，请等待用户确认完成'
        );
        appStore.hapticFeedback('medium');
        resetProofSelection();
    } catch (error: any) {
        message.error(
            error?.message ||
                (pendingProofAction.value === 'pickup' ? '开始配送失败' : '确认送达失败')
        );
    } finally {
        delivererAction.value = null;
    }
};

const handleCapturePhoto = () => {
    if (!cameraVideoRef.value || !cameraCanvasRef.value || !cameraReady.value) {
        return;
    }

    const video = cameraVideoRef.value;
    const canvas = cameraCanvasRef.value;
    const width = video.videoWidth || 480;
    const height = video.videoHeight || 320;
    const context = canvas.getContext('2d');

    if (!context) {
        cameraErrorMessage.value = '无法生成照片，请稍后重试';
        return;
    }

    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
        blob => {
            if (!blob) {
                cameraErrorMessage.value = '拍照失败，请重试';
                return;
            }

            const file = new File([blob], `proof-${Date.now()}.jpg`, {
                type: 'image/jpeg',
            });

            stopCameraStream();
            showCameraModal.value = false;
            prepareProofPreview(file);
        },
        'image/jpeg',
        0.92
    );
};

const handleCloseCameraModal = () => {
    showCameraModal.value = false;
    stopCameraStream();
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
        message.success('订单已确认完成，款项已结算给配送员');
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

watch(showCameraModal, visible => {
    if (!visible) {
        stopCameraStream();
    }
});

onBeforeUnmount(() => {
    stopCameraStream();
    resetProofSelection();
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
    padding: 16px 16px calc(96px + env(safe-area-inset-bottom, 0px));
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

.detail-overview {
    margin-top: 20px;
}

.detail-overview__hero {
    display: grid;
    grid-template-columns: 1fr;
    gap: 14px;
}

.detail-overview__summary-card,
.detail-panel {
    border: 1px solid color-mix(in srgb, var(--muted) 14%, transparent);
    border-radius: 22px;
    background: color-mix(in srgb, var(--surface) 82%, var(--card));
}

.detail-overview__summary-card {
    padding: 16px 18px;
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) 1px minmax(0, 0.9fr);
    align-items: center;
    gap: 14px;
}

.detail-overview__summary-card--single {
    grid-template-columns: 1fr;
}

.detail-overview__price,
.detail-overview__status {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.detail-overview__divider {
    width: 1px;
    min-height: 42px;
    background: color-mix(in srgb, var(--muted) 14%, transparent);
}

.detail-overview__price label,
.detail-overview__status span,
.detail-panel__head span,
.detail-kv label {
    color: var(--muted);
    font-size: 12px;
    font-weight: 700;
}

.detail-overview__price strong {
    color: var(--primary);
    font-size: 24px;
    line-height: 1.1;
    font-weight: 800;
}

.detail-overview__status strong {
    font-size: 15px;
    line-height: 1.4;
    font-weight: 800;
}

.detail-overview__grid {
    display: grid;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    gap: 14px;
    margin-top: 14px;
    align-items: stretch;
}

.detail-panel {
    padding: 14px;
}

.detail-panel--summary {
    display: flex;
    flex-direction: column;
}

.detail-panel__head {
    margin-bottom: 12px;
}

.detail-kv {
    display: grid;
    grid-template-columns: 78px minmax(0, 1fr);
    align-items: start;
    justify-content: space-between;
    gap: 10px 14px;
}

.detail-kv + .detail-kv {
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid color-mix(in srgb, var(--muted) 12%, transparent);
}

.detail-kv strong {
    font-size: 13px;
    line-height: 1.5;
    font-weight: 800;
    color: var(--text);
    text-align: left;
    word-break: break-word;
}

.detail-kv--stack {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.detail-kv--summary {
    margin-bottom: 14px;
}

.detail-kv--stack strong {
    text-align: left;
    font-size: 15px;
    line-height: 1.45;
}

.detail-kv--code strong {
    font-size: 18px;
    letter-spacing: 0.08em;
    color: var(--primary);
}

.detail-link {
    font-size: 13px;
    font-weight: 700;
    color: var(--primary);
    text-decoration: none;
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
    padding-bottom: max(8px, env(safe-area-inset-bottom, 0px));
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

.proof-source-sheet {
    display: grid;
    gap: 12px;
    padding: 8px 0 4px;
}

.proof-source-sheet__action {
    width: 100%;
    border: 1px solid #dbe6f5;
    border-radius: 16px;
    background: #f8fbff;
    padding: 16px;
    text-align: left;
}

.proof-source-sheet__action strong {
    display: block;
    font-size: 15px;
    color: #172033;
}

.proof-source-sheet__action span {
    display: block;
    margin-top: 6px;
    font-size: 12px;
    line-height: 1.5;
    color: #6b7a90;
}

.proof-preview-sheet {
    display: grid;
    gap: 14px;
    padding: 8px 0 4px;
}

.proof-preview-sheet__frame {
    overflow: hidden;
    border-radius: 18px;
    background: #eef4ff;
    min-height: 220px;
}

.proof-preview-sheet__image {
    display: block;
    width: 100%;
    max-height: 360px;
    object-fit: cover;
}

.proof-preview-sheet__actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
}

.proof-preview-sheet__action {
    min-height: 44px;
    border: 1px solid #dbe6f5;
    border-radius: 14px;
    background: #f8fbff;
    color: #35506f;
    font-weight: 600;
}

.proof-camera-sheet {
    display: grid;
    gap: 14px;
    padding: 8px 0 4px;
}

.proof-camera-sheet__viewport {
    position: relative;
    overflow: hidden;
    border-radius: 18px;
    background: #0f172a;
    min-height: 240px;
}

.proof-camera-sheet__video,
.proof-camera-sheet__canvas {
    display: block;
    width: 100%;
    min-height: 240px;
    object-fit: cover;
}

.proof-camera-sheet__canvas {
    display: none;
}

.proof-camera-sheet__error {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    text-align: center;
    color: #fff;
    background: rgba(15, 23, 42, 0.7);
    font-size: 13px;
    line-height: 1.6;
}

.proof-camera-sheet__actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
}

.proof-camera-sheet__action,
.proof-camera-sheet__capture {
    min-height: 46px;
    border-radius: 14px;
    font-weight: 600;
}

.proof-camera-sheet__action {
    border: 1px solid #dbe6f5;
    background: #f8fbff;
    color: #35506f;
}

.proof-camera-sheet__capture {
    border: none;
    background: #2f6bff;
    color: #fff;
}

.proof-camera-sheet__capture:disabled {
    opacity: 0.55;
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

    .detail-overview__grid {
        grid-template-columns: 1fr;
    }
}

@media (max-width: 560px) {
    .order-viewport {
        padding: 12px 12px calc(110px + env(safe-area-inset-bottom, 0px));
    }

    .detail-overview__summary-card {
        grid-template-columns: 1fr;
        gap: 10px;
    }

    .detail-overview__divider {
        width: 100%;
        min-height: 1px;
        height: 1px;
    }

    .detail-kv {
        grid-template-columns: 72px minmax(0, 1fr);
        gap: 6px 10px;
    }

    .detail-kv strong {
        text-align: left;
    }

    .node-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 14px;
    }

    .actions-group {
        width: 100%;
        padding-bottom: env(safe-area-inset-bottom, 0px);
    }
}
</style>
