const { body, param } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('type').isIn(['income', 'expense']).withMessage('type must be income or expense'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid category id'),
  body('name').optional().trim().notEmpty(),
  body('type').optional().isIn(['income', 'expense']),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid category id')];

module.exports = { createRules, updateRules, idParamRule };
