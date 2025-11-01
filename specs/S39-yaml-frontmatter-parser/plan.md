---
spec: S39
title: YAML Frontmatter Parser
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-12
updated: 2025-10-12
---

# S39 - YAML Frontmatter Parser

## Implementation Strategy

Build a robust, testable YAML frontmatter parser module for the Lineage Planning VSCode extension. The parser will extract structured metadata from markdown files in the `plans/` and `specs/` directories, handling all fields defined in the frontmatter schema while gracefully handling edge cases and malformed input.

The implementation follows a three-phase approach:
1. **Core Parser Implementation** - Pure TypeScript module with js-yaml integration
2. **Validation and Error Handling** - Comprehensive validation rules and error reporting
3. **Testing and Integration** - Unit tests with fixtures and integration with extension

## Architecture Decisions

### Pure Function Approach
**Decision: Implement parser as pure function with no VSCode API dependencies**
- Enables easy unit testing without VSCode test environment
- Can be tested with simple Jest or similar test runner
- Core logic portable to other tools if needed
- VSCode-specific file I/O handled by caller (extension.ts)

**Alternative Considered**: Parser handles file reading directly
- Rejected: Creates tight coupling to VSCode file system APIs
- Rejected: Makes testing more complex (requires mocking filesystem)

### js-yaml Library Integration
**Decision: Use js-yaml ^4.1.0 for YAML parsing**
- Industry-standard, mature library (12M+ weekly downloads)
- Handles all YAML syntax including edge cases
- Performance: Parses typical frontmatter in < 5ms
- Better than rolling custom YAML parser (complex spec, edge cases)

**Configuration:**
```json
{
  "dependencies": {
    "js-yaml": "^4.1.0"
  },
  "devDependencies": {
    "@types/js-yaml": "^4.0.5"
  }
}
```

### TypeScript Interface Design
**Decision: Strict interfaces with required and optional fields**
- Matches frontmatter schema exactly (docs/frontmatter-schema.md)
- Type safety catches errors at compile time
- Enum types for status, priority, type fields
- Optional fields use `?:` notation

**Interface Structure:**
```typescript
interface Frontmatter {
  // Required fields (all item types)
  item: string;              // P1, E2, F11, S36, B1
  title: string;
  type: 'project' | 'epic' | 'feature' | 'story' | 'bug' | 'spec' | 'phase';
  status: 'Not Started' | 'In Planning' | 'Ready' | 'In Progress' | 'Blocked' | 'Completed';
  priority: 'High' | 'Medium' | 'Low';
  created: string;           // YYYY-MM-DD
  updated: string;           // YYYY-MM-DD

  // Optional fields
  dependencies?: string[];   // [S26, F11] or []
  estimate?: 'XS' | 'S' | 'M' | 'L' | 'XL';
  spec?: string;             // Story reference or path
  phase?: number;            // Phase files only
  phases?: number;           // Spec plan.md only
}

interface ParseResult {
  success: boolean;
  frontmatter?: Frontmatter;
  error?: string;
}
```

### Regex-Based Frontmatter Extraction
**Decision: Use simple regex for delimiter detection**
- Frontmatter format is well-defined (--- delimiters)
- Regex is fast (< 1ms) for delimiter extraction
- Simpler than full markdown parser
- Handles both LF and CRLF line endings

**Regex Pattern:**
```typescript
/^---\s*\n([\s\S]*?)\n---\s*\n/
```

- `^---\s*\n`: Opening delimiter (start of file, ---, optional whitespace, newline)
- `([\s\S]*?)`: Capture group for YAML content (non-greedy match)
- `\n---\s*\n`: Closing delimiter (newline, ---, optional whitespace, newline)

### Validation Strategy
**Decision: Two-tier validation (structure + content)**

**Tier 1 - Structure Validation (Required):**
- Frontmatter delimiters present
- Valid YAML syntax (js-yaml parses without error)
- Required fields present: item, title, type, status, priority, created, updated

**Tier 2 - Content Validation (Optional, Phase 2):**
- Type enum values valid
- Status enum values valid
- Priority enum values valid
- Date format matches YYYY-MM-DD
- Item format matches P#, E#, F#, S#, B#
- Dependencies array structure valid

### Error Handling Philosophy
**Decision: Graceful failure with detailed error messages**
- Never throw exceptions (return ParseResult with error)
- Specific error messages for debugging
- Allow extension to continue even with malformed files
- Log errors to output channel for user visibility

**Error Types:**
- `No frontmatter found` - Missing delimiters
- `Invalid YAML syntax: {message}` - Malformed YAML
- `Missing required fields: item, title` - Incomplete frontmatter
- `Invalid type value: foo` - Bad enum value

## Key Integration Points

### Current Integration
- **Location:** `vscode-extension/src/` (new parser.ts module)
- **Caller:** extension.ts (future stories will use parser)
- **No current dependencies:** Parser is standalone utility

### Future Integration (Dependent Stories)
- **S40 (Cache Layer):** Will call parser when cache miss occurs
- **S38 (FileSystemWatcher):** Will trigger re-parsing on file changes
- **F12/F13 (Status Visualization):** Will consume parsed frontmatter for decorations

### File Structure
```
vscode-extension/
├── src/
│   ├── extension.ts          # Main extension (existing)
│   ├── parser.ts              # NEW: Frontmatter parser
│   └── types.ts               # NEW: TypeScript interfaces
├── test/
│   ├── parser.test.ts         # NEW: Unit tests
│   └── fixtures/
│       ├── valid-story.md     # NEW: Test fixtures
│       ├── invalid-yaml.md
│       └── missing-fields.md
└── package.json               # Update with js-yaml dependency
```

## Risk Assessment

### Low Risks (Mitigated)
- **js-yaml dependency size:** 43KB minified (acceptable for VSCode extension)
- **Parsing performance:** Typical frontmatter parses in < 5ms (well under 10ms target)
- **Windows line endings:** Regex handles both LF and CRLF

### Medium Risks (Monitoring Required)
- **Schema evolution:** Frontmatter schema may add new fields in future
  - **Mitigation:** Use optional fields (`?:`) for new additions
  - **Mitigation:** Validation in Phase 2 can be extended easily
  - **Impact:** Parser continues working, just doesn't validate new fields

- **Malformed files in production:** Users may manually edit frontmatter incorrectly
  - **Mitigation:** Graceful error handling prevents crashes
  - **Mitigation:** Error messages guide users to fix issues
  - **Impact:** Extension continues working, shows error in output channel

### No High Risks Identified
Parser is isolated utility with no external API dependencies beyond js-yaml.

## Codebase Analysis Summary

### Existing Files to Modify
**None.** This is a new module with no modifications to existing files.

### New Files to Create
1. **`vscode-extension/src/types.ts`** (~50 lines)
   - TypeScript interfaces for Frontmatter and ParseResult
   - Enum type definitions
   - Export all types for use in parser and future stories

2. **`vscode-extension/src/parser.ts`** (~150 lines)
   - parseFrontmatter() main function
   - Helper functions for validation
   - Error handling logic
   - Export parseFrontmatter as public API

3. **`vscode-extension/test/parser.test.ts`** (~300 lines)
   - Unit tests for all scenarios
   - Uses fixtures from test/fixtures/
   - Tests success cases, error cases, edge cases

4. **`vscode-extension/test/fixtures/*.md`** (8-10 files)
   - Sample markdown files with various frontmatter configurations
   - Valid, invalid, missing, malformed, edge cases

### External Dependencies
**New dependency:** js-yaml ^4.1.0 (and @types/js-yaml ^4.0.5)

**No other dependencies** - Parser uses only:
- Built-in Node.js: None (pure TypeScript)
- TypeScript standard library: String, RegExp, Object
- js-yaml: yaml.load() for YAML parsing

### TypeScript Configuration
- **Current target:** ES2020 (vscode-extension/tsconfig.json)
- **Strict mode:** Already enabled in existing extension
- **No changes needed:** Parser follows existing TypeScript config

## Phase Overview

### Phase 1: Core Parser Implementation
**Goal**: Implement basic parser with frontmatter extraction and YAML parsing

**Key Tasks**:
- Install js-yaml and @types/js-yaml dependencies
- Create types.ts with Frontmatter and ParseResult interfaces
- Create parser.ts with parseFrontmatter() function
- Implement regex-based frontmatter extraction
- Integrate js-yaml for YAML parsing
- Handle basic success/failure cases

**Deliverable**: Working parser that extracts and parses valid frontmatter

**Estimated Implementation Time**: 1 hour

### Phase 2: Validation and Error Handling
**Goal**: Add comprehensive validation and detailed error messages

**Key Tasks**:
- Validate required fields presence
- Validate enum field values (type, status, priority)
- Validate date format (YYYY-MM-DD)
- Validate item number format (P#, E#, F#, S#, B#)
- Add specific error messages for each failure type
- Handle edge cases (empty files, malformed YAML, etc.)

**Deliverable**: Robust parser with comprehensive validation and error handling

**Estimated Implementation Time**: 1.5 hours

### Phase 3: Testing and Integration
**Goal**: Create comprehensive test suite and verify parser works as expected

**Key Tasks**:
- Create test fixtures (8-10 markdown files with various configurations)
- Write unit tests for success cases
- Write unit tests for error cases
- Write unit tests for edge cases
- Verify performance meets < 10ms target
- Document parser API and usage examples

**Deliverable**: Fully tested parser ready for integration in S40

**Estimated Implementation Time**: 1.5 hours

## Testing Strategy

### Unit Tests (parser.test.ts)

**Success Cases:**
1. Valid story frontmatter (all fields)
2. Valid epic frontmatter (no estimate)
3. Valid spec plan frontmatter (with phases)
4. Valid phase frontmatter (with phase number)
5. Minimal frontmatter (only required fields)
6. Frontmatter with empty dependencies array

**Error Cases:**
1. No frontmatter (missing delimiters)
2. Malformed YAML (syntax error)
3. Missing required field (item)
4. Missing multiple required fields
5. Invalid enum value (type)
6. Invalid status value
7. Invalid priority value

**Edge Cases:**
1. Windows line endings (CRLF)
2. Extra whitespace around delimiters
3. Unicode characters in title
4. Empty file
5. File with only opening delimiter
6. Comments in YAML frontmatter

### Test Fixtures

Create markdown files in `test/fixtures/`:
- `valid-story.md` - Complete story frontmatter
- `valid-spec.md` - Spec plan with phases field
- `valid-phase.md` - Phase with phase number
- `minimal.md` - Only required fields
- `no-frontmatter.md` - Missing delimiters
- `malformed-yaml.md` - YAML syntax error
- `missing-fields.md` - Missing required fields
- `invalid-enum.md` - Invalid type/status/priority
- `crlf-lineendings.md` - Windows line endings
- `unicode.md` - Unicode characters in title

### Performance Testing
- Measure parse time for typical frontmatter (should be < 5ms)
- Verify meets < 10ms target from acceptance criteria
- Test with large frontmatter (multiple dependencies)

## Next Steps After Completion

Once S39 is complete, the parser will be ready for:

1. **S40 - Frontmatter Cache Layer** (Recommended next)
   - Will use parser to extract frontmatter for caching
   - Cache will call parser on cache misses
   - Parser's pure function design makes caching integration clean

2. **S38 - File System Watcher** (Can be parallel)
   - Doesn't directly use parser, but triggers cache invalidation
   - Cache invalidation causes re-parsing via S40

3. **F12/F13 - Status Visualization** (Depends on S38, S40)
   - Will read parsed frontmatter from cache
   - Parser enables all visualization features

**Post-Implementation Verification:**
- All unit tests pass
- Parser extracts frontmatter from all existing plan and spec files
- Performance meets < 10ms target
- Error handling prevents crashes on malformed files
- Ready for integration in S40 cache layer
