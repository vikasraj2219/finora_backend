const express = require('express');
const authRoutes = require('./auth.routes');
const bankAccountRoutes = require('./bankAccount.routes');
const upiAccountRoutes = require('./upiAccount.routes');
const typeRoutes = require('./type.routes');
const categoryRoutes = require('./category.routes');
const subcategoryRoutes = require('./subcategory.routes');
const cashRoutes = require('./cash.routes');
const transactionRoutes = require('./transaction.routes');
const auditLogRoutes = require('./auditLog.routes');
const merchantRoutes = require('./merchant.routes');
const statementImportRoutes = require('./statementImport.routes');
const dashboardRoutes = require('./dashboard.routes');
const notificationRoutes = require('./notification.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/upi-accounts', upiAccountRoutes);
router.use('/types', typeRoutes);
router.use('/categories', categoryRoutes);
router.use('/subcategories', subcategoryRoutes);
router.use('/cash', cashRoutes);
router.use('/transactions', transactionRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/merchants', merchantRoutes);
router.use('/imports', statementImportRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/notifications', notificationRoutes);
router.use('/reports', reportRoutes);

module.exports = router;
