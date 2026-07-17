const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/auth');
const { getAllUsers } = require('../controllers/userController');

// Only admin and warden can view all users
router.get('/', protect, authorize('admin', 'warden'), getAllUsers);

module.exports = router;