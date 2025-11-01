---
item: S37
title: Workspace Activation Logic
type: story
status: In Progress
priority: High
dependencies: [S36]
estimate: S
created: 2025-10-12
updated: 2025-10-12
spec: specs/S37-workspace-activation-logic/
---

# S37 - Workspace Activation Logic

## Description

Implement intelligent workspace detection to ensure the extension only activates in workspaces containing `plans/` or `specs/` directories. This prevents the extension from running in unrelated projects and optimizes VSCode performance by avoiding unnecessary file watching.

## Acceptance Criteria

- [ ] Extension checks for existence of `plans/` or `specs/` directories on activation
- [ ] Extension fully activates only when directories are present
- [ ] Extension gracefully deactivates (or remains dormant) when directories are absent
- [ ] Works correctly with multi-root workspaces (checks all workspace folders)
- [ ] Handles Windows paths correctly (e.g., `D:\projects\lineage\plans`)
- [ ] Logs activation status to output channel with clear messaging
- [ ] Activation check completes quickly (< 100ms) to avoid blocking VSCode startup
- [ ] Re-checks workspace when workspace folders are added/removed dynamically

## Technical Notes

**VSCode APIs:**
```typescript
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

function shouldActivateExtension(): boolean {
  const workspaceFolders = vscode.workspace.workspaceFolders;

  if (!workspaceFolders) {
    return false;
  }

  for (const folder of workspaceFolders) {
    const plansPath = path.join(folder.uri.fsPath, 'plans');
    const specsPath = path.join(folder.uri.fsPath, 'specs');

    if (fs.existsSync(plansPath) || fs.existsSync(specsPath)) {
      return true;
    }
  }

  return false;
}
```

**Activation Events:**
Update `package.json` to use:
```json
"activationEvents": [
  "onStartupFinished",
  "workspaceContains:**/plans/**",
  "workspaceContains:**/specs/**"
]
```

**Dynamic Workspace Changes:**
Listen for workspace folder changes:
```typescript
vscode.workspace.onDidChangeWorkspaceFolders((event) => {
  // Re-evaluate activation condition
  // Start/stop file watchers as needed
});
```

**Logging Examples:**
- When activated: `✓ Lineage Planning extension activated (found plans/ directory)`
- When not activated: `ℹ Lineage Planning extension dormant (no plans/ or specs/ directories found)`
- Multi-root: `✓ Activated for workspace folder: D:\projects\lineage`

## Edge Cases

- **No workspace folders:** Extension should not activate (return early)
- **Multi-root workspace:** Activate if ANY folder has plans/ or specs/
- **Symbolic links:** Should follow symlinks to detect directories
- **Case sensitivity:** On Windows, directory detection should be case-insensitive (`Plans/` should match `plans/`)
- **Mid-session workspace changes:** Handle folders added/removed after initial activation

## Integration Points

- Workspace detection result will determine whether S38 (FileSystemWatcher) is initialized
- S38 will use workspace folder paths to construct watch patterns

## Definition of Done

- Extension activates in Lineage project (has plans/ and specs/)
- Extension does NOT activate in unrelated projects
- Activation status clearly logged to output channel
- Multi-root workspace handling verified
- Workspace folder changes handled dynamically
- No activation errors on Windows paths
