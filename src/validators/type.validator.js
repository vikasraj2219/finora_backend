const { body, param } = require('express-validator');

const createRules = [
  body('code')
    .trim()
    .notEmpty()
    .withMessage('code is required')
    .matches(/^[a-z][a-z_]*$/)
    .withMessage('code must be lowercase letters and underscores only, e.g. "refund"'),
  body('label').trim().notEmpty().withMessage('label is required'),
  body('appliesToCategory').optional().isBoolean().withMessage('appliesToCategory must be true or false'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid type id'),
  body('label').optional().trim().notEmpty().withMessage('label cannot be empty'),
  body('appliesToCategory').optional().isBoolean().withMessage('appliesToCategory must be true or false'),
  body('icon').optional().trim(),
  body('color').optional().trim(),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid type id')];

module.exports = { createRules, updateRules, idParamRule };
