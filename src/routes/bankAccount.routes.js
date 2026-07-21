const express = require('express');
const controller = require('../controllers/bankAccount.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const {
  createRules,
  updateRules,
  idParamRule,
  adjustBalanceRules,
} = require('../validators/bankAccount.validator');

const router = express.Router();
router.use(protect);

router.post('/', createRules, validate, controller.create);
router.get('/', controller.list);
router.get('/:id', idParamRule, validate, controller.getOne);
router.patch('/:id', updateRules, validate, controller.update);
router.patch('/:id/adjust-balance', adjustBalanceRules, validate, controller.adjustBalance);
router.post('/:id/recalculate', idParamRule, validate, controller.recalculate);
router.patch('/:id/toggle-active', idParamRule, validate, controller.toggleActive);
router.delete('/:id', idParamRule, validate, controller.remove);

module.exports = router;
