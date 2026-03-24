<template>
    <div class="campus-create" :class="{ 'is-dark': appStore.isDark }">
        <header class="campus-nav-sticky">
            <div class="nav-main">
                <button type="button" class="back-icon-btn touch-feedback" @click="router.back()">
                    <svg viewBox="0 0 24 24" class="icon-svg">
                        <path
                            d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
                <div class="nav-title-group">
                    <span class="sub-label">Campus Order Form</span>
                    <h1 class="main-title">创建订单</h1>
                </div>
            </div>
        </header>

        <main class="order-viewport">
            <div class="config-stack">
                <section class="form-card">
                    <div class="field-node">
                        <label class="field-label">服务类型</label>
                        <NSelect
                            v-model:value="form.type"
                            :options="orderTypeOptions"
                            placeholder="请选择服务类型"
                            size="large"
                        />
                    </div>
                </section>

                <section class="form-card">
                    <div class="field-grid">
                        <div class="field-node">
                            <label class="field-label">{{ pickupLabel }}</label>
                            <NInput
                                v-model:value="form.pickup_location"
                                :placeholder="pickupPlaceholder"
                            />
                        </div>
                        <div class="field-node">
                            <label class="field-label">送达地点</label>
                            <NInput
                                v-model:value="form.delivery_location"
                                placeholder="例如：A3 宿舍楼下"
                            />
                        </div>
                    </div>

                    <transition name="fade-slide" mode="out-in">
                        <div :key="form.type" class="feature-zone">
                            <div v-if="form.type === 'express'" class="field-grid">
                                <div class="field-node">
                                    <label class="field-label">取件码</label>
                                    <NInput
                                        v-model:value="featureForm.express.pickupCode"
                                        placeholder="请输入取件码"
                                    />
                                </div>
                                <div class="field-node">
                                    <label class="field-label">手机尾号</label>
                                    <NInput
                                        v-model:value="featureForm.express.phoneTail"
                                        maxlength="4"
                                        placeholder="1234"
                                    />
                                </div>
                            </div>

                            <div v-if="form.type === 'food'" class="field-grid">
                                <div class="field-node">
                                    <label class="field-label">取餐人</label>
                                    <NInput
                                        v-model:value="featureForm.food.receiverName"
                                        placeholder="例如 张同学"
                                    />
                                </div>
                                <div class="field-node">
                                    <label class="field-label">手机尾号</label>
                                    <NInput
                                        v-model:value="featureForm.food.phoneTail"
                                        maxlength="4"
                                        placeholder="1234"
                                    />
                                </div>
                            </div>

                            <div v-if="form.type === 'medicine'" class="field-stack">
                                <div class="field-node">
                                    <label class="field-label">药品信息</label>
                                    <NInput
                                        v-model:value="featureForm.medicine.medicineName"
                                        type="textarea"
                                        :rows="3"
                                        placeholder="请填写药品名称、规格或数量"
                                    />
                                </div>
                            </div>

                            <div v-if="form.type === 'daily'" class="field-stack">
                                <div class="field-node">
                                    <label class="field-label">购物清单</label>
                                    <NInput
                                        v-model:value="featureForm.daily.shoppingList"
                                        type="textarea"
                                        :rows="3"
                                        placeholder="请详细填写需要采购的物品"
                                    />
                                </div>
                            </div>
                        </div>
                    </transition>
                </section>

                <section class="form-card">
                    <div class="field-grid">
                        <div class="field-node price-focus">
                            <label class="field-label">{{ priceLabel }}</label>
                            <NInputNumber
                                v-model:value="form.price"
                                :min="minimumPrice"
                                :precision="2"
                                style="width: 100%"
                            />
                        </div>
                        <div class="field-node">
                            <label class="field-label">联系电话</label>
                            <NInput v-model:value="customContactPhone" placeholder="联系电话" />
                        </div>
                    </div>

                    <div class="options-flex">
                        <NCheckbox v-model:checked="form.urgent">加急处理</NCheckbox>
                        <NCheckbox v-model:checked="form.fragile">易碎物品</NCheckbox>
                    </div>

                    <button
                        type="button"
                        class="advanced-trigger touch-feedback"
                        @click="showAdvanced = !showAdvanced"
                    >
                        <span>
                            {{ showAdvanced ? '收起更多选项' : '补充详细信息 (时间/备注)' }}
                        </span>
                        <i :class="{ 'is-open': showAdvanced }"></i>
                    </button>

                    <div v-if="showAdvanced" class="advanced-pane">
                        <div class="field-grid">
                            <div class="field-node">
                                <label class="field-label">期望送达时间</label>
                                <NDatePicker
                                    v-model:value="deliveryTime"
                                    type="datetime"
                                    style="width: 100%"
                                />
                            </div>
                            <div class="field-node">
                                <label class="field-label">订单小费</label>
                                <NInputNumber
                                    v-model:value="form.tip"
                                    :min="0"
                                    style="width: 100%"
                                />
                            </div>
                        </div>
                        <div class="field-node mt-16">
                            <label class="field-label">补充说明</label>
                            <NInput
                                v-model:value="form.notes"
                                type="textarea"
                                :rows="2"
                                placeholder="备注您的特殊要求..."
                            />
                        </div>
                    </div>
                </section>
            </div>

            <footer class="action-footer">
                <div class="summary-line">
                    <div class="total-label">合计费用</div>
                    <div class="total-val">¥{{ totalAmount }}</div>
                </div>
                <NButton
                    type="primary"
                    block
                    size="large"
                    round
                    class="submit-btn"
                    :loading="submitting"
                    @click="submitOrder"
                >
                    发布订单
                </NButton>
            </footer>
        </main>
        <div class="safe-bottom"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    NButton,
    NCheckbox,
    NDatePicker,
    NInput,
    NInputNumber,
    NSelect,
    useDialog,
    useMessage,
} from 'naive-ui';
import { PickupApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { CreatePickupOrderData } from '@/types';

type OrderType = CreatePickupOrderData['type'];

const router = useRouter();
const route = useRoute();
const dialog = useDialog();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();

const submitting = ref(false);
const showAdvanced = ref(false);
const pickupTime = ref<number | null>(null);
const deliveryTime = ref<number | null>(null);

const orderTypes = [
    { value: 'express', label: '快递代取', note: '驿站、快递柜、代收点' },
    { value: 'food', label: '外卖代拿', note: '食堂、店铺、外卖柜' },
    { value: 'medicine', label: '药品代购', note: '校医院、药房、指定药店' },
    { value: 'daily', label: '生活用品', note: '超市采购、日用品代买' },
] as const;

const orderTypeOptions = orderTypes.map(item => ({
    label: `${item.label} · ${item.note}`,
    value: item.value,
}));

const minimumPriceMap: Record<OrderType, number> = {
    express: 2,
    food: 3,
    medicine: 5,
    daily: 3,
};

const form = reactive<Omit<CreatePickupOrderData, 'title' | 'contact_name' | 'contact_phone'>>({
    type: 'express',
    description: '',
    pickup_location: '',
    delivery_location: '',
    pickup_time: undefined,
    delivery_time: undefined,
    pickup_code: '',
    weight: undefined,
    size: '',
    price: 0,
    tip: 0,
    urgent: false,
    fragile: false,
    images: undefined,
    notes: '',
});

const featureForm = reactive({
    express: {
        pickupCode: '',
        phoneTail: '',
    },
    food: {
        receiverName: '',
        phoneTail: '',
    },
    medicine: {
        medicineName: '',
        specification: '',
    },
    daily: {
        shoppingList: '',
    },
});

const selectedFlags = computed({
    get: () => {
        const values: string[] = [];
        if (form.urgent) values.push('urgent');
        if (form.fragile) values.push('fragile');
        return values;
    },
    set: values => {
        form.urgent = values.includes('urgent');
        form.fragile = values.includes('fragile');
    },
});

const totalAmount = computed(() => (Number(form.price || 0) + Number(form.tip || 0)).toFixed(2));

const defaultContactName = computed(
    () => userStore.user?.real_name || userStore.user?.username || '校园用户'
);

const defaultContactPhone = computed(() => userStore.user?.phone || '未留手机号');
const customContactName = ref('');
const customContactPhone = ref('');
const hasShownMedicineNotice = ref(false);

const pickupLabel = computed(() => {
    const map: Record<OrderType, string> = {
        express: '取件地点',
        food: '取餐地点',
        medicine: '购买地点',
        daily: '采购地点',
    };
    return map[form.type];
});

const pickupPlaceholder = computed(() => {
    const map: Record<OrderType, string> = {
        express: '例如：菜鸟驿站 / 快递柜',
        food: '例如：食堂门口 / 外卖柜',
        medicine: '例如：校医院 / 指定药店',
        daily: '例如：校园超市 / 南门便利店',
    };
    return map[form.type];
});

const priceLabel = computed(() => (form.type === 'medicine' ? '预计采购金额' : '订单金额'));
const pricePlaceholder = computed(() => `${priceLabel.value}，${minimumPriceHint.value}`);
const minimumPrice = computed(() => minimumPriceMap[form.type]);
const minimumPriceHint = computed(() => `该类型打底 ¥${minimumPrice.value}`);

const toISOStringOrUndefined = (value: number | null) =>
    value ? new Date(value).toISOString() : undefined;

const buildOrderPayload = (): CreatePickupOrderData & {
    contact_name: string;
    contact_phone: string;
} => {
    let title = '';
    let description = '';
    let contact_name = defaultContactName.value;
    let contact_phone = defaultContactPhone.value;
    let pickup_code: string | undefined;

    if (form.type === 'express') {
        title = `快递代取 · ${form.pickup_location.trim()}`;
        description = `取件码：${featureForm.express.pickupCode.trim()}；手机号尾号：${featureForm.express.phoneTail.trim()}`;
        contact_name = customContactName.value.trim() || '快递代取';
        contact_phone = customContactPhone.value.trim() || featureForm.express.phoneTail.trim();
        pickup_code = featureForm.express.pickupCode.trim();
    } else if (form.type === 'food') {
        title = `外卖代拿 · ${form.pickup_location.trim()}`;
        description = `取餐人：${featureForm.food.receiverName.trim()}；手机号尾号：${featureForm.food.phoneTail.trim()}`;
        contact_name = customContactName.value.trim() || featureForm.food.receiverName.trim();
        contact_phone = customContactPhone.value.trim() || featureForm.food.phoneTail.trim();
    } else if (form.type === 'medicine') {
        title = `药品代购 · ${featureForm.medicine.medicineName.trim()}`;
        description = `仅购买非处方药；药品名称：${featureForm.medicine.medicineName.trim()}${
            featureForm.medicine.specification.trim()
                ? `；规格/数量：${featureForm.medicine.specification.trim()}`
                : ''
        }`;
        contact_name = customContactName.value.trim() || defaultContactName.value;
        contact_phone = customContactPhone.value.trim() || defaultContactPhone.value;
    } else {
        title = `生活用品代购 · ${form.pickup_location.trim()}`;
        description = `购物清单：${featureForm.daily.shoppingList.trim()}`;
        contact_name = customContactName.value.trim() || defaultContactName.value;
        contact_phone = customContactPhone.value.trim() || defaultContactPhone.value;
    }

    return {
        type: form.type,
        title,
        description,
        pickup_location: form.pickup_location.trim(),
        delivery_location: form.delivery_location.trim(),
        pickup_time: toISOStringOrUndefined(pickupTime.value),
        delivery_time: toISOStringOrUndefined(deliveryTime.value),
        contact_name,
        contact_phone,
        pickup_code,
        weight: form.weight,
        size: form.size?.trim() || undefined,
        price: Number(form.price || 0),
        tip: Number(form.tip || 0),
        urgent: form.urgent,
        fragile: form.fragile,
        notes: form.notes?.trim() || undefined,
    };
};

const validateForm = () => {
    if (!form.pickup_location.trim()) return `请填写${pickupLabel.value}`;
    if (!form.delivery_location.trim()) return '请填写送达地点';
    if (!Number(form.price))
        return form.type === 'medicine' ? '请填写预计采购金额' : '请填写订单金额';
    if (Number(form.price) < minimumPrice.value) {
        return `${orderTypes.find(item => item.value === form.type)?.label || '当前类型'}打底 ¥${minimumPrice.value}`;
    }

    if (form.type === 'express') {
        if (!featureForm.express.pickupCode.trim()) return '请填写取件码';
        if (!featureForm.express.phoneTail.trim()) return '请填写手机尾号';
    }

    if (form.type === 'food') {
        if (!featureForm.food.receiverName.trim()) return '请填写取餐人姓名';
        if (!featureForm.food.phoneTail.trim()) return '请填写手机尾号';
    }

    if (form.type === 'medicine' && !featureForm.medicine.medicineName.trim())
        return '请填写药品名称';

    if (form.type === 'daily' && !featureForm.daily.shoppingList.trim()) {
        return '请填写购物清单';
    }

    return '';
};

const submitOrder = async () => {
    const error = validateForm();
    if (error) {
        message.warning(error);
        return;
    }

    submitting.value = true;
    try {
        const payload = buildOrderPayload();
        const response = await PickupApi.createOrder(payload);

        if (!response.success) {
            throw new Error(response.message || '创建订单失败');
        }

        appStore.hapticFeedback('medium');
        message.success('订单创建成功');
        router.replace('/pickup/my');
    } catch (err: any) {
        message.error(err?.message || '创建订单失败');
    } finally {
        submitting.value = false;
    }
};

onMounted(() => {
    const routeType = route.query.type;
    if (typeof routeType === 'string' && orderTypes.some(item => item.value === routeType)) {
        form.type = routeType as OrderType;
    }
    form.price = minimumPriceMap[form.type];
    customContactName.value = userStore.user?.real_name || userStore.user?.username || '';
    customContactPhone.value = userStore.user?.phone || '';
});

watch(
    () => form.type,
    type => {
        form.price = minimumPriceMap[type];

        if (type === 'medicine' && !hasShownMedicineNotice.value) {
            hasShownMedicineNotice.value = true;
            dialog.warning({
                title: '药品代购提示',
                content: '仅支持购买非处方药，处方药请自行购买。',
                positiveText: '我知道了',
            });
        }
    }
);
</script>

<style scoped>
.campus-create {
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

/* 顶部导航 */
.campus-nav-sticky {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(248, 250, 252, 0.85);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0, 0, 0, 0.02);
}

.nav-main {
    display: flex;
    align-items: center;
    padding: 12px 16px;
}

.back-icon-btn {
    border: none;
    background: none;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    margin-right: 12px;
}

.nav-title-group .sub-label {
    display: block;
    font-size: 11px;
    color: var(--muted);
    font-weight: 700;
    letter-spacing: 0.5px;
    text-transform: uppercase;
}

.nav-title-group .main-title {
    margin: 0;
    font-size: 22px;
    font-weight: 800;
}

/* 布局容器 */
.order-viewport {
    padding: 16px;
    max-width: 600px;
    margin: 0 auto;
}

.config-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-card {
    background: var(--card);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    animation: slide-up 0.5s ease-out both;
}

/* 表单元素 */
.field-node {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    padding-left: 4px;
}

.field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.field-stack {
    margin-top: 16px;
}

.price-focus :deep(.n-input-number-input) {
    color: var(--primary);
    font-weight: 700;
    font-size: 16px;
}

.options-flex {
    display: flex;
    gap: 20px;
    margin: 20px 0;
    padding: 0 4px;
}

/* 高级选项切换器 */
.advanced-trigger {
    width: 100%;
    background: #f1f5f9;
    border: none;
    border-radius: 12px;
    padding: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
    transition: all 0.3s;
}

.advanced-trigger i {
    width: 6px;
    height: 6px;
    border-right: 2px solid var(--muted);
    border-bottom: 2px solid var(--muted);
    transform: rotate(45deg);
    margin-bottom: 2px;
}

.advanced-trigger i.is-open {
    transform: rotate(-135deg);
    margin-bottom: -2px;
}

.advanced-pane {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #e2e8f0;
    animation: fade-in 0.4s ease-out;
}

/* 底部结算区 */
.action-footer {
    margin-top: 32px;
    background: var(--card);
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.04);
}

.summary-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
}

.total-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
}

.total-val {
    font-size: 32px;
    font-weight: 800;
    color: var(--text);
}

.submit-btn {
    height: 54px;
    font-size: 17px;
    font-weight: 700;
    background: var(--grad) !important;
    border: none !important;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.mt-16 {
    margin-top: 16px;
}

/* 动画 */
@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fade-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

.fade-slide-enter-active,
.fade-slide-leave-active {
    transition: all 0.3s ease;
}
.fade-slide-enter-from {
    opacity: 0;
    transform: translateX(10px);
}
.fade-slide-leave-to {
    opacity: 0;
    transform: translateX(-10px);
}

@media (max-width: 768px) {
    .field-grid {
        grid-template-columns: 1fr;
    }
}
</style>
