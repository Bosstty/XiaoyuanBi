import { apiClient } from './client';
import type { ApiResponse, CreateForumPostData, ForumComment, ForumPost } from '@/types';

export interface ForumPagination {
    current: number;
    pageSize: number;
    total: number;
    totalPages: number;
}

export interface ForumPostListResponse {
    posts: ForumPost[];
    pagination: ForumPagination;
}

export interface ForumCommentListResponse {
    comments: ForumComment[];
    pagination: ForumPagination;
}

export interface ForumPostQuery {
    page?: number;
    limit?: number;
    category?: 'academic' | 'life' | 'campus' | 'task' | 'skill';
    search?: string;
    sort?: string;
    order?: 'asc' | 'desc';
    is_pinned?: boolean;
    is_hot?: boolean;
    status?: 'published' | 'draft' | 'pending_review' | 'rejected' | 'hidden';
}

export interface ForumCommentQuery {
    page?: number;
    limit?: number;
    sort?: string;
    order?: 'asc' | 'desc';
}

export interface ForumCategoryStat {
    category: 'academic' | 'life' | 'campus' | 'task' | 'skill';
    count: number;
}

export interface ForumCategoryStatsResponse {
    stats: ForumCategoryStat[];
}

export class ForumApi {
    static async getPosts(params?: ForumPostQuery): Promise<ApiResponse<ForumPostListResponse>> {
        return apiClient.get('/forum', { params });
    }

    static async getHotPosts(params?: { limit?: number }): Promise<ApiResponse<ForumPost[]>> {
        return apiClient.get('/forum/hot', { params });
    }

    static async getCategoryStats(): Promise<ApiResponse<ForumCategoryStatsResponse>> {
        return apiClient.get('/forum/stats/categories');
    }

    static async getPost(id: number): Promise<ApiResponse<ForumPost>> {
        return apiClient.get(`/forum/${id}`);
    }

    static async createPost(data: CreateForumPostData): Promise<ApiResponse<ForumPost>> {
        return apiClient.post('/forum', data);
    }

    static async updatePost(
        id: number,
        data: Partial<CreateForumPostData>
    ): Promise<ApiResponse<ForumPost>> {
        return apiClient.put(`/forum/${id}`, data);
    }

    static async deletePost(id: number): Promise<ApiResponse<null>> {
        return apiClient.delete(`/forum/${id}`);
    }

    static async likePost(id: number): Promise<ApiResponse<{ likeCount: number }>> {
        return apiClient.post(`/forum/${id}/like`);
    }

    static async reportPost(
        id: number,
        data: { reason_type: string; reason_text?: string }
    ): Promise<ApiResponse> {
        return apiClient.post(`/forum/${id}/report`, data);
    }

    static async getComments(
        postId: number,
        params?: ForumCommentQuery
    ): Promise<ApiResponse<ForumCommentListResponse>> {
        return apiClient.get(`/forum/${postId}/comments`, { params });
    }

    static async createComment(
        postId: number,
        data: {
            content: string;
            parent_id?: number;
            reply_to_id?: number;
            images?: string[];
            is_anonymous?: boolean;
        }
    ): Promise<ApiResponse<ForumComment>> {
        return apiClient.post(`/forum/${postId}/comments`, data);
    }

    static async likeComment(commentId: number): Promise<ApiResponse<{ likeCount: number }>> {
        return apiClient.post(`/forum/comments/${commentId}/like`);
    }

    static async getMyPosts(params?: ForumPostQuery): Promise<ApiResponse<ForumPostListResponse>> {
        return apiClient.get('/forum/my/posts', { params });
    }
}

export const forumApi = ForumApi;
