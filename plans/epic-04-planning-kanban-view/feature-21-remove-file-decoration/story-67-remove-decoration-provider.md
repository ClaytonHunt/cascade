---
item: S67
title: Remove FileDecorationProvider Registration
type: story
parent: F21
status: Completed
priority: Low
dependencies: [F20]
estimate: XS
created: 2025-10-17
updated: 2025-10-23
spec: specs/S67-remove-decoration-provider/
---

# S67 - Remove FileDecorationProvider Registration

## Description

Remove all FileDecorationProvider registration code from extension.ts and delete the decorationProvider.ts file. This story focuses on unregistering the decoration system from VSCode and cleaning up the provider class.

The PlansDecorationProvider was part of Epic 03's file decoration approach (archived). Now that the Cascade TreeView (F16-F20) provides superior visualization, this provider is redundant and should be removed.

### Scope

**Files to Modify:**
- `vscode-extension/src/extension.ts` - Remove provider import, instantiation, registration
- `vscode-extension/src/decorationProvider.ts` - Delete entire file

**Code Changes in extension.ts:**

**Line 16 (Remove import):**
```typescript
// BEFORE
import { PlansDecorationProvider } from './decorationProvider';

// AFTER
// (Line deleted)
```

**Lines 1112-1122 (Remove provider registration):**
```typescript
// BEFORE
// Initialize decoration provider for plans/ directory
outputChannel.appendLine('--- File Decoration Provider ---');
decorationProvider = new PlansDecorationProvider(outputChannel);

// Register provider with VSCode
const decorationDisposable = vscode.window.registerFileDecorationProvider(decorationProvider);
context.subscriptions.push(decorationDisposable);

outputChannel.appendLine('✅ Decoration provider registered');
outputChannel.appendLine('   Provider will decorate files in plans/ directory');
outputChannel.appendLine('');

// AFTER
// (Section deleted)
```

**Lines 1334-1342 (Remove deactivate() disposal code):**
```typescript
// BEFORE
// Dispose decoration provider
if (decorationProvider) {
  decorationProvider.dispose();
  decorationProvider = null;

  if (outputChannel) {
    outputChannel.appendLine('✅ Decoration provider disposed');
  }
}

// AFTER
// (Section deleted)
```

**Lines 28-29 (Remove module-level variable):**
```typescript
// BEFORE
// Decoration provider for extension (module-level for FileSystemWatcher access)
let decorationProvider: PlansDecorationProvider | null = null;

// AFTER
// (Lines deleted)
```

**Delete File:**
- `vscode-extension/src/decorationProvider.ts` (entire file)

### Technical Details

**Verification Steps:**
1. Grep codebase for references to `decorationProvider`:
   ```bash
   grep -r "decorationProvider" vscode-extension/src/
   # Expected: No results (or only commented references)
   ```

2. Grep for `PlansDecorationProvider`:
   ```bash
   grep -r "PlansDecorationProvider" vscode-extension/src/
   # Expected: No results
   ```

3. Check extension activation logs:
   - Should NOT show "File Decoration Provider" section
   - Should still show "Cascade TreeView" section

4. Verify File Explorer behavior:
   - Open plans/ directory in File Explorer
   - Confirm no status badges appear on markdown files
   - Confirm no color changes on file names

**Dependencies:**
- **F20 (Real-Time Synchronization)**: Must be complete to ensure TreeView fully replaces decoration functionality
- No other code depends on PlansDecorationProvider (it's isolated)

## Acceptance Criteria

- [ ] `decorationProvider.ts` file deleted from vscode-extension/src/
- [ ] PlansDecorationProvider import removed from extension.ts:16
- [ ] decorationProvider variable declaration removed from extension.ts:28-29
- [ ] Provider instantiation and registration removed from activate() (lines 1112-1122)
- [ ] Provider disposal code removed from deactivate() (lines 1334-1342)
- [ ] No references to `decorationProvider` in codebase (verified via grep)
- [ ] No references to `PlansDecorationProvider` in codebase (verified via grep)
- [ ] Extension activates without errors
- [ ] Activation logs do NOT show "File Decoration Provider" section
- [ ] File Explorer shows no status badges on planning files
- [ ] File Explorer shows no status colors on planning files
- [ ] Cascade TreeView remains fully functional
