---
item: S43
title: File Type Detection
type: story
status: Not Started
priority: High
dependencies: [S41]
estimate: S
created: 2025-10-13
updated: 2025-10-13
---

# S43 - File Type Detection

## Description

Implement logic to detect whether a file in the plans/ directory is a leaf item (story/bug) or a parent item (feature/epic/project) based on file path patterns. This classification determines whether to show status icons (leaf) or completion badges (parent).

## Acceptance Criteria

- [ ] Function `getItemType(uri)` identifies file type from path
- [ ] Correctly identifies stories (`story-##-name.md`)
- [ ] Correctly identifies bugs (`bug-##-name.md`)
- [ ] Correctly identifies features (`feature-##-name/feature.md`)
- [ ] Correctly identifies epics (`epic-##-name/epic.md`)
- [ ] Correctly identifies project (`plans/project.md`)
- [ ] Returns `'leaf'` for stories and bugs
- [ ] Returns `'parent'` for features, epics, and projects
- [ ] Returns `'unknown'` for files that don't match patterns
- [ ] Handles Windows and Unix path separators
- [ ] Case-insensitive pattern matching (handles Story-01.md and story-01.md)

## Technical Notes

**File Path Patterns:**
```
plans/project.md                                      → parent (project)
plans/epic-##-name/epic.md                            → parent (epic)
plans/epic-##-name/feature-##-name/feature.md         → parent (feature)
plans/epic-##-name/feature-##-name/story-##-name.md   → leaf (story)
plans/epic-##-name/feature-##-name/bug-##-name.md     → leaf (bug)
```

**Implementation Approach:**
```typescript
type ItemType = 'leaf' | 'parent' | 'unknown';

function getItemType(uri: vscode.Uri): ItemType {
  const filePath = uri.fsPath;
  const fileName = path.basename(filePath);

  // Check if path contains /plans/ directory
  if (!filePath.includes('/plans/') && !filePath.includes('\\plans\\')) {
    return 'unknown';
  }

  // Leaf items: story-##-*.md or bug-##-*.md
  if (/story-\d+-.*\.md$/i.test(fileName)) {
    return 'leaf';
  }
  if (/bug-\d+-.*\.md$/i.test(fileName)) {
    return 'leaf';
  }

  // Parent items: feature.md, epic.md, project.md
  if (fileName.toLowerCase() === 'feature.md') {
    return 'parent';
  }
  if (fileName.toLowerCase() === 'epic.md') {
    return 'parent';
  }
  if (fileName.toLowerCase() === 'project.md' && filePath.includes('/plans/project.md')) {
    return 'parent';
  }

  return 'unknown';
}
```

**Alternative: Parse Frontmatter Type Field:**
- Use frontmatter cache to get `type` field
- Map `type: story/bug` → `'leaf'`
- Map `type: feature/epic/project` → `'parent'`
- More reliable but requires cache hit
- Fallback to path-based detection if cache miss

**Hybrid Approach (Recommended):**
```typescript
async function getItemType(uri: vscode.Uri, cache: FrontmatterCache): Promise<ItemType> {
  // Try frontmatter first (most reliable)
  const frontmatter = await cache.get(uri.fsPath);
  if (frontmatter) {
    if (frontmatter.type === 'story' || frontmatter.type === 'bug') {
      return 'leaf';
    }
    if (frontmatter.type === 'feature' || frontmatter.type === 'epic' || frontmatter.type === 'project') {
      return 'parent';
    }
  }

  // Fallback to path-based detection
  return getItemTypeFromPath(uri);
}
```

## Edge Cases

- Files in plans/ not matching naming convention: Return 'unknown'
- Files without frontmatter: Use path-based detection
- Temporary files (.tmp, ~): Return 'unknown'
- Hidden files (.git, .DS_Store): Return 'unknown'
- Directories: VSCode doesn't call provideFileDecoration for folders

## Testing Strategy

Unit tests:
1. Story files return 'leaf'
2. Bug files return 'leaf'
3. Feature files return 'parent'
4. Epic files return 'parent'
5. Project file returns 'parent'
6. Non-standard files return 'unknown'
7. Windows paths work correctly (backslashes)
8. Case-insensitive matching works

Integration tests:
1. Test with real Lineage project file paths
2. Verify all story files in plans/ classified correctly
3. Verify all feature/epic files classified correctly

## Definition of Done

- `getItemType()` function implemented and tested
- All file type patterns correctly identified
- Path normalization handles Windows/Unix differences
- Case-insensitive matching works
- Unknown files handled gracefully
- TypeScript types enforce return type safety
- Unit tests verify all patterns
- Integration test with real project files passes
- Ready for S44 and S46 to use for decoration logic
