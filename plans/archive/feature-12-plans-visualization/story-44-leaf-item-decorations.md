---
item: S44
title: Leaf Item Decorations
type: story
status: Not Started
priority: High
dependencies: [S41, S42, S43]
estimate: M
created: 2025-10-13
updated: 2025-10-13
---

# S44 - Leaf Item Decorations

## Description

Implement status icon decorations for leaf items (stories and bugs) in the plans/ directory. Icons display the current status from frontmatter, providing at-a-glance visibility into work item states directly in the file explorer.

## Acceptance Criteria

- [ ] Stories display status icon based on frontmatter `status` field
- [ ] Bugs display status icon based on frontmatter `status` field
- [ ] Icons update automatically when file status changes
- [ ] Tooltip shows "[Type]: [Title] - Status: [Status]"
- [ ] Only leaf items (stories/bugs) get status icons (not features/epics)
- [ ] Files without frontmatter show no decoration or error indicator
- [ ] Parse errors show warning decoration
- [ ] Icons visible in both light and dark themes
- [ ] No visual conflicts with git decorations
- [ ] Decoration appears within 1 second of file save

## Technical Notes

**Implementation in provideFileDecoration():**
```typescript
async provideFileDecoration(uri: vscode.Uri): Promise<vscode.FileDecoration | undefined> {
  // Filter to plans/ directory only
  if (!uri.fsPath.includes('/plans/')) {
    return undefined;
  }

  // Check if leaf item (story or bug)
  const itemType = await getItemType(uri, this.cache);
  if (itemType !== 'leaf') {
    return undefined; // Let S46 handle parent items
  }

  // Get frontmatter from cache
  const frontmatter = await this.cache.get(uri.fsPath);
  if (!frontmatter) {
    // No frontmatter or parse error
    return undefined; // Could show warning icon in future
  }

  // Get status icon
  const badge = getStatusBadge(frontmatter.status);
  const color = getStatusColor(frontmatter.status);

  // Build tooltip
  const tooltip = `${frontmatter.type}: ${frontmatter.title} - Status: ${frontmatter.status}`;

  return new vscode.FileDecoration(badge, tooltip, color);
}
```

**Badge Format (1-2 characters):**
```typescript
function getStatusBadge(status: string): string {
  const badgeMap: Record<string, string> = {
    'Not Started': '○',
    'In Planning': '📝',
    'Ready': '✓',
    'In Progress': '⏳',
    'Blocked': '⛔',
    'Completed': '✔',
  };
  return badgeMap[status] ?? '○';
}
```

**Color Hints:**
```typescript
function getStatusColor(status: string): vscode.ThemeColor | undefined {
  const colorMap: Record<string, string | undefined> = {
    'Not Started': undefined,
    'In Planning': 'charts.blue',
    'Ready': 'charts.green',
    'In Progress': 'charts.yellow',
    'Blocked': 'charts.red',
    'Completed': 'terminal.ansiGreen',
  };

  const colorId = colorMap[status];
  return colorId ? new vscode.ThemeColor(colorId) : undefined;
}
```

**Performance Considerations:**
- Cache hit is < 1ms (from S40 performance tests)
- Decoration provider called frequently by VSCode
- Ensure no blocking operations in provideFileDecoration()
- Use async/await properly for cache access

## Edge Cases

- File without frontmatter: Return undefined (no decoration)
- File with invalid YAML: Return undefined or warning decoration
- File with missing status field: Use default icon
- File deleted while providing decoration: Handle gracefully
- Cache invalidation during decoration: Return stale data (will refresh soon)

## Testing Strategy

Unit tests:
1. Story file returns correct status decoration
2. Bug file returns correct status decoration
3. Feature file returns undefined (not handled by this story)
4. File without frontmatter returns undefined
5. Each status value produces correct badge

Manual testing:
1. Create test story with "Not Started" status → verify hollow circle
2. Edit status to "In Progress" → verify hourglass appears
3. Edit status to "Completed" → verify check mark appears
4. Test with multiple stories with different statuses
5. Verify tooltips show correct information
6. Test in light and dark themes

Performance testing:
1. Open plans/ directory with 50+ stories
2. Verify decorations appear within 1 second
3. Modify multiple files rapidly → verify decorations update
4. Check cache hit rate in output channel (should be >90%)

## Definition of Done

- Leaf items (stories/bugs) show status icon decorations
- All 6 status values display correct icons
- Tooltips provide clear status information
- Decorations visible in light and dark themes
- No performance issues with large directories
- Cache integration working (hits logged in output channel)
- Manual testing confirms correct behavior
- Ready for S46 to add parent item badge decorations
