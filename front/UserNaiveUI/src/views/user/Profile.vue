<template>
    <div class="profile-page">
        <!-- 页面头部 -->
        <div class="page-header">
            <div class="header-bg"></div>
            <div class="profile-section">
                <!-- 用户信息 -->
                <div class="profile-card">
                    <div class="avatar-wrap">
                        <NAvatar :size="80" round :src="userStore.userAvatar" />
                        <div class="avatar-edit">
                            <NIcon :size="14" color="white"><CameraOutline /></NIcon>
                        </div>
                    </div>
                    <div v-if="userStore.isAuthenticated" class="user-info">
                        <h2 class="user-name">{{ userStore.userName }}</h2>
                        <p class="user-college">{{ userStore.user?.college || '未设置学院' }}</p>
                        <div class="user-badges">
                            <span class="badge-item">
                                <NIcon :size="12"><StarOutline /></NIcon>
                                Lv.{{ userStore.user?.level || 1 }}
                            </span>
                            <span class="badge-item">
                                <NIcon :size="12"><RibbonOutline /></NIcon>
                                {{ userStore.user?.title || '新手' }}
                            </span>
                        </div>
                    </div>
                    <div v-else class="login-prompt">
                        <p>登录后享受更多服务</p>
                        <NButton type="primary" size="small" @click="router.push('/login')">
                            立即登录
                        </NButton>
                    </div>
                </div>

                <!-- 统计数据 -->
                <div class="stats-card">
                    <div class="stat-item">
                        <span class="stat-value">{{ userStats.orders }}</span>
                        <span class="stat-label">订单</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span class="stat-value">{{ userStats.tasks }}</span>
                        <span class="stat-label">任务</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span class="stat-value">{{ userStats.posts }}</span>
                        <span class="stat-label">帖子</span>
                    </div>
                    <div class="stat-divider"></div>
                    <div class="stat-item">
                        <span class="stat-value">{{ userStore.user?.points || 0 }}</span>
                        <span class="stat-label">积分</span>
                    </div>
                </div>
            </div>
        </div>

        <!-- 功能列表 -->
        <div class="功能列表">
            <!-- 订单管理 -->
            <div class="功能分组">
                <h3 class="group-title">订单管理</h3>
                <div class="menu-list ios-card">
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/pickup/my')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)">
                            <NIcon :size="18" color="white"><BagHandleOutline /></NIcon>
                        </div>
                        <span class="menu-label">我的订单</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/tasks/my')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #34C759 0%, #30D158 100%)">
                            <NIcon :size="18" color="white"><DocumentTextOutline /></NIcon>
                        </div>
                        <span class="menu-label">我的任务</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                </div>
            </div>

            <!-- 我的发布 -->
            <div class="功能分组">
                <h3 class="group-title">我的发布</h3>
                <div class="menu-list ios-card">
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/forum/my')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #AF52DE 0%, #FF2D92 100%)">
                            <NIcon :size="18" color="white"><ChatbubblesOutline /></NIcon>
                        </div>
                        <span class="menu-label">我的帖子</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/market/my')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #FF9500 0%, #FF3B30 100%)">
                            <NIcon :size="18" color="white"><CartOutline /></NIcon>
                        </div>
                        <span class="menu-label">二手市场</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                </div>
            </div>

            <!-- 客服与帮助 -->
            <div class="功能分组">
                <h3 class="group-title">客服与帮助</h3>
                <div class="menu-list ios-card">
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/chat')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #07c160 0%, #06ad56 100%)">
                            <NIcon :size="18" color="white"><ChatbubblesOutline /></NIcon>
                        </div>
                        <span class="menu-label">客服消息</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                </div>
            </div>

            <!-- 账户设置 -->
            <div class="功能分组">
                <h3 class="group-title">账户设置</h3>
                <div class="menu-list ios-card">
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/profile/edit')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #5AC8FA 0%, #007AFF 100%)">
                            <NIcon :size="18" color="white"><PersonOutline /></NIcon>
                        </div>
                        <span class="menu-label">个人资料</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                    <div class="menu-item touch-feedback" @click="handleMenuClick('/settings')">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #8E8E93 0%, #636366 100%)">
                            <NIcon :size="18" color="white"><SettingsOutline /></NIcon>
                        </div>
                        <span class="menu-label">设置</span>
                        <NIcon :size="16" class="menu-arrow"><ChevronForwardOutline /></NIcon>
                    </div>
                </div>
            </div>

            <!-- 主题设置 -->
            <div class="功能分组">
                <h3 class="group-title">外观</h3>
                <div class="menu-list ios-card">
                    <div class="menu-item">
                        <div class="menu-icon" style="background: linear-gradient(135deg, #5856D6 0%, #AF52DE 100%)">
                            <NIcon :size="18" color="white"><MoonOutline /></NIcon>
                        </div>
                        <span class="menu-label">深色模式</span>
                        <NSwitch :value="appStore.isDark" @update:value="handleThemeChange" />
                    </div>
                </div>
            </div>
        </div>

        <!-- 退出登录 -->
        <div v-if="userStore.isAuthenticated" class="logout-section">
            <NButton type="error" size="large" block @click="handleLogout">
                退出登录
            </NButton>
        </div>

        <!-- 底部安全区域 -->
        <div class="bottom-safe-area"></div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { NButton, NIcon, NAvatar, NSwitch, useDialog, useMessage } from 'naive-ui';
import {
    CameraOutline,
    StarOutline,
    RibbonOutline,
    BagHandleOutline,
    DocumentTextOutline,
    ChatbubblesOutline,
    CartOutline,
    PersonOutline,
    SettingsOutline,
    MoonOutline,
    ChevronForwardOutline,
} from '@vicons/ionicons5';
import { useUserStore, useAppStore } from '@/stores';

const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const userStore = useUserStore();
const appStore = useAppStore();

// 用户统计数据
const userStats = ref({
    orders: 12,
    tasks: 5,
    posts: 8,
});

// 点击菜单
const handleMenuClick = (path: string) => {
    appStore.hapticFeedback('light');
    router.push(path);
};

// 切换主题
const handleThemeChange = (value: boolean) => {
    appStore.setTheme(value);
    appStore.hapticFeedback('medium');
};

// 退出登录
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

// 加载数据
onMounted(async () => {
    if (userStore.isAuthenticated) {
        try {
            await userStore.fetchUserProfile();
        } catch (error) {
            console.error('获取用户信息失败:', error);
        }
    }
});
</script>

<style scoped>
.profile-page {
    min-height: 100vh;
    background: var(--ios-bg-secondary);
}

/* 页面头部 */
.page-header {
    position: relative;
    padding-bottom: 24px;
}

.header-bg {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 200px;
    background: linear-gradient(135deg, #007AFF 0%, #5856D6 100%);
    border-radius: 0 0 32px 32px;
}

.dark .header-bg {
    background: linear-gradient(135deg, #0A84FF 0%, #5E5CE6 100%);
}

.profile-section {
    position: relative;
    padding: 52px 16px 0;
}

/* 用户信息卡片 */
.profile-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px;
    background: var(--ios-bg-primary);
    border-radius: var(--ios-radius-lg);
    box-shadow: var(--ios-shadow);
    margin-bottom: 16px;
}

.avatar-wrap {
    position: relative;
    margin-bottom: 16px;
}

.avatar-edit {
    position: absolute;
    bottom: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    background: var(--ios-blue);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid var(--ios-bg-primary);
}

.user-info {
    text-align: center;
}

.user-name {
    font-size: 22px;
    font-weight: 700;
    color: var(--ios-text-primary);
    margin: 0 0 4px 0;
}

.user-college {
    font-size: 14px;
    color: var(--ios-text-tertiary);
    margin: 0 0 12px 0;
}

.user-badges {
    display: flex;
    justify-content: center;
    gap: 16px;
}

.badge-item {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 12px;
    color: var(--ios-blue);
    background: rgba(0, 122, 255, 0.1);
    padding: 4px 10px;
    border-radius: 12px;
}

.login-prompt {
    text-align: center;
}

.login-prompt p {
    font-size: 14px;
    color: var(--ios-text-tertiary);
    margin: 0 0 12px 0;
}

/* 统计数据卡片 */
.stats-card {
    display: flex;
    justify-content: space-around;
    padding: 20px 16px;
    background: var(--ios-bg-primary);
    border-radius: var(--ios-radius-lg);
    box-shadow: var(--ios-shadow);
}

.stat-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
}

.stat-value {
    font-size: 22px;
    font-weight: 700;
    color: var(--ios-text-primary);
}

.stat-label {
    font-size: 12px;
    color: var(--ios-text-tertiary);
}

.stat-divider {
    width: 0.5px;
    height: 36px;
    background: var(--ios-divider);
}

/* 功能列表 */
.功能列表 {
    padding: 24px 16px;
}

.功能分组 {
    margin-bottom: 24px;
}

.group-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--ios-text-tertiary);
    margin: 0 0 12px 8px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.menu-list {
    padding: 0;
    overflow: hidden;
}

.menu-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 14px 16px;
    border-bottom: 0.5px solid var(--ios-divider);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
}

.menu-item:last-child {
    border-bottom: none;
}

.menu-item:active {
    background: var(--ios-gray6);
}

.dark .menu-item:active {
    background: var(--ios-gray5);
}

.menu-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
}

.menu-label {
    flex: 1;
    font-size: 16px;
    font-weight: 500;
    color: var(--ios-text-primary);
}

.menu-arrow {
    color: var(--ios-gray3);
    flex-shrink: 0;
}

/* 退出登录 */
.logout-section {
    padding: 16px;
}

/* 底部安全区域 */
.bottom-safe-area {
    height: 100px;
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

.profile-card,
.stats-card,
.功能分组 {
    animation: ios-fade-in 0.4s ease-out;
}
</style>
