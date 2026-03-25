import { apiClient } from './client';
import type { ApiResponse, PaginationMeta, WalletActivitiesResponse, WalletOverview } from '@/types';

export class WalletApi {
    static async getOverview(): Promise<ApiResponse<WalletOverview>> {
        return apiClient.get('/wallet/overview');
    }

    static async getActivities(params?: {
        page?: number;
        limit?: number;
        direction?: 'all' | 'in' | 'out';
    }): Promise<ApiResponse<WalletActivitiesResponse> & { pagination?: PaginationMeta }> {
        return apiClient.get('/wallet/activities', { params });
    }

    static async recharge(data: {
        amount: number;
        remark?: string;
    }): Promise<ApiResponse<{ balance: number }>> {
        return apiClient.post('/wallet/recharge', data);
    }

    static async setPaymentPassword(data: {
        payment_password: string;
    }): Promise<ApiResponse<{ payment_password_set: boolean }>> {
        return apiClient.post('/wallet/payment-password', data);
    }

    static async withdraw(data: {
        amount: number;
        remark?: string;
    }): Promise<ApiResponse<{ balance: number }>> {
        return apiClient.post('/wallet/withdraw', data);
    }
}
