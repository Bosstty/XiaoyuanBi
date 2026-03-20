const { body, validationResult } = require('express-validator');

// 验证结果处理中间件（Express版本）
const handleValidation = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            message: '数据验证失败',
            errors: errors.array(),
        });
    }

    next();
};

// 用户注册验证规则
const validateUserRegister = [
    body('student_id')
        .notEmpty()
        .withMessage('学号不能为空')
        .isLength({ min: 8, max: 12 })
        .withMessage('学号长度应为8-12位'),

    body('username')
        .notEmpty()
        .withMessage('用户名不能为空')
        .isLength({ min: 2, max: 20 })
        .withMessage('用户名长度应为2-20位'),

    body('email').isEmail().withMessage('邮箱格式不正确'),

    body('password').isLength({ min: 6 }).withMessage('密码至少6位'),

    body('phone').optional().isMobilePhone('zh-CN').withMessage('手机号格式不正确'),
];

// 用户登录验证规则
const validateUserLogin = [
    body('email').isEmail().withMessage('邮箱格式不正确'),

    body('password').notEmpty().withMessage('密码不能为空'),
];

// 管理员登录验证规则
const validateAdminLogin = [
    body('username').notEmpty().withMessage('用户名不能为空'),
    body('password').notEmpty().withMessage('密码不能为空'),
];

// 代取订单创建验证规则
const validatePickupOrder = [
    body('type').isIn(['express', 'food', 'medicine', 'daily']).withMessage('订单类型无效'),

    body('title')
        .notEmpty()
        .withMessage('订单标题不能为空')
        .isLength({ max: 200 })
        .withMessage('标题长度不能超过200字符'),

    body('pickup_location').notEmpty().withMessage('取货地点不能为空'),

    body('delivery_location').notEmpty().withMessage('送达地点不能为空'),

    body('contact_name').notEmpty().withMessage('联系人姓名不能为空'),

    body('contact_phone').isMobilePhone('zh-CN').withMessage('联系人手机号格式不正确'),

    body('price')
        .isNumeric()
        .withMessage('价格必须是数字')
        .custom(value => value > 0)
        .withMessage('价格必须大于0'),
];

// 任务创建验证规则
const validateTask = [
    body('category')
        .isIn(['study', 'design', 'tech', 'writing', 'life'])
        .withMessage('任务分类无效'),

    body('title')
        .notEmpty()
        .withMessage('任务标题不能为空')
        .isLength({ max: 200 })
        .withMessage('标题长度不能超过200字符'),

    body('description').notEmpty().withMessage('任务描述不能为空'),

    body('price')
        .isNumeric()
        .withMessage('价格必须是数字')
        .custom(value => value > 0)
        .withMessage('价格必须大于0'),

    body('deadline')
        .isISO8601()
        .withMessage('截止时间格式不正确')
        .custom(value => new Date(value) > new Date())
        .withMessage('截止时间必须是未来时间'),
];

// 论坛帖子创建验证规则
const validateForumPost = [
    body('category')
        .isIn(['academic', 'life', 'campus', 'task', 'skill'])
        .withMessage('帖子分类无效'),

    body('title')
        .notEmpty()
        .withMessage('帖子标题不能为空')
        .isLength({ max: 200 })
        .withMessage('标题长度不能超过200字符'),

    body('content')
        .notEmpty()
        .withMessage('帖子内容不能为空')
        .isLength({ max: 10000 })
        .withMessage('内容长度不能超过10000字符'),
];

// Express专用验证中间件
const validate = validations => {
    return async (req, res, next) => {
        const errors = [];

        for (const validation of validations) {
            const field = validation.field;
            const rules = validation.rules;
            const value = req.body[field];

            for (const rule of rules) {
                const result = await rule(value, req.body);
                if (result !== true) {
                    errors.push({
                        field,
                        message: result,
                    });
                    break; // 一个字段只报告第一个错误
                }
            }
        }

        if (errors.length > 0) {
            return res.status(400).json({
                success: false,
                message: '数据验证失败',
                errors,
            });
        }

        next();
    };
};

// 验证规则工厂函数
const rules = {
    required: message => value => {
        return value !== undefined && value !== null && value !== '' ? true : message;
    },

    email:
        (message = '邮箱格式不正确') =>
        value => {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(value) ? true : message;
        },

    phone:
        (message = '手机号格式不正确') =>
        value => {
            const phoneRegex = /^1[3-9]\d{9}$/;
            return phoneRegex.test(value) ? true : message;
        },

    minLength: (min, message) => value => {
        return value && value.length >= min ? true : message;
    },

    maxLength: (max, message) => value => {
        return value && value.length <= max ? true : message;
    },

    isNumeric:
        (message = '必须是数字') =>
        value => {
            return !isNaN(value) && isFinite(value) ? true : message;
        },

    isPositive:
        (message = '必须是正数') =>
        value => {
            return parseFloat(value) > 0 ? true : message;
        },

    isIn: (allowedValues, message) => value => {
        return allowedValues.includes(value) ? true : message;
    },

    isDate:
        (message = '日期格式不正确') =>
        value => {
            return !isNaN(Date.parse(value)) ? true : message;
        },

    isFutureDate:
        (message = '必须是未来时间') =>
        value => {
            return new Date(value) > new Date() ? true : message;
        },
};

// 预定义验证规则集
const validationRules = {
    userRegister: [
        {
            field: 'student_id',
            rules: [
                rules.required('学号不能为空'),
                rules.minLength(8, '学号至少8位'),
                rules.maxLength(12, '学号最多12位'),
            ],
        },
        {
            field: 'username',
            rules: [
                rules.required('用户名不能为空'),
                rules.minLength(2, '用户名至少2位'),
                rules.maxLength(20, '用户名最多20位'),
            ],
        },
        { field: 'email', rules: [rules.required('邮箱不能为空'), rules.email()] },
        {
            field: 'password',
            rules: [rules.required('密码不能为空'), rules.minLength(6, '密码至少6位')],
        },
    ],

    userLogin: [
        { field: 'email', rules: [rules.required('邮箱不能为空'), rules.email()] },
        { field: 'password', rules: [rules.required('密码不能为空')] },
    ],

    adminLogin: [
        { field: 'username', rules: [rules.required('用户名不能为空')] },
        { field: 'password', rules: [rules.required('密码不能为空')] },
    ],

    pickupOrder: [
        {
            field: 'type',
            rules: [
                rules.required('订单类型不能为空'),
                rules.isIn(['express', 'food', 'medicine', 'daily'], '订单类型无效'),
            ],
        },
        {
            field: 'title',
            rules: [
                rules.required('订单标题不能为空'),
                rules.maxLength(200, '标题长度不能超过200字符'),
            ],
        },
        { field: 'pickup_location', rules: [rules.required('取货地点不能为空')] },
        { field: 'delivery_location', rules: [rules.required('送达地点不能为空')] },
        { field: 'contact_name', rules: [rules.required('联系人姓名不能为空')] },
        { field: 'contact_phone', rules: [rules.required('联系人手机号不能为空'), rules.phone()] },
        {
            field: 'price',
            rules: [rules.required('价格不能为空'), rules.isNumeric(), rules.isPositive()],
        },
    ],

    task: [
        {
            field: 'category',
            rules: [
                rules.required('任务分类不能为空'),
                rules.isIn(['study', 'design', 'tech', 'writing', 'life'], '任务分类无效'),
            ],
        },
        {
            field: 'title',
            rules: [
                rules.required('任务标题不能为空'),
                rules.maxLength(200, '标题长度不能超过200字符'),
            ],
        },
        { field: 'description', rules: [rules.required('任务描述不能为空')] },
        {
            field: 'price',
            rules: [rules.required('价格不能为空'), rules.isNumeric(), rules.isPositive()],
        },
        {
            field: 'deadline',
            rules: [rules.required('截止时间不能为空'), rules.isDate(), rules.isFutureDate()],
        },
    ],

    forumPost: [
        {
            field: 'category',
            rules: [
                rules.required('帖子分类不能为空'),
                rules.isIn(['academic', 'life', 'campus', 'task', 'skill'], '帖子分类无效'),
            ],
        },
        {
            field: 'title',
            rules: [
                rules.required('帖子标题不能为空'),
                rules.maxLength(200, '标题长度不能超过200字符'),
            ],
        },
        {
            field: 'content',
            rules: [
                rules.required('帖子内容不能为空'),
                rules.maxLength(10000, '内容长度不能超过10000字符'),
            ],
        },
    ],
};

module.exports = {
    validate,
    validationRules,
    rules,
    handleValidation,
};
