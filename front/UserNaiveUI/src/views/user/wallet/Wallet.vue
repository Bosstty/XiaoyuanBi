<template>
    <div class="wallet-center" :class="{ 'is-dark': appStore.isDark }">
        <section class="wallet-center__hero">
            <span class="wallet-center__eyebrow">Campus Wallet</span>
            <h1 class="hero-title" @click="handleBackToProfile">
                <svg class="back-arrow" viewBox="0 0 24 24">
                    <path
                        d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
                        fill="currentColor"
                    />
                </svg>
                钱包
            </h1>
            <p>统一查看订单消费、任务收入、配送收益和退款流水。</p>

            <button
                type="button"
                class="wallet-center__balance-card"
                @click="handleOpenTransactions"
            >
                <div>
                    <span>净余额</span>
                    <strong>¥{{ balanceText }}</strong>
                    <p
                        v-if="Number(walletOverview?.summary.debt_amount || 0) > 0"
                        class="wallet-center__debt-text"
                    >
                        平台欠款：-¥{{
                            Number(walletOverview?.summary.debt_amount || 0).toFixed(2)
                        }}
                    </p>
                    <p class="wallet-center__frozen-text">
                        钱包原始可用：¥{{
                            Number(walletOverview?.summary.available_balance || 0).toFixed(2)
                        }}
                    </p>
                    <p class="wallet-center__frozen-text">
                        冻结金额：¥{{
                            Number(walletOverview?.summary.frozen_balance || 0).toFixed(2)
                        }}
                    </p>
                    <p>{{ balanceNote }}</p>
                </div>
                <div class="wallet-center__container">
                    <div class="wallet-center__badge">
                        {{ walletStatusText }}
                    </div>

                    <div class="wallet-center__details">
                        <span class="income-text">
                            收入：{{ Number(walletOverview?.summary.month_income || 0).toFixed(2) }}
                        </span>
                        <span class="expense-text">
                            支出：{{
                                Number(walletOverview?.summary.month_expense || 0).toFixed(2)
                            }}
                        </span>
                    </div>
                    <span class="wallet-center__detail-entry">查看收支明细 ></span>
                </div>
            </button>
        </section>

        <!-- <section class="wallet-center__section">
            <div class="wallet-center__grid">
                <article
                    v-for="item in summaryCards"
                    :key="item.label"
                    class="wallet-center__summary-card"
                    :class="{ 'is-accent': item.accent }"
                >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <p>{{ item.note }}</p>
                </article>
            </div>
        </section> -->

        <section class="wallet-center__section">
            <div class="wallet-center__section-head">
                <h3>资金入口</h3>
            </div>
            <div class="wallet-center__action-grid">
                <button
                    v-for="action in quickActions"
                    :key="action.title"
                    type="button"
                    class="wallet-center__action"
                    @click="handleQuickAction(action)"
                >
                    <div class="wallet-center__action-icon" :style="{ background: action.tint }">
                        <NIcon :size="20"><component :is="action.icon" /></NIcon>
                    </div>
                    <strong>{{ action.title }}</strong>
                    <p>{{ action.description }}</p>
                </button>
            </div>
        </section>

        <!-- <section v-if="walletOverview?.deliverer.enabled" class="wallet-center__section">
            <div class="wallet-center__section-head">
                <h3>配送收益</h3>
            </div>
            <div class="wallet-center__grid">
                <article
                    v-for="item in delivererCards"
                    :key="item.label"
                    class="wallet-center__summary-card"
                >
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <p>{{ item.note }}</p>
                </article>
            </div>
        </section> -->

        <div class="wallet-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, useMessage } from 'naive-ui';
import {
    BagHandleOutline,
    CardOutline,
    CashOutline,
    DocumentTextOutline,
    ReceiptOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import { WalletApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { WalletOverview } from '@/types';

const router = useRouter();
const message = useMessage();
const appStore = useAppStore();
const userStore = useUserStore();
const walletOverview = ref<WalletOverview | null>(null);
const isLoadingOverview = ref(false);
const balanceText = computed(() =>
    Number(walletOverview.value?.summary.display_balance ?? userStore.user?.balance ?? 0).toFixed(
        2
    )
);
const formatTime = (value?: string) => {
    if (!value) {
        return '暂无时间';
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return new Intl.DateTimeFormat('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
};
const balanceNote = computed(() =>
    walletOverview.value?.summary.last_transaction_at
        ? `最近一笔资金变动：${formatTime(walletOverview.value.summary.last_transaction_at)}`
        : '支持订单支出、任务协作与配送收益结算'
);
const walletStatusText = computed(() => {
    const status = walletOverview.value?.wallet.status;

    if (status === 'frozen') {
        return '钱包已冻结';
    }

    if (status === 'suspended') {
        return '钱包已停用';
    }

    return userStore.isAuthenticated ? '账户已同步' : '登录后同步';
});

const quickActions = [
    {
        title: '充值',
        description: '进入充值页面，选择支付宝、微信或银行卡',
        action: 'recharge' as const,
        icon: markRaw(CashOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
    },
    {
        title: '提现',
        description: '进入提现页面，填写账号并核对服务费',
        action: 'withdraw' as const,
        icon: markRaw(WalletOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
    },
    {
        title: '订单账单',
        description: '查看代取、代购消费与退款记录',
        route: '/pickup/my',
        action: 'route' as const,
        icon: markRaw(ReceiptOutline),
        tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))',
    },
    {
        title: '任务收益',
        description: '查看任务收益和发布任务支出',
        route: '/tasks/my',
        action: 'route' as const,
        icon: markRaw(DocumentTextOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
    },
    {
        title: '配送记录',
        description: '已合并配送端后，从这里查看配送收益',
        route: '/pickup/my?type=accepted',
        action: 'route' as const,
        icon: markRaw(BagHandleOutline),
        tint: 'linear-gradient(135deg, rgba(12,116,176,0.14), rgba(75,184,255,0.18))',
    },
    {
        title: '支付设置',
        description: '设置或修改支付密码，需先验证账户密码',
        route: '/wallet/payment-settings',
        action: 'route' as const,
        icon: markRaw(CardOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
    },
];

const go = (route: string) => {
    router.push(route);
};

const handleBackToProfile = () => {
    router.push('/profile');
};

const handleOpenTransactions = () => {
    router.push('/wallet/transactions');
};

const syncUserBalance = (balance: number) => {
    if (userStore.user) {
        userStore.user.balance = balance;
        localStorage.setItem('user', JSON.stringify(userStore.user));
    }
};

const loadOverview = async () => {
    isLoadingOverview.value = true;

    try {
        const response = await WalletApi.getOverview();
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取钱包概览失败');
        }

        walletOverview.value = response.data;
        syncUserBalance(response.data.summary.available_balance);
    } catch (error) {
        message.error(error instanceof Error ? error.message : '获取钱包概览失败');
    } finally {
        isLoadingOverview.value = false;
    }
};

const handleQuickAction = (action: (typeof quickActions)[number]) => {
    if (action.title === '配送记录' && !walletOverview.value?.deliverer.enabled) {
        message.warning('请申请成为配送员后即可查看配送收入');
        return;
    }

    if (action.action === 'route' && action.route) {
        go(action.route);
        return;
    }

    if (action.action === 'recharge') {
        go('/wallet/recharge');
        return;
    }

    if (action.action === 'withdraw') {
        go('/wallet/withdraw');
    }
};

onMounted(async () => {
    await loadOverview();
});
</script>

<style scoped>
.wallet-center {
    min-height: 100vh;
    padding: 16px 16px 36px;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
}

.wallet-center.is-dark {
    background: linear-gradient(180deg, #0f172a 0%, #111827 100%);
    color: #e2e8f0;
}

.wallet-center__hero {
    margin-bottom: 14px;
}

.hero-title {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 28px;
    font-weight: 700;
    color: #1e293b;
    cursor: pointer;
    margin-left: -8px;
}

.back-arrow {
    width: 20px;
    height: 20px;
    color: #64748b;
    transition: transform 0.2s;
}

.hero-title:active .back-arrow {
    transform: translateX(-3px);
}

.wallet-center__eyebrow {
    display: block;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #94a3b8;
    margin-bottom: 4px;
}

.wallet-center__hero > p {
    margin: 8px 0 16px;
    font-size: 14px;
    line-height: 1.6;
    color: #5b667a;
}

.wallet-center.is-dark .hero-title {
    color: #f8fafc;
}

.wallet-center.is-dark .back-arrow,
.wallet-center.is-dark .wallet-center__eyebrow,
.wallet-center.is-dark .wallet-center__hero > p {
    color: #94a3b8;
}

.wallet-center__balance-card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    width: 100%;
    padding: 20px 18px;
    border: none;
    border-radius: 22px;
    background: linear-gradient(135deg, #2f6bff, #4bb8ff);
    color: #fff;
    box-shadow: 0 18px 40px rgba(47, 107, 255, 0.2);
    text-align: left;
    cursor: pointer;
}

.wallet-center__balance-card span {
    display: block;
    font-size: 13px;
    opacity: 0.86;
}

.wallet-center__balance-card strong {
    display: block;
    margin-top: 8px;
    font-size: 32px;
    line-height: 1.1;
}

.wallet-center__balance-card p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
    opacity: 0.9;
}

.wallet-center__debt-text {
    color: rgba(255, 235, 235, 0.98);
    font-weight: 600;
}

.wallet-center__container {
    display: flex;
    min-width: 108px;
    flex-direction: column;
    align-items: flex-end;
    justify-content: space-between;
}

.wallet-center__badge {
    padding: 6px 10px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.18);
    font-size: 12px;
    font-weight: 600;
}

.wallet-center__details {
    display: grid;
    gap: 8px;
    text-align: right;
    font-size: 12px;
}

.wallet-center__detail-entry {
    margin-top: 10px;
    font-size: 12px;
    font-weight: 600;
    opacity: 0.95;
}

.wallet-center__section {
    margin-bottom: 14px;
    padding: 16px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 28px rgba(20, 46, 88, 0.06);
}

.wallet-center.is-dark .wallet-center__section {
    background: rgba(30, 41, 59, 0.96);
    box-shadow: none;
}

.wallet-center__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
}

.wallet-center__section-head h3 {
    margin: 0;
    font-size: 16px;
    color: #172033;
}

.wallet-center.is-dark .wallet-center__section-head h3,
.wallet-center.is-dark .wallet-center__action strong {
    color: #f8fafc;
}

.wallet-center__action-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.wallet-center__action {
    min-height: 122px;
    padding: 14px;
    border: 1px solid #e2eaf7;
    border-radius: 16px;
    background: #f9fbff;
    text-align: left;
}

.wallet-center.is-dark .wallet-center__action {
    border-color: rgba(71, 85, 105, 0.72);
    background: rgba(15, 23, 42, 0.55);
}

.wallet-center__action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    margin-bottom: 14px;
    color: #1e3a8a;
}

.wallet-center.is-dark .wallet-center__action-icon {
    color: #dbeafe;
}

.wallet-center__action strong {
    display: block;
    font-size: 15px;
    color: #172033;
}

.wallet-center__action p {
    margin: 8px 0 0;
    font-size: 12px;
    line-height: 1.6;
    color: #6c7890;
}

.wallet-center.is-dark .wallet-center__action p {
    color: #94a3b8;
}

.wallet-center__safe-space {
    height: 24px;
}

@media (max-width: 420px) {
    .wallet-center__balance-card {
        flex-direction: column;
    }

    .wallet-center__container {
        min-width: 0;
        align-items: flex-start;
    }

    .wallet-center__details {
        text-align: left;
    }

    .wallet-center__action-grid {
        grid-template-columns: 1fr;
    }
}
</style>
