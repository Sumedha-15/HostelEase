const express = require('express');
const {
  createHostel,
  listHostels,
  createRoom,
  listRooms,
  getRoom,
  updateRoom,
} = require('../controllers/roomController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.post('/hostels', protect, authorize('admin'), createHostel);
router.get('/hostels', protect, listHostels);

router.post('/rooms', protect, authorize('admin', 'warden'), createRoom);
router.get('/rooms', protect, listRooms);
router.get('/rooms/:id', protect, getRoom);
router.patch('/rooms/:id', protect, authorize('admin', 'warden'), updateRoom);

module.exports = router;
