// Vercel Serverless Function Entry Point
// This file wraps the Express app for Vercel's serverless runtime

const app = require('../server');

// Export the Express app as a serverless function handler
module.exports = app;
