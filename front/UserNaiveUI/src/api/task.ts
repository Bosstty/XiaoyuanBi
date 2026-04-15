import { apiClient } from './client';
import type { Task, CreateTaskData, TaskApplication, TaskFilters, ApiResponse } from '@/types';

export interface TaskListResponse {
    tasks: Task[];
    pagination: {
        current: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface TaskCategoryStatsResponse {
    status: 'published';
    categories: {
        study: number;
        design: number;
        tech: number;
        writing: number;
        life: number;
    };
    total: number;
}

export class TaskApi {
    // 获取任务列表
    static async getTasks(
        filters?: TaskFilters & { search?: string; sort?: string; order?: 'asc' | 'desc' }
    ): Promise<ApiResponse<TaskListResponse>> {
        return apiClient.get('/tasks', { params: filters });
    }

    // 获取已发布任务分类统计
    static async getPublishedCategoryStats(): Promise<ApiResponse<TaskCategoryStatsResponse>> {
        return apiClient.get('/tasks/stats/categories');
    }

    // 创建任务
    static async createTask(data: CreateTaskData): Promise<ApiResponse<Task>> {
        return apiClient.post('/tasks', data);
    }

    // 获取任务详情
    static async getTask(id: number): Promise<ApiResponse<Task>> {
        return apiClient.get(`/tasks/${id}`);
    }

    // 更新任务
    static async updateTask(
        id: number,
        data: Partial<CreateTaskData> & { payment_password?: string }
    ): Promise<ApiResponse<Task>> {
        return apiClient.put(`/tasks/${id}`, data);
    }

    // 删除任务
    static async deleteTask(id: number): Promise<ApiResponse> {
        return apiClient.delete(`/tasks/${id}`);
    }

    // 取消发布任务
    static async cancelTask(id: number): Promise<ApiResponse<Task>> {
        return apiClient.post(`/tasks/${id}/cancel`);
    }

    static async reportTask(
        id: number,
        data: { reason_type: string; reason_text?: string }
    ): Promise<ApiResponse> {
        return apiClient.post(`/tasks/${id}/report`, data);
    }

    // 申请任务
    static async applyTask(
        id: number,
        data: { message?: string; expected_completion_time?: string }
    ): Promise<ApiResponse<TaskApplication>> {
        return apiClient.post(`/tasks/${id}/apply`, data);
    }

    // 获取任务申请列表
    static async getTaskApplications(id: number): Promise<ApiResponse<TaskApplication[]>> {
        return apiClient.get(`/tasks/${id}/applications`);
    }

    // 处理任务申请
    static async processApplication(
        taskId: number,
        applicationId: number,
        action: 'accept' | 'reject',
        message?: string
    ): Promise<ApiResponse<TaskApplication>> {
        return apiClient.patch(`/tasks/${taskId}/applications/${applicationId}`, {
            action,
            message,
        });
    }

    // 完成任务
    static async completeTask(
        id: number,
        data: { attachments?: string[]; description?: string }
    ): Promise<ApiResponse<Task>> {
        return apiClient.post(`/tasks/${id}/complete`, data);
    }

    static async confirmTask(
        id: number,
        data: { payment_password: string }
    ): Promise<ApiResponse<Task>> {
        return apiClient.post(`/tasks/${id}/confirm`, data);
    }

    // 获取我的任务
    static async getMyTasks(
        filters?: TaskFilters & { type?: 'all' | 'published' | 'assigned' }
    ): Promise<ApiResponse<TaskListResponse>> {
        return apiClient.get('/tasks/my/tasks', { params: filters });
    }

    // 评价任务
    static async rateTask(
        id: number,
        data: { rating: number; comment?: string }
    ): Promise<ApiResponse<Task>> {
        return apiClient.post(`/tasks/${id}/rate`, data);
    }

    static async requestCancellation(
        id: number,
        data: { reason: string; compensation?: number }
    ): Promise<ApiResponse> {
        return apiClient.post(`/tasks/${id}/cancellation/request`, data);
    }

    static async respondCancellation(
        id: number,
        data: { action: 'accept' | 'reject' }
    ): Promise<ApiResponse> {
        return apiClient.post(`/tasks/${id}/cancellation/respond`, data);
    }

    static async withdrawCancellation(id: number): Promise<ApiResponse> {
        return apiClient.post(`/tasks/${id}/cancellation/withdraw`);
    }

    static async createCancellationTicket(
        id: number,
        data: { description?: string }
    ): Promise<ApiResponse> {
        return apiClient.post(`/tasks/${id}/cancellation/ticket`, data);
    }
}
