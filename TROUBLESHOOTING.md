# Extension Testing and Installation Troubleshooting

## Recommended Workflow: Local VSIX Installation

The most reliable way to test the extension is to install it locally as a VSIX package.

### Steps

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

4. **Test the extension:**
   - Open Output Channel ("Cascade")
   - Check for activation logs
   - Open Activity Bar → Cascade view
   - Verify TreeView displays planning items

This method is faster, more reliable, and closer to real user experience than Extension Development Host.

### Alternative: Extension Development Host (Not Recommended)

Extension Development Host has known issues with workspace opening. If you absolutely need it:

---

#### If Extension Development Host is Required:

Manual command-line launch (most reliable):

1. Compile the extension first:
   ```bash
   cd vscode-extension
   npm run compile
   ```

2. Launch VSCode from command line:
   ```bash
   code --extensionDevelopmentPath="D:\projects\lineage\vscode-extension" "D:\projects\lineage"
   ```

3. VSCode should launch with:
   - Extension loaded
   - Workspace opened
   - Extension activated

**However, we strongly recommend using the VSIX installation method instead** (see above), as it's more reliable and provides a better testing experience.

---

### Verification After Installation

Once you've installed the extension:

1. **Check Extension is Loaded**:
   - Open Output panel (View → Output)
   - Select "Cascade" (or "Lineage Planning") from dropdown
   - Should see activation messages with ✅ symbols

2. **Test TreeView**:
   - Open Activity Bar
   - Click Cascade icon (stacked cards)
   - Verify planning items appear in TreeView

3. **Test Cache**:
   - Run command: "Cascade: Show Cache Statistics"
   - Should display cache stats in notification

---

## Updating the Extension After Changes

When you make code changes, follow this workflow:

### Quick Update Process

1. Compile and package:
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   ```

2. Reinstall:
   ```bash
   code --install-extension cascade-0.1.0.vsix --force
   ```

3. Reload window:
   - Press Ctrl+Shift+P
   - Type "Developer: Reload Window"
   - Press Enter

### Alternative: Symlink Extension (Advanced)

1. Find your VSCode extensions folder:
   - Windows: `%USERPROFILE%\.vscode\extensions`
   - macOS/Linux: `~/.vscode/extensions`

2. Create symlink:
   ```bash
   # Windows (Run as Administrator)
   mklink /D "%USERPROFILE%\.vscode\extensions\lineage-planning-extension" "D:\projects\lineage\vscode-extension"

   # macOS/Linux
   ln -s /path/to/lineage/vscode-extension ~/.vscode/extensions/lineage-planning-extension
   ```

3. Restart VSCode
4. Extension loads automatically in all windows

---

## Common Error Messages and Solutions

### Error: "Extension host terminated unexpectedly"

**Cause**: Extension crashed during activation

**Solution**:
1. Check extension.ts for errors
2. Look at Output Channel ("Cascade") for error messages
3. Verify all dependencies installed: `cd vscode-extension && npm install`
4. Recompile and reinstall: `npm run compile && npm run package && code --install-extension cascade-0.1.0.vsix --force`

### Error: "Cannot find module"

**Cause**: Extension not compiled or dist/ folder missing

**Solution**:
```bash
cd vscode-extension
npm run compile
```

### Error: "ENOENT: no such file or directory"

**Cause**: Extension trying to access file that doesn't exist

**Solution**:
1. Check paths in extension.ts
2. Ensure plans/ or specs/ folders exist in workspace
3. Check Output Channel ("Cascade") for specific path errors

---

## Known Issues

### Issue: Extension Not Activating

**Description**: Extension installed but not showing activation messages

**Status**: Usually a workspace issue - extension only activates in workspaces with plans/ or specs/ directories

**Solution**:
1. Verify you're in a workspace with plans/ or specs/ directories
2. Check Output Channel ("Cascade") for activation logs
3. Reload window after installation

---

## Getting Help

If none of these solutions work:

1. Check VSCode version: `code --version`
2. Check extension compiles: `cd vscode-extension && npm run compile`
3. Check extension packages: `npm run package`
4. Try reinstalling: `code --install-extension cascade-0.1.0.vsix --force`
5. Check Output Channel ("Cascade") for error messages
6. Run tests to verify basic functionality: `npm test`

---

## Success Indicators

You'll know it's working when:

✅ Extension installs without errors
✅ Output Channel shows "Cascade" or "Lineage Planning"
✅ Activation messages appear in output (✅ symbols)
✅ Activity Bar shows Cascade icon (stacked cards)
✅ TreeView displays planning items from plans/ directory
✅ No errors in Output Channel

If you see all these, your extension is running correctly!
