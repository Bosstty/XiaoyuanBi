import { ElMessage, ElNotification, ElMessageBox } from 'element-plus'

// 全局错误处理器
export class ErrorHandler {
  static handleApiError(error, showMessage = true) {
    console.error('API Error:', error)

    let message = '操作失败，请稍后重试'

    if (error.response) {
      // 服务器响应错误
      const { status, data } = error.response
      switch (status) {
        case 400:
          message = data.message || '请求参数错误'
          break
        case 401:
          message = '登录已过期，请重新登录'
          this.handleAuthError()
          break
        case 403:
          message = '没有权限执行此操作'
          break
        case 404:
          message = '请求的资源不存在'
          break
        case 422:
          message = data.message || '数据验证失败'
          break
        case 500:
          message = '服务器内部错误'
          break
        default:
          message = data.message || `请求失败 (${status})`
      }
    } else if (error.request) {
      // 网络错误
      message = '网络连接失败，请检查网络设置'
    } else {
      // 其他错误
      message = error.message || '未知错误'
    }

    if (showMessage) {
      ElMessage.error(message)
    }

    return { message, status: error.response?.status }
  }

  static handleAuthError() {
    // 清除本地认证信息
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    // 跳转到登录页
    if (window.location.pathname !== '/login') {
      ElMessageBox.confirm(
        '登录状态已过期，请重新登录',
        '提示',
        {
          confirmButtonText: '去登录',
          cancelButtonText: '取消',
          type: 'warning',
        }
      ).then(() => {
        window.location.href = '/login'
      }).catch(() => {
        // 用户取消
      })
    }
  }

  static handleFormValidationError(errors) {
    if (Array.isArray(errors)) {
      errors.forEach(error => {
        ElMessage.error(error.message)
      })
    } else if (typeof errors === 'object') {
      Object.values(errors).forEach(error => {
        ElMessage.error(Array.isArray(error) ? error[0] : error)
      })
    } else {
      ElMessage.error(errors || '表单验证失败')
    }
  }

  static showSuccess(message) {
    ElMessage.success(message)
  }

  static showWarning(message) {
    ElMessage.warning(message)
  }

  static showInfo(message) {
    ElMessage.info(message)
  }

  static showNotification(title, message, type = 'info') {
    ElNotification({
      title,
      message,
      type,
      duration: 4500,
    })
  }
}

// 全局loading管理器
export class LoadingManager {
  static activeLoaders = new Set()
  static globalLoadingInstance = null

  static show(key = 'global', options = {}) {
    this.activeLoaders.add(key)

    if (key === 'global') {
      if (!this.globalLoadingInstance) {
        const { ElLoading } = require('element-plus')
        this.globalLoadingInstance = ElLoading.service({
          lock: true,
          text: options.text || '加载中...',
          background: 'rgba(0, 0, 0, 0.7)',
          ...options
        })
      }
    }
  }

  static hide(key = 'global') {
    this.activeLoaders.delete(key)

    if (key === 'global' && this.globalLoadingInstance) {
      this.globalLoadingInstance.close()
      this.globalLoadingInstance = null
    }
  }

  static hideAll() {
    this.activeLoaders.clear()
    if (this.globalLoadingInstance) {
      this.globalLoadingInstance.close()
      this.globalLoadingInstance = null
    }
  }

  static isLoading(key = 'global') {
    return this.activeLoaders.has(key)
  }
}

// 通用确认对话框
export const confirmDialog = {
  delete: (title = '确认删除', message = '此操作不可撤销，确定要删除吗？') => {
    return ElMessageBox.confirm(message, title, {
      confirmButtonText: '确定删除',
      cancelButtonText: '取消',
      type: 'warning',
      buttonSize: 'default'
    })
  },

  submit: (title = '确认提交', message = '确定要提交吗？') => {
    return ElMessageBox.confirm(message, title, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'info'
    })
  },

  logout: () => {
    return ElMessageBox.confirm(
      '确定要退出登录吗？',
      '退出确认',
      {
        confirmButtonText: '确定退出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
  }
}

// 操作反馈工具
export const feedback = {
  success: (operation) => {
    const messages = {
      create: '创建成功',
      update: '更新成功',
      delete: '删除成功',
      save: '保存成功',
      submit: '提交成功',
      upload: '上传成功',
      download: '下载成功',
      copy: '复制成功',
      send: '发送成功',
      login: '登录成功',
      logout: '退出成功'
    }
    ElMessage.success(messages[operation] || `${operation}成功`)
  },

  error: (operation, error) => {
    const messages = {
      create: '创建失败',
      update: '更新失败',
      delete: '删除失败',
      save: '保存失败',
      submit: '提交失败',
      upload: '上传失败',
      download: '下载失败',
      copy: '复制失败',
      send: '发送失败',
      login: '登录失败',
      logout: '退出失败'
    }
    const baseMessage = messages[operation] || `${operation}失败`
    const errorMessage = error ? `${baseMessage}: ${error}` : baseMessage
    ElMessage.error(errorMessage)
  }
}

export default {
  ErrorHandler,
  LoadingManager,
  confirmDialog,
  feedback
}