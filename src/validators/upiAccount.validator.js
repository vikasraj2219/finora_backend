const { body, param } = require('express-validator');

const createRules = [
  body('provider')
    .isIn(['GPay', 'PhonePe', 'Paytm', 'BHIM', 'AmazonPay', 'Other'])
    .withMessage('Invalid provider'),
  body('upiId').optional().trim(),
  body('linkedBankAccount').optional().isMongoId().withMessage('Invalid linkedBankAccount id'),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid account id'),
  body('provider')
    .optional()
    .isIn(['GPay', 'PhonePe', 'Paytm', 'BHIM', 'AmazonPay', 'Other']),
  body('linkedBankAccount').optional().isMongoId(),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid account id')];

module.exports = { createRules, updateRules, idParamRule };
