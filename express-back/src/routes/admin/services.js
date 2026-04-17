const express = require('express');
const router = express.Router();
const AdminServiceController = require('@/controllers/admin/ServiceController');

router.get('/', AdminServiceController.getServices);
router.post('/', AdminServiceController.createService);
router.put('/:id', AdminServiceController.updateService);
router.patch('/:id/status', AdminServiceController.updateServiceStatus);

module.exports = router;
