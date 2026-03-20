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

  studentId: (id) => {
    const re = /^\d{8,12}$/
    return re.test(id)
  },

  password: (password) => {
    return password.length >= 6
  },

  required: (value) => {
    return value !== null && value !== undefined && value !== ''
  },
}

// 图片压缩
export const compressImage = (file, quality = 0.8, maxWidth = 800) => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()

    img.onload = () => {
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      canvas.toBlob(resolve, 'image/jpeg', quality)
    }

    img.src = URL.createObjectURL(file)
  })
}

// 本地存储工具
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch {
      return defaultValue
    }
  },

  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch {
      return false
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key)
      return true
    } catch {
      return false
    }
  },

  clear: () => {
    try {
      localStorage.clear()
      return true
    } catch {
      return false
    }
  },
}

// 通知工具 (需要配合UI组件使用)
export const notify = {
  success: (message, duration = 3000) => {
    console.log('Success:', message)
    // 实际项目中应该调用Toast组件
  },

  error: (message, duration = 3000) => {
    console.error('Error:', message)
    // 实际项目中应该调用Toast组件
  },

  warning: (message, duration = 3000) => {
    console.warn('Warning:', message)
    // 实际项目中应该调用Toast组件
  },

  info: (message, duration = 3000) => {
    console.info('Info:', message)
    // 实际项目中应该调用Toast组件
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

// 颜色工具
export const colorUtils = {
  hexToRgb: (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null
  },

  rgbToHex: (r, g, b) => {
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
  },

  getRandomColor: () => {
    return '#' + Math.floor(Math.random() * 16777215).toString(16)
  },
}
