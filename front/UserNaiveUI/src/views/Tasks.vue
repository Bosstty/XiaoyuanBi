<template>
    <div class="tasks-page">
        <!-- 顶部横幅 -->
        <div class="tasks-header">
            <MobileCard class="header-card" :padding="'20px'">
                <div class="header-content">
                    <div class="header-icon">
                        <NIcon size="48" color="var(--n-primary-color)">
                            <TaskIcon />
                        </NIcon>
                    </div>
                    <h1 class="header-title">任务大厅</h1>
                    <p class="header-desc">发布任务 · 接受任务 · 赚取收入</p>
                </div>
            </MobileCard>
        </div>

        <!-- 快捷操作 -->
        <div class="quick-actions">
            <h3 class="section-title">任务分类</h3>
            <div class="actions-grid">
                <div
                    v-for="category in taskCategories"
                    :key="category.id"
                    class="action-card"
                    @click="handleCategoryClick(category)"
                >
                    <MobileCard class="action-content" :hoverable="true">
                        <div
                            class="action-icon"
                            :style="{ backgroundColor: category.color + '20' }"
                        >
                            <NIcon size="24" :color="category.color">
                                <component :is="category.icon" />
                            </NIcon>
                        </div>
                        <h4 class="action-title">{{ category.title }}</h4>
                        <p class="action-desc">{{ category.description }}</p>
                        <div class="task-count">{{ category.taskCount }}个任务</div>
                    </MobileCard>
                </div>
            </div>
        </div>

        <!-- 热门任务 -->
        <div class="hot-tasks">
            <div class="section-header">
                <h3 class="section-title">热门任务</h3>
                <NButton text type="primary" @click="router.push('/tasks/list')">查看全部</NButton>
            </div>

            <div v-if="hotTasks.length > 0">
                <div
                    v-for="task in hotTasks"
                    :key="task.id"
                    class="task-item"
                    @click="handleTaskClick(task)"
                >
                    <MobileCard :hoverable="true">
                        <div class="task-content">
                            <!-- 任务头部 -->
                            <div class="task-header">
                                <div class="task-category">
                                    <NIcon size="16" :color="getCategoryColor(task.category)">
                                        <component :is="getCategoryIcon(task.category)" />
                                    </NIcon>
                                    <span class="category-label">
                                        {{ getCategoryLabel(task.category) }}
                                    </span>
                                </div>
                                <div class="task-status">
                                    <NTag :type="getStatusType(task.status)" size="small">
                                        {{ getStatusLabel(task.status) }}
                                    </NTag>
                                </div>
                            </div>

                            <!-- 任务信息 -->
                            <div class="task-info">
                                <h4 class="task-title">{{ task.title }}</h4>
                                <p class="task-description">{{ task.description }}</p>

                                <div class="task-meta">
                                    <div class="meta-item">
                                        <NIcon size="12">
                                            <TimeIcon />
                                        </NIcon>
                                        <span>{{ formatTime(task.createdAt) }}</span>
                                    </div>
                                    <div class="meta-item">
                                        <NIcon size="12">
                                            <PersonIcon />
                                        </NIcon>
                                        <span>{{ task.applicants }}人申请</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 任务底部 -->
                            <div class="task-footer">
                                <div class="price-info">
                                    <span class="price-label">报酬：</span>
                                    <span class="price-value">¥{{ task.reward }}</span>
                                </div>
                                <div class="difficulty-info">
                                    <span class="difficulty-label">难度：</span>
                                    <div class="difficulty-stars">
                                        <NIcon
                                            v-for="star in 5"
                                            :key="star"
                                            size="12"
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
                            </div>
                        </div>
                    </MobileCard>
                </div>
            </div>
            <div v-else>
                <MobileEmpty
                    type="data"
                    title="暂无热门任务"
                    description="当前没有热门任务，快来发布一个吧"
                    :show-action="true"
                    action-text="发布任务"
                    @action="router.push('/tasks/create')"
                />
            </div>
        </div>

        <!-- 我的任务统计 -->
        <div class="my-stats">
            <h3 class="section-title">我的统计</h3>
            <MobileCard>
                <div class="stats-grid">
                    <div v-for="stat in myStats" :key="stat.key" class="stat-item">
                        <div class="stat-value" :style="{ color: stat.color }">
                            {{ stat.value }}
                        </div>
                        <div class="stat-label">{{ stat.label }}</div>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 最近活动 -->
        <div class="recent-activity">
            <h3 class="section-title">最近活动</h3>
            <div v-if="recentActivities.length > 0">
                <MobileList
                    :items="recentActivities"
                    :show-border="true"
                    :show-divider="true"
                    @item-click="handleActivityClick"
                />
            </div>
            <div v-else>
                <MobileEmpty
                    type="data"
                    title="暂无活动记录"
                    description="您还没有任何任务活动记录"
                />
            </div>
        </div>

        <!-- 悬浮按钮 -->
        <div class="floating-buttons">
            <NButton
                type="primary"
                size="large"
                circle
                class="fab"
                @click="router.push('/tasks/create')"
            >
                <template #icon>
                    <NIcon size="24">
                        <AddIcon />
                    </NIcon>
                </template>
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NButton, NTag, useMessage } from 'naive-ui';
import {
    BusinessOutline as TaskIcon,
    SchoolOutline as StudyIcon,
    BrushOutline as DesignIcon,
    CodeSlashOutline as TechIcon,
    DocumentTextOutline as WritingIcon,
    HomeOutline as LifeIcon,
    TimeOutline as TimeIcon,
    PersonOutline as PersonIcon,
    StarOutline as StarIcon,
    AddOutline as AddIcon,
} from '@vicons/ionicons5';
import { MobileCard, MobileList, MobileEmpty } from '@/components/mobile';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 任务分类
const taskCategories = [
    {
        id: 1,
        title: '学习类',
        description: '辅导、笔记、研究',
        icon: StudyIcon,
        color: 'var(--n-primary-color)',
        route: '/tasks/list?category=study',
        taskCount: 128,
    },
    {
        id: 2,
        title: '设计类',
        description: '海报、LOGO、视频',
        icon: DesignIcon,
        color: 'var(--n-warning-color)',
        route: '/tasks/list?category=design',
        taskCount: 86,
    },
    {
        id: 3,
        title: '技术类',
        description: '编程、网站、系统',
        icon: TechIcon,
        color: 'var(--n-info-color)',
        route: '/tasks/list?category=tech',
        taskCount: 52,
    },
    {
        id: 4,
        title: '文案类',
        description: '文章、策划、翻译',
        icon: WritingIcon,
        color: 'var(--n-success-color)',
        route: '/tasks/list?category=writing',
        taskCount: 94,
    },
    {
        id: 5,
        title: '生活服务',
        description: '排队、跑腿、清洁',
        icon: LifeIcon,
        color: 'var(--n-error-color)',
        route: '/tasks/list?category=life',
        taskCount: 76,
    },
];

// 热门任务数据
const hotTasks = ref([
    {
        id: 1,
        category: 'study',
        title: '高等数学作业辅导',
        description: '需要帮助完成微积分相关的作业，要求有较好的数学基础',
        reward: 50,
        difficulty: 3,
        status: 'open',
        applicants: 8,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        publisher: {
            id: 1,
            name: '张同学',
            avatar: '',
        },
    },
    {
        id: 2,
        category: 'design',
        title: '社团活动海报设计',
        description: '为社团活动设计一张宣传海报，要求创意新颖，色彩搭配合理',
        reward: 80,
        difficulty: 2,
        status: 'open',
        applicants: 12,
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        publisher: {
            id: 2,
            name: '李社长',
            avatar: '',
        },
    },
    {
        id: 3,
        category: 'tech',
        title: '简单网页制作',
        description: '制作一个个人展示网页，包含基本的HTML/CSS/JS',
        reward: 120,
        difficulty: 4,
        status: 'open',
        applicants: 5,
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        publisher: {
            id: 3,
            name: '王同学',
            avatar: '',
        },
    },
]);

// 我的统计数据
const myStats = ref([
    {
        key: 'published',
        label: '发布任务',
        value: '12',
        color: 'var(--n-primary-color)',
    },
    {
        key: 'completed',
        label: '完成任务',
        value: '8',
        color: 'var(--n-success-color)',
    },
    {
        key: 'earnings',
        label: '总收入',
        value: '¥356',
        color: 'var(--n-warning-color)',
    },
    {
        key: 'rating',
        label: '评分',
        value: '4.8',
        color: 'var(--n-info-color)',
    },
]);

// 最近活动数据
const recentActivities = ref([
    {
        id: 1,
        title: '完成了"PPT制作"任务',
        description: '获得报酬 ¥60，评分 5星',
        extra: '2小时前',
        icon: TaskIcon,
        iconColor: 'var(--n-success-color)',
        showArrow: true,
    },
    {
        id: 2,
        title: '申请了"网站设计"任务',
        description: '等待发布者确认',
        extra: '1天前',
        icon: TaskIcon,
        iconColor: 'var(--n-warning-color)',
        showArrow: true,
    },
    {
        id: 3,
        title: '发布了"代写文案"任务',
        description: '已有3人申请',
        extra: '2天前',
        icon: TaskIcon,
        iconColor: 'var(--n-primary-color)',
        showArrow: true,
    },
]);

// 方法
const getCategoryIcon = (category: string) => {
    const iconMap = {
        study: StudyIcon,
        design: DesignIcon,
        tech: TechIcon,
        writing: WritingIcon,
        life: LifeIcon,
    };
    return iconMap[category] || TaskIcon;
};

const getCategoryColor = (category: string) => {
    const colorMap = {
        study: 'var(--n-primary-color)',
        design: 'var(--n-warning-color)',
        tech: 'var(--n-info-color)',
        writing: 'var(--n-success-color)',
        life: 'var(--n-error-color)',
    };
    return colorMap[category] || 'var(--n-primary-color)';
};

const getCategoryLabel = (category: string) => {
    const labelMap = {
        study: '学习类',
        design: '设计类',
        tech: '技术类',
        writing: '文案类',
        life: '生活服务',
    };
    return labelMap[category] || '其他';
};

const getStatusType = (status: string) => {
    const typeMap = {
        open: 'success',
        inProgress: 'info',
        completed: 'default',
        cancelled: 'error',
    };
    return typeMap[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const labelMap = {
        open: '招募中',
        inProgress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return labelMap[status] || '未知状态';
};

const formatTime = (date: Date) => {
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

// 处理点击事件
const handleCategoryClick = (category: any) => {
    appStore.hapticFeedback('light');
    router.push(category.route);
};

const handleTaskClick = (task: any) => {
    appStore.hapticFeedback('light');
    router.push(`/tasks/${task.id}`);
};

const handleActivityClick = (activity: any) => {
    appStore.hapticFeedback('light');
    // 根据活动类型跳转到相应页面
    console.log('活动点击:', activity);
};

// 获取数据
const fetchData = async () => {
    try {
        // 这里应该调用API获取真实数据
        await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
        console.error('获取数据失败:', error);
    }
};

onMounted(() => {
    fetchData();
});
</script>

<style scoped>
.tasks-page {
    padding: 16px;
    padding-bottom: 100px;
    min-height: 100vh;
    background: var(--n-body-color);
}

/* 顶部横幅 */
.tasks-header {
    margin-bottom: 24px;
}

.header-content {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
}

.header-icon {
    margin-bottom: 8px;
}

.header-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--n-text-color-1);
    margin: 0;
}

.header-desc {
    font-size: 14px;
    color: var(--n-text-color-2);
    margin: 0;
}

/* 区块标题 */
.section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 16px 0;
    padding: 0 4px;
}

.section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

/* 快捷操作 */
.quick-actions {
    margin-bottom: 32px;
}

.actions-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
}

.action-card {
    cursor: pointer;
    transition: all 0.2s ease;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.action-card:active {
    transform: scale(0.95);
}

.action-content {
    text-align: center;
    padding: 20px 16px;
}

.action-icon {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 12px;
}

.action-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 4px 0;
}

.action-desc {
    font-size: 13px;
    color: var(--n-text-color-2);
    margin: 0 0 6px 0;
}

.task-count {
    font-size: 12px;
    color: var(--n-text-color-3);
    font-weight: 500;
}

/* 热门任务 */
.hot-tasks {
    margin-bottom: 32px;
}

.task-item {
    margin-bottom: 12px;
    cursor: pointer;
}

.task-item:last-child {
    margin-bottom: 0;
}

.task-content {
    padding: 4px;
}

/* 任务头部 */
.task-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
}

.task-category {
    display: flex;
    align-items: center;
    gap: 6px;
}

.category-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--n-text-color-1);
}

/* 任务信息 */
.task-info {
    margin-bottom: 12px;
}

.task-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--n-text-color-1);
    margin: 0 0 6px 0;
    line-height: 1.3;
}

.task-description {
    font-size: 13px;
    color: var(--n-text-color-2);
    margin: 0 0 8px 0;
    line-height: 1.4;
}

.task-meta {
    display: flex;
    gap: 16px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--n-text-color-3);
}

/* 任务底部 */
.task-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 12px;
    border-top: 1px solid var(--n-border-color);
}

.price-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.price-label {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.price-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--n-error-color);
}

.difficulty-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.difficulty-label {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.difficulty-stars {
    display: flex;
    gap: 2px;
}

/* 我的统计 */
.my-stats {
    margin-bottom: 32px;
}

.stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    padding: 4px;
}

.stat-item {
    text-align: center;
    padding: 16px 8px;
}

.stat-value {
    font-size: 24px;
    font-weight: 700;
    line-height: 1;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    font-weight: 500;
}

/* 最近活动 */
.recent-activity {
    margin-bottom: 32px;
}

/* 悬浮按钮 */
.floating-buttons {
    position: fixed;
    bottom: 100px;
    right: 20px;
    z-index: 100;
}

.fab {
    width: 56px;
    height: 56px;
    box-shadow: 0 8px 24px rgba(0, 122, 255, 0.3);
}

/* 响应式适配 */
@media (max-width: 375px) {
    .tasks-page {
        padding: 12px;
        padding-bottom: 100px;
    }

    .actions-grid {
        gap: 8px;
    }

    .action-content {
        padding: 16px 12px;
    }

    .action-icon {
        width: 40px;
        height: 40px;
    }

    .action-title {
        font-size: 14px;
    }

    .action-desc,
    .task-count {
        font-size: 12px;
    }

    .header-title {
        font-size: 20px;
    }

    .section-title {
        font-size: 16px;
    }

    .stats-grid {
        gap: 16px;
    }

    .stat-value {
        font-size: 20px;
    }

    .floating-buttons {
        bottom: 95px;
        right: 16px;
    }

    .fab {
        width: 48px;
        height: 48px;
    }

    .task-meta {
        gap: 12px;
    }
}

/* iOS 安全区域适配 */
.tasks-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

.floating-buttons.is-ios {
    bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.tasks-page {
    animation: ios-fade-in 0.4s ease-out;
}

.tasks-header,
.quick-actions,
.hot-tasks,
.my-stats,
.recent-activity {
    animation: ios-fade-in 0.6s ease-out;
}

.quick-actions {
    animation-delay: 0.1s;
}

.hot-tasks {
    animation-delay: 0.2s;
}

.my-stats {
    animation-delay: 0.3s;
}

.recent-activity {
    animation-delay: 0.4s;
}

/* 深色模式优化 */
.dark-theme .action-card:active .action-content {
    background: var(--ios-dark-gray4);
}

.light-theme .action-card:active .action-content {
    background: var(--ios-gray5);
}

/* 卡片悬停效果 */
.task-item .mobile-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}

.dark-theme .task-item .mobile-card:hover {
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}
</style>
