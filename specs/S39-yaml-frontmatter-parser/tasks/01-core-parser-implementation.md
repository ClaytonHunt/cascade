---
spec: S39
phase: 1
title: Core Parser Implementation
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 1: Core Parser Implementation

## Overview

Implement the foundational parser module that extracts YAML frontmatter from markdown files and parses it into TypeScript objects. This phase focuses on the happy path - successfully extracting and parsing valid frontmatter.

**What this phase accomplishes**:
- Install js-yaml dependency for YAML parsing
- Define TypeScript interfaces matching frontmatter schema
- Create parser module with regex-based extraction
- Integrate js-yaml for YAML parsing
- Handle basic success and failure cases

**Key architectural decision**: Parser is a pure function taking content string (not file path), making it easy to test without filesystem mocking.

## Prerequisites

- S36 (Extension Project Scaffold) - Extension structure exists
- S37 (Workspace Activation Logic) - Extension activates correctly
- Frontmatter schema documentation available (`docs/frontmatter-schema.md`)

## Tasks

### Task 1: Install js-yaml Dependency

**Objective**: Add js-yaml library and TypeScript type definitions to project

**Steps:**
1. Navigate to `vscode-extension/` directory
2. Install runtime dependency: `npm install --save js-yaml@^4.1.0`
3. Install type definitions: `npm install --save-dev @types/js-yaml@^4.0.5`
4. Verify installation: `npm list js-yaml` should show js-yaml@4.1.0 or similar

**Expected package.json changes:**
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5",
    // ... existing devDependencies
  }
}
```

**Validation:**
- `node_modules/js-yaml/` directory exists
- TypeScript recognizes `import * as yaml from 'js-yaml';` without errors

**Documentation:**
- js-yaml GitHub: https://github.com/nodeca/js-yaml
- npm package: https://www.npmjs.com/package/js-yaml
- API docs: https://github.com/nodeca/js-yaml#api

---

### Task 2: Create TypeScript Interfaces

**Objective**: Define type-safe interfaces matching frontmatter schema

**File**: Create `vscode-extension/src/types.ts`

**Implementation:**
```typescript
/**
 * TypeScript interfaces for frontmatter metadata.
 * Matches schema defined in docs/frontmatter-schema.md
 */

/**
 * Item type enum - categorizes planning hierarchy
 */
export type ItemType = 'project' | 'epic' | 'feature' | 'story' | 'bug' | 'spec' | 'phase';

/**
 * Status enum - tracks item lifecycle state
 */
export type Status = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed';

/**
 * Priority enum - indicates importance/urgency
 */
export type Priority = 'High' | 'Medium' | 'Low';

/**
 * Estimate enum - t-shirt sizing for stories/bugs
 */
export type Estimate = 'XS' | 'S' | 'M' | 'L' | 'XL';

/**
 * Frontmatter metadata extracted from markdown files.
 *
 * All planning and specification files use YAML frontmatter with this structure.
 * Required fields must be present for parsing to succeed.
 * Optional fields may be present depending on item type.
 */
export interface Frontmatter {
  // ===== Required Fields (all item types) =====

  /** Unique identifier (P1, E2, F11, S36, B1) */
  item: string;

  /** Human-readable title */
  title: string;

  /** Item type for categorization */
  type: ItemType;

  /** Current lifecycle state */
  status: Status;

  /** Importance/urgency level */
  priority: Priority;

  /** Creation date (YYYY-MM-DD) */
  created: string;

  /** Last modified date (YYYY-MM-DD) */
  updated: string;

  // ===== Optional Fields =====

  /** Item numbers this depends on (e.g., [S26, F11] or []) */
  dependencies?: string[];

  /** Size/complexity estimate (stories/bugs only) */
  estimate?: Estimate;

  /** Reference to spec directory or parent spec number */
  spec?: string;

  /** Phase sequence number (phase files only) */
  phase?: number;

  /** Total phases in spec (spec plan.md only) */
  phases?: number;
}

/**
 * Result of parsing frontmatter from markdown content.
 *
 * Success case includes parsed frontmatter object.
 * Failure case includes error message explaining what went wrong.
 */
export interface ParseResult {
  /** Whether parsing succeeded */
  success: boolean;

  /** Parsed frontmatter (only present if success=true) */
  frontmatter?: Frontmatter;

  /** Error message (only present if success=false) */
  error?: string;
}
```

**Key design notes:**
- Use `type` for enums (more flexible than `enum` keyword)
- Required fields have no `?` (TypeScript enforces presence)
- Optional fields use `?:` notation
- JSDoc comments explain each field's purpose
- Matches docs/frontmatter-schema.md exactly

**Validation:**
- TypeScript compiles without errors
- Importing types in other files works: `import { Frontmatter, ParseResult } from './types';`

**File Reference**: vscode-extension/src/types.ts (new file)

---

### Task 3: Create Parser Module Structure

**Objective**: Set up parser module with main function signature and basic structure

**File**: Create `vscode-extension/src/parser.ts`

**Initial Structure:**
```typescript
import * as yaml from 'js-yaml';
import { Frontmatter, ParseResult } from './types';

/**
 * Extracts and parses YAML frontmatter from markdown content.
 *
 * Frontmatter must be enclosed in triple-dash delimiters (---) at the start of the file.
 * Example:
 * ```
 * ---
 * item: S39
 * title: YAML Frontmatter Parser
 * type: story
 * status: Ready
 * priority: High
 * created: 2025-10-12
 * updated: 2025-10-12
 * ---
 *
 * # S39 - YAML Frontmatter Parser
 * ...
 * ```
 *
 * @param content - The full markdown file content as a string
 * @returns ParseResult with success flag, frontmatter data, or error message
 *
 * @example
 * ```typescript
 * const content = await fs.readFile('plans/story-39.md', 'utf-8');
 * const result = parseFrontmatter(content);
 *
 * if (result.success) {
 *   console.log(`Item: ${result.frontmatter.item}`);
 *   console.log(`Status: ${result.frontmatter.status}`);
 * } else {
 *   console.error(`Parse error: ${result.error}`);
 * }
 * ```
 */
export function parseFrontmatter(content: string): ParseResult {
  // Implementation in next tasks
  return { success: false, error: 'Not implemented' };
}
```

**Key design decisions:**
- Pure function: Takes content string, returns result object
- No side effects: Doesn't read files or modify state
- No exceptions: Always returns ParseResult (never throws)
- Comprehensive JSDoc: Explains usage with examples

**Validation:**
- TypeScript compiles
- Can import and call function (will return "Not implemented" for now)

**File Reference**: vscode-extension/src/parser.ts (new file)

---

### Task 4: Implement Frontmatter Extraction with Regex

**Objective**: Extract YAML content between --- delimiters using regex

**Implementation** (add to parser.ts):
```typescript
/**
 * Regular expression to extract frontmatter from markdown.
 *
 * Pattern breakdown:
 * - ^---\s*\n: Opening delimiter at start of file
 * - ([\s\S]*?): Capture group for YAML content (non-greedy)
 * - \n---\s*\n: Closing delimiter
 *
 * Handles both LF (\n) and CRLF (\r\n) line endings.
 */
const FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n/;

export function parseFrontmatter(content: string): ParseResult {
  try {
    // Extract frontmatter using regex
    const match = content.match(FRONTMATTER_REGEX);

    if (!match) {
      return {
        success: false,
        error: 'No frontmatter found (missing --- delimiters)'
      };
    }

    // Extract YAML content (first capture group)
    const yamlContent = match[1];

    // Implementation continues in next task...

    return { success: false, error: 'Parsing not implemented' };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}
```

**Regex Explanation:**
- `^`: Must start at beginning of string (no content before ---)
- `---\s*\n`: Opening delimiter with optional whitespace
- `([\s\S]*?)`: Capture group matching any characters (including newlines), non-greedy
- `\n---\s*\n`: Closing delimiter with newlines

**Why non-greedy `*?`**: Ensures match stops at first closing `---`, not last one

**Edge cases handled:**
- Missing opening delimiter: Regex won't match
- Missing closing delimiter: Regex won't match
- Extra whitespace around delimiters: `\s*` handles spaces/tabs

**Validation:**
- Test with valid frontmatter: `match` is truthy
- Test without delimiters: Returns error
- Test with only opening delimiter: Returns error

---

### Task 5: Integrate js-yaml for YAML Parsing

**Objective**: Parse extracted YAML content into JavaScript object

**Implementation** (complete parser.ts):
```typescript
export function parseFrontmatter(content: string): ParseResult {
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
    let frontmatter: any;
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
    // Note: Type validation happens in Phase 2
    return {
      success: true,
      frontmatter: frontmatter as Frontmatter
    };
  } catch (error) {
    return {
      success: false,
      error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown'}`
    };
  }
}
```

**js-yaml.load() behavior:**
- Parses YAML string to JavaScript object
- Throws exception on syntax errors (we catch this)
- Handles YAML comments (`#`) automatically
- Converts YAML types to JavaScript types (strings, numbers, arrays, objects)

**Error handling layers:**
1. **Outer try/catch**: Catches unexpected errors (safety net)
2. **Inner try/catch**: Catches YAML syntax errors (specific error message)
3. **Type check**: Ensures result is object, not array/null/primitive

**Type assertion note:**
- `as Frontmatter` tells TypeScript this is Frontmatter type
- Phase 2 will add validation to ensure this is safe
- For now, we trust YAML structure matches interface

**Validation:**
- Parse valid frontmatter: Returns success with frontmatter object
- Parse malformed YAML: Returns error with YAML error message
- Parse empty frontmatter: Returns error (not an object)

---

### Task 6: Test Basic Functionality

**Objective**: Verify parser works with simple success/failure cases

**Create test file**: `vscode-extension/test/fixtures/valid-simple.md`
```markdown
---
item: S39
title: Test Story
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# S39 - Test Story

Test content.
```

**Create test file**: `vscode-extension/test/fixtures/no-frontmatter.md`
```markdown
# Test File

No frontmatter here.
```

**Manual testing** (in extension.ts or test file):
```typescript
import { parseFrontmatter } from './parser';
import * as fs from 'fs';

// Test 1: Valid frontmatter
const validContent = fs.readFileSync('test/fixtures/valid-simple.md', 'utf-8');
const result1 = parseFrontmatter(validContent);
console.log('Test 1:', result1.success ? 'PASS' : 'FAIL', result1);

// Test 2: No frontmatter
const noFrontmatter = fs.readFileSync('test/fixtures/no-frontmatter.md', 'utf-8');
const result2 = parseFrontmatter(noFrontmatter);
console.log('Test 2:', result2.success ? 'FAIL' : 'PASS', result2);

// Test 3: Inline test - malformed YAML
const malformed = '---\nitem: S39\ntitle missing colon\n---\n';
const result3 = parseFrontmatter(malformed);
console.log('Test 3:', result3.success ? 'FAIL' : 'PASS', result3);
```

**Expected Results:**
- Test 1: `success: true`, frontmatter object populated
- Test 2: `success: false`, error: "No frontmatter found"
- Test 3: `success: false`, error: "Invalid YAML syntax: ..."

**Validation:**
- All 3 tests produce expected results
- No exceptions thrown
- Error messages are clear and actionable

---

## Completion Criteria

This phase is complete when:

- ✅ js-yaml dependency installed and TypeScript types available
- ✅ types.ts defines all required interfaces (Frontmatter, ParseResult, enums)
- ✅ parser.ts exports parseFrontmatter() function
- ✅ Regex successfully extracts frontmatter from valid markdown
- ✅ js-yaml successfully parses YAML into JavaScript object
- ✅ Function returns ParseResult with success/error states
- ✅ Basic manual tests pass (valid, missing, malformed)
- ✅ TypeScript compiles without errors
- ✅ No exceptions thrown (all errors returned as ParseResult.error)

**Deliverable artifacts:**
- `vscode-extension/src/types.ts` - Type definitions
- `vscode-extension/src/parser.ts` - Core parser implementation
- `vscode-extension/test/fixtures/valid-simple.md` - Test fixture
- `vscode-extension/test/fixtures/no-frontmatter.md` - Test fixture
- `vscode-extension/package.json` - Updated with js-yaml dependency

**Not included in Phase 1** (deferred to Phase 2):
- Field validation (required fields, enum values, date format)
- Comprehensive error messages
- Edge case handling (CRLF, Unicode, etc.)

## Next Phase

Proceed to **Phase 2: Validation and Error Handling** to add:
- Required field validation
- Enum value validation
- Date format validation
- Item number format validation
- Comprehensive error messages for debugging
