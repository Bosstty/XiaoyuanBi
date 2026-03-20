import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { authAPI } from '@/utils/api'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')
  const loading = ref(false)
  const error = ref('')

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  // 设置用户信息
  function setUser(userData) {
    user.value = userData
  }

  // 设置token
  function setToken(tokenValue) {
    token.value = tokenValue
    localStorage.setItem('token', tokenValue)
  }

  // 设置错误信息
  function setError(errorMessage) {
    error.value = errorMessage
  }

  // 清除错误信息
  function clearError() {
    error.value = ''
  }

  // 用户注册
  async function register(userData) {
    loading.value = true
    clearError()

    try {
      const response = await authAPI.register(userData)

      if (response.success) {
        setUser(response.data.user)
        setToken(response.data.token)
        return response
      }
    } catch (error) {
      setError(error.message || '注册失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 用户登录
  async function login(credentials) {
    loading.value = true
    clearError()

    try {
      const response = await authAPI.login(credentials)

      if (response.success) {
        setUser(response.data.user)
        setToken(response.data.token)
        return response
      }
    } catch (error) {
      setError(error.message || '登录失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取用户信息
  async function fetchUserProfile() {
    if (!token.value) return

    loading.value = true
    clearError()

    try {
      const response = await authAPI.getProfile()

      if (response.success) {
        setUser(response.data)
        return response
      }
    } catch (error) {
      setError(error.message || '获取用户信息失败')
      // 如果token无效，清除登录状态
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        logout()
      }
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新用户信息
  async function updateProfile(profileData) {
    loading.value = true
    clearError()

    try {
      const response = await authAPI.updateProfile(profileData)

      if (response.success) {
        setUser(response.data)
        return response
      }
    } catch (error) {
      setError(error.message || '更新用户信息失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 修改密码
  async function changePassword(passwordData) {
    loading.value = true
    clearError()

    try {
      const response = await authAPI.changePassword(passwordData)
      return response
    } catch (error) {
      setError(error.message || '修改密码失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 上传头像
  async function uploadAvatar(file) {
    loading.value = true
    clearError()

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      const response = await authAPI.uploadAvatar(formData)

      if (response.success) {
        // 更新用户头像
        if (user.value) {
          user.value.avatar = response.data.avatar
        }
        return response
      }
    } catch (error) {
      setError(error.message || '头像上传失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 用户登出
  async function logout() {
    loading.value = true

    try {
      // 调用API登出
      if (token.value) {
        await authAPI.logout()
      }
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 无论API调用是否成功，都清除本地状态
      user.value = null
      token.value = ''
      localStorage.removeItem('token')
      clearError()
      loading.value = false
    }
  }

  // 初始化用户状态（应用启动时调用）
  async function initializeUser() {
    if (token.value) {
      try {
        await fetchUserProfile()
      } catch (error) {
        console.error('初始化用户信息失败:', error)
        // 如果获取用户信息失败，清除无效的token
        logout()
      }
    }
  }

  return {
    // 状态
    user,
    token,
    loading,
    error,
    isLoggedIn,

    // 方法
    setUser,
    setToken,
    setError,
    clearError,
    register,
    login,
    fetchUserProfile,
    updateProfile,
    changePassword,
    uploadAvatar,
    logout,
    initializeUser,
  }
})
