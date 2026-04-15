import { createRouter, createWebHistory } from 'vue-router'
import { hasRoutePermission } from '@/utils/adminPermissions'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'layout',
      component: () => import('../components/layout/AdminLayout.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('../views/dashboard/Dashboard.vue'),
          meta: { roles: ['admin', 'service'] },
        },
        {
          path: 'users',
          name: 'users',
          component: () => import('../views/users/UserManagement.vue'),
          meta: { roles: ['admin'], permission: 'user:admin_read' },
        },
        {
          path: 'users/:id',
          name: 'user-detail',
          component: () => import('../views/users/UserDetail.vue'),
          meta: { roles: ['admin'], permission: 'user:admin_read' },
        },
        {
          path: 'services',
          name: 'services',
          component: () => import('../views/service/ServiceManagement.vue'),
          meta: { roles: ['admin'], permission: 'system:manage' },
        },
        {
          path: 'orders',
          name: 'orders',
          component: () => import('../views/orders/OrderManagement.vue'),
          meta: { roles: ['admin'], permission: 'order:admin' },
        },
        {
          path: 'orders/:id',
          name: 'order-detail',
          component: () => import('../views/orders/OrderDetail.vue'),
          meta: { roles: ['admin', 'service'], permission: 'order:admin' },
        },
        {
          path: 'tasks',
          name: 'tasks',
          component: () => import('../views/tasks/TaskManagement.vue'),
          meta: { roles: ['admin'], permission: 'task:admin' },
        },
        {
          path: 'reviews',
          name: 'reviews',
          component: () => import('../views/reviews/ReviewWorkbench.vue'),
          meta: {
            roles: ['admin'],
            permission: ['review:view_all', 'review:student', 'review:deliverer', 'review:forum', 'review:task', 'review:report'],
          },
        },
        {
          path: 'tasks/:id',
          name: 'task-detail',
          component: () => import('../views/tasks/TaskDetail.vue'),
          meta: { roles: ['admin'], permission: 'task:admin' },
        },
        {
          path: 'forum',
          name: 'forum',
          component: () => import('../views/forum/ForumManagement.vue'),
          meta: { roles: ['admin'], permission: 'forum:moderate' },
        },
        {
          path: 'forum/posts/:id',
          name: 'post-detail',
          component: () => import('../views/forum/PostDetail.vue'),
          meta: { roles: ['admin'], permission: 'forum:moderate' },
        },
        {
          path: 'system',
          name: 'system',
          component: () => import('../views/system/SystemSettings.vue'),
          meta: { roles: ['admin'], permission: 'system:manage' },
        },
        {
          path: 'system/audit',
          name: 'system-audit',
          component: () => import('../views/system/AuditLogManagement.vue'),
          meta: { roles: ['admin'], permission: 'audit:read' },
        },
        {
          path: 'system/admins',
          name: 'system-admins',
          component: () => import('../views/system/AdminPermissionManagement.vue'),
          meta: { roles: ['admin'], permission: 'system:manage' },
        },
        {
          path: 'analytics',
          name: 'analytics',
          component: () => import('../views/dashboard/Analytics.vue'),
          meta: { roles: ['admin'], permission: 'analytics:read' },
        },
        {
          path: 'finance',
          name: 'finance',
          component: () => import('../views/finance/FinanceManagement.vue'),
          meta: { roles: ['admin'], permission: 'analytics:read' },
        },
        // 配送员管理
        {
          path: 'deliverers',
          name: 'deliverers',
          component: () => import('../views/deliverers/DelivererManagement.vue'),
          meta: { roles: ['admin'], permission: 'deliverer:admin' },
        },
        {
          path: 'deliverers/verification',
          name: 'deliverer-verification',
          component: () => import('../views/deliverers/DelivererVerification.vue'),
          meta: { roles: ['admin'], permission: 'deliverer:admin' },
        },
        // 工单管理（管理员专用）
        {
          path: 'tickets',
          name: 'tickets',
          component: () => import('../views/service/TicketManagement.vue'),
          meta: { roles: ['admin'], permission: 'system:manage' },
        },
        // 客服系统
        {
          path: 'service/chat',
          name: 'service-chat',
          component: () => import('../views/service/ChatManagement.vue'),
          meta: { roles: ['service'] },
        },
        {
          path: 'service/after-sales',
          name: 'after-sales',
          component: () => import('../views/service/AfterSalesManagement.vue'),
          meta: { roles: ['service'] },
        },
      ],
    },
  ],
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const userType = localStorage.getItem('auth_user_type') || 'admin'
  const rawUser =
    localStorage.getItem('auth_user') ||
    localStorage.getItem('admin_user') ||
    localStorage.getItem('service_user')
  let currentUser = null
  try {
    currentUser = rawUser ? JSON.parse(rawUser) : null
  } catch {
    currentUser = null
  }
  const token =
    localStorage.getItem('auth_token') ||
    (userType === 'service'
      ? localStorage.getItem('service_token')
      : localStorage.getItem('admin_token'))

  if (to.name !== 'login' && !token) {
    next({ name: 'login' })
  } else if (to.name === 'login' && token) {
    next({ name: userType === 'service' ? 'service-chat' : 'dashboard' })
  } else if (to.path === '/' && token) {
    next({ name: userType === 'service' ? 'service-chat' : 'dashboard' })
  } else if (to.meta?.roles && !to.meta.roles.includes(userType)) {
    next({ name: userType === 'service' ? 'service-chat' : 'dashboard' })
  } else if (
    userType === 'admin' &&
    to.meta?.permission &&
    !hasRoutePermission(currentUser, to.meta.permission)
  ) {
    next({ name: userType === 'service' ? 'service-chat' : 'dashboard' })
  } else {
    next()
  }
})

export default router
