/**
 * Diagram Routes
 * 
 * Endpoints for handling diagram generation and manipulation.
 */

const express = require('express');
const router = express.Router();
const diagramController = require('../controllers/diagramController');

// Generate a diagram from parsed Terraform data
router.post('/generate', diagramController.generateDiagram);

// Update diagram layout
router.put('/:diagramId/layout', diagramController.updateLayout);

// Add a new node to the diagram
router.post('/:diagramId/nodes', diagramController.addNode);

// Update an existing node
router.put('/:diagramId/nodes/:id', diagramController.updateNode);

// Delete a node from the diagram
router.delete('/:diagramId/nodes/:id', diagramController.deleteNode);

// Add a connection between nodes
router.post('/:diagramId/connections', diagramController.addConnection);

// Update a connection
router.put('/:diagramId/connections/:id', diagramController.updateConnection);

// Delete a connection
router.delete('/:diagramId/connections/:id', diagramController.deleteConnection);

// Enhance diagram via ChatGPT
router.post('/:diagramId/enhance', diagramController.enhanceDiagram);

module.exports = router;
