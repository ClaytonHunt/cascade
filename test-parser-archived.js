/**
 * RED Phase Test: Verify parser REJECTS "Archived" status (before implementation)
 *
 * This test should FAIL with current implementation.
 * After implementing Archived status, this test should PASS.
 */

const fs = require('fs');
const path = require('path');

// Read the parser module (will compile TypeScript first)
const testContent = `---
item: S999
title: Test Archived Item
type: story
status: Archived
priority: Medium
created: 2025-10-23
updated: 2025-10-23
---

# S999 - Test Archived Item
Test content.
`;

console.log('RED PHASE: Testing parser with Archived status...');
console.log('Expected behavior: Parser should REJECT Archived status');
console.log('');
console.log('Test content:');
console.log(testContent);
console.log('');
console.log('This test will be run after compilation.');
console.log('Expected result: FAIL (parser rejects Archived)');
console.log('After implementation: PASS (parser accepts Archived)');
