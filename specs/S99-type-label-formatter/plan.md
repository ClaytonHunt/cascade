---
spec: S99
title: Type Label Formatter Utility
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-28
updated: 2025-10-28
---

# Implementation Specification: S99 - Type Label Formatter Utility

## Overview

Create a foundational utility module for formatting TreeView item labels with type prefixes. This module provides centralized label formatting logic that will be consumed by PlanningTreeProvider and future TreeItem rendering enhancements.

**Format:** `{TypeLabel} {ItemNumber} - {Title}`
**Example:** `Story 75 - Archive Detection`

## Current State Analysis

**Existing Label Format** (PlanningTreeProvider.ts:840):
```typescript
const label = `${element.item} - ${element.title}`;
// Produces: "S75 - Archive Detection"
```

**Problem:**
- Labels use raw item numbers (S75, E4, F16) instead of readable type labels
- Format logic is inline and not reusable
- No type prefix makes items harder to distinguish at a glance

**Solution:**
- Extract formatting logic to dedicated utility module
- Map ItemType to human-readable labels (story → "Story", epic → "Epic")
- Provide pure functions for label generation

## Architecture Decisions

### 1. Module Location
**Location:** `vscode-extension/src/treeview/labelFormatter.ts`

**Reasoning:**
- Follows existing pattern (badgeRenderer.ts, archiveUtils.ts in same directory)
- Co-located with TreeView rendering logic
- Keeps utility modules together for easy discovery

### 2. Function Design
**Two exported functions:**

1. `getTypeLabel(type: ItemType): string` - Maps type to display label
2. `formatItemLabel(item: PlanningTreeItem): string` - Formats complete label

**Reasoning:**
- Separation of concerns (type mapping vs. full formatting)
- `getTypeLabel` is independently testable and reusable
- Pure functions with no side effects

### 3. Type Mapping Strategy
**Static Record for O(1) lookup:**
```typescript
const TYPE_LABELS: Record<ItemType, string> = {
  'project': 'Project',
  'epic': 'Epic',
  'feature': 'Feature',
  'story': 'Story',
  'bug': 'Bug',
  'spec': 'Spec',
  'phase': 'Phase'
};
```

**Reasoning:**
- High-performance lookup for TreeView rendering (100+ items)
- Type-safe mapping (compiler catches missing types)
- Follows pattern from badgeRenderer.ts:33

### 4. Edge Case Handling
**Fallback strategies:**
- Unknown types → Capitalize string (e.g., "custom" → "Custom")
- Missing title → Use item number only
- Undefined item number → Use "Unknown"

**Reasoning:**
- Graceful degradation prevents rendering errors
- Future-proof for custom item types
- Matches defensive pattern from badgeRenderer.ts:83

## Key Integration Points

### 1. PlanningTreeProvider.getTreeItem() - Line 840
**Current:**
```typescript
const label = `${element.item} - ${element.title}`;
```

**Future (S100):**
```typescript
import { formatItemLabel } from './labelFormatter';
const label = formatItemLabel(element);
```

**Impact:** Single line change, no breaking changes

### 2. PlanningTreeItem Interface
**Dependency:** Uses existing interface fields (item, title, type)
**Location:** vscode-extension/src/treeview/PlanningTreeItem.ts:22-49
**No changes required**

### 3. ItemType Enum
**Dependency:** Uses existing type definition
**Location:** vscode-extension/src/types.ts:9
**No changes required**

## Risk Assessment

### Low Risk Factors
✅ **No external dependencies** - Uses only built-in TypeScript types
✅ **Pure functions** - No state, no side effects
✅ **Isolated module** - No changes to existing code in this story
✅ **Comprehensive testing** - Full unit test coverage planned

### Potential Concerns
⚠️ **None identified** - This is a foundational utility with minimal complexity

## Phase Overview

### Phase 1: Create labelFormatter Module
**Deliverable:** Working utility module with type mapping and formatting functions
**Files:** Create `vscode-extension/src/treeview/labelFormatter.ts`
**Testing:** Manual verification via TypeScript compilation

### Phase 2: Unit Testing
**Deliverable:** Comprehensive test suite with 100% function coverage
**Files:** Create `vscode-extension/src/test/suite/labelFormatter.test.ts`
**Testing:** Run via `npm test` - all tests must pass

## Success Criteria

✅ **Module Created:**
- File exists at `vscode-extension/src/treeview/labelFormatter.ts`
- Exports `getTypeLabel` and `formatItemLabel` functions
- Full JSDoc documentation for IntelliSense

✅ **Type Mapping Complete:**
- All 7 ItemType values mapped to display labels
- Unknown types handled with capitalization fallback

✅ **Label Formatting Working:**
- Generates correct format: `{TypeLabel} {ItemNumber} - {Title}`
- Handles edge cases (missing title, undefined number)

✅ **Tests Passing:**
- Unit tests for all item types (project, epic, feature, story, bug, spec, phase)
- Edge case tests (unknown type, missing title, undefined number)
- 100% function coverage
- All tests pass with `npm test`

✅ **Code Quality:**
- TypeScript strict mode compliance
- No ESLint warnings
- JSDoc comments present
- Follows existing codebase patterns

## Codebase Analysis Summary

**Files to Create:**
1. `vscode-extension/src/treeview/labelFormatter.ts` - Utility module (~80 lines)
2. `vscode-extension/src/test/suite/labelFormatter.test.ts` - Test suite (~150 lines)

**Files to Modify:**
- None (integration deferred to S100)

**External Dependencies:**
- None (uses only existing types)

**Patterns to Follow:**
- Module structure: Match badgeRenderer.ts (JSDoc, Record mapping, pure functions)
- Test structure: Match badgeRenderer.test.ts (Mocha suites, assert.strictEqual)
- Export pattern: Named exports (not default)

**Integration Readiness:**
- Story S100 will integrate this module into PlanningTreeProvider
- Story S101 will migrate all label formatting to use this utility
- No changes to PlanningTreeProvider in this story (S99)

## Next Steps

After S99 completion, proceed to:
- **S100**: Integrate labelFormatter into PlanningTreeProvider.getTreeItem()
- **S101**: Migrate all TreeItem label formatting to use formatItemLabel()
- **S102**: Add color-coded type labels to TreeView (uses getTypeLabel())
