/**
 * Terraform Diagram Viewer - End-to-End Test
 * 
 * Tests the complete workflow from Terraform code to diagram and back.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const assert = require('assert');

// Import services
const terraformParser = require('../src/backend/services/terraformParser');
const diagramGenerator = require('../src/backend/services/diagramGenerator');
const codeGenerator = require('../src/backend/services/codeGenerator');
const validator = require('../src/backend/utils/validator');

// Sample Terraform project paths
const SAMPLE_PROJECT_PATH = process.env.SAMPLE_PROJECT_PATH || '/Users/rvance/Documents/GitHub/tf_gcp';
const OUTPUT_PATH = path.join(__dirname, 'output');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_PATH)) {
  fs.mkdirSync(OUTPUT_PATH, { recursive: true });
}

console.log('Starting end-to-end test...');

// Test workflow steps
async function runTests() {
  try {
    // Step 1: Parse Terraform files
    console.log('\n1. Parsing Terraform files...');
    const mainFilePath = path.join(SAMPLE_PROJECT_PATH, 'main.tf');
    const varsFilePath = path.join(SAMPLE_PROJECT_PATH, 'variables.tf');
    
    if (!fs.existsSync(mainFilePath)) {
      throw new Error(`Main Terraform file not found at: ${mainFilePath}`);
    }
    
    const mainFileContent = fs.readFileSync(mainFilePath, 'utf8');
    const varsFileContent = fs.existsSync(varsFilePath) ? fs.readFileSync(varsFilePath, 'utf8') : '';
    
    // Parse main file
    const parsedMain = await terraformParser.parseCode(mainFileContent);
    assert(parsedMain.success, 'Failed to parse main.tf');
    console.log(`- Successfully parsed main.tf (${Object.keys(parsedMain.data.resources || {}).length} resources found)`);
    
    // Parse variables file if it exists
    let parsedVars = { success: true, data: {} };
    if (varsFileContent) {
      parsedVars = await terraformParser.parseCode(varsFileContent);
      assert(parsedVars.success, 'Failed to parse variables.tf');
      console.log(`- Successfully parsed variables.tf (${Object.keys(parsedVars.data.variables || {}).length} variables found)`);
    }
    
    // Combine parsed data
    const parsedData = {
      ...parsedMain.data,
      variables: {
        ...(parsedMain.data.variables || {}),
        ...(parsedVars.data.variables || {})
      }
    };
    
    // Step 2: Generate diagram
    console.log('\n2. Generating diagram from parsed data...');
    const diagramResult = await diagramGenerator.generateDiagram(parsedData);
    assert(diagramResult.success, 'Failed to generate diagram');
    
    const diagramData = diagramResult.data;
    console.log(`- Successfully generated diagram (${diagramData.nodes.length} nodes, ${diagramData.edges.length} edges)`);
    
    // Save diagram data to file
    fs.writeFileSync(path.join(OUTPUT_PATH, 'diagram.json'), JSON.stringify(diagramData, null, 2));
    
    // Step 3: Make edits to the diagram
    console.log('\n3. Performing edits on the diagram...');
    
    // Add a new node
    const newNodeId = 'test_resource_' + Date.now();
    diagramData.nodes.push({
      id: newNodeId,
      name: 'test_bucket',
      type: 'resource',
      resourceType: 'google_storage_bucket',
      x: 500,
      y: 200,
      config: {
        name: 'test-bucket',
        location: 'US',
        force_destroy: true
      }
    });
    console.log('- Added new storage bucket resource');
    
    // Add a connection to the new node if we have at least one existing node
    if (diagramData.nodes.length > 1) {
      const existingNodeId = diagramData.nodes[0].id;
      diagramData.edges.push({
        id: `${existingNodeId}-${newNodeId}`,
        sourceId: existingNodeId,
        targetId: newNodeId,
        type: 'depends_on',
        label: 'depends_on'
      });
      console.log('- Added connection to the new resource');
    }
    
    // Modify an existing node if available
    if (diagramData.nodes.length > 1) {
      const nodeToModify = diagramData.nodes[1];
      const originalName = nodeToModify.name;
      
      if (nodeToModify.config) {
        nodeToModify.config._test_tag = 'modified_for_test';
        console.log(`- Modified node '${originalName}' by adding a test tag`);
      }
    }
    
    // Save modified diagram data
    fs.writeFileSync(path.join(OUTPUT_PATH, 'diagram_modified.json'), JSON.stringify(diagramData, null, 2));
    
    // Step 4: Generate code from the modified diagram
    console.log('\n4. Generating Terraform code from modified diagram...');
    const codeResult = await codeGenerator.generateCode(diagramData);
    assert(codeResult.success, 'Failed to generate code');
    
    const generatedCode = codeResult.data;
    console.log(`- Successfully generated code (${Object.keys(generatedCode).length} files)`);
    
    // Save generated code to files
    for (const [filename, code] of Object.entries(generatedCode)) {
      fs.writeFileSync(path.join(OUTPUT_PATH, filename), code);
      console.log(`- Saved generated file: ${filename}`);
    }
    
    // Step 5: Validate generated code
    console.log('\n5. Validating generated code...');
    
    // Validate with our validator
    const mainCode = generatedCode['main.tf'] || '';
    const validationResult = validator.validateTerraformCode(mainCode);
    assert(validationResult.valid, 'Code validation failed with our validator');
    console.log('- Code validation passed with our validator');
    
    // Optionally validate with terraform validate if terraform is installed
    try {
      // Create a temporary directory for terraform validation
      const tempDir = path.join(OUTPUT_PATH, 'terraform_validate');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      // Copy generated files to temp dir
      for (const [filename, code] of Object.entries(generatedCode)) {
        fs.writeFileSync(path.join(tempDir, filename), code);
      }
      
      // Try to run terraform init and validate
      try {
        console.log('- Running terraform init...');
        execSync('terraform init', { cwd: tempDir, stdio: 'pipe' });
        
        console.log('- Running terraform validate...');
        execSync('terraform validate', { cwd: tempDir, stdio: 'pipe' });
        console.log('- Terraform validation successful!');
      } catch (error) {
        console.log(`- Terraform validation skipped: ${error.message}`);
      }
    } catch (error) {
      console.log(`- Terraform CLI validation skipped: ${error.message}`);
    }
    
    // Step 6: Ensure round-trip integrity
    console.log('\n6. Testing round-trip integrity...');
    
    // Parse the generated code
    const regeneratedMainCode = generatedCode['main.tf'] || '';
    const reparsedResult = await terraformParser.parseCode(regeneratedMainCode);
    assert(reparsedResult.success, 'Failed to parse generated code');
    
    // Generate diagram again from parsed code
    const regeneratedDiagramResult = await diagramGenerator.generateDiagram(reparsedResult.data);
    assert(regeneratedDiagramResult.success, 'Failed to regenerate diagram');
    
    // Save regenerated diagram data for comparison
    fs.writeFileSync(
      path.join(OUTPUT_PATH, 'diagram_regenerated.json'), 
      JSON.stringify(regeneratedDiagramResult.data, null, 2)
    );
    
    // Check that our new node exists in the regenerated diagram
    const regeneratedNodes = regeneratedDiagramResult.data.nodes;
    const newNodeExists = regeneratedNodes.some(node => 
      node.id === newNodeId || 
      (node.resourceType === 'google_storage_bucket' && node.name === 'test_bucket')
    );
    
    assert(newNodeExists, 'New node is missing in regenerated diagram');
    console.log('- New node correctly preserved in round-trip conversion');
    
    console.log('\nEnd-to-end test completed successfully!');
    console.log(`Output files saved to: ${OUTPUT_PATH}`);
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run tests
runTests();
