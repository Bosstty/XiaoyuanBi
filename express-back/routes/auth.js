const express = require('express');
const { body } = require('express-validator');
const { handleValidation } = require('../src/middleware/validation');
const { responseUtils } = require('../src/utils');
const emailService = require('../services/emailService');

const router = express.Router();

const sendCodeValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('邮箱不能为空')
        .isEmail()
        .withMessage('邮箱格式不正确'),
    handleValidation,
];

const verifyCodeValidation = [
    body('email')
        .trim()
        .notEmpty()
        .withMessage('邮箱不能为空')
        .isEmail()
        .withMessage('邮箱格式不正确'),
    body('code')
        .trim()
        .notEmpty()
        .withMessage('验证码不能为空')
        .matches(/^\d{6}$/)
        .withMessage('验证码必须为6位数字'),
    handleValidation,
];

router.post('/send-code', sendCodeValidation, async (req, res) => {
    try {
        const result = await emailService.sendVerifyCode(req.body.email);
        res.json(responseUtils.success(result, '验证码发送成功'));
    } catch (error) {
        console.error('发送邮箱验证码失败:', error);
        const status = error.status || 500;
        res.status(status).json({
            ...responseUtils.error(error.message || '验证码发送失败', status),
            ...(error.retryAfter ? { retry_after: error.retryAfter } : {}),
        });
    }
});

router.post('/verify-code', verifyCodeValidation, async (req, res) => {
    try {
        const result = await emailService.verifyCode(req.body.email, req.body.code);
        res.json(responseUtils.success(result, '验证码校验成功'));
    } catch (error) {
        console.error('校验邮箱验证码失败:', error);
        const status = error.status || 500;
        res.status(status).json(responseUtils.error(error.message || '验证码校验失败', status));
    }
});

module.exports = router;
