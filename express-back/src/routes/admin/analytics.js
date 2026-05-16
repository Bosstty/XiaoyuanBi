const express = require('express');
const router = express.Router();
const AdminAnalyticsController = require('@/controllers/admin/AnalyticsController');

// 仪表板统计 / 平台概览
router.get('/dashboard', AdminAnalyticsController.getPlatformOverview);

// 用户行为分析
router.get('/user-behavior', AdminAnalyticsController.getUserBehaviorAnalytics);

// 服务质量监控
router.get('/service-quality', AdminAnalyticsController.getServiceQualityMetrics);

// 收入分析
router.get('/revenue', AdminAnalyticsController.getRevenueAnalytics);
router.get('/revenue/details', AdminAnalyticsController.getRevenueDetailItems);

// 实时指标
router.get('/realtime', AdminAnalyticsController.getRealTimeMetrics);

// 异常订单预警
router.get('/alerts/abnormal-orders', AdminAnalyticsController.getAbnormalOrderAlerts);

module.exports = router;
