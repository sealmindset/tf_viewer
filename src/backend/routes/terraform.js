/**
 * Terraform Routes
 * 
 * Endpoints for handling Terraform code parsing and analysis.
 */

const express = require('express');
const router = express.Router();
const terraformController = require('../controllers/terraformController');

// Parse Terraform code and return structured data
router.post('/parse', terraformController.parseCode);

// Get all resource types available in the parsed code
router.get('/resource-types', terraformController.getResourceTypes);

// Get resources of a specific type
router.get('/resources/:type', terraformController.getResourcesByType);

// Get a specific resource by its ID
router.get('/resource/:id', terraformController.getResourceById);

// Parse a file from the filesystem
router.post('/parse-file', terraformController.parseFile);

// Parse a directory of Terraform files
router.post('/parse-directory', terraformController.parseDirectory);

module.exports = router;
