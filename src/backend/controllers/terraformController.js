/**
 * Terraform Controller
 * 
 * Handles the logic for parsing and analyzing Terraform code.
 */

const fs = require('fs').promises;
const os = require('os');
const path = require('path');
const parser = require('../services/terraformParser');
const { validateTerraformCode } = require('../utils/validator');

/**
 * Parse Terraform code from request body
 */
exports.parseCode = async (req, res, next) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: true, message: 'No code provided' });
    }

    // Validate the Terraform code
    const validationResult = validateTerraformCode(code);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid Terraform code', details: validationResult.errors });
    }

    // Parse the Terraform code
    const parsedData = await parser.parseString(code);
    
    res.json({
      success: true,
      parsedData,
      code: { anonymous: code } // when parsing raw code, filename unknown
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Parse a Terraform file from the filesystem
 */
exports.parseFile = async (req, res, next) => {
  try {
    let { filePath } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: true, message: 'No file path provided' });
    }
    // Expand ~ to home dir if present
    if (filePath.startsWith('~')) {
      filePath = path.join(os.homedir(), filePath.slice(1));
    }
    
    if (!filePath) {
      return res.status(400).json({ error: true, message: 'No file path provided' });
    }

    // Read and parse the file
    const fileContent = await fs.readFile(filePath, 'utf8');
    const parsedData = await parser.parseString(fileContent);
    
    res.json({
      success: true,
      parsedData,
      code: { [path.basename(filePath)]: fileContent },
      filePath
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: true, message: 'File not found' });
    }
    next(error);
  }
};

/**
 * Parse a directory of Terraform files
 */
exports.parseDirectory = async (req, res, next) => {
  try {
    let { directoryPath } = req.body;
    if (!directoryPath) {
      return res.status(400).json({ error: true, message: 'No directory path provided' });
    }
    // Expand ~ to home dir if present
    if (directoryPath.startsWith('~')) {
      directoryPath = path.join(os.homedir(), directoryPath.slice(1));
    }
    
    if (!directoryPath) {
      return res.status(400).json({ error: true, message: 'No directory path provided' });
    }

    // Parse all .tf files in the directory
    const files = await fs.readdir(directoryPath);
    const tfFiles = files.filter(file => path.extname(file) === '.tf');
    
    // Merge parsed data from all files into a single object
    const mergedData = {};
    const codeFiles = {};
    for (const file of tfFiles) {
      const filePath = path.join(directoryPath, file);
      const fileContent = await fs.readFile(filePath, 'utf8');
      const fileParsed = await parser.parseString(fileContent);
      codeFiles[file] = fileContent;
      if (!fileParsed.success) {
        console.error('Parse error in', file, fileParsed.error);
        continue;
      }
      const fileData = fileParsed.data || {};
      // Deep merge top-level keys (terraform, provider, resource, etc.)
      for (const [key, value] of Object.entries(fileData)) {
        if (typeof value !== 'object' || value === null) {
          mergedData[key] = value;
        } else {
          mergedData[key] = { ...(mergedData[key] || {}), ...value };
        }
      }
    }
    
    res.json({
      success: true,
      parsedData: mergedData,
      code: codeFiles,
      fileCount: tfFiles.length,
      files: tfFiles
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: true, message: 'Directory not found' });
    }
    next(error);
  }
};

/**
 * Get all resource types available in the parsed code
 */
exports.getResourceTypes = async (req, res, next) => {
  try {
    const { parsedData } = req.body;
    
    if (!parsedData) {
      return res.status(400).json({ error: true, message: 'No parsed data provided' });
    }

    const resourceTypes = parser.extractResourceTypes(parsedData);
    
    res.json({
      success: true,
      data: resourceTypes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get resources of a specific type
 */
exports.getResourcesByType = async (req, res, next) => {
  try {
    const { type } = req.params;
    const { parsedData } = req.body;
    
    if (!parsedData) {
      return res.status(400).json({ error: true, message: 'No parsed data provided' });
    }

    const resources = parser.extractResourcesByType(parsedData, type);
    
    res.json({
      success: true,
      data: resources
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a specific resource by its ID
 */
exports.getResourceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { parsedData } = req.body;
    
    if (!parsedData) {
      return res.status(400).json({ error: true, message: 'No parsed data provided' });
    }

    const resource = parser.findResourceById(parsedData, id);
    
    if (!resource) {
      return res.status(404).json({ error: true, message: 'Resource not found' });
    }
    
    res.json({
      success: true,
      data: resource
    });
  } catch (error) {
    next(error);
  }
};
