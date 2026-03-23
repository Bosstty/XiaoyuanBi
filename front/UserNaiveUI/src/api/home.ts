import { apiClient } from './client';
import type { ApiResponse, ForumPost, Task } from '@/types';

interface OrderStatsResponse {
    published?: {
        total?: number;
        pending?: number;
        completed?: number;
    };
    accepted?: {
        total?: number;
        in_progress?: number;
        completed?: number;
    };
}

interface TaskListResponse {
    tasks?: Task[];
    pagination?: {
        current?: number;
        pageSize?: number;
        total?: number;
        totalPages?: number;
    };
}

export interface HomeOverview {
    orderStats: OrderStatsResponse | null;
    latestTasks: Task[];
    hotPosts: ForumPost[];
}

export class HomeApi {
    static async getOrderStats(): Promise<ApiResponse<OrderStatsResponse>> {
        return apiClient.get('/orders/stats');
    }

    static async getLatestTasks(params?: {
        page?: number;
        limit?: number;
        category?: string;
        sort?: string;
        order?: 'asc' | 'desc';
    }): Promise<ApiResponse<TaskListResponse>> {
        return apiClient.get('/tasks', {
            params: {
                page: 1,
                limit: 6,
                sort: 'created_at',
                order: 'desc',
                ...params,
            },
        });
    }

    static async getHotPosts(params?: { limit?: number }): Promise<ApiResponse<ForumPost[]>> {
        return apiClient.get('/forum/hot', {
            params: {
                limit: 3,
                ...params,
            },
        });
    }

    static async getHomeOverview(): Promise<HomeOverview> {
        const [orderStatsResult, tasksResult, postsResult] = await Promise.allSettled([
            this.getOrderStats(),
            this.getLatestTasks(),
            this.getHotPosts(),
        ]);

        return {
            orderStats:
                orderStatsResult.status === 'fulfilled' && orderStatsResult.value.success
                    ? (orderStatsResult.value.data ?? null)
                    : null,
            latestTasks:
                tasksResult.status === 'fulfilled' && tasksResult.value.success
                    ? (tasksResult.value.data?.tasks ?? [])
                    : [],
            hotPosts:
                postsResult.status === 'fulfilled' && postsResult.value.success
                    ? (postsResult.value.data ?? [])
                    : [],
        };
    }
}
