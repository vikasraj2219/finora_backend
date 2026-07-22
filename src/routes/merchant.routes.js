const express = require('express');
const controller = require('../controllers/merchant.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const { createRules, updateRules, idParamRule } = require('../validators/merchant.validator');

const router = express.Router();
router.use(protect);

router.post('/', createRules, validate, controller.create);
router.get('/', controller.list);
router.get('/:id', idParamRule, validate, controller.getOne);
router.patch('/:id', updateRules, validate, controller.update);
router.delete('/:id', idParamRule, validate, controller.remove);

module.exports = router;
