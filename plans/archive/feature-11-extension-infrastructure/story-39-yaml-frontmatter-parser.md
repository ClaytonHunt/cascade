---
item: S39
title: YAML Frontmatter Parser
type: story
status: In Progress
priority: High
dependencies: [S36]
estimate: M
spec: specs/S39-yaml-frontmatter-parser/
created: 2025-10-12
updated: 2025-10-12
---

# S39 - YAML Frontmatter Parser

## Description

Build a robust YAML frontmatter parser that extracts structured metadata from markdown files in the `plans/` and `specs/` directories. The parser must handle all frontmatter fields defined in the frontmatter schema, validate data types, and handle edge cases gracefully.

## Acceptance Criteria

- [ ] Parser extracts YAML frontmatter from markdown files
- [ ] Parses all required frontmatter fields: item, title, type, status, priority, created, updated
- [ ] Parses optional frontmatter fields: dependencies, estimate, spec, phase, phases
- [ ] Handles Windows line endings (CRLF) correctly
- [ ] Returns structured TypeScript interface for frontmatter data
- [ ] Validates frontmatter structure (presence of opening/closing `---` delimiters)
- [ ] Handles malformed YAML gracefully (returns error, does not throw)
- [ ] Handles missing frontmatter (returns null or default object)
- [ ] Parser is testable (pure function, no VSCode API dependencies in core logic)
- [ ] Performance: Parses file in < 10ms on average

## Technical Notes

**Dependencies:**
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

**TypeScript Interfaces:**
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
  estimate?: 'XS' | 'S' | 'M' | 'L' | 'XL';  // Stories/Bugs only
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

**Parser Implementation:**
```typescript
import * as yaml from 'js-yaml';
import * as fs from 'fs/promises';

async function parseFrontmatter(filePath: string): Promise<ParseResult> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');

    // Extract frontmatter between --- delimiters
    const frontmatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n/;
    const match = content.match(frontmatterRegex);

    if (!match) {
      return { success: false, error: 'No frontmatter found' };
    }

    const frontmatterYaml = match[1];
    const frontmatter = yaml.load(frontmatterYaml) as Frontmatter;

    // Basic validation
    if (!frontmatter.item || !frontmatter.title || !frontmatter.type) {
      return { success: false, error: 'Missing required fields' };
    }

    return { success: true, frontmatter };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

**Regex Explanation:**
- `^---\s*\n`: Opening delimiter (start of file, `---`, optional whitespace, newline)
- `([\s\S]*?)`: Capture group for YAML content (non-greedy match)
- `\n---\s*\n`: Closing delimiter (newline, `---`, optional whitespace, newline)
- Handles both LF and CRLF line endings

**Validation Rules:**
1. **Required fields:** item, title, type, status, priority, created, updated must be present
2. **Type enums:** Validate type, status, priority, estimate against allowed values
3. **Date format:** created/updated should match YYYY-MM-DD pattern
4. **Dependencies:** Should be array (may be empty: `[]`)
5. **Item format:** Should match pattern P#, E#, F#, S#, or B#

**Error Handling:**
- **No frontmatter:** Return `{ success: false, error: 'No frontmatter found' }`
- **Malformed YAML:** Catch yaml.load() exception, return error message
- **Missing required fields:** Return `{ success: false, error: 'Missing required fields: item, title' }`
- **Invalid type:** Return `{ success: false, error: 'Invalid type value: foo' }`

## Edge Cases

- **Empty file:** Should return "No frontmatter found"
- **No closing delimiter:** Should return parse error
- **YAML syntax errors:** Should catch and return error message
- **Mixed line endings:** Should handle both LF and CRLF
- **Extra whitespace:** Should handle spaces around delimiters
- **Comments in YAML:** js-yaml handles `#` comments by default
- **Unicode characters:** Should handle UTF-8 characters in title, etc.

## Testing Strategy

Create unit tests for:
1. Valid frontmatter (all fields present)
2. Valid frontmatter (only required fields)
3. Missing frontmatter (no delimiters)
4. Malformed YAML (syntax error)
5. Missing required fields
6. Invalid enum values
7. Windows line endings (CRLF)
8. Unicode characters in title

**Test Files:**
Create `src/parser.test.ts` with sample markdown strings covering all cases.

## Integration Points

- S40 (Cache Layer) will call this parser to extract frontmatter
- S38 (FileSystemWatcher) events will trigger cache invalidation and re-parsing
- F12/F13 (Visualization) will consume parsed frontmatter data for decorations

## Performance Considerations

- **Async file reading:** Use `fs.promises` for non-blocking I/O
- **Lazy parsing:** Only parse when cache miss occurs (see S40)
- **Regex efficiency:** Simple frontmatter regex should be fast (< 1ms)
- **YAML parsing:** js-yaml is optimized, typical frontmatter parses in < 5ms

## Definition of Done

- Parser successfully extracts frontmatter from all existing plan and spec files
- All required and optional fields are correctly typed
- Error handling prevents extension crashes on malformed files
- Unit tests cover edge cases
- Parser performance meets < 10ms target
- Windows paths and line endings handled correctly
