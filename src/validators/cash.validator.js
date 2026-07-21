const { body } = require('express-validator');

const adjustRules = [
  body('amount').isFloat().withMessage('amount must be a number (use negative to deduct)'),
  body('note').optional().trim(),
];

module.exports = { adjustRules };
