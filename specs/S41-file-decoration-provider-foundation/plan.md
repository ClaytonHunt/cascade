---
spec: S41
title: FileDecorationProvider Foundation
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-13
updated: 2025-10-13
---

# S41 - FileDecorationProvider Foundation

## Implementation Strategy

Create the foundational infrastructure for file decorations by implementing a `PlansDecorationProvider` class that conforms to VSCode's `FileDecorationProvider` interface. This provider will serve as the core mechanism for all future decoration features (status icons, badges, progress indicators) in Feature 12.

The implementation follows a three-phase approach:
1. **Provider Class Foundation** - Create the core provider class with interface compliance
2. **Extension Integration** - Register provider and wire up lifecycle management
3. **Path Filtering & Testing** - Implement plans/ directory filtering and validate behavior

## Architecture Decisions

### Module Structure
- **New file**: `vscode-extension/src/decorationProvider.ts` - Contains the `PlansDecorationProvider` class
- **Existing file**: `vscode-extension/src/extension.ts` - Registration in `activate()` function
- **Module-level export**: Provider instance must be accessible for FileSystemWatcher integration

### Provider Design Patterns
- **Event-driven updates**: Uses `EventEmitter` for `onDidChangeFileDecorations` to trigger VSCode refreshes
- **Manual refresh capability**: Exports `refresh()` method for external trigger (e.g., from FileSystemWatcher)
- **Safe initialization**: Returns `undefined` for all files initially (prevents crashes during development)
- **Path-based filtering**: Only decorates files within `plans/` directory hierarchy

### Integration Points
1. **Frontmatter Cache** (S40): Provider will call `frontmatterCache.get()` to retrieve parsed frontmatter
   - Integration deferred to S44 (Leaf Item Decorations)
   - S41 focuses on infrastructure only

2. **FileSystemWatcher**: Provider exposes `refresh(uri)` method
   - Watcher will call this when files change (integration handled in S47)

3. **Output Channel**: Provider logs decoration activity to existing output channel
   - Provides visibility into provider behavior during development

## Key Files to Modify

### New Files
- `vscode-extension/src/decorationProvider.ts` - Provider implementation (lines: ~100)

### Modified Files
- `vscode-extension/src/extension.ts` - Add provider registration in `activate()` (lines: 462-560)

## Risks/Considerations

### Risk: VSCode API Compatibility
- **Mitigation**: Use `vscode.FileDecorationProvider` interface from `@types/vscode@^1.80.0` (already installed)
- **Validation**: TypeScript strict mode checks ensure interface compliance

### Risk: Provider Called Before Cache Ready
- **Mitigation**: Return `undefined` safely if cache not initialized
- **Validation**: Guard clause in `provideFileDecoration()` method

### Risk: Performance Impact
- **Mitigation**: Path filtering at entry point (early return for non-plans files)
- **Validation**: Manual testing with large workspaces, output channel logging

### Risk: Disposal/Memory Leaks
- **Mitigation**: Register provider in `context.subscriptions` for automatic cleanup
- **Validation**: Verify disposal in extension deactivation

## Phase Overview

### Phase 1: Provider Class Foundation
**File**: `tasks/01-provider-class-foundation.md`

Create `PlansDecorationProvider` class implementing `vscode.FileDecorationProvider` interface with:
- `onDidChangeFileDecorations` event emitter
- `provideFileDecoration(uri)` method (returns undefined initially)
- `refresh(uri?)` method for manual updates
- Output channel logging

**Deliverable**: Compilable TypeScript class passing strict mode checks

### Phase 2: Extension Integration
**File**: `tasks/02-extension-integration.md`

Register provider in `extension.ts` with:
- Module-level provider instance
- Registration in `activate()` function
- Subscription for disposal
- Output channel connection
- Activation logging

**Deliverable**: Provider registered and active in VSCode after local installation

### Phase 3: Path Filtering & Testing
**File**: `tasks/03-path-filtering-testing.md`

Implement plans/ directory filtering with:
- Path detection logic (check if uri contains `/plans/`)
- Return undefined for non-plans files
- Comprehensive edge case handling
- Manual testing validation

**Deliverable**: Provider correctly filters to plans/ directory, no crashes

## Next Steps After S41 Completion

1. **S42: Status Icon Mapping** - Map frontmatter status values to visual icons
2. **S43: File Type Detection** - Detect leaf vs parent items from path patterns
3. **S44: Leaf Item Decorations** - Display status icons for stories/bugs
4. **S45-S47**: Hierarchical progress and real-time updates

## Expected Outcomes

✅ `PlansDecorationProvider` class exists and compiles without errors
✅ Provider registered in extension with proper disposal
✅ Provider safely handles all edge cases (no crashes)
✅ Provider logs activity to output channel
✅ TypeScript strict mode checks pass
✅ Manual testing confirms provider activates correctly
✅ Foundation ready for S42 to add actual icon rendering
