/**
 * Terraform Parser Service
 * 
 * Service for parsing Terraform (.tf) code into structured data.
 * Uses the hcl-parser library to parse HCL syntax.
 */

// Switched to pure-JS parser that works cross-platform
const hclToJson = require('hcl-to-json');
const path = require('path');

// Alias so existing callers expecting parseCode keep working
exports.parseCode = (...args) => exports.parseString(...args);

/**
 * Parse Terraform code from a string
 * @param {string} code - String containing Terraform code
 * @returns {Object} Structured data representation of the Terraform code
 */
// Parse Terraform code from a string
exports.parseString = async (code) => {
  try {
    // hcl-to-json is synchronous and returns a plain JS object
    const parsedHcl = hclToJson(code);
    return { success: true, data: parsedHcl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Extract all resource types from parsed Terraform data
 * @param {Object} parsedData - Parsed Terraform data
 * @returns {Array} List of unique resource types
 */
exports.extractResourceTypes = (parsedData) => {
  if (!parsedData || !parsedData.resource) {
    return [];
  }
  
  return [...new Set(Object.keys(parsedData.resource))];
};

/**
 * Extract resources of a specific type
 * @param {Object} parsedData - Parsed Terraform data
 * @param {string} type - Resource type to extract
 * @returns {Array} List of resources of the specified type
 */
exports.extractResourcesByType = (parsedData, type) => {
  if (!parsedData || !parsedData.resource || !parsedData.resource[type]) {
    return [];
  }
  
  return Object.entries(parsedData.resource[type]).map(([name, config]) => ({
    id: `${type}.${name}`,
    type,
    name,
    config
  }));
};

/**
 * Find a specific resource by ID
 * @param {Object} parsedData - Parsed Terraform data
 * @param {string} id - Resource ID in the format "type.name"
 * @returns {Object|null} Resource object or null if not found
 */
exports.findResourceById = (parsedData, id) => {
  if (!parsedData || !parsedData.resource) {
    return null;
  }
  
  const [type, name] = id.split('.');
  
  if (!type || !name || !parsedData.resource[type] || !parsedData.resource[type][name]) {
    return null;
  }
  
  return {
    id,
    type,
    name,
    config: parsedData.resource[type][name]
  };
};

/**
 * Find all references to other resources
 * @param {Object} parsedData - Parsed Terraform data
 * @returns {Array} List of references between resources
 */
exports.findReferences = (parsedData) => {
  const references = [];
  
  // Check if parsedData has resources
  if (!parsedData || !parsedData.resource) {
    return references;
  }
  
  // Iterate through each resource type
  for (const resourceType in parsedData.resource) {
    // Iterate through each resource of this type
    for (const resourceName in parsedData.resource[resourceType]) {
      const resource = parsedData.resource[resourceType][resourceName];
      const sourceId = `${resourceType}.${resourceName}`;
      
      // Look for references in the resource configuration
      findReferencesInObject(resource, sourceId, references);
    }
  }
  
  return references;
};

/**
 * Transform the raw HCL parse result into a more structured format
 * @param {Object} parsedHcl - Raw parsed HCL data
 * @returns {Object} Structured Terraform configuration
 */
function transformParsedHcl(parsedHcl) {
  // The older hcl-parser returns a nested combination of arrays/objects
  // without explicit block.type fields. We therefore need to recursively
  // traverse the parsed structure and collect blocks by detecting keys
  // like `resource`, `data`, `variable`, etc.

  const result = {
    terraform: {},
    provider: {},
    resource: {},
    data: {},
    variable: {},
    output: {},
    module: {},
    locals: {}
  };
  
  // Process each block in the parsed HCL
  // Recursive traversal helper
  function walk(node) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (node && typeof node === 'object') {
      // Handle resource blocks – hcl-parser 0.1 may return either array or object
      if (node.resource) {
        const resBlocks = Array.isArray(node.resource) ? node.resource : Object.values(node.resource);
        resBlocks.forEach(resItem => {
          // Each resItem is expected to have structure { TYPE: [ { NAME: BODY } ] }
          Object.entries(resItem).forEach(([resourceType, resources]) => {
            const resourcesArr = Array.isArray(resources) ? resources : Object.values(resources);
            resourcesArr.forEach(resourceObj => {
              Object.entries(resourceObj).forEach(([resourceName, body]) => {
                if (!result.resource[resourceType]) result.resource[resourceType] = {};
                result.resource[resourceType][resourceName] = body;
              });
            });
          });
        });
      }

      // TODO: Extend for data, variable, output, module if needed

      // Recurse into all values
      Object.values(node).forEach(walk);
    }
  }

  walk(parsedHcl);

  // Return after traversal
  return result;
}



/**
 * Process an HCL block and add it to the structured result
 * @param {Object} block - HCL block
 * @param {Object} result - Structured result to add to
 */
function processBlock(block, result) {
  if (!block || !block.type) return;
  
  // Handle different block types
  switch (block.type) {
    case 'terraform':
      result.terraform = block.body || {};
      break;
    
    case 'provider':
      if (block.labels && block.labels.length > 0) {
        const providerName = block.labels[0];
        result.provider[providerName] = block.body || {};
      }
      break;
    
    case 'resource':
      if (block.labels && block.labels.length >= 2) {
        const resourceType = block.labels[0];
        const resourceName = block.labels[1];
        
        if (!result.resource[resourceType]) {
          result.resource[resourceType] = {};
        }
        
        result.resource[resourceType][resourceName] = block.body || {};
      }
      break;
    
    case 'data':
      if (block.labels && block.labels.length >= 2) {
        const dataType = block.labels[0];
        const dataName = block.labels[1];
        
        if (!result.data[dataType]) {
          result.data[dataType] = {};
        }
        
        result.data[dataType][dataName] = block.body || {};
      }
      break;
    
    case 'variable':
      if (block.labels && block.labels.length > 0) {
        const varName = block.labels[0];
        result.variable[varName] = block.body || {};
      }
      break;
    
    case 'output':
      if (block.labels && block.labels.length > 0) {
        const outputName = block.labels[0];
        result.output[outputName] = block.body || {};
      }
      break;
    
    case 'module':
      if (block.labels && block.labels.length > 0) {
        const moduleName = block.labels[0];
        result.module[moduleName] = block.body || {};
      }
      break;
    
    case 'locals':
      // Merge all locals blocks into a single object
      result.locals = { ...(result.locals || {}), ...(block.body || {}) };
      break;
    
    default:
      // Handle any other block types
      if (!result[block.type]) {
        result[block.type] = {};
      }
      
      if (block.labels && block.labels.length > 0) {
        const key = block.labels.join('.');
        result[block.type][key] = block.body || {};
      } else {
        result[block.type] = block.body || {};
      }
  }
}

/**
 * Recursively search for references to other resources
 * @param {Object|Array|string} obj - Object to search in
 * @param {string} sourceId - ID of the source resource
 * @param {Array} references - Array to collect references
 */
function findReferencesInObject(obj, sourceId, references) {
  if (typeof obj === 'string') {
    // Check if string contains a Terraform reference
    const refMatches = obj.match(/\${([^}]+)}/g) || [];
    
    refMatches.forEach(match => {
      // Extract the reference path from ${...}
      const refPath = match.substring(2, match.length - 1);
      
      // Check if it's a resource reference
      if (refPath.startsWith('resource.') || refPath.startsWith('var.') || 
          refPath.startsWith('module.') || refPath.startsWith('data.')) {
        references.push({
          sourceId,
          targetRef: refPath
        });
      }
    });
  } else if (Array.isArray(obj)) {
    // Search in array elements
    obj.forEach(item => findReferencesInObject(item, sourceId, references));
  } else if (obj && typeof obj === 'object') {
    // Search in object properties
    Object.values(obj).forEach(value => findReferencesInObject(value, sourceId, references));
  }
}
