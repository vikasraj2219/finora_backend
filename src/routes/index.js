const express = require('express');
const authRoutes = require('./auth.routes');

const router = express.Router();

router.use('/auth', authRoutes);

// Phase 2+ routers (bank accounts, upi accounts, categories, transactions,
// imports, dashboard, reports, documents, settings) will be mounted here
// as each phase is delivered.

module.exports = router;
