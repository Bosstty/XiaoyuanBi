<template>
    <div class="account-center">
        <section class="account-center__masthead">
            <div>
                <span class="account-center__eyebrow">Campus Service ID</span>
            </div>
        </section>

        <section
            class="account-center__profile-shell"
            :class="{ 'is-guest': !userStore.isAuthenticated }"
        >
            <div class="account-center__profile-top">
                <div class="account-center__avatar-wrap">
                    <div class="account-center__avatar-shell">
                        <img
                            v-if="userStore.isAuthenticated && userStore.userAvatar"
                            :key="userStore.userAvatar"
                            :src="userStore.userAvatar"
                            alt="avatar"
                            class="account-center__avatar-image"
                        />
                        <span v-else class="account-center__avatar-fallback">
                            {{ userInitial }}
                        </span>
                    </div>
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
                            <h2>未知账户</h2>
                            <span class="account-center__role-badge">访客模式</span>
                        </div>
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
                <div class="account-center__wallet-entry">
                    <button
                        type="button"
                        class="account-center__wallet-main touch-feedback"
                        @click="handleMenuClick('/wallet')"
                    >
                        <div>
                            <span>钱包余额</span>
                            <strong>¥{{ Number(userStore.user?.balance || 0).toFixed(2) }}</strong>
                            <p>冻结金额 ¥{{ frozenBalanceText }}</p>
                        </div>

                        <NIcon :size="18"><ChevronForwardOutline /></NIcon>
                    </button>
                </div>

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
                </div>
                <div class="account-center__guest-actions account-center__guest-actions--wide">
                    <NButton type="primary" round @click="router.push('/login')">立即登录</NButton>
                    <NButton quaternary round @click="router.push('/register')">注册账号</NButton>
                </div>
            </template>
        </section>

        <section v-if="courierEnabled" class="account-center__section">
            <div class="account-center__section-head">
                <h3>代取员扩展位</h3>
                <button type="button" @click="handleCourierAction">
                    {{ courierActionLabel }}
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
                        {{ courierStatusText }}
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
                        @click="handleMenuClick('/pickup/hall')"
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
                    <p>{{ card.note || '' }}</p>
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

        <section v-if="!courierEnabled" class="account-center__section">
            <div class="account-center__section-head">
                <h3>代取员扩展位</h3>
                <button type="button" @click="handleCourierAction">
                    {{ courierActionLabel }}
                </button>
            </div>
            <div class="account-center__courier-card">
                <div class="account-center__courier-top">
                    <div>
                        <span>Future Upgrade</span>
                        <h4>{{ courierCardTitle }}</h4>
                    </div>
                    <div class="account-center__courier-pending">{{ courierPendingText }}</div>
                </div>
                <p class="account-center__courier-note">
                    {{ courierCardNote }}
                </p>
                <div class="account-center__courier-chip-row">
                    <span>{{ courierChipRow[0] }}</span>
                    <span>{{ courierChipRow[1] }}</span>
                    <span>{{ courierChipRow[2] }}</span>
                    <span>{{ courierChipRow[3] }}</span>
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

        <NModal
            v-model:show="courierApplicationModalVisible"
            preset="card"
            class="courier-application-modal"
            :bordered="false"
            :mask-closable="!courierApplicationSubmitting"
            :closable="!courierApplicationSubmitting"
        >
            <div class="courier-application-modal__head">
                <div>
                    <span class="courier-application-modal__eyebrow">Runner Upgrade</span>
                    <h3>
                        {{ courierApplicationMode === 'submit' ? '申请配送员' : '修改配送员申请' }}
                    </h3>
                </div>
                <p>提交基础身份信息与身份证照片后，管理员会尽快完成审核。</p>
            </div>

            <div class="courier-application-modal__grid">
                <label class="courier-application-modal__field">
                    <span>真实姓名</span>
                    <NInput
                        v-model:value="courierApplicationForm.real_name"
                        placeholder="请输入真实姓名"
                    />
                </label>
                <label class="courier-application-modal__field">
                    <span>手机号</span>
                    <NInput
                        v-model:value="courierApplicationForm.phone"
                        placeholder="请输入手机号"
                    />
                </label>
                <label class="courier-application-modal__field">
                    <span>身份证号</span>
                    <NInput
                        v-model:value="courierApplicationForm.id_card"
                        placeholder="请输入身份证号"
                    />
                </label>
                <label class="courier-application-modal__field">
                    <span>紧急联系人姓名</span>
                    <NInput
                        v-model:value="courierApplicationForm.emergency_contact_name"
                        placeholder="请输入紧急联系人姓名"
                    />
                </label>
                <label class="courier-application-modal__field">
                    <span>紧急联系人电话</span>
                    <NInput
                        v-model:value="courierApplicationForm.emergency_contact_phone"
                        placeholder="请输入紧急联系人电话"
                    />
                </label>
            </div>

            <div class="courier-application-modal__uploads">
                <button
                    type="button"
                    class="courier-upload-card touch-feedback"
                    @click="frontIdInputRef?.click()"
                >
                    <div class="courier-upload-card__top">
                        <span>身份证正面</span>
                        <span class="courier-upload-card__action">
                            {{ frontIdPreview ? '重新选择' : '上传照片' }}
                        </span>
                    </div>
                    <div class="courier-upload-card__preview">
                        <img
                            v-if="frontIdPreview"
                            :src="frontIdPreview"
                            alt="身份证正面预览"
                            class="courier-upload-card__image"
                        />
                        <div v-else class="courier-upload-card__placeholder">
                            请上传清晰的身份证人像面
                        </div>
                    </div>
                </button>

                <button
                    type="button"
                    class="courier-upload-card touch-feedback"
                    @click="backIdInputRef?.click()"
                >
                    <div class="courier-upload-card__top">
                        <span>身份证反面</span>
                        <span class="courier-upload-card__action">
                            {{ backIdPreview ? '重新选择' : '上传照片' }}
                        </span>
                    </div>
                    <div class="courier-upload-card__preview">
                        <img
                            v-if="backIdPreview"
                            :src="backIdPreview"
                            alt="身份证反面预览"
                            class="courier-upload-card__image"
                        />
                        <div v-else class="courier-upload-card__placeholder">
                            请上传清晰的身份证国徽面
                        </div>
                    </div>
                </button>
            </div>

            <input
                ref="frontIdInputRef"
                type="file"
                accept="image/*"
                class="courier-application-modal__file-input"
                @change="handleCourierFileChange('front', $event)"
            />
            <input
                ref="backIdInputRef"
                type="file"
                accept="image/*"
                class="courier-application-modal__file-input"
                @change="handleCourierFileChange('back', $event)"
            />

            <div class="courier-application-modal__tips">
                <span>仅用于平台审核，不会对外公开</span>
                <span>支持 JPG / PNG，建议上传清晰原图</span>
            </div>

            <div class="courier-application-modal__footer">
                <NButton
                    quaternary
                    round
                    :disabled="courierApplicationSubmitting"
                    @click="closeCourierApplicationModal"
                >
                    取消
                </NButton>
                <NButton
                    type="primary"
                    round
                    :loading="courierApplicationSubmitting"
                    @click="submitCourierApplication"
                >
                    {{ courierApplicationMode === 'submit' ? '提交申请' : '保存修改' }}
                </NButton>
            </div>
        </NModal>

        <div class="account-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { computed, markRaw, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NModal, NSwitch, useDialog, useMessage } from 'naive-ui';
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
    ShieldCheckmarkOutline,
    StarOutline,
    WalletOutline,
} from '@vicons/ionicons5';
import {
    DelivererApplicationApi,
    WalletApi,
    type DelivererApplicationPayload,
} from '@/api';
import type { DelivererApplication, WalletOverview } from '@/types';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const userStore = useUserStore();
const appStore = useAppStore();
const delivererApplication = ref<DelivererApplication | null>(null);
const delivererApplicationLoading = ref(false);
const walletOverview = ref<WalletOverview | null>(null);
const courierApplicationModalVisible = ref(false);
const courierApplicationSubmitting = ref(false);
const courierApplicationMode = ref<'submit' | 'update'>('submit');
const frontIdInputRef = ref<HTMLInputElement | null>(null);
const backIdInputRef = ref<HTMLInputElement | null>(null);
const courierApplicationForm = reactive<DelivererApplicationPayload>({
    real_name: '',
    phone: '',
    id_card: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    id_card_front: null,
    id_card_back: null,
});

const resolveAssetUrl = (value?: string | null) => {
    if (!value) return '';
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) return value;
    if (value.startsWith('/')) return `${window.location.origin}${value}`;
    return value;
};

const frontIdPreview = computed(() => {
    const value = courierApplicationForm.id_card_front;
    if (!value) return '';
    return typeof value === 'string' ? resolveAssetUrl(value) : URL.createObjectURL(value);
});

const backIdPreview = computed(() => {
    const value = courierApplicationForm.id_card_back;
    if (!value) return '';
    return typeof value === 'string' ? resolveAssetUrl(value) : URL.createObjectURL(value);
});

const userInitial = computed(() => userStore.userName?.slice(0, 1).toUpperCase() || 'U');
const frozenBalanceText = computed(() =>
    Number(walletOverview.value?.summary.frozen_balance || 0).toFixed(2)
);

const courierEnabled = computed(() => {
    return Boolean(
        userStore.user?.is_deliverer ||
        delivererApplication.value?.application_status === 'approved'
    );
});

const courierStatusText = computed(() => {
    if (delivererApplication.value?.is_online) {
        return '在线接单';
    }

    return '已开通';
});

const courierActionLabel = computed(() => {
    if (courierEnabled.value) {
        return '进入接单中心';
    }

    if (delivererApplication.value?.application_status === 'pending') {
        return '查看申请';
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        return '重新提交';
    }

    if (delivererApplication.value?.application_status === 'banned') {
        return '联系客服';
    }

    return '申请开通';
});

const courierCardTitle = computed(() => {
    if (delivererApplication.value?.application_status === 'pending') {
        return '配送员申请审核中';
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        return '配送员申请未通过';
    }

    if (delivererApplication.value?.application_status === 'banned') {
        return '配送员认证信息已被封禁';
    }

    return '代取员身份暂未开通';
});

const courierPendingText = computed(() => {
    if (delivererApplicationLoading.value) {
        return '加载中';
    }

    if (delivererApplication.value?.application_status === 'pending') {
        return '审核中';
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        return '已退回';
    }

    if (delivererApplication.value?.application_status === 'banned') {
        return '已封禁';
    }

    return '待扩展';
});

const courierCardNote = computed(() => {
    if (delivererApplication.value?.application_status === 'pending') {
        return '你的配送员申请已经提交，当前正在等待管理员审核。审核通过后会自动开通接单能力。';
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        return (
            delivererApplication.value.rejection_reason ||
            '申请已被退回，请补充完整信息后重新提交。'
        );
    }

    if (delivererApplication.value?.application_status === 'banned') {
        return '当前配送员认证信息已被封禁，如有疑问请联系客服处理。';
    }

    return '开通后你将保留普通用户全部功能，并额外获得抢单中心、在线状态、配送凭证上传和收益统计。';
});

const courierChipRow = computed(() => {
    if (delivererApplication.value?.application_status === 'pending') {
        return ['资料审核', '身份校验', '服务区域', '等待开通'];
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        return ['重新填写', '修改资料', '再次提交', '等待复审'];
    }

    if (delivererApplication.value?.application_status === 'banned') {
        return ['认证封禁', '暂停申请', '联系客服', '等待处理'];
    }

    return ['抢单大厅', '服务区域', '上传凭证', '收益管理'];
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

    const items = [
        { label: '完成任务', value: userStore.user.completed_tasks || 0 },
        { label: '账户评分', value: Number(userStore.user.rating || 5).toFixed(1) },
        { label: '当前等级', value: `Lv.${userStore.user.level || 1}` },
    ];

    if (courierEnabled.value) {
        items.unshift({ label: '完成订单', value: userStore.user.completed_orders || 0 });
    }

    return items;
});

const overviewCards = computed(() => {
    const stats = userStore.userStats;
    const user = userStore.user;

    return [
        {
            title: '订单履约',
            value: stats?.orders.completed ?? user?.completed_orders ?? '--',
            icon: markRaw(ReceiptOutline),
            tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))',
            note: '订单与代取履约总览',
        },
        {
            title: '任务协作',
            value: stats?.tasks.completed ?? user?.completed_tasks ?? '--',
            icon: markRaw(DocumentTextOutline),
            tint: 'linear-gradient(135deg, rgba(25,179,107,0.16), rgba(120,224,171,0.18))',
            note: '任务协作完成情况',
        },
        {
            title: '论坛互动',
            value: stats?.forum.posts ?? user?.level ?? '--',
            icon: markRaw(ChatbubblesOutline),
            tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))',
            note: '内容发布与互动表现',
        },
        {
            title: '钱包与积分',
            value: userStore.isAuthenticated ? `¥${Number(user?.balance || 0).toFixed(0)}` : '--',
            icon: markRaw(WalletOutline),
            tint: 'linear-gradient(135deg, rgba(23,48,79,0.16), rgba(47,107,255,0.14))',
            note: '余额与积分概览',
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

const courierMetrics = computed(() => [
    {
        label: '累计收益',
        value: `¥${Number(delivererApplication.value?.total_earnings || 0).toFixed(2)}`,
        note: '配送收益会同步进入钱包明细',
    },
    {
        label: '完成订单',
        value: delivererApplication.value?.completed_orders || 0,
        note: `总单量 ${delivererApplication.value?.total_orders || 0}`,
    },
    {
        label: '服务评分',
        value: Number(delivererApplication.value?.rating || userStore.user?.rating || 5).toFixed(1),
        note: delivererApplication.value?.is_online ? '当前在线，可继续接单' : '当前未开启在线状态',
    },
]);

const loadWalletOverview = async () => {
    if (!userStore.isAuthenticated) {
        walletOverview.value = null;
        return;
    }

    try {
        const response = await WalletApi.getOverview();
        walletOverview.value = response.success ? response.data || null : null;
    } catch (error) {
        console.error('获取钱包概览失败:', error);
        walletOverview.value = null;
    }
};

const loadDelivererApplication = async () => {
    if (!userStore.isAuthenticated) {
        delivererApplication.value = null;
        return;
    }

    delivererApplicationLoading.value = true;
    try {
        const response = await DelivererApplicationApi.getStatus();
        delivererApplication.value = response.success ? response.data || null : null;
    } catch (error) {
        console.error('获取配送员申请状态失败:', error);
        delivererApplication.value = null;
    } finally {
        delivererApplicationLoading.value = false;
    }
};

const openDelivererApplicationDialog = (mode: 'submit' | 'update') => {
    courierApplicationMode.value = mode;
    courierApplicationForm.real_name =
        delivererApplication.value?.real_name || userStore.user?.real_name || '';
    courierApplicationForm.phone = delivererApplication.value?.phone || userStore.user?.phone || '';
    courierApplicationForm.id_card = delivererApplication.value?.id_card || '';
    courierApplicationForm.emergency_contact_name =
        delivererApplication.value?.emergency_contact_name || '';
    courierApplicationForm.emergency_contact_phone =
        delivererApplication.value?.emergency_contact_phone || '';
    courierApplicationForm.id_card_front = delivererApplication.value?.id_card_front || null;
    courierApplicationForm.id_card_back = delivererApplication.value?.id_card_back || null;
    courierApplicationModalVisible.value = true;
};

const closeCourierApplicationModal = () => {
    if (courierApplicationSubmitting.value) {
        return;
    }
    courierApplicationModalVisible.value = false;
};

const handleCourierFileChange = (side: 'front' | 'back', event: Event) => {
    const file = (event.target as HTMLInputElement).files?.[0] || null;
    if (side === 'front') {
        courierApplicationForm.id_card_front = file;
    } else {
        courierApplicationForm.id_card_back = file;
    }
    (event.target as HTMLInputElement).value = '';
};

const submitCourierApplication = async () => {
    if (
        !courierApplicationForm.real_name ||
        !courierApplicationForm.phone ||
        !courierApplicationForm.id_card ||
        !courierApplicationForm.emergency_contact_name ||
        !courierApplicationForm.emergency_contact_phone ||
        !courierApplicationForm.id_card_front ||
        !courierApplicationForm.id_card_back
    ) {
        message.error('请填写完整申请信息并上传身份证正反面');
        return;
    }

    courierApplicationSubmitting.value = true;
    try {
        const payload: DelivererApplicationPayload = {
            real_name: courierApplicationForm.real_name.trim(),
            phone: courierApplicationForm.phone.trim(),
            id_card: courierApplicationForm.id_card.trim(),
            emergency_contact_name: courierApplicationForm.emergency_contact_name.trim(),
            emergency_contact_phone: courierApplicationForm.emergency_contact_phone.trim(),
            id_card_front: courierApplicationForm.id_card_front,
            id_card_back: courierApplicationForm.id_card_back,
        };

        const response =
            courierApplicationMode.value === 'submit'
                ? await DelivererApplicationApi.submit(payload)
                : await DelivererApplicationApi.update(payload);

        if (!response.success) {
            throw new Error(response.message || '提交申请失败');
        }

        message.success(courierApplicationMode.value === 'submit' ? '申请已提交' : '申请已更新');
        courierApplicationModalVisible.value = false;
        await Promise.all([userStore.fetchUserProfile(), loadDelivererApplication()]);
    } catch (error) {
        message.error(error instanceof Error ? error.message : '提交申请失败');
    } finally {
        courierApplicationSubmitting.value = false;
    }
};

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

    if (!userStore.user?.student_verified) {
        message.warning('请先完成学生认证，再申请配送员');
        return;
    }

    if (courierEnabled.value) {
        if (!delivererApplication.value?.is_online) {
            message.warning('请先开启在线接单状态');
            return;
        }
        router.push('/pickup/hall');
        return;
    }

    if (delivererApplication.value?.application_status === 'pending') {
        message.info('配送员申请正在审核中，请等待管理员处理');
        return;
    }

    if (delivererApplication.value?.application_status === 'banned') {
        message.warning('您的认证信息已被封禁，请联系客服解决');
        return;
    }

    if (delivererApplication.value?.application_status === 'rejected') {
        openDelivererApplicationDialog('update');
        return;
    }

    openDelivererApplicationDialog('submit');
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
            await Promise.all([
                userStore.fetchUserProfile(),
                userStore.fetchUserStats(),
                loadDelivererApplication(),
                loadWalletOverview(),
            ]);
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    }
});
</script>
