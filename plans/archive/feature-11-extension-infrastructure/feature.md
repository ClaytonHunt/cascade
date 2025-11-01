---
item: F11
title: Extension Infrastructure
type: feature
status: In Progress
priority: High
dependencies: []
created: 2025-10-12
updated: 2025-10-14
---

# F11 - Extension Infrastructure

## Description

Establish the foundational infrastructure for the VSCode extension, including project scaffolding, workspace activation, file system watching, and YAML frontmatter parsing. This feature provides the core capabilities that all other features will build upon.

## Objectives

- Create VSCode extension project structure with TypeScript
- Implement workspace activation (only activate when `plans/` or `specs/` directories present)
- Set up FileSystemWatcher for real-time file change detection
- Build YAML frontmatter parser for extracting metadata from markdown files
- Implement caching layer for parsed frontmatter to optimize performance
- Handle Windows path formats correctly

## Scope

- Extension manifest (package.json) with activation events
- Extension entry point (extension.ts) with activate/deactivate lifecycle
- FileSystemWatcher for monitoring `plans/**/*.md` and `specs/**/*.md`
- YAML parser integration (js-yaml library)
- Frontmatter extraction utilities
- Cache management for parsed metadata
- Error handling and logging infrastructure

## Acceptance Criteria

- Extension activates only in workspaces containing `plans/` or `specs/` directories
- FileSystemWatcher detects file changes, creations, and deletions in real-time
- YAML frontmatter is correctly parsed from markdown files
- Parsed data is cached and invalidated on file changes
- Extension handles Windows paths (e.g., `D:\projects\lineage`) without errors
- Comprehensive error logging for debugging
- Extension does not block VSCode UI thread during parsing

## Technical Notes

**VSCode APIs:**
- `vscode.workspace.workspaceFolders` - Detect workspace structure
- `vscode.workspace.createFileSystemWatcher` - Monitor file changes
- `vscode.window.createOutputChannel` - Logging

**Dependencies:**
- `js-yaml` - YAML parsing
- TypeScript for type safety

**Performance Considerations:**
- Parse frontmatter lazily (only when needed)
- Cache parsed results with file modification timestamps
- Debounce file change events to avoid excessive parsing

## Child Items

### Stories

1. **S36 - Extension Project Scaffold** (Priority: High, Estimate: XS)
   - Create VSCode extension project structure with TypeScript
   - Set up build tooling (webpack/esbuild)
   - Implement basic extension lifecycle (activate/deactivate)
   - Create output channel for logging
   - **Status:** Not Started

2. **S37 - Workspace Activation Logic** (Priority: High, Estimate: S, Dependencies: S36)
   - Implement workspace detection for plans/ and specs/ directories
   - Handle multi-root workspaces
   - Support dynamic workspace folder changes
   - Windows path compatibility
   - **Status:** Not Started

3. **S38 - File System Watcher** (Priority: High, Estimate: M, Dependencies: S37)
   - Create FileSystemWatcher for plans/**/*.md and specs/**/*.md
   - Implement debouncing (300ms) for file change events
   - Handle create, change, and delete events
   - Multi-root workspace support
   - **Status:** Not Started

4. **S39 - YAML Frontmatter Parser** (Priority: High, Estimate: M, Dependencies: S36)
   - Parse YAML frontmatter from markdown files
   - Extract all required and optional fields per frontmatter schema
   - Handle malformed YAML gracefully
   - Support Windows line endings (CRLF)
   - Unit tests for edge cases
   - **Status:** Not Started

5. **S40 - Frontmatter Cache Layer** (Priority: High, Estimate: M, Dependencies: S38, S39)
   - Implement in-memory cache with mtime-based staleness detection
   - Integrate with FileSystemWatcher for cache invalidation
   - LRU eviction when cache size limit reached
   - Cache statistics logging
   - **Status:** Not Started

### Implementation Order

**Recommended sequence:**
1. Start with **S36** (scaffold) to establish foundation
2. Then **S37** (workspace activation) to ensure extension activates correctly
3. Parallel implementation possible:
   - **S38** (file watcher) - depends on S37
   - **S39** (parser) - depends only on S36
4. Finally **S40** (cache) - depends on both S38 and S39

**Alternative approach:**
- S36 → S39 → S37 → S38 → S40 (parser-first approach if you want to test parsing before watching)

### Acceptance Criteria Summary

All five stories must be completed for F11 to be considered complete:
- ✓ Extension activates only in workspaces with plans/ or specs/
- ✓ File changes detected in real-time
- ✓ Frontmatter correctly parsed from all markdown files
- ✓ Parsed data cached for performance
- ✓ Windows paths handled without errors
- ✓ Extension does not block VSCode UI

## Dependencies

None (foundational feature)

## Analysis Summary

**VSCode Extension Structure:**
- Standard extension structure: `src/extension.ts`, `package.json`
- Activation events: `onStartupFinished` or workspace folder pattern
- Extension API provides FileSystemWatcher and decoration APIs

**File Patterns to Watch:**
- `plans/**/*.md` - All plan files (project, epic, feature, story, bug)
- `specs/**/*.md` - All spec files (plan.md, task files)

**Frontmatter Format:**
```yaml
---
item: S23
title: Example Story
type: story
status: In Progress
priority: High
dependencies: [S22]
estimate: M
created: 2025-10-12
updated: 2025-10-14
---
```

**Integration Points:**
- Next features (F12, F13) will use the file watching and parsing infrastructure
- Decoration providers will consume cached frontmatter data
