const express = require('express');
const router = express.Router();
const TaskController = require('@/controllers/user/TaskController');

// 任务相关路由
// 获取已发布任务分类统计
router.get('/stats/categories', TaskController.getPublishedCategoryStats);

// 获取我的任务
router.get('/my/tasks', TaskController.getMyTasks);

// 获取任务列表
router.get('/', TaskController.getTasks);

// 获取任务详情
router.get('/:id', TaskController.getTaskById);

// 创建任务
router.post('/', TaskController.createTask);

// 更新任务
router.put('/:id', TaskController.updateTask);

// 删除任务
router.delete('/:id', TaskController.deleteTask);

// 取消发布任务
router.post('/:id/cancel', TaskController.cancelTask);
router.post('/:id/report', TaskController.createReport);

// 申请任务
router.post('/:id/apply', TaskController.applyForTask);

// 获取申请列表
router.get('/:id/applications', TaskController.getApplications);

// 处理申请
router.patch('/:id/applications/:applicationId', TaskController.handleApplication);

// 完成任务
router.post('/:id/complete', TaskController.completeTask);

// 发布者确认完成任务
router.post('/:id/confirm', TaskController.confirmTask);

// 发布者评价任务
router.post('/:id/rate', TaskController.rateTask);

// 任务取消协商
router.post('/:id/cancellation/request', TaskController.requestCancellation);
router.post('/:id/cancellation/respond', TaskController.respondCancellation);
router.post('/:id/cancellation/withdraw', TaskController.withdrawCancellationRequest);
router.post('/:id/cancellation/ticket', TaskController.createCancellationTicket);

module.exports = router;
