---
spec: S39
phase: 3
title: Testing and Integration
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 3: Testing and Integration

## Overview

Create a comprehensive unit test suite to verify the parser works correctly in all scenarios - success cases, error cases, and edge cases. This phase ensures the parser is production-ready and meets the < 10ms performance target.

**What this phase accomplishes**:
- Comprehensive test fixtures covering all scenarios
- Unit tests for success cases (valid frontmatter)
- Unit tests for error cases (validation failures)
- Unit tests for edge cases (CRLF, Unicode, etc.)
- Performance verification (< 10ms target)
- Integration testing with real plan/spec files
- API documentation for future integration

**Testing philosophy**: Test as close to real usage as possible. Use actual markdown files as fixtures, not constructed strings (except where needed for malformed input).

## Prerequisites

- Phase 1 completed (core parser implementation)
- Phase 2 completed (validation and error handling)
- All validation functions implemented
- TypeScript compiles without errors

## Tasks

### Task 1: Create Test Fixture Library

**Objective**: Build comprehensive set of markdown files for testing all scenarios

**Directory structure:**
```
vscode-extension/test/fixtures/
├── valid-story.md          # Complete story with all fields
├── valid-epic.md           # Epic (no estimate field)
├── valid-spec.md           # Spec plan with phases field
├── valid-phase.md          # Phase with phase number
├── minimal.md              # Only required fields
├── empty-dependencies.md   # dependencies: []
├── no-frontmatter.md       # Missing delimiters
├── no-closing.md           # Only opening ---
├── malformed-yaml.md       # YAML syntax error
├── missing-item.md         # Missing required field
├── missing-multiple.md     # Missing several fields
├── invalid-type.md         # type: foo
├── invalid-status.md       # status: done
├── invalid-priority.md     # priority: urgent
├── invalid-date.md         # created: 10/12/2025
├── invalid-item.md         # item: S
├── invalid-estimate.md     # estimate: XXL
├── crlf-lineendings.md     # Windows CRLF
├── unicode-title.md        # UTF-8 characters
└── yaml-comments.md        # YAML comments
```

**Implementation**:

`test/fixtures/valid-story.md`:
```markdown
---
item: S100
title: Complete Story Example
type: story
status: Ready
priority: High
dependencies: [S98, S99]
estimate: M
spec: specs/S100-complete-story/
created: 2025-10-12
updated: 2025-10-12
---

# S100 - Complete Story Example

This is a test story with all possible fields.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
```

`test/fixtures/valid-epic.md`:
```markdown
---
item: E10
title: Test Epic
type: epic
status: In Planning
priority: Medium
dependencies: []
created: 2025-10-10
updated: 2025-10-12
---

# E10 - Test Epic

Epic content here.
```

`test/fixtures/valid-spec.md`:
```markdown
---
spec: S100
title: Complete Story Example
type: spec
status: Not Started
priority: High
phases: 3
created: 2025-10-12
updated: 2025-10-12
---

# S100 - Complete Story Example

## Implementation Strategy
...
```

`test/fixtures/valid-phase.md`:
```markdown
---
spec: S100
phase: 1
title: Core Implementation
type: phase
status: Not Started
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 1: Core Implementation

## Tasks
...
```

`test/fixtures/minimal.md`:
```markdown
---
item: S101
title: Minimal Example
type: story
status: Not Started
priority: Low
created: 2025-10-12
updated: 2025-10-12
---

# S101 - Minimal Example

Only required fields.
```

`test/fixtures/no-frontmatter.md`:
```markdown
# Regular Markdown File

No frontmatter here.
```

`test/fixtures/malformed-yaml.md`:
```markdown
---
item: S102
title no colon here
type: story
---

Bad YAML syntax.
```

`test/fixtures/missing-item.md`:
```markdown
---
title: Missing Item Number
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.
```

`test/fixtures/invalid-type.md`:
```markdown
---
item: S103
title: Invalid Type
type: task
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.
```

**Total fixtures**: 20 files covering all scenarios

---

### Task 2: Set Up Test Infrastructure

**Objective**: Configure testing framework (if not already set up)

**Option A: Using Node.js built-in test runner (simple)**
```typescript
// vscode-extension/test/parser.test.ts
import { parseFrontmatter } from '../src/parser';
import * as fs from 'fs';
import * as path from 'path';
import { strict as assert } from 'assert';

/**
 * Helper function to load fixture content
 */
function loadFixture(filename: string): string {
  const fixturePath = path.join(__dirname, 'fixtures', filename);
  return fs.readFileSync(fixturePath, 'utf-8');
}

// Test structure
describe('parseFrontmatter', () => {
  // Tests will be added in next tasks
});
```

**Option B: Using Jest (if preferred)**
```bash
npm install --save-dev jest @types/jest ts-jest
```

**For this spec, use Option A (Node.js built-in)** to minimize dependencies.

**File location**: `vscode-extension/test/parser.test.ts`

---

### Task 3: Write Success Case Tests

**Objective**: Verify parser correctly handles valid frontmatter

**Implementation**:
```typescript
describe('parseFrontmatter - Success Cases', () => {
  test('parses complete story frontmatter', () => {
    const content = loadFixture('valid-story.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.item, 'S100');
    assert.equal(result.frontmatter.title, 'Complete Story Example');
    assert.equal(result.frontmatter.type, 'story');
    assert.equal(result.frontmatter.status, 'Ready');
    assert.equal(result.frontmatter.priority, 'High');
    assert.deepEqual(result.frontmatter.dependencies, ['S98', 'S99']);
    assert.equal(result.frontmatter.estimate, 'M');
    assert.equal(result.frontmatter.spec, 'specs/S100-complete-story/');
    assert.equal(result.frontmatter.created, '2025-10-12');
    assert.equal(result.frontmatter.updated, '2025-10-12');
  });

  test('parses epic frontmatter (no estimate)', () => {
    const content = loadFixture('valid-epic.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.item, 'E10');
    assert.equal(result.frontmatter.type, 'epic');
    assert.equal(result.frontmatter.estimate, undefined);
  });

  test('parses spec plan frontmatter (with phases)', () => {
    const content = loadFixture('valid-spec.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.spec, 'S100');
    assert.equal(result.frontmatter.phases, 3);
  });

  test('parses phase frontmatter (with phase number)', () => {
    const content = loadFixture('valid-phase.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.spec, 'S100');
    assert.equal(result.frontmatter.phase, 1);
  });

  test('parses minimal frontmatter (only required fields)', () => {
    const content = loadFixture('minimal.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.dependencies, undefined);
    assert.equal(result.frontmatter.estimate, undefined);
  });

  test('parses empty dependencies array', () => {
    const content = loadFixture('empty-dependencies.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.deepEqual(result.frontmatter.dependencies, []);
  });
});
```

**Expected results**: All tests pass (6 success case tests)

---

### Task 4: Write Error Case Tests

**Objective**: Verify parser correctly handles validation failures

**Implementation**:
```typescript
describe('parseFrontmatter - Error Cases', () => {
  test('returns error for missing frontmatter', () => {
    const content = loadFixture('no-frontmatter.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('No frontmatter found'));
  });

  test('returns error for malformed YAML', () => {
    const content = loadFixture('malformed-yaml.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid YAML syntax'));
  });

  test('returns error for missing required field', () => {
    const content = loadFixture('missing-item.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Missing required fields'));
    assert.ok(result.error.includes('item'));
  });

  test('returns error for invalid type enum', () => {
    const content = loadFixture('invalid-type.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid type value'));
  });

  test('returns error for invalid status enum', () => {
    const content = loadFixture('invalid-status.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid status value'));
  });

  test('returns error for invalid priority enum', () => {
    const content = loadFixture('invalid-priority.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid priority value'));
  });

  test('returns error for invalid date format', () => {
    const content = loadFixture('invalid-date.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid created date format'));
  });

  test('returns error for invalid item format', () => {
    const content = loadFixture('invalid-item.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid item format'));
  });

  test('returns error for invalid estimate', () => {
    const content = loadFixture('invalid-estimate.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('Invalid estimate value'));
  });
});
```

**Expected results**: All tests pass (9 error case tests)

---

### Task 5: Write Edge Case Tests

**Objective**: Verify parser handles unusual but valid inputs

**Implementation**:
```typescript
describe('parseFrontmatter - Edge Cases', () => {
  test('handles Windows CRLF line endings', () => {
    const content = loadFixture('crlf-lineendings.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.item, 'S99');
  });

  test('handles Unicode characters in title', () => {
    const content = loadFixture('unicode-title.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.ok(result.frontmatter.title.includes('État'));
  });

  test('handles YAML comments', () => {
    const content = loadFixture('yaml-comments.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    // Comments should be stripped, only values remain
    assert.equal(result.frontmatter.item, 'S97');
  });

  test('handles empty file', () => {
    const result = parseFrontmatter('');

    assert.equal(result.success, false);
    assert.ok(result.error);
    assert.ok(result.error.includes('No frontmatter found'));
  });

  test('handles only opening delimiter', () => {
    const content = loadFixture('no-closing.md');
    const result = parseFrontmatter(content);

    assert.equal(result.success, false);
    assert.ok(result.error);
  });
});
```

**Expected results**: All tests pass (5 edge case tests)

---

### Task 6: Performance Testing

**Objective**: Verify parser meets < 10ms performance target

**Implementation**:
```typescript
describe('parseFrontmatter - Performance', () => {
  test('parses typical frontmatter in < 10ms', () => {
    const content = loadFixture('valid-story.md');

    const iterations = 100;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      parseFrontmatter(content);
    }

    const end = performance.now();
    const avgTime = (end - start) / iterations;

    console.log(`Average parse time: ${avgTime.toFixed(2)}ms`);
    assert.ok(avgTime < 10, `Parse time ${avgTime}ms exceeds 10ms target`);
  });

  test('handles large frontmatter efficiently', () => {
    // Create frontmatter with many dependencies
    const largeFrontmatter = `---
item: S104
title: Large Frontmatter Test
type: story
status: Ready
priority: High
dependencies: [S1, S2, S3, S4, S5, S6, S7, S8, S9, S10, S11, S12, S13, S14, S15]
estimate: L
created: 2025-10-12
updated: 2025-10-12
---

Content.`;

    const start = performance.now();
    const result = parseFrontmatter(largeFrontmatter);
    const end = performance.now();

    assert.equal(result.success, true);
    assert.ok((end - start) < 10, `Large parse time ${end - start}ms exceeds 10ms`);
  });
});
```

**Expected results**:
- Average parse time: 2-5ms (well under 10ms target)
- Large frontmatter: < 10ms

**Note**: Performance may vary by machine, but should comfortably be under 10ms

---

### Task 7: Integration Testing with Real Files

**Objective**: Verify parser works with actual plan and spec files

**Implementation**:
```typescript
describe('parseFrontmatter - Integration with Real Files', () => {
  test('parses story-39 (this story)', () => {
    const filePath = path.join(__dirname, '../../../plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/story-39-yaml-frontmatter-parser.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const result = parseFrontmatter(content);

    assert.equal(result.success, true);
    assert.ok(result.frontmatter);
    assert.equal(result.frontmatter.item, 'S39');
    assert.equal(result.frontmatter.title, 'YAML Frontmatter Parser');
    assert.equal(result.frontmatter.type, 'story');
  });

  test('parses existing spec file', () => {
    // Try to parse this spec's plan.md
    const filePath = path.join(__dirname, '../../specs/S39-yaml-frontmatter-parser/plan.md');
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const result = parseFrontmatter(content);

      assert.equal(result.success, true);
      assert.ok(result.frontmatter);
      assert.equal(result.frontmatter.spec, 'S39');
    }
  });

  test('parses multiple plan files', () => {
    const plansDir = path.join(__dirname, '../../../plans');
    const files = findMarkdownFiles(plansDir);

    let successCount = 0;
    let failCount = 0;

    for (const file of files.slice(0, 10)) { // Test first 10 files
      const content = fs.readFileSync(file, 'utf-8');
      const result = parseFrontmatter(content);

      if (result.success) {
        successCount++;
      } else {
        failCount++;
        console.log(`Failed to parse ${file}: ${result.error}`);
      }
    }

    console.log(`Parsed ${successCount} files successfully, ${failCount} failed`);
    // Most files should parse successfully
    assert.ok(successCount > failCount);
  });
});

// Helper function to find markdown files recursively
function findMarkdownFiles(dir: string): string[] {
  const files: string[] = [];
  const items = fs.readdirSync(dir);

  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findMarkdownFiles(fullPath));
    } else if (item.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}
```

**Expected results**:
- S39 story file parses successfully
- Spec plan.md (if exists) parses successfully
- Most plan files parse successfully (any failures indicate schema violations)

---

### Task 8: Document Parser API

**Objective**: Create usage documentation for future integration

**Create**: `vscode-extension/src/parser.md` (or add to README)
```markdown
# Frontmatter Parser API

## Overview

The frontmatter parser extracts and validates YAML metadata from markdown files
in the plans/ and specs/ directories.

## Usage

```typescript
import { parseFrontmatter } from './parser';
import { Frontmatter, ParseResult } from './types';
import * as fs from 'fs';

// Read file content
const content = fs.readFileSync('plans/story-39.md', 'utf-8');

// Parse frontmatter
const result: ParseResult = parseFrontmatter(content);

// Check result
if (result.success) {
  const fm: Frontmatter = result.frontmatter!;
  console.log(`Item: ${fm.item}`);
  console.log(`Title: ${fm.title}`);
  console.log(`Status: ${fm.status}`);
  console.log(`Dependencies: ${fm.dependencies?.join(', ') || 'none'}`);
} else {
  console.error(`Parse error: ${result.error}`);
}
```

## API Reference

### `parseFrontmatter(content: string): ParseResult`

Extracts and parses YAML frontmatter from markdown content.

**Parameters:**
- `content` - Full markdown file content as string (not file path)

**Returns:**
- `ParseResult` object with:
  - `success: boolean` - Whether parsing succeeded
  - `frontmatter?: Frontmatter` - Parsed metadata (if success=true)
  - `error?: string` - Error message (if success=false)

**Performance:**
- Typical parse time: 2-5ms
- Guaranteed: < 10ms

**Error Handling:**
- Never throws exceptions
- Returns detailed error messages:
  - `No frontmatter found` - Missing --- delimiters
  - `Invalid YAML syntax: {msg}` - Malformed YAML
  - `Missing required fields: {fields}` - Incomplete frontmatter
  - `Invalid {field} value: {value}` - Bad enum value

### Frontmatter Interface

See `src/types.ts` for complete interface definition.

**Required fields:**
- `item` - Unique identifier (P#, E#, F#, S#, B#)
- `title` - Human-readable name
- `type` - Item type enum
- `status` - Lifecycle state enum
- `priority` - Importance level enum
- `created` - Creation date (YYYY-MM-DD)
- `updated` - Last modified date (YYYY-MM-DD)

**Optional fields:**
- `dependencies` - Array of item numbers
- `estimate` - Size estimate (XS/S/M/L/XL)
- `spec` - Spec reference
- `phase` - Phase number
- `phases` - Total phases

## Integration Points

**S40 (Cache Layer):**
```typescript
async function getCachedFrontmatter(filePath: string): Promise<Frontmatter | null> {
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const result = parseFrontmatter(content);

  if (result.success) {
    cache.set(filePath, result.frontmatter!);
    return result.frontmatter!;
  }

  return null;
}
```

**S38 (File Watcher):**
```typescript
watcher.onDidChange((uri) => {
  cache.invalidate(uri.fsPath);
  // Re-parse happens on next cache access
});
```

## Testing

Run tests: `npm test` (or your test command)

Test coverage:
- 6 success cases
- 9 error cases
- 5 edge cases
- 2 performance tests
- 3 integration tests

## See Also

- Frontmatter Schema: `docs/frontmatter-schema.md`
- Type Definitions: `src/types.ts`
- Test Fixtures: `test/fixtures/`
```

---

## Completion Criteria

This phase is complete when:

- ✅ 20+ test fixtures created covering all scenarios
- ✅ Test infrastructure set up (parser.test.ts)
- ✅ 6 success case tests passing
- ✅ 9 error case tests passing
- ✅ 5 edge case tests passing
- ✅ Performance tests verify < 10ms target
- ✅ Integration tests with real plan/spec files passing
- ✅ All tests pass (25+ total tests)
- ✅ Parser API documented
- ✅ Ready for integration with S40 (Cache Layer)

**Testing summary:**
```
Test Suites: 5 passed, 5 total
Tests:       25 passed, 25 total
Time:        < 1s
```

**Deliverable artifacts:**
- `vscode-extension/test/fixtures/` - 20 test fixtures
- `vscode-extension/test/parser.test.ts` - Complete test suite
- `vscode-extension/src/parser.md` - API documentation
- All tests passing
- Performance verified (< 10ms)

## Story Completion

After Phase 3 is complete, all acceptance criteria for **S39 - YAML Frontmatter Parser** are met:

- ✅ Parser extracts YAML frontmatter from markdown files
- ✅ Parses all required frontmatter fields
- ✅ Parses optional frontmatter fields
- ✅ Handles Windows line endings (CRLF) correctly
- ✅ Returns structured TypeScript interface
- ✅ Validates frontmatter structure (delimiters)
- ✅ Handles malformed YAML gracefully
- ✅ Handles missing frontmatter gracefully
- ✅ Parser is testable (pure function)
- ✅ Performance: < 10ms on average

## Next Steps After S39 Completion

With S39 complete, the parser is ready for:

1. **Update S39 story status**: Mark as "Completed" in plans/
2. **Update S36 epic status**: Check if epic is complete
3. **Implement S40 next**: Frontmatter Cache Layer (uses this parser)
4. **Then implement S38**: File System Watcher (triggers cache invalidation)
5. **Finally implement F12/F13**: Status Visualization (consumes cached data)

**Testing recommendation:**
- Run parser against all existing plan and spec files
- Fix any frontmatter issues discovered (most likely manual edit errors)
- Verify parser performance on large codebases (100+ files)

**Documentation update:**
- Add parser to extension README
- Document parser module in architecture docs
- Update S40 spec to reference parser API
