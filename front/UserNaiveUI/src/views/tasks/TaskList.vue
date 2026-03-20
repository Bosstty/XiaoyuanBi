<template>
    <div class="task-list-page">
        <!-- 页面头部 -->
        <div class="page-header">
            <div class="header-content">
                <h1 class="page-title">任务大厅</h1>
                <p class="page-subtitle">学习、设计、技术各类任务</p>
            </div>
        </div>

        <!-- 分类标签 -->
        <div class="category-tabs">
            <div class="tabs-scroll hide-scrollbar">
                <div
                    v-for="tab in categoryTabs"
                    :key="tab.key"
                    class="tab-item"
                    :class="{ active: currentTab === tab.key }"
                    @click="handleTabChange(tab.key)"
                >
                    <div class="tab-icon" :style="{ background: tab.gradient }">
                        <NIcon :size="16" color="white">
                            <component :is="tab.icon" />
                        </NIcon>
                    </div>
                    <span class="tab-label">{{ tab.label }}</span>
                </div>
            </div>
        </div>

        <!-- 搜索栏 -->
        <div class="search-bar">
            <NInput
                v-model:value="searchQuery"
                placeholder="搜索任务..."
                size="large"
                clearable
                round
            >
                <template #prefix>
                    <NIcon><SearchOutline /></NIcon>
                </template>
            </NInput>
        </div>

        <!-- 任务列表 -->
        <div class="tasks-container">
            <div v-if="loading" class="loading-state">
                <NSpin size="large" />
            </div>

            <div v-else-if="filteredTasks.length > 0" class="tasks-list">
                <div
                    v-for="(task, index) in filteredTasks"
                    :key="task.id"
                    class="task-card ios-card"
                    :style="{ animationDelay: `${index * 80}ms` }"
                    @click="handleTaskClick(task)"
                >
                    <!-- 任务头部 -->
                    <div class="card-header">
                        <div class="category-badge" :style="{ background: getCategoryGradient(task.category) }">
                            <NIcon :size="12" color="white">
                                <component :is="getCategoryIcon(task.category)" />
                            </NIcon>
                            <span>{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <NTag :type="getStatusType(task.status)" size="small" :bordered="false">
                            {{ getStatusLabel(task.status) }}
                        </NTag>
                    </div>

                    <!-- 任务内容 -->
                    <div class="card-body">
                        <h3 class="task-title">{{ task.title }}</h3>
                        <p class="task-desc">{{ task.description }}</p>

                        <!-- 难度星级 -->
                        <div class="difficulty-row">
                            <div class="difficulty-stars">
                                <svg
                                    v-for="star in 5"
                                    :key="star"
                                    width="12"
                                    height="12"
                                    viewBox="0 0 24 24"
                                    :fill="star <= task.difficulty ? '#FF9500' : 'var(--ios-gray4)'"
                                >
                                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                </svg>
                            </div>
                            <span class="difficulty-text">{{ task.difficulty }}星难度</span>
                        </div>

                        <!-- 元信息 -->
                        <div class="task-meta">
                            <div class="meta-item">
                                <NIcon :size="14" class="meta-icon"><PersonOutline /></NIcon>
                                <span>{{ task.applicants }}人申请</span>
                            </div>
                            <div class="meta-item">
                                <NIcon :size="14" class="meta-icon"><TimeOutline /></NIcon>
                                <span>{{ formatDeadline(task.deadline) }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 任务底部 -->
                    <div class="card-footer">
                        <div class="publisher-info">
                            <NAvatar :size="24" round />
                            <div class="publisher-detail">
                                <span class="publisher-name">{{ task.publisher.name }}</span>
                                <span class="publisher-rating">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#FF9500">
                                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                                    </svg>
                                    {{ task.publisher.rating }}
                                </span>
                            </div>
                        </div>
                        <div class="reward-info">
                            <span class="reward-label">报酬</span>
                            <span class="reward-value">¥{{ task.reward }}</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 空状态 -->
            <div v-else class="empty-state">
                <div class="empty-icon">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                        <rect x="12" y="16" width="40" height="32" rx="4" fill="var(--ios-gray6)" />
                        <path d="M20 28h24M20 36h16" stroke="var(--ios-gray3)" stroke-width="3" stroke-linecap="round"/>
                    </svg>
                </div>
                <h4 class="empty-title">暂无任务</h4>
                <p class="empty-desc">快去发布一个任务吧</p>
                <NButton type="primary" @click="router.push('/tasks/create')">
                    发布任务
                </NButton>
            </div>
        </div>

        <!-- 发布任务按钮 -->
        <div class="create-btn-wrap">
            <NButton type="primary" size="large" circle class="create-btn" @click="router.push('/tasks/create')">
                <template #icon>
                    <NIcon size="24"><AddOutline /></NIcon>
                </template>
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, markRaw } from 'vue';
import { useRouter } from 'vue-router';
import { NInput, NButton, NIcon, NTag, NAvatar, NSpin } from 'naive-ui';
import {
    SearchOutline,
    PersonOutline,
    TimeOutline,
    AddOutline,
    SchoolOutline,
    BrushOutline,
    CodeSlashOutline,
    DocumentTextOutline,
    HomeOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const userStore = useUserStore();
const appStore = useAppStore();

// 状态
const searchQuery = ref('');
const currentTab = ref('all');
const loading = ref(false);

// 分类标签
const categoryTabs = ref([
    { key: 'all', label: '全部', icon: markRaw(DocumentTextOutline), gradient: 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)' },
    { key: 'study', label: '学习', icon: markRaw(SchoolOutline), gradient: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)' },
    { key: 'design', label: '设计', icon: markRaw(BrushOutline), gradient: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)' },
    { key: 'tech', label: '技术', icon: markRaw(CodeSlashOutline), gradient: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)' },
    { key: 'writing', label: '文案', icon: markRaw(DocumentTextOutline), gradient: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)' },
    { key: 'life', label: '生活', icon: markRaw(HomeOutline), gradient: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)' },
]);

// 模拟任务数据
const tasks = ref([
    {
        id: 1,
        category: 'study',
        title: '高等数学作业辅导',
        description: '需要帮助完成微积分相关的作业，要求有较好的数学基础',
        reward: 50,
        difficulty: 3,
        status: 'open',
        applicants: 8,
        deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
        publisher: { id: 1, name: '张同学', rating: 4.8 },
    },
    {
        id: 2,
        category: 'design',
        title: '社团活动海报设计',
        description: '为社团活动设计一张宣传海报，要求创意新颖',
        reward: 80,
        difficulty: 2,
        status: 'open',
        applicants: 12,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
        publisher: { id: 2, name: '李社长', rating: 4.9 },
    },
    {
        id: 3,
        category: 'tech',
        title: '简单网页制作',
        description: '制作一个个人展示网页，包含HTML/CSS/JS',
        reward: 120,
        difficulty: 4,
        status: 'open',
        applicants: 5,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
        publisher: { id: 3, name: '王同学', rating: 4.7 },
    },
    {
        id: 4,
        category: 'writing',
        title: '活动策划书撰写',
        description: '为学院文艺活动撰写策划书，包含活动流程、预算等',
        reward: 60,
        difficulty: 2,
        status: 'inProgress',
        applicants: 15,
        deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
        publisher: { id: 4, name: '刘老师', rating: 5.0 },
    },
    {
        id: 5,
        category: 'life',
        title: '宿舍搬家帮忙',
        description: '需要帮忙搬宿舍，物品不多，主要是书籍和生活用品',
        reward: 30,
        difficulty: 1,
        status: 'open',
        applicants: 3,
        deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
        createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
        publisher: { id: 5, name: '小美', rating: 4.6 },
    },
]);

// 筛选任务
const filteredTasks = computed(() => {
    let result = tasks.value;

    if (currentTab.value !== 'all') {
        result = result.filter(t => t.category === currentTab.value);
    }

    if (searchQuery.value.trim()) {
        const query = searchQuery.value.toLowerCase();
        result = result.filter(t =>
            t.title.toLowerCase().includes(query) ||
            t.description.toLowerCase().includes(query)
        );
    }

    return result;
});

// 获取分类图标
const getCategoryIcon = (category: string) => {
    const map: Record<string, any> = {
        study: SchoolOutline,
        design: BrushOutline,
        tech: CodeSlashOutline,
        writing: DocumentTextOutline,
        life: HomeOutline,
    };
    return map[category] || DocumentTextOutline;
};

// 获取分类渐变
const getCategoryGradient = (category: string) => {
    const map: Record<string, string> = {
        study: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)',
        design: 'linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)',
        tech: 'linear-gradient(135deg, #34C759 0%, #30D158 100%)',
        writing: 'linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)',
        life: 'linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)',
    };
    return map[category] || map.study;
};

// 获取分类标签
const getCategoryLabel = (category: string) => {
    const map: Record<string, string> = {
        study: '学习辅导',
        design: '设计制作',
        tech: '技术开发',
        writing: '文案撰写',
        life: '生活服务',
    };
    return map[category] || '任务';
};

// 获取状态类型
const getStatusType = (status: string) => {
    const map: Record<string, any> = {
        open: 'success',
        inProgress: 'warning',
        completed: 'info',
        closed: 'default',
    };
    return map[status] || 'default';
};

// 获取状态标签
const getStatusLabel = (status: string) => {
    const map: Record<string, string> = {
        open: '待接取',
        inProgress: '进行中',
        completed: '已完成',
        closed: '已关闭',
    };
    return map[status] || '未知';
};

// 格式化截止时间
const formatDeadline = (date: Date) => {
    const diff = date.getTime() - Date.now();
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    if (days === 0) return '今天截止';
    if (days === 1) return '明天截止';
    if (days < 7) return `${days}天后截止`;
    return `${Math.floor(days / 7)}周后截止`;
};

// 切换标签
const handleTabChange = (key: string) => {
    currentTab.value = key;
    appStore.hapticFeedback('light');
};

// 点击任务
const handleTaskClick = (task: any) => {
    appStore.hapticFeedback('light');
    router.push(`/tasks/${task.id}`);
};

// 加载数据
onMounted(() => {
    loading.value = true;
    setTimeout(() => {
        loading.value = false;
    }, 500);
});
</script>

<style scoped>
.task-list-page {
    min-height: 100vh;
    background: var(--ios-bg-secondary);
    padding-bottom: 100px;
}

/* 页面头部 */
.page-header {
    background: linear-gradient(135deg, #34C759 0%, #30D158 100%);
    padding: 52px 16px 32px;
    border-radius: 0 0 24px 24px;
}

.dark .page-header {
    background: linear-gradient(135deg, #30D74B 0%, #32D74B 100%);
}

.header-content {
    text-align: center;
}

.page-title {
    font-size: 28px;
    font-weight: 700;
    color: white;
    margin: 0 0 4px 0;
}

.page-subtitle {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.8);
    margin: 0;
}

/* 分类标签 */
.category-tabs {
    margin-top: -20px;
    padding: 0 16px;
    position: relative;
    z-index: 10;
}

.tabs-scroll {
    display: flex;
    gap: 10px;
    overflow-x: auto;
    padding-bottom: 8px;
    -webkit-overflow-scrolling: touch;
}

.tab-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 16px;
    background: var(--ios-bg-primary);
    border-radius: 24px;
    box-shadow: var(--ios-shadow-sm);
    cursor: pointer;
    flex-shrink: 0;
    transition: all 0.2s ease;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.96);
}

.tab-item.active {
    background: #34C759;
    box-shadow: 0 4px 12px rgba(52, 199, 89, 0.3);
}

.tab-item.active .tab-label {
    color: white;
}

.tab-icon {
    width: 24px;
    height: 24px;
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.tab-label {
    font-size: 14px;
    font-weight: 500;
    color: var(--ios-text-primary);
}

/* 搜索栏 */
.search-bar {
    padding: 20px 16px 12px;
}

/* 任务列表 */
.tasks-container {
    padding: 0 16px;
}

.tasks-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.task-card {
    padding: 0;
    overflow: hidden;
    animation: ios-fade-in 0.4s ease-out backwards;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 16px;
    border-bottom: 0.5px solid var(--ios-divider);
}

.category-badge {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 11px;
    font-weight: 600;
    color: white;
}

.card-body {
    padding: 14px 16px;
}

.task-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--ios-text-primary);
    margin: 0 0 6px 0;
}

.task-desc {
    font-size: 14px;
    color: var(--ios-text-secondary);
    margin: 0 0 12px 0;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
}

.difficulty-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
}

.difficulty-stars {
    display: flex;
    gap: 2px;
}

.difficulty-text {
    font-size: 11px;
    color: var(--ios-text-tertiary);
}

.task-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
}

.meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ios-text-tertiary);
}

.meta-icon {
    opacity: 0.7;
}

.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    background: var(--ios-gray6);
}

.dark .card-footer {
    background: var(--ios-gray5);
}

.publisher-info {
    display: flex;
    align-items: center;
    gap: 10px;
}

.publisher-detail {
    display: flex;
    flex-direction: column;
    gap: 2px;
}

.publisher-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--ios-text-primary);
}

.publisher-rating {
    display: flex;
    align-items: center;
    gap: 2px;
    font-size: 11px;
    color: var(--ios-text-tertiary);
}

.reward-info {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
}

.reward-label {
    font-size: 11px;
    color: var(--ios-text-tertiary);
}

.reward-value {
    font-size: 20px;
    font-weight: 700;
    color: #34C759;
}

/* 空状态 */
.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
}

.empty-icon {
    margin-bottom: 20px;
}

.empty-title {
    font-size: 17px;
    font-weight: 600;
    color: var(--ios-text-primary);
    margin: 0 0 8px 0;
}

.empty-desc {
    font-size: 14px;
    color: var(--ios-text-tertiary);
    margin: 0 0 24px 0;
}

/* 创建按钮 */
.create-btn-wrap {
    position: fixed;
    bottom: 100px;
    right: 20px;
    z-index: 100;
}

.create-btn {
    width: 56px;
    height: 56px;
    box-shadow: 0 8px 24px rgba(52, 199, 89, 0.4);
}

.dark .create-btn {
    box-shadow: 0 8px 24px rgba(48, 215, 75, 0.4);
}

/* 加载状态 */
.loading-state {
    display: flex;
    justify-content: center;
    align-items: center;
    padding: 60px 0;
}

/* 动画 */
@keyframes ios-fade-in {
    from {
        opacity: 0;
        transform: translateY(16px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

/* 小屏优化 */
@media (max-width: 375px) {
    .page-title {
        font-size: 24px;
    }

    .tab-item {
        padding: 8px 12px;
    }

    .tab-label {
        font-size: 13px;
    }
}
</style>
