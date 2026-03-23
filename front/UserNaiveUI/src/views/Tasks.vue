<template>
    <div class="task-center">
        <section class="task-center__hero">
            <div class="task-center__hero-copy">
                <span>Campus Task Market</span>
                <h1>任务中心</h1>
                <p>让学习、设计、技术和生活互助在校园内快速匹配、协作和结算。</p>
            </div>
            <button type="button" class="task-center__publish touch-feedback" @click="go('/tasks/create')">
                发布任务
            </button>
        </section>

        <section class="task-center__section">
            <div class="task-center__section-head">
                <h3>热门分类</h3>
                <button type="button" @click="go('/tasks/list')">全部任务</button>
            </div>
            <div class="task-center__category-grid">
                <article
                    v-for="category in taskCategories"
                    :key="category.id"
                    class="task-center__category-card touch-feedback"
                    @click="go(category.route)"
                >
                    <div class="task-center__category-icon" :style="{ background: category.tint }">
                        <NIcon :size="22"><component :is="category.icon" /></NIcon>
                    </div>
                    <h4>{{ category.title }}</h4>
                    <p>{{ category.description }}</p>
                    <span>{{ category.taskCount }} 个任务</span>
                </article>
            </div>
        </section>

        <section class="task-center__section">
            <div class="task-center__section-head">
                <h3>正在招募</h3>
            </div>
            <div class="task-center__list">
                <article
                    v-for="task in hotTasks"
                    :key="task.id"
                    class="task-center__task-card touch-feedback"
                    @click="go(`/tasks/${task.id}`)"
                >
                    <div class="task-center__task-top">
                        <div class="task-center__task-tag">
                            <NIcon :size="16"><component :is="getCategoryIcon(task.category)" /></NIcon>
                            <span>{{ getCategoryLabel(task.category) }}</span>
                        </div>
                        <NTag size="small" :bordered="false" :type="getStatusType(task.status)">
                            {{ getStatusLabel(task.status) }}
                        </NTag>
                    </div>
                    <h4>{{ task.title }}</h4>
                    <p>{{ task.description }}</p>
                    <div class="task-center__task-stats">
                        <span><NIcon :size="14"><TimeIcon /></NIcon>{{ formatTime(task.createdAt) }}</span>
                        <span><NIcon :size="14"><PersonIcon /></NIcon>{{ task.applicants }} 人申请</span>
                        <span class="task-center__reward">¥{{ task.reward }}</span>
                    </div>
                </article>
            </div>
        </section>

        <section class="task-center__section">
            <div class="task-center__section-head">
                <h3>任务趋势</h3>
            </div>
            <div class="task-center__trend-grid">
                <article v-for="stat in myStats" :key="stat.key" class="task-center__trend-card">
                    <strong :style="{ color: stat.color }">{{ stat.value }}</strong>
                    <h4>{{ stat.label }}</h4>
                    <p>{{ stat.note }}</p>
                </article>
            </div>
        </section>

        <section class="task-center__section">
            <div class="task-center__section-head">
                <h3>最近活动</h3>
            </div>
            <div class="task-center__activity-list">
                <article v-for="activity in recentActivities" :key="activity.id" class="task-center__activity-card">
                    <div class="task-center__activity-icon">
                        <NIcon :size="18"><component :is="activity.icon" /></NIcon>
                    </div>
                    <div class="task-center__activity-copy">
                        <strong>{{ activity.title }}</strong>
                        <p>{{ activity.description }}</p>
                    </div>
                    <span>{{ activity.extra }}</span>
                </article>
            </div>
        </section>

        <button type="button" class="task-center__fab touch-feedback" @click="go('/tasks/create')">
            <NIcon :size="24"><AddIcon /></NIcon>
        </button>
        <div class="task-center__safe-space"></div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { NIcon, NTag } from 'naive-ui';
import {
    BriefcaseOutline as TaskIcon,
    SchoolOutline as StudyIcon,
    BrushOutline as DesignIcon,
    CodeSlashOutline as TechIcon,
    DocumentTextOutline as WritingIcon,
    HomeOutline as LifeIcon,
    TimeOutline as TimeIcon,
    PersonOutline as PersonIcon,
    AddOutline as AddIcon,
    SparklesOutline as SparklesIcon,
} from '@vicons/ionicons5';
import { useAppStore } from '@/stores';

const router = useRouter();
const appStore = useAppStore();

const taskCategories = [
    { id: 1, title: '学习类', description: '辅导、笔记、论文、研究', icon: StudyIcon, route: '/tasks/list?category=study', taskCount: 128, tint: 'linear-gradient(135deg, rgba(47,107,255,0.16), rgba(75,184,255,0.18))' },
    { id: 2, title: '设计类', description: '海报、LOGO、视频包装', icon: DesignIcon, route: '/tasks/list?category=design', taskCount: 86, tint: 'linear-gradient(135deg, rgba(255,155,61,0.18), rgba(247,199,95,0.2))' },
    { id: 3, title: '技术类', description: '编程、网站、小程序、系统', icon: TechIcon, route: '/tasks/list?category=tech', taskCount: 52, tint: 'linear-gradient(135deg, rgba(25,179,107,0.18), rgba(75,184,255,0.12))' },
    { id: 4, title: '文案类', description: '文章、策划、翻译、简历优化', icon: WritingIcon, route: '/tasks/list?category=writing', taskCount: 94, tint: 'linear-gradient(135deg, rgba(111,95,255,0.14), rgba(75,184,255,0.12))' },
];

const hotTasks = ref([
    { id: 1, category: 'study', title: '高等数学作业辅导', description: '需要帮助完成微积分相关题目整理，今晚前确认思路和解题过程。', reward: 50, status: 'open', applicants: 8, createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) },
    { id: 2, category: 'design', title: '社团招新海报设计', description: '希望做一版更年轻化、适合朋友圈传播的海报与封面图。', reward: 80, status: 'open', applicants: 12, createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000) },
    { id: 3, category: 'tech', title: '个人展示网页制作', description: '需要一个可部署的个人介绍页，要求简洁、响应式、带作品模块。', reward: 120, status: 'open', applicants: 5, createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000) },
]);

const myStats = ref([
    { key: 'published', label: '本周发布', value: '12', color: '#2F6BFF', note: '平均 3 小时内收到申请' },
    { key: 'completed', label: '已完成', value: '8', color: '#19B36B', note: '任务完成率稳定提升' },
    { key: 'income', label: '累计收入', value: '¥356', color: '#FF9B3D', note: '接单收益已入账钱包' },
    { key: 'quality', label: '满意度', value: '4.8', color: '#17304F', note: '评价体系影响后续匹配' },
]);

const recentActivities = ref([
    { id: 1, title: '完成了 PPT 制作任务', description: '发布方已确认并结算报酬。', extra: '2 小时前', icon: SparklesIcon },
    { id: 2, title: '申请了网站设计任务', description: '等待发布方确认是否录用。', extra: '1 天前', icon: TaskIcon },
    { id: 3, title: '发布了代写文案需求', description: '已有 3 位同学申请协作。', extra: '2 天前', icon: WritingIcon },
]);

const getCategoryIcon = (category: string) => {
    const iconMap: Record<string, any> = {
        study: StudyIcon,
        design: DesignIcon,
        tech: TechIcon,
        writing: WritingIcon,
        life: LifeIcon,
    };
    return iconMap[category] || TaskIcon;
};

const getCategoryLabel = (category: string) => {
    const labelMap: Record<string, string> = {
        study: '学习类',
        design: '设计类',
        tech: '技术类',
        writing: '文案类',
        life: '生活服务',
    };
    return labelMap[category] || '其他';
};

const getStatusType = (status: string) => {
    const typeMap: Record<string, any> = {
        open: 'success',
        inProgress: 'info',
        completed: 'default',
        cancelled: 'error',
    };
    return typeMap[status] || 'default';
};

const getStatusLabel = (status: string) => {
    const labelMap: Record<string, string> = {
        open: '招募中',
        inProgress: '进行中',
        completed: '已完成',
        cancelled: '已取消',
    };
    return labelMap[status] || '未知状态';
};

const formatTime = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours < 1) return '刚刚';
    if (hours < 24) return `${hours} 小时前`;
    return `${Math.floor(hours / 24)} 天前`;
};

const go = (route: string) => {
    appStore.hapticFeedback('light');
    router.push(route);
};
</script>

<style scoped>
.task-center {
    min-height: 100%;
    padding: 18px 16px 0;
    background:
        radial-gradient(circle at top right, rgba(25, 179, 107, 0.14), transparent 26%),
        linear-gradient(180deg, #f4f7fb 0%, #eef5fb 100%);
}

.task-center__hero {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 16px;
    padding: 24px 22px;
    border-radius: 30px;
    background: linear-gradient(135deg, #17304f 0%, #2f6bff 58%, #4bb8ff 100%);
    color: #ffffff;
    box-shadow: 0 18px 42px rgba(23, 48, 79, 0.22);
    margin-bottom: 24px;
}

.task-center__hero-copy span {
    display: inline-block;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin-bottom: 10px;
}

.task-center__hero-copy h1 {
    font-size: 30px;
    font-weight: 800;
    margin-bottom: 10px;
}

.task-center__hero-copy p {
    max-width: 480px;
    font-size: 14px;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.9);
}

.task-center__publish {
    min-width: 112px;
    height: 46px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.14);
    color: #ffffff;
    font-size: 14px;
    font-weight: 700;
    border: 1px solid rgba(255, 255, 255, 0.18);
}

.task-center__section {
    margin-bottom: 24px;
}

.task-center__section-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;
    padding: 0 2px;
}

.task-center__section-head h3 {
    font-size: 20px;
    font-weight: 800;
    color: #17304f;
}

.task-center__section-head button {
    font-size: 13px;
    color: #5f78a8;
}

.task-center__category-grid,
.task-center__trend-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
}

.task-center__category-card,
.task-center__task-card,
.task-center__trend-card,
.task-center__activity-card {
    background: #ffffff;
    border: 1px solid rgba(23, 48, 79, 0.05);
    box-shadow: 0 10px 26px rgba(23, 48, 79, 0.05);
}

.task-center__category-card {
    padding: 18px 16px;
    border-radius: 24px;
}

.task-center__category-icon {
    width: 46px;
    height: 46px;
    border-radius: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #17304f;
    margin-bottom: 16px;
}

.task-center__category-card h4 {
    font-size: 17px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.task-center__category-card p,
.task-center__trend-card p {
    font-size: 13px;
    line-height: 1.7;
    color: #5b667a;
}

.task-center__category-card span {
    display: inline-block;
    margin-top: 12px;
    font-size: 12px;
    color: #7c879d;
}

.task-center__list,
.task-center__activity-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.task-center__task-card {
    padding: 18px;
    border-radius: 24px;
}

.task-center__task-top,
.task-center__task-stats {
    display: flex;
    align-items: center;
    justify-content: space-between;
}

.task-center__task-top {
    margin-bottom: 14px;
}

.task-center__task-tag {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 12px;
    border-radius: 999px;
    background: #eef3fb;
    color: #2f6bff;
    font-size: 12px;
    font-weight: 700;
}

.task-center__task-card h4 {
    font-size: 18px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 8px;
}

.task-center__task-card p {
    font-size: 14px;
    line-height: 1.7;
    color: #5b667a;
    margin-bottom: 16px;
}

.task-center__task-stats span {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: #7c879d;
}

.task-center__task-stats .task-center__reward {
    font-size: 20px;
    font-weight: 800;
    color: #ff9b3d;
}

.task-center__trend-card {
    padding: 18px;
    border-radius: 24px;
}

.task-center__trend-card strong {
    display: block;
    font-size: 24px;
    font-weight: 800;
    margin-bottom: 10px;
}

.task-center__trend-card h4 {
    font-size: 15px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 6px;
}

.task-center__activity-card {
    padding: 16px 18px;
    border-radius: 22px;
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 12px;
    align-items: center;
}

.task-center__activity-icon {
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: #eef3fb;
    color: #2f6bff;
    display: flex;
    align-items: center;
    justify-content: center;
}

.task-center__activity-copy strong {
    display: block;
    font-size: 14px;
    font-weight: 800;
    color: #17304f;
    margin-bottom: 4px;
}

.task-center__activity-copy p,
.task-center__activity-card span {
    font-size: 12px;
    color: #7c879d;
}

.task-center__fab {
    position: fixed;
    right: 22px;
    bottom: calc(104px + var(--safe-area-bottom, 0px));
    width: 62px;
    height: 62px;
    border-radius: 50%;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
    color: #ffffff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 14px 28px rgba(47, 107, 255, 0.3);
    z-index: 120;
}

.task-center__safe-space {
    height: calc(108px + var(--safe-area-bottom, 0px));
}

@media (max-width: 768px) {
    .task-center__hero {
        flex-direction: column;
        align-items: flex-start;
    }
}

@media (max-width: 375px) {
    .task-center {
        padding-inline: 12px;
    }

    .task-center__category-grid,
    .task-center__trend-grid {
        grid-template-columns: 1fr;
    }
}

.dark-theme .task-center {
    background:
        radial-gradient(circle at top, rgba(47, 107, 255, 0.16), transparent 26%),
        linear-gradient(180deg, #0b1220 0%, #10192c 100%);
}

.dark-theme .task-center__hero {
    background: linear-gradient(135deg, #1a4ea9 0%, #2267d7 48%, #158468 100%);
    box-shadow: 0 18px 40px rgba(0, 0, 0, 0.3);
}

.dark-theme .task-center__publish {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.14);
}

.dark-theme .task-center__section-head h3,
.dark-theme .task-center__category-card h4,
.dark-theme .task-center__task-card h4,
.dark-theme .task-center__trend-card h4,
.dark-theme .task-center__activity-copy strong,
.dark-theme .task-center__trend-card strong {
    color: #f3f7ff;
}

.dark-theme .task-center__section-head button,
.dark-theme .task-center__category-card p,
.dark-theme .task-center__trend-card p,
.dark-theme .task-center__task-card p,
.dark-theme .task-center__task-stats span,
.dark-theme .task-center__activity-copy p,
.dark-theme .task-center__activity-card span,
.dark-theme .task-center__category-card span {
    color: #aebbd1;
}

.dark-theme .task-center__category-card,
.dark-theme .task-center__task-card,
.dark-theme .task-center__trend-card,
.dark-theme .task-center__activity-card {
    background: rgba(17, 26, 43, 0.92);
    border-color: rgba(109, 145, 222, 0.14);
    box-shadow: 0 16px 36px rgba(0, 0, 0, 0.28);
}

.dark-theme .task-center__category-icon,
.dark-theme .task-center__activity-icon,
.dark-theme .task-center__task-tag {
    background: rgba(255, 255, 255, 0.08);
    color: #9fc0ff;
}

.dark-theme .task-center__fab {
    background: linear-gradient(135deg, #2b62e3 0%, #2e8dd2 100%);
    box-shadow: 0 16px 28px rgba(0, 0, 0, 0.34);
}
</style>
