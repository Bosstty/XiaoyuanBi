<template>
    <div class="campus-create" :class="{ 'is-dark': appStore.isDark }">
        <header class="campus-nav-sticky">
            <div class="nav-back-group" @click="router.back()">
                <svg viewBox="0 0 24 24" class="icon-svg">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
                <span class="nav-title">创建订单</span>
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
                            <div v-if="form.type === 'express'" class="field-stack">
                                <div class="field-node">
                                    <div class="field-label-row">
                                        <label class="field-label">快递信息</label>
                                        <button
                                            type="button"
                                            class="add-item-btn"
                                            @click="addExpressItem"
                                        >
                                            + 添加快递
                                        </button>
                                    </div>
                                    <div class="express-item-editor">
                                        <div
                                            v-for="(item, index) in featureForm.express.items"
                                            :key="index"
                                            class="express-item-card"
                                        >
                                            <div class="express-item-card__head">
                                                <strong>第{{ index + 1 }}件快递</strong>
                                                <button
                                                    type="button"
                                                    class="remove-item-btn"
                                                    :disabled="
                                                        featureForm.express.items.length === 1
                                                    "
                                                    @click="removeExpressItem(index)"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                            <div class="field-grid">
                                                <div class="field-node">
                                                    <label class="field-label">取件码</label>
                                                    <NInput
                                                        v-model:value="item.pickupCode"
                                                        placeholder="请输入取件码"
                                                    />
                                                </div>
                                                <div class="field-node">
                                                    <label class="field-label">手机尾号</label>
                                                    <NInput
                                                        v-model:value="item.phoneTail"
                                                        maxlength="4"
                                                        placeholder="1234"
                                                    />
                                                </div>
                                                <div class="field-node">
                                                    <label class="field-label">重量范围</label>
                                                    <NSelect
                                                        v-model:value="item.weightTier"
                                                        :options="expressWeightOptions"
                                                        placeholder="请选择重量范围"
                                                        style="width: 100%"
                                                    />
                                                </div>
                                                <div class="field-node">
                                                    <label class="field-label">物品尺寸</label>
                                                    <NSelect
                                                        v-model:value="item.sizeTier"
                                                        :options="expressSizeOptions"
                                                        placeholder="请选择物品尺寸"
                                                        style="width: 100%"
                                                    />
                                                </div>
                                            </div>
                                            <div
                                                class="price-rule-card express-item-card__price"
                                                :class="{ warning: expressItemNeedsQuote(item) }"
                                            >
                                                <strong
                                                    v-if="expressItemMinimumPrice(item) !== null"
                                                >
                                                    ¥{{ expressItemMinimumPrice(item)?.toFixed(2) }}
                                                </strong>
                                                <strong v-else>
                                                    {{
                                                        expressItemNeedsQuote(item)
                                                            ? '请联系客服报价'
                                                            : '待补全重量和尺寸'
                                                    }}
                                                </strong>
                                                <span
                                                    v-if="
                                                        expressItemMinimumPrice(item) !== null &&
                                                        !expressItemConflictMessage(item)
                                                    "
                                                >
                                                    重量费 ¥{{
                                                        expressItemWeightFee(item).toFixed(2)
                                                    }}
                                                    + 尺寸附加费 ¥{{
                                                        expressItemSizeFee(item).toFixed(2)
                                                    }}
                                                </span>
                                                <span v-else-if="expressItemConflictMessage(item)">
                                                    {{ expressItemConflictMessage(item) }}
                                                </span>
                                                <span v-else>
                                                    6kg以上大件请联系客服人工报价后再下单
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div class="field-node field-node--full">
                                    <label class="field-label">最低价格</label>
                                    <div
                                        class="price-rule-card"
                                        :class="{ warning: expressNeedsQuote }"
                                    >
                                        <strong v-if="expressMinimumPrice !== null">
                                            ¥{{ expressMinimumPrice.toFixed(2) }}
                                        </strong>
                                        <strong v-else>请联系客服报价</strong>
                                        <span v-if="expressMinimumPrice !== null">
                                            已按
                                            {{ featureForm.express.items.length }}
                                            件快递汇总最低价格
                                        </span>
                                        <span v-else>
                                            存在6kg以上大件或待补全信息，请联系客服报价
                                        </span>
                                    </div>
                                </div>
                                <div
                                    v-if="expressValidationMessage"
                                    class="field-node field-node--full"
                                >
                                    <div class="inline-error">{{ expressValidationMessage }}</div>
                                </div>
                            </div>

                            <div v-if="form.type === 'food'" class="field-grid">
                                <div class="field-node">
                                    <label class="field-label">订单姓名</label>
                                    <NInput
                                        v-model:value="featureForm.food.receiverName"
                                        placeholder="例如 张同学"
                                    />
                                </div>
                                <div class="field-node">
                                    <label class="field-label">订单尾号</label>
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
                                    <div class="field-label-row">
                                        <label class="field-label">购物清单</label>
                                        <button
                                            type="button"
                                            class="add-item-btn"
                                            @click="addDailyItem"
                                        >
                                            + 添加商品
                                        </button>
                                    </div>
                                    <div class="shopping-list-editor">
                                        <div
                                            v-for="(item, index) in featureForm.daily.items"
                                            :key="index"
                                            class="shopping-item-row"
                                        >
                                            <NInput
                                                v-model:value="item.name"
                                                placeholder="物品名称"
                                            />
                                            <NInput
                                                v-model:value="item.spec"
                                                placeholder="规格/颜色/型号"
                                            />
                                            <NInput
                                                v-model:value="item.quantity"
                                                placeholder="数量"
                                            />
                                            <button
                                                type="button"
                                                class="remove-item-btn"
                                                :disabled="featureForm.daily.items.length === 1"
                                                @click="removeDailyItem(index)"
                                            >
                                                删除
                                            </button>
                                        </div>
                                    </div>
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
                                :disabled="expressNeedsQuote"
                                :precision="2"
                                style="width: 100%"
                            />
                            <span v-if="priceHelperText" class="field-help">
                                {{ priceHelperText }}
                            </span>
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
                    <div v-if="optionSurcharge > 0" class="field-help option-surcharge-note">
                        附加费：{{ form.urgent ? '加急 +¥3' : ''
                        }}{{ form.urgent && form.fragile ? '，' : ''
                        }}{{ form.fragile ? '易碎 +¥3' : '' }}
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
                <div v-if="optionSurcharge > 0" class="summary-subline">
                    订单金额已包含附加费 ¥{{ optionSurcharge.toFixed(2) }}，另加小费 ¥{{
                        Number(form.tip || 0).toFixed(2)
                    }}
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
import { computed, h, onMounted, reactive, ref, watch } from 'vue';
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
import { PickupApi, WalletApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { CreatePickupOrderData } from '@/types';

type OrderType = CreatePickupOrderData['type'];
type ExpressWeightTier = 'lt3' | '3to4' | '4to5' | '5to6' | 'gt6';
type ExpressSizeTier = 'normal' | 'medium' | 'oversized';
type ExpressFormItem = {
    pickupCode: string;
    phoneTail: string;
    weightTier: ExpressWeightTier | null;
    sizeTier: ExpressSizeTier | null;
};

const expressWeightOptions = [
    { label: '3kg以内', value: 'lt3' },
    { label: '3–4kg', value: '3to4' },
    { label: '4–5kg', value: '4to5' },
    { label: '5–6kg', value: '5to6' },
    { label: '6kg以上', value: 'gt6' },
];

const expressSizeOptions = [
    {
        label: '正常大小（示例：鼠标、化妆品、书本）',
        value: 'normal',
    },
    {
        label: '中等大小（示例：背包、鞋子、键盘）',
        value: 'medium',
    },
    {
        label: '超大尺寸（示例：电脑桌、电竞椅、凳子）',
        value: 'oversized',
    },
];

const expressWeightFeeMap: Record<ExpressWeightTier, number | null> = {
    lt3: 3,
    '3to4': 6,
    '4to5': 9,
    '5to6': 12,
    gt6: null,
};

const expressWeightValueMap: Record<ExpressWeightTier, number> = {
    lt3: 3,
    '3to4': 4,
    '4to5': 5,
    '5to6': 6,
    gt6: 7,
};

const expressSizeFeeMap: Record<ExpressSizeTier, number> = {
    normal: 0,
    medium: 2,
    oversized: 8,
};

const expressSizeLabelMap: Record<ExpressSizeTier, string> = {
    normal: '正常大小',
    medium: '中等大小',
    oversized: '超大尺寸',
};

const createDailyItem = () => ({
    name: '',
    spec: '',
    quantity: '',
});

const createExpressItem = (): ExpressFormItem => ({
    pickupCode: '',
    phoneTail: '',
    weightTier: null,
    sizeTier: null,
});

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
const paymentPassword = ref('');

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
    express: 3,
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
        items: [createExpressItem()],
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
        items: [createDailyItem()],
    },
});

const optionSurcharge = computed(() => {
    let total = 0;
    if (form.urgent) total += 3;
    if (form.fragile) total += 3;
    return total;
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
const expressItemWeightFee = (item: ExpressFormItem) =>
    item.weightTier ? expressWeightFeeMap[item.weightTier] || 0 : 0;
const expressItemSizeFee = (item: ExpressFormItem) =>
    item.sizeTier ? expressSizeFeeMap[item.sizeTier] || 0 : 0;
const expressItemNeedsQuote = (item: ExpressFormItem) => item.weightTier === 'gt6';
const expressItemConflictMessage = (item: ExpressFormItem) => {
    const weightTier = item.weightTier;
    const sizeTier = item.sizeTier;
    if (!weightTier || !sizeTier) return '';
    if ((weightTier === '4to5' || weightTier === '5to6') && sizeTier === 'normal') {
        return '该重量与所选尺寸不匹配，请重新确认';
    }
    if (weightTier === 'gt6' && (sizeTier === 'normal' || sizeTier === 'medium')) {
        return '该重量与所选尺寸不匹配，请重新确认';
    }
    return '';
};
const expressItemMinimumPrice = (item: ExpressFormItem) => {
    if (!item.weightTier || !item.sizeTier) return null;
    if (expressItemNeedsQuote(item)) return null;
    if (expressItemConflictMessage(item)) return null;
    return Number(expressItemWeightFee(item)) + Number(expressItemSizeFee(item));
};
const expressNeedsQuote = computed(() =>
    featureForm.express.items.some(item => expressItemNeedsQuote(item))
);
const expressMinimumPrice = computed(() => {
    if (form.type !== 'express') return null;
    if (!featureForm.express.items.length) return 3;
    if (expressNeedsQuote.value) return null;

    let total = 0;
    for (const item of featureForm.express.items) {
        const itemMinimumPrice = expressItemMinimumPrice(item);
        if (itemMinimumPrice === null) {
            return null;
        }
        total += itemMinimumPrice;
    }

    return total;
});
const minimumPrice = computed(() => {
    if (form.type === 'express') {
        return (expressMinimumPrice.value ?? 0) + Number(optionSurcharge.value || 0);
    }
    return minimumPriceMap[form.type] + Number(optionSurcharge.value || 0);
});
const minimumPriceHint = computed(() => {
    if (form.type === 'express') {
        if (expressNeedsQuote.value) return '请联系客服报价';
        if (expressMinimumPrice.value !== null) return `当前最低 ¥${minimumPrice.value.toFixed(2)}`;
        return '请选择重量和尺寸';
    }
    return `该类型打底 ¥${minimumPrice.value}`;
});
const priceHelperText = computed(() => {
    if (form.type !== 'express') return minimumPriceHint.value;
    return expressNeedsQuote.value ? '6kg以上请联系客服报价' : minimumPriceHint.value;
});

const expressValidationMessage = computed(() => {
    if (form.type !== 'express') return '';
    const conflictItem = featureForm.express.items.find(item => expressItemConflictMessage(item));
    return conflictItem ? expressItemConflictMessage(conflictItem) : '';
});

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
    let weight: number | undefined;
    let size: string | undefined;

    if (form.type === 'express') {
        const expressItems = featureForm.express.items.map((item, index) => ({
            item_index: index + 1,
            pickup_code: item.pickupCode.trim(),
            phone_tail: item.phoneTail.trim(),
            weight: item.weightTier ? expressWeightValueMap[item.weightTier] : undefined,
            size: item.sizeTier ? expressSizeLabelMap[item.sizeTier] : undefined,
        }));
        const firstItem = expressItems[0];
        title = `快递代取 · ${form.pickup_location.trim()}`;
        description = expressItems
            .map((item, index) => {
                const weightLabel =
                    expressWeightOptions.find(
                        option => option.value === featureForm.express.items[index]?.weightTier
                    )?.label || '--';
                return `第${index + 1}件：取件码${item.pickup_code || '--'}；手机号尾号${item.phone_tail || '--'}；重量${weightLabel}；尺寸${item.size || '--'}`;
            })
            .join('；');
        contact_name = customContactName.value.trim() || '快递代取';
        contact_phone = customContactPhone.value.trim() || defaultContactPhone.value;
        pickup_code = firstItem?.pickup_code;
        weight = firstItem?.weight;
        size = firstItem?.size;

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
            weight,
            size,
            items: expressItems,
            price: Number(form.price || 0),
            tip: Number(form.tip || 0),
            urgent: form.urgent,
            fragile: form.fragile,
            notes: form.notes?.trim() || undefined,
        };
    } else if (form.type === 'food') {
        title = `外卖代拿 · ${form.pickup_location.trim()}`;
        description = `订单姓名：${featureForm.food.receiverName.trim()}；订单尾号：${featureForm.food.phoneTail.trim()}`;
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
        description = `购物清单：${featureForm.daily.items
            .map(item => {
                const parts = [item.name.trim()];
                if (item.spec.trim()) parts.push(item.spec.trim());
                if (item.quantity.trim()) parts.push(`x${item.quantity.trim()}`);
                return parts.join(' / ');
            })
            .filter(Boolean)
            .join('；')}`;
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
        weight,
        size,
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
    if (form.type === 'express') {
        for (const [index, item] of featureForm.express.items.entries()) {
            if (!item.pickupCode.trim()) return `请填写第${index + 1}件快递的取件码`;
            if (!item.phoneTail.trim()) return `请填写第${index + 1}件快递的手机尾号`;
            if (!item.weightTier) return `请选择第${index + 1}件快递的重量范围`;
            if (!item.sizeTier) return `请选择第${index + 1}件快递的物品尺寸`;
            if (expressItemConflictMessage(item)) return expressItemConflictMessage(item);
        }
        if (expressValidationMessage.value) return expressValidationMessage.value;
        if (expressNeedsQuote.value) return '存在6kg以上大件，请联系客服报价';
    }
    if (!Number(form.price))
        return form.type === 'medicine' ? '请填写预计采购金额' : '请填写订单金额';
    if (Number(form.price) < minimumPrice.value) {
        return form.type === 'express'
            ? `订单金额不能低于最低价格 ¥${minimumPrice.value.toFixed(2)}`
            : `${orderTypes.find(item => item.value === form.type)?.label || '当前类型'}打底 ¥${minimumPrice.value}`;
    }

    if (form.type === 'food') {
        if (!featureForm.food.receiverName.trim()) return '请填写订单姓名';
        if (!featureForm.food.phoneTail.trim()) return '请填写订单尾号';
    }

    if (form.type === 'medicine' && !featureForm.medicine.medicineName.trim())
        return '请填写药品名称';

    if (
        form.type === 'daily' &&
        !featureForm.daily.items.some(item => item.name.trim() && item.quantity.trim())
    ) {
        return '请至少填写一项购物清单';
    }

    return '';
};

const createOrderWithPassword = async (password: string) => {
    submitting.value = true;
    try {
        const payload = {
            ...buildOrderPayload(),
            payment_password: password,
        };
        const response = await PickupApi.createOrder(payload);

        if (!response.success) {
            throw new Error(response.message || '创建订单失败');
        }

        if (userStore.user) {
            userStore.user.balance = Number(
                Math.max(0, Number(userStore.user.balance || 0) - Number(totalAmount.value))
            );
        }
        appStore.hapticFeedback('medium');
        message.success(response.message || `订单创建成功，已冻结 ¥${totalAmount.value}`);
        router.replace('/pickup/my');
        return true;
    } catch (err: any) {
        message.error(err?.message || '创建订单失败');
        return false;
    } finally {
        submitting.value = false;
    }
};

const openPaymentPasswordDialog = () => {
    paymentPassword.value = '';

    dialog.warning({
        title: '确认冻结订单金额',
        positiveText: '确认创建',
        negativeText: '取消',
        content: () =>
            h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
                h(
                    'p',
                    { style: 'margin:0;color:#0f172a;font-size:14px;font-weight:600;' },
                    `本次将冻结 ¥${totalAmount.value} 作为订单担保金，订单完成后自动转给配送员。`
                ),
                h(
                    'p',
                    { style: 'margin:0;color:#64748b;font-size:13px;line-height:1.6;' },
                    '请输入6位支付密码后创建订单。若订单取消，冻结金额会退回余额。'
                ),
                h(NInput, {
                    value: paymentPassword.value,
                    type: 'password',
                    maxlength: 6,
                    showPasswordOn: 'click',
                    placeholder: '请输入6位支付密码',
                    onUpdateValue: (value: string) => {
                        paymentPassword.value = value.replace(/\D/g, '').slice(0, 6);
                    },
                }),
            ]),
        async onPositiveClick() {
            if (!/^\d{6}$/.test(paymentPassword.value)) {
                message.warning('请输入6位数字支付密码');
                return false;
            }

            return await createOrderWithPassword(paymentPassword.value);
        },
    });
};

const openSetPaymentPasswordDialog = () => {
    dialog.info({
        title: '请先设置支付密码',
        positiveText: '前往设置',
        negativeText: '取消',
        content: '创建代取订单前需要先设置6位数字支付密码，设置时需验证账户密码。',
        onPositiveClick() {
            router.push('/wallet/payment-settings');
        },
    });
};

const openDailyOrderNoticeDialog = () => {
    dialog.warning({
        title: '代购订单风险提示',
        positiveText: '我已知晓',
        negativeText: '取消',
        content:
            '请确认：若在订单进行途中已由代取员完成购买，但用户恶意拒绝支付货款，系统将封禁该用户，并计入该用户的评价系统。',
        onPositiveClick() {
            openPaymentPasswordDialog();
        },
    });
};

const addDailyItem = () => {
    featureForm.daily.items.push(createDailyItem());
};

const addExpressItem = () => {
    featureForm.express.items.push(createExpressItem());
};

const removeExpressItem = (index: number) => {
    if (featureForm.express.items.length === 1) {
        featureForm.express.items[0] = createExpressItem();
        return;
    }
    featureForm.express.items.splice(index, 1);
};

const removeDailyItem = (index: number) => {
    if (featureForm.daily.items.length === 1) {
        featureForm.daily.items[0] = createDailyItem();
        return;
    }
    featureForm.daily.items.splice(index, 1);
};

const submitOrder = async () => {
    const error = validateForm();
    if (error) {
        message.warning(error);
        return;
    }

    if (submitting.value) {
        return;
    }

    try {
        const overviewResponse = await WalletApi.getOverview();
        if (!overviewResponse.success || !overviewResponse.data) {
            throw new Error(overviewResponse.message || '获取钱包信息失败');
        }

        const availableBalance = Number(
            overviewResponse.data.summary?.available_balance ?? userStore.user?.balance ?? 0
        );
        const requiredAmount = Number(totalAmount.value);

        if (availableBalance < requiredAmount) {
            throw new Error(`余额不足，当前余额 ¥${availableBalance.toFixed(2)}，请先充值`);
        }

        if (!overviewResponse.data.wallet?.payment_password_set) {
            openSetPaymentPasswordDialog();
            return;
        }

        if (form.type === 'daily') {
            openDailyOrderNoticeDialog();
            return;
        }

        openPaymentPasswordDialog();
    } catch (err: any) {
        message.error(err?.message || '创建订单失败');
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
        if (type !== 'express') {
            form.weight = undefined;
            form.size = '';
        }

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

const syncOrderPriceToMinimum = () => {
    if (form.type === 'express' && expressNeedsQuote.value) {
        form.price = 0;
        return;
    }

    if (Number(form.price || 0) < minimumPrice.value) {
        form.price = minimumPrice.value;
    }
};

watch(
    () => minimumPrice.value,
    () => {
        syncOrderPriceToMinimum();
    },
    { immediate: true }
);

watch(
    () => expressNeedsQuote.value,
    () => {
        syncOrderPriceToMinimum();
    },
    { immediate: true }
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
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    padding: 16px 16px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.nav-back-group {
    display: flex;
    align-items: center;
    color: var(--text);
    cursor: pointer;
    width: fit-content;
    min-height: 28px;
}

.icon-svg {
    width: 20px;
    height: 20px;
}

.nav-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin-left: 6px;
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
    min-width: 0;
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
    min-width: 0;
}

.field-node--full {
    grid-column: 1 / -1;
}

.field-stack {
    margin-top: 16px;
}

.field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 8px;
}

.add-item-btn,
.remove-item-btn {
    border: none;
    border-radius: 999px;
    padding: 7px 12px;
    font-size: 12px;
    font-weight: 700;
}

.add-item-btn {
    background: rgba(59, 130, 246, 0.12);
    color: var(--primary);
}

.remove-item-btn {
    background: rgba(148, 163, 184, 0.16);
    color: #64748b;
}

.remove-item-btn:disabled {
    opacity: 0.5;
}

.shopping-list-editor {
    display: grid;
    gap: 12px;
}

.express-item-editor {
    display: grid;
    gap: 14px;
}

.express-item-card {
    display: grid;
    gap: 14px;
    padding: 16px;
    border-radius: 18px;
    background: rgba(148, 163, 184, 0.08);
    border: 1px solid rgba(148, 163, 184, 0.14);
}

.express-item-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.express-item-card__head strong {
    font-size: 14px;
    font-weight: 800;
    color: var(--text);
}

.express-item-card__price {
    padding: 12px 14px;
}

.shopping-item-row {
    display: grid;
    grid-template-columns: 1.2fr 1fr 0.7fr auto;
    gap: 10px;
    align-items: center;
}

.price-rule-card {
    display: grid;
    gap: 6px;
    padding: 14px 16px;
    border-radius: 16px;
    background: rgba(59, 130, 246, 0.08);
    border: 1px solid rgba(59, 130, 246, 0.14);
}

.price-rule-card.warning {
    background: rgba(245, 158, 11, 0.1);
    border-color: rgba(245, 158, 11, 0.2);
}

.price-rule-card strong {
    font-size: 20px;
    font-weight: 800;
    color: var(--primary);
}

.price-rule-card.warning strong {
    color: #d97706;
}

.price-rule-card span,
.field-help {
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
}

.inline-error {
    font-size: 12px;
    font-weight: 700;
    color: #dc2626;
    padding: 10px 12px;
    border-radius: 12px;
    background: rgba(254, 226, 226, 0.8);
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

.summary-subline {
    margin: -10px 0 18px;
    font-size: 12px;
    line-height: 1.6;
    color: var(--muted);
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

.option-surcharge-note {
    margin-top: -8px;
    margin-bottom: 14px;
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

    .shopping-item-row {
        grid-template-columns: 1fr;
    }
}
</style>
