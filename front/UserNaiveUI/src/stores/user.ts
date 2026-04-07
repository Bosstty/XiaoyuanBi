import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { AuthApi, UserApi } from '@/api';
import type { User, UserLoginData, UserRegisterData, UserStats } from '@/types';
import { resolveAssetUrl } from '@/utils/apiBase';

export const useUserStore = defineStore('user', () => {
    // 状态
    const user = ref<User | null>(null);
    const token = ref<string | null>(localStorage.getItem('token'));
    const isLoading = ref(false);
    const userStats = ref<UserStats | null>(null);

    // 计算属性
    const isAuthenticated = computed(() => !!token.value && !!user.value);
    const isStudent = computed(() => user.value?.student_verified || false);
    const userName = computed(() => user.value?.username || user.value?.real_name || '用户');
    const userAvatar = computed(() => resolveAssetUrl(user.value?.avatar));

    // 方法

    // 登录
    const login = async (credentials: UserLoginData) => {
        isLoading.value = true;
        try {
            const response = await AuthApi.login(credentials);
            if (response.success && response.data) {
                token.value = response.data.token;
                user.value = response.data.user;

                // 保存到本地存储
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                console.log('  登录成功:', user.value.username);
                return response.data;
            }
            throw new Error(response.message || '登录失败');
        } catch (error) {
            console.error('  登录失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    // 注册
    const register = async (userData: UserRegisterData) => {
        isLoading.value = true;
        try {
            const response = await AuthApi.register(userData);
            if (response.success && response.data) {
                token.value = response.data.token;
                user.value = response.data.user;

                // 保存到本地存储
                localStorage.setItem('token', response.data.token);
                localStorage.setItem('user', JSON.stringify(response.data.user));

                console.log('  注册成功:', user.value.username);
                return response.data;
            }
            throw new Error(response.message || '注册失败');
        } catch (error) {
            console.error('  注册失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    // 退出登录
    const logout = async () => {
        try {
            await AuthApi.logout();
        } catch (error) {
            console.error('  退出登录请求失败:', error);
        } finally {
            // 清理状态和本地存储
            user.value = null;
            token.value = null;
            userStats.value = null;
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            console.log('  已退出登录');
        }
    };

    // 获取用户信息
    const fetchUserProfile = async () => {
        if (!token.value) return;

        isLoading.value = true;
        try {
            const response = await AuthApi.getProfile();
            if (response.success && response.data) {
                user.value = response.data;
                localStorage.setItem('user', JSON.stringify(response.data));
                console.log('  用户信息更新成功');
            }
        } catch (error) {
            console.error('  获取用户信息失败:', error);
            // 如果是认证错误，清理状态
            if ((error as { response?: { status?: number } }).response?.status === 401) {
                await logout();
            }
        } finally {
            isLoading.value = false;
        }
    };

    // 更新用户信息
    const updateProfile = async (data: Partial<User>) => {
        if (!user.value) return;

        isLoading.value = true;
        try {
            const response = await AuthApi.updateProfile(data);
            if (response.success && response.data) {
                user.value = response.data;
                localStorage.setItem('user', JSON.stringify(response.data));
                console.log('  用户信息更新成功');
                return response.data;
            }
            throw new Error(response.message || '更新失败');
        } catch (error) {
            console.error('  更新用户信息失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    // 修改密码
    const changePassword = async (oldPassword: string, newPassword: string) => {
        isLoading.value = true;
        try {
            const response = await AuthApi.changePassword({
                old_password: oldPassword,
                new_password: newPassword,
            });
            if (response.success) {
                console.log('  密码修改成功');
                return true;
            }
            throw new Error(response.message || '密码修改失败');
        } catch (error) {
            console.error('  密码修改失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    // 上传头像
    const uploadAvatar = async (file: File) => {
        if (!user.value) return;

        isLoading.value = true;
        try {
            const response = await AuthApi.uploadAvatar(file);
            if (response.success && response.data) {
                user.value.avatar = response.data.avatar;
                localStorage.setItem('user', JSON.stringify(user.value));
                console.log('  头像上传成功');
                return response.data.avatar;
            }
            throw new Error(response.message || '头像上传失败');
        } catch (error) {
            console.error('  头像上传失败:', error);
            throw error;
        } finally {
            isLoading.value = false;
        }
    };

    // 获取用户统计数据
    const fetchUserStats = async () => {
        if (!user.value) return;

        try {
            const response = await UserApi.getStats();
            if (response.success && response.data) {
                userStats.value = response.data;
                console.log('  用户统计数据获取成功');
                return response.data;
            }
        } catch (error) {
            console.error('  获取用户统计数据失败:', error);
        }
    };

    // 从本地存储恢复状态
    const restoreFromStorage = () => {
        const storedUser = localStorage.getItem('user');
        const storedToken = localStorage.getItem('token');

        if (storedToken && storedUser) {
            try {
                token.value = storedToken;
                user.value = JSON.parse(storedUser);
                console.log('  从本地存储恢复用户状态:', user.value?.username);
            } catch (error) {
                console.error('  本地存储数据解析失败:', error);
                localStorage.removeItem('user');
                localStorage.removeItem('token');
            }
        }
    };

    // 验证邮箱或手机号
    const sendVerificationCode = async (type: 'email' | 'phone', target: string) => {
        try {
            const response = await AuthApi.sendVerificationCode({ type, target });
            if (response.success) {
                console.log('  验证码发送成功');
                return true;
            }
            throw new Error(response.message || '验证码发送失败');
        } catch (error) {
            console.error('  验证码发送失败:', error);
            throw error;
        }
    };

    const verifyCode = async (type: 'email' | 'phone', target: string, code: string) => {
        try {
            const response = await AuthApi.verifyCode({ type, target, code });
            if (response.success) {
                // 更新用户验证状态
                if (user.value) {
                    if (type === 'email') {
                        user.value.email_verified = true;
                    } else {
                        user.value.phone_verified = true;
                    }
                    localStorage.setItem('user', JSON.stringify(user.value));
                }
                console.log('  验证成功');
                return true;
            }
            throw new Error(response.message || '验证失败');
        } catch (error) {
            console.error('  验证失败:', error);
            throw error;
        }
    };

    return {
        // 状态
        user,
        token,
        isLoading,
        userStats,

        // 计算属性
        isAuthenticated,
        isStudent,
        userName,
        userAvatar,

        // 方法
        login,
        register,
        logout,
        fetchUserProfile,
        updateProfile,
        changePassword,
        uploadAvatar,
        fetchUserStats,
        restoreFromStorage,
        sendVerificationCode,
        verifyCode,
    };
});
