<template>
    <div class="campus-create-task" :class="{ 'is-dark': appStore.isDark }">
        <header class="campus-nav-sticky">
            <div class="nav-back-group" @click="router.back()">
                <svg viewBox="0 0 24 24" class="icon-svg">
                    <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z" fill="currentColor" />
                </svg>
                <span class="nav-title">发布任务</span>
            </div>
        </header>

        <main class="task-viewport">
            <div class="config-stack">
                <section class="form-card">
                    <div class="field-node">
                        <label class="field-label">任务分类</label>
                        <div class="category-grid">
                            <button
                                v-for="item in categoryOptions"
                                :key="item.value"
                                type="button"
                                class="category-chip touch-feedback"
                                :class="{ active: form.category === item.value }"
                                @click="form.category = item.value"
                            >
                                {{ item.label }}
                            </button>
                        </div>
                    </div>
                </section>

                <section class="form-card">
                    <div class="field-node">
                        <label class="field-label">任务标题</label>
                        <NInput
                            v-model:value="form.title"
                            placeholder="一句话说明你需要什么帮助"
                            maxlength="50"
                            show-count
                        />
                    </div>

                    <div class="field-node mt-16">
                        <label class="field-label">任务描述</label>
                        <NInput
                            v-model:value="form.description"
                            type="textarea"
                            placeholder="描述任务内容、交付要求、注意事项"
                            :rows="4"
                            maxlength="500"
                            show-count
                        />
                    </div>

                    <div class="field-node mt-16">
                        <label class="field-label">技能要求（可选）</label>
                        <NInput
                            v-model:value="skillsText"
                            placeholder="例如：PS，Vue，英语翻译，逗号分隔"
                        />
                    </div>

                    <div class="field-node mt-16">
                        <label class="field-label">补充要求（可选）</label>
                        <NInput
                            v-model:value="form.requirements"
                            type="textarea"
                            placeholder="写清经验要求、交付格式等"
                            :rows="3"
                            maxlength="300"
                            show-count
                        />
                    </div>
                </section>

                <section class="form-card">
                    <div class="field-grid">
                        <div class="field-node">
                            <label class="field-label">任务报酬</label>
                            <NInputNumber
                                v-model:value="form.price"
                                :min="1"
                                :precision="2"
                                style="width: 100%"
                            />
                        </div>
                        <div class="field-node">
                            <label class="field-label">人数上限</label>
                            <NInputNumber
                                v-model:value="form.max_applicants"
                                :min="1"
                                :max="20"
                                style="width: 100%"
                            />
                        </div>
                    </div>

                    <div class="field-grid mt-16">
                        <div class="field-node">
                            <label class="field-label">截止时间</label>
                            <NDatePicker
                                v-model:value="deadlineValue"
                                type="datetime"
                                style="width: 100%"
                            />
                        </div>
                    </div>

                    <div class="field-grid mt-16">
                        <div class="field-node">
                            <label class="field-label">地点（可选）</label>
                            <NInput
                                v-model:value="form.location"
                                placeholder="线下任务可填写具体地点"
                            />
                        </div>
                        <div class="field-node">
                            <label class="field-label">预计时长（小时，可选）</label>
                            <NInputNumber
                                v-model:value="form.estimated_duration"
                                :min="1"
                                :max="200"
                                style="width: 100%"
                            />
                        </div>
                    </div>
                </section>

                <section class="form-card">
                    <div class="field-node">
                        <label class="field-label">任务选项</label>
                        <div class="option-row">
                            <label class="check-line">
                                <NCheckbox v-model:checked="form.urgent" />
                                <span>加急任务</span>
                            </label>
                            <label class="check-line">
                                <NCheckbox v-model:checked="form.remote_work" />
                                <span>支持远程</span>
                            </label>
                        </div>
                    </div>

                    <button
                        type="button"
                        class="advanced-trigger touch-feedback"
                        @click="showAdvanced = !showAdvanced"
                    >
                        <span>{{ showAdvanced ? '收起更多信息' : '补充标签和附件（可选）' }}</span>
                        <i :class="{ 'is-open': showAdvanced }"></i>
                    </button>

                    <div v-if="showAdvanced" class="advanced-pane">
                        <div class="field-node">
                            <label class="field-label">任务标签（可选）</label>
                            <NInput
                                v-model:value="tagsText"
                                placeholder="例如：长期，急单，论文，设计，逗号分隔"
                            />
                        </div>

                        <div class="field-node mt-16">
                            <label class="field-label">附件链接（可选）</label>
                            <NInput
                                v-model:value="attachmentsText"
                                type="textarea"
                                placeholder="每行一个附件地址"
                                :rows="3"
                            />
                        </div>

                        <div class="field-node mt-16">
                            <label class="field-label">图片链接（可选）</label>
                            <NInput
                                v-model:value="imagesText"
                                type="textarea"
                                placeholder="每行一个图片地址"
                                :rows="3"
                            />
                        </div>

                    </div>
                </section>
            </div>

            <footer class="action-footer">
                <div class="summary-line">
                    <div class="total-label">任务报酬</div>
                    <div class="total-val">¥{{ summaryPrice }}</div>
                </div>
                <div v-if="normalizedPointsToUse > 0" class="summary-note">
                    积分抵扣 ¥{{ pointsDiscountAmount }}，实际冻结 ¥{{ cashToFreeze }}
                </div>
                <NButton
                    type="primary"
                    block
                    size="large"
                    round
                    class="submit-btn"
                    :loading="submitting"
                    @click="submitTask"
                >
                    发布任务
                </NButton>
            </footer>
        </main>
        <MobileModal
            v-model:show="showPaymentSheet"
            title="选择支付方式"
            bottom-sheet
            :show-footer="true"
            confirm-text="确认支付方式"
            :loading="submitting"
            @confirm="confirmPaymentPlan"
        >
            <div class="payment-sheet">
                <div class="payment-sheet__account">
                    <span>余额 ¥{{ Number(userStore.user?.balance || 0).toFixed(2) }}</span>
                    <span>积分 {{ availablePoints }}</span>
                </div>
                <button
                    type="button"
                    class="payment-sheet__option"
                    :class="{ 'is-active': paymentMode === 'balance' }"
                    @click="paymentMode = 'balance'"
                >
                    <span class="payment-sheet__check">✓</span>
                    <strong>余额支付</strong>
                    <span>余额 ¥{{ summaryPrice }}</span>
                </button>
                <button
                    type="button"
                    class="payment-sheet__option"
                    :class="{
                        'is-active': paymentMode === 'balance_points',
                        'is-disabled': !pointsPaymentAvailable,
                    }"
                    :disabled="!pointsPaymentAvailable"
                    @click="selectPointsPayment"
                >
                    <span class="payment-sheet__check">✓</span>
                    <strong>余额 + 积分抵扣</strong>
                    <span v-if="pointsPaymentAvailable">
                        余额 ¥{{ cashToFreeze }} + 积分 {{ normalizedPointsToUse || maxUsablePoints }}
                    </span>
                    <span v-else>积分不足</span>
                </button>

                <div
                    v-if="paymentMode === 'balance_points' && pointsPaymentAvailable"
                    class="payment-sheet__points"
                >
                    <p class="payment-sheet__hint">
                        本次自动抵扣 {{ normalizedPointsToUse }} 积分，抵扣 ¥{{ pointsDiscountAmount }}
                    </p>
                </div>

                <div class="payment-sheet__summary">
                    <div>
                        <span>任务报酬</span>
                        <strong>¥{{ summaryPrice }}</strong>
                    </div>
                    <div>
                        <span>实际冻结</span>
                        <strong>¥{{ cashToFreeze }}</strong>
                    </div>
                </div>
            </div>
        </MobileModal>
        <MobileModal
            v-model:show="showPasswordSheet"
            title="输入支付密码"
            bottom-sheet
            :show-footer="true"
            confirm-text="确认支付"
            :loading="submitting"
            @confirm="submitTaskPayment"
        >
            <div class="payment-sheet">
                <div class="payment-sheet__summary payment-sheet__summary--compact">
                    <div>
                        <span>支付方式</span>
                        <strong>{{ paymentModeLabel }}</strong>
                    </div>
                    <div>
                        <span>实际冻结</span>
                        <strong>¥{{ cashToFreeze }}</strong>
                    </div>
                </div>
                <div class="pin-input" @click="focusPaymentPasswordInput">
                    <div
                        v-for="index in 6"
                        :key="index"
                        class="pin-input__cell"
                        :class="{ 'is-filled': Boolean(paymentPassword[index - 1]) }"
                    >
                        {{ paymentPassword[index - 1] ? '•' : '' }}
                    </div>
                    <input
                        ref="paymentPasswordInputRef"
                        v-model="paymentPassword"
                        class="pin-input__native"
                        inputmode="numeric"
                        maxlength="6"
                        autocomplete="one-time-code"
                        @input="handlePaymentPasswordInput"
                    />
                </div>
            </div>
        </MobileModal>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import {
    NButton,
    NCheckbox,
    NDatePicker,
    NInput,
    NInputNumber,
    useDialog,
    useMessage,
} from 'naive-ui';
import { TaskApi, WalletApi } from '@/api';
import MobileModal from '@/components/mobile/MobileModal.vue';
import { useAppStore, useUserStore } from '@/stores';
import type { CreateTaskData } from '@/types';

const router = useRouter();
const appStore = useAppStore();
const message = useMessage();
const dialog = useDialog();
const userStore = useUserStore();

const submitting = ref(false);
const showAdvanced = ref(false);
const showPaymentSheet = ref(false);
const showPasswordSheet = ref(false);
const deadlineValue = ref<number | null>(null);
const tagsText = ref('');
const skillsText = ref('');
const attachmentsText = ref('');
const imagesText = ref('');
const paymentPassword = ref('');
const paymentPasswordInputRef = ref<HTMLInputElement | null>(null);
const paymentMode = ref<'balance' | 'balance_points'>('balance');

const categoryOptions: Array<{ value: CreateTaskData['category']; label: string }> = [
    { value: 'study', label: '学习辅导类' },
    { value: 'design', label: '艺术设计类' },
    { value: 'tech', label: '专业技术类' },
    { value: 'writing', label: '文章编辑类' },
    { value: 'life', label: '生活服务类' },
];

const form = reactive<Partial<CreateTaskData>>({
    category: 'study',
    title: '',
    description: '',
    requirements: '',
    price: 1,
    location: '',
    estimated_duration: undefined,
    max_applicants: 1,
    urgent: false,
    remote_work: false,
});

const availablePoints = computed(() => Number(userStore.user?.points || 0));
const maxUsablePoints = computed(() => {
    const byAmount = Math.floor(Number(form.price || 0)) * 100;
    const byBalance = availablePoints.value - (availablePoints.value % 100);
    return Math.max(0, Math.min(byAmount, byBalance));
});
const pointsPaymentAvailable = computed(() => maxUsablePoints.value >= 100);
const maxPointsDiscountAmount = computed(() => (maxUsablePoints.value / 100).toFixed(2));
const summaryPrice = computed(() => Number(form.price || 0).toFixed(2));
const normalizedPointsToUse = computed(() => {
    if (paymentMode.value !== 'balance_points') return 0;
    return maxUsablePoints.value;
});
const pointsDiscountAmount = computed(() => (normalizedPointsToUse.value / 100).toFixed(2));
const cashToFreeze = computed(() =>
    Math.max(Number(form.price || 0) - Number(pointsDiscountAmount.value), 0).toFixed(2)
);
const paymentModeLabel = computed(() =>
    paymentMode.value === 'balance_points' ? '余额 + 积分抵扣' : '余额支付'
);

const toISOStringOrUndefined = (value: number | null) =>
    value ? new Date(value).toISOString() : undefined;

const splitLines = (value: string) =>
    value
        .split(/\r?\n|,/)
        .map(item => item.trim())
        .filter(Boolean);

const buildPayload = (): CreateTaskData => ({
    category: form.category as CreateTaskData['category'],
    title: (form.title || '').trim(),
    description: (form.description || '').trim(),
    requirements: form.requirements?.trim() || undefined,
    tags: splitLines(tagsText.value).length ? splitLines(tagsText.value) : undefined,
    skills_required: splitLines(skillsText.value).length ? splitLines(skillsText.value) : undefined,
    price: Number(form.price || 0),
    location: form.location?.trim() || undefined,
    deadline: toISOStringOrUndefined(deadlineValue.value) as string,
    estimated_duration: form.estimated_duration || undefined,
    max_applicants: Number(form.max_applicants || 1),
    urgent: Boolean(form.urgent),
    remote_work: Boolean(form.remote_work),
    images: splitLines(imagesText.value).length ? splitLines(imagesText.value) : undefined,
    attachments: splitLines(attachmentsText.value).length
        ? splitLines(attachmentsText.value)
        : undefined,
    points_used: normalizedPointsToUse.value || undefined,
});

const validateForm = () => {
    if (!form.category) return '请选择任务分类';
    if (!form.title?.trim()) return '请填写任务标题';
    if (!form.description?.trim()) return '请填写任务描述';
    if (!Number(form.price)) return '请填写任务报酬';
    if (Number(userStore.user?.balance || 0) < Number(cashToFreeze.value)) {
        return '余额不足，请先充值后再发布';
    }
    if (!deadlineValue.value) return '请选择截止时间';
    return '';
};

const createTask = async () => {
    if (submitting.value) return;
    submitting.value = true;
    try {
        const response = await TaskApi.createTask({
            ...buildPayload(),
            payment_password: paymentPassword.value,
        });
        if (!response.success) {
            throw new Error(response.message || '创建任务失败');
        }
        if (userStore.user) {
            userStore.user.balance = Math.max(
                0,
                Number(userStore.user.balance || 0) - Number(cashToFreeze.value)
            );
            userStore.user.points = Math.max(
                0,
                Number(userStore.user.points || 0) - Number(normalizedPointsToUse.value || 0)
            );
        }
        appStore.hapticFeedback('medium');
        message.success(`任务创建成功，已冻结 ¥${cashToFreeze.value}`);
        router.replace('/tasks/my');
        return true;
    } catch (error: any) {
        message.error(error?.message || '创建任务失败');
        return false;
    } finally {
        submitting.value = false;
    }
};

const openSetPaymentPasswordDialog = () => {
    dialog.info({
        title: '请先设置支付密码',
        positiveText: '前往设置',
        negativeText: '取消',
        content: '发布任务前需要先设置 6 位数字支付密码，设置时需验证账户密码。',
        onPositiveClick() {
            router.push('/wallet/payment-settings');
        },
    });
};

const handlePaymentPasswordInput = (event: Event) => {
    const target = event.target as HTMLInputElement;
    const sanitized = target.value.replace(/\D/g, '').slice(0, 6);
    paymentPassword.value = sanitized;
    target.value = sanitized;
};

const focusPaymentPasswordInput = () => {
    paymentPasswordInputRef.value?.focus();
};

const selectPointsPayment = () => {
    if (!pointsPaymentAvailable.value) return;
    paymentMode.value = 'balance_points';
};

const confirmPaymentPlan = () => {
    if (paymentMode.value === 'balance_points') {
        if (!pointsPaymentAvailable.value) {
            message.warning('当前不可使用积分抵扣');
            return;
        }
        if (normalizedPointsToUse.value < 100) {
            message.warning('请输入至少 100 积分');
            return;
        }
    }

    paymentPassword.value = '';
    showPaymentSheet.value = false;
    showPasswordSheet.value = true;
};

const submitTaskPayment = async () => {
    if (!/^\d{6}$/.test(paymentPassword.value)) {
        message.warning('请输入 6 位数字支付密码');
        return;
    }

    const success = await createTask();
    if (success !== false) {
        showPasswordSheet.value = false;
    }
};

const submitTask = async () => {
    const error = validateForm();
    if (error) {
        message.warning(error);
        return;
    }

    try {
        const paymentSummaryResponse = await WalletApi.getPaymentSummary();
        if (!paymentSummaryResponse.success || !paymentSummaryResponse.data) {
            throw new Error(paymentSummaryResponse.message || '获取支付信息失败');
        }

        const availableBalance = Number(
            paymentSummaryResponse.data.available_balance ?? userStore.user?.balance ?? 0
        );
        const requiredAmount = Number(cashToFreeze.value);

        if (availableBalance < requiredAmount) {
            throw new Error(`余额不足，当前余额 ¥${availableBalance.toFixed(2)}，请先充值`);
        }

        if (!paymentSummaryResponse.data.payment_password_set) {
            openSetPaymentPasswordDialog();
            return;
        }

        if (userStore.user && typeof paymentSummaryResponse.data.points === 'number') {
            userStore.user.points = paymentSummaryResponse.data.points;
        }

        showPaymentSheet.value = true;
    } catch (err: any) {
        message.error(err?.message || '创建任务失败');
    }
};
</script>

<style scoped>
.campus-create-task {
    --primary: #3b82f6;
    --cyan: #06b6d4;
    --grad: linear-gradient(135deg, var(--primary) 0%, var(--cyan) 100%);
    --surface: #f8fafc;
    --card: #ffffff;
    --text: #1e293b;
    --muted: #94a3b8;
    min-height: 100vh;
    background-color: var(--surface);
    color: var(--text);
}

.campus-create-task.is-dark {
    --surface: #0f172a;
    --card: #1e293b;
    --text: #f1f5f9;
    --muted: #94a3b8;
}

.campus-nav-sticky {
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
    color: var(--text);
    cursor: pointer;
    width: fit-content;
    min-height: 28px;
}

.icon-svg {
    width: 20px;
    height: 20px;
}

.nav-title {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
    margin-left: 6px;
}

.task-viewport {
    padding: 16px;
    max-width: 640px;
    margin: 0 auto;
}

.config-stack {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.form-card {
    background: var(--card);
    border-radius: 24px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.03);
    animation: slide-up 0.5s ease-out both;
}

.field-node {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.field-label {
    font-size: 13px;
    font-weight: 700;
    color: var(--text);
    padding-left: 4px;
}

.field-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.field-label-row .field-label {
    padding-left: 4px;
}

.field-label-hint {
    font-size: 12px;
    color: rgba(59, 130, 246, 0.75);
}

.field-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
}

.category-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 10px;
}

.category-chip {
    border: 1px solid rgba(148, 163, 184, 0.24);
    border-radius: 16px;
    padding: 12px 0;
    background: color-mix(in srgb, var(--surface) 76%, var(--card));
    color: var(--muted);
    font-size: 13px;
    font-weight: 700;
}

.category-chip.active {
    color: #fff;
    border-color: transparent;
    background: var(--grad);
}

.option-row {
    display: flex;
    gap: 20px;
    margin: 8px 0 4px;
}

.check-line {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: var(--text);
}

.advanced-trigger {
    width: 100%;
    background: #f1f5f9;
    border: none;
    border-radius: 12px;
    padding: 12px;
    margin-top: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: var(--muted);
}

.advanced-trigger i {
    width: 6px;
    height: 6px;
    border-right: 2px solid var(--muted);
    border-bottom: 2px solid var(--muted);
    transform: rotate(45deg);
    margin-bottom: 2px;
}

.advanced-trigger i.is-open {
    transform: rotate(-135deg);
    margin-bottom: -2px;
}

.advanced-pane {
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px dashed #e2e8f0;
    animation: fade-in 0.4s ease-out;
}

.action-footer {
    margin-top: 32px;
    background: var(--card);
    border-radius: 28px;
    padding: 24px;
    box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.04);
}

.summary-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
}

.total-label {
    font-size: 14px;
    font-weight: 600;
    color: var(--muted);
}

.total-val {
    font-size: 32px;
    font-weight: 800;
    color: var(--text);
}

.submit-btn {
    height: 54px;
    font-size: 17px;
    font-weight: 700;
    background: var(--grad) !important;
    border: none !important;
    box-shadow: 0 8px 20px rgba(59, 130, 246, 0.3);
}

.summary-note {
    margin-bottom: 14px;
    color: var(--muted);
    font-size: 13px;
}

.payment-sheet {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.payment-sheet__account {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    font-size: 13px;
    color: var(--text);
}

.payment-sheet__option {
    position: relative;
    width: 100%;
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 18px;
    padding: 16px 44px 16px 16px;
    background: color-mix(in srgb, var(--surface) 76%, var(--card));
    color: var(--text);
    text-align: left;
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.payment-sheet__option strong {
    font-size: 15px;
}

.payment-sheet__option span {
    font-size: 12px;
    color: var(--text);
    line-height: 1.5;
}

.payment-sheet__option.is-active {
    border-color: rgba(59, 130, 246, 0.55);
    box-shadow: 0 10px 24px rgba(59, 130, 246, 0.14);
    background: rgba(59, 130, 246, 0.06);
}

.payment-sheet__option.is-disabled {
    opacity: 0.55;
}

.payment-sheet__check {
    position: absolute;
    right: 16px;
    top: 50%;
    transform: translateY(-50%);
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 1px solid rgba(148, 163, 184, 0.35);
    color: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    background: #fff;
}

.payment-sheet__option.is-active .payment-sheet__check {
    background: #3b82f6;
    border-color: #3b82f6;
    color: #fff;
}

.payment-sheet__points {
    border-radius: 18px;
    padding: 16px;
    background: rgba(59, 130, 246, 0.06);
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.payment-sheet__hint {
    margin: 0;
    font-size: 12px;
    color: var(--text);
}

.payment-sheet__summary {
    border-radius: 18px;
    padding: 16px;
    background: rgba(15, 23, 42, 0.04);
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.payment-sheet__summary--compact {
    grid-template-columns: 1fr 1fr;
}

.payment-sheet__summary span {
    display: block;
    font-size: 12px;
    color: var(--text);
    margin-bottom: 6px;
}

.payment-sheet__summary strong {
    font-size: 18px;
    color: var(--text);
}

.pin-input {
    position: relative;
    display: grid;
    grid-template-columns: repeat(6, minmax(0, 1fr));
    gap: 10px;
}

.pin-input__cell {
    height: 52px;
    border-radius: 14px;
    border: 1px solid rgba(148, 163, 184, 0.28);
    background: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    color: var(--text);
}

.pin-input__cell.is-filled {
    border-color: rgba(59, 130, 246, 0.4);
}

.pin-input__native {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    opacity: 0;
    cursor: pointer;
}

.mt-16 {
    margin-top: 16px;
}

@keyframes slide-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fade-in {
    from {
        opacity: 0;
    }
    to {
        opacity: 1;
    }
}

@media (max-width: 768px) {
    .field-grid {
        grid-template-columns: 1fr;
    }

    .category-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
    }
}
</style>
