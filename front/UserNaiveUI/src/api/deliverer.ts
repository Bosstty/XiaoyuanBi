import ApiClient from './client';
import type { ApiResponse } from '@/types';
import type { PickupOrder, PaginationMeta } from '@/types';

const delivererApiClient = new ApiClient('/api/deliverer');

export interface DelivererApplicationPayload {
    real_name: string;
    phone: string;
    id_card: string;
    emergency_contact_name: string;
    emergency_contact_phone: string;
    id_card_front?: File | string | null;
    id_card_back?: File | string | null;
}

export class DelivererApplicationApi {
    static async getStatus() {
        return delivererApiClient.get('/application/status') as Promise<ApiResponse<any>>;
    }

    static async submit(data: DelivererApplicationPayload) {
        const formData = new FormData();
        formData.append('real_name', data.real_name);
        formData.append('phone', data.phone);
        formData.append('id_card', data.id_card);
        formData.append('emergency_contact_name', data.emergency_contact_name);
        formData.append('emergency_contact_phone', data.emergency_contact_phone);
        if (data.id_card_front instanceof File) {
            formData.append('id_card_front', data.id_card_front);
        }
        if (data.id_card_back instanceof File) {
            formData.append('id_card_back', data.id_card_back);
        }

        return delivererApiClient.post('/application/submit', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }) as Promise<ApiResponse<any>>;
    }

    static async update(data: Partial<DelivererApplicationPayload>) {
        const formData = new FormData();
        if (data.real_name !== undefined) formData.append('real_name', data.real_name);
        if (data.phone !== undefined) formData.append('phone', data.phone);
        if (data.id_card !== undefined) formData.append('id_card', data.id_card);
        if (data.emergency_contact_name !== undefined) {
            formData.append('emergency_contact_name', data.emergency_contact_name);
        }
        if (data.emergency_contact_phone !== undefined) {
            formData.append('emergency_contact_phone', data.emergency_contact_phone);
        }
        if (data.id_card_front instanceof File) {
            formData.append('id_card_front', data.id_card_front);
        } else if (typeof data.id_card_front === 'string' && data.id_card_front) {
            formData.append('id_card_front', data.id_card_front);
        }
        if (data.id_card_back instanceof File) {
            formData.append('id_card_back', data.id_card_back);
        } else if (typeof data.id_card_back === 'string' && data.id_card_back) {
            formData.append('id_card_back', data.id_card_back);
        }

        return delivererApiClient.put('/application/update', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        }) as Promise<ApiResponse<any>>;
    }
}

export class DelivererStatusApi {
    static async getStatus() {
        return delivererApiClient.get('/status') as Promise<ApiResponse<any>>;
    }

    static async updateStatus(is_online: boolean) {
        return delivererApiClient.post('/status/update', {
            is_online,
        }) as Promise<ApiResponse<{ is_online: boolean; last_online_at?: string | null }>>;
    }
}

export interface DelivererOrderFilters {
    page?: number;
    limit?: number;
    type?: PickupOrder['type'] | 'all';
    status?: PickupOrder['status'];
    urgent?: boolean;
}

export interface DelivererOrderListResponse {
    data: PickupOrder[];
    pagination?: PaginationMeta;
}

export class DelivererOrderApi {
    static async getAvailableOrders(filters?: DelivererOrderFilters) {
        return delivererApiClient.get('/orders/available', {
            params: {
                ...filters,
                type: filters?.type === 'all' ? undefined : filters?.type,
            },
        }) as Promise<ApiResponse<PickupOrder[]>>;
    }

    static async getMyOrders(filters?: DelivererOrderFilters) {
        return delivererApiClient.get('/orders/my-orders', {
            params: filters,
        }) as Promise<ApiResponse<PickupOrder[]>>;
    }

    static async getOrderDetail(id: number) {
        return delivererApiClient.get(`/orders/${id}`) as Promise<ApiResponse<PickupOrder>>;
    }

    static async acceptOrder(id: number) {
        return delivererApiClient.post(`/orders/${id}/accept`) as Promise<ApiResponse<PickupOrder>>;
    }

    static async updateOrderStatus(
        id: number,
        status: PickupOrder['status'],
        data?: Record<string, unknown>
    ) {
        return delivererApiClient.put(`/orders/${id}/status`, {
            status,
            ...data,
        }) as Promise<ApiResponse<PickupOrder>>;
    }

    static async startPickup(id: number) {
        return delivererApiClient.post(`/orders/${id}/start-pickup`) as Promise<ApiResponse<PickupOrder>>;
    }

    static async confirmPickup(id: number, pickup_photo?: string) {
        return delivererApiClient.post(`/orders/${id}/confirm-pickup`, {
            pickup_photo,
        }) as Promise<ApiResponse<PickupOrder>>;
    }

    static async startDelivery(id: number) {
        return delivererApiClient.post(`/orders/${id}/start-delivery`) as Promise<ApiResponse<PickupOrder>>;
    }

    static async confirmDelivery(id: number, payload?: { delivery_photo?: string }) {
        return delivererApiClient.post(`/orders/${id}/confirm-delivery`, payload) as Promise<ApiResponse<PickupOrder>>;
    }

    static async requestCancel(id: number, reason?: string) {
        return delivererApiClient.post(`/orders/${id}/request-cancel`, {
            reason,
        }) as Promise<ApiResponse<PickupOrder>>;
    }
}
