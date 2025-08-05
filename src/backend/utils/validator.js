/**
 * Validator Utility
 * 
 * Utility functions for validating Terraform code and diagram data.
 */

const joi = require('joi');

/**
 * Validate Terraform code
 * @param {string} code - Terraform code to validate
 * @returns {Object} Validation result
 */
exports.validateTerraformCode = (code) => {
  // Basic validation - just check that the code is a non-empty string
  if (typeof code !== 'string' || code.trim().length === 0) {
    return {
      valid: false,
      errors: ['Terraform code must be a non-empty string']
    };
  }
  
  // Basic syntax check - look for balanced braces
  let braceCount = 0;
  for (let i = 0; i < code.length; i++) {
    if (code[i] === '{') braceCount++;
    if (code[i] === '}') braceCount--;
    
    if (braceCount < 0) {
      return {
        valid: false,
        errors: ['Terraform code has unbalanced braces']
      };
    }
  }
  
  if (braceCount !== 0) {
    return {
      valid: false,
      errors: ['Terraform code has unbalanced braces']
    };
  }
  
  // Check for common Terraform block types
  const commonBlockTypes = ['resource', 'provider', 'variable', 'module', 'data', 'output'];
  let foundBlockType = false;
  
  for (const blockType of commonBlockTypes) {
    if (code.includes(`${blockType} "`)) {
      foundBlockType = true;
      break;
    }
  }
  
  if (!foundBlockType) {
    return {
      valid: false,
      errors: ['Terraform code does not contain any common block types']
    };
  }
  
  return {
    valid: true
  };
};

/**
 * Validate diagram data
 * @param {Object} diagramData - Diagram data to validate
 * @returns {Object} Validation result
 */
exports.validateDiagramData = (diagramData) => {
  // Define schema for diagram data
  const schema = joi.object({
    nodes: joi.array().items(joi.object({
      id: joi.string().required(),
      type: joi.string().required(),
      label: joi.string().required(),
      x: joi.number(),
      y: joi.number(),
      width: joi.number(),
      height: joi.number()
    })).required(),
    edges: joi.array().items(joi.object({
      id: joi.string().optional(),
      sourceId: joi.string().required(),
      targetId: joi.string().required(),
      label: joi.string(),
      points: joi.array().items(joi.object({
        x: joi.number().required(),
        y: joi.number().required()
      }))
    })).required(),
    width: joi.number(),
    height: joi.number()
  });
  
  // Validate diagram data against schema
  const validationResult = schema.validate(diagramData);
  
  if (validationResult.error) {
    return {
      valid: false,
      errors: validationResult.error.details.map(detail => detail.message)
    };
  }
  
  return {
    valid: true
  };
};

/**
 * Validate node data
 * @param {Object} nodeData - Node data to validate
 * @returns {Object} Validation result
 */
exports.validateNodeData = (nodeData) => {
  // Define schema for node data
  const schema = joi.object({
    id: joi.string().optional(), // server will assign if missing
    type: joi.string().required(),
    label: joi.string().required(),
    name: joi.string().optional(),
    resourceType: joi.string().optional(),
    config: joi.object().optional(),
    x: joi.number().optional(),
    y: joi.number().optional(),
    width: joi.number().optional(),
    height: joi.number().optional()
  }).unknown();
  
  // Validate node data against schema
  const validationResult = schema.validate(nodeData);
  
  if (validationResult.error) {
    return {
      valid: false,
      errors: validationResult.error.details.map(detail => detail.message)
    };
  }
  
  return {
    valid: true
  };
};

/**
 * Validate connection data
 * @param {Object} connectionData - Connection data to validate
 * @returns {Object} Validation result
 */
exports.validateConnectionData = (connectionData) => {
  // Define schema for connection data
  const schema = joi.object({
    sourceId: joi.string().required(),
    targetId: joi.string().required(),
    label: joi.string(),
    type: joi.string().valid('depends_on', 'reference').default('reference')
  });
  
  // Validate connection data against schema
  const validationResult = schema.validate(connectionData);
  
  if (validationResult.error) {
    return {
      valid: false,
      errors: validationResult.error.details.map(detail => detail.message)
    };
  }
  
  return {
    valid: true
  };
};
