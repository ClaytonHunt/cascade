---
spec: S39
phase: 2
title: Validation and Error Handling
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 2: Validation and Error Handling

## Overview

Add comprehensive validation to ensure parsed frontmatter matches the schema requirements and provide detailed error messages to help users fix malformed files. This phase transforms the parser from basic extraction to a robust tool that catches data quality issues.

**What this phase accomplishes**:
- Validate all required fields are present
- Validate enum values (type, status, priority, estimate)
- Validate date format (YYYY-MM-DD)
- Validate item number format (P#, E#, F#, S#, B#)
- Provide specific error messages for each failure type
- Handle edge cases gracefully

**Philosophy**: Never crash the extension due to bad frontmatter. Always return clear error messages that guide users to fix issues.

## Prerequisites

- Phase 1 completed (parser.ts extracts and parses frontmatter)
- types.ts defines all interfaces
- js-yaml dependency installed

## Tasks

### Task 1: Validate Required Fields

**Objective**: Ensure all required frontmatter fields are present

**Required fields** (per docs/frontmatter-schema.md):
- `item` - Unique identifier
- `title` - Human-readable name
- `type` - Item type enum
- `status` - Lifecycle state enum
- `priority` - Importance level enum
- `created` - Creation date
- `updated` - Last modified date

**Implementation** (add to parser.ts):
```typescript
/**
 * Validates that all required frontmatter fields are present.
 *
 * @param obj - Parsed YAML object
 * @returns Array of missing field names (empty if all present)
 */
function validateRequiredFields(obj: any): string[] {
  const requiredFields = ['item', 'title', 'type', 'status', 'priority', 'created', 'updated'];
  const missingFields: string[] = [];

  for (const field of requiredFields) {
    if (!(field in obj) || obj[field] === null || obj[field] === undefined || obj[field] === '') {
      missingFields.push(field);
    }
  }

  return missingFields;
}
```

**Integration** (update parseFrontmatter()):
```typescript
export function parseFrontmatter(content: string): ParseResult {
  try {
    // ... existing extraction and YAML parsing ...

    // Validate required fields
    const missingFields = validateRequiredFields(frontmatter);
    if (missingFields.length > 0) {
      return {
        success: false,
        error: `Missing required fields: ${missingFields.join(', ')}`
      };
    }

    // Continue with additional validation...
```

**Edge cases:**
- Field exists but is empty string: Treated as missing
- Field exists but is null: Treated as missing
- Field exists but is undefined: Treated as missing

**Error message examples:**
- `Missing required fields: item, title`
- `Missing required fields: created`

---

### Task 2: Validate Type Enum

**Objective**: Ensure `type` field has valid enum value

**Valid values** (from types.ts):
- `project`, `epic`, `feature`, `story`, `bug`, `spec`, `phase`

**Implementation**:
```typescript
/**
 * Validates that type field matches allowed enum values.
 *
 * @param type - The type field value
 * @returns true if valid, false otherwise
 */
function isValidType(type: string): boolean {
  const validTypes = ['project', 'epic', 'feature', 'story', 'bug', 'spec', 'phase'];
  return validTypes.includes(type);
}
```

**Integration**:
```typescript
// After required fields validation...

// Validate type enum
if (!isValidType(frontmatter.type)) {
  return {
    success: false,
    error: `Invalid type value: "${frontmatter.type}". Must be one of: project, epic, feature, story, bug, spec, phase`
  };
}
```

**Case sensitivity**: Values are case-sensitive (`story` not `Story`)

---

### Task 3: Validate Status Enum

**Objective**: Ensure `status` field has valid enum value

**Valid values**:
- `Not Started`, `In Planning`, `Ready`, `In Progress`, `Blocked`, `Completed`

**Implementation**:
```typescript
/**
 * Validates that status field matches allowed enum values.
 *
 * @param status - The status field value
 * @returns true if valid, false otherwise
 */
function isValidStatus(status: string): boolean {
  const validStatuses = ['Not Started', 'In Planning', 'Ready', 'In Progress', 'Blocked', 'Completed'];
  return validStatuses.includes(status);
}
```

**Integration**:
```typescript
// Validate status enum
if (!isValidStatus(frontmatter.status)) {
  return {
    success: false,
    error: `Invalid status value: "${frontmatter.status}". Must be one of: Not Started, In Planning, Ready, In Progress, Blocked, Completed`
  };
}
```

**Note**: Status values have spaces and title case (`In Progress` not `in-progress`)

---

### Task 4: Validate Priority Enum

**Objective**: Ensure `priority` field has valid enum value

**Valid values**: `High`, `Medium`, `Low`

**Implementation**:
```typescript
/**
 * Validates that priority field matches allowed enum values.
 *
 * @param priority - The priority field value
 * @returns true if valid, false otherwise
 */
function isValidPriority(priority: string): boolean {
  const validPriorities = ['High', 'Medium', 'Low'];
  return validPriorities.includes(priority);
}
```

**Integration**:
```typescript
// Validate priority enum
if (!isValidPriority(frontmatter.priority)) {
  return {
    success: false,
    error: `Invalid priority value: "${frontmatter.priority}". Must be one of: High, Medium, Low`
  };
}
```

---

### Task 5: Validate Date Format

**Objective**: Ensure `created` and `updated` fields match YYYY-MM-DD format

**Format requirements**:
- ISO 8601 date format: YYYY-MM-DD
- Example: `2025-10-12`
- 4-digit year, 2-digit month, 2-digit day
- Separated by hyphens

**Implementation**:
```typescript
/**
 * Validates that a date string matches YYYY-MM-DD format.
 *
 * Does basic format check - does not validate calendar accuracy
 * (e.g., 2025-02-30 would pass format check but is invalid date)
 *
 * @param dateStr - The date string to validate
 * @returns true if format is YYYY-MM-DD, false otherwise
 */
function isValidDateFormat(dateStr: string): boolean {
  // Regex: 4 digits - 2 digits - 2 digits
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateStr);
}
```

**Integration**:
```typescript
// Validate date formats
if (!isValidDateFormat(frontmatter.created)) {
  return {
    success: false,
    error: `Invalid created date format: "${frontmatter.created}". Must be YYYY-MM-DD (e.g., 2025-10-12)`
  };
}

if (!isValidDateFormat(frontmatter.updated)) {
  return {
    success: false,
    error: `Invalid updated date format: "${frontmatter.updated}". Must be YYYY-MM-DD (e.g., 2025-10-12)`
  };
}
```

**Limitation**: This validates format only, not actual date validity (e.g., Feb 30th would pass). This is acceptable because:
- Manual edits are rare (most updates via commands)
- Format validation catches most typos
- Invalid dates don't break parsing, just display oddly

---

### Task 6: Validate Item Number Format

**Objective**: Ensure `item` field matches expected pattern

**Valid patterns**:
- `P#` - Project (e.g., P1, P2)
- `E#` - Epic (e.g., E1, E12)
- `F#` - Feature (e.g., F11, F20)
- `S#` - Story (e.g., S26, S39)
- `B#` - Bug (e.g., B1, B5)

**Implementation**:
```typescript
/**
 * Validates that item number matches expected pattern.
 *
 * Pattern: Single letter (P, E, F, S, B) followed by one or more digits
 *
 * @param item - The item number string
 * @returns true if valid format, false otherwise
 */
function isValidItemFormat(item: string): boolean {
  // Regex: P|E|F|S|B followed by one or more digits
  const itemRegex = /^[PEFSB]\d+$/;
  return itemRegex.test(item);
}
```

**Integration**:
```typescript
// Validate item number format
if (!isValidItemFormat(frontmatter.item)) {
  return {
    success: false,
    error: `Invalid item format: "${frontmatter.item}". Must match P#, E#, F#, S#, or B# (e.g., S39, F11, B1)`
  };
}
```

**Case sensitivity**: Letters must be uppercase (`S39` not `s39`)

---

### Task 7: Validate Optional Estimate Field

**Objective**: If `estimate` field is present, validate it's a valid enum value

**Valid values**: `XS`, `S`, `M`, `L`, `XL`

**Context**: Estimate is optional, but if present it must be valid (typically on stories/bugs)

**Implementation**:
```typescript
/**
 * Validates that estimate field (if present) matches allowed enum values.
 *
 * @param estimate - The estimate field value
 * @returns true if valid or undefined, false if invalid
 */
function isValidEstimate(estimate: string | undefined): boolean {
  if (estimate === undefined) {
    return true; // Optional field, undefined is valid
  }

  const validEstimates = ['XS', 'S', 'M', 'L', 'XL'];
  return validEstimates.includes(estimate);
}
```

**Integration**:
```typescript
// Validate optional estimate field
if (!isValidEstimate(frontmatter.estimate)) {
  return {
    success: false,
    error: `Invalid estimate value: "${frontmatter.estimate}". Must be one of: XS, S, M, L, XL`
  };
}
```

**Note**: Dependencies, spec, phase, phases fields don't need validation (any string/number is valid)

---

### Task 8: Handle Edge Cases

**Objective**: Ensure parser handles unusual but valid inputs gracefully

**Edge Case 1: Windows Line Endings (CRLF)**
- Files on Windows use `\r\n` instead of `\n`
- Regex already handles this: `\s*` matches `\r` characters
- Test with fixture file saved with CRLF

**Edge Case 2: Extra Whitespace**
- Spaces/tabs around delimiters: `---  \n` or `  ---\n`
- Regex handles: `\s*` matches any whitespace
- YAML parser ignores leading/trailing whitespace in values

**Edge Case 3: Unicode Characters**
- Title may contain non-ASCII characters: `title: "État du système"`
- js-yaml handles UTF-8 by default
- No special handling needed

**Edge Case 4: Empty Dependencies Array**
- Valid YAML: `dependencies: []`
- Parses to empty array (not undefined)
- No validation needed (empty array is valid)

**Edge Case 5: YAML Comments**
- YAML allows comments: `# This is a comment`
- js-yaml strips comments automatically
- No special handling needed

**Create edge case fixtures:**

`test/fixtures/crlf-lineendings.md` (save with CRLF):
```markdown
---
item: S99
title: Test CRLF
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.
```

`test/fixtures/unicode-title.md`:
```markdown
---
item: S98
title: État du Système (UTF-8)
type: story
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.
```

`test/fixtures/yaml-comments.md`:
```markdown
---
# Metadata for S97
item: S97
title: Test Comments
type: story # Story type
status: Ready
priority: High
created: 2025-10-12
updated: 2025-10-12
---

Content.
```

**Testing**: Parse each fixture and verify:
- CRLF: Parses successfully, no errors
- Unicode: Title field contains Unicode characters correctly
- Comments: Comments stripped, only field values remain

---

## Completion Criteria

This phase is complete when:

- ✅ Required field validation implemented and tested
- ✅ Type enum validation with clear error message
- ✅ Status enum validation with clear error message
- ✅ Priority enum validation with clear error message
- ✅ Date format validation (YYYY-MM-DD)
- ✅ Item number format validation (P#, E#, F#, S#, B#)
- ✅ Optional estimate field validation
- ✅ Edge cases handled (CRLF, Unicode, comments)
- ✅ All validation errors return ParseResult with specific error messages
- ✅ TypeScript compiles without errors
- ✅ No exceptions thrown (all errors gracefully returned)

**Testing validation:**
Create test fixtures for each validation case and verify correct error messages:
- Missing required field → "Missing required fields: item"
- Invalid type → "Invalid type value: 'foo'"
- Invalid status → "Invalid status value: 'done'"
- Invalid date → "Invalid created date format: '10/12/2025'"
- Invalid item → "Invalid item format: 'S'"

**Deliverable artifacts:**
- Updated `vscode-extension/src/parser.ts` with all validation functions
- Edge case fixtures in `test/fixtures/`
- All validation tested manually

## Next Phase

Proceed to **Phase 3: Testing and Integration** to:
- Create comprehensive unit test suite
- Test all success cases, error cases, and edge cases
- Verify performance meets < 10ms target
- Document parser API for integration with S40 (Cache Layer)
