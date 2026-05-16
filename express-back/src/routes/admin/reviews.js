const express = require('express');
const ReviewController = require('@/controllers/admin/ReviewController');

const router = express.Router();

router.get('/workbench', ReviewController.getWorkbench);
router.patch('/workbench/reports/:id', ReviewController.handleReport);

module.exports = router;
