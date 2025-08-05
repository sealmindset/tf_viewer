/**
 * Terraform Diagram Viewer - Main Application
 * 
 * Main application script that initializes components and manages the application state.
 */

// Application state
const AppState = {
  currentProject: null,
  diagramData: null,
  selectedNode: null,
  selectedEdge: null,
  originalCode: {},
  generatedCode: {},
  isModified: false,
  recentProjects: [],
  settings: {
    autoLayout: true,
    defaultLayoutDirection: 'LR',
    snapToGrid: true,
    gridSize: 20,
    darkMode: false
  }
};

// Initialize application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log('Terraform Diagram Viewer application initialized');

  // Initialize UI components
  UI.init();
  
  // Initialize diagram
  Diagram.init(document.getElementById('diagram-svg'));
  
  // Initialize event listeners
  initEventListeners();
  
  // Load recent projects from localStorage
  loadRecentProjects();
});

/**
 * Initialize application event listeners
 */
function initEventListeners() {
  // Enhance button
  document.getElementById('enhance-diagram').addEventListener('click', async () => {
    if (!AppState.diagramData || !AppState.diagramData.id) {
      alert('No diagram loaded to enhance.');
      return;
    }
    UI.showLoading('Enhancing diagram with ChatGPT...');
    try {
      const res = await fetch(`/api/diagram/${AppState.diagramData.id}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (data.success && data.diagram) {
        AppState.diagramData = data.diagram;
        Diagram.render(AppState.diagramData);
        Logger.log('Diagram enhanced with ChatGPT');
      } else {
        Logger.error('Enhance failed:', data.message || 'Unknown error');
        alert('Enhance failed: ' + (data.message || 'Unknown error'));
      }
    } catch (err) {
      Logger.error('Enhance error:', err);
      alert('Enhance error: ' + err.message);
    } finally {
      UI.hideLoading();
    }
  });
  // Header buttons
  document.getElementById('open-file').addEventListener('click', () => {
    UI.showModal('project-modal');
  });
  
  document.getElementById('save-file').addEventListener('click', () => {
    saveCurrentProject();
  });
  
  document.getElementById('export-code').addEventListener('click', () => {
    UI.showModal('export-modal');
  });
  
  document.getElementById('settings').addEventListener('click', () => {
    // TODO: Implement settings modal
  });
  
  // Project modal
  document.getElementById('open-project-btn').addEventListener('click', () => {
    const projectPath = document.getElementById('project-path').value.trim();
    if (projectPath) {
      openProject(projectPath);
      UI.hideModal('project-modal');
    } else {
      alert('Please enter a project path');
    }
  });
  
  document.getElementById('cancel-project-btn').addEventListener('click', () => {
    UI.hideModal('project-modal');
  });
  
  // Add resource button
  document.getElementById('add-resource').addEventListener('click', () => {
    UI.showModal('add-resource-modal');
  });
  
  // Add resource modal
  document.getElementById('add-resource-btn').addEventListener('click', () => {
    const resourceType = document.getElementById('resource-type').value;
    const resourceName = document.getElementById('resource-name').value.trim();
    
    if (resourceName) {
      addNewResource(resourceType, resourceName);
      UI.hideModal('add-resource-modal');
      document.getElementById('resource-name').value = '';
    } else {
      alert('Please enter a resource name');
    }
  });
  
  document.getElementById('cancel-resource-btn').addEventListener('click', () => {
    UI.hideModal('add-resource-modal');
    document.getElementById('resource-name').value = '';
  });
  
  // Export modal
  document.getElementById('export-btn').addEventListener('click', () => {
    const exportPath = document.getElementById('export-path').value.trim();
    const overwriteFiles = document.getElementById('overwrite-files').checked;
    const createBackup = document.getElementById('create-backup').checked;
    
    if (exportPath) {
      exportTerraformCode(exportPath, overwriteFiles, createBackup);
      UI.hideModal('export-modal');
    } else {
      alert('Please enter an export path');
    }
  });
  
  document.getElementById('cancel-export-btn').addEventListener('click', () => {
    UI.hideModal('export-modal');
  });
  
  // Layout direction
  document.getElementById('apply-layout').addEventListener('click', () => {
    const direction = document.getElementById('layout-direction').value;
    applyLayout(direction);
  });
  
  // Diagram tools
  document.getElementById('tool-pan').addEventListener('click', () => {
    setActiveTool('pan');
  });
  
  document.getElementById('tool-select').addEventListener('click', () => {
    setActiveTool('select');
  });
  
  document.getElementById('tool-connect').addEventListener('click', () => {
    setActiveTool('connect');
  });
  
  document.getElementById('zoom-in').addEventListener('click', () => {
    Diagram.zoomIn();
  });
  
  document.getElementById('zoom-out').addEventListener('click', () => {
    Diagram.zoomOut();
  });
  
  document.getElementById('zoom-fit').addEventListener('click', () => {
    Diagram.zoomToFit();
  });
  
  // Search
  document.getElementById('resource-search').addEventListener('input', (e) => {
    filterResources(e.target.value);
  });
  
  // Code tabs
  document.querySelectorAll('.code-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.getAttribute('data-tab');
      activateCodeTab(tabId);
    });
  });
  
  // Close modal buttons
  document.querySelectorAll('.close').forEach(closeBtn => {
    closeBtn.addEventListener('click', () => {
      const modal = closeBtn.closest('.modal');
      UI.hideModal(modal.id);
    });
  });
  
  // Handle window resize
  window.addEventListener('resize', () => {
    Diagram.resize();
  });
}

/**
 * Open a Terraform project
 * @param {string} projectPath - Path to the project directory
 */
async function openProject(projectPath) {
  try {
    UI.showLoading('Loading project...');
    
    // Call API to parse directory
    const response = await API.parseDirectory(projectPath);
    
    if (response.success) {
      AppState.currentProject = {
        path: projectPath,
        name: projectPath.split('/').pop()
      };
      
      AppState.originalCode = response.code;
      
      // Generate diagram from parsed data
      const diagramResponse = await API.generateDiagram(response.parsedData);
      
      if (diagramResponse.success) {
        AppState.diagramData = diagramResponse.diagram;
        
        // Render diagram
        Diagram.render(AppState.diagramData);
        
        // Update resource list
        UI.updateResourceList(AppState.diagramData.nodes);
        
        // Update code views
        UI.updateCodeView('terraform-code', formatTerraformCode(AppState.originalCode));
        UI.updateCodeView('json-view', JSON.stringify(AppState.diagramData, null, 2));
        
        // Add to recent projects
        addToRecentProjects(projectPath);
        
        // Set window title
        document.title = `${AppState.currentProject.name} - Terraform Diagram Viewer`;
      } else {
        throw new Error(diagramResponse.error || 'Failed to generate diagram');
      }
    } else {
      throw new Error(response.error || 'Failed to parse project directory');
    }
  } catch (error) {
    console.error('Error opening project:', error);
    UI.showError(`Error opening project: ${error.message}`);
  } finally {
    UI.hideLoading();
  }
}

/**
 * Save the current project
 */
async function saveCurrentProject() {
  try {
    if (!AppState.currentProject) {
      throw new Error('No project is currently open');
    }
    
    UI.showLoading('Saving project...');
    
    // Generate Terraform code from diagram
    const codeResponse = await API.generateCode(AppState.diagramData);
    
    if (codeResponse.success) {
      AppState.generatedCode = codeResponse.code;
      
      // Save code to project directory
      const saveResponse = await API.saveCode(
        AppState.generatedCode, 
        AppState.currentProject.path
      );
      
      if (saveResponse.success) {
        UI.showSuccess('Project saved successfully');
        AppState.isModified = false;
      } else {
        throw new Error(saveResponse.error || 'Failed to save project');
      }
    } else {
      throw new Error(codeResponse.error || 'Failed to generate code');
    }
  } catch (error) {
    console.error('Error saving project:', error);
    UI.showError(`Error saving project: ${error.message}`);
  } finally {
    UI.hideLoading();
  }
}

/**
 * Export Terraform code to a specified path
 * @param {string} exportPath - Path to export the code to
 * @param {boolean} overwriteFiles - Whether to overwrite existing files
 * @param {boolean} createBackup - Whether to create a backup of existing files
 */
async function exportTerraformCode(exportPath, overwriteFiles, createBackup) {
  try {
    if (!AppState.diagramData) {
      throw new Error('No diagram data available');
    }
    
    UI.showLoading('Exporting Terraform code...');
    
    // Generate Terraform code from diagram
    const codeResponse = await API.generateCode(AppState.diagramData);
    
    if (codeResponse.success) {
      AppState.generatedCode = codeResponse.code;
      
      // Export code to specified path
      const exportResponse = await API.exportCode(
        AppState.generatedCode,
        exportPath,
        { overwriteFiles, createBackup }
      );
      
      if (exportResponse.success) {
        UI.showSuccess('Terraform code exported successfully');
      } else {
        throw new Error(exportResponse.error || 'Failed to export code');
      }
    } else {
      throw new Error(codeResponse.error || 'Failed to generate code');
    }
  } catch (error) {
    console.error('Error exporting code:', error);
    UI.showError(`Error exporting code: ${error.message}`);
  } finally {
    UI.hideLoading();
  }
}

/**
 * Add a new resource to the diagram
 * @param {string} resourceType - Type of resource to add
 * @param {string} resourceName - Name of the resource
 */
async function addNewResource(resourceType, resourceName) {
  try {
    if (!AppState.diagramData) {
      throw new Error('No diagram data available');
    }
    
    // Create node data
    const nodeData = {
      type: 'resource',
      resourceType: resourceType,
      name: resourceName,
      label: `${resourceType}.${resourceName}`,
      config: {}
    };
    
    // Add node to diagram
    const response = await API.addNode(AppState.diagramData.id, nodeData);
    
    if (response.success) {
      // Update diagram data
      AppState.diagramData = response.diagram;
      
      // Re-render diagram
      Diagram.render(AppState.diagramData);
      
      // Update resource list
      UI.updateResourceList(AppState.diagramData.nodes);
      
      // Update code views
      const codeResponse = await API.generateCode(AppState.diagramData);
      if (codeResponse.success) {
        AppState.generatedCode = codeResponse.code;
        UI.updateCodeView('terraform-code', formatTerraformCode(AppState.generatedCode));
        UI.updateCodeView('json-view', JSON.stringify(AppState.diagramData, null, 2));
      }
      
      // Mark as modified
      AppState.isModified = true;
    } else {
      throw new Error(response.error || 'Failed to add resource');
    }
  } catch (error) {
    console.error('Error adding resource:', error);
    UI.showError(`Error adding resource: ${error.message}`);
  }
}

/**
 * Apply a layout to the diagram
 * @param {string} direction - Direction of the layout (LR, TB, RL, BT)
 */
async function applyLayout(direction) {
  try {
    if (!AppState.diagramData) {
      throw new Error('No diagram data available');
    }
    
    UI.showLoading('Applying layout...');
    
    // Call API to update layout
    const response = await API.updateLayout(AppState.diagramData.id, { direction });
    
    if (response.success) {
      // Update diagram data
      AppState.diagramData = response.diagram;
      
      // Re-render diagram
      Diagram.render(AppState.diagramData);
    } else {
      throw new Error(response.error || 'Failed to apply layout');
    }
  } catch (error) {
    console.error('Error applying layout:', error);
    UI.showError(`Error applying layout: ${error.message}`);
  } finally {
    UI.hideLoading();
  }
}

/**
 * Set the active tool for diagram interaction
 * @param {string} tool - Tool to activate ('pan', 'select', 'connect')
 */
function setActiveTool(tool) {
  // Remove active class from all tools
  document.querySelectorAll('.btn-tool').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to selected tool
  document.getElementById(`tool-${tool}`).classList.add('active');
  
  // Set active tool in diagram
  Diagram.setTool(tool);
}

/**
 * Filter resources in the resource list
 * @param {string} query - Search query
 */
function filterResources(query) {
  const resourceItems = document.querySelectorAll('.resource-item');
  
  resourceItems.forEach(item => {
    const resourceName = item.querySelector('.resource-name').textContent;
    const resourceType = item.querySelector('.resource-type').textContent;
    
    if (resourceName.toLowerCase().includes(query.toLowerCase()) || 
        resourceType.toLowerCase().includes(query.toLowerCase())) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

/**
 * Activate a code tab
 * @param {string} tabId - ID of the tab to activate
 */
function activateCodeTab(tabId) {
  // Remove active class from all tabs and views
  document.querySelectorAll('.code-tab').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('.code-view').forEach(view => {
    view.classList.remove('active');
  });
  
  // Add active class to selected tab and view
  document.querySelector(`.code-tab[data-tab="${tabId}"]`).classList.add('active');
  document.getElementById(tabId).classList.add('active');
}

/**
 * Format Terraform code for display
 * @param {Object} codeObj - Object containing Terraform code files
 * @returns {string} Formatted Terraform code
 */
function formatTerraformCode(codeObj) {
  let formattedCode = '';
  
  for (const [filename, content] of Object.entries(codeObj)) {
    formattedCode += `# ${filename}\n\n${content}\n\n`;
  }
  
  return formattedCode;
}

/**
 * Add a project to recent projects
 * @param {string} projectPath - Path to the project
 */
function addToRecentProjects(projectPath) {
  // Check if project is already in recent projects
  const index = AppState.recentProjects.findIndex(project => project.path === projectPath);
  
  if (index !== -1) {
    // Move project to the top of the list
    AppState.recentProjects.splice(index, 1);
  }
  
  // Add project to the beginning of the list
  AppState.recentProjects.unshift({
    path: projectPath,
    name: projectPath.split('/').pop(),
    timestamp: Date.now()
  });
  
  // Limit to 5 recent projects
  if (AppState.recentProjects.length > 5) {
    AppState.recentProjects.pop();
  }
  
  // Save to localStorage
  localStorage.setItem('recentProjects', JSON.stringify(AppState.recentProjects));
  
  // Update recent projects list
  updateRecentProjectsList();
}

/**
 * Load recent projects from localStorage
 */
function loadRecentProjects() {
  try {
    const recentProjects = localStorage.getItem('recentProjects');
    
    if (recentProjects) {
      AppState.recentProjects = JSON.parse(recentProjects);
      updateRecentProjectsList();
    }
  } catch (error) {
    console.error('Error loading recent projects:', error);
  }
}

/**
 * Update the recent projects list in the UI
 */
function updateRecentProjectsList() {
  const recentProjectsList = document.getElementById('recent-projects-list');
  
  // Clear the list
  recentProjectsList.innerHTML = '';
  
  // Add projects to the list
  if (AppState.recentProjects.length === 0) {
    recentProjectsList.innerHTML = '<li>No recent projects</li>';
    return;
  }
  
  AppState.recentProjects.forEach(project => {
    const li = document.createElement('li');
    li.textContent = `${project.name} (${project.path})`;
    li.addEventListener('click', () => {
      document.getElementById('project-path').value = project.path;
    });
    recentProjectsList.appendChild(li);
  });
}
