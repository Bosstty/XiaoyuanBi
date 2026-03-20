import { apiClient } from './client'
import type {
  ForumPost,
  CreateForumPostData,
  ForumComment,
  ForumPostFilters,
  PaginatedResponse,
  ApiResponse,
} from '@/types'

export class ForumApi {
  // 获取帖子列表
  static async getPosts(filters?: ForumPostFilters): Promise<ApiResponse<PaginatedResponse<ForumPost>>> {
    return apiClient.get('/forum/posts', { params: filters })
  }

  // 创建帖子
  static async createPost(data: CreateForumPostData): Promise<ApiResponse<ForumPost>> {
    return apiClient.post('/forum/posts', data)
  }

  // 获取热门帖子
  static async getHotPosts(filters?: ForumPostFilters): Promise<ApiResponse<PaginatedResponse<ForumPost>>> {
    return apiClient.get('/forum/posts/hot', { params: filters })
  }

  // 获取帖子详情
  static async getPost(id: number): Promise<ApiResponse<ForumPost>> {
    return apiClient.get(`/forum/posts/${id}`)
  }

  // 更新帖子
  static async updatePost(id: number, data: Partial<CreateForumPostData>): Promise<ApiResponse<ForumPost>> {
    return apiClient.put(`/forum/posts/${id}`, data)
  }

  // 删除帖子
  static async deletePost(id: number): Promise<ApiResponse> {
    return apiClient.delete(`/forum/posts/${id}`)
  }

  // 点赞帖子
  static async likePost(id: number): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
    return apiClient.post(`/forum/posts/${id}/like`)
  }

  // 获取评论列表
  static async getComments(
    postId: number,
    filters?: { page?: number; limit?: number }
  ): Promise<ApiResponse<PaginatedResponse<ForumComment>>> {
    return apiClient.get(`/forum/posts/${postId}/comments`, { params: filters })
  }

  // 创建评论
  static async createComment(
    postId: number,
    data: { content: string; parent_id?: number; reply_to_id?: number; images?: string[] }
  ): Promise<ApiResponse<ForumComment>> {
    return apiClient.post(`/forum/posts/${postId}/comments`, data)
  }

  // 点赞评论
  static async likeComment(commentId: number): Promise<ApiResponse<{ liked: boolean; like_count: number }>> {
    return apiClient.post(`/forum/comments/${commentId}/like`)
  }

  // 获取我的帖子
  static async getMyPosts(filters?: ForumPostFilters): Promise<ApiResponse<PaginatedResponse<ForumPost>>> {
    return apiClient.get('/forum/my/posts', { params: filters })
  }
}