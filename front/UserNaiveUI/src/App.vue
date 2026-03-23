<script setup lang="ts">
import { computed, onMounted, watch, ref } from 'vue';
import { RouterView } from 'vue-router';
import {
    NConfigProvider,
    NDialogProvider,
    NMessageProvider,
    NNotificationProvider,
    NLoadingBarProvider,
    darkTheme,
    lightTheme,
    zhCN,
    dateZhCN,
} from 'naive-ui';
import { useAppStore } from '@/stores';

const appStore = useAppStore();

// 使用 ref 确保响应式更新
const isDarkMode = ref(false);

// 监听主题变化
watch(
    () => appStore.isDark,
    newVal => {
        isDarkMode.value = newVal;
    },
    { immediate: true }
);

// 主题配置 - 优化暗色模式
const theme = computed(() => (isDarkMode.value ? darkTheme : lightTheme));

// iOS风格配色方案 - 优化版
const themeOverrides = computed(() => {
    const isDark = isDarkMode.value;

    return {
        common: {
            // 核心颜色
            primaryColor: '#007AFF',
            primaryColorHover: isDark ? '#4DA3FF' : '#0051D3',
            primaryColorPressed: isDark ? '#0062B3' : '#003D9E',
            primaryColorSuppl: isDark ? '#4DA3FF' : '#5AC8FA',

            // 信息色
            infoColor: isDark ? '#64D2FF' : '#5AC8FA',
            infoColorHover: isDark ? '#4AC0E8' : '#32ADE6',
            infoColorPressed: isDark ? '#4A9EC8' : '#0F7BD6',

            // 成功色 - 优化暗色对比度
            successColor: isDark ? '#32D74B' : '#30D158',
            successColorHover: isDark ? '#28B840' : '#1AC746',
            successColorPressed: isDark ? '#229036' : '#0A9D34',

            // 警告色
            warningColor: isDark ? '#FF9F0A' : '#FF9500',
            warningColorHover: isDark ? '#E68F09' : '#E6850E',
            warningColorPressed: isDark ? '#CC7F08' : '#CC750D',

            // 错误色
            errorColor: isDark ? '#FF453A' : '#FF3B30',
            errorColorHover: isDark ? '#E63D31' : '#E63324',
            errorColorPressed: isDark ? '#CC352B' : '#CC2B18',

            // 文字颜色 - 优化对比度
            textColor1: isDark ? '#FFFFFF' : '#000000',
            textColor2: isDark ? '#EBEBF5E6' : '#3C3C4399',
            textColor3: isDark ? '#EBEBF599' : '#3C3C434D',
            textColorBase: isDark ? '#FFFFFF' : '#000000',

            // 卡片和容器颜色 - 修复暗色遮罩问题
            cardColor: isDark ? '#1C1C1E' : '#FFFFFF',
            modalColor: isDark ? '#2C2C2E' : '#FFFFFF',
            popoverColor: isDark ? '#2C2C2E' : '#FFFFFF',
            tableColor: isDark ? '#1C1C1E' : '#FFFFFF',
            cardColorModal: isDark ? '#2C2C2E' : '#FFFFFF',

            // 背景颜色 - 关键修复
            bodyColor: isDark ? '#000000' : '#F2F2F7',
            bodyColorModal: isDark ? '#1C1C1E' : '#F2F2F7',

            // 基础色
            baseColor: isDark ? '#000000' : '#FFFFFF',

            // 边框和分割线
            borderColor: isDark ? '#38383A' : '#C6C6C8',
            dividerColor: isDark ? '#38383A' : '#C6C6C8',
            borderRadius: '12px',
            borderRadiusSmall: '8px',

            // 字体 - 使用系统字体
            fontFamily: `-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', 'Helvetica Neue', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif`,
            fontFamilyMono: "'SF Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
            fontWeightStrong: '600',

            // 阴影效果 - 优化暗色模式
            boxShadow: isDark ? '0 1px 3px rgba(0,0,0,0.5)' : '0 1px 3px rgba(0,0,0,0.1)',
        },
        Button: {
            borderRadiusMedium: '12px',
            borderRadiusLarge: '14px',
            heightMedium: '44px',
            heightLarge: '50px',
            fontSizeMedium: '17px',
            fontSizeLarge: '18px',
            fontWeight: '600',
            // 修复暗色模式按钮文字颜色
            textColorPrimary: isDark ? '#FFFFFF' : '#FFFFFF',
            textColorHoverPrimary: isDark ? '#FFFFFF' : '#FFFFFF',
            textColorPressedPrimary: isDark ? '#FFFFFF' : '#FFFFFF',
            textColorFocusPrimary: isDark ? '#FFFFFF' : '#FFFFFF',
        },
        Card: {
            borderRadius: '16px',
            paddingMedium: '16px',
            paddingLarge: '20px',
            color: isDark ? '#1C1C1E' : '#FFFFFF',
        },
        Input: {
            borderRadius: '12px',
            heightMedium: '44px',
            heightLarge: '50px',
            fontSize: '17px',
            paddingMedium: '0 16px',
            paddingLarge: '0 20px',
            color: isDark ? '#1C1C1E' : '#FFFFFF',
            colorFocus: isDark ? '#1C1C1E' : '#FFFFFF',
            border: `1px solid ${isDark ? '#38383A' : '#C6C6C8'}`,
            borderHover: `1px solid ${isDark ? '#48484A' : '#007AFF'}`,
            borderFocus: `1px solid #007AFF`,
        },
        Form: {
            labelFontSizeTopMedium: '13px',
            labelFontWeight: '600',
            labelTextColor: isDark ? '#EBEBF599' : '#3C3C4399',
            feedbackTextColorError: isDark ? '#FF453A' : '#FF3B30',
            feedbackTextColorWarning: isDark ? '#FF9F0A' : '#FF9500',
        },
        Drawer: {
            color: isDark ? '#1C1C1E' : '#FFFFFF',
            bodyPadding: '16px',
            headerPadding: '16px',
            footerPadding: '16px',
        },
        Modal: {
            color: isDark ? '#2C2C2E' : '#FFFFFF',
            borderRadius: '16px',
            padding: '20px',
        },
        List: {
            color: isDark ? '#1C1C1E' : '#FFFFFF',
        },
        Cell: {
            color: isDark ? '#1C1C1E' : '#FFFFFF',
            colorHover: isDark ? '#2C2C2E' : '#F2F2F7',
        },
        Tag: {
            borderRadius: '8px',
        },
    };
});

// 初始化应用
onMounted(() => {
    appStore.initializeApp();
});
</script>

<template>
    <NConfigProvider
        :theme="theme"
        :theme-overrides="themeOverrides"
        :locale="zhCN"
        :date-locale="dateZhCN"
    >
        <NLoadingBarProvider>
            <NDialogProvider>
                <NNotificationProvider>
                    <NMessageProvider>
                        <div
                            class="mobile-app"
                            :class="[
                                `${appStore.currentTheme}-theme`,
                                { 'is-ios': appStore.isIOS },
                            ]"
                        >
                            <RouterView v-slot="{ Component }">
                                <Transition name="page" mode="out-in">
                                    <component :is="Component" />
                                </Transition>
                            </RouterView>
                        </div>
                    </NMessageProvider>
                </NNotificationProvider>
            </NDialogProvider>
        </NLoadingBarProvider>
    </NConfigProvider>
</template>

<style>
/* 页面过渡动画 */
.page-enter-active,
.page-leave-active {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.page-enter-from {
    opacity: 0;
    transform: translateX(100%);
}

.page-leave-to {
    opacity: 0;
    transform: translateX(-30%);
}
</style>
