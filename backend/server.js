const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/taxonomy', require('./routes/taxonomy'));
app.use('/api/events', require('./routes/events'));
app.use('/api/exports', require('./routes/exports'));
app.use('/api/audit', require('./routes/audit'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Schedule nightly auto-lock job (runs at 12:01 AM ET)
// Cron expression: minute hour * * *
// We'll use UTC and convert to ET (ET = UTC-5 in winter, UTC-4 in summer)
cron.schedule('1 5 * * *', async () => {
  console.log('Running nightly auto-lock job...');
  try {
    const lockJob = require('./scripts/lock-events');
    await lockJob.run();
    console.log('Auto-lock job completed successfully');
  } catch (error) {
    console.error('Auto-lock job failed:', error);
  }
});

app.listen(PORT, () => {
  console.log(`iRemedy Incubator API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Auto-lock job scheduled for 12:01 AM ET daily`);
});

module.exports = app;
