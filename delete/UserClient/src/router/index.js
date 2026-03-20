import { createRouter, createWebHistory } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('../views/HomeView.vue'),
      meta: { title: '首页' },
    },

    // 认证相关路由
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/auth/LoginView.vue'),
      meta: { title: '登录', requiresGuest: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('../views/auth/RegisterView.vue'),
      meta: { title: '注册', requiresGuest: true },
    },

    // 代取服务路由
    {
      path: '/pickup',
      name: 'pickup',
      component: () => import('../views/pickup/PickupHome.vue'),
      meta: { title: '代取服务' },
      children: [
        {
          path: '',
          name: 'pickup-list',
          component: () => import('../views/pickup/PickupList.vue'),
          meta: { title: '代取订单列表' },
        },
        {
          path: 'create',
          name: 'pickup-create',
          component: () => import('../views/pickup/PickupCreate.vue'),
          meta: { title: '发布代取订单', requiresAuth: true },
        },
        {
          path: ':id',
          name: 'pickup-detail',
          component: () => import('../views/pickup/PickupDetail.vue'),
          meta: { title: '订单详情' },
        },
        {
          path: 'my',
          name: 'my-pickup-orders',
          component: () => import('../views/pickup/MyPickupOrders.vue'),
          meta: { title: '我的代取订单', requiresAuth: true },
        },
        {
          path: 'express',
          name: 'express-pickup',
          component: () => import('../views/pickup/ExpressPickup.vue'),
          meta: { title: '快递代取' },
        },
        {
          path: 'food',
          name: 'food-pickup',
          component: () => import('../views/pickup/FoodPickup.vue'),
          meta: { title: '外卖代取' },
        },
        {
          path: 'medicine',
          name: 'medicine-pickup',
          component: () => import('../views/pickup/MedicinePickup.vue'),
          meta: { title: '药品代购' },
        },
        {
          path: 'daily',
          name: 'daily-pickup',
          component: () => import('../views/pickup/DailyPickup.vue'),
          meta: { title: '生活用品代购' },
        },
      ],
    },

    // 任务中心路由
    {
      path: '/tasks',
      name: 'tasks',
      component: () => import('../views/tasks/TaskHome.vue'),
      meta: { title: '任务中心' },
      children: [
        {
          path: '',
          name: 'task-list',
          component: () => import('../views/tasks/TaskList.vue'),
          meta: { title: '任务列表' },
        },
        {
          path: 'create',
          name: 'task-create',
          component: () => import('../views/tasks/TaskCreate.vue'),
          meta: { title: '发布任务', requiresAuth: true },
        },
        {
          path: ':id',
          name: 'task-detail',
          component: () => import('../views/tasks/TaskDetail.vue'),
          meta: { title: '任务详情' },
        },
        {
          path: 'publish',
          name: 'task-publish',
          component: () => import('../views/tasks/TaskPublish.vue'),
          meta: { title: '发布任务', requiresAuth: true },
        },
        {
          path: 'my',
          name: 'my-tasks',
          component: () => import('../views/tasks/MyTasks.vue'),
          meta: { title: '我的任务', requiresAuth: true },
        },
      ],
    },

    // 论坛路由
    {
      path: '/forum',
      name: 'forum',
      component: () => import('../views/forum/ForumHome.vue'),
      meta: { title: '校园论坛' },
      children: [
        {
          path: '',
          name: 'forum-list',
          component: () => import('../views/forum/ForumList.vue'),
          meta: { title: '论坛首页' },
        },
        {
          path: 'post',
          name: 'forum-post',
          component: () => import('../views/forum/ForumPost.vue'),
          meta: { title: '发布帖子', requiresAuth: true },
        },
        {
          path: ':id',
          name: 'post-detail',
          component: () => import('../views/forum/PostDetail.vue'),
          meta: { title: '帖子详情' },
        },
        {
          path: 'my',
          name: 'my-posts',
          component: () => import('../views/forum/MyPosts.vue'),
          meta: { title: '我的帖子', requiresAuth: true },
        },
        {
          path: 'academic',
          name: 'academic-forum',
          component: () => import('../views/forum/AcademicForum.vue'),
          meta: { title: '学术交流' },
        },
        {
          path: 'life',
          name: 'life-forum',
          component: () => import('../views/forum/LifeForum.vue'),
          meta: { title: '生活服务' },
        },
        {
          path: 'campus',
          name: 'campus-forum',
          component: () => import('../views/forum/CampusForum.vue'),
          meta: { title: '校园动态' },
        },
      ],
    },

    // 用户中心路由
    {
      path: '/user',
      name: 'user',
      component: () => import('../views/user/UserCenter.vue'),
      meta: { title: '个人中心', requiresAuth: true },
      children: [
        {
          path: '',
          redirect: '/user/profile',
        },
        {
          path: 'profile',
          name: 'user-profile',
          component: () => import('../views/user/UserProfile.vue'),
          meta: { title: '个人资料', requiresAuth: true },
        },
        {
          path: 'orders',
          name: 'user-orders',
          component: () => import('../views/user/UserOrders.vue'),
          meta: { title: '我的订单', requiresAuth: true },
        },
        {
          path: 'tasks',
          name: 'user-tasks',
          component: () => import('../views/user/UserTasks.vue'),
          meta: { title: '我的任务', requiresAuth: true },
        },
        {
          path: 'wallet',
          name: 'user-wallet',
          component: () => import('../views/user/UserWallet.vue'),
          meta: { title: '我的钱包', requiresAuth: true },
        },
        {
          path: 'settings',
          name: 'user-settings',
          component: () => import('../views/user/UserSettings.vue'),
          meta: { title: '设置', requiresAuth: true },
        },
      ],
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  },
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userStore = useUserStore()

  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - 哈尔滨学院校园服务平台`
  }

  // 检查需要认证的路由
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({
      path: '/login',
      query: { redirect: to.fullPath },
    })
    return
  }

  // 检查需要游客状态的路由（登录、注册页面）
  if (to.meta.requiresGuest && userStore.isLoggedIn) {
    next('/')
    return
  }

  next()
})

export default router
