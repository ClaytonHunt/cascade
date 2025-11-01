// Manual test for parser functionality
// Run with: node test/manual-parser-test.js

// Mock vscode module to allow extension loading
const vscode = {
  workspace: { workspaceFolders: [] },
  window: { createOutputChannel: () => ({ appendLine: () => {}, dispose: () => {} }) },
  version: 'test',
  extensions: { getExtension: () => ({ packageJSON: { version: 'test' } }) }
};
require('module')._cache['vscode'] = { exports: vscode };

// Import parser from bundled extension
const { parseFrontmatter } = require('../dist/extension.js');
const fs = require('fs');
const path = require('path');

console.log('=== Parser Manual Test ===\n');

// Test 1: Valid frontmatter
console.log('Test 1: Valid frontmatter');
const validContent = fs.readFileSync(path.join(__dirname, 'fixtures/valid-simple.md'), 'utf-8');
const result1 = parseFrontmatter(validContent);
console.log('Result:', result1.success ? 'PASS ✅' : 'FAIL ❌');
if (result1.success) {
  console.log('Frontmatter:', JSON.stringify(result1.frontmatter, null, 2));
} else {
  console.log('Error:', result1.error);
}
console.log('');

// Test 2: No frontmatter
console.log('Test 2: No frontmatter (should fail)');
const noFrontmatter = fs.readFileSync(path.join(__dirname, 'fixtures/no-frontmatter.md'), 'utf-8');
const result2 = parseFrontmatter(noFrontmatter);
console.log('Result:', !result2.success ? 'PASS ✅' : 'FAIL ❌');
if (!result2.success) {
  console.log('Error:', result2.error);
} else {
  console.log('Unexpected success');
}
console.log('');

// Test 3: Inline test - malformed YAML
console.log('Test 3: Malformed YAML (should fail)');
const malformed = '---\nitem: S39\ntitle missing colon\n---\n';
const result3 = parseFrontmatter(malformed);
console.log('Result:', !result3.success ? 'PASS ✅' : 'FAIL ❌');
if (!result3.success) {
  console.log('Error:', result3.error);
} else {
  console.log('Unexpected success');
}
console.log('');

// Test 4: Missing item field (Phase 2 - should fail)
console.log('Test 4: Missing item field (Phase 2 validation)');
const missingItem = fs.readFileSync(path.join(__dirname, 'fixtures/missing-item.md'), 'utf-8');
const result4 = parseFrontmatter(missingItem);
console.log('Result:', !result4.success ? 'PASS ✅' : 'FAIL ❌');
if (!result4.success) {
  console.log('Error:', result4.error);
  console.log('Expected: "Missing required fields: item"');
} else {
  console.log('Unexpected success - validation not implemented yet');
}
console.log('');

// Test 5: Missing multiple fields (Phase 2 - should fail)
console.log('Test 5: Missing multiple fields (Phase 2 validation)');
const missingMultiple = fs.readFileSync(path.join(__dirname, 'fixtures/missing-multiple-fields.md'), 'utf-8');
const result5 = parseFrontmatter(missingMultiple);
console.log('Result:', !result5.success ? 'PASS ✅' : 'FAIL ❌');
if (!result5.success) {
  console.log('Error:', result5.error);
  console.log('Expected: "Missing required fields: type, status, priority, created, updated"');
} else {
  console.log('Unexpected success - validation not implemented yet');
}
console.log('');

// Test 6: Empty field value (Phase 2 - should fail)
console.log('Test 6: Empty field value (Phase 2 validation)');
const emptyField = fs.readFileSync(path.join(__dirname, 'fixtures/empty-field.md'), 'utf-8');
const result6 = parseFrontmatter(emptyField);
console.log('Result:', !result6.success ? 'PASS ✅' : 'FAIL ❌');
if (!result6.success) {
  console.log('Error:', result6.error);
  console.log('Expected: "Missing required fields: title"');
} else {
  console.log('Unexpected success - validation not implemented yet');
}
console.log('');

console.log('=== Test Complete ===');
