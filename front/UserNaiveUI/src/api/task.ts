import { apiClient } from './client';
import type {
    Task,
    CreateTaskData,
    TaskApplication,
    TaskFilters,
    PaginatedResponse,
    ApiResponse,
} from '@/types';

export class TaskApi {
    // 获取任务列表
    static async getTasks(filters?: TaskFilters): Promise<ApiResponse<PaginatedResponse<Task>>> {
        return apiClient.get('/tasks', { params: filters });
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
    static async updateTask(id: number, data: Partial<CreateTaskData>): Promise<ApiResponse<Task>> {
        return apiClient.put(`/tasks/${id}`, data);
    }

    // 删除任务
    static async deleteTask(id: number): Promise<ApiResponse> {
        return apiClient.delete(`/tasks/${id}`);
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

    // 获取我的任务
    static async getMyTasks(filters?: TaskFilters): Promise<ApiResponse<PaginatedResponse<Task>>> {
        return apiClient.get('/tasks/my/tasks', { params: filters });
    }

    // 评价任务
    static async rateTask(
        id: number,
        data: { rating: number; comment?: string }
    ): Promise<ApiResponse<Task>> {
        return apiClient.post(`/tasks/${id}/rate`, data);
    }
}
