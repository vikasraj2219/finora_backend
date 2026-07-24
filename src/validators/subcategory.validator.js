const { body, param, query } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Subcategory name is required'),
  body('category').isMongoId().withMessage('category is required'),
  body('icon').optional().trim(),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid subcategory id'),
  body('name').optional().trim().notEmpty(),
  body('icon').optional().trim(),
];

const listRules = [query('category').optional().isMongoId().withMessage('Invalid category id')];

const idParamRule = [param('id').isMongoId().withMessage('Invalid subcategory id')];

module.exports = { createRules, updateRules, listRules, idParamRule };
