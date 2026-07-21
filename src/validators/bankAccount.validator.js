const { body, param } = require('express-validator');

const createRules = [
  body('bankName').trim().notEmpty().withMessage('Bank name is required'),
  body('accountType').optional().isIn(['savings', 'current', 'salary', 'other']),
  body('openingBalance').optional().isFloat({ min: 0 }).withMessage('openingBalance must be >= 0'),
  body('accountNumberLast4')
    .optional()
    .isLength({ min: 2, max: 6 })
    .withMessage('accountNumberLast4 should be the last few digits only'),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid account id'),
  body('bankName').optional().trim().notEmpty(),
  body('accountType').optional().isIn(['savings', 'current', 'salary', 'other']),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid account id')];

const adjustBalanceRules = [
  param('id').isMongoId().withMessage('Invalid account id'),
  body('amount').isFloat().withMessage('amount must be a number (use negative to deduct)'),
  body('note').optional().trim(),
];

module.exports = { createRules, updateRules, idParamRule, adjustBalanceRules };
