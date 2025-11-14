# Cascade - Hierarchical Work Item Tracker

**Visual tracking for hierarchical work items with automatic state propagation.** Track projects, epics, features, stories, and tasks in a unified TreeView with real-time progress updates.

Perfect for AI-assisted development workflows, Agile planning, and complex project management.

## Features

### 📊 Hierarchical Work Item Visualization
View your entire project structure at a glance with support for six levels of hierarchy:
- **Project** → **Epic** → **Feature** → **Story** → **Phase** → **Task**

### 🔄 Automatic State Propagation
Child status updates automatically roll up to parent items. Update a task's progress, and watch it propagate through stories, features, epics, and projects instantly.

### 📈 Real-Time Progress Tracking
- Visual progress percentages for all parent items
- Color-coded status icons that adapt to your VSCode theme
- Instant updates via file system watchers

### 🎯 Status-Based Workflow
Track items through their complete lifecycle:
- **Not Started** → **In Planning** → **Ready** → **In Progress** → **Completed** → **Archived**
- Support for **Blocked** status to identify bottlenecks

### 🔍 Registry-Based Organization
All work items are managed through a centralized `work-item-registry.json` file with individual `state.json` files for tracking progress and status.

### 🎨 Theme-Aware UI
Icons and progress indicators automatically adapt to your VSCode theme (Dark+, Light+, and custom themes).

## Installation

### From VS Code Marketplace

1. Open VSCode
2. Go to Extensions (Ctrl+Shift+X / Cmd+Shift+X)
3. Search for "Cascade"
4. Click Install

### From VSIX File

```bash
code --install-extension cascade-[version].vsix
```

Then reload VSCode: **Ctrl+Shift+P** → **"Developer: Reload Window"**

## Quick Start

### 1. Create Directory Structure

Create a `.cascade/` directory in your workspace root:

```bash
mkdir .cascade
```

### 2. Create Work Item Registry

Create `.cascade/work-item-registry.json`:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-01-14T10:00:00Z",
  "work_items": {
    "P0001": {
      "id": "P0001",
      "type": "Project",
      "title": "My Awesome Project",
      "status": "in-progress",
      "parent": null,
      "path": "P0001.md",
      "created": "2025-01-14",
      "updated": "2025-01-14"
    },
    "E0001": {
      "id": "E0001",
      "type": "Epic",
      "title": "Core Features",
      "status": "in-progress",
      "parent": "P0001",
      "path": "E0001-core-features/E0001.md",
      "created": "2025-01-14",
      "updated": "2025-01-14"
    }
  }
}
```

### 3. Create Work Item Files

Create markdown files with optional content:

```bash
mkdir -p .cascade/E0001-core-features
echo "# Core Features Epic" > .cascade/E0001-core-features/E0001.md
echo "# My Awesome Project" > .cascade/P0001.md
```

### 4. View in Cascade

Click the **Cascade icon** in the Activity Bar (left sidebar) to see your work items!

## Usage

### Viewing Work Items

- Click the Cascade icon in the Activity Bar
- Expand/collapse hierarchy levels
- Click any item to open its markdown file

### Updating Progress

When using with CARL (Coding Assistant for Rapid Launch) or manually:

1. Edit `state.json` files for parent items (Stories, Features, Epics, Projects)
2. Update child status in the parent's state.json:
   ```json
   {
     "id": "S0001",
     "status": "in-progress",
     "children": {
       "T0001": {
         "status": "completed",
         "progress": 100
       }
     }
   }
   ```
3. Cascade automatically propagates changes up the hierarchy

### Commands

- **Cascade: Refresh** - Manually refresh the TreeView
- **Cascade: Validate Hierarchy** - Check for structural issues
- **Cascade: Toggle Archived Items** - Show/hide archived items

## Requirements

- **Visual Studio Code** 1.80.0 or higher
- A workspace with `.cascade/` directory structure

## Extension Settings

This extension contributes the following settings:

| Setting | Default | Description |
|---------|---------|-------------|
| `cascade.refreshDebounceDelay` | 300 | Refresh delay in milliseconds |
| `cascade.enableGitOperationDetection` | true | Enable git operation detection |
| `cascade.gitOperationDebounceDelay` | 500 | Git operation debounce delay (ms) |

## Known Issues

- File watchers may not detect changes in very large hierarchies (1000+ items)
- State propagation can take a few seconds for deeply nested structures

See [GitHub Issues](https://github.com/ClaytonHunt/cascade/issues) for current bugs and feature requests.

## Contributing

Contributions are welcome! This project is licensed under **AGPL-3.0**, which requires that any modifications shared publicly (especially as a service) must also be open-sourced.

Please see [CONTRIBUTING.md](https://github.com/ClaytonHunt/cascade/blob/master/CONTRIBUTING.md) for guidelines.

## Roadmap

- [ ] Visual drag-and-drop for status changes
- [ ] Inline editing of work item titles
- [ ] Search and filter functionality
- [ ] Export to various formats (CSV, JSON, Markdown)
- [ ] Integration with GitHub Issues
- [ ] Customizable status workflows

## Development

```bash
# Clone repository
git clone https://github.com/ClaytonHunt/cascade.git
cd cascade

# Install dependencies
npm install

# Compile TypeScript
npm run compile

# Watch mode (auto-compile on changes)
npm run watch

# Package extension
npm run package

# Install locally for testing
code --install-extension cascade-0.3.1.vsix --force
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)** - see the [LICENSE](https://github.com/ClaytonHunt/cascade/blob/master/LICENSE) file for details.

**Copyright (C) 2024-2025 Clayton Hunt**

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

### Why AGPL-3.0?

AGPL-3.0 ensures that if anyone modifies and deploys this extension (especially as a service), they must share their modifications. This promotes community collaboration while protecting against proprietary forks.

## Support

- 📖 [Documentation](https://github.com/ClaytonHunt/cascade#readme)
- 🐛 [Report Issues](https://github.com/ClaytonHunt/cascade/issues)
- 💡 [Request Features](https://github.com/ClaytonHunt/cascade/issues/new)
- 📧 Contact: [Create an issue](https://github.com/ClaytonHunt/cascade/issues)

## Acknowledgments

Built with:
- [VSCode Extension API](https://code.visualstudio.com/api)
- [js-yaml](https://github.com/nodeca/js-yaml) for YAML parsing
- TypeScript for robust type safety

---

## Release Notes

### 0.3.1 (Latest)

- ✨ Enhanced file watchers for real-time updates
- 🔍 Added support for markdown file and registry changes
- 🐛 Improved structure change detection
- 📝 Better logging for debugging

### 0.3.0

- 🎉 Initial public release
- 📊 Hierarchical work item tracking
- 🔄 Automatic state propagation engine
- 🌳 TreeView visualization
- 📁 Support for `.cascade/` directory structure

---

**Enjoy tracking your work items with Cascade!** ⚡
