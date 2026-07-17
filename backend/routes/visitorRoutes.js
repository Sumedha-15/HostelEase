const express = require('express');

const {
  checkInVisitor,
  checkOutVisitor,
  listVisitors,
  myVisitors
} = require('../controllers/visitorController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Student
router.get('/me', protect, authorize('student'), myVisitors);

// Admin / Warden
router.get('/', protect, authorize('admin', 'warden'), listVisitors);

router.post(
  '/checkin',
  protect,
  authorize('admin', 'warden'),
  checkInVisitor
);

router.post(
  '/:id/checkout',
  protect,
  authorize('admin', 'warden'),
  checkOutVisitor
);

module.exports = router;