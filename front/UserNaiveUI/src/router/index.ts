import { createRouter, createWebHistory } from 'vue-router';
import type { RouteRecordRaw } from 'vue-router';
import { useUserStore } from '@/stores';
import MobileLayout from '@/layouts/MobileLayout.vue';

// 路由配置
const routes: RouteRecordRaw[] = [
    {
        path: '/',
        component: MobileLayout,
        children: [
            {
                path: '',
                name: 'Home',
                component: () => import('@/views/Home.vue'),
                meta: { title: '首页', level: 0 },
            },
            {
                path: 'pickup',
                name: 'Pickup',
                redirect: '/pickup/list',
                meta: { title: '代取服务', level: 0 },
            },
            {
                path: 'pickup/list',
                name: 'PickupList',
                component: () => import('@/views/pickup/PickupList.vue'),
                meta: { title: '代取订单', level: 1 },
            },
            {
                path: 'pickup/create',
                name: 'CreatePickup',
                component: () => import('@/views/pickup/CreatePickup.vue'),
                meta: { title: '发布订单', requiresAuth: true, level: 1, hideTabBar: true },
            },
            {
                path: 'pickup/:id',
                name: 'PickupDetail',
                component: () => import('@/views/pickup/PickupDetail.vue'),
                meta: { title: '订单详情', level: 1, hideTabBar: true },
            },
            {
                path: 'pickup/my',
                name: 'MyPickups',
                component: () => import('@/views/pickup/MyPickups.vue'),
                meta: { title: '我的订单', requiresAuth: true, level: 1, hideTabBar: true },
            },
            {
                path: 'tasks',
                name: 'Tasks',
                component: () => import('@/views/Tasks.vue'),
                meta: { title: '任务大厅', level: 0 },
            },
            {
                path: 'tasks/list',
                name: 'TaskList',
                component: () => import('@/views/tasks/TaskList.vue'),
                meta: { title: '任务列表', level: 1, hideTabBar: true },
            },
            {
                path: 'tasks/create',
                name: 'CreateTask',
                component: () => import('@/views/tasks/CreateTask.vue'),
                meta: { title: '发布任务', requiresAuth: true, level: 1, hideTabBar: true },
            },
            {
                path: 'tasks/:id',
                name: 'TaskDetail',
                component: () => import('@/views/tasks/TaskDetail.vue'),
                meta: { title: '任务详情', level: 1, hideTabBar: true },
            },
            {
                path: 'tasks/my',
                name: 'MyTasks',
                component: () => import('@/views/tasks/MyTasks.vue'),
                meta: { title: '我的任务', requiresAuth: true, level: 1, hideTabBar: true },
            },
            {
                path: 'forum',
                name: 'Forum',
                component: () => import('@/views/Forum.vue'),
                meta: { title: '校园论坛', level: 0 },
            },
            {
                path: 'forum/my',
                name: 'MyPosts',
                component: () => import('@/views/forum/MyPosts.vue'),
                meta: { title: '我的帖子', requiresAuth: true, level: 1 },
            },
            {
                path: 'profile',
                name: 'Profile',
                component: () => import('@/views/user/Profile.vue'),
                meta: { title: '我的', level: 0 },
            },
            {
                path: 'wallet',
                name: 'Wallet',
                component: () => import('@/views/user/Wallet.vue'),
                meta: { title: '钱包', requiresAuth: true, level: 1 },
            },
            {
                path: 'chat',
                name: 'Chat',
                component: () => import('@/views/chat/Chat.vue'),
                meta: { title: '消息', requiresAuth: true, level: 0 },
            },
            {
                path: 'login',
                name: 'Login',
                component: () => import('@/views/auth/LoginMobile.vue'),
                meta: { title: '登录', guest: true, level: 1, hideNavBar: true },
            },
            {
                path: 'register',
                name: 'Register',
                component: () => import('@/views/auth/RegisterMobile.vue'),
                meta: { title: '注册', guest: true, level: 1, hideNavBar: true },
            },
            {
                path: 'auth/forgot-password',
                name: 'ForgotPassword',
                component: () => import('@/views/auth/ForgotPassword.vue'),
                meta: { title: '忘记密码', guest: true, level: 1, hideNavBar: true },
            },
            {
                path: 'settings',
                name: 'Settings',
                component: () => import('@/views/user/Settings.vue'),
                meta: { title: '设置', requiresAuth: true, level: 1 },
            },
        ],
    },
    {
        path: '/:pathMatch(.*)*',
        name: 'NotFound',
        component: () => import('@/views/error/NotFound.vue'),
        meta: { title: '页面未找到' },
    },
];

// 创建路由实例
const router = createRouter({
    history: createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        if (savedPosition) {
            return savedPosition;
        } else {
            return { top: 0, behavior: 'smooth' };
        }
    },
});

// 路由守卫
router.beforeEach((to, from, next) => {
    const userStore = useUserStore();

    // 设置页面标题
    if (to.meta.title) {
        document.title = `${to.meta.title} - 哈尔滨学院校园服务平台`;
    }

    // 检查是否需要认证
    if (to.meta.requiresAuth && !userStore.isAuthenticated) {
        console.log('  需要登录，重定向到登录页面');
        next({
            name: 'Login',
            query: { redirect: to.fullPath },
        });
        return;
    }

    // 检查是否为访客页面（已登录用户不应该访问）
    if (to.meta.guest && userStore.isAuthenticated) {
        console.log(' 已登录用户，重定向到首页');
        next({ name: 'Home' });
        return;
    }

    next();
});

router.afterEach((to, from) => {
    console.log(` 路由跳转: ${from.path} -> ${to.path}`);
});

export default router;
