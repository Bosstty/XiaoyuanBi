const express = require('express');
const router = express.Router();
const FinanceController = require('@/controllers/admin/FinanceController');

router.get('/debts', FinanceController.getDelivererDebts);
router.get('/debts/:id', FinanceController.getDelivererDebtDetail);
router.get('/system-account/overview', FinanceController.getSystemAccountOverview);
router.get('/system-account/analysis', FinanceController.getSystemAccountAnalysis);
router.get('/system-account/transactions', FinanceController.getSystemAccountTransactions);

module.exports = router;
