<template>
    <div class="pickup-detail-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar
                title="订单详情"
                show-back
                @back="router.back()"
            >
                <template #right>
                    <NButton
                        text
                        @click="showShareModal = true"
                    >
                        <NIcon size="20">
                            <ShareIcon />
                        </NIcon>
                    </NButton>
                </template>
            </MobileNavBar>
        </div>

        <!-- 页面内容 -->
        <div v-if="loading" class="loading-container">
            <MobileLoading type="default" text="加载中..." />
        </div>

        <div v-else-if="order" class="detail-container">
            <!-- 订单状态 -->
            <div class="section">
                <MobileCard>
                    <div class="status-section">
                        <div class="status-icon" :style="{ backgroundColor: getStatusColor() + '20' }">
                            <NIcon size="48" :color="getStatusColor()">
                                <component :is="getStatusIcon()" />
                            </NIcon>
                        </div>
                        <div class="status-info">
                            <h2 class="status-title">{{ getStatusTitle() }}</h2>
                            <p class="status-desc">{{ getStatusDescription() }}</p>
                            <div v-if="order.estimatedTime" class="estimated-time">
                                预计完成时间：{{ formatDateTime(order.estimatedTime) }}
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 订单信息 -->
            <div class="section">
                <h3 class="section-title">订单信息</h3>
                <MobileCard>
                    <div class="order-info">
                        <div class="order-header">
                            <div class="order-type">
                                <NIcon size="20" :color="getTypeColor()">
                                    <component :is="getTypeIcon()" />
                                </NIcon>
                                <span class="type-label">{{ getTypeLabel() }}</span>
                            </div>
                            <NTag :type="getStatusType()" size="small">
                                {{ getStatusLabel() }}
                            </NTag>
                        </div>

                        <h4 class="order-title">{{ order.title }}</h4>
                        <p class="order-description">{{ order.description }}</p>

                        <div class="order-details">
                            <div class="detail-item">
                                <span class="detail-label">订单编号</span>
                                <span class="detail-value">{{ order.orderNumber }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">创建时间</span>
                                <span class="detail-value">{{ formatDateTime(order.createdAt) }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">期望完成时间</span>
                                <span class="detail-value">{{ formatDateTime(order.expectedTime) }}</span>
                            </div>
                            <div v-if="order.contact" class="detail-item">
                                <span class="detail-label">联系方式</span>
                                <span class="detail-value">{{ order.contact }}</span>
                            </div>
                            <div v-if="order.remarks" class="detail-item">
                                <span class="detail-label">备注</span>
                                <span class="detail-value">{{ order.remarks }}</span>
                            </div>
                        </div>

                        <!-- 特殊字段显示 -->
                        <div v-if="order.type === 'express'" class="special-fields">
                            <div class="detail-item" v-if="order.pickupCode">
                                <span class="detail-label">取件码</span>
                                <span class="detail-value pickup-code">{{ order.pickupCode }}</span>
                            </div>
                            <div class="detail-item" v-if="order.expressCompany">
                                <span class="detail-label">快递公司</span>
                                <span class="detail-value">{{ getExpressCompanyLabel(order.expressCompany) }}</span>
                            </div>
                        </div>

                        <div v-if="order.type === 'food'" class="special-fields">
                            <div class="detail-item" v-if="order.weight">
                                <span class="detail-label">重量</span>
                                <span class="detail-value">{{ getWeightLabel(order.weight) }}</span>
                            </div>
                            <div class="detail-item" v-if="order.needKeepWarm">
                                <span class="detail-label">保温要求</span>
                                <span class="detail-value">需要保温</span>
                            </div>
                        </div>

                        <div v-if="order.type === 'medicine'" class="special-fields">
                            <div class="detail-item" v-if="order.prescriptionImages?.length">
                                <span class="detail-label">处方照片</span>
                                <div class="prescription-images">
                                    <div
                                        v-for="(image, index) in order.prescriptionImages"
                                        :key="index"
                                        class="prescription-image"
                                        @click="previewImage(image)"
                                    >
                                        <img :src="image" :alt="`处方照片${index + 1}`" />
                                    </div>
                                </div>
                            </div>
                            <div class="detail-item" v-if="order.purchaseAmount">
                                <span class="detail-label">代购金额</span>
                                <span class="detail-value">¥{{ order.purchaseAmount }}</span>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 地址信息 -->
            <div class="section">
                <h3 class="section-title">地址信息</h3>
                <MobileCard>
                    <div class="address-info">
                        <div class="address-item">
                            <div class="address-icon pickup">
                                <NIcon size="16">
                                    <LocationIcon />
                                </NIcon>
                            </div>
                            <div class="address-content">
                                <div class="address-label">取货地点</div>
                                <div class="address-value">{{ order.pickupLocation }}</div>
                            </div>
                        </div>
                        <div class="address-line"></div>
                        <div class="address-item">
                            <div class="address-icon delivery">
                                <NIcon size="16">
                                    <LocationIcon />
                                </NIcon>
                            </div>
                            <div class="address-content">
                                <div class="address-label">送达地点</div>
                                <div class="address-value">{{ order.deliveryLocation }}</div>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 费用明细 -->
            <div class="section">
                <h3 class="section-title">费用明细</h3>
                <MobileCard>
                    <div class="fee-details">
                        <div class="fee-item">
                            <span class="fee-label">服务费</span>
                            <span class="fee-value">¥{{ order.fee }}</span>
                        </div>
                        <div class="fee-item">
                            <span class="fee-label">平台费</span>
                            <span class="fee-value">¥{{ platformFee }}</span>
                        </div>
                        <div v-if="order.type === 'medicine' && order.purchaseAmount" class="fee-item">
                            <span class="fee-label">代购金额</span>
                            <span class="fee-value">¥{{ order.purchaseAmount }}</span>
                        </div>
                        <div class="fee-divider"></div>
                        <div class="fee-item total">
                            <span class="fee-label">总计</span>
                            <span class="fee-value">¥{{ totalFee }}</span>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 用户信息 -->
            <div class="section">
                <h3 class="section-title">{{ order.isMyOrder ? '接单人信息' : '发布人信息' }}</h3>
                <MobileCard>
                    <div class="user-info">
                        <div class="user-avatar">
                            <img :src="targetUser.avatar || '/default-avatar.png'" :alt="targetUser.name" />
                        </div>
                        <div class="user-details">
                            <h4 class="user-name">{{ targetUser.name }}</h4>
                            <div class="user-meta">
                                <div class="user-rating">
                                    <NIcon size="14" color="var(--n-warning-color)">
                                        <StarIcon />
                                    </NIcon>
                                    <span>{{ targetUser.rating || '暂无评分' }}</span>
                                </div>
                                <div class="user-orders">
                                    完成订单：{{ targetUser.completedOrders || 0 }}
                                </div>
                            </div>
                        </div>
                        <div class="user-actions">
                            <NButton size="small" @click="contactUser">
                                <NIcon size="14">
                                    <ChatIcon />
                                </NIcon>
                                联系
                            </NButton>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 订单进度 -->
            <div v-if="order.status !== 'pending'" class="section">
                <h3 class="section-title">订单进度</h3>
                <MobileCard>
                    <div class="progress-timeline">
                        <div
                            v-for="(step, index) in orderSteps"
                            :key="index"
                            class="timeline-item"
                            :class="{ active: step.active, completed: step.completed }"
                        >
                            <div class="timeline-dot">
                                <NIcon v-if="step.completed" size="12">
                                    <CheckIcon />
                                </NIcon>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-title">{{ step.title }}</div>
                                <div v-if="step.time" class="timeline-time">{{ step.time }}</div>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 操作按钮 -->
            <div class="action-section">
                <div v-if="order.status === 'pending' && !order.isMyOrder" class="action-buttons">
                    <NButton
                        type="primary"
                        size="large"
                        block
                        :loading="accepting"
                        @click="acceptOrder"
                    >
                        接受订单
                    </NButton>
                </div>

                <div v-else-if="order.status === 'processing'" class="action-buttons">
                    <NButton
                        v-if="order.isMyOrder"
                        type="warning"
                        size="large"
                        block
                        :loading="cancelling"
                        @click="cancelOrder"
                    >
                        取消订单
                    </NButton>
                    <NButton
                        v-else
                        type="primary"
                        size="large"
                        block
                        :loading="completing"
                        @click="completeOrder"
                    >
                        完成订单
                    </NButton>
                </div>

                <div v-else-if="order.status === 'completed' && !order.isMyOrder" class="action-buttons">
                    <NButton
                        type="primary"
                        size="large"
                        block
                        @click="showRateModal = true"
                    >
                        评价订单
                    </NButton>
                </div>
            </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="error-container">
            <MobileEmpty
                type="error"
                title="订单不存在"
                description="该订单可能已被删除或您没有权限查看"
                :show-action="true"
                action-text="返回列表"
                @action="router.push('/pickup/list')"
            />
        </div>

        <!-- 分享弹窗 -->
        <MobileModal
            v-model:show="showShareModal"
            title="分享订单"
            @confirm="shareOrder"
        >
            <div class="share-options">
                <div class="share-option" @click="shareToWeChat">
                    <NIcon size="24" color="#09bb07">
                        <LogoWechat />
                    </NIcon>
                    <span>微信</span>
                </div>
                <div class="share-option" @click="copyLink">
                    <NIcon size="24" color="var(--n-primary-color)">
                        <LinkIcon />
                    </NIcon>
                    <span>复制链接</span>
                </div>
            </div>
        </MobileModal>

        <!-- 评价弹窗 -->
        <MobileModal
            v-model:show="showRateModal"
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
import { useRouter, useRoute } from 'vue-router';
import {
    NButton,
    NIcon,
    NTag,
    NInput,
    useMessage,
} from 'naive-ui';
import {
    LocationOutline as LocationIcon,
    ShareOutline as ShareIcon,
    ChatbubbleOutline as ChatIcon,
    CheckmarkOutline as CheckIcon,
    StarOutline as StarIcon,
    LinkOutline as LinkIcon,
    BagHandleOutline as BagIcon,
    FastFoodOutline as FoodIcon,
    MedkitOutline as MedIcon,
    ShirtOutline as ShopIcon,
    TimeOutline as TimeIcon,
    CheckmarkCircleOutline as CompletedIcon,
    SyncOutline as ProcessingIcon,
    ClockOutline as PendingIcon,
    LogoWechat,
} from '@vicons/ionicons5';
import { MobileNavBar, MobileCard, MobileLoading, MobileEmpty, MobileModal } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 数据状态
const loading = ref(true);
const accepting = ref(false);
const cancelling = ref(false);
const completing = ref(false);
const showShareModal = ref(false);
const showRateModal = ref(false);
const rating = ref(0);
const ratingComment = ref('');

// 订单数据
const order = ref(null);

// 模拟订单数据
const mockOrder = {
    id: 1,
    orderNumber: 'PK20240930001',
    type: 'express',
    title: '快递代取 - 菜鸟驿站',
    description: '帮忙取一个包裹，取件码：1234，重量较轻，比较急用',
    pickupLocation: '菜鸟驿站 · 宿舍楼下',
    deliveryLocation: '宿舍D栋 · 302室',
    fee: 3,
    status: 'processing',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    expectedTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
    estimatedTime: new Date(Date.now() + 1 * 60 * 60 * 1000),
    contact: '15800000001',
    remarks: '请小心轻放，内有易碎物品',
    pickupCode: '1234',
    expressCompany: 'sf',
    isMyOrder: false, // 是否是我发布的订单
    publisher: {
        id: 2,
        name: '张同学',
        avatar: '',
        rating: 4.8,
        completedOrders: 156,
    },
    accepter: {
        id: 3,
        name: '李代取',
        avatar: '',
        rating: 4.9,
        completedOrders: 289,
    },
};

// 计算属性
const targetUser = computed(() => {
    if (!order.value) return {};
    return order.value.isMyOrder ? order.value.accepter : order.value.publisher;
});

const platformFee = computed(() => {
    if (!order.value) return '0.00';
    return (order.value.fee * 0.1).toFixed(2);
});

const totalFee = computed(() => {
    if (!order.value) return '0.00';
    const serviceFee = order.value.fee || 0;
    const platform = parseFloat(platformFee.value);
    const purchase = order.value.type === 'medicine' ? (order.value.purchaseAmount || 0) : 0;
    return (serviceFee + platform + purchase).toFixed(2);
});

const orderSteps = computed(() => {
    if (!order.value) return [];

    const steps = [
        {
            title: '订单创建',
            time: formatDateTime(order.value.createdAt),
            completed: true,
            active: false,
        },
        {
            title: '订单接受',
            time: order.value.status !== 'pending' ? formatDateTime(new Date(order.value.createdAt.getTime() + 30 * 60 * 1000)) : null,
            completed: order.value.status !== 'pending',
            active: order.value.status === 'processing',
        },
        {
            title: '正在处理',
            time: order.value.status === 'processing' ? formatDateTime(new Date()) : null,
            completed: order.value.status === 'completed',
            active: order.value.status === 'processing',
        },
        {
            title: '订单完成',
            time: order.value.status === 'completed' ? formatDateTime(new Date()) : null,
            completed: order.value.status === 'completed',
            active: false,
        },
    ];

    return steps;
});

// 方法
const getStatusIcon = () => {
    const iconMap = {
        pending: PendingIcon,
        processing: ProcessingIcon,
        completed: CompletedIcon,
        cancelled: TimeIcon,
    };
    return iconMap[order.value?.status] || PendingIcon;
};

const getStatusColor = () => {
    const colorMap = {
        pending: 'var(--n-warning-color)',
        processing: 'var(--n-info-color)',
        completed: 'var(--n-success-color)',
        cancelled: 'var(--n-error-color)',
    };
    return colorMap[order.value?.status] || 'var(--n-warning-color)';
};

const getStatusTitle = () => {
    const titleMap = {
        pending: '等待接单',
        processing: '订单进行中',
        completed: '订单已完成',
        cancelled: '订单已取消',
    };
    return titleMap[order.value?.status] || '未知状态';
};

const getStatusDescription = () => {
    const descMap = {
        pending: '订单等待其他用户接受',
        processing: '订单正在处理中，请耐心等待',
        completed: '订单已成功完成，感谢您的使用',
        cancelled: '订单已被取消',
    };
    return descMap[order.value?.status] || '';
};

const getTypeIcon = () => {
    const iconMap = {
        express: BagIcon,
        food: FoodIcon,
        medicine: MedIcon,
        daily: ShopIcon,
    };
    return iconMap[order.value?.type] || BagIcon;
};

const getTypeColor = () => {
    const colorMap = {
        express: 'var(--n-primary-color)',
        food: 'var(--n-warning-color)',
        medicine: 'var(--n-error-color)',
        daily: 'var(--n-success-color)',
    };
    return colorMap[order.value?.type] || 'var(--n-primary-color)';
};

const getTypeLabel = () => {
    const labelMap = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活用品',
    };
    return labelMap[order.value?.type] || '代取服务';
};

const getStatusType = () => {
    const typeMap = {
        pending: 'warning',
        processing: 'info',
        completed: 'success',
        cancelled: 'error',
    };
    return typeMap[order.value?.status] || 'default';
};

const getStatusLabel = () => {
    const labelMap = {
        pending: '等待接单',
        processing: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return labelMap[order.value?.status] || '未知状态';
};

const getExpressCompanyLabel = (company: string) => {
    const companyMap = {
        sf: '顺丰速运',
        zt: '中通快递',
        yt: '圆通速递',
        st: '申通快递',
        yd: '韵达速递',
        cn: '菜鸟驿站',
    };
    return companyMap[company] || company;
};

const getWeightLabel = (weight: string) => {
    const weightMap = {
        light: '轻量 (< 1kg)',
        medium: '中等 (1-3kg)',
        heavy: '较重 (3-5kg)',
        'very-heavy': '很重 (> 5kg)',
    };
    return weightMap[weight] || weight;
};

const formatDateTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const previewImage = (imageUrl: string) => {
    // TODO: 实现图片预览功能
    console.log('预览图片:', imageUrl);
};

const contactUser = () => {
    message.info('联系功能开发中...');
    appStore.hapticFeedback('light');
};

const acceptOrder = async () => {
    accepting.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        order.value.status = 'processing';
        order.value.accepter = {
            id: userStore.user?.id,
            name: userStore.user?.name,
            avatar: userStore.user?.avatar,
            rating: 4.9,
            completedOrders: 28,
        };
        message.success('接单成功！');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('接单失败');
    } finally {
        accepting.value = false;
    }
};

const cancelOrder = async () => {
    cancelling.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        order.value.status = 'cancelled';
        message.success('订单已取消');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('取消失败');
    } finally {
        cancelling.value = false;
    }
};

const completeOrder = async () => {
    completing.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        order.value.status = 'completed';
        message.success('订单完成！');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('操作失败');
    } finally {
        completing.value = false;
    }
};

const shareOrder = () => {
    showShareModal.value = false;
};

const shareToWeChat = () => {
    message.info('微信分享功能开发中...');
    showShareModal.value = false;
};

const copyLink = () => {
    const link = `${window.location.origin}/pickup/${order.value.id}`;
    navigator.clipboard.writeText(link).then(() => {
        message.success('链接已复制到剪贴板');
    }).catch(() => {
        message.error('复制失败');
    });
    showShareModal.value = false;
};

const submitRating = () => {
    if (rating.value === 0) {
        message.warning('请选择评分');
        return;
    }

    message.success('评价提交成功');
    showRateModal.value = false;
    rating.value = 0;
    ratingComment.value = '';
};

// 获取订单详情
const fetchOrderDetail = async () => {
    loading.value = true;
    try {
        const orderId = route.params.id;
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 800));

        // 这里应该调用真实的API
        // const response = await pickupApi.getOrderDetail(orderId);
        // order.value = response.data;

        // 模拟数据
        order.value = mockOrder;
    } catch (error) {
        console.error('获取订单详情失败:', error);
        order.value = null;
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchOrderDetail();
});
</script>

<style scoped>
.pickup-detail-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.loading-container {
    padding: 100px 0;
    text-align: center;
}

.error-container {
    padding: 100px 20px;
}

.detail-container {
    padding: 16px;
    padding-bottom: 100px;
}

.section {
    margin-bottom: 24px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 12px 4px;
}

/* 状态区域 */
.status-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px;
}

.status-icon {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.status-info {
    flex: 1;
}

.status-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.status-desc {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.estimated-time {
    font-size: 13px;
    color: var(--n-primary-color);
    font-weight: 500;
}

/* 订单信息 */
.order-info {
    padding: 4px;
}

.order-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.order-type {
    display: flex;
    align-items: center;
    gap: 8px;
}

.type-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

.order-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.order-description {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0 0 16px 0;
    line-height: 1.5;
}

.order-details,
.special-fields {
    border-top: 1px solid var(--n-border-color);
    padding-top: 16px;
    margin-top: 16px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 0;
    gap: 16px;
}

.detail-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    flex-shrink: 0;
    min-width: 80px;
}

.detail-value {
    font-size: 14px;
    color: var(--n-text-color-1);
    text-align: right;
    word-break: break-all;
}

.pickup-code {
    font-family: monospace;
    font-weight: 600;
    color: var(--n-primary-color);
}

/* 处方照片 */
.prescription-images {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
}

.prescription-image {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid var(--n-border-color);
}

.prescription-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

/* 地址信息 */
.address-info {
    padding: 4px;
}

.address-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
}

.address-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.address-icon.pickup {
    background: var(--n-primary-color-suppl);
    color: var(--n-primary-color);
}

.address-icon.delivery {
    background: var(--n-success-color-suppl);
    color: var(--n-success-color);
}

.address-content {
    flex: 1;
}

.address-label {
    font-size: 13px;
    color: var(--n-text-color-3);
    margin-bottom: 4px;
}

.address-value {
    font-size: 14px;
    color: var(--n-text-color-1);
    line-height: 1.4;
}

.address-line {
    width: 2px;
    height: 16px;
    background: var(--n-border-color);
    margin: 8px 0 8px 15px;
}

/* 费用明细 */
.fee-details {
    padding: 4px;
}

.fee-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
}

.fee-item.total {
    font-weight: 600;
    font-size: 16px;
    color: var(--n-text-color-1);
}

.fee-label {
    color: var(--n-text-color-2);
    font-size: 14px;
}

.fee-value {
    color: var(--n-error-color);
    font-weight: 500;
}

.fee-divider {
    height: 1px;
    background: var(--n-border-color);
    margin: 8px 0;
}

/* 用户信息 */
.user-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px;
}

.user-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.user-details {
    flex: 1;
}

.user-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.user-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    color: var(--n-text-color-3);
}

.user-rating {
    display: flex;
    align-items: center;
    gap: 4px;
}

.user-actions {
    flex-shrink: 0;
}

/* 订单进度 */
.progress-timeline {
    padding: 4px;
}

.timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    position: relative;
}

.timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 15px;
    top: 36px;
    width: 2px;
    height: calc(100% - 12px);
    background: var(--n-border-color);
}

.timeline-item.completed::after {
    background: var(--n-success-color);
}

.timeline-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--n-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--n-body-color);
    flex-shrink: 0;
    margin-top: 2px;
}

.timeline-item.completed .timeline-dot {
    border-color: var(--n-success-color);
    background: var(--n-success-color);
    color: white;
}

.timeline-item.active .timeline-dot {
    border-color: var(--n-primary-color);
}

.timeline-content {
    flex: 1;
    padding-top: 2px;
}

.timeline-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
    margin-bottom: 4px;
}

.timeline-item.completed .timeline-title {
    color: var(--n-success-color);
}

.timeline-time {
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 操作按钮 */
.action-section {
    margin-top: 32px;
}

.action-buttons .n-button {
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
}

/* 分享选项 */
.share-options {
    display: flex;
    justify-content: center;
    gap: 40px;
    padding: 20px 0;
}

.share-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    border-radius: 12px;
    transition: all 0.2s ease;
}

.share-option:hover {
    background: var(--n-color-target);
}

.share-option span {
    font-size: 13px;
    color: var(--n-text-color-2);
}

/* 评价表单 */
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
    .detail-container {
        padding: 12px;
        padding-bottom: 100px;
    }

    .status-section {
        gap: 12px;
    }

    .status-icon {
        width: 64px;
        height: 64px;
    }

    .status-title {
        font-size: 16px;
    }

    .user-info {
        gap: 8px;
    }

    .user-avatar {
        width: 40px;
        height: 40px;
    }

    .action-buttons .n-button {
        height: 46px;
        font-size: 15px;
    }
}

/* iOS 安全区域适配 */
.pickup-detail-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.pickup-detail-page {
    animation: ios-fade-in 0.4s ease-out;
}

.section {
    animation: ios-fade-in 0.6s ease-out;
}

.section:nth-child(2) {
    animation-delay: 0.1s;
}

.section:nth-child(3) {
    animation-delay: 0.2s;
}

.section:nth-child(4) {
    animation-delay: 0.3s;
}

/* 深色模式优化 */
.dark-theme .share-option:hover {
    background: var(--ios-dark-gray4);
}

.light-theme .share-option:hover {
    background: var(--ios-gray5);
}
</style>
