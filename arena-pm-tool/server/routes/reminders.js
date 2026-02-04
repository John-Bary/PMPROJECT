// Reminder Routes
// Defines reminder-related API endpoints for Vercel Cron Jobs

const express = require('express');
const router = express.Router();
const { runReminderJob } = require('../jobs/reminderJob');
const { authMiddleware } = require('../middleware/auth');

// POST /api/reminders/trigger
// This endpoint is called by Vercel Cron to trigger reminder emails
// API-03: CRON_SECRET is now enforced in ALL environments (not just Vercel)
router.post('/trigger', async (req, res) => {
  // Verify the request using CRON_SECRET in all environments
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({
        status: 'error',
        message: 'Unauthorized - Invalid cron secret'
      });
    }
  } else if (process.env.NODE_ENV === 'production') {
    // In production, CRON_SECRET must be configured
    return res.status(500).json({
      status: 'error',
      message: 'CRON_SECRET is not configured'
    });
  }

  try {
    const summary = await runReminderJob('vercel-cron');

    res.json({
      status: 'OK',
      message: 'Reminder job completed',
      summary: summary || { sent: 0, failed: 0 }
    });
  } catch (error) {
    console.error('Reminder trigger error:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to run reminder job'
    });
  }
});

// GET /api/reminders/status
// Health check for the reminder system (API-07: now requires authentication)
router.get('/status', authMiddleware, (req, res) => {
  res.json({
    status: 'OK',
    enabled: process.env.REMINDER_JOB_ENABLED !== 'false'
  });
});

module.exports = router;
