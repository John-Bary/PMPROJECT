// Holiday Routes
// Defines holiday-related API endpoints

const express = require('express');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { getHolidays } = require('../controllers/holidayController');

// All holiday routes require authentication
router.use(authMiddleware);

// GET /api/holidays?year=2026
router.get('/', getHolidays);

module.exports = router;
