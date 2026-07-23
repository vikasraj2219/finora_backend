const express = require('express');
const controller = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const {
  registerRules,
  loginRules,
  updatePasswordRules,
} = require('../validators/auth.validator');

const router = express.Router();

router.post('/register', registerRules, validate, controller.register);
router.post('/login', loginRules, validate, controller.login);
router.post('/refresh', controller.refresh);
router.get('/me', protect, controller.me);
router.patch('/profile', protect, controller.updateProfile);
router.patch('/update-password', protect, updatePasswordRules, validate, controller.updatePassword);
router.post('/logout', protect, controller.logout);

module.exports = router;
