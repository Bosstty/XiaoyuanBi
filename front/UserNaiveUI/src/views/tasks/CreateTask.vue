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
                        <div class="field-node">
                            <label class="field-label">开始时间（可选）</label>
                            <NDatePicker
                                v-model:value="startTimeValue"
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
import { TaskApi } from '@/api';
import { useAppStore } from '@/stores';
import type { CreateTaskData } from '@/types';

const router = useRouter();
const appStore = useAppStore();
const message = useMessage();
const dialog = useDialog();

const submitting = ref(false);
const showAdvanced = ref(false);
const deadlineValue = ref<number | null>(null);
const startTimeValue = ref<number | null>(null);
const tagsText = ref('');
const skillsText = ref('');
const attachmentsText = ref('');
const imagesText = ref('');

const categoryOptions: Array<{ value: CreateTaskData['category']; label: string }> = [
    { value: 'study', label: '学习' },
    { value: 'design', label: '设计' },
    { value: 'tech', label: '技术' },
    { value: 'writing', label: '文案' },
    { value: 'life', label: '生活' },
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

const summaryPrice = computed(() => Number(form.price || 0).toFixed(2));

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
    start_time: toISOStringOrUndefined(startTimeValue.value),
    deadline: new Date(deadlineValue.value || 0).toISOString(),
    estimated_duration: form.estimated_duration || undefined,
    max_applicants: Number(form.max_applicants || 1),
    urgent: Boolean(form.urgent),
    remote_work: Boolean(form.remote_work),
    images: splitLines(imagesText.value).length ? splitLines(imagesText.value) : undefined,
    attachments: splitLines(attachmentsText.value).length
        ? splitLines(attachmentsText.value)
        : undefined,
});

const validateForm = () => {
    if (!form.category) return '请选择任务分类';
    if (!form.title?.trim()) return '请填写任务标题';
    if (!form.description?.trim()) return '请填写任务描述';
    if (!Number(form.price)) return '请填写任务报酬';
    if (!deadlineValue.value) return '请选择截止时间';
    if (startTimeValue.value && deadlineValue.value && startTimeValue.value > deadlineValue.value) {
        return '截止时间不能早于开始时间';
    }
    return '';
};

const createTask = async () => {
    if (submitting.value) return;
    submitting.value = true;
    try {
        const response = await TaskApi.createTask(buildPayload());
        if (!response.success) {
            throw new Error(response.message || '创建任务失败');
        }
        appStore.hapticFeedback('medium');
        message.success(`任务创建成功，已冻结 ¥${summaryPrice.value}`);
        router.replace('/tasks/my');
    } catch (error: any) {
        message.error(error?.message || '创建任务失败');
    } finally {
        submitting.value = false;
    }
};

const submitTask = () => {
    const error = validateForm();
    if (error) {
        message.warning(error);
        return;
    }

    dialog.warning({
        title: '确认发布任务',
        positiveText: '确认发布',
        negativeText: '取消',
        content: `发布后将先冻结 ¥${summaryPrice.value} 作为任务报酬。任务完成并由你确认后，这笔金额才会支付给承接人。`,
        async onPositiveClick() {
            await createTask();
        },
    });
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
