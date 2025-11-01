// Standalone test for parser functionality
// Run with: node test/test-parser-standalone.js

const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Copy of parser logic for standalone testing
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

function parseFrontmatter(content) {
  try {
    // Extract frontmatter using regex
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      return {
        success: false,
        error: 'No frontmatter found (missing --- delimiters)'
      };
    }

    const yamlContent = match[1];

    // Parse YAML content
    let frontmatter;
    try {
      frontmatter = yaml.load(yamlContent);
    } catch (yamlError) {
      return {
        success: false,
        error: `Invalid YAML syntax: ${yamlError instanceof Error ? yamlError.message : 'Unknown YAML error'}`
      };
    }

    // Verify result is an object (not null, array, etc.)
    if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
      return {
        success: false,
        error: 'Frontmatter must be a YAML object (not array, null, or primitive)'
      };
    }

    // Success - return parsed frontmatter
    return {
      success: true,
      frontmatter: frontmatter
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}

// Run tests
console.log('=== Parser Standalone Test ===\n');

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

// Summary
const passed = [result1.success, !result2.success, !result3.success].filter(Boolean).length;
const total = 3;
console.log('=== Test Summary ===');
console.log(`Passed: ${passed}/${total}`);
console.log(passed === total ? '✅ All tests passed!' : '❌ Some tests failed');
