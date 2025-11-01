---
item: S45
title: Hierarchical Progress Calculation
type: story
status: Not Started
priority: High
dependencies: [S41, S43]
estimate: L
created: 2025-10-13
updated: 2025-10-13
---

# S45 - Hierarchical Progress Calculation

## Description

Implement logic to calculate completion statistics for parent items (features, epics, projects) by scanning child item files and counting completed vs total items. This provides the data foundation for displaying "X/Y" badges on parent items.

## Acceptance Criteria

- [ ] Function `calculateProgress(uri)` returns `{completed, total}` for parent items
- [ ] Feature files count completed/total stories and bugs in feature directory
- [ ] Epic files count completed/total features in epic directory
- [ ] Project file counts completed/total epics in plans directory
- [ ] Progress calculation uses frontmatter cache for performance
- [ ] Progress results cached with invalidation on child file changes
- [ ] Calculation handles missing files gracefully (skip, don't crash)
- [ ] Calculation handles files without frontmatter (exclude from count)
- [ ] Recursive directory scanning works on Windows and Unix
- [ ] Performance: Calculate progress for 100 items in < 500ms

## Technical Notes

**Hierarchy Logic:**
```
Project (plans/project.md)
└── Counts epics: plans/epic-##-name/epic.md

Epic (plans/epic-##-name/epic.md)
└── Counts features: plans/epic-##-name/feature-##-name/feature.md

Feature (plans/epic-##-name/feature-##-name/feature.md)
└── Counts stories + bugs: plans/epic-##-name/feature-##-name/{story,bug}-##-name.md
```

**Implementation:**
```typescript
interface ProgressStats {
  completed: number;
  total: number;
}

async function calculateProgress(
  uri: vscode.Uri,
  cache: FrontmatterCache
): Promise<ProgressStats> {
  const itemType = await getItemType(uri, cache);

  if (itemType === 'leaf') {
    // Leaf items don't have children
    return { completed: 0, total: 0 };
  }

  // Determine child pattern based on parent type
  const childPattern = getChildPattern(uri, itemType);

  // Find child files
  const childUris = await vscode.workspace.findFiles(childPattern);

  let completed = 0;
  let total = 0;

  // Count completed children
  for (const childUri of childUris) {
    const frontmatter = await cache.get(childUri.fsPath);

    if (!frontmatter) {
      continue; // Skip files without frontmatter
    }

    total++;

    if (frontmatter.status === 'Completed') {
      completed++;
    }
  }

  return { completed, total };
}

function getChildPattern(uri: vscode.Uri, itemType: ItemType): vscode.RelativePattern {
  const folderUri = vscode.Uri.file(path.dirname(uri.fsPath));

  if (itemType === 'parent') {
    const fileName = path.basename(uri.fsPath);

    if (fileName === 'feature.md') {
      // Count stories and bugs in this feature folder
      return new vscode.RelativePattern(folderUri, '{story,bug}-*-*.md');
    }

    if (fileName === 'epic.md') {
      // Count features in this epic folder (feature-##-name/feature.md)
      return new vscode.RelativePattern(folderUri, 'feature-*/feature.md');
    }

    if (fileName === 'project.md') {
      // Count epics in plans folder (epic-##-name/epic.md)
      const plansUri = vscode.Uri.file(path.dirname(uri.fsPath));
      return new vscode.RelativePattern(plansUri, 'epic-*/epic.md');
    }
  }

  // Unknown or leaf - no children
  return new vscode.RelativePattern(folderUri, '_.non_existent_pattern');
}
```

**Progress Cache:**
```typescript
class ProgressCache {
  private cache: Map<string, ProgressStats>;
  private cacheTimestamps: Map<string, number>;

  async get(uri: vscode.Uri, calculator: () => Promise<ProgressStats>): Promise<ProgressStats> {
    const key = uri.fsPath.toLowerCase();
    const cached = this.cache.get(key);

    if (cached) {
      return cached;
    }

    // Calculate and cache
    const stats = await calculator();
    this.cache.set(key, stats);
    this.cacheTimestamps.set(key, Date.now());

    return stats;
  }

  invalidate(uri: vscode.Uri): void {
    const key = uri.fsPath.toLowerCase();
    this.cache.delete(key);

    // Also invalidate parent folders (their child counts changed)
    this.invalidateParents(uri);
  }

  private invalidateParents(uri: vscode.Uri): void {
    // Invalidate feature.md if child is story/bug
    // Invalidate epic.md if child is feature.md
    // Invalidate project.md if child is epic.md
    // Implementation: Walk up directory tree
  }
}
```

**FileSystemWatcher Integration:**
```typescript
// In createFileSystemWatchers() - add to handleChange and handleDelete
const handleChange = (uri: vscode.Uri) => {
  cache.invalidate(uri.fsPath);

  // Invalidate progress cache for parent items
  progressCache.invalidate(uri);

  // Trigger decoration refresh for parent items
  decorationProvider.refreshParents(uri);
};
```

## Performance Optimization

**Caching Strategy:**
- Cache progress results per parent file
- Invalidate when child files change
- Invalidate parent progress when any child changes
- TTL: Cache valid until child file modification

**Batching:**
- FileSystemWatcher debouncing (300ms) reduces recalculation frequency
- Batch decoration updates (multiple files changed → single refresh)

**Lazy Calculation:**
- Only calculate progress when decoration requested
- Don't pre-calculate for all files on startup
- Cache prevents redundant calculations

## Edge Cases

- Feature with no stories: Progress = "0/0"
- Epic with no features: Progress = "0/0"
- Child files without frontmatter: Exclude from count
- Child files with parse errors: Exclude from count
- Directory renamed: Progress cache invalidated (path changed)
- File moved between features: Invalidate both old and new parent progress

## Testing Strategy

Unit tests:
1. Feature with 3 stories (2 completed) → {completed: 2, total: 3}
2. Epic with 5 features (1 completed) → {completed: 1, total: 5}
3. Project with 2 epics (0 completed) → {completed: 0, total: 2}
4. Feature with no stories → {completed: 0, total: 0}
5. Feature with stories missing frontmatter → exclude from count
6. Progress cache returns cached value on second call
7. Progress cache invalidates on child file change

Integration tests:
1. Calculate progress for real Lineage feature (F11)
2. Modify story status → verify parent progress updates
3. Add new story → verify parent total increments
4. Delete story → verify parent total decrements

Performance tests:
1. Calculate progress for feature with 50 stories: < 100ms
2. Calculate progress for epic with 10 features (100 total stories): < 500ms
3. Cache hit latency: < 1ms

## Definition of Done

- calculateProgress() function implemented and tested
- Progress correctly calculated for features, epics, and projects
- Progress cache reduces redundant calculations
- FileSystemWatcher integration invalidates progress cache
- Performance targets met (< 500ms for 100 items)
- Edge cases handled gracefully
- Unit and integration tests pass
- Manual testing confirms accurate progress counts
- Ready for S46 to display progress badges
