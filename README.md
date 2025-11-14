# Cascade - Hierarchical Work Item Tracker

Visual tracking for hierarchical work items with automatic state propagation. Track projects, epics, features, stories, and tasks in a unified TreeView with real-time progress updates.

## Features

- 📊 **Hierarchical View**: Project → Epic → Feature → Story → Phase → Task
- 🔄 **Auto State Propagation**: Child status updates automatically roll up to parents
- 📈 **Progress Tracking**: Visual progress bars and percentages
- 🎯 **Status Management**: Track work items through their lifecycle
- 🔍 **Work Item Registry**: Centralized tracking via `.cascade/` directory
- 🔔 **Real-Time Updates**: File watchers for instant synchronization
- 🎨 **Theme Compatible**: Icons adapt to your VSCode theme

## Installation

### From VSIX (Local)

```bash
code --install-extension cascade-[version].vsix --force
```

Then reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"

### From Marketplace (Coming Soon)

Search for "Cascade" in VSCode Extensions marketplace.

## Usage

1. **Create `.cascade/` directory** in your workspace root
2. **Add `work-item-registry.json`** with your work items:
   ```json
   {
     "version": "1.0.0",
     "work_items": {
       "P0001": {
         "id": "P0001",
         "type": "Project",
         "title": "My Project",
         "status": "in-progress",
         "parent": null,
         "path": "P0001.md"
       }
     }
   }
   ```
3. **View hierarchy** in the Cascade Activity Bar icon (left sidebar)
4. **Track progress** - Updates propagate automatically!

## Requirements

- VS Code 1.80.0 or higher
- Workspace with `.cascade/` directory

## Extension Settings

This extension contributes the following settings:

* `cascade.refreshDebounceDelay`: Refresh delay in milliseconds (default: 300ms)
* `cascade.enableGitOperationDetection`: Enable git operation detection (default: true)
* `cascade.gitOperationDebounceDelay`: Git operation debounce delay (default: 500ms)

## Known Issues

See [GitHub Issues](https://github.com/ClaytonHunt/cascade/issues) for current bugs and feature requests.

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

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

# Install locally
code --install-extension cascade-0.3.1.vsix --force
```

## License

This project is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0) - see the [LICENSE](LICENSE) file for details.

**Copyright (C) 2024-2025 Clayton Hunt**

This program is free software: you can redistribute it and/or modify it under the terms of the GNU Affero General Public License as published by the Free Software Foundation, either version 3 of the License, or (at your option) any later version.

## Release Notes

### 0.3.1
- Enhanced file watchers for real-time updates
- Added support for markdown file and registry changes
- Improved structure change detection
- Better logging for debugging

### 0.3.0
- Initial release with `.cascade/` directory support
- Hierarchical work item tracking
- Automatic state propagation engine
- TreeView visualization

---

**Enjoy tracking your work items with Cascade!**
