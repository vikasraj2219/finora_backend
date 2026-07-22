const express = require('express');
const controller = require('../controllers/auditLog.controller');
const { protect } = require('../middlewares/auth.middleware');

const router = express.Router();
router.use(protect);

router.get('/', controller.list);

module.exports = router;
