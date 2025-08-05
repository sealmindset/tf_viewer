/**
 * Code Generator Service
 * 
 * Service for generating Terraform (.tf) code from diagram data.
 */

const fs = require('fs').promises;
const path = require('path');

// Alias expected by callers/tests
exports.generateCode = async (diagramData) => {
  try {
    const data = await exports.generateFromDiagram(diagramData);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Generate Terraform code from diagram data
 * @param {Object} diagramData - Diagram data with nodes and edges
 * @returns {Object} Generated Terraform code files
 */
exports.generateFromDiagram = async (diagramData) => {
  try {
    // Initialize result structure
    const result = {
      'main.tf': '',
      'variables.tf': '',
      'outputs.tf': ''
    };
    
    // Extract nodes by type
    const resourceNodes = diagramData.nodes.filter(node => node.type === 'resource');
    const moduleNodes = diagramData.nodes.filter(node => node.type === 'module');
    const variableNodes = diagramData.nodes.filter(node => node.type === 'variable');
    const outputNodes = diagramData.nodes.filter(node => node.type === 'output');
    const dataNodes = diagramData.nodes.filter(node => node.type === 'data');
    
    // Generate code for terraform and provider blocks (assumed static for now)
    result['main.tf'] += generateTerraformBlock();
    result['main.tf'] += '\n\n';
    
    // Generate code for resources
    if (resourceNodes.length > 0) {
      resourceNodes.forEach(node => {
        result['main.tf'] += generateResourceCode(node);
        result['main.tf'] += '\n\n';
      });
    }
    
    // Generate code for data sources
    if (dataNodes.length > 0) {
      dataNodes.forEach(node => {
        result['main.tf'] += generateDataSourceCode(node);
        result['main.tf'] += '\n\n';
      });
    }
    
    // Generate code for modules
    if (moduleNodes.length > 0) {
      moduleNodes.forEach(node => {
        result['main.tf'] += generateModuleCode(node);
        result['main.tf'] += '\n\n';
      });
    }
    
    // Generate code for variables
    if (variableNodes.length > 0) {
      variableNodes.forEach(node => {
        result['variables.tf'] += generateVariableCode(node);
        result['variables.tf'] += '\n\n';
      });
    }
    
    // Generate code for outputs
    if (outputNodes.length > 0) {
      outputNodes.forEach(node => {
        result['outputs.tf'] += generateOutputCode(node);
        result['outputs.tf'] += '\n\n';
      });
    }
    
    // Remove empty files
    for (const filename in result) {
      if (!result[filename].trim()) {
        delete result[filename];
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error generating code from diagram:', error);
    throw new Error(`Failed to generate code: ${error.message}`);
  }
};

/**
 * Generate code for a specific resource
 * @param {Object} diagramData - Diagram data with nodes and edges
 * @param {string} resourceId - ID of the resource to generate code for
 * @returns {string} Generated Terraform code for the resource
 */
exports.generateResourceCode = async (diagramData, resourceId) => {
  try {
    // Find the resource node
    const resourceNode = diagramData.nodes.find(node => node.id === resourceId);
    
    if (!resourceNode) {
      throw new Error(`Resource with ID ${resourceId} not found`);
    }
    
    // Generate code for the resource
    return generateResourceCode(resourceNode);
  } catch (error) {
    console.error('Error generating resource code:', error);
    throw new Error(`Failed to generate resource code: ${error.message}`);
  }
};

/**
 * Generate code for a specific module
 * @param {Object} diagramData - Diagram data with nodes and edges
 * @param {string} moduleId - ID of the module to generate code for
 * @returns {string} Generated Terraform code for the module
 */
exports.generateModuleCode = async (diagramData, moduleId) => {
  try {
    // Find the module node
    const moduleNode = diagramData.nodes.find(node => node.id === moduleId);
    
    if (!moduleNode) {
      throw new Error(`Module with ID ${moduleId} not found`);
    }
    
    // Generate code for the module
    return generateModuleCode(moduleNode);
  } catch (error) {
    console.error('Error generating module code:', error);
    throw new Error(`Failed to generate module code: ${error.message}`);
  }
};

/**
 * Export generated code to files
 * @param {Object} generatedCode - Generated Terraform code files
 * @param {string} outputDir - Output directory
 * @returns {Array} List of exported files
 */
exports.exportToFiles = async (generatedCode, outputDir) => {
  try {
    // Create output directory if it doesn't exist
    await fs.mkdir(outputDir, { recursive: true });
    
    const exportedFiles = [];
    
    // Write each file
    for (const [filename, content] of Object.entries(generatedCode)) {
      const filePath = path.join(outputDir, filename);
      await fs.writeFile(filePath, content);
      exportedFiles.push({ filename, path: filePath });
    }
    
    return exportedFiles;
  } catch (error) {
    console.error('Error exporting code to files:', error);
    throw new Error(`Failed to export code: ${error.message}`);
  }
};

/**
 * Generate a diff between original and generated code
 * @param {Object} originalCode - Original Terraform code files
 * @param {Object} generatedCode - Generated Terraform code files
 * @returns {Object} Diff between original and generated code
 */
exports.generateDiff = async (originalCode, generatedCode) => {
  try {
    const diff = {};
    
    // Get all unique filenames
    const allFilenames = [...new Set([
      ...Object.keys(originalCode),
      ...Object.keys(generatedCode)
    ])];
    
    // Generate diff for each file
    for (const filename of allFilenames) {
      const original = originalCode[filename] || '';
      const generated = generatedCode[filename] || '';
      
      if (original !== generated) {
        diff[filename] = {
          original,
          generated,
          added: !originalCode[filename],
          removed: !generatedCode[filename]
        };
      }
    }
    
    return diff;
  } catch (error) {
    console.error('Error generating diff:', error);
    throw new Error(`Failed to generate diff: ${error.message}`);
  }
};

/**
 * Generate Terraform block code
 * @returns {string} Generated Terraform block code
 */
function generateTerraformBlock() {
  return `terraform {
  required_version = ">= 1.0.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0.0"
    }
  }
}`;
}

/**
 * Generate resource code from node data
 * @param {Object} node - Resource node data
 * @returns {string} Generated resource code
 */
function generateResourceCode(node) {
  if (!node.resourceType || !node.name) {
    throw new Error('Invalid resource node: missing resourceType or name');
  }
  
  const { resourceType, name, config } = node;
  const attributes = config || {};
  
  let code = `resource "${resourceType}" "${name}" {`;
  
  // Add attributes
  for (const [key, value] of Object.entries(attributes)) {
    // Skip internal attributes and depends_on (handled separately)
    if (key.startsWith('_') || key === 'depends_on') continue;
    
    // Add the attribute
    code += '\n  ' + formatAttribute(key, value, 1);
  }
  
  // Add depends_on if present
  if (attributes.depends_on && Array.isArray(attributes.depends_on) && attributes.depends_on.length > 0) {
    code += '\n  depends_on = [\n';
    attributes.depends_on.forEach(dep => {
      code += `    ${dep},\n`;
    });
    code += '  ]';
  }
  
  code += '\n}';
  return code;
}

/**
 * Generate data source code from node data
 * @param {Object} node - Data source node data
 * @returns {string} Generated data source code
 */
function generateDataSourceCode(node) {
  if (!node.resourceType || !node.name) {
    throw new Error('Invalid data source node: missing resourceType or name');
  }
  
  const { resourceType, name, config } = node;
  const attributes = config || {};
  
  let code = `data "${resourceType}" "${name}" {`;
  
  // Add attributes
  for (const [key, value] of Object.entries(attributes)) {
    // Skip internal attributes
    if (key.startsWith('_')) continue;
    
    // Add the attribute
    code += '\n  ' + formatAttribute(key, value, 1);
  }
  
  code += '\n}';
  return code;
}

/**
 * Generate module code from node data
 * @param {Object} node - Module node data
 * @returns {string} Generated module code
 */
function generateModuleCode(node) {
  if (!node.name) {
    throw new Error('Invalid module node: missing name');
  }
  
  const { name, config } = node;
  const attributes = config || {};
  
  let code = `module "${name}" {`;
  
  // Add source attribute (required for modules)
  if (attributes.source) {
    code += `\n  source = "${attributes.source}"`;
  } else {
    code += '\n  source = "./modules/' + name + '"';
  }
  
  // Add other attributes
  for (const [key, value] of Object.entries(attributes)) {
    // Skip internal attributes, depends_on (handled separately), and source (already added)
    if (key.startsWith('_') || key === 'depends_on' || key === 'source') continue;
    
    // Add the attribute
    code += '\n  ' + formatAttribute(key, value, 1);
  }
  
  // Add depends_on if present
  if (attributes.depends_on && Array.isArray(attributes.depends_on) && attributes.depends_on.length > 0) {
    code += '\n  depends_on = [\n';
    attributes.depends_on.forEach(dep => {
      code += `    ${dep},\n`;
    });
    code += '  ]';
  }
  
  code += '\n}';
  return code;
}

/**
 * Generate variable code from node data
 * @param {Object} node - Variable node data
 * @returns {string} Generated variable code
 */
function generateVariableCode(node) {
  if (!node.name) {
    throw new Error('Invalid variable node: missing name');
  }
  
  const { name, config } = node;
  const attributes = config || {};
  
  let code = `variable "${name}" {`;
  
  // Add description if present
  if (attributes.description) {
    code += `\n  description = "${attributes.description}"`;
  }
  
  // Add type if present
  if (attributes.type) {
    code += `\n  type = ${attributes.type}`;
  }
  
  // Add default if present
  if (attributes.default !== undefined) {
    code += '\n  default = ' + formatValue(attributes.default);
  }
  
  // Add validation block if present
  if (attributes.validation && Array.isArray(attributes.validation)) {
    attributes.validation.forEach(validation => {
      code += '\n  validation {';
      for (const [key, value] of Object.entries(validation)) {
        code += '\n    ' + formatAttribute(key, value, 2);
      }
      code += '\n  }';
    });
  }
  
  code += '\n}';
  return code;
}

/**
 * Generate output code from node data
 * @param {Object} node - Output node data
 * @returns {string} Generated output code
 */
function generateOutputCode(node) {
  if (!node.name) {
    throw new Error('Invalid output node: missing name');
  }
  
  const { name, config } = node;
  const attributes = config || {};
  
  let code = `output "${name}" {`;
  
  // Add value (required for outputs)
  if (attributes.value !== undefined) {
    code += '\n  value = ' + formatValue(attributes.value);
  } else {
    code += '\n  value = null';
  }
  
  // Add description if present
  if (attributes.description) {
    code += `\n  description = "${attributes.description}"`;
  }
  
  // Add sensitive if present
  if (attributes.sensitive !== undefined) {
    code += `\n  sensitive = ${attributes.sensitive}`;
  }
  
  // Add depends_on if present
  if (attributes.depends_on && Array.isArray(attributes.depends_on) && attributes.depends_on.length > 0) {
    code += '\n  depends_on = [\n';
    attributes.depends_on.forEach(dep => {
      code += `    ${dep},\n`;
    });
    code += '  ]';
  }
  
  code += '\n}';
  return code;
}

/**
 * Format an attribute for Terraform code
 * @param {string} key - Attribute key
 * @param {any} value - Attribute value
 * @param {number} indentLevel - Indentation level
 * @returns {string} Formatted attribute code
 */
function formatAttribute(key, value, indentLevel = 1) {
  const indent = '  '.repeat(indentLevel);
  
  // Handle blocks (nested objects)
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    // Check if it's a dynamic block
    if (key === 'dynamic' && value.for_each) {
      let blockCode = `dynamic "${value.type || 'block'}" {\n${indent}  for_each = ${formatValue(value.for_each)}`;
      
      if (value.labels && Array.isArray(value.labels)) {
        blockCode += `\n${indent}  labels = [${value.labels.map(l => `"${l}"`).join(', ')}]`;
      }
      
      if (value.content) {
        blockCode += `\n${indent}  content {\n`;
        for (const [contentKey, contentValue] of Object.entries(value.content)) {
          blockCode += `${indent}    ${formatAttribute(contentKey, contentValue, indentLevel + 2)}\n`;
        }
        blockCode += `${indent}  }`;
      }
      
      return blockCode + `\n${indent}}`;
    }
    
    // Regular block
    let blockCode = `${key} {\n`;
    for (const [blockKey, blockValue] of Object.entries(value)) {
      blockCode += `${indent}  ${formatAttribute(blockKey, blockValue, indentLevel + 1)}\n`;
    }
    return blockCode + `${indent}}`;
  }
  
  // Regular attribute
  return `${key} = ${formatValue(value)}`;
}

/**
 * Format a value for Terraform code
 * @param {any} value - Value to format
 * @returns {string} Formatted value code
 */
function formatValue(value) {
  if (value === null) {
    return 'null';
  }
  
  if (typeof value === 'string') {
    // Check if it's a reference (${...})
    if (value.match(/^\${.+}$/)) {
      return value.substring(2, value.length - 1);
    }
    
    // Regular string
    return `"${value}"`;
  }
  
  if (typeof value === 'boolean') {
    return value.toString();
  }
  
  if (typeof value === 'number') {
    return value.toString();
  }
  
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    
    return `[\n    ${value.map(formatValue).join(',\n    ')}\n  ]`;
  }
  
  if (typeof value === 'object') {
    return `{\n    ${Object.entries(value).map(([k, v]) => `${k} = ${formatValue(v)}`).join('\n    ')}\n  }`;
  }
  
  return `"${value.toString()}"`;
}
