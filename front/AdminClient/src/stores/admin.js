import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAdminStore = defineStore('admin', () => {
  const parseStoredUser = () => {
    const raw =
      localStorage.getItem('auth_user') ||
      localStorage.getItem('service_user') ||
      localStorage.getItem('admin_user')
    if (!raw || raw === 'undefined' || raw === 'null') return null

    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  }

  const admin = ref(parseStoredUser())
  const currentType = localStorage.getItem('auth_user_type') || 'admin'
  const token = ref(
    localStorage.getItem('auth_token') ||
      (currentType === 'service'
        ? localStorage.getItem('service_token')
        : localStorage.getItem('admin_token')) ||
      '',
  )
  const userType = ref(localStorage.getItem('auth_user_type') || 'admin')
  const isLoggedIn = computed(() => !!token.value)
  const permissions = ref(admin.value?.permissions || [])
  const isAdmin = computed(() => userType.value === 'admin')
  const isService = computed(() => userType.value === 'service')

  function setAdmin(adminData) {
    admin.value = adminData
    localStorage.setItem('auth_user', JSON.stringify(adminData))
    if (userType.value === 'service') {
      localStorage.setItem('service_user', JSON.stringify(adminData))
      localStorage.removeItem('admin_user')
    } else {
      localStorage.setItem('admin_user', JSON.stringify(adminData))
      localStorage.removeItem('service_user')
    }
    permissions.value = adminData.permissions || []
  }

  function setToken(tokenValue, type = userType.value || 'admin') {
    token.value = tokenValue
    localStorage.setItem('auth_token', tokenValue)
    if (type === 'service') {
      localStorage.setItem('service_token', tokenValue)
      localStorage.removeItem('admin_token')
    } else {
      localStorage.setItem('admin_token', tokenValue)
      localStorage.removeItem('service_token')
    }
  }

  function setUserType(type) {
    userType.value = type
    localStorage.setItem('auth_user_type', type)
  }

  function logout() {
    admin.value = null
    token.value = ''
    userType.value = 'admin'
    permissions.value = []
    localStorage.removeItem('auth_token')
    localStorage.removeItem('admin_token')
    localStorage.removeItem('service_token')
    localStorage.removeItem('auth_user')
    localStorage.removeItem('admin_user')
    localStorage.removeItem('service_user')
    localStorage.removeItem('auth_user_type')
  }

  function hasPermission(permission) {
    return permissions.value.includes(permission) || permissions.value.includes('all')
  }

  return {
    admin,
    token,
    userType,
    isLoggedIn,
    isAdmin,
    isService,
    permissions,
    setAdmin,
    setToken,
    setUserType,
    logout,
    hasPermission
  }
})
