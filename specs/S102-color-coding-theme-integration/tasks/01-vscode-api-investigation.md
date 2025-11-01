---
spec: S102
phase: 1
title: VSCode API Investigation
status: Completed
priority: Low
created: 2025-10-28
updated: 2025-10-28
---

# Phase 1: VSCode API Investigation

## Overview

Explore VSCode's TreeItem and TreeItemLabel API to determine if color coding for type labels is technically feasible. This phase focuses on research, experimentation, and evidence gathering.

## Prerequisites

- VSCode extension project set up (`vscode-extension/`)
- Access to VSCode API documentation
- Test environment with VSCode 1.80.0+
- Understanding of current TreeItemLabel implementation (S101)

## Tasks

### Task 1: Review VSCode API Documentation

**Objective**: Understand official API capabilities for TreeItem styling

**Steps**:
1. Read VSCode API reference for TreeItemLabel:
   - URL: https://code.visualstudio.com/api/references/vscode-api#TreeItemLabel
   - Look for: `color`, `foreground`, `style`, or similar properties
   - Document all available properties

2. Read VSCode API reference for TreeItem:
   - URL: https://code.visualstudio.com/api/references/vscode-api#TreeItem
   - Look for: label styling options beyond `iconPath`
   - Check `resourceUri`, `tooltip`, `description` for color support

3. Review ThemeColor documentation:
   - URL: https://code.visualstudio.com/api/references/vscode-api#ThemeColor
   - Confirm usage restrictions (icons only?)
   - List all available theme color tokens

4. Search VSCode API changelog for TreeView enhancements:
   - URL: https://code.visualstudio.com/updates
   - Check versions 1.80 - latest for TreeView color features
   - Note any experimental APIs

**Expected Outcome**:
- Documented list of all TreeItemLabel properties
- Clear understanding of ThemeColor restrictions
- Knowledge of any recent API additions

**Documentation Location**: `vscode-extension/docs/api-investigation-s102.md`

**File References**:
- Current TreeItemLabel usage: `vscode-extension/src/treeview/PlanningTreeProvider.ts:843-850`
- ThemeColor reference: `vscode-extension/src/statusIcons.ts:106-140`

---

### Task 2: Test TreeItemLabel Color Property (Hypothetical)

**Objective**: Determine if TreeItemLabel has undocumented color capabilities

**Steps**:
1. Create test branch: `git checkout -b test/s102-treeitemlabel-color`

2. Add test code to PlanningTreeProvider.ts `getTreeItem()` method:
   ```typescript
   // After line 850 where TreeItemLabel is created
   const label = new vscode.TreeItemLabel(labelText, highlightRanges);

   // Test 1: Try to access color property
   if ('color' in label) {
     console.log('[S102] TreeItemLabel has color property');
     try {
       (label as any).color = new vscode.ThemeColor('charts.gray');
     } catch (e) {
       console.log('[S102] Color assignment failed:', e);
     }
   } else {
     console.log('[S102] TreeItemLabel does NOT have color property');
   }
   ```

3. Compile and install extension:
   ```bash
   cd vscode-extension
   npm run compile
   npm run package
   code --install-extension cascade-0.1.0.vsix --force
   ```

4. Reload VSCode and check output:
   - Open Output channel: Ctrl+Shift+P → "View: Toggle Output" → "Cascade"
   - Look for `[S102]` log messages
   - Screenshot any visual changes

5. Test with TypeScript type checking:
   ```typescript
   // Does TypeScript allow color property?
   const label: vscode.TreeItemLabel = new vscode.TreeItemLabel(text);
   label.color = new vscode.ThemeColor('charts.gray'); // Compile error?
   ```

6. Check @types/vscode definition:
   - File: `node_modules/@types/vscode/index.d.ts`
   - Search for `TreeItemLabel` interface
   - Document exact interface definition

**Expected Outcome**:
- Confirmation that TreeItemLabel does NOT have color property (most likely)
- Evidence via console logs and compiler errors
- Exact TreeItemLabel interface definition documented

**Documentation**: Append findings to `api-investigation-s102.md`

---

### Task 3: Explore Alternative Styling Approaches

**Objective**: Test if any workarounds exist for text color styling

**Approach 1: ThemeIcon with Colored Text (Icon Hack)**

Test if ThemeIcon can be used for text:
```typescript
// Attempt to use ThemeIcon as colored label prefix
const typeIcon = new vscode.ThemeIcon(
  'symbol-text', // Text-like icon
  new vscode.ThemeColor('charts.gray')
);
treeItem.iconPath = typeIcon; // Already used for status
```

**Limitation**: iconPath is already used for status icons (S57). Cannot have two icons.

**Approach 2: Description Field with Color Tokens**

Test if description field supports any color markup:
```typescript
// Try ANSI-like color codes
treeItem.description = `\u001b[90m${typeLabel}\u001b[0m ${item} - ${title}`;

// Try custom tokens
treeItem.description = `$(text-gray)${typeLabel} ${item} - ${title}`;

// Try ThemeColor in description (unlikely to work)
```

**Limitation**: Description field already heavily used for badges/progress.

**Approach 3: Custom TreeItem Rendering (Not Standard)**

Research if any extensions use custom rendering:
- Search VSCode extension samples
- Check if experimental APIs exist
- Document any hacks or workarounds found

**Steps for Each Approach**:
1. Add test code to PlanningTreeProvider.ts
2. Compile and test in VSCode
3. Check for visual changes or console errors
4. Screenshot results
5. Measure performance impact (if works)

**Expected Outcome**:
- All approaches tested and documented
- Evidence that most approaches fail
- Performance data if any approach works

**Documentation**: Append each approach result to `api-investigation-s102.md`

---

### Task 4: Performance Baseline Measurement

**Objective**: Establish performance baseline for future comparison

**Steps**:
1. Generate test data (100 items):
   ```bash
   cd vscode-extension/scripts
   node generate-test-data.js 100 test-plans-s102
   ```

2. Open Cascade output channel and measure:
   - TreeView initial load time
   - Status group expansion time
   - Item rendering time (per item)

3. Run performance test 5 times and calculate average

4. Document baseline metrics in `api-investigation-s102.md`:
   - Average TreeView load: XXX ms
   - Average status group expansion: XXX ms
   - Average item render time: XXX ms

**Expected Outcome**:
- Baseline performance metrics for comparison
- Target: Maintain < 10ms per item (S58 requirement)

**Performance Targets** (from CLAUDE.md):
- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- Hierarchy expansion < 50ms per level

---

### Task 5: Research VSCode Extension Examples

**Objective**: Find if any other extensions successfully use text colors in TreeView

**Steps**:
1. Search VSCode extension marketplace for TreeView implementations:
   - Search: "tree view colors", "treeview styling"
   - Focus on popular extensions with >10k installs

2. Study example extensions:
   - Azure Resource Manager Tools
   - GitLens
   - Project Manager
   - TODO Tree

3. Review their GitHub repos (if open source):
   - Look for TreeView color implementations
   - Check if they use undocumented APIs
   - Note any workarounds or hacks

4. Check VSCode extension samples:
   - Repo: https://github.com/microsoft/vscode-extension-samples
   - Look for: tree-view-sample, custom-tree-view-sample

**Expected Outcome**:
- List of extensions using TreeView colors (if any)
- Documentation of their approach
- Assessment of applicability to Cascade

**Documentation**: Append extension analysis to `api-investigation-s102.md`

---

### Task 6: Compile Investigation Findings

**Objective**: Synthesize all research into comprehensive report

**Report Structure** (`api-investigation-s102.md`):

```markdown
# S102 - VSCode API Investigation Report

## Executive Summary
[One paragraph: feasible or not feasible, why]

## API Documentation Review
- TreeItemLabel properties: [list]
- ThemeColor restrictions: [summary]
- Recent API changes: [none/list]

## Experimental Tests
### Test 1: TreeItemLabel.color
- Result: [Pass/Fail]
- Evidence: [console logs, screenshots]

### Test 2: Alternative Approaches
- Approach 1 (Icon): [Result]
- Approach 2 (Description): [Result]
- Approach 3 (Custom): [Result]

## Performance Baseline
- TreeView load: XXX ms
- Status group expansion: XXX ms
- Item render: XXX ms per item

## Extension Research
- Extensions using color: [list or none]
- Approaches found: [summary]

## Conclusion
[Recommendation: proceed to Phase 2 with [implement/defer/alternative] direction]
```

**Steps**:
1. Create `vscode-extension/docs/api-investigation-s102.md`
2. Fill in all sections from previous tasks
3. Include code snippets, screenshots, and evidence
4. Make clear recommendation for Phase 2

**Expected Outcome**:
- Complete investigation report
- Evidence-based recommendation
- All findings documented for future reference

---

## Completion Criteria

- [ ] VSCode API documentation reviewed and summarized
- [ ] TreeItemLabel.color property tested (expected: does not exist)
- [ ] All alternative approaches tested and documented
- [ ] Performance baseline measured with 100+ items
- [ ] Extension marketplace researched for examples
- [ ] Comprehensive investigation report created (`api-investigation-s102.md`)
- [ ] Clear recommendation made for Phase 2 direction

## Next Phase

Proceed to Phase 2: Feasibility Assessment with investigation findings.

**Expected Recommendation**: Defer feature due to API limitations, rely on existing icon-based differentiation (S57).

**Alternative Recommendation** (if surprising findings): Implement approach X with caveats Y.

## Time Estimate

2-3 hours total:
- Task 1 (Documentation review): 30 minutes
- Task 2 (Color property test): 30 minutes
- Task 3 (Alternative approaches): 60 minutes
- Task 4 (Performance baseline): 15 minutes
- Task 5 (Extension research): 30 minutes
- Task 6 (Report compilation): 30 minutes
