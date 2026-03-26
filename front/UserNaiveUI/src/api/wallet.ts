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
        type?: 'recharge' | 'withdraw' | 'withdrawal';
        payment_method?: 'balance' | 'wechat' | 'alipay' | 'bank_card';
    }): Promise<ApiResponse<WalletActivitiesResponse> & { pagination?: PaginationMeta }> {
        return apiClient.get('/wallet/activities', { params });
    }

    static async recharge(data: {
        amount: number;
        payment_method: 'wechat' | 'alipay' | 'bank_card';
        third_party_no?: string;
        bank_prefix?: string;
        account_no?: string;
        phone?: string;
        remark?: string;
    }): Promise<ApiResponse<{ balance: number }>> {
        return apiClient.post('/wallet/recharge', data);
    }

    static async setPaymentPassword(data: {
        payment_password: string;
        account_password: string;
    }): Promise<ApiResponse<{ payment_password_set: boolean; updated?: boolean }>> {
        return apiClient.post('/wallet/payment-password', data);
    }

    static async withdraw(data: {
        amount: number;
        payment_method: 'alipay' | 'bank_card';
        payment_password: string;
        third_party_no?: string;
        bank_prefix?: string;
        account_no?: string;
        phone?: string;
        remark?: string;
    }): Promise<ApiResponse<{ balance: number; fee: number; actual_amount: number }>> {
        return apiClient.post('/wallet/withdraw', data);
    }
}
