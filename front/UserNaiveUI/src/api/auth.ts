import { apiClient } from './client';
import type {
    User,
    UserPublicProfile,
    UserRegisterData,
    UserLoginData,
    LoginResponse,
    UserStats,
    ApiResponse,
} from '@/types';

export class AuthApi {
    // 用户注册
    static async register(data: UserRegisterData): Promise<ApiResponse<LoginResponse>> {
        return apiClient.post('/auth/register', data);
    }

    // 用户登录
    static async login(data: UserLoginData): Promise<ApiResponse<LoginResponse>> {
        return apiClient.post('/auth/login', data);
    }

    // 退出登录
    static async logout(): Promise<ApiResponse> {
        return apiClient.post('/auth/logout');
    }

    // 获取用户信息
    static async getProfile(): Promise<ApiResponse<User>> {
        return apiClient.get('/auth/profile');
    }

    // 更新用户信息
    static async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
        return apiClient.put('/auth/profile', data);
    }

    // 修改密码
    static async changePassword(data: {
        old_password: string;
        new_password: string;
    }): Promise<ApiResponse> {
        return apiClient.post('/auth/change-password', data);
    }

    // 上传头像
    static async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
        const formData = new FormData();
        formData.append('avatar', file);
        return apiClient.post('/profile/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }

    // 发送验证码
    static async sendVerificationCode(data: {
        type: 'email' | 'phone';
        target: string;
    }): Promise<ApiResponse> {
        return apiClient.post('/auth/send-verification-code', data);
    }

    // 验证验证码
    static async verifyCode(data: {
        type: 'email' | 'phone';
        target: string;
        code: string;
    }): Promise<ApiResponse> {
        return apiClient.post('/auth/verify-code', data);
    }

    static async verifyEmail(data: {
        email?: string;
        target?: string;
        code: string;
    }): Promise<ApiResponse> {
        return apiClient.post('/auth/verify-email', data);
    }

    // 微信登录
    static async wechatLogin(data: { code: string }): Promise<ApiResponse<LoginResponse>> {
        return apiClient.post('/auth/wechat-login', data);
    }

    // 注销账号
    static async deleteAccount(data: { password: string }): Promise<ApiResponse> {
        return apiClient.delete('/auth/account', { data });
    }

    // 重置密码
    static async resetPassword(data: {
        resetToken: string;
        newPassword: string;
    }): Promise<ApiResponse> {
        return apiClient.post('/auth/reset-password', data);
    }
}

export class UserApi {
    // 获取个人资料
    static async getProfile(): Promise<ApiResponse<User>> {
        return apiClient.get('/profile');
    }

    // 更新个人资料
    static async updateProfile(data: Partial<User>): Promise<ApiResponse<User>> {
        return apiClient.put('/profile', data);
    }

    // 上传头像
    static async uploadAvatar(file: File): Promise<ApiResponse<{ avatar: string }>> {
        return apiClient.upload('/profile/avatar', file);
    }

    // 获取用户统计
    static async getStats(): Promise<ApiResponse<UserStats>> {
        return apiClient.get('/profile/stats');
    }

    static async getPublicProfile(userId: number): Promise<ApiResponse<UserPublicProfile>> {
        return apiClient.get(`/profile/users/${userId}`);
    }

    // 提交学生认证
    static async submitStudentVerification(
        file: File
    ): Promise<ApiResponse<{ user: User; verification_data: User['verification_data'] }>> {
        const formData = new FormData();
        formData.append('student_card', file);
        return apiClient.post('/profile/student-verification', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
    }
}
