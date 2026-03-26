<template>
    <div class="payment-settings-page">
        <section class="payment-settings-page__topbar">
            <button
                type="button"
                class="payment-settings-page__back"
                @click="router.push('/wallet')"
            >
                <NIcon :size="18"><ChevronBackOutline /></NIcon>
            </button>
            <h1>支付设置</h1>
            <div class="payment-settings-page__spacer"></div>
        </section>

        <section class="payment-settings-page__hero">
            <span>Security Center</span>
            <strong>{{ pageTitle }}</strong>
            <p>{{ pageDescription }}</p>
        </section>

        <section class="payment-settings-page__card">
            <div class="payment-settings-page__status">
                <span>当前状态</span>
                <strong :class="{ 'is-active': paymentPasswordSet }">
                    {{ paymentPasswordSet ? '已设置支付密码' : '未设置支付密码' }}
                </strong>
            </div>

            <NForm ref="formRef" :model="form" :rules="rules" label-placement="top">
                <NFormItem label="账户密码" path="accountPassword">
                    <NInput
                        v-model:value="form.accountPassword"
                        type="password"
                        show-password-on="click"
                        placeholder="请输入当前账户登录密码"
                    />
                </NFormItem>

                <NFormItem
                    :label="paymentPasswordSet ? '新支付密码' : '支付密码'"
                    path="paymentPassword"
                >
                    <NInput
                        v-model:value="form.paymentPassword"
                        type="password"
                        show-password-on="click"
                        maxlength="6"
                        placeholder="请输入 6 位数字支付密码"
                    />
                </NFormItem>

                <NFormItem label="确认支付密码" path="confirmPaymentPassword">
                    <NInput
                        v-model:value="form.confirmPaymentPassword"
                        type="password"
                        show-password-on="click"
                        maxlength="6"
                        placeholder="请再次输入 6 位数字支付密码"
                    />
                </NFormItem>
            </NForm>

            <div class="payment-settings-page__tips">
                <p>设置或修改支付密码前，必须先完成账户密码验证。</p>
                <p>支付密码用于余额支付、订单冻结和任务确认支付。</p>
            </div>

            <NButton
                type="primary"
                round
                block
                size="large"
                :loading="submitting"
                @click="handleSubmit"
            >
                {{ paymentPasswordSet ? '修改支付密码' : '设置支付密码' }}
            </NButton>
        </section>
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
    useMessage,
    type FormInst,
    type FormRules,
} from 'naive-ui';
import { ChevronBackOutline } from '@vicons/ionicons5';
import { WalletApi } from '@/api';

const router = useRouter();
const message = useMessage();
const formRef = ref<FormInst | null>(null);
const submitting = ref(false);
const paymentPasswordSet = ref(false);

const form = reactive({
    accountPassword: '',
    paymentPassword: '',
    confirmPaymentPassword: '',
});

const pageTitle = computed(() => (paymentPasswordSet.value ? '修改支付密码' : '设置支付密码'));
const pageDescription = computed(() =>
    paymentPasswordSet.value
        ? '已存在支付密码，修改前仍需验证账户登录密码。'
        : '首次设置支付密码前，需要先验证账户登录密码。'
);

const rules: FormRules = {
    accountPassword: [
        {
            required: true,
            message: '请输入账户密码',
            trigger: ['input', 'blur'],
        },
    ],
    paymentPassword: [
        {
            validator: () => /^\d{6}$/.test(form.paymentPassword),
            message: '支付密码必须为 6 位数字',
            trigger: ['input', 'blur'],
        },
    ],
    confirmPaymentPassword: [
        {
            validator: () => form.confirmPaymentPassword === form.paymentPassword,
            message: '两次输入的支付密码不一致',
            trigger: ['input', 'blur'],
        },
    ],
};

const loadOverview = async () => {
    const response = await WalletApi.getOverview();
    if (!response.success || !response.data) {
        throw new Error(response.message || '获取钱包信息失败');
    }

    paymentPasswordSet.value = Boolean(response.data.wallet.payment_password_set);
};

const handleSubmit = async () => {
    try {
        await formRef.value?.validate();
    } catch {
        message.error('请完善支付设置信息');
        return;
    }

    submitting.value = true;
    try {
        const response = await WalletApi.setPaymentPassword({
            payment_password: form.paymentPassword,
            account_password: form.accountPassword,
        });

        if (!response.success) {
            throw new Error(response.message || '支付密码设置失败');
        }

        message.success(paymentPasswordSet.value ? '支付密码修改成功' : '支付密码设置成功');
        paymentPasswordSet.value = true;
        form.accountPassword = '';
        form.paymentPassword = '';
        form.confirmPaymentPassword = '';
        router.push('/wallet');
    } catch (error) {
        message.error(error instanceof Error ? error.message : '支付密码设置失败');
    } finally {
        submitting.value = false;
    }
};

onMounted(async () => {
    try {
        await loadOverview();
    } catch (error) {
        message.error(error instanceof Error ? error.message : '获取钱包信息失败');
    }
});
</script>

<style scoped>
.payment-settings-page {
    min-height: 100vh;
    padding: 14px 14px 40px;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
}

.payment-settings-page__topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.payment-settings-page__topbar h1 {
    margin: 0;
    font-size: 17px;
    font-weight: 700;
    color: #172033;
}

.payment-settings-page__back,
.payment-settings-page__spacer {
    min-width: 44px;
    min-height: 44px;
}

.payment-settings-page__back {
    border: none;
    border-radius: 14px;
    color: #35506f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.payment-settings-page__hero {
    padding: 20px 18px;
    border-radius: 20px;
    background: linear-gradient(135deg, #17304f, #2f6bff);
    color: #fff;
    margin-bottom: 12px;
}

.payment-settings-page__hero span {
    display: block;
    font-size: 12px;
    opacity: 0.82;
}

.payment-settings-page__hero strong {
    display: block;
    margin-top: 8px;
    font-size: 28px;
    font-weight: 700;
}

.payment-settings-page__hero p {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.6;
    opacity: 0.92;
}

.payment-settings-page__card {
    padding: 16px;
    border-radius: 16px;
    background: #fff;
    box-shadow: 0 8px 24px rgba(20, 46, 88, 0.06);
}

.payment-settings-page__status {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding: 14px;
    border-radius: 14px;
    background: #f6f8fc;
}

.payment-settings-page__status span {
    font-size: 13px;
    color: #6c7890;
}

.payment-settings-page__status strong {
    font-size: 14px;
    color: #ff9b3d;
}

.payment-settings-page__status strong.is-active {
    color: #19b36b;
}

.payment-settings-page__tips {
    margin: 4px 0 16px;
    padding: 14px;
    border-radius: 14px;
    background: #f8fbff;
}

.payment-settings-page__tips p {
    margin: 0;
    font-size: 12px;
    line-height: 1.7;
    color: #5b667a;
}

.payment-settings-page__tips p + p {
    margin-top: 6px;
}
</style>
