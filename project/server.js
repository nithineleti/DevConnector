const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

const morgan = require('morgan');
const logger = require('./utils/logger');


// Load environment variables
dotenv.config();

const app = express();
// Middleware
app.use(express.json()); // Parse JSON requests
app.use(express.static(path.join(__dirname, 'public'))); // Serve static HTML files from the "public" directory
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

app.use(morgan('dev'));


// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Serve the static frontend files in uploads folder
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/profiles', require('./routes/profiles'));
app.use('/api/projects', require('./routes/projects'));


// Root route (optional)
app.get('/', (req, res) => {
  res.send('Welcome to DevConnector API!');
});

app.get('/app', (req, res) => {
  res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

// Handle unknown routes (404)
app.use((req, res, next) => {
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  logger.error(`${req.method} ${req.originalUrl} - ${err.message}`);
  res.status(500).json({ message: 'Server Error' });
});

if (require.main === module) {
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}

module.exports = app;