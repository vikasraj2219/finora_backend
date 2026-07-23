const express = require('express');
const controller = require('../controllers/report.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/transactions/export', controller.exportTransactions);
router.get('/summary/export', controller.exportSummary);

module.exports = router;
