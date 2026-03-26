<template>
    <div class="wallet-center">
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

            <div class="wallet-center__balance-card">
                <div>
                    <span>可用余额</span>
                    <strong>¥{{ balanceText }}</strong>
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
                </div>
            </div>
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

        <section class="wallet-center__section">
            <div class="wallet-center__section-head">
                <div class="wallet-center__filters">
                    <button
                        v-for="option in filterOptions"
                        :key="option.value"
                        type="button"
                        class="wallet-center__filter"
                        :class="{ 'is-active': activeFilter === option.value }"
                        @click="handleFilterChange(option.value)"
                    >
                        {{ option.label }}
                    </button>
                </div>
            </div>
            <div v-if="errorMessage" class="wallet-center__state">
                {{ errorMessage }}
            </div>
            <div v-else-if="!isReady" class="wallet-center__state">钱包数据加载中...</div>
            <div v-else-if="activities.length" class="wallet-center__bill-list">
                <article v-for="bill in activities" :key="bill.id" class="wallet-center__bill-card">
                    <div class="wallet-center__bill-main">
                        <div
                            class="wallet-center__bill-icon"
                            :style="{ background: getBillTint(bill) }"
                        >
                            <NIcon :size="18"><component :is="getBillIcon(bill)" /></NIcon>
                        </div>
                        <div class="wallet-center__bill-copy">
                            <strong>{{ bill.title }}</strong>
                            <p>{{ getBillDescription(bill) }}</p>
                            <span>{{ formatTime(bill.time) }}</span>
                        </div>
                    </div>
                    <div
                        class="wallet-center__bill-amount"
                        :class="{ 'is-income': bill.direction === 'in' }"
                    >
                        {{ bill.direction === 'in' ? '+' : '-' }}¥{{
                            Math.abs(bill.amount).toFixed(2)
                        }}
                    </div>
                </article>
            </div>
            <div v-else class="wallet-center__state">
                暂无{{ activeFilterLabel }}流水
            </div>
            <button
                v-if="canLoadMore"
                type="button"
                class="wallet-center__more"
                :disabled="isLoadingActivities"
                @click="loadMore"
            >
                {{ isLoadingActivities ? '加载中...' : '加载更多' }}
            </button>
        </section>

        <div class="wallet-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, useMessage } from 'naive-ui';
import {
    ArrowDownOutline,
    ArrowUpOutline,
    BagHandleOutline,
    CardOutline,
    CashOutline,
    DocumentTextOutline,
    ReceiptOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import { WalletApi } from '@/api';
import { useUserStore } from '@/stores';
import type { PaginationMeta, WalletActivity, WalletOverview } from '@/types';
import { formatThirdPartyAccount } from './walletShared';

const router = useRouter();
const message = useMessage();
const userStore = useUserStore();
const walletOverview = ref<WalletOverview | null>(null);
const activities = ref<WalletActivity[]>([]);
const activitiesPagination = ref<PaginationMeta | null>(null);
const activeFilter = ref<'all' | 'in' | 'out' | 'recharge' | 'withdraw'>('all');
const isLoadingOverview = ref(false);
const isLoadingActivities = ref(false);
const errorMessage = ref('');

const isReady = computed(() => Boolean(walletOverview.value) && !isLoadingOverview.value);
const balanceText = computed(() =>
    Number(walletOverview.value?.summary.available_balance ?? userStore.user?.balance ?? 0).toFixed(
        2
    )
);
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

const summaryCards = computed(() => [
    {
        label: '本月收入',
        value: `¥${Number(walletOverview.value?.summary.month_income || 0).toFixed(2)}`,
        note: '任务协作、配送服务和退款到账汇总',
        accent: true,
    },
    {
        label: '本月支出',
        value: `¥${Number(walletOverview.value?.summary.month_expense || 0).toFixed(2)}`,
        note: '订单消费和任务报酬支出汇总',
        accent: false,
    },
    {
        label: '待结算',
        value: `¥${Number(walletOverview.value?.summary.pending_settlement || 0).toFixed(2)}`,
        note: '配送中、进行中的任务待确认收入',
        accent: false,
    },
    {
        label: '信用积分',
        value: `${walletOverview.value?.summary.points || userStore.user?.points || 0}`,
        note: '账户活跃度与服务表现沉淀',
        accent: false,
    },
]);

const delivererCards = computed(() => {
    const deliverer = walletOverview.value?.deliverer;

    if (!deliverer?.enabled) {
        return [];
    }

    return [
        {
            label: '配送总收入',
            value: `¥${deliverer.total_income.toFixed(2)}`,
            note: `累计完成 ${deliverer.completed_orders} 单配送`,
        },
        {
            label: '今日配送收入',
            value: `¥${deliverer.today_income.toFixed(2)}`,
            note: deliverer.is_online ? '当前在线，可继续接单' : '当前离线，暂不可接单',
        },
        {
            label: '本月配送收入',
            value: `¥${deliverer.month_income.toFixed(2)}`,
            note: `配送员评分 ${deliverer.rating.toFixed(1) || '0.0'}`,
        },
        {
            label: '配送待结算',
            value: `¥${deliverer.pending_income.toFixed(2)}`,
            note: '已接单但尚未完成确认的收入',
        },
    ];
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

const filterOptions = [
    { label: '全部', value: 'all' as const },
    { label: '收入', value: 'in' as const },
    { label: '支出', value: 'out' as const },
    { label: '充值', value: 'recharge' as const },
    { label: '提现', value: 'withdraw' as const },
];

const activeFilterLabel = computed(() => {
    const matched = filterOptions.find(option => option.value === activeFilter.value);
    if (!matched || matched.value === 'all') {
        return '';
    }

    return matched.label;
});

const go = (route: string) => {
    router.push(route);
};

const handleBackToProfile = () => {
    router.push('/profile');
};

const syncUserBalance = (balance: number) => {
    if (userStore.user) {
        userStore.user.balance = balance;
        localStorage.setItem('user', JSON.stringify(userStore.user));
    }
};

const canLoadMore = computed(() => {
    if (!activitiesPagination.value) {
        return false;
    }

    return activitiesPagination.value.has_next;
});

const getBillIcon = (bill: WalletActivity) => {
    if (bill.direction === 'in') {
        if (bill.type === 'refund') {
            return WalletOutline;
        }

        return ArrowDownOutline;
    }

    if (bill.related_type === 'pickup_order') {
        return BagHandleOutline;
    }

    if (bill.related_type === 'task') {
        return DocumentTextOutline;
    }

    return ArrowUpOutline;
};

const getBillTint = (bill: WalletActivity) => {
    if (bill.direction === 'in') {
        return 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))';
    }

    if (bill.related_type === 'pickup_order') {
        return 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))';
    }

    return 'linear-gradient(135deg, rgba(255,155,61,0.16), rgba(247,199,95,0.18))';
};

const getBillDescription = (bill: WalletActivity) => {
    const accountText = formatThirdPartyAccount(bill.payment_method, bill.third_party_no);

    if (bill.type === 'withdraw') {
        const feeText =
            Number(bill.commission_amount || 0) > 0
                ? `手续费 ¥${Number(bill.commission_amount || 0).toFixed(2)}`
                : '';

        return [accountText, feeText].filter(Boolean).join(' · ') || bill.description;
    }

    if (accountText && bill.type === 'recharge') {
        return accountText;
    }

    return bill.description;
};

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

const loadOverview = async () => {
    isLoadingOverview.value = true;
    if (!walletOverview.value) {
        errorMessage.value = '';
    }

    try {
        const response = await WalletApi.getOverview();
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取钱包概览失败');
        }

        walletOverview.value = response.data;
        syncUserBalance(response.data.summary.available_balance);
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '获取钱包概览失败';
    } finally {
        isLoadingOverview.value = false;
    }
};

const loadActivities = async (append = false) => {
    isLoadingActivities.value = true;
    if (!append && !activities.value.length) {
        errorMessage.value = '';
    }

    try {
        const nextPage =
            append && activitiesPagination.value ? activitiesPagination.value.current_page + 1 : 1;
        const direction =
            activeFilter.value === 'in' || activeFilter.value === 'out' ? activeFilter.value : 'all';
        const type =
            activeFilter.value === 'recharge' || activeFilter.value === 'withdraw'
                ? activeFilter.value
                : undefined;
        const response = await WalletApi.getActivities({
            page: nextPage,
            limit: 12,
            direction,
            type,
        });

        if (!response.success || !response.data) {
            throw new Error(response.message || '获取钱包流水失败');
        }

        activities.value = append
            ? [...activities.value, ...response.data.items]
            : response.data.items;
        activitiesPagination.value = response.pagination || null;
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '获取钱包流水失败';
    } finally {
        isLoadingActivities.value = false;
    }
};

const handleFilterChange = (filter: 'all' | 'in' | 'out' | 'recharge' | 'withdraw') => {
    if (activeFilter.value === filter) {
        return;
    }

    activeFilter.value = filter;
    void loadActivities(false);
};

const loadMore = () => {
    if (isLoadingActivities.value || !canLoadMore.value) {
        return;
    }

    void loadActivities(true);
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
    await loadActivities(false);
});
</script>

<style scoped>
.wallet-center {
    min-height: 100vh;
    padding: 16px 16px 36px;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
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

.wallet-center__balance-card {
    display: flex;
    justify-content: space-between;
    gap: 16px;
    padding: 20px 18px;
    border-radius: 22px;
    background: linear-gradient(135deg, #2f6bff, #4bb8ff);
    color: #fff;
    box-shadow: 0 18px 40px rgba(47, 107, 255, 0.2);
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

.wallet-center__section {
    margin-bottom: 14px;
    padding: 16px;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 10px 28px rgba(20, 46, 88, 0.06);
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

.wallet-center__action-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 42px;
    height: 42px;
    border-radius: 14px;
    margin-bottom: 14px;
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

.wallet-center__filters {
    display: inline-flex;
    gap: 8px;
    padding: 4px;
    border-radius: 999px;
    background: #f4f7fb;
}

.wallet-center__filter {
    min-height: 38px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #6c7890;
    font-size: 13px;
    font-weight: 600;
}

.wallet-center__filter.is-active {
    background: #2f6bff;
    color: #fff;
}

.wallet-center__state {
    padding: 20px 12px;
    border-radius: 14px;
    background: #f6f8fc;
    text-align: center;
    font-size: 13px;
    color: #6c7890;
}

.wallet-center__bill-list {
    display: grid;
    gap: 12px;
}

.wallet-center__bill-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border-radius: 16px;
    background: #f8fbff;
    border: 1px solid #e7eef9;
}

.wallet-center__bill-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
}

.wallet-center__bill-icon {
    display: inline-flex;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.wallet-center__bill-copy {
    min-width: 0;
}

.wallet-center__bill-copy strong {
    display: block;
    font-size: 15px;
    color: #172033;
}

.wallet-center__bill-copy p {
    margin: 6px 0 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #5b667a;
}

.wallet-center__bill-copy span {
    font-size: 12px;
    color: #8c96a8;
}

.wallet-center__bill-amount {
    flex-shrink: 0;
    font-size: 16px;
    font-weight: 700;
    color: #ff9b3d;
}

.wallet-center__bill-amount.is-income {
    color: #19b36b;
}

.wallet-center__more {
    width: 100%;
    min-height: 44px;
    margin-top: 14px;
    border: none;
    border-radius: 14px;
    background: #eef4ff;
    color: #2f6bff;
    font-weight: 600;
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
