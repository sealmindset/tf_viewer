/**
 * Code Generator Controller
 * 
 * Handles the logic for generating Terraform code from diagram data.
 */

const fs = require('fs').promises;
const path = require('path');
const codeGenerator = require('../services/codeGenerator');
const { validateDiagramData } = require('../utils/validator');

/**
 * Generate Terraform code from diagram data
 */
exports.generateCode = async (req, res, next) => {
  try {
    const { diagramData } = req.body;
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Validate the diagram data
    const validationResult = validateDiagramData(diagramData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid diagram data', details: validationResult.errors });
    }

    // Generate the Terraform code
    const generatedCode = await codeGenerator.generateFromDiagram(diagramData);
    
    res.json({
      success: true,
      data: generatedCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate a specific resource's code
 */
exports.generateResourceCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagramData } = req.body;
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Generate code for the specific resource
    const resourceCode = await codeGenerator.generateResourceCode(diagramData, id);
    
    if (!resourceCode) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }
    
    res.json({
      success: true,
      data: resourceCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Generate code for a specific module
 */
exports.generateModuleCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { diagramData } = req.body;
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Generate code for the specific module
    const moduleCode = await codeGenerator.generateModuleCode(diagramData, id);
    
    if (!moduleCode) {
      return res.status(404).json({ error: true, message: 'Module not found' });
    }
    
    res.json({
      success: true,
      data: moduleCode
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Export generated code to files
 */
exports.exportToFiles = async (req, res, next) => {
  try {
    const { generatedCode, outputDirectory } = req.body;
    
    if (!generatedCode || !outputDirectory) {
      return res.status(400).json({ error: true, message: 'Missing required data' });
    }

    // Create the output directory if it doesn't exist
    await fs.mkdir(outputDirectory, { recursive: true });
    
    // Write the generated code to files
    const fileResults = [];
    
    for (const [filename, content] of Object.entries(generatedCode)) {
      const filePath = path.join(outputDirectory, filename);
      await fs.writeFile(filePath, content);
      fileResults.push({ filename, path: filePath });
    }
    
    res.json({
      success: true,
      data: {
        outputDirectory,
        files: fileResults
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Preview code changes before saving
 */
exports.previewChanges = async (req, res, next) => {
  try {
    const { diagramData, originalCode } = req.body;
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Generate the Terraform code from the diagram
    const generatedCode = await codeGenerator.generateFromDiagram(diagramData);
    
    // Compare with original code if provided
    let diff = null;
    if (originalCode) {
      diff = await codeGenerator.generateDiff(originalCode, generatedCode);
    }
    
    res.json({
      success: true,
      data: {
        generatedCode,
        diff
      }
    });
  } catch (error) {
    next(error);
  }
};
