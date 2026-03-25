<template>
    <div class="wallet-center">
        <section class="wallet-center__hero">
            <span class="wallet-center__eyebrow">Campus Wallet</span>
            <h1 class="hero-title" @click="router.back()">
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
                        冻结金额：¥{{ Number(walletOverview?.summary.frozen_balance || 0).toFixed(2) }}
                    </p>
                    <p>{{ balanceNote }}</p>
                </div>
                <div class="wallet-center__container">
                    <div class="wallet-center__badge">
                        {{ walletStatusText }}
                    </div>

                    <div class="wallet-center__details">
                        <span class="income-text">
                            收入：{{ Number(walletOverview?.summary.month_income || 0).toFixed(0) }}
                        </span>
                        <span class="expense-text">
                            支出：{{
                                Number(walletOverview?.summary.month_expense || 0).toFixed(0)
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

        <!-- <section class="wallet-center__section">
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
            <div v-if="actionFeedback" class="wallet-center__action-feedback">
                {{ actionFeedback }}
            </div>
        </section> -->

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
                        :class="{ 'is-active': activeDirection === option.value }"
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
                            <p>{{ bill.description }}</p>
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
                暂无{{
                    activeDirection === 'all' ? '' : activeDirection === 'in' ? '收入' : '支出'
                }}流水
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
import { computed, h, markRaw, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NInput, useDialog, useMessage } from 'naive-ui';
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

const router = useRouter();
const userStore = useUserStore();
const dialog = useDialog();
const message = useMessage();
const walletOverview = ref<WalletOverview | null>(null);
const activities = ref<WalletActivity[]>([]);
const activitiesPagination = ref<PaginationMeta | null>(null);
const activeDirection = ref<'all' | 'in' | 'out'>('all');
const isLoadingOverview = ref(false);
const isLoadingActivities = ref(false);
const errorMessage = ref('');
const actionFeedback = ref('');
const walletActionAmount = ref('');

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
        title: '虚拟充值',
        description: '输入金额后直接增加钱包余额',
        action: 'recharge' as const,
        icon: markRaw(CashOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
    },
    {
        title: '虚拟提现',
        description: '输入金额后直接扣减钱包余额',
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
        description: '查看支付密码与后续资金能力入口',
        route: '/settings',
        action: 'route' as const,
        icon: markRaw(CardOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
    },
];

const filterOptions = [
    { label: '全部', value: 'all' as const },
    { label: '收入', value: 'in' as const },
    { label: '支出', value: 'out' as const },
];

const go = (route: string) => {
    router.push(route);
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
        const response = await WalletApi.getActivities({
            page: nextPage,
            limit: 12,
            direction: activeDirection.value,
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

const handleFilterChange = (direction: 'all' | 'in' | 'out') => {
    if (activeDirection.value === direction) {
        return;
    }

    activeDirection.value = direction;
    void loadActivities(false);
};

const loadMore = () => {
    if (isLoadingActivities.value || !canLoadMore.value) {
        return;
    }

    void loadActivities(true);
};

const handleVirtualBalance = async (mode: 'recharge' | 'withdraw') => {
    walletActionAmount.value = '';

    dialog.create({
        title: mode === 'recharge' ? '虚拟充值' : '虚拟提现',
        positiveText: '确认',
        negativeText: '取消',
        content: () =>
            h(NInput, {
                value: walletActionAmount.value,
                placeholder: mode === 'recharge' ? '请输入充值金额' : '请输入提现金额',
                onUpdateValue: value => {
                    walletActionAmount.value = value;
                },
            }),
        async onPositiveClick() {
            const amount = Number.parseFloat(walletActionAmount.value);

            if (!Number.isFinite(amount) || amount <= 0) {
                message.error('金额格式不正确');
                return false;
            }

            try {
                const response =
                    mode === 'recharge'
                        ? await WalletApi.recharge({ amount })
                        : await WalletApi.withdraw({ amount });

                if (!response.success || !response.data) {
                    throw new Error(
                        response.message || (mode === 'recharge' ? '充值失败' : '提现失败')
                    );
                }

                actionFeedback.value = `${mode === 'recharge' ? '充值' : '提现'}成功，当前余额 ¥${Number(response.data.balance).toFixed(2)}`;
                message.success(mode === 'recharge' ? '充值成功' : '提现成功');
                await loadOverview();
                await loadActivities(false);
                return true;
            } catch (error) {
                const nextMessage =
                    error instanceof Error
                        ? error.message
                        : mode === 'recharge'
                          ? '充值失败'
                          : '提现失败';
                actionFeedback.value = nextMessage;
                message.error(nextMessage);
                return false;
            }
        },
    });
};

const handleQuickAction = (action: (typeof quickActions)[number]) => {
    actionFeedback.value = '';

    if (action.action === 'route' && action.route) {
        go(action.route);
        return;
    }

    if (action.action === 'recharge') {
        void handleVirtualBalance('recharge');
        return;
    }

    if (action.action === 'withdraw') {
        void handleVirtualBalance('withdraw');
    }
};

onMounted(async () => {
    await loadOverview();
    await loadActivities(false);
});
</script>

<style scoped>
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
</style>
