# VSCode Extension Testing Guide

## Overview

The Lineage Planning extension includes comprehensive unit testing using Mocha and the VSCode Extension Test framework.

## Running Tests

### Command Line

```bash
# Run all tests
cd vscode-extension
npm test

# Compile tests only
npm run test-compile

# Compile both extension and tests
npm run pretest
```

### VSCode Debugger

1. Open the project in VSCode
2. Go to Run and Debug (Ctrl+Shift+D)
3. Select "Extension Tests" from the dropdown
4. Press F5 to run tests in debug mode

## Running the Extension

### Local Installation Method (Recommended)

This is the most reliable way to test the extension:

1. **Package the extension:**
   ```bash
   cd vscode-extension
   npm run package
   ```

2. **Install in current VSCode:**
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. **Reload VSCode window:**
   - Press Ctrl+Shift+P
   - Type "Developer: Reload Window"
   - Press Enter

4. **Verify extension is running:**
   - Open Output panel (View → Output)
   - Select "Cascade" from the dropdown
   - Look for activation message
   - Open Activity Bar → Click Cascade icon
   - Verify TreeView shows planning items

### Verifying Extension is Running

After reloading the window:

1. Open Output panel (View → Output)
2. Select "Cascade" (or "Lineage Planning") from the dropdown
3. Look for activation message: `✅ Extension activated`
4. Open Activity Bar → Click Cascade icon
5. Verify TreeView displays planning items from plans/ directory
6. Check Output Channel for any logs or errors

## Test Structure

### Test Files

- `src/test/runTest.ts` - Test runner (launches VSCode and runs tests)
- `src/test/suite/index.ts` - Test suite index (discovers and runs test files)
- `src/test/suite/*.test.ts` - Individual test files

### Current Tests

(No test files currently exist - tests were removed with deprecated PlansDecorationProvider)

## Writing New Tests

Create a new test file in `src/test/suite/`:

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('My Test Suite', () => {
  test('My test case', () => {
    assert.strictEqual(1 + 1, 2);
  });
});
```

The test runner automatically discovers files matching `**/*.test.ts`.

## Test Coverage

Current coverage:
- ⏳ FrontmatterCache (TODO: Add tests in future PR)
- ⏳ Extension activation (TODO: Add integration tests)

## Debugging Tests

1. Set breakpoints in test files or source files
2. Run "Extension Tests" configuration
3. Debugger will pause at breakpoints
4. Use standard VSCode debugging tools (Step Over, Step Into, etc.)

## Common Issues

### Issue: "Cannot find module 'mocha'"

**Solution**: Run `npm install` in the vscode-extension directory.

### Issue: Tests fail with "Extension not found"

**Solution**: Run `npm run compile` before running tests.

### Issue: Extension changes not taking effect

**Solution**: After making code changes, repackage and reinstall:
```bash
cd vscode-extension
npm run compile
npm run package
code --install-extension cascade-0.1.0.vsix --force
```
Then reload window (Ctrl+Shift+P → "Developer: Reload Window")

## CI/CD Integration

To run tests in CI/CD:

```bash
cd vscode-extension
npm install
npm run pretest
npm test
```

Tests run headlessly using Electron.

## Manual Testing

For functionality that can't be unit tested:

1. Package and install extension locally (see above)
2. Reload VSCode window
3. Perform manual test steps:
   - Check Output Channel ("Cascade") for activation logs
   - Open Activity Bar → Cascade view
   - Verify TreeView displays planning items
   - Run "Cascade: Show Cache Statistics" command

Manual test checklists are in the respective spec task files.
