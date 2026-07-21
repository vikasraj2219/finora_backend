const express = require('express');
const authRoutes = require('./auth.routes');
const bankAccountRoutes = require('./bankAccount.routes');
const upiAccountRoutes = require('./upiAccount.routes');
const categoryRoutes = require('./category.routes');
const cashRoutes = require('./cash.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/upi-accounts', upiAccountRoutes);
router.use('/categories', categoryRoutes);
router.use('/cash', cashRoutes);

// Phase 3+ routers (transactions, imports, dashboard, reports, documents,
// settings) will be mounted here as each phase is delivered.

module.exports = router;
