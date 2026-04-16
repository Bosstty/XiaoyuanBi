// 复制同样的工具函数到AdminClient
// 时间格式化工具
export const formatTime = (timestamp, format = 'relative') => {
  const now = new Date()
  const time = new Date(timestamp)
  const diff = now - time

  if (format === 'relative') {
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    return formatTime(timestamp, 'date')
  }

  if (format === 'date') {
    return time.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (format === 'datetime') {
    return time.toLocaleString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (format === 'time') {
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return time.toISOString()
}

// 数字格式化工具
export const formatNumber = (num, options = {}) => {
  const { precision = 0, unit = '', compact = false, currency = false } = options

  if (currency) {
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: 'CNY',
      minimumFractionDigits: precision,
    }).format(num)
  }

  if (compact && num >= 10000) {
    const units = ['', '万', '亿']
    let unitIndex = 0
    let value = num

    while (value >= 10000 && unitIndex < units.length - 1) {
      value /= 10000
      unitIndex++
    }

    return `${value.toFixed(precision)}${units[unitIndex]}${unit}`
  }

  return `${num.toLocaleString('zh-CN', {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  })}${unit}`
}

// 文件大小格式化
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'

  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 防抖函数
export const debounce = (func, wait, immediate = false) => {
  let timeout

  return function executedFunction(...args) {
    const later = () => {
      timeout = null
      if (!immediate) func(...args)
    }

    const callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)

    if (callNow) func(...args)
  }
}

// 节流函数
export const throttle = (func, limit) => {
  let inThrottle

  return function (...args) {
    if (!inThrottle) {
      func.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

// 深拷贝
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj
  if (obj instanceof Date) return new Date(obj.getTime())
  if (obj instanceof Array) return obj.map((item) => deepClone(item))

  if (typeof obj === 'object') {
    const clonedObj = {}
    Object.keys(obj).forEach((key) => {
      clonedObj[key] = deepClone(obj[key])
    })
    return clonedObj
  }
}

// 生成唯一ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// 验证工具
export const validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return re.test(email)
  },

  phone: (phone) => {
    const re = /^1[3-9]\d{9}$/
    return re.test(phone)
  },

  adminCode: (code) => {
    const re = /^[A-Z]{2}\d{4}$/
    return re.test(code)
  },

  password: (password) => {
    return password.length >= 8
  },

  required: (value) => {
    return value !== null && value !== undefined && value !== ''
  },
}

// 权限检查工具
export const hasPermission = (userPermissions, requiredPermission) => {
  const permissions = Array.isArray(userPermissions)
    ? userPermissions
    : typeof userPermissions === 'string' && userPermissions.trim()
      ? (() => {
          try {
            const parsed = JSON.parse(userPermissions)
            return Array.isArray(parsed) ? parsed : []
          } catch {
            return []
          }
        })()
      : []

  if (permissions.includes('all')) return true
  return permissions.includes(requiredPermission)
}

// 数据导出工具
export const exportData = (data, filename, format = 'json') => {
  let content, mimeType

  switch (format) {
    case 'json':
      content = JSON.stringify(data, null, 2)
      mimeType = 'application/json'
      break
    case 'csv':
      content = convertToCSV(data)
      mimeType = 'text/csv'
      break
    default:
      throw new Error('Unsupported format')
  }

  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}.${format}`
  link.click()
  URL.revokeObjectURL(url)
}

// CSV转换工具
const convertToCSV = (data) => {
  if (!Array.isArray(data) || data.length === 0) return ''

  const headers = Object.keys(data[0])
  const csvHeaders = headers.join(',')

  const csvRows = data.map((row) => {
    return headers
      .map((header) => {
        const value = row[header]
        return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
      })
      .join(',')
  })

  return [csvHeaders, ...csvRows].join('\n')
}

// 本地存储工具 (使用不同的前缀)
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(`admin_${key}`)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(`admin_${key}`, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(`admin_${key}`)
      return true
    } catch {
      return false
    }
  },

  clear: () => {
    try {
      Object.keys(localStorage).forEach((key) => {
        if (key.startsWith('admin_')) {
          localStorage.removeItem(key)
        }
      })
      return true
    } catch {
      return false
    }
  },
}

// 通知工具
export const notify = {
  success: (message, duration = 3000) => {
    console.log('Success:', message)
  },

  error: (message, duration = 3000) => {
    console.error('Error:', message)
  },

  warning: (message, duration = 3000) => {
    console.warn('Warning:', message)
  },

  info: (message, duration = 3000) => {
    console.info('Info:', message)
  },
}

// 表格工具
export const tableUtils = {
  // 排序
  sort: (data, key, direction = 'asc') => {
    return [...data].sort((a, b) => {
      const aVal = a[key]
      const bVal = b[key]

      if (typeof aVal === 'string') {
        return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal)
      }

      return direction === 'asc' ? aVal - bVal : bVal - aVal
    })
  },

  // 筛选
  filter: (data, filters) => {
    return data.filter((item) => {
      return Object.keys(filters).every((key) => {
        const filterValue = filters[key]
        const itemValue = item[key]

        if (!filterValue) return true

        if (typeof itemValue === 'string') {
          return itemValue.toLowerCase().includes(filterValue.toLowerCase())
        }

        return itemValue === filterValue
      })
    })
  },

  // 分页
  paginate: (data, page, pageSize) => {
    const start = (page - 1) * pageSize
    const end = start + pageSize
    return {
      data: data.slice(start, end),
      total: data.length,
      page,
      pageSize,
      totalPages: Math.ceil(data.length / pageSize),
    }
  },
}

// URL参数处理
export const urlUtils = {
  getQueryParams: () => {
    const params = new URLSearchParams(window.location.search)
    const result = {}
    for (const [key, value] of params) {
      result[key] = value
    }
    return result
  },

  setQueryParams: (params) => {
    const url = new URL(window.location)
    Object.keys(params).forEach((key) => {
      if (params[key] !== null && params[key] !== undefined) {
        url.searchParams.set(key, params[key])
      } else {
        url.searchParams.delete(key)
      }
    })
    window.history.replaceState({}, '', url)
  },
}

// 日期工具
export const dateUtils = {
  // 格式化日期为 YYYY-MM-DD
  formatDate: (date) => {
    const d = new Date(date)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 获取今天的日期范围 [startDate, endDate]
  getTodayRange: () => {
    const today = new Date()
    const dateStr = dateUtils.formatDate(today)
    return [dateStr, dateStr]
  },

  // 获取本周的日期范围
  getWeekRange: () => {
    const today = new Date()
    const dayOfWeek = today.getDay() || 7
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek + 1)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    return [dateUtils.formatDate(startOfWeek), dateUtils.formatDate(endOfWeek)]
  },

  // 获取本月的日期范围
  getMonthRange: () => {
    const today = new Date()
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)
    return [dateUtils.formatDate(startOfMonth), dateUtils.formatDate(endOfMonth)]
  },
}
