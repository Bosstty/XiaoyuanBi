const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT工具函数
const jwtUtils = {
    // 生成JWT令牌
    generateToken: (payload, expiresIn = process.env.JWT_EXPIRES_IN || '7d') => {
        return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
    },

    // 验证JWT令牌
    verifyToken: token => {
        return jwt.verify(token, process.env.JWT_SECRET);
    },

    // 解码JWT令牌（不验证）
    decodeToken: token => {
        return jwt.decode(token);
    },
};

// 密码工具函数
const passwordUtils = {
    // 生成随机密码
    generatePassword: (length = 8) => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    },

    // 检查密码强度
    checkStrength: password => {
        const hasLower = /[a-z]/.test(password);
        const hasUpper = /[A-Z]/.test(password);
        const hasNumber = /\d/.test(password);
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        const isLongEnough = password.length >= 8;

        let score = 0;
        if (hasLower) score++;
        if (hasUpper) score++;
        if (hasNumber) score++;
        if (hasSpecial) score++;
        if (isLongEnough) score++;

        const strength = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'][Math.min(score, 4)];
        return {
            score,
            strength,
            hasLower,
            hasUpper,
            hasNumber,
            hasSpecial,
            isLongEnough,
        };
    },
};

// 订单号生成工具
const orderUtils = {
    // 生成订单号
    generateOrderNo: (prefix = '') => {
        const timestamp = Date.now().toString();
        const random = Math.random().toString(36).substr(2, 6);
        return `${prefix}${timestamp}${random}`.toUpperCase();
    },

    // 生成取货码
    generatePickupCode: () => {
        return Math.random().toString().substr(2, 6);
    },
};

// 分页工具函数
const paginationUtils = {
    // 计算分页参数
    getPagination: (page = 1, limit = 10) => {
        const offset = (page - 1) * limit;
        return {
            limit: parseInt(limit),
            offset: parseInt(offset),
        };
    },

    // 格式化分页响应
    formatPaginatedResponse: (data, page, limit, total) => {
        const totalPages = Math.ceil(total / limit);
        return {
            data,
            pagination: {
                current_page: parseInt(page),
                per_page: parseInt(limit),
                total,
                total_pages: totalPages,
                has_next: page < totalPages,
                has_prev: page > 1,
            },
        };
    },
};

// 时间工具函数
const timeUtils = {
    // 格式化时间
    formatTime: (date, format = 'YYYY-MM-DD HH:mm:ss') => {
        return new Date(date).toISOString().slice(0, 19).replace('T', ' ');
    },

    // 获取时间范围
    getTimeRange: (type = 'today') => {
        const now = new Date();
        switch (type) {
            case 'today':
                const startOfDay = new Date(now);
                startOfDay.setHours(0, 0, 0, 0);
                const endOfDay = new Date(now);
                endOfDay.setHours(23, 59, 59, 999);
                return {
                    start: startOfDay,
                    end: endOfDay,
                };
            case 'week':
                const startOfWeek = new Date(now);
                const day = startOfWeek.getDay();
                const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
                startOfWeek.setDate(diff);
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(endOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return {
                    start: startOfWeek,
                    end: endOfWeek,
                };
            case 'month':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(
                    now.getFullYear(),
                    now.getMonth() + 1,
                    0,
                    23,
                    59,
                    59,
                    999
                );
                return {
                    start: startOfMonth,
                    end: endOfMonth,
                };
            case 'year':
                const startOfYear = new Date(now.getFullYear(), 0, 1);
                const endOfYear = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
                return {
                    start: startOfYear,
                    end: endOfYear,
                };
            default:
                const defaultStart = new Date(now);
                defaultStart.setHours(0, 0, 0, 0);
                const defaultEnd = new Date(now);
                defaultEnd.setHours(23, 59, 59, 999);
                return {
                    start: defaultStart,
                    end: defaultEnd,
                };
        }
    },

    // 检查是否已过期
    isExpired: date => {
        return new Date(date) < new Date();
    },

    // 计算剩余时间
    getTimeRemaining: date => {
        const now = new Date();
        const target = new Date(date);
        const diff = target.getTime() - now.getTime();

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        return {
            days,
            hours,
            minutes,
            seconds,
            isExpired: target < now,
        };
    },
};

// 文件工具函数
const fileUtils = {
    // 生成文件名
    generateFileName: originalName => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substr(2, 6);
        const extension = originalName.split('.').pop();
        return `${timestamp}_${random}.${extension}`;
    },

    // 检查文件类型
    isImageFile: filename => {
        const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'];
        const extension = filename.split('.').pop().toLowerCase();
        return imageExtensions.includes(extension);
    },

    // 格式化文件大小
    formatFileSize: bytes => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
};

// 响应工具函数
const responseUtils = {
    // 成功响应
    success: (data = null, message = '操作成功') => {
        return {
            success: true,
            message,
            data,
        };
    },

    // 错误响应
    error: (message = '操作失败', code = 500) => {
        return {
            success: false,
            message,
            code,
        };
    },

    // 分页响应
    paginated: (data, pagination, message = '获取成功') => {
        return {
            success: true,
            message,
            data,
            pagination,
        };
    },
};

// 加密工具函数
const cryptoUtils = {
    // MD5加密
    md5: text => {
        return crypto.createHash('md5').update(text).digest('hex');
    },

    // SHA256加密
    sha256: text => {
        return crypto.createHash('sha256').update(text).digest('hex');
    },

    // 生成随机字符串
    randomString: (length = 32) => {
        return crypto.randomBytes(length).toString('hex');
    },

    // 生成UUID
    uuid: () => {
        return crypto.randomUUID();
    },
};

// 验证工具函数
const validationUtils = {
    // 验证邮箱
    isEmail: email => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },

    // 验证手机号
    isPhone: phone => {
        const phoneRegex = /^1[3-9]\d{9}$/;
        return phoneRegex.test(phone);
    },

    // 验证学号
    isStudentId: id => {
        const studentIdRegex = /^\d{8,12}$/;
        return studentIdRegex.test(id);
    },

    // 验证身份证号
    isIdCard: id => {
        const idCardRegex = /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/;
        return idCardRegex.test(id);
    },
};

module.exports = {
    jwtUtils,
    passwordUtils,
    orderUtils,
    paginationUtils,
    timeUtils,
    fileUtils,
    responseUtils,
    cryptoUtils,
    validationUtils,
};
