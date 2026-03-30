<template>
    <div
        class="mobile-tab-bar"
        :class="{
            'has-safe-area': appStore.isIOS,
            'dark-mode': appStore.currentTheme === 'dark',
            'light-mode': appStore.currentTheme === 'light',
        }"
    >
        <div class="tab-bar-background" />
        <div class="tab-bar-content">
            <div
                v-for="tab in renderedTabs"
                :key="tab.name"
                class="tab-item"
                :class="{ active: activeTab === tab.name }"
                @click="handleTabClick(tab)"
            >
                <div class="tab-icon">
                    <NIcon :size="24">
                        <component :is="activeTab === tab.name ? tab.activeIcon : tab.icon" />
                    </NIcon>
                    <div v-if="tab.badge" class="tab-badge">{{ tab.badge }}</div>
                </div>
                <span class="tab-label">{{ tab.label }}</span>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { NIcon } from 'naive-ui';
import type { Socket } from 'socket.io-client';
import {
    HomeOutline,
    Home,
    BagHandleOutline,
    BagHandle,
    BriefcaseOutline,
    Briefcase,
    MailOutline,
    Mail,
    ChatbubblesOutline,
    Chatbubbles,
    PersonOutline,
    Person,
} from '@vicons/ionicons5';
import { chatApi } from '@/api';
import { useAppStore, useUserStore } from '@/stores';
import { createChatSocket } from '@/utils/chatSocket';

interface TabItem {
    name: string;
    label: string;
    icon: any;
    activeIcon: any;
    route: string;
    matchBase: string;
    badge?: number | string;
}

const router = useRouter();
const route = useRoute();
const appStore = useAppStore();
const userStore = useUserStore();
const unreadCount = ref(0);
const socket = ref<Socket | null>(null);
let handleSocketConnect: (() => void) | null = null;
let handleSocketMessageNew: ((payload: any) => void) | null = null;
let handleSocketConversationUpdated: (() => void) | null = null;
let handleSocketMessageRead: (() => void) | null = null;
let handleSocketConnectError: ((error: any) => void) | null = null;

const tabs: TabItem[] = [
    {
        name: 'home',
        label: '首页',
        icon: HomeOutline,
        activeIcon: Home,
        route: '/',
        matchBase: '/',
    },
    {
        name: 'pickup',
        label: '订单',
        icon: BagHandleOutline,
        activeIcon: BagHandle,
        route: '/pickup/list',
        matchBase: '/pickup',
    },
    {
        name: 'tasks',
        label: '任务',
        icon: BriefcaseOutline,
        activeIcon: Briefcase,
        route: '/tasks',
        matchBase: '/tasks',
    },
    {
        name: 'forum',
        label: '论坛',
        icon: ChatbubblesOutline,
        activeIcon: Chatbubbles,
        route: '/forum',
        matchBase: '/forum',
    },
    {
        name: 'chat',
        label: '消息',
        icon: MailOutline,
        activeIcon: Mail,
        route: '/chat',
        matchBase: '/chat',
    },
    {
        name: 'profile',
        label: '我的',
        icon: PersonOutline,
        activeIcon: Person,
        route: '/profile',
        matchBase: '/profile',
    },
];

const renderedTabs = computed(() =>
    tabs.map(tab => ({
        ...tab,
        badge: tab.name === 'chat' && unreadCount.value > 0 ? unreadCount.value : undefined,
    }))
);

const isTabSectionActive = (tab: TabItem, path = route.path) => {
    if (tab.matchBase === '/') {
        return path === '/';
    }

    return path === tab.matchBase || path.startsWith(`${tab.matchBase}/`);
};

const activeTab = computed(() => {
    return tabs.find(tab => isTabSectionActive(tab))?.name || 'home';
});

const handleTabClick = (tab: TabItem) => {
    if (isTabSectionActive(tab)) {
        if (route.path !== tab.route) {
            appStore.hapticFeedback('light');
            router.replace(tab.route);
        }

        return;
    }

    appStore.hapticFeedback('light');
    router.push(tab.route);
};

const fetchUnreadCount = async () => {
    if (!userStore.isAuthenticated) {
        unreadCount.value = 0;
        return;
    }

    try {
        const response = await chatApi.getConversations();
        const list = Array.isArray(response.data) ? response.data : [];
        unreadCount.value = list.reduce(
            (sum: number, item: any) => sum + Number(item?.unread_count || 0),
            0
        );
    } catch (error) {
        unreadCount.value = 0;
    }
};

const connectChatBadgeSocket = () => {
    if (socket.value || !userStore.isAuthenticated) return;

    const client = createChatSocket();
    if (!client) return;

    socket.value = client;

    handleSocketConnect = () => {
        void fetchUnreadCount();
    };

    handleSocketMessageNew = payload => {
        const incomingMessage = payload?.message;
        const isOwnMessage =
            incomingMessage?.sender_id === userStore.user?.id &&
            incomingMessage?.sender_type === 'user';

        if (isOwnMessage) {
            return;
        }

        void fetchUnreadCount();
    };

    handleSocketConversationUpdated = () => {
        void fetchUnreadCount();
    };

    handleSocketMessageRead = () => {
        void fetchUnreadCount();
    };

    handleSocketConnectError = error => {
        console.error('消息徽标 Socket 连接失败:', error);
    };

    client.on('connect', handleSocketConnect);
    client.on('chat:message:new', handleSocketMessageNew);
    client.on('chat:conversation:updated', handleSocketConversationUpdated);
    client.on('chat:message:read', handleSocketMessageRead);
    client.on('connect_error', handleSocketConnectError);
};

const disconnectChatBadgeSocket = () => {
    if (!socket.value) return;

    if (handleSocketConnect) {
        socket.value.off('connect', handleSocketConnect);
    }
    if (handleSocketMessageNew) {
        socket.value.off('chat:message:new', handleSocketMessageNew);
    }
    if (handleSocketConversationUpdated) {
        socket.value.off('chat:conversation:updated', handleSocketConversationUpdated);
    }
    if (handleSocketMessageRead) {
        socket.value.off('chat:message:read', handleSocketMessageRead);
    }
    if (handleSocketConnectError) {
        socket.value.off('connect_error', handleSocketConnectError);
    }

    socket.value = null;
    handleSocketConnect = null;
    handleSocketMessageNew = null;
    handleSocketConversationUpdated = null;
    handleSocketMessageRead = null;
    handleSocketConnectError = null;
};

onMounted(() => {
    connectChatBadgeSocket();
    void fetchUnreadCount();
});

watch(
    () => route.path,
    () => {
        void fetchUnreadCount();
    }
);

watch(
    () => userStore.isAuthenticated,
    isAuthenticated => {
        if (!isAuthenticated) {
            disconnectChatBadgeSocket();
            unreadCount.value = 0;
            return;
        }

        connectChatBadgeSocket();
        void fetchUnreadCount();
    }
);

onBeforeUnmount(() => {
    disconnectChatBadgeSocket();
});
</script>

<style scoped>
.mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 1000;
    height: 82px;
    background: transparent;
}

.mobile-tab-bar.has-safe-area {
    height: calc(82px + var(--safe-area-bottom));
    padding-bottom: var(--safe-area-bottom);
}

.tab-bar-background {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.94);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 1px solid rgba(47, 107, 255, 0.08);
    box-shadow: 0 -10px 30px rgba(23, 48, 79, 0.05);
}

.tab-bar-background::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: transparent;
}

.tab-bar-content {
    display: flex;
    height: 82px;
    align-items: center;
    justify-content: space-around;
    padding: 0 10px;
    position: relative;
}

.tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-width: 60px;
    padding: 10px 6px 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 18px;
    user-select: none;
    -webkit-tap-highlight-color: transparent;
}

.tab-item:active {
    transform: scale(0.96);
}

.tab-icon {
    position: relative;
    margin-bottom: 5px;
    color: #6c7892;
    transition:
        color 0.2s ease,
        transform 0.2s ease;
}

.tab-item.active .tab-icon {
    color: #2f6bff;
    transform: translateY(-1px);
}

.tab-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    min-width: 18px;
    height: 18px;
    background: linear-gradient(135deg, #2f6bff 0%, #4bb8ff 100%);
    color: white;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    padding: 0 4px;
    line-height: 1;
}

.tab-label {
    font-size: 11px;
    font-weight: 500;
    color: #7c879d;
    transition: color 0.2s ease;
    text-align: center;
    line-height: 1;
}

.tab-item.active .tab-label {
    color: #2f6bff;
    font-weight: 700;
}

.mobile-tab-bar.dark-mode .tab-bar-background {
    background: #232326;
    border-top: none;
    box-shadow: 0 -14px 36px rgba(0, 0, 0, 0.36);
    backdrop-filter: none;
    -webkit-backdrop-filter: none;
}

.mobile-tab-bar.dark-mode .tab-bar-background::before {
    background: rgba(82, 90, 110, 0.34);
}

.mobile-tab-bar.dark-mode .tab-icon {
    color: #f5f5f5;
}

.mobile-tab-bar.dark-mode .tab-label {
    color: #a1a1aa;
}

.mobile-tab-bar.dark-mode .tab-item.active .tab-label {
    color: #ffffff;
}
</style>
