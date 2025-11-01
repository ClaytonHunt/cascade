# Frontmatter Parser API Documentation

## Overview

The frontmatter parser extracts and validates YAML metadata from markdown files in the `plans/` and `specs/` directories. It provides robust parsing with comprehensive validation and graceful error handling.

**Module**: `src/parser.ts`
**Dependencies**: `js-yaml ^4.1.0`
**Performance**: < 10ms per parse (typically 2-5ms)

## Quick Start

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
- `content` (string) - Full markdown file content (not file path)

**Returns:** `ParseResult` object with:
- `success` (boolean) - Whether parsing succeeded
- `frontmatter?` (Frontmatter) - Parsed metadata (if success=true)
- `error?` (string) - Error message (if success=false)

**Performance:**
- Typical: 2-5ms
- Guaranteed: < 10ms
- Large frontmatter (20+ dependencies): < 10ms

**Error Handling:**
- Never throws exceptions
- Returns detailed error messages for debugging
- Allows application to continue even with malformed files

**Example:**
```typescript
const result = parseFrontmatter(markdownContent);

if (!result.success) {
  console.error('Parse failed:', result.error);
  // Continue with fallback logic
}
```

## Type Definitions

### Frontmatter Interface

Complete interface exported from `src/types.ts`:

```typescript
interface Frontmatter {
  // Required fields (all item types)
  item: string;              // P1, E2, F11, S36, B1
  title: string;
  type: ItemType;
  status: StatusType;
  priority: PriorityType;
  created: string | Date;    // YYYY-MM-DD (may be parsed as Date)
  updated: string | Date;    // YYYY-MM-DD (may be parsed as Date)

  // Optional fields
  dependencies?: string[];   // [S26, F11] or []
  estimate?: EstimateType;   // XS, S, M, L, XL
  spec?: string;             // Story reference or path
  phase?: number;            // Phase files only
  phases?: number;           // Spec plan.md only
}
```

### Enum Types

```typescript
type ItemType = 'project' | 'epic' | 'feature' | 'story' | 'bug' | 'spec' | 'phase';
type StatusType = 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed';
type PriorityType = 'High' | 'Medium' | 'Low';
type EstimateType = 'XS' | 'S' | 'M' | 'L' | 'XL';
```

### ParseResult Interface

```typescript
interface ParseResult {
  success: boolean;
  frontmatter?: Frontmatter;
  error?: string;
}
```

## Error Messages

The parser returns specific error messages for each failure type:

| Error | Cause | Example |
|-------|-------|---------|
| `No frontmatter found (missing --- delimiters)` | File missing frontmatter block | Regular markdown file |
| `Invalid YAML syntax: {message}` | Malformed YAML | Missing colon, bad indentation |
| `Missing required fields: {fields}` | Incomplete frontmatter | Missing `item` or `title` |
| `Invalid type value: "{value}"` | Bad enum value | `type: task` instead of `story` |
| `Invalid status value: "{value}"` | Bad enum value | `status: done` instead of `Completed` |
| `Invalid priority value: "{value}"` | Bad enum value | `priority: urgent` instead of `High` |
| `Invalid created date format: "{value}"` | Wrong date format | `10/12/2025` instead of `2025-10-12` |
| `Invalid item format: "{value}"` | Wrong item format | `story-46` instead of `S46` |
| `Invalid estimate value: "{value}"` | Bad enum value | `estimate: XXL` instead of `XL` |
| `Frontmatter must be a YAML object` | Invalid YAML type | Array or primitive instead of object |
| `Unexpected error: {message}` | Unknown error | Rare edge cases |

## Validation Rules

### Required Fields

All item types must have:
- `item` - Unique identifier (P#, E#, F#, S#, B#)
- `title` - Human-readable name
- `type` - Item type enum
- `status` - Lifecycle state enum
- `priority` - Importance level enum
- `created` - Creation date (YYYY-MM-DD)
- `updated` - Last modified date (YYYY-MM-DD)

### Enum Validation

**Type values:**
- `project`, `epic`, `feature`, `story`, `bug`, `spec`, `phase`

**Status values:**
- `Not Started`, `In Planning`, `Ready`, `In Progress`, `Blocked`, `Completed`
- Case-sensitive! `Ready` not `ready`

**Priority values:**
- `High`, `Medium`, `Low`
- Case-sensitive!

**Estimate values (optional):**
- `XS`, `S`, `M`, `L`, `XL`

### Date Validation

Dates must match `YYYY-MM-DD` format:
- Valid: `2025-10-12`, `2025-01-01`
- Invalid: `10/12/2025`, `2025-10-1`, `12-10-2025`

**Note:** js-yaml may auto-parse dates as `Date` objects. Parser accepts both string and Date formats.

### Item Number Validation

Item numbers must match pattern `[PEFSB]\d+`:
- Valid: `P1`, `E12`, `F20`, `S39`, `B5`
- Invalid: `S`, `story-39`, `s39`, `Project1`

## Edge Cases and Special Handling

### YAML Date Parsing

js-yaml automatically parses `YYYY-MM-DD` strings as JavaScript `Date` objects. The parser accepts both:

```yaml
# These are equivalent:
created: 2025-10-12         # Parsed as Date object
created: "2025-10-12"       # Parsed as string (quotes prevent Date conversion)
```

Both formats pass validation.

### Empty Dependencies

Use explicit empty array instead of omitting field:

```yaml
# Preferred:
dependencies: []

# Also valid:
# (field omitted entirely)
```

### YAML Comments

Comments are stripped by js-yaml:

```yaml
---
item: S39           # Story identifier
title: Parser       # Short name
type: story
---
```

Parser receives clean values without comments.

### Windows Line Endings

Parser handles both LF (`\n`) and CRLF (`\r\n`) line endings correctly.

### Unicode Support

Full UTF-8 support for all text fields:

```yaml
title: "État de l'application 🚀"
```

## Known Limitations

### Spec and Phase File Support

**Current Limitation:** Parser requires `item` field for all types, but spec and phase files in the codebase use `spec` field instead per the frontmatter schema.

**Impact:**
- Spec files (`specs/S##-name/plan.md`) fail validation
- Phase files (`specs/S##-name/tasks/##-phase.md`) fail validation
- Workaround: Not currently needed for S39 scope

**Example:**
```yaml
# Spec files currently use:
spec: S39           # Parser expects: item: S39
title: ...
type: spec
```

**Future Enhancement:** Parser v2 should accept either `item` or `spec` field based on `type` value.

### Optional Field Handling

Parser doesn't validate optional field values beyond enum checks. For example:
- `spec` field format not validated (any string accepted)
- `dependencies` array items not validated for existence
- `phase` and `phases` not validated for numeric range

These validations are outside S39 scope and should be added in future enhancements.

## Integration Examples

### S40 - Cache Layer Integration

```typescript
import { parseFrontmatter } from './parser';

async function getCachedFrontmatter(filePath: string): Promise<Frontmatter | null> {
  // Check cache first
  if (cache.has(filePath)) {
    return cache.get(filePath);
  }

  // Cache miss - parse and cache
  const content = await fs.readFile(filePath, 'utf-8');
  const result = parseFrontmatter(content);

  if (result.success) {
    cache.set(filePath, result.frontmatter!);
    return result.frontmatter!;
  }

  // Parse failed - log error and return null
  console.error(`Failed to parse ${filePath}: ${result.error}`);
  return null;
}
```

### S38 - File System Watcher Integration

```typescript
import * as vscode from 'vscode';

const watcher = vscode.workspace.createFileSystemWatcher('**/*.md');

watcher.onDidChange((uri) => {
  // Invalidate cache for changed file
  cache.invalidate(uri.fsPath);

  // Re-parse will happen on next cache access via S40
});
```

### F12/F13 - Status Visualization Integration

```typescript
import { parseFrontmatter } from './parser';

function getStatusIcon(filePath: string): string {
  const frontmatter = getCachedFrontmatter(filePath);

  if (!frontmatter) {
    return '';  // No icon for unparseable files
  }

  switch (frontmatter.status) {
    case 'Ready':
      return '✅';
    case 'In Progress':
      return '🔨';
    case 'Completed':
      return '✔️';
    case 'Blocked':
      return '🚫';
    default:
      return '';
  }
}
```

## Testing

### Test Suite

Comprehensive test suite in `test/parser.test.ts`:

- **26 total tests**
- **6 success case tests** - Valid frontmatter variations
- **10 error case tests** - Validation failures
- **5 edge case tests** - CRLF, Unicode, comments
- **2 performance tests** - < 10ms verification
- **3 integration tests** - Real file parsing

**Run tests:**
```bash
cd vscode-extension
npx tsx test/parser.test.ts
```

### Test Fixtures

20+ test fixtures in `test/fixtures/`:
- `valid-story.md` - Complete story with all fields
- `valid-epic.md` - Epic (no estimate)
- `minimal.md` - Only required fields
- `invalid-*.md` - Various validation failures
- `crlf-lineendings.md` - Windows line endings
- `unicode-title.md` - UTF-8 characters

### Performance Verification

```typescript
// From test suite:
const iterations = 100;
const start = performance.now();

for (let i = 0; i < iterations; i++) {
  parseFrontmatter(content);
}

const avgTime = (performance.now() - start) / iterations;
console.log(`Average: ${avgTime.toFixed(2)}ms`);  // Typical: 0.04ms
```

## Best Practices

### 1. Always Check Success Flag

```typescript
const result = parseFrontmatter(content);

if (result.success) {
  // Use result.frontmatter!
} else {
  // Handle error: result.error
}
```

### 2. Log Errors for Debugging

```typescript
if (!result.success) {
  outputChannel.appendLine(`Parse error in ${filePath}: ${result.error}`);
}
```

### 3. Use Type Guards

```typescript
if (result.success && result.frontmatter) {
  const fm = result.frontmatter;
  // TypeScript knows fm is Frontmatter type
}
```

### 4. Handle Date Objects

```typescript
const created = result.frontmatter.created;
const dateStr = created instanceof Date ? created.toISOString().split('T')[0] : created;
```

### 5. Graceful Degradation

```typescript
function getTitle(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8');
  const result = parseFrontmatter(content);

  // Fallback to filename if parse fails
  return result.success ? result.frontmatter!.title : path.basename(filePath, '.md');
}
```

## Performance Considerations

### Typical Performance

- **Small frontmatter** (7-10 fields): 0.02-0.05ms
- **Large frontmatter** (20+ dependencies): 0.05-0.10ms
- **Well under 10ms target**

### Optimization Tips

1. **Cache parsed results** - Avoid re-parsing unchanged files (see S40)
2. **Parse on demand** - Only parse when frontmatter needed
3. **Batch operations** - Parse multiple files in parallel if needed

### Memory Usage

- **Parser function**: No state, pure function
- **Parsed frontmatter**: ~1-2KB per file
- **Cache overhead**: Depends on cache implementation (S40)

## Troubleshooting

### Parser Returns Error for Valid File

**Check:**
1. Frontmatter starts at line 1 (no blank lines before `---`)
2. Both opening and closing `---` delimiters present
3. Valid YAML syntax (use YAML validator)
4. All required fields present
5. Enum values match exactly (case-sensitive)

### Performance Issues

**Check:**
1. File size (large files take longer to read, not parse)
2. Parsing called repeatedly (should cache results)
3. Running in DEBUG mode (use production build)

### Unexpected Field Values

**Check:**
1. js-yaml date auto-parsing (use quotes to prevent: `created: "2025-10-12"`)
2. YAML array syntax (`[S26, S27]` not `"[S26, S27]"`)
3. Whitespace (no trailing spaces on values)

## See Also

- **Frontmatter Schema**: `docs/frontmatter-schema.md` - Complete field reference
- **Type Definitions**: `src/types.ts` - TypeScript interfaces
- **Test Suite**: `test/parser.test.ts` - Usage examples
- **Test Fixtures**: `test/fixtures/` - Sample frontmatter files
- **S40 Spec**: Cache layer integration (future)
- **S38 Spec**: File system watcher integration (future)

## Version History

**v1.0 (S39 - Phase 3)**
- Initial implementation
- Core parser with validation
- Comprehensive test suite (26 tests)
- Performance: < 10ms target met (typical 0.04ms)
- Known limitation: Spec/phase file format not supported

**Future Enhancements**
- Support `spec` field in addition to `item` for spec/phase files
- Validate dependency item existence
- Validate spec path format
- Add schema version support for forward compatibility
