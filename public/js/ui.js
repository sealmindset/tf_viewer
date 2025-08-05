/**
 * Terraform Diagram Viewer - UI Module
 * 
 * Handles UI interactions and updates.
 */

// UI module
const UI = (function() {
  /**
   * Initialize UI components
   */
  function init() {
    // Initialize tooltips
    initTooltips();
    
    // Initialize modals
    initModals();
    
    console.log('UI module initialized');
  }
  
  /**
   * Initialize tooltips
   */
  function initTooltips() {
    const tooltipElements = document.querySelectorAll('[title]');
    
    tooltipElements.forEach(element => {
      const tooltip = element.getAttribute('title');
      if (tooltip) {
        element.removeAttribute('title');
        element.setAttribute('data-tooltip', tooltip);
        
        element.addEventListener('mouseenter', showTooltip);
        element.addEventListener('mouseleave', hideTooltip);
      }
    });
  }
  
  /**
   * Show tooltip
   * @param {MouseEvent} event - Mouse event
   */
  function showTooltip(event) {
    const tooltip = event.target.getAttribute('data-tooltip');
    if (!tooltip) return;
    
    const tooltipElement = document.createElement('div');
    tooltipElement.classList.add('tooltip');
    tooltipElement.textContent = tooltip;
    
    document.body.appendChild(tooltipElement);
    
    const rect = event.target.getBoundingClientRect();
    tooltipElement.style.left = `${rect.left + rect.width / 2 - tooltipElement.offsetWidth / 2}px`;
    tooltipElement.style.top = `${rect.bottom + 5}px`;
    
    // Check if tooltip is outside viewport
    const tooltipRect = tooltipElement.getBoundingClientRect();
    
    if (tooltipRect.left < 0) {
      tooltipElement.style.left = '5px';
    } else if (tooltipRect.right > window.innerWidth) {
      tooltipElement.style.left = `${window.innerWidth - tooltipRect.width - 5}px`;
    }
    
    if (tooltipRect.bottom > window.innerHeight) {
      tooltipElement.style.top = `${rect.top - tooltipRect.height - 5}px`;
    }
    
    event.target._tooltip = tooltipElement;
  }
  
  /**
   * Hide tooltip
   * @param {MouseEvent} event - Mouse event
   */
  function hideTooltip(event) {
    const tooltipElement = event.target._tooltip;
    if (tooltipElement) {
      document.body.removeChild(tooltipElement);
      event.target._tooltip = null;
    }
  }
  
  /**
   * Initialize modals
   */
  function initModals() {
    // Close modal when clicking outside
    window.addEventListener('click', event => {
      if (event.target.classList.contains('modal')) {
        hideModal(event.target.id);
      }
    });
    
    // ESC key to close modals
    window.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        const openModals = document.querySelectorAll('.modal[style*="display: block"]');
        if (openModals.length > 0) {
          hideModal(openModals[openModals.length - 1].id);
        }
      }
    });
  }
  
  /**
   * Show a modal
   * @param {string} modalId - ID of the modal to show
   */
  function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'block';
      
      // Focus first input if present
      const firstInput = modal.querySelector('input, select, textarea');
      if (firstInput) {
        firstInput.focus();
      }
    }
  }
  
  /**
   * Hide a modal
   * @param {string} modalId - ID of the modal to hide
   */
  function hideModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.style.display = 'none';
    }
  }
  
  /**
   * Show loading indicator
   * @param {string} message - Loading message
   */
  function showLoading(message = 'Loading...') {
    // Check if loading element already exists
    let loadingElement = document.querySelector('.diagram-loading');
    
    if (!loadingElement) {
      loadingElement = document.createElement('div');
      loadingElement.classList.add('diagram-loading');
      
      const spinner = document.createElement('div');
      spinner.classList.add('spinner');
      loadingElement.appendChild(spinner);
      
      const messageElement = document.createElement('div');
      messageElement.style.marginTop = '1rem';
      loadingElement.appendChild(messageElement);
      
      document.querySelector('.diagram-container').appendChild(loadingElement);
    }
    
    // Update message
    loadingElement.querySelector('div:nth-child(2)').textContent = message;
  }
  
  /**
   * Hide loading indicator
   */
  function hideLoading() {
    const loadingElement = document.querySelector('.diagram-loading');
    if (loadingElement) {
      loadingElement.parentElement.removeChild(loadingElement);
    }
  }
  
  /**
   * Show error message
   * @param {string} message - Error message
   * @param {number} duration - Duration in milliseconds
   */
  function showError(message, duration = 5000) {
    showNotification(message, 'error', duration);
  }
  
  /**
   * Show success message
   * @param {string} message - Success message
   * @param {number} duration - Duration in milliseconds
   */
  function showSuccess(message, duration = 3000) {
    showNotification(message, 'success', duration);
  }
  
  /**
   * Show notification
   * @param {string} message - Notification message
   * @param {string} type - Notification type ('error', 'success', 'info')
   * @param {number} duration - Duration in milliseconds
   */
  function showNotification(message, type = 'info', duration = 3000) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    
    if (!container) {
      container = document.createElement('div');
      container.classList.add('notification-container');
      document.body.appendChild(container);
      
      // Style container
      container.style.position = 'fixed';
      container.style.top = '20px';
      container.style.right = '20px';
      container.style.zIndex = '1000';
      container.style.display = 'flex';
      container.style.flexDirection = 'column';
      container.style.alignItems = 'flex-end';
      container.style.gap = '10px';
    }
    
    // Create notification
    const notification = document.createElement('div');
    notification.classList.add('notification', `notification-${type}`);
    notification.textContent = message;
    
    // Style notification
    notification.style.padding = '10px 15px';
    notification.style.borderRadius = '4px';
    notification.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.2)';
    notification.style.maxWidth = '300px';
    notification.style.wordWrap = 'break-word';
    notification.style.animation = 'fadeIn 0.3s';
    notification.style.cursor = 'pointer';
    
    // Set notification color based on type
    switch (type) {
      case 'error':
        notification.style.backgroundColor = '#EF5350';
        notification.style.color = 'white';
        break;
      case 'success':
        notification.style.backgroundColor = '#66BB6A';
        notification.style.color = 'white';
        break;
      case 'info':
      default:
        notification.style.backgroundColor = '#5C6BC0';
        notification.style.color = 'white';
        break;
    }
    
    // Add click event to dismiss
    notification.addEventListener('click', () => {
      container.removeChild(notification);
    });
    
    // Add to container
    container.appendChild(notification);
    
    // Auto remove after duration
    setTimeout(() => {
      if (notification.parentElement) {
        notification.style.animation = 'fadeOut 0.3s';
        
        setTimeout(() => {
          if (notification.parentElement) {
            container.removeChild(notification);
          }
        }, 300);
      }
    }, duration);
    
    // Define animations
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
      }
      @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(20px); }
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * Update resource list in the sidebar
   * @param {Array} nodes - Array of node data
   */
  function updateResourceList(nodes) {
    const resourceList = document.getElementById('resource-list');
    
    // Clear the list
    resourceList.innerHTML = '';
    
    // Group nodes by type
    const nodesByType = nodes.reduce((acc, node) => {
      const type = node.type || 'unknown';
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(node);
      return acc;
    }, {});
    
    // Sort types for consistent display
    const sortedTypes = Object.keys(nodesByType).sort();
    
    // Add nodes to the list
    sortedTypes.forEach(type => {
      // Add type header
      const typeHeader = document.createElement('div');
      typeHeader.classList.add('resource-type-header');
      typeHeader.textContent = `${type.charAt(0).toUpperCase() + type.slice(1)}s`;
      resourceList.appendChild(typeHeader);
      
      // Add nodes
      nodesByType[type].forEach(node => {
        const resourceItem = document.createElement('div');
        resourceItem.classList.add('resource-item');
        resourceItem.setAttribute('data-id', node.id);
        resourceItem.addEventListener('click', () => {
          selectResource(node.id);
        });
        
        // Add icon
        const icon = document.createElement('i');
        icon.classList.add('fas');
        
        // Choose icon based on type
        switch (type) {
          case 'resource':
            icon.classList.add('fa-cube');
            break;
          case 'module':
            icon.classList.add('fa-cubes');
            break;
          case 'variable':
            icon.classList.add('fa-code');
            break;
          case 'output':
            icon.classList.add('fa-arrow-right');
            break;
          case 'data':
            icon.classList.add('fa-database');
            break;
          default:
            icon.classList.add('fa-file');
            break;
        }
        
        resourceItem.appendChild(icon);
        
        // Add resource info
        const resourceInfo = document.createElement('div');
        resourceInfo.classList.add('resource-info');
        
        const resourceName = document.createElement('div');
        resourceName.classList.add('resource-name');
        resourceName.textContent = node.name || node.id;
        
        const resourceType = document.createElement('div');
        resourceType.classList.add('resource-type');
        resourceType.textContent = node.resourceType || node.type;
        
        resourceInfo.appendChild(resourceName);
        resourceInfo.appendChild(resourceType);
        
        resourceItem.appendChild(resourceInfo);
        resourceList.appendChild(resourceItem);
      });
    });
  }
  
  /**
   * Select a resource in the list
   * @param {string} resourceId - Resource ID
   */
  function selectResource(resourceId) {
    // Remove active class from all resources
    document.querySelectorAll('.resource-item').forEach(item => {
      item.classList.remove('active');
    });
    
    // Add active class to selected resource
    const selectedItem = document.querySelector(`.resource-item[data-id="${resourceId}"]`);
    if (selectedItem) {
      selectedItem.classList.add('active');
      
      // Scroll to the selected item if needed
      selectedItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
    
    // Update properties panel
    updatePropertiesPanel(resourceId);
    
    // Highlight the node in the diagram
    if (Diagram) {
      Diagram.selectNode(resourceId);
    }
  }
  
  /**
   * Update properties panel
   * @param {string} resourceId - Resource ID
   */
  function updatePropertiesPanel(resourceId) {
    const propertiesPanel = document.getElementById('properties-panel');
    
    if (!AppState || !AppState.diagramData) {
      propertiesPanel.innerHTML = '<div class="no-selection"><p>No diagram data available</p></div>';
      return;
    }
    
    // Find the node
    const node = AppState.diagramData.nodes.find(node => node.id === resourceId);
    
    if (!node) {
      propertiesPanel.innerHTML = '<div class="no-selection"><p>Select a resource to edit its properties</p></div>';
      return;
    }
    
    // Clear the panel
    propertiesPanel.innerHTML = '';
    
    // Add basic properties
    addPropertyGroup(propertiesPanel, 'Basic Properties', {
      'Name': { value: node.name, type: 'text', readOnly: true },
      'Type': { value: node.type, type: 'text', readOnly: true },
      'Resource Type': { value: node.resourceType || '', type: 'text', readOnly: node.type !== 'resource' }
    });
    
    // Add configuration properties
    if (node.config) {
      addPropertyGroup(propertiesPanel, 'Configuration', formatConfigProperties(node.config));
    }
    
    // Add visual properties
    addPropertyGroup(propertiesPanel, 'Visual Properties', {
      'X Position': { value: node.x || 0, type: 'number', min: 0, step: 1 },
      'Y Position': { value: node.y || 0, type: 'number', min: 0, step: 1 }
    });
    
    // Add event listeners for property changes
    addPropertyEventListeners(resourceId);
  }
  
  /**
   * Format configuration properties for the properties panel
   * @param {Object} config - Configuration object
   * @returns {Object} Formatted properties
   */
  function formatConfigProperties(config) {
    const properties = {};
    
    // Add each property
    for (const [key, value] of Object.entries(config)) {
      // Skip internal properties
      if (key.startsWith('_')) continue;
      
      // Format based on value type
      if (typeof value === 'string') {
        properties[key] = { value, type: 'text' };
      } else if (typeof value === 'number') {
        properties[key] = { value, type: 'number' };
      } else if (typeof value === 'boolean') {
        properties[key] = { value, type: 'checkbox' };
      } else if (Array.isArray(value)) {
        properties[key] = { value: JSON.stringify(value), type: 'textarea' };
      } else if (typeof value === 'object' && value !== null) {
        properties[key] = { value: JSON.stringify(value, null, 2), type: 'textarea' };
      }
    }
    
    return properties;
  }
  
  /**
   * Add a property group to the properties panel
   * @param {HTMLElement} panel - Properties panel element
   * @param {string} title - Group title
   * @param {Object} properties - Properties object
   */
  function addPropertyGroup(panel, title, properties) {
    const group = document.createElement('div');
    group.classList.add('property-group');
    
    // Add group title
    const groupTitle = document.createElement('h3');
    groupTitle.textContent = title;
    group.appendChild(groupTitle);
    
    // Add properties
    for (const [key, prop] of Object.entries(properties)) {
      const propertyRow = document.createElement('div');
      propertyRow.classList.add('property-row');
      
      // Add label
      const label = document.createElement('label');
      label.classList.add('property-label');
      label.textContent = key;
      propertyRow.appendChild(label);
      
      // Add input
      const inputContainer = document.createElement('div');
      inputContainer.classList.add('property-input');
      
      let input;
      
      switch (prop.type) {
        case 'textarea':
          input = document.createElement('textarea');
          input.value = prop.value || '';
          break;
        case 'checkbox':
          input = document.createElement('input');
          input.type = 'checkbox';
          input.checked = prop.value;
          break;
        case 'select':
          input = document.createElement('select');
          if (prop.options) {
            prop.options.forEach(option => {
              const optionElement = document.createElement('option');
              optionElement.value = option.value;
              optionElement.textContent = option.label || option.value;
              if (option.value === prop.value) {
                optionElement.selected = true;
              }
              input.appendChild(optionElement);
            });
          }
          break;
        default:
          input = document.createElement('input');
          input.type = prop.type || 'text';
          input.value = prop.value || '';
          
          if (prop.min !== undefined) input.min = prop.min;
          if (prop.max !== undefined) input.max = prop.max;
          if (prop.step !== undefined) input.step = prop.step;
      }
      
      // Set common attributes
      input.setAttribute('data-property', key);
      input.setAttribute('data-group', title.toLowerCase().replace(/\s+/g, '-'));
      
      if (prop.readOnly) {
        input.readOnly = true;
        input.classList.add('read-only');
      }
      
      inputContainer.appendChild(input);
      propertyRow.appendChild(inputContainer);
      
      group.appendChild(propertyRow);
    }
    
    panel.appendChild(group);
  }
  
  /**
   * Add event listeners for property changes
   * @param {string} resourceId - Resource ID
   */
  function addPropertyEventListeners(resourceId) {
    const panel = document.getElementById('properties-panel');
    
    // Handle input changes
    panel.querySelectorAll('input, textarea, select').forEach(input => {
      if (input.readOnly) return;
      
      const propertyName = input.getAttribute('data-property');
      const groupName = input.getAttribute('data-group');
      
      input.addEventListener('change', () => {
        updateNodeProperty(resourceId, propertyName, input.value, groupName);
      });
    });
  }
  
  /**
   * Update a node property
   * @param {string} nodeId - Node ID
   * @param {string} propertyName - Property name
   * @param {any} value - Property value
   * @param {string} groupName - Property group name
   */
  function updateNodeProperty(nodeId, propertyName, value, groupName) {
    if (!AppState || !AppState.diagramData) return;
    
    // Find the node
    const nodeIndex = AppState.diagramData.nodes.findIndex(node => node.id === nodeId);
    
    if (nodeIndex === -1) return;
    
    const node = AppState.diagramData.nodes[nodeIndex];
    
    // Update property based on group
    switch (groupName) {
      case 'basic-properties':
        if (propertyName === 'Resource Type' && node.type === 'resource') {
          node.resourceType = value;
        }
        break;
      case 'configuration':
        if (!node.config) node.config = {};
        
        // Try to parse JSON if it's a textarea
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          try {
            node.config[propertyName] = JSON.parse(value);
          } catch (error) {
            console.warn('Failed to parse JSON:', error);
            node.config[propertyName] = value;
          }
        } else {
          node.config[propertyName] = value;
        }
        break;
      case 'visual-properties':
        if (propertyName === 'X Position') {
          node.x = parseFloat(value);
        } else if (propertyName === 'Y Position') {
          node.y = parseFloat(value);
        }
        break;
    }
    
    // Update node in the diagram
    if (Diagram) {
      Diagram.updateNode(nodeId, node);
    }
    
    // Update node on the server
    API.updateNode(AppState.diagramData.id, nodeId, node).catch(error => {
      console.error('Failed to update node:', error);
    });
    
    // Mark as modified
    AppState.isModified = true;
  }
  
  /**
   * Update a code view
   * @param {string} viewId - View ID
   * @param {string} code - Code content
   */
  function updateCodeView(viewId, code) {
    const codeView = document.getElementById(viewId);
    if (codeView) {
      const pre = codeView.querySelector('pre');
      if (pre) {
        pre.textContent = code;
      }
    }
  }
  
  // Public API
  return {
    init,
    showModal,
    hideModal,
    showLoading,
    hideLoading,
    showError,
    showSuccess,
    updateResourceList,
    selectResource,
    updatePropertiesPanel,
    updateCodeView
  };
})();
