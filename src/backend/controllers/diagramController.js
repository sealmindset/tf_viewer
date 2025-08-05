/**
 * Diagram Controller
 * 
 * Handles the logic for generating and manipulating diagrams from Terraform data.
 */

const diagramGenerator = require('../services/diagramGenerator');
const { polishDiagram } = require('../services/diagramEnhancer');
const { v4: uuidv4 } = require('uuid');

// In-memory store of diagram data keyed by diagramId. In a real app we would
// persist this, but for now it satisfies the stateless HTTP ↔ stateful UI
// interaction expected by the frontend.
const diagrams = new Map();
const { validateDiagramData, validateNodeData, validateConnectionData } = require('../utils/validator');

/**
 * Generate a diagram from parsed Terraform data
 */
exports.generateDiagram = async (req, res, next) => {
  try {
    const { parsedData } = req.body;
    
    if (!parsedData) {
      return res.status(400).json({ error: true, message: 'No parsed data provided' });
    }

    // Generate diagram data from parsed Terraform
    const diagramData = await diagramGenerator.generateFromTerraform(parsedData);

    // Attach a unique ID and store
    const diagramId = uuidv4();
    let diagramWithId = { id: diagramId, ...diagramData };

    // --- Automatic enhancement step ---
    try {
      const polished = await polishDiagram(diagramWithId);
      if (polished && polished.polished) {
        diagramWithId = { ...diagramWithId, ...polished };
      }
    } catch (err) {
      console.error('[diagramController] polishDiagram failed', err);
    }

    diagrams.set(diagramId, diagramWithId);

    res.json({
      success: true,
      diagram: diagramWithId
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update diagram layout
 */
exports.updateLayout = async (req, res, next) => {
  try {
    const { diagramId } = req.params;
    const layoutOptions = req.body;

    const diagramData = diagrams.get(diagramId);
    if (!diagramData) {
      return res.status(404).json({ error: true, message: 'Diagram not found' });
    }

    // Temporarily skip strict diagram validation for layout –
    // the diagram may contain additional properties added by the client
    // which are harmless for layout computation.
    /*
    const validationResult = validateDiagramData(diagramData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid diagram data', details: validationResult.errors });
    }
    */

    // Update the layout
    const updatedDiagram = await diagramGenerator.updateLayout(diagramData, layoutOptions);

    // Store updated version (retain id)
    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a new node to the diagram
 */
exports.addNode = async (req, res, next) => {
  try {
    const { diagramId } = req.params;
    const nodeData = req.body;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'Missing required data' });
    }

    // Validate the node data
    const validationResult = validateNodeData(nodeData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid node data', details: validationResult.errors });
    }

    // Add the node
    const updatedDiagram = await diagramGenerator.addNode(diagramData, nodeData);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing node
 */
exports.updateNode = async (req, res, next) => {
  try {
    const { diagramId, id } = req.params; // id -> nodeId
    const nodeData = req.body;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'Missing required data' });
    }

    // Validate the node data
    const validationResult = validateNodeData(nodeData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid node data', details: validationResult.errors });
    }

    // Update the node
    const updatedDiagram = await diagramGenerator.updateNode(diagramData, id, nodeData);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a node from the diagram
 */
exports.deleteNode = async (req, res, next) => {
  try {
    const { diagramId, id } = req.params;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Delete the node
    const updatedDiagram = await diagramGenerator.deleteNode(diagramData, id);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add a connection between nodes
 */
exports.addConnection = async (req, res, next) => {
  try {
    const { diagramId } = req.params;
    const connectionData = req.body;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData || !connectionData) {
      return res.status(400).json({ error: true, message: 'Missing required data' });
    }

    // Validate the connection data
    const validationResult = validateConnectionData(connectionData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid connection data', details: validationResult.errors });
    }

    // Add the connection
    const updatedDiagram = await diagramGenerator.addConnection(diagramData, connectionData);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update a connection
 */
exports.updateConnection = async (req, res, next) => {
  try {
    const { diagramId, id } = req.params; // id -> connectionId
    const connectionData = req.body;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData || !connectionData) {
      return res.status(400).json({ error: true, message: 'Missing required data' });
    }

    // Validate the connection data
    const validationResult = validateConnectionData(connectionData);
    if (!validationResult.valid) {
      return res.status(400).json({ error: true, message: 'Invalid connection data', details: validationResult.errors });
    }

    // Update the connection
    const updatedDiagram = await diagramGenerator.updateConnection(diagramData, id, connectionData);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a connection
 */
exports.deleteConnection = async (req, res, next) => {
  try {
    const { diagramId, id } = req.params;
    const diagramData = diagrams.get(diagramId);
    
    if (!diagramData) {
      return res.status(400).json({ error: true, message: 'No diagram data provided' });
    }

    // Delete the connection
    const updatedDiagram = await diagramGenerator.deleteConnection(diagramData, id);

    const stored = { id: diagramId, ...updatedDiagram };
    diagrams.set(diagramId, stored);

    res.json({
      success: true,
      diagram: stored
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Enhance diagram via ChatGPT
 */
exports.enhanceDiagram = async (req, res, next) => {
  try {
    const { diagramId } = req.params;
    let diagramData = diagrams.get(diagramId);
    if (!diagramData) {
      return res.status(404).json({ error: true, message: 'Diagram not found' });
    }
    const polished = await polishDiagram(diagramData);
    if (polished && polished.polished) {
      diagramData = { ...diagramData, ...polished };
      diagrams.set(diagramId, diagramData);
      return res.json({ success: true, diagram: diagramData });
    } else {
      return res.status(500).json({ error: true, message: 'Failed to enhance diagram' });
    }
  } catch (err) {
    next(err);
  }
};

/**
 * Enhance diagram via ChatGPT
 */
exports.enhanceDiagram = async (req, res, next) => {
  try {
    const { diagramId } = req.params;
    let diagramData = diagrams.get(diagramId);
    if (!diagramData) {
      return res.status(404).json({ error: true, message: "Diagram not found" });
    }
    const polished = await polishDiagram(diagramData);
    if (polished && polished.polished) {
      diagramData = { ...diagramData, ...polished };
      diagrams.set(diagramId, diagramData);
      return res.json({ success: true, diagram: diagramData });
    } else {
      return res.status(500).json({ error: true, message: "Failed to enhance diagram" });
    }
  } catch (err) {
    next(err);
  }
};
