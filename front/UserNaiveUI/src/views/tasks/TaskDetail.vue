<template>
    <div class="task-detail-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar title="任务详情" show-back @back="router.back()">
                <template #right>
                    <NButton text @click="showShareModal = true">
                        <NIcon size="20">
                            <ShareIcon />
                        </NIcon>
                    </NButton>
                </template>
            </MobileNavBar>
        </div>

        <!-- 页面内容 -->
        <div v-if="loading" class="loading-container">
            <MobileLoading type="default" text="加载中..." />
        </div>

        <div v-else-if="task" class="detail-container">
            <!-- 任务状态 -->
            <div class="section">
                <MobileCard>
                    <div class="status-section">
                        <div
                            class="status-icon"
                            :style="{ backgroundColor: getStatusColor() + '20' }"
                        >
                            <NIcon size="48" :color="getStatusColor()">
                                <component :is="getStatusIcon()" />
                            </NIcon>
                        </div>
                        <div class="status-info">
                            <h2 class="status-title">{{ getStatusTitle() }}</h2>
                            <p class="status-desc">{{ getStatusDescription() }}</p>
                            <div v-if="task.deadline" class="deadline-time">
                                截止时间：{{ formatDateTime(task.deadline) }}
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 任务信息 -->
            <div class="section">
                <h3 class="section-title">任务信息</h3>
                <MobileCard>
                    <div class="task-info">
                        <div class="task-header">
                            <div class="task-category">
                                <NIcon size="20" :color="getCategoryColor()">
                                    <component :is="getCategoryIcon()" />
                                </NIcon>
                                <span class="category-label">{{ getCategoryLabel() }}</span>
                            </div>
                            <NTag :type="getStatusType()" size="small">
                                {{ getStatusLabel() }}
                            </NTag>
                        </div>

                        <h4 class="task-title">{{ task.title }}</h4>
                        <p class="task-description">{{ task.description }}</p>

                        <div class="task-details">
                            <div class="detail-item">
                                <span class="detail-label">任务编号</span>
                                <span class="detail-value">{{ task.taskNumber }}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">发布时间</span>
                                <span class="detail-value">
                                    {{ formatDateTime(task.createdAt) }}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">截止时间</span>
                                <span class="detail-value">
                                    {{ formatDateTime(task.deadline) }}
                                </span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">任务难度</span>
                                <div class="difficulty-stars">
                                    <NIcon
                                        v-for="star in 5"
                                        :key="star"
                                        size="14"
                                        :color="
                                            star <= task.difficulty
                                                ? 'var(--n-warning-color)'
                                                : 'var(--n-border-color)'
                                        "
                                    >
                                        <StarIcon />
                                    </NIcon>
                                </div>
                            </div>
                            <div v-if="task.contact" class="detail-item">
                                <span class="detail-label">联系方式</span>
                                <span class="detail-value">{{ task.contact }}</span>
                            </div>
                            <div v-if="task.remarks" class="detail-item">
                                <span class="detail-label">备注说明</span>
                                <span class="detail-value">{{ task.remarks }}</span>
                            </div>
                        </div>

                        <!-- 特殊字段显示 -->
                        <div v-if="task.category === 'study'" class="special-fields">
                            <div v-if="task.subject?.length" class="detail-item">
                                <span class="detail-label">学科领域</span>
                                <div class="subject-tags">
                                    <NTag
                                        v-for="subj in task.subject"
                                        :key="subj"
                                        size="small"
                                        type="info"
                                    >
                                        {{ getSubjectLabel(subj) }}
                                    </NTag>
                                </div>
                            </div>
                            <div v-if="task.teachingMethods?.length" class="detail-item">
                                <span class="detail-label">教学形式</span>
                                <div class="method-tags">
                                    <NTag
                                        v-for="method in task.teachingMethods"
                                        :key="method"
                                        size="small"
                                        type="success"
                                    >
                                        {{ getTeachingMethodLabel(method) }}
                                    </NTag>
                                </div>
                            </div>
                        </div>

                        <div v-if="task.category === 'design'" class="special-fields">
                            <div v-if="task.designType" class="detail-item">
                                <span class="detail-label">设计类型</span>
                                <span class="detail-value">
                                    {{ getDesignTypeLabel(task.designType) }}
                                </span>
                            </div>
                            <div v-if="task.designRequirements" class="detail-item">
                                <span class="detail-label">设计要求</span>
                                <span class="detail-value">{{ task.designRequirements }}</span>
                            </div>
                            <div v-if="task.referenceFiles?.length" class="detail-item">
                                <span class="detail-label">参考文件</span>
                                <div class="reference-files">
                                    <div
                                        v-for="(file, index) in task.referenceFiles"
                                        :key="index"
                                        class="reference-file"
                                        @click="previewFile(file)"
                                    >
                                        <NIcon size="16">
                                            <AttachIcon />
                                        </NIcon>
                                        <span>{{ file.name }}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div v-if="task.category === 'tech'" class="special-fields">
                            <div v-if="task.techStack?.length" class="detail-item">
                                <span class="detail-label">技术栈</span>
                                <div class="tech-tags">
                                    <NTag
                                        v-for="tech in task.techStack"
                                        :key="tech"
                                        size="small"
                                        type="primary"
                                    >
                                        {{ getTechStackLabel(tech) }}
                                    </NTag>
                                </div>
                            </div>
                            <div v-if="task.projectType" class="detail-item">
                                <span class="detail-label">项目类型</span>
                                <span class="detail-value">
                                    {{ getProjectTypeLabel(task.projectType) }}
                                </span>
                            </div>
                        </div>

                        <div v-if="task.category === 'writing'" class="special-fields">
                            <div v-if="task.writingType" class="detail-item">
                                <span class="detail-label">文案类型</span>
                                <span class="detail-value">
                                    {{ getWritingTypeLabel(task.writingType) }}
                                </span>
                            </div>
                            <div v-if="task.wordCount" class="detail-item">
                                <span class="detail-label">字数要求</span>
                                <span class="detail-value">{{ task.wordCount }}字</span>
                            </div>
                        </div>

                        <div v-if="task.category === 'life'" class="special-fields">
                            <div v-if="task.serviceLocation" class="detail-item">
                                <span class="detail-label">服务地点</span>
                                <span class="detail-value">{{ task.serviceLocation }}</span>
                            </div>
                            <div v-if="task.serviceTime" class="detail-item">
                                <span class="detail-label">服务时间</span>
                                <span class="detail-value">
                                    {{ formatServiceTime(task.serviceTime) }}
                                </span>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 报酬信息 -->
            <div class="section">
                <h3 class="section-title">报酬信息</h3>
                <MobileCard>
                    <div class="reward-info">
                        <div class="reward-main">
                            <div class="reward-amount">
                                <span class="reward-label">任务报酬</span>
                                <span class="reward-value">¥{{ task.reward }}</span>
                            </div>
                            <div class="reward-meta">
                                <div class="meta-item">
                                    <NIcon size="14">
                                        <PersonIcon />
                                    </NIcon>
                                    <span>{{ task.applicants }}人申请</span>
                                </div>
                                <div class="meta-item">
                                    <NIcon size="14">
                                        <TimeIcon />
                                    </NIcon>
                                    <span>{{ formatTimeAgo(task.createdAt) }}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 发布者信息 -->
            <div class="section">
                <h3 class="section-title">发布者信息</h3>
                <MobileCard>
                    <div class="publisher-info">
                        <div class="publisher-avatar">
                            <img
                                :src="task.publisher.avatar || '/default-avatar.png'"
                                :alt="task.publisher.name"
                            />
                        </div>
                        <div class="publisher-details">
                            <h4 class="publisher-name">{{ task.publisher.name }}</h4>
                            <div class="publisher-meta">
                                <div class="publisher-rating">
                                    <NIcon size="14" color="var(--n-warning-color)">
                                        <StarIcon />
                                    </NIcon>
                                    <span>{{ task.publisher.rating || '暂无评分' }}</span>
                                </div>
                                <div class="publisher-tasks">
                                    发布任务：{{ task.publisher.publishedTasks || 0 }}
                                </div>
                            </div>
                        </div>
                        <div class="publisher-actions">
                            <NButton size="small" @click="contactPublisher">
                                <NIcon size="14">
                                    <ChatIcon />
                                </NIcon>
                                联系
                            </NButton>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 申请者列表 -->
            <div v-if="task.status === 'open' && task.applicationList?.length" class="section">
                <h3 class="section-title">申请者 ({{ task.applicationList.length }})</h3>
                <MobileCard>
                    <div class="applicant-list">
                        <div
                            v-for="applicant in task.applicationList"
                            :key="applicant.id"
                            class="applicant-item"
                        >
                            <div class="applicant-avatar">
                                <img
                                    :src="applicant.avatar || '/default-avatar.png'"
                                    :alt="applicant.name"
                                />
                            </div>
                            <div class="applicant-details">
                                <div class="applicant-name">{{ applicant.name }}</div>
                                <div class="applicant-meta">
                                    <div class="applicant-rating">
                                        <NIcon size="12" color="var(--n-warning-color)">
                                            <StarIcon />
                                        </NIcon>
                                        <span>{{ applicant.rating || '暂无' }}</span>
                                    </div>
                                    <div class="applicant-time">
                                        {{ formatTimeAgo(applicant.appliedAt) }}
                                    </div>
                                </div>
                                <div v-if="applicant.message" class="applicant-message">
                                    {{ applicant.message }}
                                </div>
                            </div>
                            <div v-if="task.isMyTask" class="applicant-actions">
                                <NButton
                                    size="small"
                                    type="primary"
                                    @click="selectApplicant(applicant)"
                                >
                                    选择
                                </NButton>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 任务进度 -->
            <div v-if="task.status !== 'open'" class="section">
                <h3 class="section-title">任务进度</h3>
                <MobileCard>
                    <div class="progress-timeline">
                        <div
                            v-for="(step, index) in taskSteps"
                            :key="index"
                            class="timeline-item"
                            :class="{ active: step.active, completed: step.completed }"
                        >
                            <div class="timeline-dot">
                                <NIcon v-if="step.completed" size="12">
                                    <CheckIcon />
                                </NIcon>
                            </div>
                            <div class="timeline-content">
                                <div class="timeline-title">{{ step.title }}</div>
                                <div v-if="step.time" class="timeline-time">{{ step.time }}</div>
                            </div>
                        </div>
                    </div>
                </MobileCard>
            </div>

            <!-- 操作按钮 -->
            <div class="action-section">
                <div
                    v-if="task.status === 'open' && !task.isMyTask && !task.hasApplied"
                    class="action-buttons"
                >
                    <NButton
                        type="primary"
                        size="large"
                        block
                        :loading="applying"
                        @click="showApplyModal = true"
                    >
                        申请任务
                    </NButton>
                </div>

                <div
                    v-else-if="task.status === 'open' && !task.isMyTask && task.hasApplied"
                    class="action-buttons"
                >
                    <NButton
                        type="warning"
                        size="large"
                        block
                        :loading="cancelling"
                        @click="cancelApplication"
                    >
                        取消申请
                    </NButton>
                </div>

                <div v-else-if="task.status === 'inProgress'" class="action-buttons">
                    <NButton
                        v-if="task.isMyTask"
                        type="warning"
                        size="large"
                        block
                        :loading="cancelling"
                        @click="cancelTask"
                    >
                        取消任务
                    </NButton>
                    <NButton
                        v-else-if="task.isAcceptedByMe"
                        type="primary"
                        size="large"
                        block
                        :loading="completing"
                        @click="completeTask"
                    >
                        完成任务
                    </NButton>
                </div>

                <div
                    v-else-if="task.status === 'completed' && !task.isMyTask && task.isAcceptedByMe"
                    class="action-buttons"
                >
                    <NButton type="primary" size="large" block @click="showRateModal = true">
                        评价任务
                    </NButton>
                </div>
            </div>
        </div>

        <!-- 错误状态 -->
        <div v-else class="error-container">
            <MobileEmpty
                type="error"
                title="任务不存在"
                description="该任务可能已被删除或您没有权限查看"
                :show-action="true"
                action-text="返回列表"
                @action="router.push('/tasks/list')"
            />
        </div>

        <!-- 申请弹窗 -->
        <MobileModal v-model:show="showApplyModal" title="申请任务" @confirm="submitApplication">
            <div class="apply-form">
                <NInput
                    v-model:value="applicationMessage"
                    type="textarea"
                    placeholder="请简要说明您的优势和完成计划..."
                    :rows="4"
                    maxlength="200"
                    show-count
                />
            </div>
        </MobileModal>

        <!-- 分享弹窗 -->
        <MobileModal v-model:show="showShareModal" title="分享任务" @confirm="shareTask">
            <div class="share-options">
                <div class="share-option" @click="shareToWeChat">
                    <NIcon size="24" color="#09bb07">
                        <LogoWechat />
                    </NIcon>
                    <span>微信</span>
                </div>
                <div class="share-option" @click="copyLink">
                    <NIcon size="24" color="var(--n-primary-color)">
                        <LinkIcon />
                    </NIcon>
                    <span>复制链接</span>
                </div>
            </div>
        </MobileModal>

        <!-- 评价弹窗 -->
        <MobileModal v-model:show="showRateModal" title="评价任务" @confirm="submitRating">
            <div class="rating-form">
                <div class="rating-stars">
                    <div
                        v-for="star in 5"
                        :key="star"
                        class="rating-star"
                        :class="{ active: star <= rating }"
                        @click="rating = star"
                    >
                        <NIcon size="24">
                            <StarIcon />
                        </NIcon>
                    </div>
                </div>
                <NInput
                    v-model:value="ratingComment"
                    type="textarea"
                    placeholder="请输入评价内容..."
                    :rows="3"
                    maxlength="200"
                    show-count
                />
            </div>
        </MobileModal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NButton, NIcon, NTag, NInput, useMessage } from 'naive-ui';
import {
    ShareOutline as ShareIcon,
    ChatbubbleOutline as ChatIcon,
    CheckmarkOutline as CheckIcon,
    StarOutline as StarIcon,
    LinkOutline as LinkIcon,
    PersonOutline as PersonIcon,
    TimeOutline as TimeIcon,
    AttachOutline as AttachIcon,
    SchoolOutline as StudyIcon,
    BrushOutline as DesignIcon,
    CodeSlashOutline as TechIcon,
    DocumentTextOutline as WritingIcon,
    HomeOutline as LifeIcon,
    CheckmarkCircleOutline as CompletedIcon,
    SyncOutline as ProcessingIcon,
    ClockOutline as OpenIcon,
    CloseCircleOutline as CancelledIcon,
    LogoWechat,
} from '@vicons/ionicons5';
import {
    MobileNavBar,
    MobileCard,
    MobileLoading,
    MobileEmpty,
    MobileModal,
} from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 数据状态
const loading = ref(true);
const applying = ref(false);
const cancelling = ref(false);
const completing = ref(false);
const showApplyModal = ref(false);
const showShareModal = ref(false);
const showRateModal = ref(false);
const applicationMessage = ref('');
const rating = ref(0);
const ratingComment = ref('');

// 任务数据
const task = ref(null);

// 模拟任务数据
const mockTask = {
    id: 1,
    taskNumber: 'TK20240930001',
    category: 'tech',
    title: '简单网页制作',
    description:
        '制作一个个人展示网页，包含基本的HTML/CSS/JS，响应式设计，需要有良好的用户体验和现代化的界面设计。项目需求包含首页、关于页面、作品展示页面等，预计开发周期为1-2周。',
    reward: 120,
    difficulty: 4,
    status: 'open',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    contact: '15800000003',
    remarks: '希望接单者有相关作品展示，完成后会有详细的验收标准',
    applicants: 5,
    techStack: ['html', 'js', 'vue'],
    projectType: 'website',
    isMyTask: false,
    hasApplied: false,
    isAcceptedByMe: false,
    publisher: {
        id: 3,
        name: '王同学',
        avatar: '',
        rating: 4.7,
        publishedTasks: 28,
    },
    applicationList: [
        {
            id: 101,
            name: '张开发',
            avatar: '',
            rating: 4.8,
            appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
            message: '我有3年前端开发经验，擅长Vue和React，可以提供类似作品参考。',
        },
        {
            id: 102,
            name: '李前端',
            avatar: '',
            rating: 4.5,
            appliedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
            message: '熟练掌握HTML/CSS/JS，有多个个人网站项目经验。',
        },
    ],
};

// 计算属性
const taskSteps = computed(() => {
    if (!task.value) return [];

    const steps = [
        {
            title: '任务发布',
            time: formatDateTime(task.value.createdAt),
            completed: true,
            active: false,
        },
        {
            title: '接受申请',
            time:
                task.value.status !== 'open'
                    ? formatDateTime(new Date(task.value.createdAt.getTime() + 30 * 60 * 1000))
                    : null,
            completed: task.value.status !== 'open',
            active: task.value.status === 'inProgress',
        },
        {
            title: '进行中',
            time: task.value.status === 'inProgress' ? formatDateTime(new Date()) : null,
            completed: task.value.status === 'completed',
            active: task.value.status === 'inProgress',
        },
        {
            title: '任务完成',
            time: task.value.status === 'completed' ? formatDateTime(new Date()) : null,
            completed: task.value.status === 'completed',
            active: false,
        },
    ];

    return steps;
});

// 方法
const getStatusIcon = () => {
    const iconMap = {
        open: OpenIcon,
        inProgress: ProcessingIcon,
        completed: CompletedIcon,
        cancelled: CancelledIcon,
    };
    return iconMap[task.value?.status] || OpenIcon;
};

const getStatusColor = () => {
    const colorMap = {
        open: 'var(--n-success-color)',
        inProgress: 'var(--n-info-color)',
        completed: 'var(--n-primary-color)',
        cancelled: 'var(--n-error-color)',
    };
    return colorMap[task.value?.status] || 'var(--n-success-color)';
};

const getStatusTitle = () => {
    const titleMap = {
        open: '招募中',
        inProgress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return titleMap[task.value?.status] || '未知状态';
};

const getStatusDescription = () => {
    const descMap = {
        open: '任务正在招募合适的执行者',
        inProgress: '任务正在执行中，请关注进度',
        completed: '任务已成功完成',
        cancelled: '任务已被取消',
    };
    return descMap[task.value?.status] || '';
};

const getCategoryIcon = () => {
    const iconMap = {
        study: StudyIcon,
        design: DesignIcon,
        tech: TechIcon,
        writing: WritingIcon,
        life: LifeIcon,
    };
    return iconMap[task.value?.category] || StudyIcon;
};

const getCategoryColor = () => {
    const colorMap = {
        study: 'var(--n-primary-color)',
        design: 'var(--n-warning-color)',
        tech: 'var(--n-info-color)',
        writing: 'var(--n-success-color)',
        life: 'var(--n-error-color)',
    };
    return colorMap[task.value?.category] || 'var(--n-primary-color)';
};

const getCategoryLabel = () => {
    const labelMap = {
        study: '学习类',
        design: '设计类',
        tech: '技术类',
        writing: '文案类',
        life: '生活服务',
    };
    return labelMap[task.value?.category] || '其他';
};

const getStatusType = () => {
    const typeMap = {
        open: 'success',
        inProgress: 'info',
        completed: 'default',
        cancelled: 'error',
    };
    return typeMap[task.value?.status] || 'default';
};

const getStatusLabel = () => {
    const labelMap = {
        open: '招募中',
        inProgress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return labelMap[task.value?.status] || '未知状态';
};

const getSubjectLabel = (subject: string) => {
    const subjectMap = {
        math: '高等数学',
        english: '英语',
        cs: '计算机科学',
        physics: '物理学',
        chemistry: '化学',
        economics: '经济学',
        other: '其他',
    };
    return subjectMap[subject] || subject;
};

const getTeachingMethodLabel = (method: string) => {
    const methodMap = {
        online: '线上教学',
        offline: '线下面授',
        homework: '作业辅导',
    };
    return methodMap[method] || method;
};

const getDesignTypeLabel = (type: string) => {
    const typeMap = {
        logo: 'LOGO设计',
        poster: '海报设计',
        ui: 'UI/UX设计',
        card: '名片设计',
        video: '视频制作',
        other: '其他设计',
    };
    return typeMap[type] || type;
};

const getTechStackLabel = (tech: string) => {
    const techMap = {
        html: 'HTML/CSS',
        js: 'JavaScript',
        vue: 'Vue.js',
        react: 'React',
        python: 'Python',
        java: 'Java',
        php: 'PHP',
        other: '其他',
    };
    return techMap[tech] || tech;
};

const getProjectTypeLabel = (type: string) => {
    const typeMap = {
        website: '网站开发',
        app: '移动应用',
        script: '脚本工具',
        other: '其他',
    };
    return typeMap[type] || type;
};

const getWritingTypeLabel = (type: string) => {
    const typeMap = {
        article: '文章写作',
        plan: '策划方案',
        translation: '翻译服务',
        copywriting: '文案撰写',
        other: '其他',
    };
    return typeMap[type] || type;
};

const formatDateTime = (date: Date) => {
    if (!date) return '';
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 1) {
        return '刚刚';
    } else if (hours < 24) {
        return `${hours}小时前`;
    } else {
        return date.toLocaleDateString();
    }
};

const formatServiceTime = (timeRange: [number, number]) => {
    if (!timeRange) return '';
    const start = new Date(timeRange[0]);
    const end = new Date(timeRange[1]);
    return `${formatDateTime(start)} - ${formatDateTime(end)}`;
};

const previewFile = (file: any) => {
    console.log('预览文件:', file);
    message.info('文件预览功能开发中...');
};

const contactPublisher = () => {
    message.info('联系功能开发中...');
    appStore.hapticFeedback('light');
};

const selectApplicant = (applicant: any) => {
    message.success(`已选择 ${applicant.name} 执行任务`);
    task.value.status = 'inProgress';
    appStore.hapticFeedback('medium');
};

const submitApplication = async () => {
    if (!applicationMessage.value.trim()) {
        message.warning('请输入申请理由');
        return;
    }

    applying.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        task.value.hasApplied = true;
        task.value.applicants += 1;
        message.success('申请提交成功！');
        showApplyModal.value = false;
        applicationMessage.value = '';
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('申请失败');
    } finally {
        applying.value = false;
    }
};

const cancelApplication = async () => {
    cancelling.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        task.value.hasApplied = false;
        task.value.applicants -= 1;
        message.success('已取消申请');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('取消失败');
    } finally {
        cancelling.value = false;
    }
};

const cancelTask = async () => {
    cancelling.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        task.value.status = 'cancelled';
        message.success('任务已取消');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('取消失败');
    } finally {
        cancelling.value = false;
    }
};

const completeTask = async () => {
    completing.value = true;
    try {
        await new Promise(resolve => setTimeout(resolve, 1500));
        task.value.status = 'completed';
        message.success('任务完成！');
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('操作失败');
    } finally {
        completing.value = false;
    }
};

const shareTask = () => {
    showShareModal.value = false;
};

const shareToWeChat = () => {
    message.info('微信分享功能开发中...');
    showShareModal.value = false;
};

const copyLink = () => {
    const link = `${window.location.origin}/tasks/${task.value.id}`;
    navigator.clipboard
        .writeText(link)
        .then(() => {
            message.success('链接已复制到剪贴板');
        })
        .catch(() => {
            message.error('复制失败');
        });
    showShareModal.value = false;
};

const submitRating = () => {
    if (rating.value === 0) {
        message.warning('请选择评分');
        return;
    }

    message.success('评价提交成功');
    showRateModal.value = false;
    rating.value = 0;
    ratingComment.value = '';
};

// 获取任务详情
const fetchTaskDetail = async () => {
    loading.value = true;
    try {
        const taskId = route.params.id;
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 800));

        // 这里应该调用真实的API
        // const response = await taskApi.getTaskDetail(taskId);
        // task.value = response.data;

        // 模拟数据
        task.value = mockTask;
    } catch (error) {
        console.error('获取任务详情失败:', error);
        task.value = null;
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchTaskDetail();
});
</script>

<style scoped>
.task-detail-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.loading-container {
    padding: 100px 0;
    text-align: center;
}

.error-container {
    padding: 100px 20px;
}

.detail-container {
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

/* 状态区域 */
.status-section {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 4px;
}

.status-icon {
    width: 80px;
    height: 80px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.status-info {
    flex: 1;
}

.status-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.status-desc {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.deadline-time {
    font-size: 13px;
    color: var(--n-error-color);
    font-weight: 500;
}

/* 任务信息 */
.task-info {
    padding: 4px;
}

.task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.task-category {
    display: flex;
    align-items: center;
    gap: 8px;
}

.category-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

.task-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.task-description {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0 0 16px 0;
    line-height: 1.5;
}

.task-details,
.special-fields {
    border-top: 1px solid var(--n-border-color);
    padding-top: 16px;
    margin-top: 16px;
}

.detail-item {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 8px 0;
    gap: 16px;
}

.detail-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    flex-shrink: 0;
    min-width: 80px;
}

.detail-value {
    font-size: 14px;
    color: var(--n-text-color-1);
    text-align: right;
    word-break: break-all;
}

.difficulty-stars {
    display: flex;
    gap: 2px;
}

/* 标签 */
.subject-tags,
.method-tags,
.tech-tags {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
}

.reference-files {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.reference-file {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px;
    background: var(--n-color-target);
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    color: var(--n-text-color-2);
}

.reference-file:hover {
    background: var(--n-color-target-hover);
}

/* 报酬信息 */
.reward-info {
    padding: 4px;
}

.reward-main {
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.reward-amount {
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.reward-label {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.reward-value {
    font-size: 24px;
    font-weight: 700;
    color: var(--n-error-color);
}

.reward-meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 发布者信息 */
.publisher-info {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px;
}

.publisher-avatar {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    overflow: hidden;
    flex-shrink: 0;
}

.publisher-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.publisher-details {
    flex: 1;
}

.publisher-name {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.publisher-meta {
    display: flex;
    align-items: center;
    gap: 16px;
    font-size: 13px;
    color: var(--n-text-color-3);
}

.publisher-rating {
    display: flex;
    align-items: center;
    gap: 4px;
}

.publisher-actions {
    flex-shrink: 0;
}

/* 申请者列表 */
.applicant-list {
    padding: 4px;
}

.applicant-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid var(--n-border-color);
}

.applicant-item:last-child {
    border-bottom: none;
}

.applicant-avatar {
    width: 40px;
    height: 40px;
    border-radius: 8px;
    overflow: hidden;
    flex-shrink: 0;
}

.applicant-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.applicant-details {
    flex: 1;
}

.applicant-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
    margin-bottom: 4px;
}

.applicant-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 12px;
    color: var(--n-text-color-3);
    margin-bottom: 6px;
}

.applicant-rating {
    display: flex;
    align-items: center;
    gap: 2px;
}

.applicant-message {
    font-size: 13px;
    color: var(--n-text-color-2);
    line-height: 1.4;
}

.applicant-actions {
    flex-shrink: 0;
}

/* 任务进度 */
.progress-timeline {
    padding: 4px;
}

.timeline-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    position: relative;
}

.timeline-item:not(:last-child)::after {
    content: '';
    position: absolute;
    left: 15px;
    top: 36px;
    width: 2px;
    height: calc(100% - 12px);
    background: var(--n-border-color);
}

.timeline-item.completed::after {
    background: var(--n-success-color);
}

.timeline-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2px solid var(--n-border-color);
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--n-body-color);
    flex-shrink: 0;
    margin-top: 2px;
}

.timeline-item.completed .timeline-dot {
    border-color: var(--n-success-color);
    background: var(--n-success-color);
    color: white;
}

.timeline-item.active .timeline-dot {
    border-color: var(--n-primary-color);
}

.timeline-content {
    flex: 1;
    padding-top: 2px;
}

.timeline-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--n-text-color-1);
    margin-bottom: 4px;
}

.timeline-item.completed .timeline-title {
    color: var(--n-success-color);
}

.timeline-time {
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 操作按钮 */
.action-section {
    margin-top: 32px;
}

.action-buttons .n-button {
    height: 50px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 12px;
}

/* 弹窗 */
.apply-form {
    padding: 16px 0;
}

.share-options {
    display: flex;
    justify-content: center;
    gap: 40px;
    padding: 20px 0;
}

.share-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    padding: 12px;
    border-radius: 12px;
    transition: all 0.2s ease;
}

.share-option:hover {
    background: var(--n-color-target);
}

.share-option span {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.rating-form {
    padding: 16px 0;
}

.rating-stars {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin-bottom: 20px;
}

.rating-star {
    cursor: pointer;
    color: var(--n-border-color);
    transition: all 0.2s ease;
}

.rating-star.active {
    color: var(--n-warning-color);
}

.rating-star:hover {
    transform: scale(1.1);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .detail-container {
        padding: 12px;
        padding-bottom: 100px;
    }

    .status-section {
        gap: 12px;
    }

    .status-icon {
        width: 64px;
        height: 64px;
    }

    .status-title {
        font-size: 16px;
    }

    .reward-main {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
    }

    .reward-meta {
        align-items: flex-start;
    }

    .publisher-info {
        gap: 8px;
    }

    .publisher-avatar {
        width: 40px;
        height: 40px;
    }

    .action-buttons .n-button {
        height: 46px;
        font-size: 15px;
    }
}

/* iOS 安全区域适配 */
.task-detail-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.task-detail-page {
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
.dark-theme .share-option:hover,
.dark-theme .reference-file:hover {
    background: var(--ios-dark-gray4);
}

.light-theme .share-option:hover,
.light-theme .reference-file:hover {
    background: var(--ios-gray5);
}
</style>
