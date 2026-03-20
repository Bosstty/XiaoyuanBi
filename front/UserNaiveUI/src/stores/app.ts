import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { GlobalTheme } from 'naive-ui';

export const useAppStore = defineStore('app', () => {
    // 主题设置
    const isDark = ref(false);
    const theme = ref<GlobalTheme | null>(null);
    const followSystemTheme = ref(false); // 先关闭跟随系统主题

    // 移动端状态
    const isMobile = ref(true); // 默认为移动端优先
    const isIOS = ref(false);
    const statusBarHeight = ref(44); //
    const safeAreaBottom = ref(34); //

    // 加载状态
    const isPageLoading = ref(false);
    const isNetworkAvailable = ref(true);

    // 通知设置
    const notificationSettings = ref({
        push: true,
        sound: true,
        vibration: true,
        taskReminder: true,
        orderUpdate: true,
        forumReply: true,
    });

    // 用户体验设置
    const userPreferences = ref({
        enableHapticFeedback: true,
        enableTransitions: true,
        enableAutoRefresh: true,
        dataUsageMode: 'normal', // 'normal' | 'saver'
    });

    // 计算属性
    const currentTheme = computed(() => {
        if (followSystemTheme.value) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        return isDark.value ? 'dark' : 'light';
    });

    // 方法

    // 检测设备类型
    const detectDevice = () => {
        const userAgent = navigator.userAgent;
        isIOS.value = /iPad|iPhone|iPod/.test(userAgent);

        // 设置安全区域
        if (isIOS.value) {
            const viewport = window.visualViewport;
            if (viewport) {
                statusBarHeight.value = Math.max(44, window.screen.height - viewport.height);
            }
        }
    };

    // 切换主题
    const toggleTheme = () => {
        followSystemTheme.value = false;
        isDark.value = !isDark.value;
        localStorage.setItem('theme', isDark.value ? 'dark' : 'light');
        localStorage.setItem('followSystemTheme', 'false');
        console.log('🎨 主题切换至:', isDark.value ? '深色' : '浅色');

        // 触觉反馈
        if (userPreferences.value.enableHapticFeedback && navigator.vibrate) {
            navigator.vibrate(10);
        }
    };

    // 设置主题
    const setTheme = (dark: boolean) => {
        followSystemTheme.value = false;
        isDark.value = dark;
        localStorage.setItem('theme', dark ? 'dark' : 'light');
        localStorage.setItem('followSystemTheme', 'false');
    };

    // 跟随系统主题
    const setFollowSystemTheme = (follow: boolean) => {
        followSystemTheme.value = follow;
        localStorage.setItem('followSystemTheme', String(follow));

        if (follow) {
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            isDark.value = systemDark;
            localStorage.removeItem('theme');
        }
    };

    // 从本地存储恢复主题
    const restoreTheme = () => {
        const savedFollowSystem = localStorage.getItem('followSystemTheme');
        const savedTheme = localStorage.getItem('theme');

        if (savedFollowSystem !== null) {
            followSystemTheme.value = savedFollowSystem === 'true';
        }

        if (followSystemTheme.value) {
            // 跟随系统主题
            const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            isDark.value = systemDark;

            // 监听系统主题变化
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', e => {
                if (followSystemTheme.value) {
                    isDark.value = e.matches;
                }
            });
        } else if (savedTheme) {
            isDark.value = savedTheme === 'dark';
        }
    };

    // 设置页面加载状态
    const setPageLoading = (loading: boolean) => {
        isPageLoading.value = loading;
    };

    // 网络状态管理
    const updateNetworkStatus = () => {
        isNetworkAvailable.value = navigator.onLine;
    };

    // 触觉反馈
    const hapticFeedback = (type: 'light' | 'medium' | 'heavy' = 'light') => {
        if (!userPreferences.value.enableHapticFeedback) return;

        if (navigator.vibrate) {
            const duration = type === 'light' ? 10 : type === 'medium' ? 20 : 50;
            navigator.vibrate(duration);
        }
    };

    // 更新通知设置
    const updateNotificationSettings = (settings: Partial<typeof notificationSettings.value>) => {
        notificationSettings.value = { ...notificationSettings.value, ...settings };
        localStorage.setItem('notificationSettings', JSON.stringify(notificationSettings.value));
    };

    // 更新用户偏好设置
    const updateUserPreferences = (preferences: Partial<typeof userPreferences.value>) => {
        userPreferences.value = { ...userPreferences.value, ...preferences };
        localStorage.setItem('userPreferences', JSON.stringify(userPreferences.value));
    };

    // 恢复设置
    const restoreSettings = () => {
        try {
            const savedNotifications = localStorage.getItem('notificationSettings');
            if (savedNotifications) {
                notificationSettings.value = JSON.parse(savedNotifications);
            }

            const savedPreferences = localStorage.getItem('userPreferences');
            if (savedPreferences) {
                userPreferences.value = JSON.parse(savedPreferences);
            }
        } catch (error) {
            console.error('❌ 恢复设置失败:', error);
        }
    };

    // 初始化应用设置
    const initializeApp = () => {
        detectDevice();
        restoreTheme();
        restoreSettings();
        updateNetworkStatus();

        // 监听网络状态变化
        window.addEventListener('online', updateNetworkStatus);
        window.addEventListener('offline', updateNetworkStatus);

        console.log('✅ 移动端应用初始化完成');
    };

    return {
        // 状态
        isDark,
        theme,
        followSystemTheme,
        isMobile,
        isIOS,
        statusBarHeight,
        safeAreaBottom,
        isPageLoading,
        isNetworkAvailable,
        notificationSettings,
        userPreferences,

        // 计算属性
        currentTheme,

        // 方法
        detectDevice,
        toggleTheme,
        setTheme,
        setFollowSystemTheme,
        restoreTheme,
        setPageLoading,
        updateNetworkStatus,
        hapticFeedback,
        updateNotificationSettings,
        updateUserPreferences,
        restoreSettings,
        initializeApp,
    };
});
