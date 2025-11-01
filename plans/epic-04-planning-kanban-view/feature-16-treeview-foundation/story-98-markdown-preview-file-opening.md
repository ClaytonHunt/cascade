---
item: S98
title: Markdown Preview File Opening
type: story
parent: F16
status: Completed
priority: Medium
dependencies: []
estimate: XS
spec: specs/story-98-markdown-preview-file-opening
created: 2025-10-26
updated: 2025-10-26
---

# S98 - Markdown Preview File Opening

## Description

Modify the TreeView file opening behavior to open planning files in markdown preview mode instead of raw markdown editor. This provides a more visually appealing reading experience with rendered formatting, headers, and links.

Currently, clicking items in the Cascade TreeView opens files in the raw markdown editor (via `vscode.window.showTextDocument()`). This story changes the behavior to use VSCode's markdown preview command (`markdown.showPreview`) for a better reading experience.

## User Benefit

Users prefer reading planning documents in preview mode because:
- Better visual hierarchy with rendered headers
- Clickable links and formatted lists
- Easier to scan and understand content
- More professional appearance
- Consistent with how markdown is typically viewed

## Acceptance Criteria

1. **Preview Opening**:
   - [ ] Clicking any item in Cascade TreeView opens file in markdown preview
   - [ ] Preview opens in permanent tab (not replaced by next preview)
   - [ ] Preview receives focus (user can immediately scroll/read)
   - [ ] Works for all item types (Project, Epic, Feature, Story, Bug)

2. **Command Integration**:
   - [ ] Use VSCode's built-in `markdown.showPreview` command
   - [ ] Pass file URI to preview command
   - [ ] Preserve existing error handling (file not found, etc.)

3. **Backward Compatibility**:
   - [ ] Existing file path handling remains unchanged
   - [ ] Error logging to output channel preserved
   - [ ] User notifications on errors still work

4. **Edge Cases**:
   - [ ] Non-markdown files (if any) fall back to text editor
   - [ ] Missing files show appropriate error message
   - [ ] Multiple clicks don't open duplicate previews

## Technical Approach

**Current Implementation** (extension.ts:1528-1543):

```typescript
export async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);
    const doc = await vscode.workspace.openTextDocument(uri);

    await vscode.window.showTextDocument(doc, {
      preview: false,        // Open in permanent tab
      preserveFocus: false   // Editor receives focus
    });
```

**Proposed Change**:

```typescript
export async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);

    // Open in markdown preview instead of raw editor
    await vscode.commands.executeCommand(
      'markdown.showPreview',
      uri
    );

    outputChannel.appendLine(`[FileOpen] Opened preview: ${filePath}`);
```

**Alternative Approach** (if markdown.showPreview doesn't support permanent tabs):

```typescript
export async function openPlanningFile(
  filePath: string,
  outputChannel: vscode.OutputChannel
): Promise<void> {
  try {
    const uri = vscode.Uri.file(filePath);

    // Open markdown preview to the side
    await vscode.commands.executeCommand(
      'markdown.showPreviewToSide',
      uri
    );

    outputChannel.appendLine(`[FileOpen] Opened preview: ${filePath}`);
```

**VSCode Markdown Commands**:
- `markdown.showPreview` - Opens preview in current editor group
- `markdown.showPreviewToSide` - Opens preview in split view
- `markdown.showLockedPreviewToSide` - Preview that doesn't change with cursor

## Implementation Steps

1. **Modify openPlanningFile() function**:
   - Replace `vscode.window.showTextDocument()` call
   - Use `vscode.commands.executeCommand('markdown.showPreview', uri)`
   - Update output channel logging message

2. **Test all item types**:
   - Click Project in TreeView → verify preview opens
   - Click Epic → verify preview opens
   - Click Feature → verify preview opens
   - Click Story → verify preview opens
   - Click Bug → verify preview opens

3. **Test edge cases**:
   - Click same item twice → verify doesn't duplicate tab
   - Click different items → verify preview updates/new tab
   - Missing file → verify error handling still works

4. **Update documentation** (if needed):
   - Update any docs that mention "opens in editor"
   - Update CLAUDE.md if it references file opening behavior

## Files to Modify

1. **Update**: `vscode-extension/src/extension.ts`
   - Modify `openPlanningFile()` function (lines 1528-1543)
   - Change from `showTextDocument()` to `executeCommand('markdown.showPreview')`
   - Update logging message

## Testing Strategy

**Manual Testing**:
1. Package and install extension: `npm run package && code --install-extension cascade-0.1.0.vsix --force`
2. Reload window: Ctrl+Shift+P → "Developer: Reload Window"
3. Open Cascade TreeView
4. Click various items (Project, Epic, Feature, Story)
5. Verify each opens in markdown preview (not raw editor)
6. Check output channel for logging confirmation

**Verification**:
- Preview shows rendered markdown (headers formatted, lists styled)
- Preview is permanent tab (doesn't close when clicking next item)
- No duplicate tabs when clicking same item multiple times
- Error cases still show user notifications

## Success Metrics

- All planning files open in markdown preview mode
- Preview provides better reading experience (visual feedback from user)
- No regressions in error handling
- Implementation takes < 15 minutes (XS story)

## Notes

- This is a very small change (modify 3-4 lines in one function)
- VSCode markdown preview is built-in, no new dependencies
- If user wants raw editor, they can click "Open Changes" in preview toolbar
- Consider adding user preference setting in future iteration (allow toggle)
- Could add context menu option "Open in Editor" for users who prefer raw markdown
- This change aligns with how most markdown viewers work (GitHub, GitLab, etc.)

## Future Enhancements

If users request more control over this behavior:
- Add VSCode setting: `cascade.openFileMode` with options "preview" | "editor" | "ask"
- Add context menu: "Open Preview" vs "Open in Editor"
- Add keyboard modifier: Click = preview, Ctrl+Click = editor
