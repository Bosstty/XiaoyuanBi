import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { pickupAPI } from '@/utils/api'

export const usePickupStore = defineStore('pickup', () => {
  const orders = ref([])
  const currentOrder = ref(null)
  const loading = ref(false)
  const error = ref('')

  // 计算属性
  const myOrders = computed(() => {
    return orders.value.filter((order) => order.is_my_order)
  })

  const pendingOrders = computed(() => {
    return orders.value.filter((order) => order.status === 'pending')
  })

  // 设置错误信息
  function setError(errorMessage) {
    error.value = errorMessage
  }

  // 清除错误信息
  function clearError() {
    error.value = ''
  }

  // 获取订单列表
  async function fetchOrders(params = {}) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.getOrders(params)

      if (response.success) {
        orders.value = response.data
        return response
      }
    } catch (error) {
      setError(error.message || '获取订单列表失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 创建订单
  async function createOrder(orderData) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.createOrder(orderData)

      if (response.success) {
        // 将新订单添加到列表头部
        orders.value.unshift(response.data)
        return response
      }
    } catch (error) {
      setError(error.message || '创建订单失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取订单详情
  async function fetchOrderDetail(orderId) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.getOrderDetail(orderId)

      if (response.success) {
        currentOrder.value = response.data
        return response
      }
    } catch (error) {
      setError(error.message || '获取订单详情失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 接受订单
  async function acceptOrder(orderId) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.acceptOrder(orderId)

      if (response.success) {
        // 更新本地订单状态
        const order = orders.value.find((o) => o.id === orderId)
        if (order) {
          order.status = 'accepted'
          order.updated_at = new Date().toISOString()
        }

        // 更新当前订单
        if (currentOrder.value && currentOrder.value.id === orderId) {
          currentOrder.value.status = 'accepted'
          currentOrder.value.updated_at = new Date().toISOString()
        }

        return response
      }
    } catch (error) {
      setError(error.message || '接受订单失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 更新订单状态
  async function updateOrderStatus(orderId, statusData) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.updateOrderStatus(orderId, statusData)

      if (response.success) {
        // 更新本地订单状态
        const order = orders.value.find((o) => o.id === orderId)
        if (order) {
          Object.assign(order, statusData)
          order.updated_at = new Date().toISOString()
        }

        // 更新当前订单
        if (currentOrder.value && currentOrder.value.id === orderId) {
          Object.assign(currentOrder.value, statusData)
          currentOrder.value.updated_at = new Date().toISOString()
        }

        return response
      }
    } catch (error) {
      setError(error.message || '更新订单状态失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 取消订单
  async function cancelOrder(orderId) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.cancelOrder(orderId)

      if (response.success) {
        // 更新本地订单状态
        const order = orders.value.find((o) => o.id === orderId)
        if (order) {
          order.status = 'cancelled'
          order.updated_at = new Date().toISOString()
        }

        // 更新当前订单
        if (currentOrder.value && currentOrder.value.id === orderId) {
          currentOrder.value.status = 'cancelled'
          currentOrder.value.updated_at = new Date().toISOString()
        }

        return response
      }
    } catch (error) {
      setError(error.message || '取消订单失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 获取我的订单
  async function fetchMyOrders(params = {}) {
    loading.value = true
    clearError()

    try {
      const response = await pickupAPI.getMyOrders(params)

      if (response.success) {
        // 标记为我的订单
        const myOrderList = response.data.map((order) => ({
          ...order,
          is_my_order: true,
        }))

        // 合并到总订单列表中，避免重复
        myOrderList.forEach((myOrder) => {
          const existingIndex = orders.value.findIndex((o) => o.id === myOrder.id)
          if (existingIndex >= 0) {
            orders.value[existingIndex] = myOrder
          } else {
            orders.value.push(myOrder)
          }
        })

        return response
      }
    } catch (error) {
      setError(error.message || '获取我的订单失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  // 按类型获取订单
  function getOrdersByType(type) {
    return orders.value.filter((order) => order.type === type)
  }

  // 按状态获取订单
  function getOrdersByStatus(status) {
    return orders.value.filter((order) => order.status === status)
  }

  // 设置当前订单
  function setCurrentOrder(order) {
    currentOrder.value = order
  }

  // 清除当前订单
  function clearCurrentOrder() {
    currentOrder.value = null
  }

  // 重置store状态
  function resetStore() {
    orders.value = []
    currentOrder.value = null
    clearError()
    loading.value = false
  }

  return {
    // 状态
    orders,
    currentOrder,
    loading,
    error,
    myOrders,
    pendingOrders,

    // 方法
    setError,
    clearError,
    fetchOrders,
    createOrder,
    fetchOrderDetail,
    acceptOrder,
    updateOrderStatus,
    cancelOrder,
    fetchMyOrders,
    getOrdersByType,
    getOrdersByStatus,
    setCurrentOrder,
    clearCurrentOrder,
    resetStore,
  }
})
