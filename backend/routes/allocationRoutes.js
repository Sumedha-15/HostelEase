const express = require('express');
const {
  requestAllocation,
  allocateRoom,
  rejectAllocation,
  listAllocations,
  myAllocation,
  vacateAllocation,
  requestSwap,
  approveSwap,
} = require('../controllers/allocationController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/request', protect, authorize('student'), requestAllocation);
router.get('/', protect, authorize('admin', 'warden'), listAllocations);
router.get('/me', protect, authorize('student'), myAllocation);
router.post('/:id/allocate', protect, authorize('admin', 'warden'), allocateRoom);
router.post('/:id/reject', protect, authorize('admin', 'warden'), rejectAllocation);
router.post('/:id/vacate', protect, authorize('admin', 'warden'), vacateAllocation);
router.post('/swap', protect, authorize('student'), requestSwap);
router.post('/:id/approve-swap', protect, authorize('admin', 'warden'), approveSwap);

module.exports = router;