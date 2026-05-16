const express = require('express');
const WalletController = require('@/controllers/user/WalletController');

const router = express.Router();

router.get('/overview', WalletController.getWalletOverview);
router.get('/payment-summary', WalletController.getWalletPaymentSummary);
router.get('/activities', WalletController.getWalletActivities);
router.get('/records', WalletController.getWalletActivities);
router.post('/payment-password', WalletController.setPaymentPassword);
router.post('/recharge', WalletController.recharge);
router.post('/withdraw', WalletController.withdraw);

module.exports = router;
