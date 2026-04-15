const express = require('express');
const AdminManagementController = require('../../controllers/admin/AdminManagementController');

const router = express.Router();

router.get('/', AdminManagementController.list);
router.post('/', AdminManagementController.create);
router.put('/:id', AdminManagementController.update);

module.exports = router;
