<template>
    <div class="account-center">
        <section class="account-center__masthead">
            <div>
                <span class="account-center__eyebrow">Campus Service ID</span>
            </div>
            <button
                type="button"
                class="account-center__settings touch-feedback"
                aria-label="进入设置"
                @click="handleMenuClick('/settings')"
            >
                <NIcon :size="18"><SettingsOutline /></NIcon>
            </button>
        </section>

        <section
            class="account-center__profile-shell"
            :class="{ 'is-guest': !userStore.isAuthenticated }"
        >
            <div class="account-center__profile-top">
                <div class="account-center__avatar-wrap">
                    <NAvatar
                        :size="84"
                        round
                        :src="userStore.isAuthenticated ? userStore.userAvatar : undefined"
                    >
                        {{ userInitial }}
                    </NAvatar>
                    <button
                        v-if="userStore.isAuthenticated"
                        type="button"
                        class="account-center__avatar-edit touch-feedback"
                        aria-label="编辑头像"
                        @click="handleMenuClick('/settings')"
                    >
                        <NIcon :size="14"><CameraOutline /></NIcon>
                    </button>
                </div>

                <div>
                    <template v-if="userStore.isAuthenticated">
                        <div class="account-center__identity-row">
                            <h2>{{ userStore.userName }}</h2>
                            <span
                                class="account-center__role-badge"
                                :class="{ 'is-courier': courierEnabled }"
                            >
                                {{ courierEnabled ? '代取员' : '普通用户' }}
                            </span>
                        </div>
                        <p class="account-center__intro">
                            {{ userStore.user?.college || '未设置学院' }}
                            <span v-if="userStore.user?.major">· {{ userStore.user?.major }}</span>
                        </p>
                    </template>
                    <template v-else>
                        <div class="account-center__identity-row">
                            <h2>校园服务账户</h2>
                            <span class="account-center__role-badge">访客模式</span>
                        </div>
                        <p class="account-center__intro">
                            登录后统一查看订单、任务、论坛互动和钱包记录。
                        </p>
                    </template>
                </div>
            </div>

            <div class="account-center__tag-row">
                <span>
                    <NIcon :size="12"><StarOutline /></NIcon>
                    Lv.{{ userStore.user?.level || 1 }}
                </span>
                <span>
                    <NIcon :size="12"><RibbonOutline /></NIcon>
                    {{ userStore.user?.points || 0 }} 积分
                </span>
                <span>
                    <NIcon :size="12"><ShieldCheckmarkOutline /></NIcon>
                    {{ verificationSummary }}
                </span>
            </div>

            <template v-if="userStore.isAuthenticated">
                <button
                    type="button"
                    class="account-center__wallet-entry touch-feedback"
                    @click="handleMenuClick('/wallet')"
                >
                    <div>
                        <span>钱包余额</span>
                        <strong>¥{{ Number(userStore.user?.balance || 0).toFixed(2) }}</strong>
                    </div>
                    <NIcon :size="18"><ChevronForwardOutline /></NIcon>
                </button>

                <div class="account-center__metric-strip">
                    <article
                        v-for="item in profileStats"
                        :key="item.label"
                        class="account-center__metric-pill"
                    >
                        <strong>{{ item.value }}</strong>
                        <span>{{ item.label }}</span>
                    </article>
                </div>
            </template>

            <template v-else>
                <div class="account-center__guest-copy">
                    <strong>登录后开启完整校园生活服务</strong>
                    <p>订单进度、任务协作、论坛记录和钱包流水都会自动归档到这里。</p>
                </div>
                <div class="account-center__guest-actions account-center__guest-actions--wide">
                    <NButton type="primary" round @click="router.push('/login')">立即登录</NButton>
                    <NButton quaternary round @click="router.push('/register')">注册账号</NButton>
                </div>
            </template>
        </section>

        <section class="account-center__section">
            <div class="account-center__section-head">
                <h3>账户资产</h3>
                <button type="button" @click="handleMenuClick('/wallet')">查看钱包</button>
            </div>
            <div class="account-center__overview-grid">
                <article
                    v-for="card in overviewCards"
                    :key="card.title"
                    class="account-center__overview-card"
                >
                    <div class="account-center__overview-icon" :style="{ background: card.tint }">
                        <NIcon :size="20"><component :is="card.icon" /></NIcon>
                    </div>
                    <strong>{{ card.value }}</strong>
                    <h4>{{ card.title }}</h4>
                    <p>{{ card.note }}</p>
                </article>
            </div>
        </section>

        <section class="account-center__section">
            <div class="account-center__section-head">
                <h3>常用入口</h3>
                <button type="button" @click="handleMenuClick('/settings')">账户设置</button>
            </div>
            <div class="account-center__shortcut-grid">
                <button
                    v-for="item in serviceShortcuts"
                    :key="item.title"
                    type="button"
                    class="account-center__shortcut touch-feedback"
                    @click="handleMenuClick(item.path)"
                >
                    <div class="account-center__shortcut-icon" :style="{ background: item.tint }">
                        <NIcon :size="20"><component :is="item.icon" /></NIcon>
                    </div>
                    <div class="account-center__shortcut-copy">
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.description }}</p>
                    </div>
                    <NIcon :size="18" class="account-center__shortcut-arrow">
                        <ChevronForwardOutline />
                    </NIcon>
                </button>
            </div>
        </section>

        <section class="account-center__section">
            <div class="account-center__section-head">
                <h3>最近动态</h3>
                <button type="button" @click="handleMenuClick('/chat')">查看消息</button>
            </div>
            <div class="account-center__timeline">
                <article
                    v-for="item in recentProgress"
                    :key="item.title"
                    class="account-center__timeline-item"
                >
                    <div class="account-center__timeline-icon" :style="{ background: item.tint }">
                        <NIcon :size="18"><component :is="item.icon" /></NIcon>
                    </div>
                    <div class="account-center__timeline-copy">
                        <strong>{{ item.title }}</strong>
                        <p>{{ item.description }}</p>
                        <span>{{ item.extra }}</span>
                    </div>
                </article>
            </div>
        </section>

        <section class="account-center__section">
            <div class="account-center__section-head">
                <h3>代取员扩展位</h3>
                <button type="button" @click="handleCourierAction">
                    {{ courierEnabled ? '进入接单中心' : '申请开通' }}
                </button>
            </div>

            <div v-if="courierEnabled" class="account-center__courier-card is-active">
                <div class="account-center__courier-top">
                    <div>
                        <span>Runner Mode</span>
                        <h4>代取员中心</h4>
                    </div>
                    <div class="account-center__courier-status">
                        <span class="account-center__status-dot"></span>
                        在线接单
                    </div>
                </div>
                <div class="account-center__courier-grid">
                    <article
                        v-for="item in courierMetrics"
                        :key="item.label"
                        class="account-center__courier-metric"
                    >
                        <span>{{ item.label }}</span>
                        <strong>{{ item.value }}</strong>
                        <p>{{ item.note }}</p>
                    </article>
                </div>
                <div class="account-center__courier-actions">
                    <button
                        type="button"
                        class="touch-feedback"
                        @click="handleMenuClick('/pickup/list')"
                    >
                        去抢单大厅
                    </button>
                    <button
                        type="button"
                        class="touch-feedback"
                        @click="handleMenuClick('/pickup/my')"
                    >
                        查看进行中订单
                    </button>
                </div>
            </div>

            <div v-else class="account-center__courier-card">
                <div class="account-center__courier-top">
                    <div>
                        <span>Future Upgrade</span>
                        <h4>代取员身份暂未开通</h4>
                    </div>
                    <div class="account-center__courier-pending">待扩展</div>
                </div>
                <p class="account-center__courier-note">
                    开通后你将保留普通用户全部功能，并额外获得抢单中心、在线状态、配送凭证上传和收益统计。
                </p>
                <div class="account-center__courier-chip-row">
                    <span>抢单大厅</span>
                    <span>服务区域</span>
                    <span>上传凭证</span>
                    <span>收益管理</span>
                </div>
            </div>
        </section>

        <section class="account-center__section">
            <div class="account-center__section-head">
                <h3>偏好设置</h3>
            </div>
            <div class="account-center__panel">
                <div class="account-center__setting-row">
                    <div class="account-center__setting-copy">
                        <div class="account-center__setting-icon">
                            <NIcon :size="18"><MoonOutline /></NIcon>
                        </div>
                        <div>
                            <strong>深色模式</strong>
                            <p>切换账户浏览外观</p>
                        </div>
                    </div>
                    <NSwitch :value="appStore.isDark" @update:value="handleThemeChange" />
                </div>
            </div>
        </section>

        <section v-if="userStore.isAuthenticated" class="account-center__section">
            <NButton type="error" round block size="large" @click="handleLogout">退出登录</NButton>
        </section>

        <div class="account-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NAvatar, NSwitch, useDialog, useMessage } from 'naive-ui';
import {
    BagHandleOutline,
    CameraOutline,
    CashOutline,
    ChatbubblesOutline,
    ChevronForwardOutline,
    DocumentTextOutline,
    FlashOutline,
    MoonOutline,
    PersonOutline,
    ReceiptOutline,
    RibbonOutline,
    SettingsOutline,
    ShieldCheckmarkOutline,
    StarOutline,
    StorefrontOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const userStore = useUserStore();
const appStore = useAppStore();

const userInitial = computed(() => userStore.userName?.slice(0, 1).toUpperCase() || 'U');

const courierEnabled = computed(() => {
    return Boolean(
        userStore.user?.student_verified && (userStore.user?.completed_orders || 0) >= 12
    );
});

const verificationSummary = computed(() => {
    if (!userStore.isAuthenticated || !userStore.user) return '待登录';

    const verifiedCount = [
        userStore.user.student_verified,
        userStore.user.phone_verified,
        userStore.user.email_verified,
    ].filter(Boolean).length;

    if (verifiedCount === 3) return '三项已认证';
    if (verifiedCount === 2) return '两项已认证';
    if (verifiedCount === 1) return '单项认证';
    return '待认证';
});

const profileStats = computed(() => {
    if (!userStore.isAuthenticated || !userStore.user) {
        return [];
    }

    return [
        { label: '完成订单', value: userStore.user.completed_orders || 0 },
        { label: '完成任务', value: userStore.user.completed_tasks || 0 },
        { label: '账户评分', value: Number(userStore.user.rating || 5).toFixed(1) },
        { label: '当前等级', value: `Lv.${userStore.user.level || 1}` },
    ];
});

const overviewCards = computed(() => {
    const stats = userStore.userStats;
    const user = userStore.user;

    return [
        {
            title: '订单履约',
            value: stats?.orders.completed ?? user?.completed_orders ?? '--',
            note: '已完成的代取与代购服务',
            icon: markRaw(ReceiptOutline),
            tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))',
        },
        {
            title: '任务协作',
            value: stats?.tasks.completed ?? user?.completed_tasks ?? '--',
            note: '参与完成的校园协作任务',
            icon: markRaw(DocumentTextOutline),
            tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
        },
        {
            title: '论坛互动',
            value: stats?.forum.posts ?? user?.level ?? '--',
            note: '帖子发布与内容参与表现',
            icon: markRaw(ChatbubblesOutline),
            tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
        },
        {
            title: '钱包与积分',
            value: userStore.isAuthenticated ? `¥${Number(user?.balance || 0).toFixed(0)}` : '--',
            note: `${user?.points || 0} 积分可用于活跃度展示`,
            icon: markRaw(WalletOutline),
            tint: 'linear-gradient(135deg, rgba(23,48,79,0.16), rgba(47,107,255,0.14))',
        },
    ];
});

const serviceShortcuts = computed(() => [
    {
        title: '我的订单',
        description: '查看发布记录、进行中订单与售后状态',
        path: '/pickup/my',
        icon: markRaw(BagHandleOutline),
        tint: 'linear-gradient(135deg, rgba(47,107,255,0.14), rgba(75,184,255,0.16))',
    },
    {
        title: '我的任务',
        description: '管理发布任务、申请记录和协作进度',
        path: '/tasks/my',
        icon: markRaw(DocumentTextOutline),
        tint: 'linear-gradient(135deg, rgba(25,179,107,0.14), rgba(120,224,171,0.16))',
    },
    {
        title: '我的帖子',
        description: '查看论坛文章、收藏和互动反馈',
        path: '/forum/my',
        icon: markRaw(ChatbubblesOutline),
        tint: 'linear-gradient(135deg, rgba(255,155,61,0.15), rgba(247,199,95,0.18))',
    },
    {
        title: '个人资料',
        description: '完善学院、专业、技能标签和个人介绍',
        path: '/settings',
        icon: markRaw(PersonOutline),
        tint: 'linear-gradient(135deg, rgba(23,48,79,0.12), rgba(47,107,255,0.14))',
    },
    {
        title: '客服消息',
        description: '统一查看平台通知、订单沟通和服务消息',
        path: '/chat',
        icon: markRaw(FlashOutline),
        tint: 'linear-gradient(135deg, rgba(99,102,241,0.14), rgba(129,140,248,0.16))',
    },
    {
        title: '钱包记录',
        description: '查看余额、收益和后续代取员结算入口',
        path: '/wallet',
        icon: markRaw(CashOutline),
        tint: 'linear-gradient(135deg, rgba(12,116,176,0.13), rgba(75,184,255,0.16))',
    },
]);

const recentProgress = computed(() => {
    if (!userStore.isAuthenticated) {
        return [
            {
                title: '登录后同步服务动态',
                description: '订单状态、任务协作和论坛互动会集中展示在这里。',
                extra: '实时更新',
                icon: markRaw(StorefrontOutline),
                tint: 'linear-gradient(135deg, rgba(47,107,255,0.12), rgba(75,184,255,0.16))',
            },
        ];
    }

    return [
        {
            title: '订单中心已同步最近履约记录',
            description: '你可以继续查看进行中的代取订单和历史凭证。',
            extra: `${userStore.user?.completed_orders || 0} 个已完成订单`,
            icon: markRaw(ReceiptOutline),
            tint: 'linear-gradient(135deg, rgba(47,107,255,0.12), rgba(75,184,255,0.16))',
        },
        {
            title: '任务协作中心正在追踪申请进度',
            description: '已发布任务和已接任务的状态会在这里归档。',
            extra: `${userStore.user?.completed_tasks || 0} 个已完成任务`,
            icon: markRaw(DocumentTextOutline),
            tint: 'linear-gradient(135deg, rgba(25,179,107,0.12), rgba(120,224,171,0.16))',
        },
        {
            title: '论坛内容互动将继续沉淀个人影响力',
            description: '文章发布、回复和收藏会成为你的校园内容履历。',
            extra: `${userStore.user?.points || 0} 积分`,
            icon: markRaw(ChatbubblesOutline),
            tint: 'linear-gradient(135deg, rgba(255,155,61,0.12), rgba(247,199,95,0.18))',
        },
    ];
});

const courierMetrics = computed(() => [
    {
        label: '今日收益',
        value: `¥${Math.max(12, Math.round((userStore.user?.completed_orders || 0) * 2.5))}`,
        note: '接单收益待进入钱包明细',
    },
    {
        label: '待抢订单',
        value: 18,
        note: '按宿舍区和驿站热度筛选',
    },
    {
        label: '服务评分',
        value: Number(userStore.user?.rating || 4.8).toFixed(1),
        note: '后续接入履约评价体系',
    },
]);

const handleMenuClick = (path: string) => {
    appStore.hapticFeedback('light');
    router.push(path);
};

const handleThemeChange = (value: boolean) => {
    appStore.setTheme(value);
    appStore.hapticFeedback('medium');
};

const handleCourierAction = () => {
    if (!userStore.isAuthenticated) {
        router.push('/login');
        return;
    }

    if (courierEnabled.value) {
        router.push('/pickup/list');
        return;
    }

    message.info('代取员中心将在后续版本接入认证与接单流程');
};

const handleLogout = () => {
    dialog.warning({
        title: '提示',
        content: '确定要退出登录吗？',
        positiveText: '确定',
        negativeText: '取消',
        onPositiveClick: () => {
            userStore.logout();
            message.success('已退出登录');
            router.replace('/');
        },
    });
};

onMounted(async () => {
    if (userStore.isAuthenticated) {
        try {
            await Promise.all([userStore.fetchUserProfile(), userStore.fetchUserStats()]);
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    }
});
</script>
