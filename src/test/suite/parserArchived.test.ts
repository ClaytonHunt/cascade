import * as assert from 'assert';
import { parseFrontmatter } from '../../parser';

suite('Parser Test Suite - Archived Status', () => {
  test('parseFrontmatter - Should accept Archived status', () => {
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

    const result = parseFrontmatter(testContent);

    // Should successfully parse
    assert.strictEqual(result.success, true, 'Parser should accept Archived status');
    assert.ok(result.frontmatter, 'Frontmatter should be parsed');

    // Verify status field
    if (result.frontmatter) {
      assert.strictEqual(result.frontmatter.status, 'Archived', 'Status should be Archived');
      assert.strictEqual(result.frontmatter.item, 'S999', 'Item should be S999');
    }
  });
});
