const express = require('express');
const authRoutes = require('./auth.routes');
const bankAccountRoutes = require('./bankAccount.routes');
const upiAccountRoutes = require('./upiAccount.routes');
const categoryRoutes = require('./category.routes');
const cashRoutes = require('./cash.routes');
const transactionRoutes = require('./transaction.routes');
const auditLogRoutes = require('./auditLog.routes');
const merchantRoutes = require('./merchant.routes');
const statementImportRoutes = require('./statementImport.routes');
const dashboardRoutes = require('./dashboard.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/upi-accounts', upiAccountRoutes);
router.use('/categories', categoryRoutes);
router.use('/cash', cashRoutes);
router.use('/transactions', transactionRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/merchants', merchantRoutes);
router.use('/imports', statementImportRoutes);
router.use('/dashboard', dashboardRoutes);

// Phase 6 routers (reports, documents, settings) will be mounted here as each
// phase is delivered.

module.exports = router;
