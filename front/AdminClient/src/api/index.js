// API 基础配置
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api'

// 跳转到登录页面的函数
function redirectToLogin() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('admin_token')
  localStorage.removeItem('auth_user_type')
  window.location.href = '/login'
}

class ApiClient {
  constructor() {
    this.baseURL = BASE_URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
    const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token')

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    }

    try {
      const response = await fetch(url, config)
      const data = await response.json()

      // 检查令牌是否过期
      if (data.success === false && data.code === 'TOKEN_EXPIRED') {
        redirectToLogin()
        throw new Error(data.message || '认证令牌已过期')
      }

      if (!response.ok) {
        throw new Error(data.message || '请求失败')
      }

      return data
    } catch (error) {
      console.error('API 请求错误:', error)
      throw error
    }
  }

  get(endpoint, params = {}) {
    let fullEndpoint = endpoint
    if (Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams()
      Object.keys(params).forEach((key) => {
        if (params[key] !== undefined && params[key] !== null) {
          searchParams.append(key, params[key])
        }
      })
      fullEndpoint = `${endpoint}?${searchParams.toString()}`
    }

    return this.request(fullEndpoint, {
      method: 'GET',
    })
  }

  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  delete(endpoint, data = {}) {
    const token = localStorage.getItem('auth_token') || localStorage.getItem('admin_token')

    // 如果有数据，发送 JSON body；否则直接发送
    const options = {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    }

    // 如果有数据，作为 JSON body 发送
    if (Object.keys(data).length > 0) {
      options.body = JSON.stringify(data)
    }

    return fetch(`${this.baseURL}${endpoint}`, options).then((response) => {
      return response.json().then((result) => {
        // 检查令牌是否过期
        if (result.success === false && result.code === 'TOKEN_EXPIRED') {
          redirectToLogin()
          throw new Error(result.message || '认证令牌已过期')
        }
        return result
      })
    })
  }

  upload(endpoint, formData) {
    const token = localStorage.getItem('admin_token')

    return fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }).then((response) => {
      return response.json().then((data) => {
        // 检查令牌是否过期
        if (data.success === false && data.code === 'TOKEN_EXPIRED') {
          redirectToLogin()
          throw new Error(data.message || '认证令牌已过期')
        }
        if (!response.ok) {
          throw new Error(data.message || '文件上传失败')
        }
        return data
      })
    })
  }
}

export const apiClient = new ApiClient()

// =========================================
// 管理员认证 API (/api/admin/auth/*)
// =========================================
export const authApi = {
  login: (credentials) => apiClient.post('/admin/auth/login', credentials),
  logout: () => apiClient.post('/admin/auth/logout'),
  getProfile: () => apiClient.get('/admin/auth/profile'),
  updateProfile: (data) => apiClient.put('/admin/auth/profile', data),
  changePassword: (data) => apiClient.post('/admin/auth/change-password', data),
  getPermissions: () => apiClient.get('/admin/auth/permissions'),
}

// =========================================
// 审计日志 API (/api/admin/audit/*)
// =========================================
export const adminApi = {
  // 审计日志
  getAuditLogs: (params) => apiClient.get('/admin/audit', params),
  getAuditLogById: (id) => apiClient.get(`/admin/audit/${id}`),
  getAuditLogStats: (params) => apiClient.get('/admin/audit/stats', params),
  getAuditOperators: (params) => apiClient.get('/admin/audit/operators', params),
  getHighRiskLogs: (params) => apiClient.get('/admin/audit/high-risk', params),
  deleteAuditLogs: (data) => apiClient.post('/admin/audit/delete', data),
}

// =========================================
// 统计分析 API (/api/admin/analytics/*)
// =========================================
export const analyticsApi = {
  // 仪表板统计 / 平台概览
  getDashboardStats: (params) => apiClient.get('/admin/analytics/dashboard', params),
  // 实时指标
  getRealtimeStats: () => apiClient.get('/admin/analytics/realtime'),
  // 用户行为分析
  getUserBehaviorStats: (params) => apiClient.get('/admin/analytics/user-behavior', params),
  // 服务质量监控
  getServiceQualityStats: (params) => apiClient.get('/admin/analytics/service-quality', params),
  // 收入分析
  getRevenueStats: (params) => apiClient.get('/admin/analytics/revenue', params),
  getRevenueDetailItems: (params) => apiClient.get('/admin/analytics/revenue/details', params),
  // 异常订单预警
  getAbnormalOrderAlerts: (params) => apiClient.get('/admin/analytics/alerts/abnormal-orders', params),
}

// 兼容旧版本命名
export const statsApi = analyticsApi

// =========================================
// 用户管理 API (/api/admin/users/*)
// =========================================
export const userManagementApi = {
  // 获取用户列表
  getUsers: (params) => apiClient.get('/admin/users', params),
  // 获取用户统计
  getUserStats: () => apiClient.get('/admin/users/stats'),
  // 导出用户
  exportUsers: (params) => apiClient.get('/admin/users/export', params),
  // 批量更新用户
  batchUpdateUsers: (data) => apiClient.post('/admin/users/batch-update', data),
  // 获取用户详情
  getUserById: (id) => apiClient.get(`/admin/users/${id}`),
  // 更新用户状态
  updateUserStatus: (id, status) => apiClient.put(`/admin/users/${id}/status`, { status }),
  // 审核学生身份
  verifyStudent: (id, data) => apiClient.put(`/admin/users/${id}/verify`, data),
  // 重置用户密码
  resetUserPassword: (id) => apiClient.post(`/admin/users/${id}/reset-password`),
  // 获取用户活动日志
  getUserActivityLog: (id, params) => apiClient.get(`/admin/users/${id}/activity-log`, params),
}

// =========================================
// 订单管理 API (/api/admin/orders/*)
// =========================================
export const orderManagementApi = {
  // 获取订单列表
  getOrders: (params) => apiClient.get('/admin/orders', params),
  // 获取订单详情
  getOrderById: (id) => apiClient.get(`/admin/orders/${id}`),
  // 更新订单状态
  updateOrderStatus: (id, status) => apiClient.patch(`/admin/orders/${id}/status`, { status }),
  // 批量分配订单
  batchAssignOrders: (data) => apiClient.post('/admin/orders/batch-assign', data),
  // 取消订单
  cancelOrder: (id, data = {}) => apiClient.delete(`/admin/orders/${id}`, data),
  // 获取订单统计
  getOrderStats: () => apiClient.get('/admin/orders/stats/overview'),
}

// =========================================
// 任务管理 API (/api/admin/tasks/*)
// =========================================
export const taskManagementApi = {
  // 获取任务列表
  getTasks: (params) => apiClient.get('/admin/tasks', params),
  // 获取任务详情
  getTaskById: (id) => apiClient.get(`/admin/tasks/${id}`),
  // 更新任务状态
  updateTaskStatus: (id, status, reason) =>
    apiClient.patch(`/admin/tasks/${id}/status`, { status, reason }),
  // 删除任务
  deleteTask: (id) => apiClient.delete(`/admin/tasks/${id}`),
  // 获取任务统计
  getTaskStats: () => apiClient.get('/admin/tasks/stats/overview'),
}

// =========================================
// 配送员管理 API (/api/admin/deliverers/*)
// =========================================
export const delivererManagementApi = {
  // 获取配送员列表
  getDeliverers: (params) => apiClient.get('/admin/deliverers', params),
  // 获取配送员详情
  getDelivererById: (id) => apiClient.get(`/admin/deliverers/${id}`),
  // 审核配送员申请
  verifyDeliverer: (id, data) => apiClient.patch(`/admin/deliverers/${id}/verify`, data),
  // 更新配送员状态
  updateDelivererStatus: (id, status) =>
    apiClient.patch(`/admin/deliverers/${id}/status`, { status }),
  // 删除/封禁配送员
  deleteDeliverer: (id, data = {}) => apiClient.delete(`/admin/deliverers/${id}`, data),
  // 获取配送员统计
  getDelivererStats: () => apiClient.get('/admin/deliverers/stats/overview'),
}

// =========================================
// 论坛管理 API (/api/admin/forum/*)
// =========================================
export const forumManagementApi = {
  // 获取帖子列表
  getPosts: (params) => apiClient.get('/admin/forum/posts', params),
  // 获取帖子详情
  getPostById: (id) => apiClient.get(`/admin/forum/posts/${id}`),
  // 审核帖子 (action: approve/reject/hide/pin/unpin)
  moderatePost: (id, action, reason) =>
    apiClient.patch(`/admin/forum/posts/${id}/moderate`, { action, reason }),
  // 删除帖子
  deletePost: (id, reason) => apiClient.delete(`/admin/forum/posts/${id}`, { reason }),
  // 获取评论列表
  getComments: (params) => apiClient.get('/admin/forum/comments', params),
  // 删除评论
  deleteComment: (id, reason) => apiClient.delete(`/admin/forum/comments/${id}`, { reason }),
  // 获取举报列表
  getReports: (params) => apiClient.get('/admin/forum/reports', params),
  // 处理举报
  handleReport: (id, action, reason, remark) =>
    apiClient.patch(`/admin/forum/reports/${id}`, { action, reason, remark }),
}

// =========================================
// 客服系统 API (/api/service/*)
// =========================================

// 客服认证 API
export const serviceAuthApi = {
  login: (credentials) => apiClient.post('/service/auth/login', credentials),
  logout: () => apiClient.post('/service/auth/logout'),
  getProfile: () => apiClient.get('/service/auth/profile'),
  updateProfile: (data) => apiClient.put('/service/auth/profile', data),
}

// 客服工单 API (/api/service/tickets/*)
export const serviceTicketApi = {
  // 获取工单列表
  getTickets: (params) => apiClient.get('/service/tickets', params),
  // 获取工单详情
  getTicketById: (id) => apiClient.get(`/service/tickets/${id}`),
  // 创建工单
  createTicket: (data) => apiClient.post('/service/tickets', data),
  // 更新工单状态
  updateTicketStatus: (id, data) => apiClient.patch(`/service/tickets/${id}/status`, data),
  // 分配工单
  assignTicket: (id, data) => apiClient.post(`/service/tickets/${id}/assign`, data),
}

// 客服聊天 API (/api/service/chat/*)
export const serviceChatApi = {
  // 创建会话
  createConversation: (data) => apiClient.post('/service/chat/conversations', data),
  // 获取会话列表
  getConversations: (params) => apiClient.get('/service/chat/conversations', params),
  // 获取会话详情
  getConversationDetail: (id) => apiClient.get(`/service/chat/conversations/${id}`),
  // 获取消息列表
  getMessages: (params) => apiClient.get('/service/chat/messages', params),
  // 发送消息
  sendMessage: (data) => apiClient.post('/service/chat/messages', data),
  // 标记消息已读
  markAsRead: (conversation_id) =>
    apiClient.post('/service/chat/messages/read', { conversation_id }),
  // 获取用户统计信息
  getUserStats: (userId) => apiClient.get(`/service/chat/users/${userId}/stats`),
}

// 客服订单处理 API (/api/service/orders/*)
export const serviceOrderApi = {
  // 获取售后订单列表
  getAfterSalesOrders: (params) => apiClient.get('/service/orders', params),
  // 获取订单详情
  getOrderDetail: (id) => apiClient.get(`/service/orders/${id}`),
  // 处理订单状态
  handleOrderStatus: (id, data) => apiClient.patch(`/service/orders/${id}/status`, data),
  // 申请退款
  processRefund: (id, data) => apiClient.post(`/service/orders/${id}/refund`, data),
  // 补偿处理
  processCompensate: (id, data) => apiClient.post(`/service/orders/${id}/compensate`, data),
}

// 客服用户管理 API (/api/service/users/*)
export const serviceUserApi = {
  // 获取用户列表
  getUsers: (params) => apiClient.get('/service/users', params),
  // 获取用户详情
  getUserById: (id) => apiClient.get(`/service/users/${id}`),
  // 封禁用户
  banUser: (id, data) => apiClient.post(`/service/users/${id}/ban`, data),
}

// 客服配送员管理 API (/api/service/deliverers/*)
export const serviceDelivererApi = {
  // 获取配送员列表
  getDeliverers: (params) => apiClient.get('/service/deliverers', params),
  // 获取配送员详情
  getDelivererById: (id) => apiClient.get(`/service/deliverers/${id}`),
  // 更新配送员状态
  updateStatus: (id, status) => apiClient.patch(`/service/deliverers/${id}/status`, { status }),
}

// =========================================
// 公共 API (/api/public/*)
// =========================================
export const publicApi = {
  // 健康检查
  healthCheck: () => apiClient.get('/public/health'),
  // 服务状态
  getServiceStatus: () => apiClient.get('/public/status'),
  // 文件上传
  uploadFile: (formData) => apiClient.upload('/public/upload/single', formData),
}

// =========================================
// 系统管理 API
// =========================================
export const systemApi = {
  // 获取系统设置
  getSettings: () => apiClient.get('/admin/settings'),
  // 更新系统设置
  updateSettings: (settings) => apiClient.put('/admin/settings', settings),
  // 获取单个分类设置
  getSettingsByCategory: (category) => apiClient.get(`/admin/settings/${category}`),
  // 更新单个分类设置
  updateSettingsByCategory: (category, settings) =>
    apiClient.put(`/admin/settings/${category}`, { settings }),
  // 重置设置
  resetSettings: (category) => apiClient.post('/admin/settings/reset', { category }),
  // 导出设置
  exportSettings: () => apiClient.get('/admin/settings/export'),
  // 导入设置
  importSettings: (settings) => apiClient.post('/admin/settings/import', { settings }),
  // 导出数据
  exportData: (type, params) => Promise.resolve({ success: true }),
  // 获取系统健康状态
  getSystemHealth: () => Promise.resolve({ success: true, data: {} }),
  // 执行维护操作
  performMaintenance: (action) => Promise.resolve({ success: true }),
}
