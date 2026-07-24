const express = require('express');
const controller = require('../controllers/transaction.controller');
const validate = require('../middlewares/validate.middleware');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');
const { createRules, updateRules, idParamRule, bulkAllocateRules } = require('../validators/transaction.validator');

const router = express.Router();
router.use(protect);

router.post('/', createRules, validate, controller.create);
router.get('/', controller.list);
router.get('/allocation-summary', controller.allocationSummary);
router.post('/bulk-allocate', bulkAllocateRules, validate, controller.bulkAllocate);
router.get('/account-ledger', controller.accountLedger);
router.get('/account-stats', controller.accountStats);
router.get('/accounts-allocation-summary', controller.accountsAllocationSummary);
router.get('/allocation-trend', controller.allocationTrend);
router.get('/entry-source-summary', controller.entrySourceSummary);
router.get('/:id', idParamRule, validate, controller.getOne);
router.patch('/:id', updateRules, validate, controller.update);
router.delete('/:id', idParamRule, validate, controller.remove);
router.post('/:id/receipt', idParamRule, validate, upload.single('receipt'), controller.uploadReceipt);
router.delete('/:id/receipt', idParamRule, validate, controller.removeReceipt);

module.exports = router;
