import { apiClient } from './client'
import type {
  PickupOrder,
  CreatePickupOrderData,
  PickupOrderFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types'

export class PickupApi {
  // 获取代取订单列表
  static async getOrders(filters?: PickupOrderFilters): Promise<ApiResponse<PaginatedResponse<PickupOrder>>> {
    return apiClient.get('/orders', { params: filters })
  }

  // 创建代取订单
  static async createOrder(data: CreatePickupOrderData): Promise<ApiResponse<PickupOrder>> {
    return apiClient.post('/orders', data)
  }

  // 获取订单详情
  static async getOrder(id: number): Promise<ApiResponse<PickupOrder>> {
    return apiClient.get(`/orders/${id}`)
  }

  // 接受订单
  static async acceptOrder(id: number): Promise<ApiResponse<PickupOrder>> {
    return apiClient.post(`/orders/${id}/accept`)
  }

  // 更新订单状态
  static async updateOrderStatus(
    id: number,
    status: PickupOrder['status'],
    data?: any
  ): Promise<ApiResponse<PickupOrder>> {
    return apiClient.patch(`/orders/${id}/status`, { status, ...data })
  }

  // 取消订单
  static async cancelOrder(id: number, reason?: string): Promise<ApiResponse> {
    return apiClient.delete(`/orders/${id}`, { data: { reason } })
  }

  // 获取我的订单
  static async getMyOrders(filters?: PickupOrderFilters): Promise<ApiResponse<PaginatedResponse<PickupOrder>>> {
    return apiClient.get('/orders/my-orders', { params: filters })
  }

  // 评价订单
  static async rateOrder(
    id: number,
    data: { rating: number; comment?: string }
  ): Promise<ApiResponse<PickupOrder>> {
    return apiClient.post(`/orders/${id}/rate`, data)
  }
}