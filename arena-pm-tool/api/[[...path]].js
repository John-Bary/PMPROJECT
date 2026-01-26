// Vercel Serverless Function Entry Point
// This file wraps the Express app for Vercel's serverless runtime

const app = require('../server/server');

// Export as default for Vercel Edge/Serverless compatibility
module.exports = app;

// Also export as handler for explicit serverless function format
module.exports.default = app;
