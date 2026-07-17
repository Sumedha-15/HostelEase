const express = require('express');
const {
  createComplaint,
  myComplaints,
  listComplaints,
  updateComplaint,
  rateComplaint,
} = require('../controllers/complaintController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/', protect, authorize('student'), createComplaint);
router.get('/me', protect, authorize('student'), myComplaints);
router.get('/', protect, authorize('admin', 'warden'), listComplaints);
router.patch('/:id', protect, authorize('admin', 'warden'), updateComplaint);
router.post('/:id/rate', protect, authorize('student'), rateComplaint);

module.exports = router;
