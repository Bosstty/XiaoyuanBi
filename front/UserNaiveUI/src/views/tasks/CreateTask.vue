<template>
    <div class="create-task-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar title="发布任务" show-back @back="router.back()" />
        </div>

        <!-- 表单内容 -->
        <div class="form-container">
            <!-- 任务分类选择 -->
            <div class="section">
                <h3 class="section-title">选择任务分类</h3>
                <MobileCard>
                    <div class="task-categories">
                        <div
                            v-for="category in taskCategories"
                            :key="category.key"
                            class="category-item"
                            :class="{ active: taskForm.category === category.key }"
                            @click="selectCategory(category.key)"
                        >
                            <div
                                class="category-icon"
                                :style="{ backgroundColor: category.color + '20' }"
                            >
                                <NIcon size="20" :color="category.color">
                                    <component :is="category.icon" />
                                </NIcon>
                            </div>
                            <span class="category-label">{{ category.label }}</span>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 任务信息表单 -->
            <div class="section">
                <h3 class="section-title">任务信息</h3>
                <MobileCard>
                    <NForm ref="formRef" :model="taskForm" :rules="formRules" :label-width="80">
                        <NFormItem label="任务标题" path="title">
                            <NInput
                                v-model:value="taskForm.title"
                                placeholder="请输入任务标题"
                                maxlength="50"
                                show-count
                            />
                        </NFormItem>

                        <NFormItem label="详细描述" path="description">
                            <NInput
                                v-model:value="taskForm.description"
                                type="textarea"
                                placeholder="请详细描述任务要求、交付内容、技能需求等..."
                                :rows="5"
                                maxlength="500"
                                show-count
                            />
                        </NFormItem>

                        <NFormItem label="任务报酬" path="reward">
                            <NInputNumber
                                v-model:value="taskForm.reward"
                                placeholder="请输入任务报酬"
                                :min="1"
                                :max="1000"
                                :precision="2"
                                style="width: 100%"
                            >
                                <template #prefix>¥</template>
                            </NInputNumber>
                        </NFormItem>

                        <NFormItem label="任务难度" path="difficulty">
                            <div class="difficulty-selector">
                                <div
                                    v-for="level in difficultyLevels"
                                    :key="level.value"
                                    class="difficulty-item"
                                    :class="{ active: taskForm.difficulty === level.value }"
                                    @click="taskForm.difficulty = level.value"
                                >
                                    <div class="difficulty-stars">
                                        <NIcon
                                            v-for="star in 5"
                                            :key="star"
                                            size="14"
                                            :color="
                                                star <= level.value
                                                    ? 'var(--n-warning-color)'
                                                    : 'var(--n-border-color)'
                                            "
                                        >
                                            <StarIcon />
                                        </NIcon>
                                    </div>
                                    <span class="difficulty-label">{{ level.label }}</span>
                                </div>
                            </div>
                        </NFormItem>

                        <NFormItem label="截止时间" path="deadline">
                            <NDatePicker
                                v-model:value="taskForm.deadline"
                                type="datetime"
                                placeholder="选择任务截止时间"
                                style="width: 100%"
                                :is-date-disabled="disableDate"
                                :is-time-disabled="disableTime"
                            />
                        </NFormItem>

                        <NFormItem label="联系方式" path="contact">
                            <NInput
                                v-model:value="taskForm.contact"
                                placeholder="请输入联系方式（QQ、微信、邮箱等）"
                                maxlength="50"
                            />
                        </NFormItem>

                        <!-- 特殊字段：学习类 -->
                        <div v-if="taskForm.category === 'study'">
                            <NFormItem label="学科领域">
                                <NSelect
                                    v-model:value="taskForm.subject"
                                    :options="subjects"
                                    placeholder="请选择学科领域"
                                    multiple
                                />
                            </NFormItem>

                            <NFormItem label="教学形式">
                                <NCheckboxGroup v-model:value="taskForm.teachingMethods">
                                    <NCheckbox value="online">线上教学</NCheckbox>
                                    <NCheckbox value="offline">线下面授</NCheckbox>
                                    <NCheckbox value="homework">作业辅导</NCheckbox>
                                </NCheckboxGroup>
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：设计类 -->
                        <div v-if="taskForm.category === 'design'">
                            <NFormItem label="设计类型">
                                <NSelect
                                    v-model:value="taskForm.designType"
                                    :options="designTypes"
                                    placeholder="请选择设计类型"
                                />
                            </NFormItem>

                            <NFormItem label="设计要求">
                                <NInput
                                    v-model:value="taskForm.designRequirements"
                                    type="textarea"
                                    placeholder="请描述具体的设计要求，如尺寸、颜色、风格等"
                                    :rows="3"
                                    maxlength="200"
                                    show-count
                                />
                            </NFormItem>

                            <NFormItem label="参考文件">
                                <NUpload
                                    :file-list="referenceFiles"
                                    :max="5"
                                    accept="image/*,.pdf,.doc,.docx"
                                    @change="handleReferenceUpload"
                                >
                                    <NUploadDragger>
                                        <div class="upload-content">
                                            <NIcon size="32" color="var(--n-primary-color)">
                                                <AttachIcon />
                                            </NIcon>
                                            <p>点击或拖拽上传参考文件</p>
                                            <p class="upload-hint">
                                                支持图片、PDF、Word文档，最多5个文件
                                            </p>
                                        </div>
                                    </NUploadDragger>
                                </NUpload>
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：技术类 -->
                        <div v-if="taskForm.category === 'tech'">
                            <NFormItem label="技术栈">
                                <NSelect
                                    v-model:value="taskForm.techStack"
                                    :options="techStacks"
                                    placeholder="请选择相关技术栈"
                                    multiple
                                />
                            </NFormItem>

                            <NFormItem label="项目类型">
                                <NRadioGroup v-model:value="taskForm.projectType">
                                    <NRadio value="website">网站开发</NRadio>
                                    <NRadio value="app">移动应用</NRadio>
                                    <NRadio value="script">脚本工具</NRadio>
                                    <NRadio value="other">其他</NRadio>
                                </NRadioGroup>
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：文案类 -->
                        <div v-if="taskForm.category === 'writing'">
                            <NFormItem label="文案类型">
                                <NSelect
                                    v-model:value="taskForm.writingType"
                                    :options="writingTypes"
                                    placeholder="请选择文案类型"
                                />
                            </NFormItem>

                            <NFormItem label="字数要求">
                                <NInputNumber
                                    v-model:value="taskForm.wordCount"
                                    placeholder="预计字数"
                                    :min="50"
                                    :max="50000"
                                    style="width: 100%"
                                >
                                    <template #suffix>字</template>
                                </NInputNumber>
                            </NFormItem>
                        </div>

                        <!-- 特殊字段：生活服务 -->
                        <div v-if="taskForm.category === 'life'">
                            <NFormItem label="服务地点">
                                <NInput
                                    v-model:value="taskForm.serviceLocation"
                                    placeholder="请输入服务地点"
                                />
                            </NFormItem>

                            <NFormItem label="服务时间">
                                <NDatePicker
                                    v-model:value="taskForm.serviceTime"
                                    type="datetimerange"
                                    placeholder="选择服务时间段"
                                    style="width: 100%"
                                />
                            </NFormItem>
                        </div>

                        <!-- 备注信息 -->
                        <NFormItem label="备注">
                            <NInput
                                v-model:value="taskForm.remarks"
                                type="textarea"
                                placeholder="其他需要说明的信息..."
                                :rows="3"
                                maxlength="200"
                                show-count
                            />
                        </NFormItem>
                    </NForm>
                </MobileCard>
            </div>

            <!-- 发布设置 -->
            <div class="section">
                <h3 class="section-title">发布设置</h3>
                <MobileCard>
                    <div class="publish-settings">
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-label">立即发布</span>
                                <span class="setting-desc">任务将立即对所有用户可见</span>
                            </div>
                            <NSwitch v-model:value="taskForm.publishImmediately" />
                        </div>
                        <div v-if="!taskForm.publishImmediately" class="setting-item">
                            <div class="setting-info">
                                <span class="setting-label">定时发布</span>
                                <span class="setting-desc">选择任务发布时间</span>
                            </div>
                            <NDatePicker
                                v-model:value="taskForm.publishTime"
                                type="datetime"
                                placeholder="选择发布时间"
                                style="width: 150px"
                            />
                        </div>
                        <div class="setting-item">
                            <div class="setting-info">
                                <span class="setting-label">允许多人申请</span>
                                <span class="setting-desc">允许多个用户申请此任务</span>
                            </div>
                            <NSwitch v-model:value="taskForm.allowMultipleApplicants" />
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 费用说明 -->
            <div class="section">
                <h3 class="section-title">费用说明</h3>
                <MobileCard>
                    <div class="fee-info">
                        <div class="fee-item">
                            <span class="fee-label">任务报酬：</span>
                            <span class="fee-value">¥{{ taskForm.reward || 0 }}</span>
                        </div>
                        <div class="fee-item">
                            <span class="fee-label">平台服务费：</span>
                            <span class="fee-value">¥{{ platformFee }}</span>
                        </div>
                        <div class="fee-divider"></div>
                        <div class="fee-item total">
                            <span class="fee-label">您需支付：</span>
                            <span class="fee-value">¥{{ totalFee }}</span>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 服务条款 -->
            <div class="section">
                <MobileCard>
                    <div class="terms-section">
                        <NCheckbox v-model:checked="agreeTerms">
                            我已阅读并同意
                            <NButton text type="primary" @click="showTerms">
                                《任务发布协议》
                            </NButton>
                            和
                            <NButton text type="primary" @click="showRules">
                                《平台使用规则》
                            </NButton>
                        </NCheckbox>
                    </div>
                </MobileCard>
            </div>

            <!-- 提交按钮 -->
            <div class="submit-section">
                <NButton
                    type="primary"
                    size="large"
                    block
                    :loading="submitting"
                    :disabled="!canSubmit"
                    @click="handleSubmit"
                >
                    {{ taskForm.publishImmediately ? '立即发布任务' : '提交审核' }}
                </NButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
    NForm,
    NFormItem,
    NInput,
    NInputNumber,
    NSelect,
    NDatePicker,
    NButton,
    NIcon,
    NSwitch,
    NUpload,
    NUploadDragger,
    NCheckbox,
    NCheckboxGroup,
    NRadioGroup,
    NRadio,
    FormInst,
    useMessage,
    UploadFileInfo,
} from 'naive-ui';
import {
    SchoolOutline as StudyIcon,
    BrushOutline as DesignIcon,
    CodeSlashOutline as TechIcon,
    DocumentTextOutline as WritingIcon,
    HomeOutline as LifeIcon,
    StarOutline as StarIcon,
    AttachOutline as AttachIcon,
} from '@vicons/ionicons5';
import { MobileNavBar, MobileCard } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();
const formRef = ref<FormInst>();

// 任务分类配置
const taskCategories = [
    {
        key: 'study',
        label: '学习类',
        icon: StudyIcon,
        color: 'var(--n-primary-color)',
    },
    {
        key: 'design',
        label: '设计类',
        icon: DesignIcon,
        color: 'var(--n-warning-color)',
    },
    {
        key: 'tech',
        label: '技术类',
        icon: TechIcon,
        color: 'var(--n-info-color)',
    },
    {
        key: 'writing',
        label: '文案类',
        icon: WritingIcon,
        color: 'var(--n-success-color)',
    },
    {
        key: 'life',
        label: '生活服务',
        icon: LifeIcon,
        color: 'var(--n-error-color)',
    },
];

// 难度级别
const difficultyLevels = [
    { value: 1, label: '入门' },
    { value: 2, label: '简单' },
    { value: 3, label: '中等' },
    { value: 4, label: '困难' },
    { value: 5, label: '专家' },
];

// 表单数据
const taskForm = reactive({
    category: 'study',
    title: '',
    description: '',
    reward: null as number | null,
    difficulty: 1,
    deadline: null as number | null,
    contact: '',
    remarks: '',
    publishImmediately: true,
    publishTime: null as number | null,
    allowMultipleApplicants: true,
    // 学习类特有字段
    subject: [],
    teachingMethods: [],
    // 设计类特有字段
    designType: '',
    designRequirements: '',
    // 技术类特有字段
    techStack: [],
    projectType: 'website',
    // 文案类特有字段
    writingType: '',
    wordCount: null as number | null,
    // 生活服务特有字段
    serviceLocation: '',
    serviceTime: null as [number, number] | null,
});

// 表单验证规则
const formRules = {
    title: [
        { required: true, message: '请输入任务标题', trigger: 'blur' },
        { min: 5, max: 50, message: '标题长度在5-50个字符', trigger: 'blur' },
    ],
    description: [
        { required: true, message: '请输入任务描述', trigger: 'blur' },
        { min: 20, max: 500, message: '描述长度在20-500个字符', trigger: 'blur' },
    ],
    reward: [
        { required: true, type: 'number', message: '请输入任务报酬', trigger: 'blur' },
        { type: 'number', min: 1, max: 1000, message: '任务报酬在1-1000元之间', trigger: 'blur' },
    ],
    deadline: [{ required: true, type: 'number', message: '请选择截止时间', trigger: 'blur' }],
    contact: [{ required: true, message: '请输入联系方式', trigger: 'blur' }],
};

// 其他数据
const submitting = ref(false);
const agreeTerms = ref(false);
const referenceFiles = ref<UploadFileInfo[]>([]);

// 选项数据
const subjects = [
    { label: '高等数学', value: 'math' },
    { label: '英语', value: 'english' },
    { label: '计算机科学', value: 'cs' },
    { label: '物理学', value: 'physics' },
    { label: '化学', value: 'chemistry' },
    { label: '经济学', value: 'economics' },
    { label: '其他', value: 'other' },
];

const designTypes = [
    { label: 'LOGO设计', value: 'logo' },
    { label: '海报设计', value: 'poster' },
    { label: 'UI/UX设计', value: 'ui' },
    { label: '名片设计', value: 'card' },
    { label: '视频制作', value: 'video' },
    { label: '其他设计', value: 'other' },
];

const techStacks = [
    { label: 'HTML/CSS', value: 'html' },
    { label: 'JavaScript', value: 'js' },
    { label: 'Vue.js', value: 'vue' },
    { label: 'React', value: 'react' },
    { label: 'Python', value: 'python' },
    { label: 'Java', value: 'java' },
    { label: 'PHP', value: 'php' },
    { label: '其他', value: 'other' },
];

const writingTypes = [
    { label: '文章写作', value: 'article' },
    { label: '策划方案', value: 'plan' },
    { label: '翻译服务', value: 'translation' },
    { label: '文案撰写', value: 'copywriting' },
    { label: '其他', value: 'other' },
];

// 计算属性
const platformFee = computed(() => {
    return taskForm.reward ? (taskForm.reward * 0.05).toFixed(2) : '0.00';
});

const totalFee = computed(() => {
    const reward = taskForm.reward || 0;
    const platform = parseFloat(platformFee.value);
    return (reward + platform).toFixed(2);
});

const canSubmit = computed(() => {
    return (
        taskForm.category &&
        taskForm.title &&
        taskForm.description &&
        taskForm.reward &&
        taskForm.deadline &&
        taskForm.contact &&
        agreeTerms.value
    );
});

// 方法
const selectCategory = (category: string) => {
    taskForm.category = category;
    appStore.hapticFeedback('light');

    // 根据分类设置默认标题前缀
    const prefixes = {
        study: '学习辅导 - ',
        design: '设计服务 - ',
        tech: '技术开发 - ',
        writing: '文案撰写 - ',
        life: '生活服务 - ',
    };
    if (!taskForm.title.startsWith(prefixes[category])) {
        taskForm.title = prefixes[category];
    }
};

const disableDate = (ts: number) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return ts < today.getTime();
};

const disableTime = (ts: number) => {
    const now = new Date();
    const selected = new Date(ts);

    // 如果是今天，则禁用过去的时间
    if (selected.toDateString() === now.toDateString()) {
        return ts < now.getTime();
    }
    return false;
};

const handleReferenceUpload = (options: { fileList: UploadFileInfo[] }) => {
    referenceFiles.value = options.fileList;
};

const showTerms = () => {
    message.info('任务发布协议功能开发中...');
};

const showRules = () => {
    message.info('平台使用规则功能开发中...');
};

const handleSubmit = async () => {
    try {
        await formRef.value?.validate();

        submitting.value = true;
        appStore.hapticFeedback('medium');

        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 2500));

        message.success(
            taskForm.publishImmediately ? '任务发布成功！' : '任务提交成功，等待审核！'
        );
        router.push('/tasks/list');
    } catch (error) {
        console.error('表单验证失败:', error);
        message.error('请检查表单信息');
        appStore.hapticFeedback('heavy');
    } finally {
        submitting.value = false;
    }
};

// 初始化
onMounted(() => {
    // 从路由参数获取分类
    const category = router.currentRoute.value.query.category as string;
    if (category && taskCategories.find(c => c.key === category)) {
        selectCategory(category);
    }
});
</script>

<style scoped>
.create-task-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.form-container {
    padding: 16px;
    padding-bottom: 100px;
}

.section {
    margin-bottom: 24px;
}

.section-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 12px 4px;
}

/* 任务分类选择 */
.task-categories {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    padding: 4px;
}

.category-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 8px;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 2px solid transparent;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.category-item:active {
    transform: scale(0.95);
}

.category-item.active {
    border-color: var(--n-primary-color);
    background: var(--n-primary-color-suppl);
}

.category-icon {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 8px;
}

.category-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

/* 难度选择器 */
.difficulty-selector {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
}

.difficulty-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 12px 8px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border: 1px solid var(--n-border-color);
    min-width: 60px;
}

.difficulty-item:hover {
    background: var(--n-color-target);
}

.difficulty-item.active {
    border-color: var(--n-primary-color);
    background: var(--n-primary-color-suppl);
}

.difficulty-stars {
    display: flex;
    gap: 2px;
    margin-bottom: 4px;
}

.difficulty-label {
    font-size: 12px;
    color: var(--n-text-color-2);
}

/* 表单样式 */
.create-task-page :deep(.n-form-item) {
    margin-bottom: 20px;
}

.create-task-page :deep(.n-input),
.create-task-page :deep(.n-input-number),
.create-task-page :deep(.n-select),
.create-task-page :deep(.n-date-picker) {
    border-radius: 8px;
}

.create-task-page :deep(.n-input__input-el) {
    font-size: 15px;
}

/* 上传区域 */
.upload-content {
    text-align: center;
    padding: 20px;
    color: var(--n-text-color-2);
}

.upload-content p {
    margin: 8px 0 0 0;
    font-size: 14px;
}

.upload-hint {
    font-size: 12px !important;
    color: var(--n-text-color-3) !important;
}

/* 发布设置 */
.publish-settings {
    padding: 4px;
}

.setting-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px 0;
    border-bottom: 1px solid var(--n-border-color);
}

.setting-item:last-child {
    border-bottom: none;
}

.setting-info {
    flex: 1;
}

.setting-label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
    margin-bottom: 2px;
}

.setting-desc {
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 费用信息 */
.fee-info {
    padding: 4px;
}

.fee-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
}

.fee-item.total {
    font-weight: 600;
    font-size: 16px;
    color: var(--n-text-color-1);
}

.fee-label {
    color: var(--n-text-color-2);
    font-size: 14px;
}

.fee-value {
    color: var(--n-error-color);
    font-weight: 500;
}

.fee-divider {
    height: 1px;
    background: var(--n-border-color);
    margin: 8px 0;
}

/* 服务条款 */
.terms-section {
    padding: 4px;
    text-align: center;
}

/* 提交按钮 */
.submit-section {
    margin-top: 32px;
}

.submit-section .n-button {
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
}

/* 响应式适配 */
@media (max-width: 375px) {
    .form-container {
        padding: 12px;
        padding-bottom: 100px;
    }

    .task-categories {
        grid-template-columns: repeat(2, 1fr);
        gap: 8px;
    }

    .category-item {
        padding: 12px 6px;
    }

    .category-icon {
        width: 32px;
        height: 32px;
    }

    .category-label {
        font-size: 12px;
    }

    .difficulty-selector {
        gap: 8px;
    }

    .difficulty-item {
        padding: 8px 6px;
        min-width: 50px;
    }

    .section-title {
        font-size: 15px;
    }

    .submit-section .n-button {
        height: 46px;
        font-size: 15px;
    }
}

/* iOS 安全区域适配 */
.create-task-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.create-task-page {
    animation: ios-fade-in 0.4s ease-out;
}

.section {
    animation: ios-fade-in 0.6s ease-out;
}

.section:nth-child(2) {
    animation-delay: 0.1s;
}

.section:nth-child(3) {
    animation-delay: 0.2s;
}

.section:nth-child(4) {
    animation-delay: 0.3s;
}

/* 深色模式优化 */
.dark-theme .category-item:active,
.dark-theme .difficulty-item:hover {
    background: var(--ios-dark-gray4);
}

.light-theme .category-item:active,
.light-theme .difficulty-item:hover {
    background: var(--ios-gray5);
}

/* 表单元素样式覆盖 */
.create-task-page :deep(.n-form-item-label) {
    font-weight: 500;
    color: var(--n-text-color-1);
}

.create-task-page :deep(.n-checkbox-group) {
    gap: 12px;
}

.create-task-page :deep(.n-radio-group) {
    gap: 12px;
}
</style>
