const express = require('express');
const controller = require('../controllers/upiAccount.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { createRules, updateRules, idParamRule } = require('../validators/upiAccount.validator');

const router = express.Router();
router.use(protect);

router.post('/', createRules, validate, controller.create);
router.get('/', controller.list);
router.get('/:id', idParamRule, validate, controller.getOne);
router.patch('/:id', updateRules, validate, controller.update);
router.patch('/:id/toggle-active', idParamRule, validate, controller.toggleActive);
router.delete('/:id', idParamRule, validate, controller.remove);

module.exports = router;
