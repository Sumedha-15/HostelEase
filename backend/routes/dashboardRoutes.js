const express = require('express');
const { occupancySummary, dashboardSummary } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/occupancy', protect, authorize('admin', 'warden'), occupancySummary);
router.get('/summary', protect, authorize('admin', 'warden'), dashboardSummary);

module.exports = router;
