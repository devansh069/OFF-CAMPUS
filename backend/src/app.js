const express = require('express');
const cors = require('cors');
const path = require('path');
const apiRouter = require('./routes/api');

const app = express();

// Enable CORS for frontend connection
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

// Body parsing middleware (higher size limits to accommodate base64 image data strings)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static uploaded photos/images locally
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Mount API routes
app.use('/api', apiRouter);

// Base route fallback handler
app.use((req, res, next) => {
  res.status(404).json({ detail: 'Endpoint not found' });
});

// Centralized error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    detail: err.message || 'An unexpected error occurred on the server'
  });
});

module.exports = app;
