# CLAUDE.md

## Project Overview

**Cascade** - VSCode extension for hierarchical planning and project management. Provides visual kanban-style tracking of planning hierarchies (Projects → Epics → Features → Stories/Bugs) with real-time synchronization.

## Key Features

- **TreeView Panel**: Hierarchical display in Activity Bar
- **Status-Based Kanban**: Items grouped by status for pipeline visibility
- **Drag-and-Drop**: Visual status transitions with automatic file updates
- **Real-Time Sync**: Watches planning files for external changes
- **Context Menus**: Quick access to common operations

## Development Commands

```bash
# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npm run package

# Install locally
code --install-extension cascade-0.1.0.vsix --force

# Reload VSCode after install
# Ctrl+Shift+P → "Developer: Reload Window"
```

## Testing

**Output Channel:**
- View logs: Ctrl+Shift+P → "View: Toggle Output" → Select "Cascade"
- Shows activation logs, cache stats, file watcher events

**Cascade TreeView:**
- Open Activity Bar (left sidebar) → Cascade icon
- Should display planning items from `plans/` directory

## Project Structure

```
cascade/
├── src/                    # TypeScript source
│   ├── extension.ts        # Extension entry point
│   ├── parser.ts           # YAML frontmatter parser
│   ├── cache.ts            # Frontmatter cache layer
│   ├── statusIcons.ts      # Status icon mapping
│   └── treeview/           # TreeView components
├── plans/                  # Planning files (P2 - Cascade)
│   ├── epic-03-*/          # Archived file decoration approach
│   ├── epic-04-*/          # Planning Kanban View
│   ├── epic-05-*/          # Rich TreeView Visualization
│   └── project-cascade.md
├── specs/                  # Implementation specs (S36-S102+)
└── package.json           # Extension manifest
```

## Planning System

Plans stored in `plans/` directory using markdown frontmatter:

```yaml
---
item: S49
title: TreeDataProvider Core Implementation
type: story
status: Completed
epic: E4
feature: F16
---
```

## File References

When referencing code, use the pattern `file_path:line_number`:
- Controller: `src/treeview/PlanningDragAndDropController.ts:45`
- TreeView: `src/extension.ts:560-570`

## Development Notes

- Extension must be packaged and installed locally (F5 Extension Development Host not used)
- Always reload window after installing new version
- Check output channel for debugging information
- TreeView uses `TreeDataProvider` pattern for rendering
- Cache layer improves performance for large planning hierarchies

## Reference Documentation

- **Planning System**: See `claude-orchestrator` project for `/plan`, `/spec`, `/build` commands
- **Frontmatter Schema**: See `claude-orchestrator/docs/frontmatter-schema.md`
- **VSCode API**: https://code.visualstudio.com/api

## Performance Targets

- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- Hierarchy expansion < 50ms per level
- Cache hit rate > 80% after initial load

## Related Projects

- **lineage**: P1 - Godot RPG game (uses Cascade for planning)
- **claude-orchestrator**: P3 - Slash commands and planning infrastructure
