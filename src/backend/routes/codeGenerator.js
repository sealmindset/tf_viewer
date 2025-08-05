/**
 * Code Generator Routes
 * 
 * Endpoints for generating Terraform code from diagram data.
 */

const express = require('express');
const router = express.Router();
const codeGeneratorController = require('../controllers/codeGeneratorController');

// Generate Terraform code from diagram data
router.post('/generate', codeGeneratorController.generateCode);

// Generate a specific resource's code
router.post('/resource/:id', codeGeneratorController.generateResourceCode);

// Generate code for a specific module
router.post('/module/:id', codeGeneratorController.generateModuleCode);

// Export generated code to files
router.post('/export', codeGeneratorController.exportToFiles);

// Preview code changes before saving
router.post('/preview', codeGeneratorController.previewChanges);

module.exports = router;
