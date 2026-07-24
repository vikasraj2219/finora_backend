const { body, param } = require('express-validator');

const TYPES = ['income', 'expense', 'transfer', 'adjustment', 'opening_balance'];

const createRules = [
  body('type').isIn(TYPES).withMessage(`type must be one of: ${TYPES.join(', ')}`),
  body('amount').isFloat({ gt: 0 }).withMessage('amount must be greater than 0'),
  body('date').optional().isISO8601().withMessage('date must be a valid date'),

  body('paymentMethod')
    .if(body('type').not().equals('transfer'))
    .isIn(['cash', 'bank', 'upi', 'card', 'other'])
    .withMessage('paymentMethod is required for income/expense/adjustment/opening_balance'),

  // Category/subcategory are optional at the API level — an imported or in-progress
  // transaction can be saved with just a type, and allocationStatus reflects that.
  body('category').optional().isMongoId().withMessage('Invalid category id'),
  body('subcategory').optional().isMongoId().withMessage('Invalid subcategory id'),
  body('bankAccount').optional().isMongoId().withMessage('Invalid bankAccount id'),
  body('upiAccount').optional().isMongoId().withMessage('Invalid upiAccount id'),
  body('merchant').optional().isMongoId().withMessage('Invalid merchant id'),

  body('direction')
    .if(body('type').equals('adjustment'))
    .isIn(['increase', 'decrease'])
    .withMessage('direction must be increase or decrease for adjustment transactions'),

  body('entrySource').optional().isIn(['IMPORTED', 'MANUAL']).withMessage('Invalid entrySource'),

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
  body('type').optional().isIn(TYPES),
  body('category').optional().isMongoId().withMessage('Invalid category id'),
  body('subcategory').optional().isMongoId().withMessage('Invalid subcategory id'),
  body('direction').optional().isIn(['increase', 'decrease']),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid transaction id')];

module.exports = { createRules, updateRules, idParamRule };
