<template>
    <div class="wallet-action-page" :class="{ 'is-dark': appStore.isDark }">
        <section class="wallet-action-page__topbar">
            <button type="button" class="wallet-action-page__back" @click="router.back()">
                <NIcon :size="18"><ChevronBackOutline /></NIcon>
            </button>
            <h1>提现</h1>
            <button
                type="button"
                class="wallet-action-page__record"
                @click="router.push('/wallet')"
            >
                记录
            </button>
        </section>

        <section class="wallet-action-page__hero wallet-action-page__hero--warm">
            <span>Available Balance</span>
            <strong>{{ balanceText }}</strong>
            <p>当前费率 1%，最低服务费 2 元。最低提现金额 10 元。</p>
        </section>

        <section class="wallet-action-page__card">
            <div class="wallet-action-page__section-title">
                <h2>选择提现方式</h2>
            </div>

            <NRadioGroup v-model:value="form.paymentMethod" name="withdraw-method">
                <div class="wallet-action-page__method-grid wallet-action-page__method-grid--two">
                    <label
                        v-for="item in withdrawMethods"
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
                        placeholder="请选择提现银行"
                        :options="bankSelectOptions"
                    />
                </NFormItem>

                <NFormItem
                    :label="form.paymentMethod === 'alipay' ? '支付宝手机号' : '银行卡号'"
                    path="account"
                >
                    <NInput
                        v-model:value="form.account"
                        :placeholder="
                            form.paymentMethod === 'alipay'
                                ? '请输入 11 位支付宝手机号'
                                : '请输入 16 位银行卡号'
                        "
                        :maxlength="form.paymentMethod === 'alipay' ? 11 : 16"
                    />
                </NFormItem>

                <NFormItem label="提现金额" path="amount">
                    <NInput
                        v-model:value="form.amount"
                        placeholder="请输入提现金额"
                        inputmode="decimal"
                    />
                </NFormItem>
            </NForm>

            <div class="wallet-action-page__summary">
                <div>
                    <span>服务费</span>
                    <strong>{{ feeText }}</strong>
                </div>
                <div>
                    <span>预计到账</span>
                    <strong>{{ actualAmountText }}</strong>
                </div>
                <div>
                    <span>到账说明</span>
                    <strong>{{ arrivalHint }}</strong>
                </div>
            </div>

            <p class="wallet-action-page__hint">服务费按 `Math.max(amount * 0.01, 2)` 计算。</p>

            <NButton
                type="primary"
                round
                block
                size="large"
                :loading="submitting"
                @click="handleConfirmWithdraw"
            >
                确认提现
            </NButton>
        </section>

        <NModal
            v-model:show="confirmModalVisible"
            preset="card"
            class="wallet-action-page__modal"
            :bordered="false"
        >
            <div class="wallet-action-page__modal-head">
                <h3>确认提现申请</h3>
                <p>请再次核对提现账号、金额和到账方式。</p>
            </div>

            <div class="wallet-action-page__confirm-panel">
                <div>
                    <span>提现方式</span>
                    <strong>{{ activeMethodLabel }}</strong>
                </div>
                <div>
                    <span>提现账号</span>
                    <strong>{{ accountPreview }}</strong>
                </div>
                <div>
                    <span>提现金额</span>
                    <strong>{{ amountText }}</strong>
                </div>
                <div>
                    <span>服务费</span>
                    <strong>{{ feeText }}</strong>
                </div>
                <div>
                    <span>预计到账</span>
                    <strong>{{ actualAmountText }}</strong>
                </div>
            </div>

            <div class="wallet-action-page__password-block">
                <span>支付密码</span>
                <PaymentPasswordInput v-model="paymentPassword" autofocus />
            </div>

            <div class="wallet-action-page__modal-actions">
                <NButton quaternary round @click="confirmModalVisible = false">取消</NButton>
                <NButton type="primary" round :loading="submitting" @click="submitWithdraw">
                    提交提现
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
import PaymentPasswordInput from '@/components/payment/PaymentPasswordInput.vue';
import { useAppStore, useUserStore } from '@/stores';
import {
    alipayPhonePattern,
    bankCardPattern,
    bankOptions,
    calculateWithdrawFee,
    findBankOption,
    formatCurrency,
    maskBankCard,
} from './walletShared';

const router = useRouter();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();
const formRef = ref<FormInst | null>(null);
const confirmModalVisible = ref(false);
const submitting = ref(false);
const paymentPassword = ref('');

const form = reactive({
    paymentMethod: 'alipay' as 'alipay' | 'bank_card',
    bank: null as string | null,
    account: '',
    amount: '',
});

const withdrawMethods = [
    { label: '支付宝', value: 'alipay' as const, description: '填写手机号，预计 10 分钟内到账' },
    { label: '银行卡', value: 'bank_card' as const, description: '到账时间取决于各银行处理速度' },
];

const bankSelectOptions = bankOptions.map(option => ({
    label: `${option.shortName} ${option.label}`,
    value: option.value,
}));

const numericAmount = computed(() => Number.parseFloat(form.amount || '0') || 0);
const availableBalance = computed(() => Number(userStore.user?.balance || 0));
const serviceFee = computed(() =>
    numericAmount.value > 0 ? calculateWithdrawFee(numericAmount.value) : 0
);
const actualAmount = computed(() => Math.max(numericAmount.value - serviceFee.value, 0));
const balanceText = computed(() => formatCurrency(availableBalance.value));
const amountText = computed(() => formatCurrency(numericAmount.value));
const feeText = computed(() => formatCurrency(serviceFee.value));
const actualAmountText = computed(() => formatCurrency(actualAmount.value));
const activeMethodLabel = computed(
    () => withdrawMethods.find(item => item.value === form.paymentMethod)?.label || '提现'
);
const arrivalHint = computed(() =>
    form.paymentMethod === 'alipay' ? '预计 10 分钟内到账' : '到账时间取决于各银行处理速度'
);
const accountPreview = computed(() => {
    if (form.paymentMethod === 'alipay') {
        return form.account || '未填写';
    }

    const bank = findBankOption(form.bank);
    if (!bank || !form.account) return '未填写';
    return `${bank.label} ${maskBankCard(form.account)}`;
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
                if (form.paymentMethod === 'alipay') {
                    return alipayPhonePattern.test(form.account);
                }

                return bankCardPattern.test(form.account);
            },
            message: '请填写正确的提现账号',
            trigger: ['input', 'blur'],
        },
    ],
    amount: [
        {
            validator: () => numericAmount.value >= 10,
            message: '最低提现金额为 10 元',
            trigger: ['input', 'blur'],
        },
        {
            validator: () => numericAmount.value <= availableBalance.value,
            message: '提现金额不能超过当前余额',
            trigger: ['input', 'blur'],
        },
        {
            validator: () => actualAmount.value > 0,
            message: '扣除服务费后到账金额需大于 0',
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

const handleConfirmWithdraw = async () => {
    try {
        await formRef.value?.validate();
        const overview = await WalletApi.getOverview();
        if (!overview.success || !overview.data?.wallet.payment_password_set) {
            message.warning('请先设置支付密码');
            router.push('/wallet/payment-settings');
            return;
        }
        paymentPassword.value = '';
        confirmModalVisible.value = true;
    } catch {
        message.error('请先完善提现信息');
    }
};

const submitWithdraw = async () => {
    if (submitting.value) return;
    if (!/^\d{6}$/.test(paymentPassword.value)) {
        message.error('请输入 6 位支付密码');
        return;
    }

    submitting.value = true;
    try {
        const response = await WalletApi.withdraw(
            form.paymentMethod === 'alipay'
                ? {
                      amount: numericAmount.value,
                      payment_method: 'alipay',
                      payment_password: paymentPassword.value,
                      phone: form.account,
                      third_party_no: form.account,
                  }
                : {
                      amount: numericAmount.value,
                      payment_method: 'bank_card',
                      payment_password: paymentPassword.value,
                      bank_prefix: findBankOption(form.bank)?.prefix,
                      account_no: form.account,
                  }
        );

        if (!response.success || !response.data) {
            throw new Error(response.message || '提现失败');
        }

        syncUserBalance(Number(response.data.balance || 0));
        await loadProfile();
        confirmModalVisible.value = false;
        paymentPassword.value = '';
        message.success(arrivalHint.value);
        router.replace('/wallet');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '提现失败');
    } finally {
        submitting.value = false;
    }
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
.wallet-action-page.is-dark .wallet-action-page__modal-head h3,
.wallet-action-page.is-dark .wallet-action-page__password-block span {
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

.wallet-action-page__hero--warm {
    background: linear-gradient(135deg, #ff9b3d, #f7c75f);
    color: #3d2a0f;
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
}

.wallet-action-page__card {
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

.wallet-action-page__method-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 16px;
}

.wallet-action-page__method-grid--two {
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

.wallet-action-page.is-dark .wallet-action-page__method-card p,
.wallet-action-page.is-dark .wallet-action-page__summary span,
.wallet-action-page.is-dark .wallet-action-page__confirm-panel span,
.wallet-action-page.is-dark .wallet-action-page__hint,
.wallet-action-page.is-dark .wallet-action-page__modal-head p {
    color: #94a3b8;
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
.wallet-action-page.is-dark .wallet-action-page__confirm-panel {
    background: rgba(15, 23, 42, 0.55);
}

.wallet-action-page__summary span,
.wallet-action-page__confirm-panel span {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #7a8598;
}

.wallet-action-page__summary strong,
.wallet-action-page__confirm-panel strong {
    font-size: 15px;
    color: #172033;
}

.wallet-action-page__password-block {
    display: grid;
    gap: 8px;
    margin-top: 16px;
}

.wallet-action-page__password-block span {
    font-size: 13px;
    font-weight: 600;
    color: #48627f;
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

.wallet-action-page__hint {
    margin: 0 0 16px;
    font-size: 12px;
    color: #7a8598;
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
</style>
