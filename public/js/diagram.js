/**
 * Terraform Diagram Viewer - Diagram Module
 * 
 * Handles diagram rendering, interaction, and manipulation.
 */

// Diagram module
const Diagram = (function() {
  // Private variables
  let svg = null;
  let nodesGroup = null;
  let edgesGroup = null;
  let diagramData = null;
  let activeTool = 'select';
  let isDragging = false;
  let draggedNode = null;
  let dragOffset = { x: 0, y: 0 };
  let selectedElements = [];
  let tempEdge = null;
  let sourcePort = null;
  let zoom = {
    level: 1,
    min: 0.05,  // Allow much closer zoom
    max: 10,    // Allow much further zoom out
    step: 0.15  // Slightly larger steps for smoother zooming
  };
  let viewBox = { x: 0, y: 0, width: 1000, height: 800 };

  /**
   * Update the SVG viewBox based on current viewBox values
   */
  function updateViewBox() {
    if (!svg) return;
    svg.setAttribute('viewBox', `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`);
  }
  
  /**
   * Initialize the diagram
   * @param {SVGElement} svgElement - The SVG element to render the diagram in
   */
  function init(svgElement) {
    svg = svgElement;
    nodesGroup = document.getElementById('diagram-nodes');
    edgesGroup = document.getElementById('diagram-edges');
    
    // Initialize event listeners
    initEventListeners();
    
    // Set initial view box
    updateViewBox();
    
    console.log('Diagram module initialized');
  }
  
  /**
   * Initialize diagram event listeners
   */
  function initEventListeners() {
    // SVG events
    svg.addEventListener('mousedown', handleMouseDown);
    svg.addEventListener('mousemove', handleMouseMove);
    svg.addEventListener('mouseup', handleMouseUp);
    svg.addEventListener('mouseleave', handleMouseUp);
    svg.addEventListener('wheel', handleWheel);
    
    // Add keyboard event listener for deleting edges
    document.addEventListener('keydown', handleKeyDown);
    
    // Prevent default context menu
    svg.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });
  }
  
  /**
   * Handle mouse down event
   * @param {MouseEvent} event - Mouse event
   */
  function handleMouseDown(event) {
    if (event.button === 0) { // Left click
      switch (activeTool) {
        case 'pan':
          startPan(event);
          break;
        case 'select':
          startSelect(event);
          break;
        case 'connect':
          startConnect(event);
          break;
      }
    } else if (event.button === 2) { // Right click
      showContextMenu(event);
    }
  }
  
  /**
   * Handle mouse move event
   * @param {MouseEvent} event - Mouse event
   */
  function handleMouseMove(event) {
    // Start dragging if we have a draggedNode but haven't started dragging yet
    if (draggedNode && !isDragging) {
      isDragging = true;
      draggedNode.classList.add('dragging');
    }
    
    if (isDragging) {
      switch (activeTool) {
        case 'pan':
          continuePan(event);
          break;
        case 'select':
          if (draggedNode) {
            dragNode(event);
          }
          break;
        case 'connect':
          // Allow node dragging in connect mode too
          if (draggedNode && !sourcePort) {
            dragNode(event);
          } else if (sourcePort) {
            updateTempEdge(event);
          }
          break;
      }
    }
  }
  
  /**
   * Handle mouse up event
   * @param {MouseEvent} event - Mouse event
   */
  function handleMouseUp(event) {
    if (isDragging) {
      switch (activeTool) {
        case 'pan':
          endPan();
          break;
        case 'select':
          if (draggedNode) {
            endDragNode();
          }
          break;
        case 'connect':
          if (draggedNode && !sourcePort) {
            // End node dragging in connect mode
            endDragNode();
          } else {
            endConnect(event);
          }
          break;
      }
    } else if (draggedNode) {
      // Node was selected but not dragged - just clean up
      draggedNode.classList.remove('dragging');
    }
    
    isDragging = false;
    draggedNode = null;
  }
  
  /**
   * Handle mouse wheel event for zooming
   * @param {WheelEvent} event - Wheel event
   */
  function handleWheel(event) {
    event.preventDefault();
    
    // Calculate zoom center (mouse position)
    const { clientX, clientY } = event;
    const svgRect = svg.getBoundingClientRect();
    const centerX = (clientX - svgRect.left) / zoom.level + viewBox.x;
    const centerY = (clientY - svgRect.top) / zoom.level + viewBox.y;
    
    // Update zoom level
    const delta = event.deltaY > 0 ? -zoom.step : zoom.step;
    zoom.level = Math.max(zoom.min, Math.min(zoom.max, zoom.level + delta));
    
    // Update view box to maintain zoom center
    viewBox.width = svgRect.width / zoom.level;
    viewBox.height = svgRect.height / zoom.level;
    viewBox.x = centerX - (svgRect.width / 2) / zoom.level;
    viewBox.y = centerY - (svgRect.height / 2) / zoom.level;
    
    updateViewBox();
  }
  
  /**
   * Start panning the diagram
   * @param {MouseEvent} event - Mouse event
   */
  function startPan(event) {
    isDragging = true;
    svg.style.cursor = 'grabbing';
    
    dragOffset.x = event.clientX;
    dragOffset.y = event.clientY;
  }
  
  /**
   * Continue panning the diagram
   * @param {MouseEvent} event - Mouse event
   */
  function continuePan(event) {
    const dx = (dragOffset.x - event.clientX) / zoom.level;
    const dy = (dragOffset.y - event.clientY) / zoom.level;
    
    viewBox.x += dx;
    viewBox.y += dy;
    
    dragOffset.x = event.clientX;
    dragOffset.y = event.clientY;
    
    updateViewBox();
  }
  
  /**
   * End panning the diagram
   */
  function endPan() {
    svg.style.cursor = 'grab';
  }
  
  /**
   * Start selecting or dragging a node
   * @param {MouseEvent} event - Mouse event
   */
  function startSelect(event) {
    console.log('[Diagram] Click event target:', event.target);
    console.log('[Diagram] Click event target classList:', event.target.classList);
    
    // Check if click is on an edge first
    const edgeTarget = event.target.closest('.edge, .edge-label-group, .edge-background');
    if (edgeTarget) {
      if (event.button === 2) { // Right click
        showEdgeContextMenu(event, edgeTarget);
      } else {
        selectEdge(edgeTarget);
      }
      return;
    }
    
    // Check if click is on a node
    const target = event.target.closest('.node');
    console.log('[Diagram] Closest .node element:', target);
    
    if (target) {
      const nodeId = target.getAttribute('data-id');
      console.log('[Diagram] Selecting node:', nodeId);
      
      // Clear edge selection
      clearEdgeSelection();
      
      // Select node
      selectNode(nodeId);
      
      // Prepare for potential dragging (but don't start dragging yet)
      draggedNode = target;
      
      const nodeRect = draggedNode.getBoundingClientRect();
      dragOffset.x = event.clientX - nodeRect.left;
      dragOffset.y = event.clientY - nodeRect.top;
      
      // Don't add dragging class or set isDragging until mouse actually moves
    } else {
      // Deselect all
      clearSelection();
    }
  }
  
  /**
   * Drag a node
   * @param {MouseEvent} event - Mouse event
   */
  function dragNode(event) {
    if (!draggedNode) return;
    
    const svgRect = svg.getBoundingClientRect();
    const x = (event.clientX - svgRect.left - dragOffset.x) / zoom.level + viewBox.x;
    const y = (event.clientY - svgRect.top - dragOffset.y) / zoom.level + viewBox.y;
    
    // Update node position in the DOM
    draggedNode.setAttribute('transform', `translate(${x}, ${y})`);
    
    // Update node position in the data
    const nodeId = draggedNode.getAttribute('data-id');
    const nodeIndex = diagramData.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex !== -1) {
      diagramData.nodes[nodeIndex].x = x;
      diagramData.nodes[nodeIndex].y = y;
      
      // Update connected edges
      updateConnectedEdges(nodeId);
    }
  }
  
  /**
   * End dragging a node
   */
  function endDragNode() {
    if (!draggedNode) return;
    
    // Remove dragging class
    draggedNode.classList.remove('dragging');
    
    // Update diagram data on the server
    const nodeId = draggedNode.getAttribute('data-id');
    const node = diagramData.nodes.find(node => node.id === nodeId);
    
    if (node) {
      API.updateNode(diagramData.id, nodeId, {
        x: node.x,
        y: node.y
      }).catch(error => {
        console.error('Failed to update node position:', error);
      });
    }
  }
  
  /**
   * Start connecting nodes
   * @param {MouseEvent} event - Mouse event
   */
  function startConnect(event) {
    // Check if click is on a port
    const port = event.target.closest('.port');
    
    if (port) {
      sourcePort = {
        nodeId: port.getAttribute('data-node-id'),
        portId: port.getAttribute('data-port-id'),
        x: parseFloat(port.getAttribute('cx')),
        y: parseFloat(port.getAttribute('cy'))
      };
      
      // Create temporary edge
      tempEdge = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      tempEdge.setAttribute('class', 'temp-edge');
      tempEdge.setAttribute('d', `M ${sourcePort.x} ${sourcePort.y} L ${sourcePort.x} ${sourcePort.y}`);
      edgesGroup.appendChild(tempEdge);
      
      isDragging = true;
    }
  }
  
  /**
   * Update temporary edge during connection
   * @param {MouseEvent} event - Mouse event
   */
  function updateTempEdge(event) {
    if (!tempEdge || !sourcePort) return;
    
    const svgRect = svg.getBoundingClientRect();
    const x = (event.clientX - svgRect.left) / zoom.level + viewBox.x;
    const y = (event.clientY - svgRect.top) / zoom.level + viewBox.y;
    
    tempEdge.setAttribute('d', `M ${sourcePort.x} ${sourcePort.y} L ${x} ${y}`);
  }
  
  /**
   * End connecting nodes
   * @param {MouseEvent} event - Mouse event
   */
  function endConnect(event) {
    // Remove temporary edge
    if (tempEdge) {
      edgesGroup.removeChild(tempEdge);
      tempEdge = null;
    }
    
    // Check if released on a port
    const port = event.target.closest('.port');
    
    if (port && sourcePort) {
      const targetPort = {
        nodeId: port.getAttribute('data-node-id'),
        portId: port.getAttribute('data-port-id')
      };
      
      // Don't connect to the same node or same port
      if (sourcePort.nodeId !== targetPort.nodeId) {
        // Create connection
        createConnection(sourcePort.nodeId, targetPort.nodeId);
      }
    }
    
    sourcePort = null;
  }
  
  /**
   * Create a connection between two nodes
   * @param {string} sourceId - Source node ID
   * @param {string} targetId - Target node ID
   */
  function createConnection(sourceId, targetId) {
    // Create connection data
    const connectionData = {
      sourceId: sourceId,
      targetId: targetId,
      type: 'depends_on'
    };
    
    // Add connection to the diagram
    API.addConnection(diagramData.id, connectionData)
      .then(response => {
        if (response.success) {
          // Update diagram data
          diagramData = response.diagram;
          
          // Re-render diagram
          render(diagramData);
        } else {
          console.error('Failed to create connection:', response.error);
        }
      })
      .catch(error => {
        console.error('Failed to create connection:', error);
      });
  }
  
  /**
   * Update connected edges when a node is moved
   * @param {string} nodeId - ID of the moved node
   */
  function updateConnectedEdges(nodeId) {
    // Find all edges connected to this node
    const connectedEdges = Array.from(edgesGroup.querySelectorAll(`.edge[data-source="${nodeId}"], .edge[data-target="${nodeId}"]`));
    
    connectedEdges.forEach(edge => {
      const sourceId = edge.getAttribute('data-source');
      const targetId = edge.getAttribute('data-target');
      
      // Find source and target nodes in the data
      const sourceNode = diagramData.nodes.find(node => node.id === sourceId);
      const targetNode = diagramData.nodes.find(node => node.id === targetId);
      
      if (sourceNode && targetNode) {
        // Calculate edge path using DiagramRenderer
        const path = DiagramRenderer.calculateEdgePath(sourceNode, targetNode);
        edge.setAttribute('d', path);
        
        // Update edge label position
        const labelElement = edge.nextElementSibling;
        if (labelElement && labelElement.classList.contains('edge-label-group')) {
          const midpoint = DiagramRenderer.calculateEdgeMidpoint(sourceNode, targetNode);
          labelElement.setAttribute('transform', `translate(${midpoint.x}, ${midpoint.y})`);
        }
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Public API & IIFE closure                                          */
  /* ------------------------------------------------------------------ */

  /**
   * Render the diagram
   */
  function render(data) {
  console.log('Diagram.render called with', data);
    diagramData = data;
    if (!svg || !diagramData) return;

    // Clear existing visuals
    nodesGroup.innerHTML = '';
    edgesGroup.innerHTML = '';

    // Render nodes
    if (Array.isArray(diagramData.nodes)) {
      diagramData.nodes.forEach(node => {
        const nodeEl = DiagramRenderer.renderNode(node);
        nodesGroup.appendChild(nodeEl);
      });
    }

    // Render edges after nodes so they appear underneath labels
    if (Array.isArray(diagramData.edges)) {
      diagramData.edges.forEach(edge => {
        const edgeEls = DiagramRenderer.renderEdge(edge, diagramData.nodes);
        if (edgeEls) {
          edgesGroup.appendChild(edgeEls.edge);
          edgesGroup.appendChild(edgeEls.label);
        }
      });
    }
  }

  /**
   * Center the diagram in the current view
   */
  function zoomToFit() {
    if (!svg || !diagramData || !diagramData.nodes || diagramData.nodes.length === 0) return;
    
    // Calculate bounds of all nodes
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    diagramData.nodes.forEach(node => {
      const x = node.x || 0;
      const y = node.y || 0;
      const width = node.width || 120;
      const height = node.height || 80;
      
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + width);
      maxY = Math.max(maxY, y + height);
    });
    
    // Calculate center of all nodes
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    // Get current SVG dimensions
    const svgRect = svg.getBoundingClientRect();
    
    // Center the view on the nodes without changing zoom level
    viewBox.x = centerX - (viewBox.width / 2);
    viewBox.y = centerY - (viewBox.height / 2);
    
    updateViewBox();
  }

  /** Resize handler (placeholder) */
  function resize() {}

  /** Zoom in */
  function zoomIn() {
    if (zoom.level >= zoom.max) return;
    
    const oldLevel = zoom.level;
    zoom.level = Math.min(zoom.max, zoom.level + zoom.step);
    const zoomFactor = zoom.level / oldLevel;
    
    // Get current SVG dimensions for centering zoom
    const svgRect = svg.getBoundingClientRect();
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    
    // Update viewBox dimensions
    viewBox.width /= zoomFactor;
    viewBox.height /= zoomFactor;
    
    // Recenter the view
    viewBox.x = centerX - viewBox.width / 2;
    viewBox.y = centerY - viewBox.height / 2;
    
    updateViewBox();
  }

  /** Zoom out */
  function zoomOut() {
    if (zoom.level <= zoom.min) return;
    
    const oldLevel = zoom.level;
    zoom.level = Math.max(zoom.min, zoom.level - zoom.step);
    const zoomFactor = zoom.level / oldLevel;
    
    // Get current SVG dimensions for centering zoom
    const svgRect = svg.getBoundingClientRect();
    const centerX = viewBox.x + viewBox.width / 2;
    const centerY = viewBox.y + viewBox.height / 2;
    
    // Update viewBox dimensions
    viewBox.width /= zoomFactor;
    viewBox.height /= zoomFactor;
    
    // Recenter the view
    viewBox.x = centerX - viewBox.width / 2;
    viewBox.y = centerY - viewBox.height / 2;
    
    updateViewBox();
  }

  /**
   * Select an edge (highlights it)
   * @param {Element} edgeElement - Edge element to select
   */
  function selectEdge(edgeElement) {
    // Clear previous selections
    clearSelection();
    clearEdgeSelection();
    
    // Find the actual edge path element
    let edgePath = edgeElement;
    if (edgeElement.classList.contains('edge-label-group')) {
      // If clicked on label, find the corresponding edge
      const edgeId = edgeElement.getAttribute('data-id');
      edgePath = edgesGroup.querySelector(`.edge[data-id="${edgeId}"]`);
    } else if (edgeElement.classList.contains('edge-background')) {
      // If clicked on edge background, find the parent edge group
      const edgeGroup = edgeElement.closest('.edge-label-group');
      if (edgeGroup) {
        const edgeId = edgeGroup.getAttribute('data-id');
        edgePath = edgesGroup.querySelector(`.edge[data-id="${edgeId}"]`);
      }
    }
    
    if (edgePath && edgePath.classList.contains('edge')) {
      edgePath.classList.add('selected');
      selectedElements = [edgePath];
      
      const edgeId = edgePath.getAttribute('data-id');
      console.log('[Diagram] Selected edge:', edgeId);
      
      // Show edge context menu or properties
      showEdgeProperties(edgePath);
    }
  }
  
  /**
   * Clear node selection
   */
  function clearSelection() {
    nodesGroup.querySelectorAll('.node.selected').forEach(node => {
      node.classList.remove('selected');
    });
    selectedElements = [];
  }
  
  /**
   * Clear edge selection
   */
  function clearEdgeSelection() {
    edgesGroup.querySelectorAll('.edge.selected').forEach(edge => {
      edge.classList.remove('selected');
    });
  }
  
  /**
   * Handle keyboard events
   * @param {KeyboardEvent} event - Keyboard event
   */
  function handleKeyDown(event) {
    // Delete key - remove selected edge
    if (event.key === 'Delete' || event.key === 'Backspace') {
      const selectedEdge = edgesGroup.querySelector('.edge.selected');
      if (selectedEdge) {
        event.preventDefault();
        deleteSelectedEdge();
      }
    }
    
    // F2 key - rename selected edge
    if (event.key === 'F2') {
      const selectedEdge = edgesGroup.querySelector('.edge.selected');
      if (selectedEdge) {
        event.preventDefault();
        promptRenameEdge();
      }
    }
    
    // Escape key - clear selections
    if (event.key === 'Escape') {
      clearSelection();
      clearEdgeSelection();
    }
  }
  
  /**
   * Show edge properties/context menu
   * @param {Element} edgeElement - Selected edge element
   */
  function showEdgeProperties(edgeElement) {
    const edgeId = edgeElement.getAttribute('data-id');
    const sourceId = edgeElement.getAttribute('data-source');
    const targetId = edgeElement.getAttribute('data-target');
    
    // Find edge data
    const edgeData = diagramData.edges?.find(edge => edge.id === edgeId);
    if (edgeData) {
      console.log('[Diagram] Edge properties:', {
        id: edgeId,
        source: sourceId,
        target: targetId,
        label: edgeData.label || edgeData.verb || 'Connection',
        type: edgeData.type || 'reference'
      });
    }
  }
  
  /**
   * Rename selected edge
   * @param {string} newLabel - New label for the edge
   */
  function renameSelectedEdge(newLabel) {
    const selectedEdge = edgesGroup.querySelector('.edge.selected');
    if (selectedEdge && newLabel && newLabel.trim()) {
      const edgeId = selectedEdge.getAttribute('data-id');
      
      // Update edge data
      if (diagramData.edges) {
        const edgeData = diagramData.edges.find(edge => edge.id === edgeId);
        if (edgeData) {
          edgeData.label = newLabel.trim();
          edgeData.verb = newLabel.trim();
        }
      }
      
      // Update label in DOM
      const label = edgesGroup.querySelector(`.edge-label-group[data-id="${edgeId}"] .edge-label`);
      if (label) {
        label.textContent = newLabel.trim();
      }
      
      console.log('[Diagram] Renamed edge:', edgeId, 'to:', newLabel.trim());
    }
  }
  
  /**
   * Disconnect selected edge
   */
  function disconnectSelectedEdge() {
    const selectedEdge = edgesGroup.querySelector('.edge.selected');
    if (selectedEdge) {
      const edgeId = selectedEdge.getAttribute('data-id');
      const sourceId = selectedEdge.getAttribute('data-source');
      const targetId = selectedEdge.getAttribute('data-target');
      
      // Remove from diagram data
      if (diagramData.edges) {
        diagramData.edges = diagramData.edges.filter(edge => edge.id !== edgeId);
      }
      
      // Remove from DOM
      selectedEdge.remove();
      
      // Remove corresponding label
      const label = edgesGroup.querySelector(`.edge-label-group[data-id="${edgeId}"]`);
      if (label) {
        label.remove();
      }
      
      console.log('[Diagram] Disconnected edge:', edgeId, 'from', sourceId, 'to', targetId);
    }
  }
  
  /**
   * Delete selected edge (alias for disconnect)
   */
  function deleteSelectedEdge() {
    disconnectSelectedEdge();
  }
  
  /**
   * Prompt user to rename selected edge
   */
  function promptRenameEdge() {
    const selectedEdge = edgesGroup.querySelector('.edge.selected');
    if (selectedEdge) {
      const edgeId = selectedEdge.getAttribute('data-id');
      const edgeData = diagramData.edges?.find(edge => edge.id === edgeId);
      const currentLabel = edgeData?.label || edgeData?.verb || 'Connection';
      
      const newLabel = prompt(`Rename edge connection:`, currentLabel);
      if (newLabel !== null && newLabel.trim() !== '') {
        renameSelectedEdge(newLabel.trim());
      }
    }
  }
  
  /**
   * Show context menu for edge
   * @param {MouseEvent} event - Mouse event
   * @param {Element} edgeElement - Edge element
   */
  function showEdgeContextMenu(event, edgeElement) {
    event.preventDefault();
    
    // Select the edge first
    selectEdge(edgeElement);
    
    const edgeId = edgeElement.getAttribute('data-id');
    const edgeData = diagramData.edges?.find(edge => edge.id === edgeId);
    const currentLabel = edgeData?.label || edgeData?.verb || 'Connection';
    
    // Simple context menu using browser dialogs for now
    // In a real application, you'd want a proper context menu UI
    const action = prompt(`Edge: "${currentLabel}"\n\nChoose action:\n1. Rename\n2. Disconnect\n3. Cancel\n\nEnter 1, 2, or 3:`);
    
    switch(action) {
      case '1':
        promptRenameEdge();
        break;
      case '2':
        if (confirm(`Disconnect edge "${currentLabel}"?`)) {
          disconnectSelectedEdge();
        }
        break;
      default:
        // Cancel or invalid input
        break;
    }
  }
  
  /** Select a node by ID (highlights it) */
  function selectNode(nodeId) {
    if (!nodesGroup) return;
    // Clear previous selection
    [...nodesGroup.querySelectorAll('.node.selected')].forEach(el => el.classList.remove('selected'));
    const el = nodesGroup.querySelector(`[data-id="${nodeId}"]`);
    if (el) {
      el.classList.add('selected');
    }
  }

  /** Change active interaction tool */
  function setTool(tool) {
    activeTool = tool;
  }

  // Expose API expected by other modules
  return {
    init,
    render,
    zoomToFit,
    zoomIn,
    zoomOut,
    selectNode,
    resize,
    setTool
  };
})();
