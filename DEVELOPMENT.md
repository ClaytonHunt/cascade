# Extension Development Workflow

## TL;DR - Recommended Workflow

The simplest way to develop and test the extension:

```bash
# After making code changes:
cd vscode-extension
npm run compile
npm run package
code --install-extension lineage-planning-extension-0.1.0.vsix --force

# Then reload VSCode: Ctrl+Shift+P → "Developer: Reload Window"
```

---

## Development Workflow Options

### Option 1: VSIX Installation (Recommended) ✅

**Best for:** Day-to-day development, testing, validation

**Pros:**
- ✅ Works reliably every time
- ✅ No Extension Development Host issues
- ✅ Faster (no debugger overhead)
- ✅ See real user experience
- ✅ Can still view logs in Output channel

**Workflow:**
1. Make code changes
2. Compile: `npm run compile`
3. Package: `npm run package`
4. Install: `code --install-extension lineage-planning-extension-0.1.0.vsix --force`
5. Reload: Ctrl+Shift+P → "Developer: Reload Window"
6. Test in your workspace

**Automation script** (`reinstall.bat`):
```batch
@echo off
npm run compile && npm run package && code --install-extension lineage-planning-extension-0.1.0.vsix --force
echo.
echo Extension reinstalled! Press Ctrl+Shift+P and select "Developer: Reload Window"
pause
```

---

### Option 2: Advanced Debugging (if needed)

**Note:** For most development, Option 1 (VSIX installation) is recommended. Advanced debugging with breakpoints can be done if absolutely necessary, but the local installation workflow is more reliable and faster.

**If you need breakpoint debugging:**
- Consider using extensive logging in Output Channel instead
- Use `console.log` statements (visible in Output Channel)
- VSIX installation method is significantly more reliable for day-to-day testing

---

### Option 3: Symlink Extension (Advanced)

**Best for:** Automatic updates without reinstalling

**Pros:**
- ✅ Changes reflected immediately (after window reload)
- ✅ No need to reinstall VSIX
- ✅ Useful for rapid iteration

**Cons:**
- ❌ Requires admin permissions (Windows)
- ❌ Can confuse VSCode extension management

**Setup (one-time):**
```batch
REM Windows (Run as Administrator)
mklink /D "%USERPROFILE%\.vscode\extensions\lineage-planning-dev" "D:\projects\lineage\vscode-extension"
```

Then just compile and reload:
```bash
npm run compile
# Ctrl+Shift+P → "Developer: Reload Window"
```

---

## Testing Workflow

### Unit Tests

Run automated tests:
```bash
npm test
```

See `TESTING.md` for details.

### Manual Testing

After installing extension (Option 1):

1. **Check Activation:**
   - Open Output → "Cascade" (or "Lineage Planning")
   - Should see activation message with ✅ symbols

2. **Test TreeView:**
   - Open Activity Bar → Click Cascade icon
   - Verify planning items appear in TreeView
   - Check Output Channel for logs

3. **Test Cache:**
   - Run command: "Cascade: Show Cache Statistics"
   - Should show cache stats

---

## Troubleshooting

### Extension Not Updating After Reinstall

**Solution:** Completely uninstall first, then reinstall:
```bash
code --uninstall-extension lineage.lineage-planning-extension
code --install-extension lineage-planning-extension-0.1.0.vsix
# Ctrl+Shift+P → "Developer: Reload Window"
```

### Old Logs Still Appearing

**Cause:** Old extension version still running

**Solution:**
1. Uninstall: `code --uninstall-extension lineage.lineage-planning-extension`
2. Close ALL VSCode windows
3. Reopen VSCode
4. Reinstall VSIX
5. Reload window

### Extension Development Host Issues

**Recommendation:** Use Option 1 (VSIX installation) for all development and testing. It's more reliable and faster than Extension Development Host workflow.

---

## Git Workflow

### Committing Changes

Extension code should follow same TDD workflow as Godot addons:
- RED: Write failing test
- GREEN: Implement feature
- REFACTOR: Clean up

Example:
```bash
# After RED phase
git add vscode-extension/src/test/suite/myfeature.test.ts
git commit -m "RED: Add test for new feature"

# After GREEN phase
git add vscode-extension/src/myfeature.ts
git commit -m "GREEN: Implement new feature"

# After REFACTOR phase
git add vscode-extension/src/myfeature.ts
git commit -m "REFACTOR: Improve code quality"
```

---

## File Structure

```
vscode-extension/
├── src/
│   ├── extension.ts          # Main activation
│   ├── cache.ts              # Frontmatter cache
│   ├── parser.ts             # YAML frontmatter parsing
│   ├── types.ts              # TypeScript types
│   └── test/
│       ├── runTest.ts        # Test runner
│       └── suite/
│           ├── index.ts      # Test suite index
│           └── *.test.ts     # Unit tests
├── dist/                     # Compiled JS (gitignored)
├── package.json              # Extension manifest
├── tsconfig.json             # TypeScript config
├── esbuild.js                # Build script
└── *.md                      # Documentation
```

---

## Performance Notes

### Compilation Time

- **npm run compile**: ~1-2 seconds (esbuild is fast)
- **npm run watch**: Continuous, <1 second per change
- **npm run package**: ~3-5 seconds (includes compilation)

### Testing Time

- **Unit tests**: ~5-10 seconds (launches Extension Host)
- **Manual testing**: Instant (just reload window)

---

## Recommended Daily Workflow

1. **Start of day:**
   - Pull latest: `git pull`
   - Install dependencies: `npm install` (if package.json changed)
   - Compile: `npm run compile`

2. **During development:**
   - Edit code in `src/`
   - Run unit tests: `npm test`
   - Install VSIX: `npm run package && code --install-extension *.vsix --force`
   - Reload VSCode and test manually

3. **Before committing:**
   - Run all tests: `npm test`
   - Verify extension works: Install VSIX and test in real workspace
   - Commit with TDD messages (RED/GREEN/REFACTOR)

4. **End of day:**
   - Push commits: `git push`
   - Clean up: `npm run compile` (ensures dist/ is up to date)

---

## Quick Reference

| Task | Command |
|------|---------|
| Compile | `npm run compile` |
| Watch mode | `npm run watch` |
| Run tests | `npm test` |
| Package VSIX | `npm run package` |
| Install locally | `code --install-extension *.vsix --force` |
| Uninstall | `code --uninstall-extension lineage.lineage-planning-extension` |
| Reload VSCode | Ctrl+Shift+P → "Developer: Reload Window" |
| View logs | Output → "Lineage Planning" |
| Debug tests | F5 → "Extension Tests" |

---

## See Also

- `TESTING.md` - Unit testing guide
- `TROUBLESHOOTING.md` - Common issues and solutions
- `README.md` - Extension overview
