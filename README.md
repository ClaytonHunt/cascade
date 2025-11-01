# Lineage Planning & Spec Status Extension

VSCode extension providing visual status tracking for the Lineage planning and specification system. Displays hierarchical progress through the Cascade TreeView with status icons.

## Features

- **Cascade TreeView**: Hierarchical status visualization with icons for planning items (Epics, Features, Stories, Bugs)
- **Spec Tracking**: Progress indicators for specification phases and tasks
- **Frontmatter-Driven**: Reads status from YAML frontmatter in markdown files
- **Real-Time Updates**: File system watching for instant status changes
- **Archive Support**: Automatic detection of archived items via frontmatter status or directory location

### Archive Detection

Cascade automatically detects archived planning items using two methods:

1. **Frontmatter Status**: Items with `status: Archived` in frontmatter
2. **Directory Location**: Items in `plans/archive/` directory

#### Usage

**Archive by Frontmatter:**
```yaml
---
item: S75
title: Old Feature
type: story
status: Archived  # Marks item as archived
priority: Low
---
```

**Archive by Moving File:**
```bash
# Move file to archive directory
mv plans/epic-05/story-75-old.md plans/archive/
```

Both methods work independently - choose the workflow that fits your needs.

#### Technical Details

- Path detection is case-insensitive (`Archive`, `ARCHIVE`, `archive` all work)
- Works with nested paths: `plans/archive/epic-04/feature-16/story.md`
- Cross-platform: Handles Windows (`\`) and Unix (`/`) path separators
- Performance: < 0.01ms per item, efficient with 1000+ items

For implementation details, see `vscode-extension/src/treeview/archiveUtils.ts`.

### Status Badges

Planning items display visual status badges using VSCode's Codicon system. Badges appear in the TreeView description field with color-coded icons that automatically adapt to your active theme.

#### Badge Examples

| Status      | Badge Display               | Icon Meaning              |
|-------------|-----------------------------|---------------------------|
| Not Started | ○ Not Started               | Empty circle (neutral)    |
| In Planning | ● In Planning               | Filled circle (attention) |
| Ready       | ● Ready                     | Filled circle (prepared)  |
| In Progress | ⚙ In Progress              | Gear icon (active work)   |
| Blocked     | ⊗ Blocked                   | Error icon (issue)        |
| Completed   | ✓ Completed                 | Checkmark (success)       |
| Archived    | 📦 Archived                 | Archive box (inactive)    |

**Note:** Icons shown above are approximations. Actual icons use VSCode Codicons and adapt to your theme colors.

#### Theme Compatibility

Status badges have been validated in **Dark+** theme with excellent readability. The Codicon system ensures badges automatically adapt to both light and dark themes:

- **Dark themes**: Light icons on dark background (high contrast)
- **Light themes**: Dark icons on light background (automatic adaptation)
- **Custom themes**: Badges inherit theme's semantic colors (errorForeground, testing.iconPassed, etc.)

**Tested Status Values:**
- ✅ Not Started: Gray circle outline - Clear visibility
- ✅ Ready: Green filled circle - Excellent contrast
- ✅ In Progress: Blue gear icon - Highly visible
- ✅ Completed: Green checkmark - Perfect success indicator

All tested badges achieve perfect readability (5/5 rating) in Dark+ theme. Light+ and custom themes should work correctly due to Codicon's automatic theme adaptation, though they have not been formally tested.

#### Technical Details

- **Implementation**: `vscode-extension/src/treeview/badgeRenderer.ts`
- **Icon Format**: `$(icon-name) Status Text` (VSCode Codicon syntax)
- **Theme System**: Automatic color adaptation via VSCode semantic tokens
- **Performance**: Static mapping, < 0.01ms per badge render

For detailed testing results, see `docs/badge-theme-testing.md`.

## Development

### Prerequisites

- Node.js 16+
- VSCode 1.80.0+

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build extension:
   ```bash
   npm run compile
   ```

### Running

Package and install extension locally:
```bash
npm run package
code --install-extension cascade-0.1.0.vsix --force
```

Then reload VSCode window (Ctrl+Shift+P → "Developer: Reload Window")

### Debugging

- View extension logs in Output Channel ("Cascade")
- For detailed debugging, use the local installation method above
- Logs show activation, file processing, and cache statistics

### Watch Mode

Run `npm run watch` for automatic rebuilds on file changes.

## Project Structure

```
vscode-extension/
├── src/
│   └── extension.ts       # Extension entry point
├── dist/                  # Compiled output (gitignored)
├── .vscode/
│   ├── launch.json        # Debug configuration
│   └── tasks.json         # Build tasks
├── package.json           # Extension manifest
├── tsconfig.json          # TypeScript configuration
└── esbuild.js             # Build script
```

## Implementation Status

- ✅ **S36**: Extension Project Scaffold
- ⏳ **S37**: Workspace Activation Logic
- ⏳ **S38**: File System Watcher
- ⏳ **S39**: YAML Frontmatter Parser
- ⏳ **S40**: Frontmatter Cache Layer

## Related Documentation

- [Extension API](https://code.visualstudio.com/api)
- [Epic E3](../plans/epic-03-vscode-planning-extension/epic.md)
- [Feature F11](../plans/epic-03-vscode-planning-extension/feature-11-extension-infrastructure/feature.md)
