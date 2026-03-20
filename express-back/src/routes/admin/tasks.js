const express = require('express');
const router = express.Router();
const AdminTaskController = require('../../controllers/admin/TaskController');

// 获取任务列表
router.get('/', AdminTaskController.getTasks);

// 获取任务详情
router.get('/:id', AdminTaskController.getTaskDetail);

// 更新任务状态
router.patch('/:id/status', AdminTaskController.updateTaskStatus);

// 删除任务
router.delete('/:id', AdminTaskController.deleteTask);

// 获取任务统计
router.get('/stats/overview', AdminTaskController.getTaskStats);

module.exports = router;
