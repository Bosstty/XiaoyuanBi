import axios, { type AxiosInstance, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import type { ApiResponse } from '@/types';
import { getApiBaseUrl } from '@/utils/apiBase';

class ApiClient {
    private instance: AxiosInstance;

    constructor(baseURL: string = getApiBaseUrl('user')) {
        this.instance = axios.create({
            baseURL,
            timeout: 10000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        this.setupInterceptors();
    }

    private setupInterceptors(): void {
        // 请求拦截器
        this.instance.interceptors.request.use(
            config => {
                // 添加认证 token
                const token = localStorage.getItem('token');
                if (token) {
                    config.headers.Authorization = `Bearer ${token}`;
                }

                console.log(` API Request: ${config.method?.toUpperCase()} ${config.url}`);
                return config;
            },
            error => {
                console.error('  Request error:', error);
                return Promise.reject(error);
            }
        );

        // 响应拦截器
        this.instance.interceptors.response.use(
            (response: AxiosResponse<ApiResponse>) => {
                console.log(
                    `  API Response: ${response.config.method?.toUpperCase()} ${
                        response.config.url
                    }`
                );
                return response;
            },
            error => {
                console.error('  Response error:', error);

                // 处理认证错误
                if (error.response?.status === 401) {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    // 重定向到登录页面
                    window.location.href = '/login';
                }

                // 处理网络错误
                if (!error.response) {
                    console.error('网络错误，请检查网络连接');
                }

                const isTimeout =
                    error.code === 'ECONNABORTED' ||
                    (typeof error.message === 'string' && error.message.includes('timeout'));
                const serverMessage = isTimeout
                    ? '请求超时，请稍后重试'
                    : error.response?.data?.message ||
                      error.response?.data?.error ||
                      error.message ||
                      '请求失败';
                const normalizedError = new Error(serverMessage);
                (normalizedError as Error & { response?: unknown }).response = error.response;

                return Promise.reject(normalizedError);
            }
        );
    }

    // GET 请求
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.instance.get<ApiResponse<T>>(url, config);
        return response.data;
    }

    // POST 请求
    async post<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        const response = await this.instance.post<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    // PUT 请求
    async put<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        const response = await this.instance.put<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    // PATCH 请求
    async patch<T = any>(
        url: string,
        data?: any,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        const response = await this.instance.patch<ApiResponse<T>>(url, data, config);
        return response.data;
    }

    // DELETE 请求
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
        const response = await this.instance.delete<ApiResponse<T>>(url, config);
        return response.data;
    }

    // 上传文件
    async upload<T = any>(
        url: string,
        file: File | FormData,
        config?: AxiosRequestConfig
    ): Promise<ApiResponse<T>> {
        const formData = file instanceof FormData ? file : new FormData();
        if (file instanceof File) {
            formData.append('file', file);
        }

        const response = await this.instance.post<ApiResponse<T>>(url, formData, {
            ...config,
            headers: {
                ...config?.headers,
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
}

// 创建默认实例
export const apiClient = new ApiClient();
export const publicApiClient = new ApiClient(getApiBaseUrl('public'));

// 导出类型
export type { AxiosRequestConfig, AxiosResponse };
export default ApiClient;
