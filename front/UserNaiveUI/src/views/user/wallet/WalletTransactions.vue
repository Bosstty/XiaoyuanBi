<template>
    <div class="wallet-transactions-page">
        <section class="wallet-transactions-page__topbar">
            <button type="button" class="wallet-transactions-page__back" @click="router.back()">
                <NIcon :size="18"><ChevronBackOutline /></NIcon>
            </button>
            <div class="wallet-transactions-page__filters">
                <button
                    v-for="option in filterOptions"
                    :key="option.value"
                    type="button"
                    class="wallet-transactions-page__filter"
                    :class="{ 'is-active': activeFilter === option.value }"
                    @click="handleFilterChange(option.value)"
                >
                    {{ option.label }}
                </button>
            </div>
        </section>

        <Transition :name="filterTransitionName" mode="out-in">
            <div :key="activeFilter" class="wallet-transactions-page__panel">
                <div v-if="errorMessage" class="wallet-transactions-page__state">
                    {{ errorMessage }}
                </div>
                <div v-else-if="!isReady" class="wallet-transactions-page__state">
                    钱包数据加载中...
                </div>
                <div v-else-if="activities.length" class="wallet-transactions-page__bill-list">
                    <article
                        v-for="bill in activities"
                        :key="bill.id"
                        class="wallet-transactions-page__bill-card"
                    >
                        <div class="wallet-transactions-page__bill-main">
                            <div
                                class="wallet-transactions-page__bill-icon"
                                :style="{ background: getBillTint(bill) }"
                            >
                                <NIcon :size="18"><component :is="getBillIcon(bill)" /></NIcon>
                            </div>
                            <div class="wallet-transactions-page__bill-copy">
                                <strong>{{ bill.title }}</strong>
                                <p>{{ getBillDescription(bill) }}</p>
                                <div
                                    v-if="getBillMetaText(bill)"
                                    class="wallet-transactions-page__bill-meta"
                                >
                                    {{ getBillMetaText(bill) }}
                                </div>
                                <span>{{ formatTime(bill.time) }}</span>
                            </div>
                        </div>
                        <div
                            class="wallet-transactions-page__bill-amount"
                            :class="{ 'is-income': bill.direction === 'in' }"
                        >
                            {{ bill.direction === 'in' ? '+' : '-' }}¥{{
                                Math.abs(bill.amount).toFixed(2)
                            }}
                        </div>
                    </article>
                </div>
                <div v-else class="wallet-transactions-page__state">
                    暂无{{ activeFilterLabel }}流水
                </div>
            </div>
        </Transition>

        <button
            v-if="canLoadMore"
            type="button"
            class="wallet-transactions-page__more"
            :disabled="isLoadingActivities"
            @click="loadMore"
        >
            {{ isLoadingActivities ? '加载中...' : '加载更多' }}
        </button>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon } from 'naive-ui';
import {
    ArrowDownOutline,
    ArrowUpOutline,
    BagHandleOutline,
    ChevronBackOutline,
    DocumentTextOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import { WalletApi } from '@/api';
import type { PaginationMeta, WalletActivity } from '@/types';
import { formatThirdPartyAccount } from './walletShared';

const router = useRouter();
const activities = ref<WalletActivity[]>([]);
const activitiesPagination = ref<PaginationMeta | null>(null);
const activeFilter = ref<'all' | 'in' | 'out' | 'recharge' | 'withdraw'>('all');
const filterTransitionName = ref('wallet-filter-next');
const isLoadingActivities = ref(false);
const errorMessage = ref('');
const hasLoaded = ref(false);

const filterOptions = [
    { label: '全部', value: 'all' as const },
    { label: '收入', value: 'in' as const },
    { label: '支出', value: 'out' as const },
    { label: '充值', value: 'recharge' as const },
    { label: '提现', value: 'withdraw' as const },
];

const isReady = computed(() => hasLoaded.value && !isLoadingActivities.value);
const canLoadMore = computed(() => Boolean(activitiesPagination.value?.has_next));
const activeFilterLabel = computed(() => {
    const matched = filterOptions.find(option => option.value === activeFilter.value);
    if (!matched || matched.value === 'all') {
        return '';
    }

    return matched.label;
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
        return accountText || bill.description;
    }

    if (accountText && bill.type === 'recharge') {
        return accountText;
    }

    return bill.description;
};

const getBillMetaText = (bill: WalletActivity) => {
    const commissionAmount = Number(bill.commission_amount || 0);
    if (commissionAmount <= 0) {
        return '';
    }

    if (bill.type === 'withdraw') {
        return `提现手续费 ¥${commissionAmount.toFixed(2)}`;
    }

    if (bill.type === 'earn_pickup' || bill.type === 'earn_task') {
        return `平台抽成 ¥${commissionAmount.toFixed(2)}`;
    }

    return '';
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

const loadActivities = async (append = false) => {
    isLoadingActivities.value = true;
    if (!append && !activities.value.length) {
        errorMessage.value = '';
    }

    try {
        const nextPage =
            append && activitiesPagination.value ? activitiesPagination.value.current_page + 1 : 1;
        const direction =
            activeFilter.value === 'in' || activeFilter.value === 'out'
                ? activeFilter.value
                : 'all';
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
        hasLoaded.value = true;
    } catch (error) {
        errorMessage.value = error instanceof Error ? error.message : '获取钱包流水失败';
        hasLoaded.value = true;
    } finally {
        isLoadingActivities.value = false;
    }
};

const handleFilterChange = (filter: 'all' | 'in' | 'out' | 'recharge' | 'withdraw') => {
    if (activeFilter.value === filter) {
        return;
    }

    const currentIndex = filterOptions.findIndex(option => option.value === activeFilter.value);
    const nextIndex = filterOptions.findIndex(option => option.value === filter);
    filterTransitionName.value =
        nextIndex > currentIndex ? 'wallet-filter-next' : 'wallet-filter-prev';
    activeFilter.value = filter;
};

const loadMore = () => {
    if (isLoadingActivities.value || !canLoadMore.value) {
        return;
    }

    void loadActivities(true);
};

watch(
    activeFilter,
    () => {
        void loadActivities(false);
    },
    { immediate: true }
);
</script>

<style scoped>
.wallet-transactions-page {
    min-height: 100vh;
    padding: 14px 14px 40px;
    background: linear-gradient(180deg, #f4f7fb 0%, #eef3fb 100%);
}

.wallet-transactions-page__topbar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;
}

.wallet-transactions-page__back {
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border: none;
    border-radius: 12px;
    color: #35506f;
    display: inline-flex;
    align-items: center;
    justify-content: center;
}

.wallet-transactions-page__filters {
    display: inline-flex;
    gap: 8px;
    padding: 4px;
    border-radius: 999px;
    background: #fff;
    box-shadow: 0 10px 24px rgba(20, 46, 88, 0.06);
    overflow-x: auto;
}

.wallet-transactions-page__filter {
    min-height: 38px;
    padding: 0 16px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: #6c7890;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;
}

.wallet-transactions-page__filter.is-active {
    background: #2f6bff;
    color: #fff;
}

.wallet-transactions-page__panel {
    position: relative;
}

.wallet-transactions-page__state {
    padding: 20px 12px;
    border-radius: 14px;
    background: #f6f8fc;
    text-align: center;
    font-size: 13px;
    color: #6c7890;
}

.wallet-transactions-page__bill-list {
    display: grid;
    gap: 12px;
}

.wallet-transactions-page__bill-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px;
    border-radius: 16px;
    background: #f8fbff;
    border: 1px solid #e7eef9;
    box-shadow: 0 10px 28px rgba(20, 46, 88, 0.06);
}

.wallet-transactions-page__bill-main {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1;
}

.wallet-transactions-page__bill-icon {
    display: inline-flex;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.wallet-transactions-page__bill-copy {
    min-width: 0;
}

.wallet-transactions-page__bill-copy strong {
    display: block;
    font-size: 15px;
    color: #172033;
}

.wallet-transactions-page__bill-copy p {
    margin: 6px 0 4px;
    font-size: 12px;
    line-height: 1.5;
    color: #5b667a;
}

.wallet-transactions-page__bill-copy span {
    font-size: 12px;
    color: #8c96a8;
}

.wallet-transactions-page__bill-meta {
    display: inline-flex;
    align-items: center;
    margin-bottom: 4px;
    padding: 3px 9px;
    border-radius: 999px;
    background: rgba(47, 107, 255, 0.08);
    color: #2f6bff;
    font-size: 11px;
    font-weight: 600;
    line-height: 1.4;
}

.wallet-transactions-page__bill-amount {
    flex-shrink: 0;
    font-size: 16px;
    font-weight: 700;
    color: #ff9b3d;
}

.wallet-transactions-page__bill-amount.is-income {
    color: #19b36b;
}

.wallet-transactions-page__more {
    width: 100%;
    min-height: 44px;
    margin-top: 14px;
    border: none;
    border-radius: 14px;
    background: #eef4ff;
    color: #2f6bff;
    font-weight: 600;
}

.wallet-filter-next-enter-active,
.wallet-filter-next-leave-active,
.wallet-filter-prev-enter-active,
.wallet-filter-prev-leave-active {
    transition:
        opacity 0.24s ease,
        transform 0.24s ease;
}

.wallet-filter-next-enter-from,
.wallet-filter-prev-leave-to {
    opacity: 0;
    transform: translateX(18px);
}

.wallet-filter-next-leave-to,
.wallet-filter-prev-enter-from {
    opacity: 0;
    transform: translateX(-18px);
}
</style>
