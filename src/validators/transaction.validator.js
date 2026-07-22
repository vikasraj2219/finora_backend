const { body, param } = require('express-validator');

const createRules = [
  body('type').isIn(['income', 'expense', 'transfer']).withMessage('type must be income, expense, or transfer'),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('date').optional().isISO8601().withMessage('date must be a valid date'),

  body('paymentMethod')
    .if(body('type').not().equals('transfer'))
    .isIn(['cash', 'bank', 'upi', 'card', 'other'])
    .withMessage('paymentMethod is required for income/expense'),
  body('category')
    .if(body('type').not().equals('transfer'))
    .isMongoId()
    .withMessage('category is required for income/expense'),
  body('bankAccount').optional().isMongoId().withMessage('Invalid bankAccount id'),
  body('upiAccount').optional().isMongoId().withMessage('Invalid upiAccount id'),
  body('merchant').optional().isMongoId().withMessage('Invalid merchant id'),

  body('transferFrom')
    .if(body('type').equals('transfer'))
    .custom((v) => v && ['bank', 'cash'].includes(v.type))
    .withMessage('transferFrom.type must be bank or cash'),
  body('transferTo')
    .if(body('type').equals('transfer'))
    .custom((v) => v && ['bank', 'cash'].includes(v.type))
    .withMessage('transferTo.type must be bank or cash'),

  body('note').optional().trim(),
  body('tags').optional().isArray().withMessage('tags must be an array'),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid transaction id'),
  body('amount').optional().isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('date').optional().isISO8601(),
  body('type').optional().isIn(['income', 'expense', 'transfer']),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid transaction id')];

module.exports = { createRules, updateRules, idParamRule };
