const express = require('express');
const {
  generateFeeRecord,
  myFeeRecords,
  listFeeRecords,
  recordPayment,
  listDefaulters,
} = require('../controllers/feeController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/generate', protect, authorize('admin', 'warden'), generateFeeRecord);
router.get('/me', protect, authorize('student'), myFeeRecords);
router.get('/defaulters', protect, authorize('admin', 'warden'), listDefaulters);
router.get('/', protect, authorize('admin', 'warden'), listFeeRecords);
router.post('/:id/pay', protect, authorize('admin', 'warden'), recordPayment);

module.exports = router;
