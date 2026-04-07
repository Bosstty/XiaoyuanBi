<template>
    <div class="task-detail-page" :class="{ 'is-dark': appStore.isDark }">
        <header class="top-nav">
            <div class="nav-back-group" @click="router.back()">
                <n-icon size="20" class="back-icon">
                    <svg viewBox="0 0 24 24">
                        <path
                            d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"
                            fill="currentColor"
                        />
                    </svg>
                </n-icon>
                <span class="nav-title">任务详情</span>
            </div>
        </header>

        <main class="detail-container">
            <div v-if="loading" class="detail-state">
                <NSpin size="large" />
            </div>

            <div v-else-if="taskError" class="detail-state detail-state--text">
                <p>{{ taskError }}</p>
                <NButton quaternary round @click="refreshDetail">重新加载</NButton>
            </div>

            <NSpace v-else-if="task" vertical size="large">
                <NCard :bordered="false" class="main-info-card">
                    <div class="card-header">
                        <div class="category-tag">
                            <span class="blue-bar"></span>
                            <span class="cat-text">{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <NTag :bordered="false" type="warning" size="small" round>
                            {{ getDisplayStatusLabel(task) }}
                        </NTag>
                    </div>

                    <h1 class="task-title">{{ task.title }}</h1>
                    <p class="task-desc">{{ task.description }}</p>

                    <div class="divider"></div>

                    <div class="meta-row">
                        <div class="price-text">¥{{ formatAmount(task.price) }}</div>
                        <div class="meta-item">
                            <NIcon :component="PersonOutline" />
                            <span>{{ task.max_applicants || 1 }}人</span>
                        </div>
                        <div class="meta-item">
                            <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                <path
                                    d="M12 5c-5 0-9.27 3.11-11 7 1.73 3.89 6 7 11 7s9.27-3.11 11-7c-1.73-3.89-6-7-11-7zm0 11a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0-2.2A1.8 1.8 0 1 0 12 10a1.8 1.8 0 0 0 0 3.6z"
                                    fill="currentColor"
                                />
                            </svg>
                            <span>{{ task.view_count || 0 }} 浏览</span>
                        </div>
                        <div class="meta-item">
                            <NIcon :component="TimeOutline" />
                            <span>{{ formatRelativeTime(task.createdAt) }}</span>
                        </div>
                    </div>
                    <div class="deadline-note">截止时间：{{ formatDateTime(task.deadline) }}</div>
                </NCard>

                <NCard
                    v-if="
                        task.cancellation_status === 'pending' ||
                        task.cancellation_status === 'rejected' ||
                        task.cancellation_status === 'disputed'
                    "
                    :bordered="false"
                    class="cancellation-notice-card"
                    :class="`cancellation-notice-card--${task.cancellation_status}`"
                >
                    <div class="cancellation-notice__header">
                        <div class="cancellation-notice__heading">
                            <strong>{{ cancellationNoticeTitle }}</strong>
                            <p>{{ cancellationNoticeDescription }}</p>
                        </div>
                        <NTag :bordered="false" round size="small">
                            {{ cancellationNoticeTag }}
                        </NTag>
                    </div>

                    <div class="cancellation-notice__meta">
                        <div class="cancellation-notice__stat">
                            <span>发起方</span>
                            <strong>{{ cancellationRequesterLabel }}</strong>
                        </div>
                        <div class="cancellation-notice__stat">
                            <span>协商赔偿</span>
                            <strong>{{ cancellationCompensationText }}</strong>
                        </div>
                        <div
                            v-if="task.cancellation_status === 'pending'"
                            class="cancellation-notice__stat"
                        >
                            <span>剩余确认时间</span>
                            <strong>{{ cancellationCountdownText }}</strong>
                        </div>
                        <div
                            v-else-if="task.cancellation_responded_at"
                            class="cancellation-notice__stat"
                        >
                            <span>最近处理时间</span>
                            <strong>{{ formatDateTime(task.cancellation_responded_at) }}</strong>
                        </div>
                    </div>

                    <div class="cancellation-notice__reason">
                        <span>取消原因</span>
                        <p>{{ task.cancellation_reason || '未填写取消原因' }}</p>
                    </div>

                    <div class="cancellation-notice__actions">
                        <NButton v-if="canWithdrawCancellation" round @click="confirmWithdrawCancellation">
                            撤回申请
                        </NButton>
                        <template v-if="canRespondCancellation">
                            <NButton tertiary round @click="confirmRespondCancellation('reject')">
                                拒绝取消
                            </NButton>
                            <NButton type="primary" round @click="confirmRespondCancellation('accept')">
                                同意取消
                            </NButton>
                        </template>
                        <NButton
                            v-if="canCreateDisputeTicket"
                            type="warning"
                            round
                            @click="openTicketModal"
                        >
                            申请客服介入
                        </NButton>
                        <span v-if="task.cancellation_ticket_id" class="cancellation-notice__ticket">
                            工单 #{{ task.cancellation_ticket_id }}
                        </span>
                    </div>
                </NCard>

                <NCard
                    :bordered="false"
                    title="任务要求"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <p class="req-text">{{ task.requirements || '暂无具体要求内容' }}</p>
                    <NSpace size="small" style="margin-top: 12px">
                        <NTag
                            v-for="tag in task.tags || []"
                            :key="tag"
                            :bordered="false"
                            size="small"
                        >
                            # {{ tag }}
                        </NTag>
                    </NSpace>
                </NCard>

                <NCard :bordered="false">
                    <div
                        class="user-info-wrapper"
                        :class="{ 'user-info-wrapper--interactive': canViewPublisherProfile }"
                        @click="canViewPublisherProfile && goToUserProfile(task.publisher?.id)"
                    >
                        <div class="user-avatar user-avatar--md">
                            <img
                                v-if="resolveAvatarUrl(task.publisher?.avatar)"
                                :src="resolveAvatarUrl(task.publisher?.avatar)"
                                :alt="publisherName"
                            />
                            <span v-else>{{ publisherName.charAt(0) }}</span>
                        </div>
                        <div class="user-main">
                            <div class="name-line">
                                <span class="username">{{ publisherName }}</span>
                                <span class="rating">
                                    评分 {{ task.publisher?.rating || '5.0' }}
                                </span>
                            </div>
                            <div class="major">{{ task.publisher?.major || '校友认证' }}</div>
                        </div>
                        <NButton
                            v-if="task.publisher?.id && task.publisher.id !== currentUserId"
                            secondary
                            round
                            size="small"
                            @click.stop="chatWithUser(task.publisher.id)"
                        >
                            聊一聊
                        </NButton>
                        <NButton
                            v-if="task.publisher?.id && task.publisher.id !== currentUserId"
                            quaternary
                            round
                            size="small"
                            @click.stop="goToUserProfile(task.publisher.id)"
                        >
                            查看主页
                        </NButton>
                    </div>
                </NCard>

                <NCard
                    v-if="task.assignee"
                    :bordered="false"
                    :title="task.status === 'completed' ? '任务承接人' : '当前协作者'"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <div
                        class="user-info-wrapper user-info-wrapper--interactive"
                        @click="goToUserProfile(task.assignee.id)"
                    >
                        <div class="user-avatar user-avatar--md">
                            <img
                                v-if="resolveAvatarUrl(task.assignee?.avatar)"
                                :src="resolveAvatarUrl(task.assignee?.avatar)"
                                :alt="assigneeName"
                            />
                            <span v-else>{{ assigneeName.charAt(0) }}</span>
                        </div>
                        <div class="user-main">
                            <div class="name-line">
                                <span class="username">{{ assigneeName }}</span>
                                <span class="rating">
                                    综合 {{ formatRating(task.assignee?.rating) }}
                                </span>
                            </div>
                            <div class="major">
                                已完成 {{ task.assignee?.completed_tasks || 0 }} 个任务
                                <span>· {{ task.assignee?.completed_orders || 0 }} 个订单</span>
                            </div>
                        </div>
                        <NButton quaternary round size="small">查看详情</NButton>
                    </div>
                    <div v-if="task.rating" class="task-review-summary">
                        <div class="task-review-summary__score">
                            评分 {{ Number(task.rating).toFixed(1) }}
                        </div>
                        <p>{{ task.rating_comment || '已完成评价' }}</p>
                    </div>
                </NCard>

                <NCard
                    v-if="canAdjustPrice"
                    :bordered="false"
                    title="任务金额"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <div class="price-adjust-card">
                        <div class="price-adjust-main">
                            <span>当前报酬</span>
                            <strong>¥{{ formatAmount(task.price) }}</strong>
                        </div>
                        <NButton type="primary" round @click="openAdjustPriceModal">
                            修改金额
                        </NButton>
                    </div>
                </NCard>

                <NCard
                    v-if="canRequestCancellation"
                    :bordered="false"
                    title="取消协商"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <div class="cancellation-panel">
                        <div class="cancellation-panel__copy">
                            <strong>{{ cancellationPanelTitle }}</strong>
                            <p>{{ cancellationPanelDescription }}</p>
                        </div>
                        <NButton type="primary" round @click="openCancellationRequestModal">
                            申请取消任务
                        </NButton>
                    </div>
                </NCard>

                <NCard
                    v-if="isPublisher"
                    :bordered="false"
                    title="申请列表"
                    header-style="font-size: 16px; font-weight: 600;"
                >
                    <div v-if="applicationLoading" class="application-state">
                        <NSpin size="small" />
                    </div>
                    <div v-else-if="applications.length" class="application-list">
                        <article
                            v-for="application in applications"
                            :key="application.id"
                            class="application-card"
                        >
                            <div class="application-main">
                                <div
                                    class="application-user application-user--interactive"
                                    @click="goToUserProfile(application.applicant_id)"
                                >
                                    <div class="user-avatar user-avatar--sm">
                                        <img
                                            v-if="resolveAvatarUrl(application.applicant?.avatar)"
                                            :src="resolveAvatarUrl(application.applicant?.avatar)"
                                            :alt="getApplicantName(application)"
                                        />
                                        <span v-else>
                                            {{ getApplicantName(application).charAt(0) }}
                                        </span>
                                    </div>
                                    <div class="application-copy">
                                        <div class="application-title-row">
                                            <strong>{{ getApplicantName(application) }}</strong>
                                            <NTag size="small" :bordered="false" round>
                                                {{ getApplicationStatusLabel(application.status) }}
                                            </NTag>
                                        </div>
                                        <p>
                                            {{ application.applicant?.college || '未填写学院' }}
                                            <span v-if="application.applicant?.major">
                                                · {{ application.applicant?.major }}
                                            </span>
                                        </p>
                                        <div
                                            v-if="application.applicant_profile"
                                            class="application-metrics"
                                        >
                                            <span>
                                                综合
                                                {{
                                                    application.applicant_profile.overall_rating.toFixed(
                                                        2
                                                    )
                                                }}
                                            </span>
                                            <span>
                                                任务
                                                {{ application.applicant_profile.completed_tasks }}
                                                单
                                            </span>
                                        </div>
                                        <span>
                                            {{ formatDateTime(application.createdAt) }} 提交申请
                                        </span>
                                    </div>
                                </div>
                                <div class="application-actions">
                                    <NButton
                                        size="small"
                                        round
                                        quaternary
                                        @click.stop="goToUserProfile(application.applicant_id)"
                                    >
                                        详情
                                    </NButton>
                                    <NButton
                                        v-if="application.status === 'pending'"
                                        size="small"
                                        tertiary
                                        round
                                        :loading="
                                            processingId === application.id &&
                                            processingAction === 'reject'
                                        "
                                        @click="processApplication(application, 'reject')"
                                    >
                                        拒绝
                                    </NButton>
                                    <NButton
                                        v-if="application.status === 'pending'"
                                        size="small"
                                        type="primary"
                                        round
                                        :loading="
                                            processingId === application.id &&
                                            processingAction === 'accept'
                                        "
                                        @click="processApplication(application, 'accept')"
                                    >
                                        同意
                                    </NButton>
                                </div>
                            </div>
                        </article>
                    </div>
                    <div v-else class="application-state application-state--text">暂无申请记录</div>
                </NCard>
            </NSpace>

            <div v-else class="detail-state detail-state--text">
                <p>任务不存在或已下线</p>
                <NButton quaternary round @click="router.push('/tasks/list')">返回任务列表</NButton>
            </div>
        </main>

        <div v-if="task" class="bottom-action-bar">
            <NButton
                v-if="canApply"
                type="primary"
                block
                size="large"
                :loading="applying"
                @click="applyTask"
                style="border-radius: 12px; font-weight: 600"
            >
                立即申请
            </NButton>
            <NButton
                v-else-if="canComplete"
                type="primary"
                block
                size="large"
                :loading="completing"
                @click="completeTask"
                style="border-radius: 12px; font-weight: 600"
            >
                提交完成任务
            </NButton>
            <NButton
                v-else-if="canConfirmCompletion"
                type="primary"
                block
                size="large"
                :loading="confirming"
                @click="confirmTaskCompletion"
                style="border-radius: 12px; font-weight: 600"
            >
                确认完成任务
            </NButton>
            <NButton
                v-else-if="canRateTask"
                type="primary"
                block
                size="large"
                @click="openRateModal"
                style="border-radius: 12px; font-weight: 600"
            >
                评价承接人
            </NButton>
            <NButton
                v-else
                block
                size="large"
                disabled
                :class="{
                    'bottom-action-button--rejected': isRejectedApplication,
                    'bottom-action-button--submitted': isSubmittedAwaitingConfirm,
                }"
                style="border-radius: 12px"
            >
                {{ bottomActionText }}
            </NButton>
        </div>

        <div v-if="showRateModal" class="review-modal-mask" @click.self="showRateModal = false">
            <div class="review-modal">
                <div class="review-modal__head">
                    <strong>评价承接人</strong>
                    <button
                        type="button"
                        class="review-modal__close"
                        @click="showRateModal = false"
                    >
                        ×
                    </button>
                </div>
                <p class="review-modal__hint">
                    给 {{ assigneeName }} 一个评分，后续会展示在申请列表和用户详情中。
                </p>
                <div class="review-stars">
                    <button
                        v-for="star in 5"
                        :key="star"
                        type="button"
                        class="review-star"
                        :class="{ active: star <= taskRating }"
                        @click="taskRating = star"
                    >
                        ★
                    </button>
                </div>
                <NInput
                    v-model:value="taskRatingComment"
                    type="textarea"
                    placeholder="写一下你对这次协作的评价"
                    :rows="4"
                    maxlength="200"
                    show-count
                />
                <div class="review-modal__actions">
                    <NButton round @click="showRateModal = false">取消</NButton>
                    <NButton
                        type="primary"
                        round
                        :loading="submittingRating"
                        @click="submitTaskRating"
                    >
                        提交评价
                    </NButton>
                </div>
            </div>
        </div>

        <div
            v-if="showAdjustPriceModal"
            class="review-modal-mask"
            @click.self="showAdjustPriceModal = false"
        >
            <div class="review-modal">
                <div class="review-modal__head">
                    <strong>修改任务金额</strong>
                    <button
                        type="button"
                        class="review-modal__close"
                        @click="showAdjustPriceModal = false"
                    >
                        ×
                    </button>
                </div>
                <p class="review-modal__hint">
                    新金额高于当前金额时会额外冻结差额；低于当前金额时会自动解冻差额。
                </p>
                <NInput
                    :value="adjustedPrice === null ? '' : String(adjustedPrice)"
                    placeholder="请输入新的任务金额"
                    @update:value="
                        value =>
                            (adjustedPrice = Number(String(value).replace(/[^\d.]/g, '')) || null)
                    "
                />
                <NInput
                    v-model:value="adjustPricePassword"
                    type="password"
                    show-password-on="click"
                    placeholder="请输入 6 位支付密码"
                    maxlength="6"
                    style="margin-top: 12px"
                />
                <div class="review-modal__actions">
                    <NButton round @click="showAdjustPriceModal = false">取消</NButton>
                    <NButton
                        type="primary"
                        round
                        :loading="updatingPrice"
                        @click="submitAdjustedPrice"
                    >
                        确认修改
                    </NButton>
                </div>
            </div>
        </div>

        <div
            v-if="showCancellationRequestModal"
            class="review-modal-mask"
            @click.self="showCancellationRequestModal = false"
        >
            <div class="review-modal">
                <div class="review-modal__head">
                    <strong>发起取消协商</strong>
                    <button
                        type="button"
                        class="review-modal__close"
                        @click="showCancellationRequestModal = false"
                    >
                        ×
                    </button>
                </div>
                <p class="review-modal__hint">
                    {{ cancellationPanelDescription }}
                </p>
                <NInput
                    v-model:value="cancellationReason"
                    type="textarea"
                    placeholder="请说明取消原因，方便对方判断是否同意"
                    :rows="4"
                    maxlength="200"
                    show-count
                />
                <div class="review-modal__subcard">
                    <span>赔偿金额（选填）</span>
                    <p>{{ cancellationCompensationHint }}</p>
                    <NInput
                        :value="
                            cancellationCompensation === null
                                ? ''
                                : String(cancellationCompensation)
                        "
                        placeholder="不赔偿可留空或填写 0"
                        @update:value="
                            value =>
                                (cancellationCompensation =
                                    Number(String(value).replace(/[^\d.]/g, '')) || null)
                        "
                    />
                </div>
                <div class="review-modal__actions">
                    <NButton round @click="showCancellationRequestModal = false">取消</NButton>
                    <NButton
                        type="primary"
                        round
                        :loading="submittingCancellation"
                        @click="submitCancellationRequest"
                    >
                        提交协商
                    </NButton>
                </div>
            </div>
        </div>

        <div v-if="showTicketModal" class="review-modal-mask" @click.self="showTicketModal = false">
            <div class="review-modal">
                <div class="review-modal__head">
                    <strong>申请客服介入</strong>
                    <button type="button" class="review-modal__close" @click="showTicketModal = false">
                        ×
                    </button>
                </div>
                <p class="review-modal__hint">
                    工单创建后任务将进入争议处理中，双方都无法继续操作，请尽量把分歧描述清楚。
                </p>
                <NInput
                    v-model:value="cancellationTicketDescription"
                    type="textarea"
                    placeholder="补充说明争议点、沟通结果和你希望客服处理的方向"
                    :rows="4"
                    maxlength="240"
                    show-count
                />
                <div class="review-modal__actions">
                    <NButton round @click="showTicketModal = false">取消</NButton>
                    <NButton type="warning" round :loading="submittingTicket" @click="submitCancellationTicket">
                        提交工单
                    </NButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, onUnmounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
    NButton,
    NCard,
    NIcon,
    NInput,
    NSpace,
    NSpin,
    NTag,
    useDialog,
    useMessage,
} from 'naive-ui';
import { PersonOutline, TimeOutline } from '@vicons/ionicons5';
import { TaskApi, WalletApi, chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import type { Task, TaskApplication } from '@/types';

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const userStore = useUserStore();
const message = useMessage();
const dialog = useDialog();

const loading = ref(true);
const applicationLoading = ref(false);
const applying = ref(false);
const completing = ref(false);
const confirming = ref(false);
const processingId = ref<number | null>(null);
const processingAction = ref<'accept' | 'reject' | null>(null);
const taskError = ref('');
const paymentPassword = ref('');
const showRateModal = ref(false);
const submittingRating = ref(false);
const taskRating = ref(5);
const taskRatingComment = ref('');
const showAdjustPriceModal = ref(false);
const updatingPrice = ref(false);
const adjustedPrice = ref<number | null>(null);
const adjustPricePassword = ref('');
const showCancellationRequestModal = ref(false);
const submittingCancellation = ref(false);
const cancellationReason = ref('');
const cancellationCompensation = ref<number | null>(null);
const showTicketModal = ref(false);
const submittingTicket = ref(false);
const cancellationTicketDescription = ref('');
const countdownNow = ref(Date.now());
let countdownTimer: number | null = null;

const task = ref<Task | null>(null);
const applications = ref<TaskApplication[]>([]);

const taskId = computed(() => Number(route.params.id || 0));
const currentUserId = computed(() => Number(userStore.user?.id || 0));
const isPublisher = computed(() => task.value?.publisher_id === currentUserId.value);
const isAssignee = computed(() => task.value?.assignee_id === currentUserId.value);
const hasBlockingCancellationState = computed(
    () =>
        task.value?.cancellation_status === 'pending' ||
        task.value?.cancellation_status === 'disputed'
);
const canApply = computed(
    () =>
        !!task.value &&
        task.value.status === 'published' &&
        !isPublisher.value &&
        !task.value.assignee_id &&
        !task.value.has_applied
);
const canComplete = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        isAssignee.value &&
        !hasBlockingCancellationState.value &&
        !task.value.submit_time
);
const canConfirmCompletion = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        isPublisher.value &&
        !hasBlockingCancellationState.value &&
        Boolean(task.value.submit_time)
);
const canRateTask = computed(
    () =>
        !!task.value &&
        task.value.status === 'completed' &&
        isPublisher.value &&
        !!task.value.assignee_id &&
        !task.value.has_reviewed
);
const canAdjustPrice = computed(
    () => !!task.value && isPublisher.value && task.value.status === 'published'
);
const isCurrentCancellationInitiator = computed(
    () =>
        !!task.value &&
        Number(task.value.cancellation_initiator_id || 0) === Number(currentUserId.value)
);
const cancellationInitiatorIsPublisher = computed(
    () =>
        !!task.value &&
        Number(task.value.cancellation_initiator_id || 0) === Number(task.value.publisher_id || 0)
);
const canRequestCancellation = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        (isPublisher.value || isAssignee.value) &&
        !hasBlockingCancellationState.value
);
const canRespondCancellation = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        task.value.cancellation_status === 'pending' &&
        (isPublisher.value || isAssignee.value) &&
        !isCurrentCancellationInitiator.value
);
const canWithdrawCancellation = computed(
    () =>
        !!task.value &&
        task.value.cancellation_status === 'pending' &&
        isCurrentCancellationInitiator.value
);
const canCreateDisputeTicket = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        task.value.cancellation_status === 'rejected' &&
        (isPublisher.value || isAssignee.value) &&
        !task.value.cancellation_ticket_id
);
const canViewPublisherProfile = computed(
    () => !!task.value?.publisher?.id && task.value.publisher.id !== currentUserId.value
);
const isRejectedApplication = computed(
    () => task.value?.current_user_application_status === 'rejected'
);
const isSubmittedAwaitingConfirm = computed(
    () =>
        !!task.value &&
        task.value.status === 'in_progress' &&
        Boolean(task.value.submit_time) &&
        isAssignee.value
);
const cancellationRequesterLabel = computed(() => {
    if (!task.value) return '--';
    return cancellationInitiatorIsPublisher.value
        ? `发布者 ${publisherName.value}`
        : `承接人 ${assigneeName.value}`;
});
const cancellationCompensationText = computed(() => {
    const amount = Number(task.value?.cancellation_compensation || 0);
    return amount > 0 ? `¥${formatAmount(amount)}` : '不赔偿';
});
const cancellationCountdownText = computed(() => {
    const expiresAt = task.value?.cancellation_expires_at;
    if (!expiresAt || task.value?.cancellation_status !== 'pending') {
        return '--';
    }

    const diff = new Date(expiresAt).getTime() - countdownNow.value;
    if (diff <= 0) {
        return '已超时';
    }

    const totalSeconds = Math.floor(diff / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}小时 ${String(minutes).padStart(2, '0')}分 ${String(seconds).padStart(
        2,
        '0'
    )}秒`;
});
const cancellationNoticeTitle = computed(() => {
    if (!task.value) return '取消协商';
    if (task.value.cancellation_status === 'pending') {
        return isCurrentCancellationInitiator.value ? '你已发起取消协商' : '对方发起了取消协商';
    }
    if (task.value.cancellation_status === 'rejected') {
        return '取消协商已被拒绝';
    }
    if (task.value.cancellation_status === 'disputed') {
        return '任务已进入争议处理中';
    }
    return '取消协商';
});
const cancellationNoticeDescription = computed(() => {
    if (!task.value) return '';
    if (task.value.cancellation_status === 'pending') {
        return isCurrentCancellationInitiator.value
            ? '你发出的取消申请正在等待对方确认，期间任务相关操作会被暂时锁定。'
            : '请在 48 小时内决定是否同意取消。超时未处理，本次协商会自动失效。';
    }
    if (task.value.cancellation_status === 'rejected') {
        return '协商未达成一致，任务已恢复正常流程。若仍有争议，可以提交客服工单。';
    }
    if (task.value.cancellation_status === 'disputed') {
        return '客服工单已创建，等待平台介入处理前，双方都无法继续操作任务。';
    }
    return '';
});
const cancellationNoticeTag = computed(() => {
    if (task.value?.cancellation_status === 'pending') return '待确认';
    if (task.value?.cancellation_status === 'rejected') return '已拒绝';
    if (task.value?.cancellation_status === 'disputed') return '争议中';
    return '取消协商';
});
const cancellationPanelTitle = computed(() =>
    isPublisher.value ? '如需取消任务，可先和承接人协商补偿方案。' : '如果无法继续承接，可向雇主发起取消协商。'
);
const cancellationPanelDescription = computed(() =>
    isPublisher.value
        ? '你可填写补偿金额，确认后会从当前冻结金额中支付给承接人，剩余金额退回你的钱包。'
        : '你可填写愿意承担的赔偿金额。对方同意后，任务冻结金额会全额退回雇主，赔偿会从你的余额中扣除。'
);
const cancellationCompensationHint = computed(() =>
    isPublisher.value
        ? '赔偿金额将从当前任务冻结金额中划给承接人，最高不能超过任务金额。'
        : '赔偿金额会在对方同意后从你的余额扣除并转给雇主，不赔偿可留空。'
);
const bottomActionText = computed(() => {
    if (!task.value) {
        return '暂不可操作';
    }

    if (task.value.cancellation_status === 'pending') {
        return isCurrentCancellationInitiator.value ? '取消协商已发出' : '待你确认取消申请';
    }

    if (task.value.cancellation_status === 'disputed') {
        return '任务争议处理中';
    }

    if (isPublisher.value) {
        if (task.value.status === 'in_progress' && task.value.submit_time) {
            return '申请人已提交，待你确认';
        }
        return task.value.status === 'in_progress' ? '任务进行中' : '这是你发布的任务';
    }

    if (task.value.current_user_application_status === 'accepted') {
        if (task.value.status === 'in_progress' && task.value.submit_time) {
            return '已提交完成，等待发布者确认';
        }
        return '你已被录用';
    }

    if (task.value.current_user_application_status === 'rejected') {
        return '申请未通过';
    }

    if (task.value.current_user_application_status === 'pending') {
        return '已申请，等待处理';
    }

    if (task.value.status === 'in_progress') {
        return '任务进行中，暂不可再申请';
    }

    if (task.value.status === 'completed') {
        return task.value.has_reviewed ? '任务已完成，已评价' : '任务已完成';
    }

    if (task.value.status === 'cancelled') {
        return '任务已取消';
    }

    if (task.value.status === 'expired') {
        return '任务已过期';
    }

    return '暂不可申请';
});

const publisherName = computed(
    () => task.value?.publisher?.real_name || task.value?.publisher?.username || '匿名用户'
);

const assigneeName = computed(
    () => task.value?.assignee?.real_name || task.value?.assignee?.username || '承接人'
);

const getCategoryLabel = (cat: string) =>
    ({
        study: '学习辅导类',
        design: '艺术设计类',
        tech: '专业技术类',
        writing: '文章编辑类',
        life: '生活服务类',
    })[cat] ?? '任务';

const getStatusLabel = (status: string) =>
    ({
        pending: '审核中',
        published: '招募中',
        in_progress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
        expired: '已过期',
    })[status] ?? status;

const getDisplayStatusLabel = (currentTask?: Task | null) => {
    if (!currentTask) return '任务';
    if (currentTask.cancellation_status === 'pending') return '待确认取消';
    if (currentTask.cancellation_status === 'disputed') return '争议处理中';
    return getStatusLabel(currentTask.status);
};

const getApplicationStatusLabel = (status: string) =>
    ({ pending: '待处理', accepted: '已同意', rejected: '已拒绝' })[status] ?? status;

const resolveAvatarUrl = (value?: string | null) => {
    if (!value) return undefined;
    if (/^https?:\/\//i.test(value) || value.startsWith('data:')) {
        return value;
    }
    if (value.startsWith('/uploads/')) {
        return `${window.location.origin}${value}`;
    }
    return value;
};

const formatAmount = (value?: string | number | null) => Number(value || 0).toFixed(2);
const formatRating = (value?: string | number | null) => Number(value || 0).toFixed(2);

const formatDateTime = (value?: string | null) => {
    if (!value) return '--';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '--';
    return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(
        2,
        '0'
    )}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const formatRelativeTime = (value?: string | null) => {
    if (!value) return '--';
    const diff = Date.now() - new Date(value).getTime();
    if (diff < 3600000) return `${Math.max(1, Math.floor(diff / 60000))} 分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
    return `${Math.floor(diff / 86400000)} 天前`;
};

const getApplicantName = (application: TaskApplication) =>
    application.applicant?.real_name || application.applicant?.username || '申请者';

const getCancellationAcceptanceText = () => {
    if (!task.value) return '确认后任务将立即取消。';
    const compensationText = cancellationCompensationText.value;

    if (cancellationInitiatorIsPublisher.value) {
        return `同意后任务会立即取消，${compensationText === '不赔偿' ? '冻结金额将全部退回给发布者。' : `${compensationText} 会从当前冻结金额中支付给承接人，剩余金额退回发布者。`}`;
    }

    return `同意后任务会立即取消，当前冻结金额将全额退回给发布者，${compensationText === '不赔偿' ? '不会再额外扣款。' : `${compensationText} 会从承接人余额中扣除并转给发布者。`}`;
};

const goToUserProfile = (userId?: number) => {
    if (!userId) return;
    router.push(`/users/${userId}`);
};

const openAdjustPriceModal = () => {
    if (!task.value) return;
    adjustedPrice.value = Number(task.value.price || 0);
    adjustPricePassword.value = '';
    showAdjustPriceModal.value = true;
};

const openCancellationRequestModal = () => {
    cancellationReason.value = task.value?.cancellation_reason || '';
    cancellationCompensation.value = Number(task.value?.cancellation_compensation || 0) || null;
    showCancellationRequestModal.value = true;
};

const openTicketModal = () => {
    cancellationTicketDescription.value = task.value?.cancellation_reason
        ? `协商取消原因：${task.value.cancellation_reason}`
        : '';
    showTicketModal.value = true;
};

const fetchTask = async () => {
    if (!taskId.value) {
        loading.value = false;
        return;
    }

    loading.value = true;
    taskError.value = '';
    try {
        const response = await TaskApi.getTask(taskId.value);
        if (!response.success || !response.data) {
            throw new Error(response.message || '获取任务详情失败');
        }
        task.value = response.data;
    } catch (error: any) {
        taskError.value = error?.message || '获取任务详情失败';
        task.value = null;
    } finally {
        loading.value = false;
    }
};

const fetchApplications = async () => {
    if (!taskId.value || !isPublisher.value) {
        applications.value = [];
        return;
    }

    applicationLoading.value = true;
    try {
        const response = await TaskApi.getTaskApplications(taskId.value);
        if (!response.success) {
            throw new Error(response.message || '获取申请列表失败');
        }
        applications.value = Array.isArray(response.data) ? response.data : [];
    } catch (error: any) {
        applications.value = [];
        message.error(error?.message || '获取申请列表失败');
    } finally {
        applicationLoading.value = false;
    }
};

const refreshDetail = async () => {
    await fetchTask();
    await fetchApplications();
};

const applyTask = async () => {
    if (!task.value || applying.value) return;
    applying.value = true;
    try {
        const response = await TaskApi.applyTask(task.value.id, {
            message: `想承接任务「${task.value.title}」，可以进一步沟通细节。`,
        });
        if (!response.success) throw new Error(response.message || '申请失败');
        message.success('申请已提交');
        if (task.value) {
            task.value.has_applied = true;
            task.value.current_user_application_status = 'pending';
        }
        await chatWithUser(
            task.value.publisher_id,
            `想咨询任务「${task.value.title}」的具体要求和细节。`,
            false
        );
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '申请失败');
    } finally {
        applying.value = false;
    }
};

const completeTask = async () => {
    if (!task.value || completing.value) return;
    dialog.warning({
        title: '确认提交完成任务',
        content: '提交后将通知发布者进行确认，确认前你将不能再次发起完成申请。',
        positiveText: '确认提交',
        negativeText: '取消',
        async onPositiveClick() {
            completing.value = true;
            try {
                const response = await TaskApi.completeTask(task.value!.id, {});
                if (!response.success) throw new Error(response.message || '提交失败');
                task.value!.submit_time = new Date().toISOString();
                message.success('已提交完成申请，请等待发布者确认');
                await refreshDetail();
            } catch (error: any) {
                message.error(error?.message || '提交失败');
            } finally {
                completing.value = false;
            }
        },
    });
};

const openSetPaymentPasswordDialog = () => {
    dialog.info({
        title: '请先设置支付密码',
        positiveText: '前往设置',
        negativeText: '取消',
        content: '确认任务完成前需要先设置6位数字支付密码，设置时需验证账户密码。',
        onPositiveClick() {
            router.push('/wallet/payment-settings');
        },
    });
};

const openTaskPaymentDialog = () => {
    if (!task.value) return;

    paymentPassword.value = '';

    dialog.warning({
        title: '确认支付任务报酬',
        positiveText: '确认支付',
        negativeText: '取消',
        content: () =>
            h('div', { style: 'display:flex;flex-direction:column;gap:12px;' }, [
                h(
                    'p',
                    { style: 'margin:0;color:#0f172a;font-size:14px;font-weight:600;' },
                    `确认申请人已经完成任务后，将支付 ¥${formatAmount(task.value?.price)}`
                ),
                h(
                    'p',
                    { style: 'margin:0;color:#64748b;font-size:13px;line-height:1.6;' },
                    '本次将优先解冻已冻结的任务金额并完成支付，确认后不可撤回。'
                ),
                h(NInput, {
                    value: paymentPassword.value,
                    type: 'password',
                    maxlength: 6,
                    showPasswordOn: 'click',
                    placeholder: '请输入6位支付密码',
                    onUpdateValue: (value: string) => {
                        paymentPassword.value = value.replace(/\D/g, '').slice(0, 6);
                    },
                }),
            ]),
        async onPositiveClick() {
            if (!task.value) return false;
            if (!/^\d{6}$/.test(paymentPassword.value)) {
                message.warning('请输入6位数字支付密码');
                return false;
            }

            try {
                confirming.value = true;
                const response = await TaskApi.confirmTask(task.value.id, {
                    payment_password: paymentPassword.value,
                });
                if (!response.success) throw new Error(response.message || '确认失败');
                message.success('任务已确认完成并完成支付');
                await refreshDetail();
                return true;
            } catch (error: any) {
                message.error(error?.message || '确认失败');
                return false;
            } finally {
                confirming.value = false;
            }
        },
    });
};

const confirmTaskCompletion = async () => {
    if (!task.value || confirming.value) return;

    try {
        confirming.value = true;
        const overviewResponse = await WalletApi.getOverview();
        if (!overviewResponse.success || !overviewResponse.data) {
            throw new Error(overviewResponse.message || '获取支付信息失败');
        }
        confirming.value = false;

        if (!overviewResponse.data.wallet.payment_password_set) {
            openSetPaymentPasswordDialog();
            return;
        }

        openTaskPaymentDialog();
    } catch (error: any) {
        confirming.value = false;
        message.error(error?.message || '获取支付信息失败');
    }
};

const openRateModal = () => {
    taskRating.value = 5;
    taskRatingComment.value = '';
    showRateModal.value = true;
};

const submitAdjustedPrice = async () => {
    if (!task.value || !canAdjustPrice.value || updatingPrice.value) return;

    const nextPrice = Number(adjustedPrice.value || 0);
    if (!nextPrice || nextPrice <= 0) {
        message.warning('请输入大于 0 的任务金额');
        return;
    }
    if (!/^\d{6}$/.test(adjustPricePassword.value)) {
        message.warning('请输入 6 位支付密码');
        return;
    }

    updatingPrice.value = true;
    try {
        const response = await TaskApi.updateTask(task.value.id, {
            price: nextPrice,
            payment_password: adjustPricePassword.value,
        });
        if (!response.success || !response.data) {
            throw new Error(response.message || '修改金额失败');
        }
        task.value = response.data;
        showAdjustPriceModal.value = false;
        message.success('任务金额已更新');
    } catch (error: any) {
        message.error(error?.message || '修改金额失败');
    } finally {
        updatingPrice.value = false;
    }
};

const submitCancellationRequest = async () => {
    if (!task.value || !canRequestCancellation.value || submittingCancellation.value) return;

    const normalizedReason = cancellationReason.value.trim();
    const compensation = Number(cancellationCompensation.value || 0);

    if (!normalizedReason) {
        message.warning('请输入取消原因');
        return;
    }

    if (compensation < 0) {
        message.warning('赔偿金额不能小于 0');
        return;
    }

    submittingCancellation.value = true;
    try {
        const response = await TaskApi.requestCancellation(task.value.id, {
            reason: normalizedReason,
            compensation,
        });
        if (!response.success) {
            throw new Error(response.message || '发起取消协商失败');
        }
        showCancellationRequestModal.value = false;
        message.success('取消申请已发出');
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '发起取消协商失败');
    } finally {
        submittingCancellation.value = false;
    }
};

const confirmRespondCancellation = (action: 'accept' | 'reject') => {
    if (!task.value || !canRespondCancellation.value) return;

    dialog.warning({
        title: action === 'accept' ? '确认同意取消' : '确认拒绝取消',
        content:
            action === 'accept'
                ? getCancellationAcceptanceText()
                : '拒绝后任务会恢复正常进行。若仍有争议，后续可继续提交客服工单。',
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const response = await TaskApi.respondCancellation(task.value!.id, { action });
                if (!response.success) {
                    throw new Error(response.message || '处理取消协商失败');
                }
                message.success(action === 'accept' ? '已同意取消，任务已结束' : '已拒绝取消申请');
                await refreshDetail();
                return true;
            } catch (error: any) {
                message.error(error?.message || '处理取消协商失败');
                return false;
            }
        },
    });
};

const confirmWithdrawCancellation = () => {
    if (!task.value || !canWithdrawCancellation.value) return;

    dialog.warning({
        title: '确认撤回取消申请',
        content: '撤回后任务会恢复正常流程，后续如有需要可以重新发起取消协商。',
        positiveText: '确认撤回',
        negativeText: '取消',
        async onPositiveClick() {
            try {
                const response = await TaskApi.withdrawCancellation(task.value!.id);
                if (!response.success) {
                    throw new Error(response.message || '撤回取消申请失败');
                }
                message.success('取消申请已撤回');
                await refreshDetail();
                return true;
            } catch (error: any) {
                message.error(error?.message || '撤回取消申请失败');
                return false;
            }
        },
    });
};

const submitCancellationTicket = async () => {
    if (!task.value || !canCreateDisputeTicket.value || submittingTicket.value) return;

    submittingTicket.value = true;
    try {
        const response = await TaskApi.createCancellationTicket(task.value.id, {
            description: cancellationTicketDescription.value.trim() || undefined,
        });
        if (!response.success) {
            throw new Error(response.message || '创建工单失败');
        }
        showTicketModal.value = false;
        message.success('争议工单已创建');
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '创建工单失败');
    } finally {
        submittingTicket.value = false;
    }
};

const submitTaskRating = async () => {
    if (!task.value || !canRateTask.value || submittingRating.value) return;
    if (taskRating.value < 1 || taskRating.value > 5) {
        message.warning('请选择 1 到 5 星评分');
        return;
    }

    submittingRating.value = true;
    try {
        const response = await TaskApi.rateTask(task.value.id, {
            rating: taskRating.value,
            comment: taskRatingComment.value.trim() || undefined,
        });
        if (!response.success) {
            throw new Error(response.message || '评价失败');
        }
        showRateModal.value = false;
        message.success('评价成功');
        await refreshDetail();
    } catch (error: any) {
        message.error(error?.message || '评价失败');
    } finally {
        submittingRating.value = false;
    }
};

const processApplication = (application: TaskApplication, action: 'accept' | 'reject') => {
    if (!task.value) return;

    dialog.warning({
        title: action === 'accept' ? '同意申请' : '拒绝申请',
        content:
            action === 'accept'
                ? `确认选择 ${getApplicantName(application)} 承接这个任务吗？`
                : `确认拒绝 ${getApplicantName(application)} 的申请吗？`,
        positiveText: '确认',
        negativeText: '取消',
        async onPositiveClick() {
            processingId.value = application.id;
            processingAction.value = action;
            try {
                const response = await TaskApi.processApplication(
                    task.value!.id,
                    application.id,
                    action
                );
                if (!response.success) {
                    throw new Error(response.message || '处理申请失败');
                }
                message.success(action === 'accept' ? '已同意申请' : '已拒绝申请');
                await refreshDetail();
            } catch (error: any) {
                message.error(error?.message || '处理申请失败');
            } finally {
                processingId.value = null;
                processingAction.value = null;
            }
        },
    });
};

const chatWithUser = async (peerUserId: number, initialMessage = '', navigate = true) => {
    if (!peerUserId || peerUserId === currentUserId.value) return;
    try {
        const response = await chatApi.createConversation({
            peer_user_id: peerUserId,
            task_id: taskId.value,
            initial_message: initialMessage,
        });
        if (!response.success || !response.data?.id) {
            throw new Error(response.message || '打开会话失败');
        }
        if (navigate) {
            router.push(`/chat?conversationId=${response.data.id}`);
        }
    } catch (error: any) {
        message.error(error?.message || '打开会话失败');
    }
};

onMounted(async () => {
    countdownTimer = window.setInterval(() => {
        countdownNow.value = Date.now();
    }, 1000);
    await refreshDetail();
});

onUnmounted(() => {
    if (countdownTimer !== null) {
        window.clearInterval(countdownTimer);
    }
});
</script>

<style scoped>
.task-detail-page {
    background-color: #f7f9fc;
    min-height: 100vh;
    padding-bottom: calc(118px + env(safe-area-inset-bottom)); /* 预留底部固定操作栏空间 */
}

/* 顶部导航：紧凑风格 */
.top-nav {
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(12px);
    padding: 16px 16px 14px;
    border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}
.nav-back-group {
    display: flex;
    align-items: center;
    cursor: pointer;
    width: fit-content;
    min-height: 28px;
}
.nav-title {
    font-size: 18px;
    font-weight: 700;
    color: #1a1a1a;
    margin-left: 6px;
}

/* 容器 */
.detail-container {
    padding: 16px 16px 28px;
}

/* 模仿图2左侧蓝色竖条 */
.category-tag {
    display: flex;
    align-items: center;
    gap: 6px;
}
.blue-bar {
    width: 3.5px;
    height: 15px;
    background-color: #3b82f6;
    border-radius: 2px;
}
.cat-text {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
}

/* 标题与内容 */
.task-title {
    font-size: 24px;
    font-weight: 800;
    color: #0f172a;
    margin: 12px 0 8px 0;
}
.task-desc {
    font-size: 15px;
    color: #475569;
    line-height: 1.6;
}

.divider {
    height: 1px;
    background-color: #f1f5f9;
    margin: 20px 0;
}

/* 元数据行 */
.meta-row {
    display: flex;
    align-items: center;
    gap: 20px;
}
.price-text {
    font-size: 22px;
    font-weight: 800;
    color: #3b82f6;
}
.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    color: #64748b;
    font-size: 14px;
}
.deadline-note {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 8px;
}

.cancellation-notice-card {
    border: 1px solid rgba(59, 130, 246, 0.12);
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
}

.cancellation-notice-card--rejected {
    border-color: rgba(245, 158, 11, 0.18);
    background: linear-gradient(180deg, #fffdf7 0%, #fff7e6 100%);
}

.cancellation-notice-card--disputed {
    border-color: rgba(239, 68, 68, 0.16);
    background: linear-gradient(180deg, #fffafa 0%, #fff1f2 100%);
}

.cancellation-notice__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.cancellation-notice__heading strong {
    display: block;
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
}

.cancellation-notice__heading p {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
}

.cancellation-notice__meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 12px;
    margin-top: 16px;
}

.cancellation-notice__stat {
    padding: 12px 14px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.86);
    border: 1px solid rgba(148, 163, 184, 0.16);
}

.cancellation-notice__stat span {
    display: block;
    font-size: 11px;
    color: #94a3b8;
}

.cancellation-notice__stat strong {
    display: block;
    margin-top: 6px;
    font-size: 14px;
    color: #0f172a;
}

.cancellation-notice__reason {
    margin-top: 16px;
    padding: 14px 16px;
    border-radius: 18px;
    background: rgba(255, 255, 255, 0.82);
    border: 1px solid rgba(148, 163, 184, 0.14);
}

.cancellation-notice__reason span {
    display: block;
    font-size: 12px;
    color: #64748b;
}

.cancellation-notice__reason p {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.8;
    color: #334155;
}

.cancellation-notice__actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px;
    margin-top: 16px;
}

.cancellation-notice__ticket {
    font-size: 12px;
    color: #475569;
}

/* 用户信息 */
.user-info-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
}
.user-avatar {
    border-radius: 999px;
    overflow: hidden;
    flex-shrink: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: linear-gradient(135deg, #dbeafe, #e2e8f0);
    color: #475569;
    font-weight: 700;
}
.user-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}
.user-avatar--md {
    width: 48px;
    height: 48px;
    min-width: 48px;
    min-height: 48px;
}
.user-avatar--sm {
    width: 42px;
    height: 42px;
    min-width: 42px;
    min-height: 42px;
}
.user-info-wrapper--interactive,
.application-user--interactive {
    cursor: pointer;
}
.user-main {
    flex: 1;
}
.name-line {
    display: flex;
    align-items: center;
    gap: 8px;
}
.username {
    font-weight: 600;
    font-size: 15px;
}
.rating {
    font-size: 12px;
    color: #64748b;
}
.major {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;
}

/* 底部固定栏 */
.bottom-action-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 20px 30px;
    background: white;
    box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.03);
    z-index: 90;
}

:deep(.bottom-action-button--rejected.n-button) {
    background: rgba(239, 68, 68, 0.1);
    border-color: rgba(239, 68, 68, 0.22);
}

:deep(.bottom-action-button--rejected.n-button .n-button__content) {
    color: #dc2626;
}

:deep(.bottom-action-button--submitted.n-button) {
    background: rgba(59, 130, 246, 0.1);
    border-color: rgba(59, 130, 246, 0.22);
}

:deep(.bottom-action-button--submitted.n-button .n-button__content) {
    color: #2563eb;
}

.application-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.application-card {
    padding: 14px 0;
    border-bottom: 1px solid #eef2f7;
}

.application-card:last-child {
    border-bottom: 0;
    padding-bottom: 0;
}

.application-main {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
}

.application-user {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    min-width: 0;
    flex: 1;
}

.application-copy {
    min-width: 0;
}

.application-title-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
}

.application-copy strong {
    font-size: 15px;
    font-weight: 700;
    color: #0f172a;
}

.application-copy p {
    margin: 6px 0 0;
    font-size: 13px;
    color: #64748b;
}

.application-copy span {
    display: inline-block;
    margin-top: 6px;
    font-size: 12px;
    color: #94a3b8;
}
.application-metrics {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
    align-items: center;
}
.application-metrics span {
    margin-top: 0;
    padding: 4px 8px;
    border-radius: 999px;
    background: #eef4ff;
    color: #3b82f6;
    font-size: 12px;
    white-space: nowrap;
}

.application-actions {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    flex-shrink: 0;
    padding-top: 2px;
}

.task-review-summary {
    margin-top: 14px;
    padding: 14px 16px;
    border-radius: 16px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}

.task-review-summary__score {
    font-size: 13px;
    font-weight: 700;
    color: #2563eb;
}

.task-review-summary p {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 1.7;
    color: #475569;
}

.price-adjust-card {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.cancellation-panel {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
}

.cancellation-panel__copy {
    flex: 1;
}

.cancellation-panel__copy strong {
    display: block;
    font-size: 16px;
    color: #0f172a;
}

.cancellation-panel__copy p {
    margin: 8px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
}

.price-adjust-main {
    flex: 1;
}

.price-adjust-main span {
    display: block;
    font-size: 12px;
    color: #94a3b8;
}

.price-adjust-main strong {
    display: block;
    margin-top: 6px;
    font-size: 28px;
    line-height: 1;
    color: #2563eb;
}

.price-adjust-main p {
    margin: 10px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
}

.application-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 72px;
}

.application-state--text {
    color: #94a3b8;
    font-size: 13px;
}

.review-modal-mask {
    position: fixed;
    inset: 0;
    z-index: 120;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    background: rgba(15, 23, 42, 0.46);
}

.review-modal {
    width: min(100%, 460px);
    padding: 20px;
    border-radius: 24px;
    background: #fff;
    box-shadow: 0 24px 50px rgba(15, 23, 42, 0.18);
}

.review-modal__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.review-modal__head strong {
    font-size: 20px;
    font-weight: 800;
    color: #0f172a;
}

.review-modal__close {
    width: 36px;
    height: 36px;
    border: none;
    border-radius: 999px;
    background: #f1f5f9;
    color: #475569;
    font-size: 22px;
}

.review-modal__hint {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
}

.review-modal__subcard {
    margin-top: 14px;
    padding: 14px;
    border-radius: 18px;
    background: #f8fbff;
    border: 1px solid #e6edf7;
}

.review-modal__subcard span {
    display: block;
    font-size: 13px;
    font-weight: 700;
    color: #0f172a;
}

.review-modal__subcard p {
    margin: 8px 0 12px;
    font-size: 12px;
    line-height: 1.7;
    color: #64748b;
}

.review-stars {
    display: flex;
    gap: 10px;
    margin: 18px 0 16px;
}

.review-star {
    border: none;
    background: transparent;
    color: #cbd5e1;
    font-size: 30px;
    line-height: 1;
}

.review-star.active {
    color: #f59e0b;
}

.review-modal__actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;
    margin-top: 16px;
}
@media (max-width: 640px) {
    .cancellation-notice__header,
    .cancellation-panel {
        flex-direction: column;
        align-items: stretch;
    }

    .cancellation-notice__meta {
        grid-template-columns: 1fr;
    }

    .price-adjust-card {
        flex-direction: column;
        align-items: stretch;
    }

    .application-main {
        flex-direction: column;
        align-items: stretch;
    }

    .application-user {
        width: 100%;
    }

    .application-actions {
        width: 100%;
        justify-content: flex-end;
        padding-top: 0;
    }
}
</style>
