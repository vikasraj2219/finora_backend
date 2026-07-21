const express = require('express');
const controller = require('../controllers/cash.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { adjustRules } = require('../validators/cash.validator');

const router = express.Router();
router.use(protect);

router.get('/', controller.getBalance);
router.patch('/adjust', adjustRules, validate, controller.adjust);
router.post('/recalculate', controller.recalculate);

module.exports = router;
