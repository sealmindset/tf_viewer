/**
 * Terraform Diagram Viewer - Diagram Renderer
 * 
 * Handles rendering of diagram nodes and edges
 */

// DiagramRenderer module
const DiagramRenderer = (function() {
  // Node templates for different resource types
  const nodeTemplates = {
    resource: {
      width: 180,
      height: 100,
      headerHeight: 30
    },
    module: {
      width: 200,
      height: 120,
      headerHeight: 30
    },
    variable: {
      width: 160,
      height: 80,
      headerHeight: 30
    },
    output: {
      width: 160,
      height: 80,
      headerHeight: 30
    },
    data: {
      width: 180,
      height: 100,
      headerHeight: 30
    }
  };

  /**
   * Render a node element
   * @param {Object} node - Node data
   * @returns {SVGGElement} SVG group element for the node
   */
  function renderNode(node) {
    // Get node template based on node type
    const template = nodeTemplates[node.type] || nodeTemplates.resource;
    
    // Create node group
    const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    nodeGroup.classList.add('node');
    nodeGroup.classList.add(`resource-${getProviderClass(node)}`);
    nodeGroup.setAttribute('data-id', node.id);
    
    const x = node.x || 0;
    const y = node.y || 0;
    console.log(`[DiagramRenderer] Rendering node ${node.id}: x=${x}, y=${y}`);
    
    nodeGroup.setAttribute('transform', `translate(${x}, ${y})`)
    
    // Create node body
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    body.classList.add('body');
    body.setAttribute('width', template.width);
    body.setAttribute('height', template.height);
    nodeGroup.appendChild(body);
    
    // Create node header
    const header = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    header.classList.add('header');
    header.setAttribute('width', template.width);
    header.setAttribute('height', template.headerHeight);
    nodeGroup.appendChild(header);
    
    // Create node title
    const title = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    title.classList.add('title');
    title.setAttribute('x', 10);
    title.setAttribute('y', 20);
    title.textContent = node.label || `${node.type}.${node.name}`;
    nodeGroup.appendChild(title);
    
    // Create node subtitle if relevant
    if (node.resourceType) {
      const subtitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      subtitle.classList.add('subtitle');
      subtitle.setAttribute('x', 10);
      subtitle.setAttribute('y', template.headerHeight + 20);
      subtitle.textContent = node.resourceType;
      nodeGroup.appendChild(subtitle);
    }
    
    // Create input port (left side)
    const inputPort = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inputPort.classList.add('port');
    inputPort.classList.add('input-port');
    inputPort.setAttribute('cx', 0);
    inputPort.setAttribute('cy', template.height / 2);
    inputPort.setAttribute('r', 5);
    inputPort.setAttribute('data-node-id', node.id);
    inputPort.setAttribute('data-port-id', 'input');
    nodeGroup.appendChild(inputPort);
    
    // Create output port (right side)
    const outputPort = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outputPort.classList.add('port');
    outputPort.classList.add('output-port');
    outputPort.setAttribute('cx', template.width);
    outputPort.setAttribute('cy', template.height / 2);
    outputPort.setAttribute('r', 5);
    outputPort.setAttribute('data-node-id', node.id);
    outputPort.setAttribute('data-port-id', 'output');
    nodeGroup.appendChild(outputPort);
    
    return nodeGroup;
  }
  
  /**
   * Render an edge element
   * @param {Object} edge - Edge data
   * @param {Array} nodes - Array of node data
   * @returns {Object} Object with edge and label elements
   */
  function renderEdge(edge, nodes) {
    // Find source and target nodes
    const sourceNode = nodes.find(node => node.id === edge.sourceId);
    const targetNode = nodes.find(node => node.id === edge.targetId);
    
    if (!sourceNode || !targetNode) {
      console.warn(`Edge ${edge.id}: Could not find source or target node`);
      return null;
    }
    
    // Create path
    const edgePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    edgePath.classList.add('edge');
    edgePath.classList.add(edge.type || 'reference');
    edgePath.setAttribute('data-id', edge.id);
    edgePath.setAttribute('data-source', edge.sourceId);
    edgePath.setAttribute('data-target', edge.targetId);
    
    // Calculate edge path
    const path = calculateEdgePath(sourceNode, targetNode);
    edgePath.setAttribute('d', path);
    
    // Create marker if needed
    if (!document.getElementById(`marker-${edge.type || 'reference'}`)) {
      createMarker(edge.type || 'reference');
    }
    
    edgePath.setAttribute('marker-end', `url(#marker-${edge.type || 'reference'})`);
    
    // Create edge label group
    const labelGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    labelGroup.classList.add('edge-label-group');
    
    // Calculate label position
    const midpoint = calculateEdgeMidpoint(sourceNode, targetNode);
    labelGroup.setAttribute('transform', `translate(${midpoint.x}, ${midpoint.y})`);
    
    // Create label background
    const labelBg = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    labelBg.classList.add('edge-background');
    labelBg.setAttribute('rx', 3);
    labelBg.setAttribute('ry', 3);
    labelBg.setAttribute('x', -20);
    labelBg.setAttribute('y', -10);
    labelBg.setAttribute('width', 40);
    labelBg.setAttribute('height', 20);
    
    // Create label text
    const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    labelText.classList.add('edge-label');
    labelText.setAttribute('text-anchor', 'middle');
    labelText.setAttribute('dominant-baseline', 'middle');
    labelText.textContent = edge.label || edge.type || 'ref';
    
    // Adjust background width based on text length
    const textLength = (edge.label || edge.type || 'ref').length * 6 + 10;
    labelBg.setAttribute('width', textLength);
    labelBg.setAttribute('x', -textLength / 2);
    
    // Add label elements to group
    labelGroup.appendChild(labelBg);
    labelGroup.appendChild(labelText);
    
    return { edge: edgePath, label: labelGroup };
  }
  
  /**
   * Calculate path for an edge between two nodes
   * @param {Object} sourceNode - Source node
   * @param {Object} targetNode - Target node
   * @returns {string} SVG path data
   */
  function calculateEdgePath(sourceNode, targetNode) {
    const template = nodeTemplates[sourceNode.type] || nodeTemplates.resource;
    const sourceX = (sourceNode.x || 0) + template.width;
    const sourceY = (sourceNode.y || 0) + template.height / 2;
    
    const targetTemplate = nodeTemplates[targetNode.type] || nodeTemplates.resource;
    const targetX = targetNode.x || 0;
    const targetY = (targetNode.y || 0) + targetTemplate.height / 2;
    
    // Calculate control points for curve
    const dx = Math.abs(targetX - sourceX);
    const controlPointX = dx / 2;
    
    return `M ${sourceX} ${sourceY} C ${sourceX + controlPointX} ${sourceY}, ${targetX - controlPointX} ${targetY}, ${targetX} ${targetY}`;
  }
  
  /**
   * Calculate midpoint of an edge
   * @param {Object} sourceNode - Source node
   * @param {Object} targetNode - Target node
   * @returns {Object} Midpoint coordinates
   */
  function calculateEdgeMidpoint(sourceNode, targetNode) {
    const template = nodeTemplates[sourceNode.type] || nodeTemplates.resource;
    const sourceX = (sourceNode.x || 0) + template.width;
    const sourceY = (sourceNode.y || 0) + template.height / 2;
    
    const targetTemplate = nodeTemplates[targetNode.type] || nodeTemplates.resource;
    const targetX = targetNode.x || 0;
    const targetY = (targetNode.y || 0) + targetTemplate.height / 2;
    
    return {
      x: (sourceX + targetX) / 2,
      y: (sourceY + targetY) / 2
    };
  }
  
  /**
   * Create marker for edge arrows
   * @param {string} type - Edge type
   */
  function createMarker(type) {
    // Create marker for arrows
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', `marker-${type}`);
    marker.setAttribute('viewBox', '0 0 10 10');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '5');
    marker.setAttribute('markerWidth', '6');
    marker.setAttribute('markerHeight', '6');
    marker.setAttribute('orient', 'auto');
    
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.classList.add('edge-marker');
    path.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
    
    marker.appendChild(path);
    defs.appendChild(marker);
    
    document.getElementById('diagram-svg').appendChild(defs);
  }
  
  /**
   * Get provider class based on node data
   * @param {Object} node - Node data
   * @returns {string} Provider class
   */
  function getProviderClass(node) {
    if (!node.resourceType) {
      return node.type; // variable, output, etc.
    }
    
    if (node.resourceType.startsWith('aws_')) {
      return 'aws';
    } else if (node.resourceType.startsWith('google_')) {
      return 'gcp';
    } else if (node.resourceType.startsWith('azurerm_')) {
      return 'azure';
    } else {
      return 'default';
    }
  }
  
  // Public API
  return {
    renderNode,
    renderEdge,
    calculateEdgePath,
    calculateEdgeMidpoint,
    getProviderClass
  };
})();
