<template>
    <div class="create-pickup-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar
                title="发布代取订单"
                show-back
                @back="router.back()"
            />
        </div>

        <!-- 表单内容 -->
        <div class="form-container">
            <!-- 服务类型选择 -->
            <div class="section">
                <h3 class="section-title">选择服务类型</h3>
                <MobileCard>
                    <div class="service-types">
                        <div
                            v-for="service in serviceTypes"
                            :key="service.key"
                            class="service-type-item"
                            :class="{ active: orderForm.type === service.key }"
                            @click="selectServiceType(service.key)"
                        >
                            <div class="service-icon" :style="{ backgroundColor: service.color + '20' }">
                                <NIcon size="24" :color="service.color">
                                    <component :is="service.icon" />
                                </NIcon>
                            </div>
                            <span class="service-label">{{ service.label }}</span>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 订单信息表单 -->
            <div class="section">
                <h3 class="section-title">订单信息</h3>
                <MobileCard>
                    <NForm
                        ref="formRef"
                        :model="orderForm"
                        :rules="formRules"
                        :label-width="80"
                    >
                        <NFormItem label="订单标题" path="title">
                            <NInput
                                v-model:value="orderForm.title"
                                placeholder="请输入订单标题"
                                maxlength="50"
                                show-count
                            />
                        </NFormItem>

                        <NFormItem label="详细描述" path="description">
                            <NInput
                                v-model:value="orderForm.description"
                                type="textarea"
                                placeholder="请详细描述您的需求..."
                                :rows="4"
                                maxlength="200"
                                show-count
                            />
                        </NFormItem>

                        <NFormItem label="取货地点" path="pickupLocation">
                            <NInput
                                v-model:value="orderForm.pickupLocation"
                                placeholder="请输入取货地点"
                                @click="selectLocation('pickup')"
                                readonly
                            >
                                <template #suffix>
                                    <NIcon>
                                        <LocationIcon />
                                    </NIcon>
                                </template>
                            </NInput>
                        </NFormItem>

                        <NFormItem label="送达地点" path="deliveryLocation">
                            <NInput
                                v-model:value="orderForm.deliveryLocation"
                                placeholder="请输入送达地点"
                                @click="selectLocation('delivery')"
                                readonly
                            >
                                <template #suffix>
                                    <NIcon>
                                        <LocationIcon />
                                    </NIcon>
                                </template>
                            </NInput>
                        </NFormItem>

                        <NFormItem label="服务费用" path="fee">
                            <NInputNumber
                                v-model:value="orderForm.fee"
                                placeholder="请输入服务费用"
                                :min="1"
                                :max="100"
                                :precision="2"
                                style="width: 100%"
                            >
                                <template #prefix>
                                    ¥
                                </template>
                            </NInputNumber>
                        </NFormItem>

                        <NFormItem label="联系方式" path="contact">
                            <NInput
                                v-model:value="orderForm.contact"
                                placeholder="请输入联系方式"
                                maxlength="50"
                            />
                        </NFormItem>

                        <!-- 特殊字段：快递代取 -->
                        <div v-if="orderForm.type === 'express'">
                            <NFormItem label="取件码" path="pickupCode">
                                <NInput
                                    v-model:value="orderForm.pickupCode"
                                    placeholder="请输入取件码"
                                    maxlength="20"
                                />
                            </NFormItem>

                            <NFormItem label="快递公司">
                                <NSelect
                                    v-model:value="orderForm.expressCompany"
                                    :options="expressCompanies"
                                    placeholder="请选择快递公司"
                                />
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：外卖代取 -->
                        <div v-if="orderForm.type === 'food'">
                            <NFormItem label="预计重量">
                                <NSelect
                                    v-model:value="orderForm.weight"
                                    :options="weightOptions"
                                    placeholder="请选择预计重量"
                                />
                            </NFormItem>

                            <NFormItem label="是否需要保温">
                                <NSwitch v-model:value="orderForm.needKeepWarm" />
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：药品代购 -->
                        <div v-if="orderForm.type === 'medicine'">
                            <NFormItem label="处方照片">
                                <div class="upload-area">
                                    <NUpload
                                        :file-list="prescriptionFiles"
                                        :max="3"
                                        accept="image/*"
                                        @change="handlePrescriptionUpload"
                                    >
                                        <NUploadDragger>
                                            <div class="upload-content">
                                                <NIcon size="48" color="var(--n-primary-color)">
                                                    <CameraIcon />
                                                </NIcon>
                                                <p>点击或拖拽上传处方照片</p>
                                                <p class="upload-hint">最多上传3张照片</p>
                                            </div>
                                        </NUploadDragger>
                                    </NUpload>
                                </div>
                            </NFormItem>

                            <NFormItem label="购买金额">
                                <NInputNumber
                                    v-model:value="orderForm.purchaseAmount"
                                    placeholder="请输入预计购买金额"
                                    :min="0"
                                    :precision="2"
                                    style="width: 100%"
                                >
                                    <template #prefix>
                                        ¥
                                    </template>
                                </NInputNumber>
                            </NFormItem>
                        </div>

                        <!-- 期望完成时间 -->
                        <NFormItem label="期望完成时间" path="expectedTime">
                            <NDatePicker
                                v-model:value="orderForm.expectedTime"
                                type="datetime"
                                placeholder="选择期望完成时间"
                                style="width: 100%"
                                :is-date-disabled="disableDate"
                                :is-time-disabled="disableTime"
                            />
                        </NFormItem>

                        <!-- 备注信息 -->
                        <NFormItem label="备注">
                            <NInput
                                v-model:value="orderForm.remarks"
                                type="textarea"
                                placeholder="其他需要说明的信息..."
                                :rows="3"
                                maxlength="100"
                                show-count
                            />
                        </NFormItem>
                    </NForm>
                </MobileCard>
            </div>

            <!-- 费用说明 -->
            <div class="section">
                <h3 class="section-title">费用说明</h3>
                <MobileCard>
                    <div class="fee-info">
                        <div class="fee-item">
                            <span class="fee-label">服务费：</span>
                            <span class="fee-value">¥{{ orderForm.fee || 0 }}</span>
                        </div>
                        <div class="fee-item">
                            <span class="fee-label">平台费：</span>
                            <span class="fee-value">¥{{ platformFee }}</span>
                        </div>
                        <div v-if="orderForm.type === 'medicine'" class="fee-item">
                            <span class="fee-label">代购金额：</span>
                            <span class="fee-value">¥{{ orderForm.purchaseAmount || 0 }}</span>
                        </div>
                        <div class="fee-divider"></div>
                        <div class="fee-item total">
                            <span class="fee-label">总计：</span>
                            <span class="fee-value">¥{{ totalFee }}</span>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 服务条款 -->
            <div class="section">
                <MobileCard>
                    <div class="terms-section">
                        <NCheckbox v-model:checked="agreeTerms">
                            我已阅读并同意
                            <NButton text type="primary" @click="showTerms">
                                《代取服务条款》
                            </NButton>
                        </NCheckbox>
                    </div>
                </MobileCard>
            </div>

            <!-- 提交按钮 -->
            <div class="submit-section">
                <NButton
                    type="primary"
                    size="large"
                    block
                    :loading="submitting"
                    :disabled="!canSubmit"
                    @click="handleSubmit"
                >
                    发布订单
                </NButton>
            </div>
        </div>

        <!-- 地点选择弹窗 -->
        <MobileModal
            v-model:show="showLocationModal"
            title="选择地点"
            @confirm="confirmLocation"
        >
            <div class="location-selector">
                <div class="common-locations">
                    <h4>常用地点</h4>
                    <div class="location-list">
                        <div
                            v-for="location in commonLocations"
                            :key="location.id"
                            class="location-item"
                            :class="{ active: selectedLocation === location.name }"
                            @click="selectedLocation = location.name"
                        >
                            <NIcon size="16" color="var(--n-primary-color)">
                                <LocationIcon />
                            </NIcon>
                            <span>{{ location.name }}</span>
                        </div>
                    </div>
                </div>
                <div class="custom-location">
                    <h4>自定义地点</h4>
                    <NInput
                        v-model:value="customLocation"
                        placeholder="请输入详细地址"
                    />
                </div>
            </div>
        </MobileModal>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
    NForm,
    NFormItem,
    NInput,
    NInputNumber,
    NSelect,
    NDatePicker,
    NButton,
    NIcon,
    NSwitch,
    NUpload,
    NUploadDragger,
    NCheckbox,
    FormInst,
    useMessage,
    UploadFileInfo,
} from 'naive-ui';
import {
    LocationOutline as LocationIcon,
    BagHandleOutline as BagIcon,
    FastFoodOutline as FoodIcon,
    MedkitOutline as MedIcon,
    ShirtOutline as ShopIcon,
    CameraOutline as CameraIcon,
} from '@vicons/ionicons5';
import { MobileNavBar, MobileCard, MobileModal } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();
const formRef = ref<FormInst>();

// 服务类型配置
const serviceTypes = [
    {
        key: 'express',
        label: '快递代取',
        icon: BagIcon,
        color: 'var(--n-primary-color)',
    },
    {
        key: 'food',
        label: '外卖代取',
        icon: FoodIcon,
        color: 'var(--n-warning-color)',
    },
    {
        key: 'medicine',
        label: '药品代购',
        icon: MedIcon,
        color: 'var(--n-error-color)',
    },
    {
        key: 'daily',
        label: '生活用品',
        icon: ShopIcon,
        color: 'var(--n-success-color)',
    },
];

// 表单数据
const orderForm = reactive({
    type: 'express',
    title: '',
    description: '',
    pickupLocation: '',
    deliveryLocation: '',
    fee: null as number | null,
    contact: '',
    expectedTime: null as number | null,
    remarks: '',
    // 快递特有字段
    pickupCode: '',
    expressCompany: '',
    // 外卖特有字段
    weight: '',
    needKeepWarm: false,
    // 药品特有字段
    purchaseAmount: null as number | null,
});

// 表单验证规则
const formRules = {
    title: [
        { required: true, message: '请输入订单标题', trigger: 'blur' },
        { min: 2, max: 50, message: '标题长度在2-50个字符', trigger: 'blur' },
    ],
    description: [
        { required: true, message: '请输入详细描述', trigger: 'blur' },
        { min: 10, max: 200, message: '描述长度在10-200个字符', trigger: 'blur' },
    ],
    pickupLocation: [
        { required: true, message: '请选择取货地点', trigger: 'blur' },
    ],
    deliveryLocation: [
        { required: true, message: '请选择送达地点', trigger: 'blur' },
    ],
    fee: [
        { required: true, type: 'number', message: '请输入服务费用', trigger: 'blur' },
        { type: 'number', min: 1, max: 100, message: '服务费用在1-100元之间', trigger: 'blur' },
    ],
    contact: [
        { required: true, message: '请输入联系方式', trigger: 'blur' },
    ],
    expectedTime: [
        { required: true, type: 'number', message: '请选择期望完成时间', trigger: 'blur' },
    ],
    pickupCode: [
        { required: true, message: '请输入取件码', trigger: 'blur' },
    ],
};

// 其他数据
const submitting = ref(false);
const agreeTerms = ref(false);
const prescriptionFiles = ref<UploadFileInfo[]>([]);
const showLocationModal = ref(false);
const selectedLocation = ref('');
const customLocation = ref('');
const currentLocationField = ref<'pickup' | 'delivery'>('pickup');

// 快递公司选项
const expressCompanies = [
    { label: '顺丰速运', value: 'sf' },
    { label: '中通快递', value: 'zt' },
    { label: '圆通速递', value: 'yt' },
    { label: '申通快递', value: 'st' },
    { label: '韵达速递', value: 'yd' },
    { label: '菜鸟驿站', value: 'cn' },
];

// 重量选项
const weightOptions = [
    { label: '轻量 (< 1kg)', value: 'light' },
    { label: '中等 (1-3kg)', value: 'medium' },
    { label: '较重 (3-5kg)', value: 'heavy' },
    { label: '很重 (> 5kg)', value: 'very-heavy' },
];

// 常用地点
const commonLocations = [
    { id: 1, name: '宿舍楼下' },
    { id: 2, name: '教学楼A栋' },
    { id: 3, name: '图书馆' },
    { id: 4, name: '食堂' },
    { id: 5, name: '菜鸟驿站' },
    { id: 6, name: '校医院' },
    { id: 7, name: '体育馆' },
    { id: 8, name: '南门' },
];

// 计算属性
const platformFee = computed(() => {
    return orderForm.fee ? (orderForm.fee * 0.1).toFixed(2) : '0.00';
});

const totalFee = computed(() => {
    const serviceFee = orderForm.fee || 0;
    const platform = parseFloat(platformFee.value);
    const purchase = orderForm.type === 'medicine' ? (orderForm.purchaseAmount || 0) : 0;
    return (serviceFee + platform + purchase).toFixed(2);
});

const canSubmit = computed(() => {
    return orderForm.type && orderForm.title && orderForm.description &&
           orderForm.pickupLocation && orderForm.deliveryLocation &&
           orderForm.fee && orderForm.contact && orderForm.expectedTime &&
           agreeTerms.value;
});

// 方法
const selectServiceType = (type: string) => {
    orderForm.type = type;
    appStore.hapticFeedback('light');

    // 根据类型设置默认标题
    const typeLabels = {
        express: '快递代取',
        food: '外卖代取',
        medicine: '药品代购',
        daily: '生活用品代购',
    };
    orderForm.title = typeLabels[type] || '';
};

const selectLocation = (field: 'pickup' | 'delivery') => {
    currentLocationField.value = field;
    selectedLocation.value = field === 'pickup' ? orderForm.pickupLocation : orderForm.deliveryLocation;
    customLocation.value = '';
    showLocationModal.value = true;
};

const confirmLocation = () => {
    const location = selectedLocation.value || customLocation.value;
    if (!location) {
        message.warning('请选择或输入地点');
        return;
    }

    if (currentLocationField.value === 'pickup') {
        orderForm.pickupLocation = location;
    } else {
        orderForm.deliveryLocation = location;
    }

    showLocationModal.value = false;
    appStore.hapticFeedback('light');
};

const disableDate = (ts: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ts < today.getTime();
};

const disableTime = (ts: number) => {
    const now = new Date();
    const selected = new Date(ts);

    // 如果是今天，则禁用过去的时间
    if (selected.toDateString() === now.toDateString()) {
        return ts < now.getTime();
    }
    return false;
};

const handlePrescriptionUpload = (options: { fileList: UploadFileInfo[] }) => {
    prescriptionFiles.value = options.fileList;
};

const showTerms = () => {
    message.info('服务条款功能开发中...');
};

const handleSubmit = async () => {
    try {
        await formRef.value?.validate();

        submitting.value = true;
        appStore.hapticFeedback('medium');

        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 2000));

        message.success('订单发布成功！');
        router.push('/pickup/list');

    } catch (error) {
        console.error('表单验证失败:', error);
        message.error('请检查表单信息');
        appStore.hapticFeedback('heavy');
    } finally {
        submitting.value = false;
    }
};

// 初始化
onMounted(() => {
    // 从路由参数获取服务类型
    const type = router.currentRoute.value.query.type as string;
    if (type && serviceTypes.find(s => s.key === type)) {
        selectServiceType(type);
    }
});
</script>

<style scoped>
.create-pickup-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.form-container {
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

/* 服务类型选择 */
.service-types {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
    padding: 4px;
}

.service-type-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 12px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.service-type-item:active {
    transform: scale(0.95);
}

.service-type-item.active {
    border-color: var(--n-primary-color);
    background: var(--n-primary-color-suppl);
}

.service-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
}

.service-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

/* 表单样式 */
.create-pickup-page :deep(.n-form-item) {
    margin-bottom: 20px;
}

.create-pickup-page :deep(.n-input),
.create-pickup-page :deep(.n-input-number),
.create-pickup-page :deep(.n-select),
.create-pickup-page :deep(.n-date-picker) {
    border-radius: 8px;
}

.create-pickup-page :deep(.n-input__input-el) {
    font-size: 15px;
}

/* 上传区域 */
.upload-area {
    width: 100%;
}

.upload-content {
    text-align: center;
    padding: 20px;
    color: var(--n-text-color-2);
}

.upload-content p {
    margin: 8px 0 0 0;
    font-size: 14px;
}

.upload-hint {
    font-size: 12px !important;
    color: var(--n-text-color-3) !important;
}

/* 费用信息 */
.fee-info {
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

/* 服务条款 */
.terms-section {
    padding: 4px;
    text-align: center;
}

/* 提交按钮 */
.submit-section {
    margin-top: 32px;
}

.submit-section .n-button {
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
}

/* 地点选择弹窗 */
.location-selector {
    padding: 16px 0;
}

.location-selector h4 {
    font-size: 14px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 12px 0;
}

.common-locations {
    margin-bottom: 24px;
}

.location-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.location-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid transparent;
}

.location-item:hover {
    background: var(--n-color-target);
}

.location-item.active {
    border-color: var(--n-primary-color);
    background: var(--n-primary-color-suppl);
}

.location-item span {
    font-size: 14px;
    color: var(--n-text-color-1);
}

.custom-location {
    padding-top: 16px;
    border-top: 1px solid var(--n-border-color);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .form-container {
        padding: 12px;
        padding-bottom: 100px;
    }

    .service-types {
        gap: 8px;
    }

    .service-type-item {
        padding: 12px 8px;
    }

    .service-icon {
        width: 40px;
        height: 40px;
    }

    .service-label {
        font-size: 13px;
    }

    .section-title {
        font-size: 15px;
    }

    .submit-section .n-button {
        height: 46px;
        font-size: 15px;
    }
}

/* iOS 安全区域适配 */
.create-pickup-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.create-pickup-page {
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
.dark-theme .service-type-item:active {
    background: var(--ios-dark-gray4);
}

.light-theme .service-type-item:active {
    background: var(--ios-gray5);
}

/* 表单元素样式覆盖 */
.create-pickup-page :deep(.n-form-item-label) {
    font-weight: 500;
    color: var(--n-text-color-1);
}

.create-pickup-page :deep(.n-input__border),
.create-pickup-page :deep(.n-input__state-border) {
    border-radius: 8px;
}

.create-pickup-page :deep(.n-base-selection) {
    border-radius: 8px;
}
</style>
