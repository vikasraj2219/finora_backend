const express = require('express');
const controller = require('../controllers/dashboard.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/summary', controller.summary);
router.get('/trends', controller.trends);
router.get('/category-breakdown', controller.categoryBreakdown);
router.get('/payment-method-distribution', controller.paymentMethodDistribution);
router.get('/account-usage', controller.accountUsage);
router.get('/yearly-summary', controller.yearlySummary);

module.exports = router;
