/**
 * Diagram Generator Service
 * 
 * Service for generating diagram data from parsed Terraform resources.
 * Uses graphlib and dagre for graph structure and layout.
 */

const graphlib = require('graphlib');
const dagre = require('dagre');

// Alias expected by callers/tests
exports.generateDiagram = async (parsedData) => {
  try {
    const data = await exports.generateFromTerraform(parsedData);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

/**
 * Generate diagram data from parsed Terraform data
 * @param {Object} parsedData - Parsed Terraform data
 * @returns {Object} Diagram data with nodes and edges
 */
exports.generateFromTerraform = async (parsedData) => {
  try {
    // Create a new graph
    const graph = new graphlib.Graph({ directed: true, compound: true });
    
    // Set default node and edge properties
    graph.setDefaultNodeLabel(() => ({}));
    graph.setDefaultEdgeLabel(() => ({}));
    
    // Process resources and add nodes
    processResources(graph, parsedData);
    
    // Process modules and add nodes
    processModules(graph, parsedData);
    
    // Process data sources and add nodes
    processDataSources(graph, parsedData);
    
    // Process variables and add nodes
    processVariables(graph, parsedData);
    
    // Process outputs and add nodes
    processOutputs(graph, parsedData);
    
    // Find relationships between resources and add edges
    processRelationships(graph, parsedData);
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert graph to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error generating diagram from Terraform data:', error);
    throw new Error(`Failed to generate diagram: ${error.message}`);
  }
};

/**
 * Update the layout of an existing diagram
 * @param {Object} diagramData - Existing diagram data
 * @param {Object} layoutOptions - Layout options
 * @returns {Object} Updated diagram data
 */
exports.updateLayout = async (diagramData, layoutOptions) => {
  try {
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Apply new layout
    const layout = applyLayout(graph, layoutOptions);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error updating diagram layout:', error);
    throw new Error(`Failed to update layout: ${error.message}`);
  }
};

/**
 * Add a new node to the diagram
 * @param {Object} diagramData - Existing diagram data
 * @param {Object} nodeData - New node data
 * @returns {Object} Updated diagram data
 */
exports.addNode = async (diagramData, nodeData) => {
  try {
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Add the new node to the graph
    graph.setNode(nodeData.id, {
      ...nodeData,
      width: nodeData.width || 150,
      height: nodeData.height || 100
    });
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error adding node to diagram:', error);
    throw new Error(`Failed to add node: ${error.message}`);
  }
};

/**
 * Update an existing node in the diagram
 * @param {Object} diagramData - Existing diagram data
 * @param {string} nodeId - ID of the node to update
 * @param {Object} nodeData - Updated node data
 * @returns {Object} Updated diagram data
 */
exports.updateNode = async (diagramData, nodeId, nodeData) => {
  try {
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Check if the node exists
    if (!graph.hasNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    
    // Update the node
    const existingData = graph.node(nodeId);
    graph.setNode(nodeId, { ...existingData, ...nodeData });
    
    // Apply layout if position changed
    let layout = {};
    if (nodeData.x !== undefined || nodeData.y !== undefined) {
      layout = applyLayout(graph);
    }
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error updating node in diagram:', error);
    throw new Error(`Failed to update node: ${error.message}`);
  }
};

/**
 * Delete a node from the diagram
 * @param {Object} diagramData - Existing diagram data
 * @param {string} nodeId - ID of the node to delete
 * @returns {Object} Updated diagram data
 */
exports.deleteNode = async (diagramData, nodeId) => {
  try {
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Check if the node exists
    if (!graph.hasNode(nodeId)) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }
    
    // Remove all edges connected to the node
    graph.nodeEdges(nodeId).forEach(edge => {
      graph.removeEdge(edge.v, edge.w);
    });
    
    // Remove the node
    graph.removeNode(nodeId);
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error deleting node from diagram:', error);
    throw new Error(`Failed to delete node: ${error.message}`);
  }
};

/**
 * Add a connection between nodes
 * @param {Object} diagramData - Existing diagram data
 * @param {Object} connectionData - Connection data
 * @returns {Object} Updated diagram data
 */
exports.addConnection = async (diagramData, connectionData) => {
  try {
    const { sourceId, targetId, label } = connectionData;
    
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Check if both nodes exist
    if (!graph.hasNode(sourceId)) {
      throw new Error(`Source node with ID ${sourceId} not found`);
    }
    
    if (!graph.hasNode(targetId)) {
      throw new Error(`Target node with ID ${targetId} not found`);
    }
    
    // Add the edge
    const edgeId = `${sourceId}:${targetId}`;
    graph.setEdge(sourceId, targetId, { id: edgeId, label });
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error adding connection to diagram:', error);
    throw new Error(`Failed to add connection: ${error.message}`);
  }
};

/**
 * Update an existing connection
 * @param {Object} diagramData - Existing diagram data
 * @param {string} connectionId - ID of the connection to update
 * @param {Object} connectionData - Updated connection data
 * @returns {Object} Updated diagram data
 */
exports.updateConnection = async (diagramData, connectionId, connectionData) => {
  try {
    // Parse connection ID to get source and target
    const [sourceId, targetId] = connectionId.split(':');
    
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Check if the edge exists
    if (!graph.hasEdge(sourceId, targetId)) {
      throw new Error(`Connection from ${sourceId} to ${targetId} not found`);
    }
    
    // Get existing edge data
    const existingData = graph.edge(sourceId, targetId);
    
    // Update the edge
    graph.setEdge(sourceId, targetId, { ...existingData, ...connectionData });
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error updating connection in diagram:', error);
    throw new Error(`Failed to update connection: ${error.message}`);
  }
};

/**
 * Delete a connection from the diagram
 * @param {Object} diagramData - Existing diagram data
 * @param {string} connectionId - ID of the connection to delete
 * @returns {Object} Updated diagram data
 */
exports.deleteConnection = async (diagramData, connectionId) => {
  try {
    // Parse connection ID to get source and target
    const [sourceId, targetId] = connectionId.split(':');
    
    // Convert diagram data to a graph
    const graph = convertDiagramDataToGraph(diagramData);
    
    // Check if the edge exists
    if (!graph.hasEdge(sourceId, targetId)) {
      throw new Error(`Connection from ${sourceId} to ${targetId} not found`);
    }
    
    // Remove the edge
    graph.removeEdge(sourceId, targetId);
    
    // Apply layout
    const layout = applyLayout(graph);
    
    // Convert back to diagram data format
    return convertGraphToDiagramData(graph, layout);
  } catch (error) {
    console.error('Error deleting connection from diagram:', error);
    throw new Error(`Failed to delete connection: ${error.message}`);
  }
};

/**
 * Process resources from Terraform data and add nodes to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processResources(graph, parsedData) {
  console.log('processResources parsedData.resource keys:', parsedData && parsedData.resource ? Object.keys(parsedData.resource) : 'none');
  if (!parsedData.resource) return;
  
  // Process each resource type
  for (const resourceType in parsedData.resource) {
    for (const resourceName in parsedData.resource[resourceType]) {
      const resource = parsedData.resource[resourceType][resourceName];
      const resourceId = `resource.${resourceType}.${resourceName}`;
      
      // Add a node for the resource
      graph.setNode(resourceId, {
        id: resourceId,
        type: 'resource',
        resourceType,
        label: `${resourceType}.${resourceName}`,
        name: resourceName,
        config: resource,
        width: 180,
        height: 80
      });
    }
  }
}

/**
 * Process modules from Terraform data and add nodes to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processModules(graph, parsedData) {
  if (!parsedData.module) return;
  
  // Process each module
  for (const moduleName in parsedData.module) {
    const module = parsedData.module[moduleName];
    const moduleId = `module.${moduleName}`;
    
    // Add a node for the module
    graph.setNode(moduleId, {
      id: moduleId,
      type: 'module',
      label: `module.${moduleName}`,
      name: moduleName,
      config: module,
      width: 200,
      height: 100
    });
  }
}

/**
 * Process data sources from Terraform data and add nodes to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processDataSources(graph, parsedData) {
  if (!parsedData.data) return;
  
  // Process each data source type
  for (const dataType in parsedData.data) {
    for (const dataName in parsedData.data[dataType]) {
      const dataSource = parsedData.data[dataType][dataName];
      const dataId = `data.${dataType}.${dataName}`;
      
      // Add a node for the data source
      graph.setNode(dataId, {
        id: dataId,
        type: 'data',
        resourceType: dataType,
        label: `data.${dataType}.${dataName}`,
        name: dataName,
        config: dataSource,
        width: 180,
        height: 70
      });
    }
  }
}

/**
 * Process variables from Terraform data and add nodes to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processVariables(graph, parsedData) {
  if (!parsedData.variable) return;
  
  // Process each variable
  for (const varName in parsedData.variable) {
    const variable = parsedData.variable[varName];
    const varId = `var.${varName}`;
    
    // Add a node for the variable
    graph.setNode(varId, {
      id: varId,
      type: 'variable',
      label: `var.${varName}`,
      name: varName,
      config: variable,
      width: 150,
      height: 60
    });
  }
}

/**
 * Process outputs from Terraform data and add nodes to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processOutputs(graph, parsedData) {
  if (!parsedData.output) return;
  
  // Process each output
  for (const outputName in parsedData.output) {
    const output = parsedData.output[outputName];
    const outputId = `output.${outputName}`;
    
    // Add a node for the output
    graph.setNode(outputId, {
      id: outputId,
      type: 'output',
      label: `output.${outputName}`,
      name: outputName,
      config: output,
      width: 150,
      height: 60
    });
  }
}

/**
 * Process relationships between resources and add edges to the graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} parsedData - Parsed Terraform data
 */
function processRelationships(graph, parsedData) {
  // Process resource dependencies
  if (parsedData.resource) {
    for (const resourceType in parsedData.resource) {
      for (const resourceName in parsedData.resource[resourceType]) {
        const resource = parsedData.resource[resourceType][resourceName];
        const resourceId = `resource.${resourceType}.${resourceName}`;
        
        // Check for explicit depends_on
        if (resource.depends_on && Array.isArray(resource.depends_on)) {
          resource.depends_on.forEach(dependency => {
            if (graph.hasNode(dependency)) {
              graph.setEdge(dependency, resourceId, {
                id: `${dependency}:${resourceId}`,
                type: 'depends_on',
                label: 'depends_on'
              });
            }
          });
        }
        
        // Look for implicit references in attributes
        findReferencesInObject(resource, resourceId, graph);
      }
    }
  }
  
  // Process module dependencies
  if (parsedData.module) {
    for (const moduleName in parsedData.module) {
      const module = parsedData.module[moduleName];
      const moduleId = `module.${moduleName}`;
      
      // Check for explicit depends_on
      if (module.depends_on && Array.isArray(module.depends_on)) {
        module.depends_on.forEach(dependency => {
          if (graph.hasNode(dependency)) {
            graph.setEdge(dependency, moduleId, {
              id: `${dependency}:${moduleId}`,
              type: 'depends_on',
              label: 'depends_on'
            });
          }
        });
      }
      
      // Look for references in module arguments
      findReferencesInObject(module, moduleId, graph);
    }
  }
}

/**
 * Apply layout to a graph
 * @param {Object} graph - graphlib Graph object
 * @param {Object} options - Layout options
 * @returns {Object} Layout information
 */
function applyLayout(graph, options = {}) {
  console.log('[diagramGenerator] Applying layout to graph with', graph.nodeCount(), 'nodes and', graph.edgeCount(), 'edges');
  
  // Attach layout options to the graph itself; dagre will mutate the
  // graph nodes with x/y coordinates.
  graph.setGraph({
    rankdir: options.rankdir || 'LR',
    nodesep: options.nodesep || 70,
    ranksep: options.ranksep || 100,
    marginx: options.marginx || 20,
    marginy: options.marginy || 20
  });

  // Required for dagre <1.0 – sets default edge label function.
  graph.setDefaultEdgeLabel(() => ({}));

  console.log('[diagramGenerator] Running dagre layout...');
  
  // Run the layout algorithm – this mutates node positions in `graph`.
  dagre.layout(graph);
  
  console.log('[diagramGenerator] Layout complete. Graph dimensions:', graph.graph());

  // Return the graph dimensions (dagre stores them in graph.graph()).
  return graph.graph();
}

/**
 * Convert graph to diagram data format
 * @param {Object} graph - graphlib Graph object
 * @param {Object} layout - Layout information
 * @returns {Object} Diagram data
 */
function convertGraphToDiagramData(graph, layout) {
  const nodes = [];
  const edges = [];
  
  console.log('[diagramGenerator] Converting graph to diagram data...');
  
  // Convert nodes
  graph.nodes().forEach(nodeId => {
    const node = graph.node(nodeId);
    const x = Math.round(node.x || 0);
    const y = Math.round(node.y || 0);
    
    console.log(`[diagramGenerator] Node ${nodeId}: x=${x}, y=${y}`);
    
    nodes.push({
      ...node,
      id: nodeId,
      x: x,
      y: y
    });
  });
  
  // Convert edges
  graph.edges().forEach(edge => {
    const edgeData = graph.edge(edge);
    edges.push({
      ...edgeData,
      id: edgeData.id || `${edge.v}:${edge.w}`,
      sourceId: edge.v,
      targetId: edge.w,
      points: edgeData.points ? edgeData.points.map(p => ({ x: Math.round(p.x), y: Math.round(p.y) })) : []
    });
  });
  
  return {
    nodes,
    edges,
    width: graph.graph().width || 800,
    height: graph.graph().height || 600
  };
}

/**
 * Convert diagram data to a graphlib Graph
 * @param {Object} diagramData - Diagram data
 * @returns {Object} graphlib Graph object
 */
function convertDiagramDataToGraph(diagramData) {
  const graph = new graphlib.Graph({ directed: true, compound: true });
  
  // Set default node and edge properties
  graph.setDefaultNodeLabel(() => ({}));
  graph.setDefaultEdgeLabel(() => ({}));
  
  // Add nodes
  diagramData.nodes.forEach(node => {
    graph.setNode(node.id, { ...node });
  });
  
  // Add edges
  diagramData.edges.forEach(edge => {
    graph.setEdge(edge.sourceId, edge.targetId, { ...edge });
  });
  
  // Set graph dimensions
  graph.setGraph({
    width: diagramData.width || 800,
    height: diagramData.height || 600
  });
  
  return graph;
}

/**
 * Find references to other resources in an object and add edges to the graph
 * @param {Object} obj - Object to search for references
 * @param {string} sourceId - ID of the source resource
 * @param {Object} graph - graphlib Graph object
 */
function findReferencesInObject(obj, sourceId, graph) {
  // Skip if obj is null or not an object
  if (!obj || typeof obj !== 'object') return;
  
  // Process arrays
  if (Array.isArray(obj)) {
    obj.forEach(item => findReferencesInObject(item, sourceId, graph));
    return;
  }
  
  // Process object properties
  for (const key in obj) {
    const value = obj[key];
    
    if (typeof value === 'string') {
      // Look for interpolation syntax ${...}
      const refMatches = value.match(/\${([^}]+)}/g) || [];
      
      refMatches.forEach(match => {
        const refPath = match.substring(2, match.length - 1);
        
        // Handle different types of references
        if (refPath.startsWith('resource.') || refPath.startsWith('data.') || 
            refPath.startsWith('var.') || refPath.startsWith('module.')) {
          
          // Check if the referenced node exists
          if (graph.hasNode(refPath)) {
            graph.setEdge(refPath, sourceId, {
              id: `${refPath}:${sourceId}`,
              type: 'reference',
              label: key
            });
          }
        }
      });
    } else if (value && typeof value === 'object') {
      findReferencesInObject(value, sourceId, graph);
    }
  }
}
