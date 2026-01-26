// Vercel Serverless Function Entry Point
// This file wraps the Express app for Vercel's serverless runtime
// Located at the monorepo root so Vercel auto-detects it as /api

const app = require('../server/server');

// Export the Express app as a serverless function handler
module.exports = app;
