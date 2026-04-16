<template>
    <div class="wallet-action-page" :class="{ 'is-dark': appStore.isDark }">
        <section class="wallet-action-page__topbar">
            <button type="button" class="wallet-action-page__back" @click="router.back()">
                <NIcon :size="18"><ChevronBackOutline /></NIcon>
            </button>
            <h1>充值</h1>
            <button
                type="button"
                class="wallet-action-page__record"
                @click="router.push('/wallet')"
            >
                记录
            </button>
        </section>

        <section class="wallet-action-page__hero">
            <span>Campus Wallet</span>
            <strong>{{ balanceText }}</strong>
            <p>支持支付宝、微信支付和银行卡充值，最低充值金额 10 元。</p>
        </section>

        <section class="wallet-action-page__card">
            <div class="wallet-action-page__section-title">
                <h2>选择充值方式</h2>
            </div>

            <NRadioGroup v-model:value="form.paymentMethod" name="recharge-method">
                <div class="wallet-action-page__method-grid">
                    <label
                        v-for="item in rechargeMethods"
                        :key="item.value"
                        class="wallet-action-page__method-card"
                        :class="{ 'is-active': form.paymentMethod === item.value }"
                    >
                        <input v-model="form.paymentMethod" type="radio" :value="item.value" />
                        <strong>{{ item.label }}</strong>
                        <p>{{ item.description }}</p>
                    </label>
                </div>
            </NRadioGroup>

            <NForm ref="formRef" :model="form" :rules="rules" label-placement="top">
                <NFormItem v-if="form.paymentMethod === 'bank_card'" label="选择银行" path="bank">
                    <NSelect
                        v-model:value="form.bank"
                        placeholder="请选择收款银行"
                        :options="bankSelectOptions"
                    />
                </NFormItem>

                <NFormItem
                    v-if="form.paymentMethod === 'bank_card'"
                    label="银行卡号"
                    path="account"
                >
                    <NInput
                        v-model:value="form.account"
                        placeholder="请输入 16 位银行卡号"
                        maxlength="16"
                    />
                </NFormItem>

                <NFormItem label="充值金额" path="amount">
                    <NInput
                        v-model:value="form.amount"
                        placeholder="请输入充值金额"
                        inputmode="decimal"
                    />
                </NFormItem>
            </NForm>

            <div v-if="!showQrSection" class="wallet-action-page__summary">
                <div>
                    <span>到账方式</span>
                    <strong>{{ methodSummaryText }}</strong>
                </div>
                <div>
                    <span>预计到账</span>
                    <strong>{{ expectedArrivalText }}</strong>
                </div>
            </div>

            <NButton
                v-if="!showQrSection"
                type="primary"
                round
                block
                size="large"
                :loading="submitting"
                @click="handleConfirmRecharge"
            >
                确认充值
            </NButton>
        </section>

        <section v-if="showQrSection" class="wallet-action-page__card">
            <div class="wallet-action-page__section-title">
                <h2>{{ qrSectionTitle }}</h2>
                <p>请使用对应支付方式扫码完成支付</p>
            </div>

            <div class="wallet-action-page__qr-box">
                <img :src="qrCodeImage" alt="充值二维码" class="wallet-action-page__qr-image" />
            </div>

            <div class="wallet-action-page__countdown">
                <span>剩余支付时间</span>
                <strong>
                    <NCountdown
                        :duration="600000"
                        :active="countdownActive"
                        @finish="handleCountdownFinish"
                    />
                </strong>
            </div>

            <NButton
                type="primary"
                round
                block
                size="large"
                :loading="submitting"
                @click="submitRecharge"
            >
                已完成支付？
            </NButton>
        </section>

        <NModal
            v-model:show="confirmModalVisible"
            preset="card"
            class="wallet-action-page__modal"
            :bordered="false"
        >
            <div class="wallet-action-page__modal-head">
                <h3>确认充值</h3>
                <p>{{ confirmDescription }}</p>
            </div>

            <div class="wallet-action-page__confirm-panel">
                <div>
                    <span>充值方式</span>
                    <strong>{{ activeMethodLabel }}</strong>
                </div>
                <div v-if="form.paymentMethod === 'bank_card'">
                    <span>充值账号</span>
                    <strong>{{ bankAccountPreview }}</strong>
                </div>
                <div>
                    <span>充值金额</span>
                    <strong>{{ amountText }}</strong>
                </div>
            </div>

            <div class="wallet-action-page__modal-actions">
                <NButton quaternary round @click="confirmModalVisible = false">取消</NButton>
                <NButton type="primary" round :loading="submitting" @click="confirmProceed">
                    {{ form.paymentMethod === 'bank_card' ? '立即充值' : '继续支付' }}
                </NButton>
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
    NButton,
    NCountdown,
    NForm,
    NFormItem,
    NIcon,
    NInput,
    NModal,
    NRadioGroup,
    NSelect,
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { ChevronBackOutline } from '@vicons/ionicons5';
import { WalletApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import qrCodeImage from '@/assets/ER-code/75584c9703b4cf1e3487572787a00001.png';
import {
    bankCardPattern,
    bankOptions,
    findBankOption,
    formatCurrency,
    type WalletPaymentMethod,
} from './walletShared';

const router = useRouter();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();
const formRef = ref<FormInst | null>(null);
const confirmModalVisible = ref(false);
const submitting = ref(false);
const countdownActive = ref(false);

const form = reactive({
    paymentMethod: 'alipay' as WalletPaymentMethod,
    bank: null as string | null,
    account: '',
    amount: '',
});

const rechargeMethods = [
    { label: '支付宝', value: 'alipay' as const, description: '扫码完成支付，10 分钟内有效' },
    { label: '微信支付', value: 'wechat' as const, description: '扫码完成支付，10 分钟内有效' },
    { label: '银行卡', value: 'bank_card' as const, description: '填写银行卡号后发起充值' },
];

const bankSelectOptions = bankOptions.map(option => ({
    label: `${option.shortName} ${option.label}`,
    value: option.value,
}));

const numericAmount = computed(() => Number.parseFloat(form.amount || '0') || 0);
const showQrSection = computed(
    () =>
        countdownActive.value &&
        (form.paymentMethod === 'alipay' || form.paymentMethod === 'wechat')
);
const activeMethodLabel = computed(
    () => rechargeMethods.find(item => item.value === form.paymentMethod)?.label || '充值'
);
const balanceText = computed(() => formatCurrency(Number(userStore.user?.balance || 0)));
const amountText = computed(() => formatCurrency(numericAmount.value));
const methodSummaryText = computed(() => {
    if (form.paymentMethod === 'bank_card') {
        const bank = findBankOption(form.bank);
        return bank ? `${bank.label} 银行卡充值` : '银行卡充值';
    }

    return `${activeMethodLabel.value}扫码充值`;
});
const expectedArrivalText = computed(() =>
    form.paymentMethod === 'bank_card' ? '余额可能延迟到账，请稍后刷新查看' : '确认支付后立即入账'
);
const qrSectionTitle = computed(() =>
    form.paymentMethod === 'alipay' ? '支付宝扫码充值' : '微信扫码充值'
);
const confirmDescription = computed(() =>
    form.paymentMethod === 'bank_card'
        ? '请核对银行卡信息。'
        : '确认后进入二维码支付流程，支付完成后点击确认入账。'
);
const bankAccountPreview = computed(() => {
    const bank = findBankOption(form.bank);
    if (!bank || !form.account) return '未填写';
    return `${bank.label} ${form.account.slice(0, 4)} **** **** ${form.account.slice(-4)}`;
});

const rules: FormRules = {
    bank: [
        {
            validator: () => {
                if (form.paymentMethod !== 'bank_card') return true;
                return Boolean(form.bank);
            },
            message: '请选择银行',
            trigger: ['change', 'blur'],
        },
    ],
    account: [
        {
            validator: () => {
                if (form.paymentMethod !== 'bank_card') return true;
                return bankCardPattern.test(form.account);
            },
            message: '请输入 16 位银行卡号',
            trigger: ['input', 'blur'],
        },
    ],
    amount: [
        {
            validator: () => numericAmount.value >= 10,
            message: '最低充值金额为 10 元',
            trigger: ['input', 'blur'],
        },
    ],
};

const syncUserBalance = (balance: number) => {
    if (!userStore.user) return;
    userStore.user.balance = balance;
    localStorage.setItem('user', JSON.stringify(userStore.user));
};

const loadProfile = async () => {
    if (!userStore.isAuthenticated) return;
    await userStore.fetchUserProfile();
};

const validateForm = async () => {
    await formRef.value?.validate();
};

const handleConfirmRecharge = async () => {
    try {
        await validateForm();
        confirmModalVisible.value = true;
    } catch {
        message.error('请先完善充值信息');
    }
};

const confirmProceed = async () => {
    confirmModalVisible.value = false;

    if (form.paymentMethod === 'bank_card') {
        await submitRecharge();
        return;
    }

    countdownActive.value = true;
    message.info('请完成扫码支付后再确认充值');
};

const submitRecharge = async () => {
    if (submitting.value) return;

    submitting.value = true;
    try {
        const response =
            form.paymentMethod === 'bank_card'
                ? await WalletApi.recharge({
                      amount: numericAmount.value,
                      payment_method: 'bank_card',
                      bank_prefix: findBankOption(form.bank)?.prefix,
                      account_no: form.account,
                  })
                : await WalletApi.recharge({
                      amount: numericAmount.value,
                      payment_method: form.paymentMethod as 'alipay' | 'wechat',
                  });

        if (!response.success || !response.data) {
            throw new Error(response.message || '充值失败');
        }

        syncUserBalance(Number(response.data.balance || 0));
        await loadProfile();
        countdownActive.value = false;
        message.success(
            form.paymentMethod === 'bank_card'
                ? '银行卡充值成功，余额可能延迟到账，请稍后刷新查看。'
                : '充值成功'
        );
        router.replace('/wallet');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '充值失败');
    } finally {
        submitting.value = false;
    }
};

const handleCountdownFinish = () => {
    countdownActive.value = false;
    message.warning('支付超时，请重新发起充值');
};

onMounted(async () => {
    await loadProfile();
});
</script>

<style scoped>
.wallet-action-page {
    min-height: 100vh;
    padding: 14px 14px 40px;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
}

.wallet-action-page.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
    color: #e2e8f0;
}

.wallet-action-page__topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.wallet-action-page__topbar h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #172033;
}

.wallet-action-page.is-dark .wallet-action-page__topbar h1,
.wallet-action-page.is-dark .wallet-action-page__method-card strong,
.wallet-action-page.is-dark .wallet-action-page__summary strong,
.wallet-action-page.is-dark .wallet-action-page__confirm-panel strong,
.wallet-action-page.is-dark .wallet-action-page__modal-head h3 {
    color: #f8fafc;
}

.wallet-action-page__back,
.wallet-action-page__record {
    min-width: 44px;
    min-height: 44px;
    border: none;
    border-radius: 14px;
    color: #35506f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.wallet-action-page__record {
    padding: 0 14px;
    font-size: 14px;
    font-weight: 600;
}

.wallet-action-page.is-dark .wallet-action-page__back,
.wallet-action-page.is-dark .wallet-action-page__record {
    color: #cbd5e1;
}

.wallet-action-page__hero {
    padding: 20px 18px;
    border-radius: 20px;
    background: linear-gradient(135deg, #2f6bff, #4bb8ff);
    color: #fff;
    margin-bottom: 12px;
}

.wallet-action-page__hero span {
    display: block;
    font-size: 12px;
    opacity: 0.82;
}

.wallet-action-page__hero strong {
    display: block;
    margin-top: 8px;
    font-size: 30px;
    font-weight: 700;
}

.wallet-action-page__hero p {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.6;
    opacity: 0.92;
}

.wallet-action-page__card {
    margin-bottom: 12px;
    padding: 16px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(20, 46, 88, 0.06);
}

.wallet-action-page.is-dark .wallet-action-page__card {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: none;
}

.wallet-action-page__section-title {
    margin-bottom: 14px;
}

.wallet-action-page__section-title h2 {
    margin: 0;
    font-size: 16px;
    color: #172033;
}

.wallet-action-page__section-title p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #5b667a;
}

.wallet-action-page.is-dark .wallet-action-page__section-title p,
.wallet-action-page.is-dark .wallet-action-page__method-card p,
.wallet-action-page.is-dark .wallet-action-page__summary span,
.wallet-action-page.is-dark .wallet-action-page__confirm-panel span,
.wallet-action-page.is-dark .wallet-action-page__countdown span,
.wallet-action-page.is-dark .wallet-action-page__tip,
.wallet-action-page.is-dark .wallet-action-page__modal-head p {
    color: #94a3b8;
}

.wallet-action-page__method-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
}

.wallet-action-page__method-card {
    position: relative;
    min-height: 96px;
    padding: 14px 12px;
    border: 1px solid #d7e3f7;
    border-radius: 14px;
    background: #f8fbff;
    cursor: pointer;
}

.wallet-action-page.is-dark .wallet-action-page__method-card {
    border-color: rgba(71, 85, 105, 0.7);
    background: rgba(15, 23, 42, 0.55);
}

.wallet-action-page__method-card input {
    position: absolute;
    opacity: 0;
    pointer-events: none;
}

.wallet-action-page__method-card.is-active {
    border-color: #2f6bff;
    background: #eef4ff;
    box-shadow: inset 0 0 0 1px rgba(47, 107, 255, 0.14);
}

.wallet-action-page.is-dark .wallet-action-page__method-card.is-active {
    background: rgba(37, 99, 235, 0.16);
}

.wallet-action-page__method-card strong {
    display: block;
    font-size: 15px;
    color: #172033;
}

.wallet-action-page__method-card p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.5;
    color: #6c7890;
}

.wallet-action-page__summary,
.wallet-action-page__confirm-panel {
    display: grid;
    gap: 12px;
    margin: 8px 0 16px;
    padding: 14px;
    border-radius: 14px;
    background: #f6f8fc;
}

.wallet-action-page.is-dark .wallet-action-page__summary,
.wallet-action-page.is-dark .wallet-action-page__confirm-panel,
.wallet-action-page.is-dark .wallet-action-page__qr-box {
    background: rgba(15, 23, 42, 0.55);
}

.wallet-action-page__summary span,
.wallet-action-page__confirm-panel span {
    display: block;
    font-size: 12px;
    color: #7a8598;
    margin-bottom: 4px;
}

.wallet-action-page__summary strong,
.wallet-action-page__confirm-panel strong {
    font-size: 15px;
    color: #172033;
}

.wallet-action-page__qr-box {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    border-radius: 16px;
    background: #f6f8fc;
}

.wallet-action-page__qr-image {
    width: min(220px, 100%);
    border-radius: 12px;
    background: #fff;
}

.wallet-action-page :deep(.n-input-wrapper),
.wallet-action-page :deep(.n-base-selection) {
    background: rgba(255, 255, 255, 0.96);
}

.wallet-action-page.is-dark :deep(.n-input-wrapper),
.wallet-action-page.is-dark :deep(.n-base-selection) {
    background: rgba(15, 23, 42, 0.7);
    box-shadow: inset 0 0 0 1px rgba(71, 85, 105, 0.7);
}

.wallet-action-page__countdown {
    margin: 16px 0 10px;
    text-align: center;
}

.wallet-action-page__countdown span {
    display: block;
    font-size: 13px;
    color: #6c7890;
}

.wallet-action-page__countdown strong {
    display: block;
    margin-top: 8px;
    font-size: 24px;
    color: #ff9b3d;
}

.wallet-action-page__tip {
    margin: 0 0 16px;
    font-size: 13px;
    line-height: 1.6;
    color: #5b667a;
    text-align: center;
}

.wallet-action-page__modal-head h3 {
    margin: 0;
    font-size: 18px;
    color: #172033;
}

.wallet-action-page__modal-head p {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: #5b667a;
}

.wallet-action-page__modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 8px;
}

@media (max-width: 420px) {
    .wallet-action-page__method-grid {
        grid-template-columns: 1fr;
    }
}
</style>
