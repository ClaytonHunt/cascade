---
item: F25
title: Spec Phase Integration
type: feature
parent: E5
status: Completed
priority: Medium
dependencies: [F24]
estimate: M
created: 2025-10-23
updated: 2025-10-26
---

# F25 - Spec Phase Integration

## Description

Display spec phase progress inline within Story tree items using checkmarks and phase indicators. This feature surfaces implementation progress directly in the TreeView without requiring users to navigate to spec files.

Users can see at a glance which stories have specs, how many phases are complete, and which phase is currently in progress, enabling better sprint planning and work prioritization.

## Objectives

- **Phase Status Display**: Show "✓ Phase 1/3 Complete" inline with Story items
- **Spec Link**: Provide visual indicator that Story has associated spec
- **Progress Integration**: Combine spec phase progress with overall Story progress
- **Real-time Updates**: Reflect spec phase changes immediately when phase files update
- **Compact Format**: Fit phase info into TreeItem without overwhelming the display

## Reference Design

From the ChatGPT reference design:
- **Spec Indicator**: `[Spec]` or `📋` icon before Story title
- **Phase Progress**: `✓ Phase 1/3` or `Phase 2/3 (In Progress)`
- **Checkmarks**: `✓` for completed phases, `○` for pending phases
- **Phase List**: Expandable child nodes showing individual phases

Example rendering:
```
Story 75 - Type System [Completed] 📋 ✓ Phase 3/3
  ✓ Phase 1: Core Type System
  ✓ Phase 2: Icon and Visual System
  ✓ Phase 3: Testing and Verification

Story 76 - Archive Detection [In Progress] 📋 Phase 2/3
  ✓ Phase 1: Path Detection Logic
  ↻ Phase 2: Integration Testing (In Progress)
  ○ Phase 3: Performance Optimization
```

## Acceptance Criteria

1. **Spec Detection**:
   - [ ] Detect Stories with `spec:` field in frontmatter
   - [ ] Read spec directory to find total phase count
   - [ ] Count completed phases from phase file status fields
   - [ ] Handle missing/invalid spec directories gracefully

2. **Phase Display**:
   - [ ] Show phase progress in TreeItem.description
   - [ ] Format: `Phase X/Y` where X = completed, Y = total
   - [ ] Add checkmark `✓` when all phases complete
   - [ ] Add spinner `↻` when spec is in progress

3. **Expandable Phase List** (Optional):
   - [ ] Add phase files as child nodes under Story items
   - [ ] Each phase shows: `✓ Phase 1: Title` or `○ Phase 2: Title`
   - [ ] Click phase to open phase file
   - [ ] Phase list collapses by default

4. **Performance**:
   - [ ] Spec phase reading < 10ms per Story
   - [ ] Use cached spec data (don't re-read on every refresh)
   - [ ] Invalidate cache when spec files change (FileSystemWatcher)
   - [ ] No observable lag with 50+ Stories with specs

5. **Sync Integration**:
   - [ ] Phase progress displayed even if Story/Spec status out of sync
   - [ ] Highlight sync issues (e.g., "⚠️ Phase 3/3 but Story shows Ready")
   - [ ] Link to `/sync` command in tooltip for out-of-sync items

6. **Edge Cases**:
   - [ ] Stories without specs show no phase indicator
   - [ ] Specs with 0 phases handled gracefully
   - [ ] Malformed spec frontmatter doesn't crash TreeView
   - [ ] Missing phase files counted as "not completed"

## Technical Approach

### Spec Phase Reading

```typescript
interface SpecProgress {
  specDir: string;
  totalPhases: number;
  completedPhases: number;
  currentPhase: number;
  inSync: boolean;
}

async function readSpecProgress(story: PlanningTreeItem): Promise<SpecProgress | null> {
  // Check if story has spec field
  if (!story.spec) return null;

  // Read spec plan.md to get total phases
  const planPath = path.join(story.spec, 'plan.md');
  const planContent = await fs.readFile(planPath, 'utf8');
  const planFrontmatter = parseFrontmatter(planContent);

  // Find phase files in tasks/ directory
  const taskFiles = await glob(`${story.spec}/tasks/*.md`);
  const completedPhases = await countCompletedPhases(taskFiles);

  // Determine if spec/story are in sync
  const inSync = checkSyncStatus(story.status, planFrontmatter.status);

  return {
    specDir: story.spec,
    totalPhases: planFrontmatter.phases,
    completedPhases,
    currentPhase: completedPhases + 1,
    inSync
  };
}
```

### Phase Display Rendering

```typescript
function renderSpecPhaseIndicator(progress: SpecProgress | null): string {
  if (!progress) return '';

  const allComplete = progress.completedPhases === progress.totalPhases;
  const icon = allComplete ? '✓' : '↻';
  const syncWarning = !progress.inSync ? '⚠️ ' : '';

  return `${syncWarning}📋 ${icon} Phase ${progress.completedPhases}/${progress.totalPhases}`;
}
```

### Integration with TreeItem

```typescript
async getTreeItem(element: TreeNode): Promise<vscode.TreeItem> {
  // ... existing code ...

  if (element.type === 'item' && element.item.type === 'story') {
    const specProgress = await this.specProgressCache.get(element.item.item);
    const specIndicator = renderSpecPhaseIndicator(specProgress);

    treeItem.description = `${statusBadge} ${specIndicator}`;

    if (specProgress && !specProgress.inSync) {
      treeItem.tooltip += '\n⚠️ Spec and Story status out of sync - run /sync';
    }
  }

  return treeItem;
}
```

## Architecture Impact

### Files to Modify

1. **Create utility file**: `vscode-extension/src/treeview/specProgressReader.ts`
   - Export `readSpecProgress(story): Promise<SpecProgress | null>`
   - Export `renderSpecPhaseIndicator(progress): string`
   - Export caching logic for spec progress data

2. **Update**: `vscode-extension/src/treeview/PlanningTreeProvider.ts`
   - Add `specProgressCache` Map for caching spec data
   - Modify `getTreeItem()` to include spec phase indicator
   - Integrate with FileSystemWatcher to invalidate cache

3. **Update**: `vscode-extension/src/extension.ts`
   - Extend FileSystemWatcher to watch spec directories
   - Invalidate spec cache when phase files change

4. **Update tests**: `vscode-extension/src/test/suite/specPhaseIntegration.test.ts`
   - Test spec progress reading
   - Test phase counting logic
   - Test sync status detection

### Caching Strategy

- **Key**: Story item number (e.g., "S75")
- **Value**: SpecProgress object
- **Invalidation**:
  - When phase file changes (detected by FileSystemWatcher)
  - When spec plan.md changes
  - On manual TreeView refresh
- **Cache Lifetime**: In-memory cache, cleared on extension reload

### Performance Considerations

- Spec reading happens asynchronously (non-blocking)
- Cache hit rate should be > 80% after initial load
- File system reads batched where possible
- Use existing FrontmatterCache for plan.md reading

## Success Metrics

- All Stories with specs show phase progress
- Phase counts accurately reflect spec directory state
- No performance degradation (< 500ms refresh with 50+ specs)
- Out-of-sync warnings visible when spec/story diverge
- User can prioritize work based on spec progress visibility

## Dependencies

- Story frontmatter `spec:` field (already implemented)
- Spec directory structure (specs/*/tasks/*.md)
- FrontmatterCache for efficient frontmatter reading
- FileSystemWatcher for cache invalidation
- `/sync` command integration (S53)

## Child Items

- **S93**: Spec Progress Reader Utility - Core utility for reading spec phase progress from spec directories
- **S94**: Spec Progress Cache Layer - In-memory cache for spec progress data with FileSystemWatcher integration
- **S95**: Spec Phase Indicator Rendering - Rendering utility for formatting spec progress as compact visual indicators
- **S96**: TreeView Spec Indicator Integration - Integration of spec indicators into PlanningTreeProvider TreeView display
- **S97**: Spec Integration End-to-End Testing - Comprehensive E2E testing and performance validation

## Notes

- This feature depends on F24 (Progress Bar) for visual consistency
- Consider making phase list expandable in future iteration
- Sync warnings should link to `/sync` command for quick fixes
- Phase progress useful for sprint planning and capacity estimation
- May want to add keyboard shortcut to jump from Story to Spec directory
