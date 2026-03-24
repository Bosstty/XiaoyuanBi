const express = require('express');
const router = express.Router();
const TaskController = require('../../controllers/user/TaskController');

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

// 申请任务
router.post('/:id/apply', TaskController.applyForTask);

// 获取申请列表
router.get('/:id/applications', TaskController.getApplications);

// 处理申请
router.patch('/:id/applications/:applicationId', TaskController.handleApplication);

// 完成任务
router.post('/:id/complete', TaskController.completeTask);

module.exports = router;
