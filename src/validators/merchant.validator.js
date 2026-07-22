const { body, param } = require('express-validator');

const createRules = [
  body('name').trim().notEmpty().withMessage('Merchant name is required'),
  body('aliases').optional().isArray().withMessage('aliases must be an array'),
  body('defaultCategory').optional().isMongoId().withMessage('Invalid defaultCategory id'),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid merchant id'),
  body('name').optional().trim().notEmpty(),
  body('defaultCategory').optional().isMongoId(),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid merchant id')];

module.exports = { createRules, updateRules, idParamRule };
