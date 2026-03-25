import ApiClient from './client';
import type { ApiResponse } from '@/types';

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
