<template>
    <div class="wallet-center">
        <section class="wallet-center__hero">
            <span class="wallet-center__eyebrow">Campus Wallet</span>
            <h1>钱包</h1>
            <p>统一管理订单支付、任务收入、代取员收益和后续退款结算。</p>

            <div class="wallet-center__balance-card">
                <div>
                    <span>可用余额</span>
                    <strong>¥{{ balanceText }}</strong>
                    <p>支持订单支出、任务协作与后续接单结算</p>
                </div>
                <div class="wallet-center__badge">{{ userStore.isAuthenticated ? '账户已同步' : '登录后同步' }}</div>
            </div>
        </section>

        <section class="wallet-center__section">
            <div class="wallet-center__grid">
                <article v-for="item in summaryCards" :key="item.label" class="wallet-center__summary-card">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.value }}</strong>
                    <p>{{ item.note }}</p>
                </article>
            </div>
        </section>

        <section class="wallet-center__section">
            <div class="wallet-center__section-head">
                <h3>资金入口</h3>
            </div>
            <div class="wallet-center__action-grid">
                <button
                    v-for="action in quickActions"
                    :key="action.title"
                    type="button"
                    class="wallet-center__action touch-feedback"
                    @click="go(action.route)"
                >
                    <div class="wallet-center__action-icon" :style="{ background: action.tint }">
                        <NIcon :size="20"><component :is="action.icon" /></NIcon>
                    </div>
                    <strong>{{ action.title }}</strong>
                    <p>{{ action.description }}</p>
                </button>
            </div>
        </section>

        <section class="wallet-center__section">
            <div class="wallet-center__section-head">
                <h3>账单明细</h3>
            </div>
            <div class="wallet-center__bill-list">
                <article v-for="bill in bills" :key="bill.title" class="wallet-center__bill-card">
                    <div class="wallet-center__bill-main">
                        <div class="wallet-center__bill-icon" :style="{ background: bill.tint }">
                            <NIcon :size="18"><component :is="bill.icon" /></NIcon>
                        </div>
                        <div class="wallet-center__bill-copy">
                            <strong>{{ bill.title }}</strong>
                            <p>{{ bill.description }}</p>
                            <span>{{ bill.time }}</span>
                        </div>
                    </div>
                    <div class="wallet-center__bill-amount" :class="{ 'is-income': bill.amount > 0 }">
                        {{ bill.amount > 0 ? '+' : '' }}¥{{ Math.abs(bill.amount).toFixed(2) }}
                    </div>
                </article>
            </div>
        </section>

        <section class="wallet-center__section">
            <div class="wallet-center__notice">
                <strong>后续将接入</strong>
                <p>充值、提现、代取员分账、退款流水、发票与申诉等完整资金能力。</p>
            </div>
        </section>

        <div class="wallet-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon } from 'naive-ui';
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
import { useUserStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();

const balanceText = computed(() => Number(userStore.user?.balance || 0).toFixed(2));

const summaryCards = computed(() => [
    {
        label: '本月支出',
        value: `¥${Math.max(36, Math.round((userStore.user?.completed_orders || 0) * 3.2))}`,
        note: '订单支付、加急费和生活服务支出',
    },
    {
        label: '本月收入',
        value: `¥${Math.max(28, Math.round((userStore.user?.completed_tasks || 0) * 18))}`,
        note: '任务协作收益与后续代取员结算入口',
    },
    {
        label: '待结算',
        value: `¥${Math.max(12, Math.round((userStore.user?.rating || 4) * 6))}`,
        note: '待确认完成或待进入钱包的服务金额',
    },
    {
        label: '信用积分',
        value: `${userStore.user?.points || 0}`,
        note: '活跃度与账户表现的综合沉淀',
    },
]);

const quickActions = [
    {
        title: '订单账单',
        description: '查看代取、代购支付与退款进度',
        route: '/pickup/my',
        icon: markRaw(ReceiptOutline),
        tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))',
    },
    {
        title: '任务收益',
        description: '查看协作任务完成后的收益记录',
        route: '/tasks/my',
        icon: markRaw(DocumentTextOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
    },
    {
        title: '支付设置',
        description: '后续接入充值、提现和支付方式',
        route: '/settings',
        icon: markRaw(CardOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
    },
];

const bills = [
    {
        title: '完成网页制作任务',
        description: '任务协作收入已进入钱包',
        time: '今天 14:20',
        amount: 88,
        icon: markRaw(ArrowDownOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
    },
    {
        title: '快递代取订单支付',
        description: '菜鸟驿站代取服务已扣款',
        time: '昨天 18:40',
        amount: -6,
        icon: markRaw(BagHandleOutline),
        tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))',
    },
    {
        title: '任务保证金退回',
        description: '任务取消后原路退回钱包',
        time: '03-21 09:15',
        amount: 20,
        icon: markRaw(WalletOutline),
        tint: 'linear-gradient(135deg, rgba(12,116,176,0.14), rgba(75,184,255,0.18))',
    },
    {
        title: '食堂代购订单支出',
        description: '订单已送达并完成结算',
        time: '03-20 12:08',
        amount: -15.5,
        icon: markRaw(ArrowUpOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.16), rgba(247,199,95,0.18))',
    },
];

const go = (route: string) => {
    router.push(route);
};
</script>
