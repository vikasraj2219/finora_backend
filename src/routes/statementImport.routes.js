const express = require('express');
const controller = require('../controllers/statementImport.controller');
const { protect } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();
router.use(protect);

router.post('/preview', upload.single('file'), controller.preview);
router.post('/confirm', controller.confirm);

module.exports = router;
