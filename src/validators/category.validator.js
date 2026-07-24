const { body, param } = require('express-validator');
const { isValidCategoryType } = require('../services/type.service');

// Shared so create/update ask the Type collection the same question: does this code
// exist (system or belonging to this user) and is it flagged appliesToCategory.
const typeMustBeCategoryEligible = (value, { req }) =>
  isValidCategoryType(req.user._id, value).then((ok) => {
    if (!ok) throw new Error('type must be a valid category-eligible type (e.g. income or expense)');
    return true;
  });

const createRules = [
  body('name').trim().notEmpty().withMessage('Category name is required'),
  body('type').notEmpty().withMessage('type is required').bail().custom(typeMustBeCategoryEligible),
  body('icon').optional().trim(),
  body('color').optional().trim(),
];

const updateRules = [
  param('id').isMongoId().withMessage('Invalid category id'),
  body('name').optional().trim().notEmpty(),
  body('type').optional().custom(typeMustBeCategoryEligible),
];

const idParamRule = [param('id').isMongoId().withMessage('Invalid category id')];

module.exports = { createRules, updateRules, idParamRule };
