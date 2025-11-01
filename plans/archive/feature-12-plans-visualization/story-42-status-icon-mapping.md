---
item: S42
title: Status Icon Mapping
type: story
status: Ready
priority: High
dependencies: [S41]
estimate: S
spec: specs/S42-status-icon-mapping/
created: 2025-10-13
updated: 2025-10-13
---

# S42 - Status Icon Mapping

## Description

Create a mapping system that translates frontmatter `status` field values into VSCode-compatible file decoration icons. This provides the visual vocabulary for displaying planning item states throughout the plans/ directory.

## Acceptance Criteria

- [ ] Status-to-icon mapping defined for all 6 status values
- [ ] Icons work in both light and dark VSCode themes
- [ ] Icons are visually distinct and recognizable
- [ ] Mapping uses Unicode or VSCode ThemeIcon API
- [ ] Helper function `getIconForStatus(status: string)` returns appropriate icon
- [ ] Invalid/unknown status values handled gracefully (return default icon)
- [ ] Icon colors defined using VSCode theme colors (not hardcoded)
- [ ] Documentation includes visual examples of each status icon
- [ ] Icons tested in both light and dark theme modes

## Technical Notes

**Status Values (from frontmatter schema):**
- `Not Started`
- `In Planning`
- `Ready`
- `In Progress`
- `Blocked`
- `Completed`

**Icon Options:**

Option 1 - Unicode Emojis:
```typescript
function getIconForStatus(status: string): string {
  const iconMap: Record<string, string> = {
    'Not Started': '○',    // Hollow circle
    'In Planning': '📝',   // Memo
    'Ready': '✓',          // Check mark
    'In Progress': '⏳',   // Hourglass
    'Blocked': '⛔',       // No entry sign
    'Completed': '✔',      // Heavy check mark
  };
  return iconMap[status] ?? '○'; // Default to hollow circle
}
```

Option 2 - VSCode ThemeIcon (Recommended):
```typescript
import * as vscode from 'vscode';

function getIconForStatus(status: string): vscode.ThemeIcon {
  const iconMap: Record<string, string> = {
    'Not Started': 'circle-outline',
    'In Planning': 'edit',
    'Ready': 'check',
    'In Progress': 'sync~spin',
    'Blocked': 'error',
    'Completed': 'pass-filled',
  };

  const iconId = iconMap[status] ?? 'circle-outline';
  return new vscode.ThemeIcon(iconId);
}
```

**VSCode ThemeIcon Benefits:**
- Automatically adjusts to theme (light/dark)
- Consistent with VSCode's icon design language
- Supports color hints via ThemeColor
- Better accessibility

**FileDecoration Badge Property:**
```typescript
new vscode.FileDecoration(
  badge, // string (1-2 chars) or undefined
  tooltip, // string or undefined
  color // ThemeColor or undefined
);
```

**Status Colors:**
```typescript
const colorMap: Record<string, vscode.ThemeColor | undefined> = {
  'Not Started': undefined,
  'In Planning': new vscode.ThemeColor('editorInfo.foreground'),
  'Ready': new vscode.ThemeColor('editorInfo.foreground'),
  'In Progress': new vscode.ThemeColor('editorWarning.foreground'),
  'Blocked': new vscode.ThemeColor('editorError.foreground'),
  'Completed': new vscode.ThemeColor('editorInfo.foreground'),
};
```

## Testing Strategy

Unit tests:
1. getIconForStatus() returns correct icon for each status
2. Unknown status returns default icon
3. Case-insensitive status matching (if applicable)
4. Icon format compatible with FileDecoration API

Manual testing:
1. Test in light theme (VSCode Light+)
2. Test in dark theme (VSCode Dark+)
3. Verify icons are visually distinct
4. Verify tooltips show status clearly
5. Check for accessibility (high contrast mode)

## Definition of Done

- Status-to-icon mapping function created
- All 6 status values mapped to appropriate icons
- Icons work in light and dark themes
- Default icon defined for unknown statuses
- TypeScript types enforce correct icon format
- Unit tests verify correct mapping
- Manual testing confirms visual clarity in both themes
- Ready for S44 to use this mapping for leaf items
