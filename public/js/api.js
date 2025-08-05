/**
 * Terraform Diagram Viewer - API Module
 * 
 * Handles communication with the backend API.
 */

// API module
const API = (function() {
  // Base API URL
  const BASE_URL = 'http://localhost:3000/api';
  
  /**
   * Make a GET request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} params - Query parameters
   * @returns {Promise} Promise resolving to response data
   */
  async function get(endpoint, params = {}) {
    try {
      // Build query string
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      
      const url = `${BASE_URL}${endpoint}${queryString ? `?${queryString}` : ''}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`GET ${endpoint} failed:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Make a POST request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise} Promise resolving to response data
   */
  async function post(endpoint, data = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`POST ${endpoint} failed:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Make a PUT request to the API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request data
   * @returns {Promise} Promise resolving to response data
   */
  async function put(endpoint, data = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`PUT ${endpoint} failed:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Make a DELETE request to the API
   * @param {string} endpoint - API endpoint
   * @returns {Promise} Promise resolving to response data
   */
  async function del(endpoint) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      
      const response = await fetch(url, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`DELETE ${endpoint} failed:`, error);
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Parse Terraform code
   * @param {string} code - Terraform code to parse
   * @returns {Promise} Promise resolving to parsed data
   */
  async function parseCode(code) {
    return await post('/terraform/parse', { code });
  }
  
  /**
   * Parse a Terraform file
   * @param {string} filePath - Path to the Terraform file
   * @returns {Promise} Promise resolving to parsed data
   */
  async function parseFile(filePath) {
    return await post('/terraform/parse-file', { filePath });
  }
  
  /**
   * Parse a Terraform directory
   * @param {string} directoryPath - Path to the Terraform directory
   * @returns {Promise} Promise resolving to parsed data
   */
  async function parseDirectory(directoryPath) {
    return await post('/terraform/parse-directory', { directoryPath });
  }
  
  /**
   * Get Terraform resource types
   * @param {Object} parsedData - Parsed Terraform data
   * @returns {Promise} Promise resolving to resource types
   */
  async function getResourceTypes(parsedData) {
    return await post('/terraform/resource-types', { parsedData });
  }
  
  /**
   * Get resources by type
   * @param {Object} parsedData - Parsed Terraform data
   * @param {string} resourceType - Resource type
   * @returns {Promise} Promise resolving to resources
   */
  async function getResourcesByType(parsedData, resourceType) {
    return await post('/terraform/resources-by-type', { parsedData, resourceType });
  }
  
  /**
   * Get a specific resource
   * @param {Object} parsedData - Parsed Terraform data
   * @param {string} resourceType - Resource type
   * @param {string} resourceId - Resource ID
   * @returns {Promise} Promise resolving to resource data
   */
  async function getResource(parsedData, resourceType, resourceId) {
    return await post('/terraform/resource', { parsedData, resourceType, resourceId });
  }
  
  /**
   * Generate a diagram from parsed data
   * @param {Object} parsedData - Parsed Terraform data
   * @returns {Promise} Promise resolving to diagram data
   */
  async function generateDiagram(parsedData) {
    return await post('/diagram/generate', { parsedData });
  }
  
  /**
   * Update the layout of a diagram
   * @param {string} diagramId - Diagram ID
   * @param {Object} layoutOptions - Layout options
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function updateLayout(diagramId, layoutOptions) {
    return await put(`/diagram/${diagramId}/layout`, layoutOptions);
  }
  
  /**
   * Add a node to a diagram
   * @param {string} diagramId - Diagram ID
   * @param {Object} nodeData - Node data
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function addNode(diagramId, nodeData) {
    return await post(`/diagram/${diagramId}/nodes`, nodeData);
  }
  
  /**
   * Update a node in a diagram
   * @param {string} diagramId - Diagram ID
   * @param {string} nodeId - Node ID
   * @param {Object} nodeData - Node data
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function updateNode(diagramId, nodeId, nodeData) {
    return await put(`/diagram/${diagramId}/nodes/${nodeId}`, nodeData);
  }
  
  /**
   * Delete a node from a diagram
   * @param {string} diagramId - Diagram ID
   * @param {string} nodeId - Node ID
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function deleteNode(diagramId, nodeId) {
    return await del(`/diagram/${diagramId}/nodes/${nodeId}`);
  }
  
  /**
   * Add a connection to a diagram
   * @param {string} diagramId - Diagram ID
   * @param {Object} connectionData - Connection data
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function addConnection(diagramId, connectionData) {
    return await post(`/diagram/${diagramId}/connections`, connectionData);
  }
  
  /**
   * Update a connection in a diagram
   * @param {string} diagramId - Diagram ID
   * @param {string} connectionId - Connection ID
   * @param {Object} connectionData - Connection data
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function updateConnection(diagramId, connectionId, connectionData) {
    return await put(`/diagram/${diagramId}/connections/${connectionId}`, connectionData);
  }
  
  /**
   * Delete a connection from a diagram
   * @param {string} diagramId - Diagram ID
   * @param {string} connectionId - Connection ID
   * @returns {Promise} Promise resolving to updated diagram data
   */
  async function deleteConnection(diagramId, connectionId) {
    return await del(`/diagram/${diagramId}/connections/${connectionId}`);
  }
  
  /**
   * Generate Terraform code from a diagram
   * @param {Object} diagramData - Diagram data
   * @returns {Promise} Promise resolving to generated code
   */
  async function generateCode(diagramData) {
    return await post('/code-generator/generate', { diagramData });
  }
  
  /**
   * Generate code for a specific resource
   * @param {Object} diagramData - Diagram data
   * @param {string} resourceId - Resource ID
   * @returns {Promise} Promise resolving to generated code
   */
  async function generateResourceCode(diagramData, resourceId) {
    return await post('/code-generator/generate-resource', { diagramData, resourceId });
  }
  
  /**
   * Save generated code to files
   * @param {Object} generatedCode - Generated code
   * @param {string} outputPath - Output path
   * @returns {Promise} Promise resolving to result data
   */
  async function saveCode(generatedCode, outputPath) {
    return await post('/code-generator/export', { generatedCode, outputPath });
  }
  
  /**
   * Export code with options
   * @param {Object} generatedCode - Generated code
   * @param {string} outputPath - Output path
   * @param {Object} options - Export options
   * @returns {Promise} Promise resolving to result data
   */
  async function exportCode(generatedCode, outputPath, options) {
    return await post('/code-generator/export', { generatedCode, outputPath, options });
  }
  
  /**
   * Preview changes between original and generated code
   * @param {Object} originalCode - Original code
   * @param {Object} generatedCode - Generated code
   * @returns {Promise} Promise resolving to diff data
   */
  async function previewChanges(originalCode, generatedCode) {
    return await post('/code-generator/preview', { originalCode, generatedCode });
  }
  
  // Public API
  return {
    parseCode,
    parseFile,
    parseDirectory,
    getResourceTypes,
    getResourcesByType,
    getResource,
    generateDiagram,
    updateLayout,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    updateConnection,
    deleteConnection,
    generateCode,
    generateResourceCode,
    saveCode,
    exportCode,
    previewChanges
  };
})();
