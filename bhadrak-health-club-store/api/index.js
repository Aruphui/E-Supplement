// Vercel serverless function entry point - Fixed for database consistency
const app = require('../backend/server');

// Export for serverless
module.exports = app;