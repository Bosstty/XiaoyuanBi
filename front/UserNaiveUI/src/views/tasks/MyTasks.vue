<template>
    <div class="my-tasks-page">
        <!-- 导航栏 -->
        <div class="nav-header">
            <MobileNavBar title="我的任务" show-back @back="router.back()" />
        </div>

        <!-- 筛选标签 -->
        <div class="filter-section">
            <MobileCard :padding="'12px 16px'">
                <div class="filter-tabs">
                    <div
                        v-for="tab in filterTabs"
                        :key="tab.key"
                        class="filter-tab"
                        :class="{ active: currentTab === tab.key }"
                        @click="handleTabChange(tab.key)"
                    >
                        <span class="tab-label">{{ tab.label }}</span>
                        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 搜索框 -->
        <div class="search-section">
            <MobileCard :padding="'12px 16px'">
                <NInput
                    v-model:value="searchQuery"
                    placeholder="搜索我的任务..."
                    size="medium"
                    clearable
                    @update:value="handleSearch"
                >
                    <template #prefix>
                        <NIcon size="16">
                            <SearchIcon />
                        </NIcon>
                    </template>
                </NInput>
            </MobileCard>
        </div>

        <!-- 任务列表 -->
        <div class="tasks-section">
            <div v-if="loading" class="loading-container">
                <MobileLoading type="default" text="加载中..." />
            </div>

            <div v-else-if="filteredTasks.length > 0">
                <div v-for="task in filteredTasks" :key="task.id" class="task-item">
                    <MobileCard :hoverable="true" @click="viewTaskDetail(task)">
                        <div class="task-content">
                            <!-- 任务头部 -->
                            <div class="task-header">
                                <div class="task-category">
                                    <NIcon size="18" :color="getCategoryColor(task.category)">
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
                                    <div class="meta-item">
                                        <NIcon size="12">
                                            <CalendarIcon />
                                        </NIcon>
                                        <span>{{ formatDeadline(task.deadline) }}</span>
                                    </div>
                                </div>
                            </div>

                            <!-- 任务底部 -->
                            <div class="task-footer">
                                <div class="reward-info">
                                    <span class="reward-label">
                                        {{ task.role === 'publisher' ? '支付：' : '收入：' }}
                                    </span>
                                    <span class="reward-value">¥{{ task.reward }}</span>
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
                                <div class="task-actions">
                                    <NButton
                                        v-if="task.status === 'open' && task.role === 'publisher'"
                                        size="small"
                                        type="warning"
                                        @click.stop="cancelTask(task)"
                                    >
                                        取消任务
                                    </NButton>
                                    <NButton
                                        v-else-if="
                                            task.status === 'inProgress' && task.role === 'accepter'
                                        "
                                        size="small"
                                        type="primary"
                                        @click.stop="completeTask(task)"
                                    >
                                        完成任务
                                    </NButton>
                                    <NButton
                                        v-else-if="
                                            task.status === 'completed' &&
                                            task.role === 'publisher' &&
                                            !task.rated
                                        "
                                        size="small"
                                        type="primary"
                                        @click.stop="rateTask(task)"
                                    >
                                        评价
                                    </NButton>
                                    <NButton v-else size="small" @click.stop="contactUser(task)">
                                        联系
                                    </NButton>
                                </div>
                            </div>
                        </div>
                    </MobileCard>
                </div>

                <!-- 加载更多 -->
                <div v-if="hasMore" class="load-more">
                    <NButton block :loading="loadingMore" @click="loadMore">加载更多</NButton>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else>
                <MobileEmpty
                    :type="getEmptyType()"
                    :title="getEmptyTitle()"
                    :description="getEmptyDescription()"
                    :show-action="currentTab === 'published'"
                    action-text="发布任务"
                    @action="router.push('/tasks/create')"
                />
            </div>
        </div>

        <!-- 统计信息 -->
        <div v-if="!loading && stats" class="stats-section">
            <MobileCard>
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.published }}</div>
                        <div class="stat-label">发布任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.accepted }}</div>
                        <div class="stat-label">接受任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">{{ stats.completed }}</div>
                        <div class="stat-label">完成任务</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-value">¥{{ stats.totalEarnings }}</div>
                        <div class="stat-label">总收入</div>
                    </div>
                </div>
            </MobileCard>
        </div>

        <!-- 确认弹窗 -->
        <MobileModal
            v-model:show="showConfirmModal"
            :title="confirmModalData.title"
            @confirm="handleConfirm"
        >
            <p>{{ confirmModalData.content }}</p>
        </MobileModal>

        <!-- 评价弹窗 -->
        <MobileModal v-model:show="showRatingModal" title="评价任务" @confirm="submitRating">
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
import { useRouter } from 'vue-router';
import { NInput, NButton, NIcon, NTag, useMessage } from 'naive-ui';
import {
    SearchOutline as SearchIcon,
    TimeOutline as TimeIcon,
    PersonOutline as PersonIcon,
    CalendarOutline as CalendarIcon,
    StarOutline as StarIcon,
    SchoolOutline as StudyIcon,
    BrushOutline as DesignIcon,
    CodeSlashOutline as TechIcon,
    DocumentTextOutline as WritingIcon,
    HomeOutline as LifeIcon,
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
const userStore = useUserStore();
const appStore = useAppStore();
const message = useMessage();

// 数据状态
const loading = ref(true);
const loadingMore = ref(false);
const hasMore = ref(true);
const currentTab = ref('all');
const searchQuery = ref('');
const showConfirmModal = ref(false);
const showRatingModal = ref(false);
const rating = ref(0);
const ratingComment = ref('');
const currentTask = ref(null);

// 确认弹窗数据
const confirmModalData = ref({
    title: '',
    content: '',
    action: '',
});

// 筛选标签
const filterTabs = [
    { key: 'all', label: '全部', count: 0 },
    { key: 'published', label: '我发布的', count: 0 },
    { key: 'accepted', label: '我接受的', count: 0 },
    { key: 'open', label: '招募中', count: 0 },
    { key: 'inProgress', label: '进行中', count: 0 },
    { key: 'completed', label: '已完成', count: 0 },
];

// 模拟任务数据
const tasks = ref([
    {
        id: 1,
        category: 'study',
        title: '高等数学作业辅导',
        description: '需要帮助完成微积分相关的作业，要求有较好的数学基础',
        reward: 50,
        difficulty: 3,
        status: 'completed',
        role: 'publisher', // 'publisher' 或 'accepter'
        applicants: 8,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        rated: true,
        accepter: {
            id: 3,
            name: '李辅导',
            avatar: '',
        },
    },
    {
        id: 2,
        category: 'design',
        title: '社团活动海报设计',
        description: '为社团活动设计一张宣传海报，要求创意新颖',
        reward: 80,
        difficulty: 2,
        status: 'inProgress',
        role: 'accepter',
        applicants: 12,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        rated: false,
        publisher: {
            id: 2,
            name: '张社长',
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
        role: 'publisher',
        applicants: 5,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        rated: false,
    },
    {
        id: 4,
        category: 'writing',
        title: '活动策划书撰写',
        description: '为学院举办的文艺活动撰写策划书',
        reward: 60,
        difficulty: 2,
        status: 'completed',
        role: 'accepter',
        applicants: 15,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        rated: false,
        publisher: {
            id: 4,
            name: '刘老师',
            avatar: '',
        },
    },
    {
        id: 5,
        category: 'life',
        title: '宿舍清洁服务',
        description: '需要帮忙打扫宿舍，主要是整理和清洁',
        reward: 30,
        difficulty: 1,
        status: 'open',
        role: 'accepter',
        applicants: 3,
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        rated: false,
        publisher: {
            id: 5,
            name: '小美',
            avatar: '',
        },
    },
]);

// 统计数据
const stats = ref({
    published: 18,
    accepted: 25,
    completed: 42,
    totalEarnings: 456.5,
});

// 计算属性
const filteredTasks = computed(() => {
    let result = tasks.value;

    // 按标签筛选
    if (currentTab.value !== 'all') {
        if (currentTab.value === 'published') {
            result = result.filter(task => task.role === 'publisher');
        } else if (currentTab.value === 'accepted') {
            result = result.filter(task => task.role === 'accepter');
        } else {
            result = result.filter(task => task.status === currentTab.value);
        }
    }

    // 按搜索关键词筛选
    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(
            task =>
                task.title.toLowerCase().includes(query) ||
                task.description.toLowerCase().includes(query)
        );
    }

    return result;
});

// 方法
const getCategoryIcon = (category: string) => {
    const iconMap = {
        study: StudyIcon,
        design: DesignIcon,
        tech: TechIcon,
        writing: WritingIcon,
        life: LifeIcon,
    };
    return iconMap[category] || StudyIcon;
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

const formatDeadline = (date: Date) => {
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days < 0) {
        return '已截止';
    } else if (days === 0) {
        return '今天截止';
    } else if (days === 1) {
        return '明天截止';
    } else {
        return `${days}天后截止`;
    }
};

const getEmptyType = () => {
    return searchQuery.value.trim() ? 'search' : 'data';
};

const getEmptyTitle = () => {
    return searchQuery.value.trim() ? '暂无搜索结果' : '暂无任务';
};

const getEmptyDescription = () => {
    return searchQuery.value.trim() ? '尝试调整搜索条件或关键词' : '您还没有相关的任务记录';
};

// 更新标签数量
const updateTabCounts = () => {
    filterTabs[0].count = tasks.value.length; // 全部
    filterTabs[1].count = tasks.value.filter(t => t.role === 'publisher').length; // 我发布的
    filterTabs[2].count = tasks.value.filter(t => t.role === 'accepter').length; // 我接受的
    filterTabs[3].count = tasks.value.filter(t => t.status === 'open').length; // 招募中
    filterTabs[4].count = tasks.value.filter(t => t.status === 'inProgress').length; // 进行中
    filterTabs[5].count = tasks.value.filter(t => t.status === 'completed').length; // 已完成
};

// 事件处理
const handleTabChange = (tabKey: string) => {
    currentTab.value = tabKey;
    appStore.hapticFeedback('light');
};

const handleSearch = (value: string) => {
    // 实际应用中这里可以添加防抖
    console.log('搜索:', value);
};

const viewTaskDetail = (task: any) => {
    appStore.hapticFeedback('light');
    router.push(`/tasks/${task.id}`);
};

const cancelTask = (task: any) => {
    currentTask.value = task;
    confirmModalData.value = {
        title: '取消任务',
        content: '确定要取消这个任务吗？取消后无法恢复。',
        action: 'cancel',
    };
    showConfirmModal.value = true;
};

const completeTask = (task: any) => {
    currentTask.value = task;
    confirmModalData.value = {
        title: '完成任务',
        content: '确认已经完成这个任务了吗？',
        action: 'complete',
    };
    showConfirmModal.value = true;
};

const rateTask = (task: any) => {
    currentTask.value = task;
    rating.value = 0;
    ratingComment.value = '';
    showRatingModal.value = true;
};

const contactUser = (task: any) => {
    message.info('联系功能开发中...');
    appStore.hapticFeedback('light');
};

const handleConfirm = async () => {
    if (!currentTask.value) return;

    try {
        if (confirmModalData.value.action === 'cancel') {
            // 模拟取消任务
            await new Promise(resolve => setTimeout(resolve, 1000));
            currentTask.value.status = 'cancelled';
            message.success('任务已取消');
        } else if (confirmModalData.value.action === 'complete') {
            // 模拟完成任务
            await new Promise(resolve => setTimeout(resolve, 1500));
            currentTask.value.status = 'completed';
            message.success('任务已完成');
        }

        updateTabCounts();
        appStore.hapticFeedback('medium');
    } catch (error) {
        message.error('操作失败');
    } finally {
        showConfirmModal.value = false;
        currentTask.value = null;
    }
};

const submitRating = () => {
    if (rating.value === 0) {
        message.warning('请选择评分');
        return;
    }

    if (currentTask.value) {
        currentTask.value.rated = true;
    }

    message.success('评价提交成功');
    showRatingModal.value = false;
    currentTask.value = null;
    rating.value = 0;
    ratingComment.value = '';
};

const loadMore = async () => {
    loadingMore.value = true;
    try {
        // 模拟API调用
        await new Promise(resolve => setTimeout(resolve, 1000));
        // 这里应该加载更多数据
        hasMore.value = false; // 暂时设置为没有更多数据
    } catch (error) {
        message.error('加载失败');
    } finally {
        loadingMore.value = false;
    }
};

// 获取任务列表
const fetchTasks = async () => {
    loading.value = true;
    try {
        // 这里应该调用API获取真实数据
        await new Promise(resolve => setTimeout(resolve, 800));
        updateTabCounts();
    } catch (error) {
        message.error('获取任务列表失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchTasks();
});
</script>

<style scoped>
.my-tasks-page {
    background: var(--n-body-color);
    min-height: 100vh;
}

.nav-header {
    position: sticky;
    top: 0;
    z-index: 100;
}

.filter-section,
.search-section {
    margin: 16px 16px 0 16px;
}

.search-section {
    margin-top: 8px;
}

/* 筛选标签 */
.filter-tabs {
    display: flex;
    gap: 4px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.filter-tabs::-webkit-scrollbar {
    display: none;
}

.filter-tab {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px 12px;
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
    flex-shrink: 0;
    border: 1px solid var(--n-border-color);
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.filter-tab:hover {
    background: var(--n-color-target);
}

.filter-tab.active {
    background: var(--n-primary-color);
    border-color: var(--n-primary-color);
    color: white;
}

.tab-label {
    font-size: 13px;
    font-weight: 500;
}

.tab-count {
    font-size: 12px;
    background: rgba(255, 255, 255, 0.3);
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    text-align: center;
}

.filter-tab:not(.active) .tab-count {
    background: var(--n-primary-color);
    color: white;
}

/* 任务列表 */
.tasks-section {
    margin: 16px;
    margin-bottom: 32px;
}

.loading-container {
    padding: 60px 0;
    text-align: center;
}

.task-item {
    margin-bottom: 12px;
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
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
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
    flex-wrap: wrap;
    gap: 8px;
}

.reward-info {
    display: flex;
    align-items: center;
    gap: 4px;
}

.reward-label {
    font-size: 13px;
    color: var(--n-text-color-2);
}

.reward-value {
    font-size: 15px;
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

.task-actions {
    display: flex;
    gap: 8px;
}

/* 加载更多 */
.load-more {
    margin-top: 20px;
}

/* 统计信息 */
.stats-section {
    margin: 0 16px 32px 16px;
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
    font-size: 20px;
    font-weight: 700;
    color: var(--n-primary-color);
    line-height: 1;
    margin-bottom: 4px;
}

.stat-label {
    font-size: 13px;
    color: var(--n-text-color-2);
    font-weight: 500;
}

/* 评价表单 */
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
    .filter-section,
    .search-section,
    .tasks-section,
    .stats-section {
        margin-left: 12px;
        margin-right: 12px;
    }

    .task-content {
        padding: 2px;
    }

    .task-title {
        font-size: 14px;
    }

    .task-description {
        font-size: 12px;
    }

    .stats-grid {
        gap: 16px;
    }

    .stat-value {
        font-size: 18px;
    }

    .filter-tab {
        padding: 6px 10px;
    }

    .tab-label {
        font-size: 12px;
    }

    .task-meta {
        gap: 8px;
    }

    .meta-item {
        font-size: 11px;
    }

    .task-footer {
        gap: 6px;
    }

    .reward-value {
        font-size: 14px;
    }
}

/* iOS 安全区域适配 */
.my-tasks-page.is-ios {
    padding-bottom: calc(100px + var(--safe-area-bottom, 34px));
}

/* 加载动画 */
.my-tasks-page {
    animation: ios-fade-in 0.4s ease-out;
}

.filter-section,
.search-section,
.tasks-section {
    animation: ios-fade-in 0.6s ease-out;
}

.filter-section {
    animation-delay: 0.1s;
}

.search-section {
    animation-delay: 0.2s;
}

.tasks-section {
    animation-delay: 0.3s;
}

/* 深色模式优化 */
.dark-theme .filter-tab:hover {
    background: var(--ios-dark-gray4);
}

.light-theme .filter-tab:hover {
    background: var(--ios-gray5);
}

/* 卡片悬停效果 */
.task-item .mobile-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.dark-theme .task-item .mobile-card:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

/* 按钮样式覆盖 */
.load-more :deep(.n-button) {
    border-radius: 8px;
    height: 40px;
    font-weight: 500;
}

.task-actions :deep(.n-button) {
    border-radius: 6px;
    height: 28px;
    font-size: 12px;
}
</style>
