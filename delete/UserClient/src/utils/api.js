// API 基础配置
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

// 请求工具类
class ApiClient {
  constructor() {
    this.baseURL = API_BASE_URL
  }

  // 通用请求方法
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    // 添加认证token
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    try {
      const response = await fetch(url, config)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'API request failed')
      }

      return data
    } catch (error) {
      console.error('API request failed:', error)
      throw error
    }
  }

  // GET 请求
  get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint

    return this.request(url, {
      method: 'GET',
    })
  }

  // POST 请求
  post(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  // PUT 请求
  put(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  }

  // PATCH 请求
  patch(endpoint, data = {}) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  }

  // DELETE 请求
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE',
    })
  }

  // 文件上传
  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      headers: {}, // 让浏览器自动设置Content-Type
      body: formData,
    })
  }
}

// 创建API客户端实例
const apiClient = new ApiClient()

// 用户认证API
export const authAPI = {
  // 用户注册
  register(data) {
    return apiClient.post('/auth/register', data)
  },

  // 用户登录
  login(data) {
    return apiClient.post('/auth/login', data)
  },

  // 获取用户信息
  getProfile() {
    return apiClient.get('/auth/profile')
  },

  // 更新用户信息
  updateProfile(data) {
    return apiClient.put('/auth/profile', data)
  },

  // 修改密码
  changePassword(data) {
    return apiClient.post('/auth/change-password', data)
  },

  // 用户登出
  logout() {
    return apiClient.post('/auth/logout')
  },

  // 上传头像
  uploadAvatar(formData) {
    return apiClient.upload('/auth/upload-avatar', formData)
  },

  // 发送验证码
  sendVerificationCode(data) {
    return apiClient.post('/auth/send-verification-code', data)
  },

  // 验证验证码
  verifyCode(data) {
    return apiClient.post('/auth/verify-code', data)
  },

  // 微信登录
  wechatLogin(data) {
    return apiClient.post('/auth/wechat-login', data)
  },

  // 注销账号
  deleteAccount(data) {
    return apiClient.delete('/auth/account', data)
  },
}

// 代取服务API
export const pickupAPI = {
  // 获取代取订单列表
  getOrders(params = {}) {
    return apiClient.get('/pickup/orders', params)
  },

  // 创建代取订单
  createOrder(data) {
    return apiClient.post('/pickup/orders', data)
  },

  // 获取订单详情
  getOrderDetail(id) {
    return apiClient.get(`/pickup/orders/${id}`)
  },

  // 接受订单
  acceptOrder(id) {
    return apiClient.post(`/pickup/orders/${id}/accept`)
  },

  // 更新订单状态
  updateOrderStatus(id, data) {
    return apiClient.patch(`/pickup/orders/${id}/status`, data)
  },

  // 取消订单
  cancelOrder(id) {
    return apiClient.delete(`/pickup/orders/${id}`)
  },

  // 获取我的订单
  getMyOrders(params = {}) {
    return apiClient.get('/pickup/my/orders', params)
  },

  // 获取订单统计
  getOrderStats() {
    return apiClient.get('/pickup/my/stats')
  },

  // 评价订单
  rateOrder(orderId, data) {
    return apiClient.post(`/pickup/orders/${orderId}/rate`, data)
  },
}

// 任务API
export const taskAPI = {
  // 获取任务列表
  getTasks(params = {}) {
    return apiClient.get('/tasks', params)
  },

  // 创建任务
  createTask(data) {
    return apiClient.post('/tasks', data)
  },

  // 获取任务详情
  getTaskDetail(id) {
    return apiClient.get(`/tasks/${id}`)
  },

  // 更新任务
  updateTask(id, data) {
    return apiClient.put(`/tasks/${id}`, data)
  },

  // 删除任务
  deleteTask(id) {
    return apiClient.delete(`/tasks/${id}`)
  },

  // 申请任务
  applyTask(id) {
    return apiClient.post(`/tasks/${id}/apply`)
  },

  // 获取申请列表
  getTaskApplications(id) {
    return apiClient.get(`/tasks/${id}/applications`)
  },

  // 处理申请
  handleApplication(taskId, applicationId, data) {
    return apiClient.patch(`/tasks/${taskId}/applications/${applicationId}`, data)
  },

  // 完成任务
  completeTask(id) {
    return apiClient.post(`/tasks/${id}/complete`)
  },

  // 获取我的任务
  getMyTasks(params = {}) {
    return apiClient.get('/tasks/my/tasks', params)
  },
}

// 论坛API
export const forumAPI = {
  // 获取帖子列表
  getPosts(params = {}) {
    return apiClient.get('/forum/posts', params)
  },

  // 创建帖子
  createPost(data) {
    return apiClient.post('/forum/posts', data)
  },

  // 获取热门帖子
  getHotPosts(params = {}) {
    return apiClient.get('/forum/posts/hot', params)
  },

  // 获取帖子详情
  getPostDetail(id) {
    return apiClient.get(`/forum/posts/${id}`)
  },

  // 更新帖子
  updatePost(id, data) {
    return apiClient.put(`/forum/posts/${id}`, data)
  },

  // 删除帖子
  deletePost(id) {
    return apiClient.delete(`/forum/posts/${id}`)
  },

  // 点赞帖子
  likePost(id) {
    return apiClient.post(`/forum/posts/${id}/like`)
  },

  // 获取评论列表
  getComments(postId, params = {}) {
    return apiClient.get(`/forum/posts/${postId}/comments`, params)
  },

  // 创建评论
  createComment(postId, data) {
    return apiClient.post(`/forum/posts/${postId}/comments`, data)
  },

  // 点赞评论
  likeComment(commentId) {
    return apiClient.post(`/forum/comments/${commentId}/like`)
  },

  // 获取我的帖子
  getMyPosts(params = {}) {
    return apiClient.get('/forum/my/posts', params)
  },
}

// 用户API
export const userAPI = {
  // 获取个人资料
  getProfile() {
    return apiClient.get('/user/profile')
  },

  // 更新个人资料
  updateProfile(data) {
    return apiClient.put('/user/profile', data)
  },

  // 上传头像
  uploadAvatar(formData) {
    return apiClient.upload('/user/avatar', formData)
  },

  // 获取用户统计
  getStats() {
    return apiClient.get('/user/stats')
  },

  // 修改密码
  changePassword(data) {
    return apiClient.post('/auth/change-password', data)
  },
}

// 工具函数
export const utils = {
  // 设置认证token
  setToken(token) {
    localStorage.setItem('token', token)
  },

  // 获取认证token
  getToken() {
    return localStorage.getItem('token')
  },

  // 移除认证token
  removeToken() {
    localStorage.removeItem('token')
  },

  // 检查是否已登录
  isAuthenticated() {
    return !!this.getToken()
  },
}

export default apiClient
