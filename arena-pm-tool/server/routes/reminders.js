// Reminder Routes
// Defines reminder-related API endpoints for Vercel Cron Jobs

const express = require('express');
const router = express.Router();
const { runReminderJob } = require('../jobs/reminderJob');

// POST /api/reminders/trigger
// This endpoint is called by Vercel Cron to trigger reminder emails
// In production, it verifies the request is from Vercel using CRON_SECRET
router.post('/trigger', async (req, res) => {
  // Verify the request is from Vercel Cron (in production)
  // Vercel sends the CRON_SECRET in the Authorization header when calling cron endpoints
  if (process.env.VERCEL) {
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({
          status: 'error',
          message: 'Unauthorized - Invalid cron secret'
        });
      }
    }
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
      message: 'Failed to run reminder job',
      error: error.message
    });
  }
});

// GET /api/reminders/status
// Health check for the reminder system
router.get('/status', (req, res) => {
  res.json({
    status: 'OK',
    enabled: process.env.REMINDER_JOB_ENABLED !== 'false',
    environment: process.env.VERCEL ? 'vercel' : 'local'
  });
});

module.exports = router;
