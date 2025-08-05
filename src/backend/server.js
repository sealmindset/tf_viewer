/**
 * Terraform Diagram Viewer - Server
 * 
 * Main entry point for the Express.js backend that handles
 * parsing Terraform code and generating diagram data.
 */

const express = require('express');
const cors = require('cors');
const pino = require('pino');
const logger = pino({ transport: { target: 'pino-pretty', options: { colorize: true } } });
const bodyParser = require('body-parser');
const path = require('path');

// Import routes
const terraformRoutes = require('./routes/terraform');
const diagramRoutes = require('./routes/diagram');
const codeGeneratorRoutes = require('./routes/codeGenerator');

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use((req, res, next) => { req.log = logger; next(); });
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Serve static files
app.use(express.static(path.join(__dirname, '../../public')));

// API Routes
app.use('/api/terraform', terraformRoutes);
app.use('/api/diagram', diagramRoutes);
app.use('/api/code-generator', codeGeneratorRoutes);

// Serve the frontend for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../public/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({
    error: true,
    message: err.message || 'Something went wrong on the server'
  });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Visit http://localhost:${PORT} to access the Terraform Diagram Viewer`);
});

module.exports = app; // For testing purposes
