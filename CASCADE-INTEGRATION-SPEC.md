# Cascade VSCode Extension - Integration Specification

**For**: Cascade VSCode Extension Development
**From**: CARL Orchestration System
**Date**: 2025-01-05
**Purpose**: Define the integration contract between CARL and Cascade for work item management

---

## Executive Summary

Cascade is a VSCode extension for visual work item tracking and automated state propagation. CARL (Coding Assistant for Rapid Launch) uses Cascade's hierarchical directory structure as its local work item format. This document defines the contract between these systems.

### Responsibilities

**CARL's Responsibility:**
- Create work items in Cascade format (directories + markdown + state.json)
- Update work items it's actively working on (markdown frontmatter + local state.json)
- Never touch parent state files

**Cascade's Responsibility:**
- Watch for state.json changes
- Automatically propagate updates to parent state files
- Recalculate progress percentages and rollup metrics
- Provide visual work item tracking UI in VSCode
- Enable navigation and exploration of work item hierarchy

---

## Directory Structure

### Hierarchical Layout

```
.cascade/
  ├── README.md                              # User documentation
  ├── P####.md                               # Project file (root level)
  ├── state.json                             # Project state
  ├── work-item-registry.json                # Master ID registry
  └── E####-{epic-slug}/                     # Epic directory
      ├── E####.md                           # Epic markdown file
      ├── state.json                         # Epic state
      └── F####-{feature-slug}/              # Feature directory
          ├── F####.md                       # Feature markdown file
          ├── state.json                     # Feature state
          ├── S####-{story-slug}/            # Story directory
          │   ├── S####.md                   # Story markdown file
          │   ├── state.json                 # Story state
          │   ├── PH####-{phase-slug}/       # Phase directory (optional)
          │   │   ├── PH####.md              # Phase markdown file
          │   │   ├── state.json             # Phase state
          │   │   ├── T####.md               # Task files (leaf nodes)
          │   │   └── T####.md
          │   └── T####.md                   # Task files (no phase)
          └── B####-{bug-slug}/              # Bug directory
              ├── B####.md                   # Bug markdown file
              ├── state.json                 # Bug state
              └── T####.md                   # Task files
```

### Work Item Hierarchy

```
P#### - Project (highest level, file in root)
  └── E#### - Epic (directory + file)
      └── F#### - Feature (directory + file)
          ├── S#### - Story (directory + file)
          │   ├── PH#### - Phase (directory + file, optional)
          │   │   └── T#### - Task (file only, leaf node)
          │   └── T#### - Task (file only, no phase)
          └── B#### - Bug (directory + file)
              └── T#### - Task (file only)
```

### Naming Conventions

**Directories:**
- Format: `{ID}-{slug}/`
- Examples:
  - `E0001-user-authentication/`
  - `F0012-login-functionality/`
  - `S0045-password-reset-form/`

**Files:**
- Format: `{ID}.md` (directory name provides context)
- Examples:
  - `E0001.md` (inside `E0001-user-authentication/`)
  - `F0012.md` (inside `F0012-login-functionality/`)
  - `T0123.md` (task file, no directory)

**Slug Generation:**
- Lowercase
- Alphanumeric + hyphens only
- No leading/trailing hyphens
- Example: "User Authentication System" → "user-authentication-system"

### Structure Rules

| Type | Has Directory? | Has state.json? | Location |
|------|---------------|-----------------|----------|
| Project (P) | No | Yes (root) | `.cascade/P####.md` |
| Epic (E) | Yes | Yes | `.cascade/E####-{slug}/` |
| Feature (F) | Yes | Yes | Inside Epic directory |
| Story (S) | Yes | Yes | Inside Feature directory |
| Bug (B) | Yes | Yes | Inside Feature directory |
| Phase (PH) | Yes | Yes | Inside Story/Bug directory |
| Task (T) | No | No | Inside Story/Bug/Phase directory |

---

## File Formats

### Markdown File Format

Each work item markdown file has YAML frontmatter followed by markdown content:

```markdown
---
id: E0001
type: Epic
title: User Authentication System
status: planned
priority: high
complexity: complex
parent: P0001
created: 2025-01-05
updated: 2025-01-05
---

# User Authentication System

## Description
Detailed description of the work item...

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- Depends on: None
- Blocks: E0002, F0005

## Children
List of child work items (auto-generated as they're created)

## Execution Strategy
- **Parallel execution possible**: Yes/No
- **Prerequisites**: List prerequisites
- **Estimated effort**: 3-4 weeks

## Notes
Additional context, technical considerations, etc.
```

#### Frontmatter Fields

**Required:**
- `id` (string): Work item ID (e.g., `E0001`)
- `type` (string): Work item type (`Project`, `Epic`, `Feature`, `Story`, `Bug`, `Phase`, `Task`)
- `title` (string): Work item title
- `status` (string): Current status (see Status Values below)
- `priority` (string): Priority level (see Priority Values below)
- `complexity` (string): Complexity estimate (see Complexity Values below)
- `parent` (string|null): Parent work item ID (null for Project)
- `created` (string): Creation date (YYYY-MM-DD format)
- `updated` (string): Last update date (YYYY-MM-DD format)

**Optional:**
- `assignee` (string): Person assigned
- `tags` (array): Tags for categorization
- `due_date` (string): Due date (YYYY-MM-DD format)

#### Enum Values

**Status:**
- `planned` - Work item defined but not started
- `in-progress` - Currently being worked on
- `completed` - Work finished and verified
- `blocked` - Cannot proceed due to blocker

**Priority:**
- `low` - Nice to have
- `medium` - Standard priority
- `high` - Important
- `critical` - Urgent/blocking

**Complexity:**
- `simple` - Straightforward, minimal effort
- `medium` - Moderate complexity
- `complex` - Significant effort required
- `very-complex` - Extremely challenging

### state.json Format

Each directory level (except Tasks) has a `state.json` file with the following structure:

```json
{
  "id": "E0001",
  "status": "in-progress",
  "progress": {
    "total_items": 23,
    "completed": 8,
    "in_progress": 5,
    "planned": 10,
    "percentage": 35
  },
  "children": {
    "F0001": {
      "status": "in-progress",
      "progress": 60
    },
    "F0002": {
      "status": "planned",
      "progress": 0
    },
    "F0003": {
      "status": "completed",
      "progress": 100
    }
  },
  "updated": "2025-01-05T10:25:00Z"
}
```

#### state.json Fields

**Required:**
- `id` (string): Work item ID
- `status` (string): Current status (same values as markdown)
- `progress` (object): Progress metrics
  - `total_items` (number): Total child items count
  - `completed` (number): Completed items count
  - `in_progress` (number): In-progress items count
  - `planned` (number): Planned items count
  - `percentage` (number): Completion percentage (0-100)
- `children` (object): Map of child ID to child summary
  - Key: Child work item ID
  - Value: Object with `status` (string) and `progress` (number)
- `updated` (string): Last update timestamp (ISO 8601 format)

**Note:** The `progress.total_items` may not equal the sum of completed/in-progress/planned if children have different statuses (e.g., blocked items).

### work-item-registry.json Format

Master registry tracking all work items:

```json
{
  "version": "1.0.0",
  "last_updated": "2025-01-05T10:30:00Z",
  "work_items": {
    "P0001": {
      "id": "P0001",
      "type": "Project",
      "path": "P0001.md",
      "title": "CARL Development Project",
      "status": "in-progress",
      "parent": null,
      "created": "2025-01-05",
      "updated": "2025-01-05"
    },
    "E0001": {
      "id": "E0001",
      "type": "Epic",
      "path": "E0001-user-authentication-system/E0001.md",
      "title": "User Authentication System",
      "status": "planned",
      "parent": "P0001",
      "created": "2025-01-05",
      "updated": "2025-01-05"
    }
  },
  "id_counters": {
    "P": 1,
    "E": 1,
    "F": 0,
    "S": 0,
    "B": 0,
    "PH": 0,
    "T": 0
  }
}
```

#### Registry Structure

**Top-level fields:**
- `version` (string): Registry format version (semver)
- `last_updated` (string): Last modification timestamp (ISO 8601)
- `work_items` (object): Map of ID to work item metadata
- `id_counters` (object): Current counter for each work item type

**work_items entry:**
- `id` (string): Work item ID
- `type` (string): Work item type
- `path` (string): Relative path to markdown file
- `title` (string): Work item title
- `status` (string): Current status
- `parent` (string|null): Parent work item ID
- `created` (string): Creation date (YYYY-MM-DD)
- `updated` (string): Last update date (YYYY-MM-DD)
- `deleted` (boolean, optional): Soft delete flag (never actually removed)

**Note:** Registry entries are never deleted, only marked as deleted for audit trail purposes.

---

## Cascade Responsibilities

### 1. File Watching

**What to Watch:**
- All `state.json` files in `.cascade/` directory tree
- Ignore file system events for markdown files (only watch state.json)

**When state.json Changes:**
1. Parse the changed file
2. Identify the work item ID
3. Look up parent in registry
4. Trigger state propagation upward

**Debouncing:**
- Recommend 100-500ms debounce to batch rapid changes
- Avoid triggering on every single file save

### 2. State Propagation

**Algorithm (when child state.json changes):**

```
function propagateStateChange(childPath) {
  1. Load changed child state.json
  2. Extract child ID and parse state
  3. Look up parent from registry using child ID
  4. If no parent, stop (reached root)
  5. Load parent state.json
  6. Update parent.children[childId] with:
     - status from child.status
     - progress from child.progress.percentage
  7. Recalculate parent progress:
     a. Iterate all children in parent.children
     b. Count by status (completed, in-progress, planned)
     c. Calculate total_items = children.length
     d. Calculate percentage = (completed / total) * 100
  8. Update parent.updated timestamp
  9. Write parent state.json
  10. Recursively call propagateStateChange(parentPath)
}
```

**Progress Calculation:**
```javascript
// Example calculation
const children = Object.values(parentState.children);
const completed = children.filter(c => c.status === 'completed').length;
const inProgress = children.filter(c => c.status === 'in-progress').length;
const planned = children.filter(c => c.status === 'planned').length;
const blocked = children.filter(c => c.status === 'blocked').length;
const total = children.length;
const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

parentState.progress = {
  total_items: total,
  completed,
  in_progress: inProgress,
  planned,
  percentage
};
```

**Edge Cases:**
- If parent state.json doesn't exist, create it with initial structure
- If parent directory doesn't exist, log error (malformed structure)
- Handle concurrent updates with file locking or retry logic
- Validate state.json structure before propagating

### 3. Visual Work Item Tracking

**Required UI Features:**

**Tree View:**
- Show hierarchical work item structure
- Display each item with: icon, ID, title, status badge, progress bar
- Collapsible/expandable nodes
- Click to open markdown file
- Color-code by status

**Status Icons/Colors:**
- `planned`: ○ Gray
- `in-progress`: ◐ Blue/Yellow
- `completed`: ● Green
- `blocked`: ⊗ Red

**Progress Bars:**
- Show percentage completion for items with children
- Visual indicator (0-100%)
- Color gradient: Red (0%) → Yellow (50%) → Green (100%)

**Context Menu Actions:**
- Open work item markdown
- Open containing folder
- View in tree
- Copy ID to clipboard
- Jump to parent
- Show children

**Status Dashboard (Optional):**
- Project-level overview
- Epic completion status
- Recently updated items
- Blocked items alert
- Progress charts/graphs

### 4. Navigation Features

**Quick Open:**
- Command palette: "Cascade: Open Work Item"
- Type ID (e.g., `E0001`) to jump to work item
- Auto-complete suggestions

**Breadcrumb Navigation:**
- Show current work item's path in hierarchy
- Click breadcrumb to navigate to parent levels
- Example: `P0001 > E0001 > F0012 > S0045`

**Related Items:**
- Show dependencies (depends on, blocks)
- Show children/parent
- Quick navigation between related items

### 5. Validation & Error Handling

**Structure Validation:**
- Verify directory naming matches work item ID
- Validate state.json against schema
- Verify parent-child relationships are valid
- Check for orphaned work items

**Error Detection:**
- Missing state.json files (should exist but don't)
- Malformed JSON
- Invalid work item IDs
- Circular dependencies
- Registry inconsistencies

**Error Reporting:**
- Show validation errors in Problems panel
- Highlight problematic work items in tree
- Suggest fixes where possible

### 6. Configuration

**Settings (via VSCode settings.json):**

```json
{
  "cascade.cascadeDirectory": ".cascade",
  "cascade.autoRefresh": true,
  "cascade.refreshInterval": 5000,
  "cascade.showProgressBars": true,
  "cascade.colorCodeByStatus": true,
  "cascade.debounceInterval": 250,
  "cascade.enableNotifications": false,
  "cascade.treeView.expandLevel": 2,
  "cascade.validation.enabled": true
}
```

---

## Integration Points

### 1. CARL → Cascade (Work Item Creation)

**When CARL creates a work item:**

```
1. CARL generates work item ID (via registry counter)
2. CARL creates directory (if type has directory)
3. CARL creates markdown file with frontmatter
4. CARL creates state.json with initial state:
   {
     "id": "E0001",
     "status": "planned",
     "progress": {
       "total_items": 0,
       "completed": 0,
       "in_progress": 0,
       "planned": 0,
       "percentage": 0
     },
     "children": {},
     "updated": "2025-01-05T10:00:00Z"
   }
5. CARL adds entry to registry
6. Cascade detects new state.json via file watcher
7. Cascade adds to tree view
8. Cascade propagates to parent (adds child entry in parent state)
```

### 2. CARL → Cascade (Status Update)

**When CARL updates work item status:**

```
1. CARL loads work item markdown
2. CARL updates frontmatter: status = "completed", updated = today
3. CARL saves markdown file
4. CARL loads local state.json
5. CARL updates state: status = "completed", updated = now
6. CARL saves state.json
7. Cascade detects state.json change via file watcher
8. Cascade propagates change to parent state
9. Cascade updates tree view to show new status
10. Cascade recalculates parent progress
11. Cascade continues propagation up the hierarchy
```

### 3. Cascade → User (Visual Feedback)

**User opens VSCode:**
```
1. Cascade extension activates
2. Cascade scans .cascade/ directory
3. Cascade loads work-item-registry.json
4. Cascade builds in-memory tree structure
5. Cascade displays tree view in sidebar
6. Cascade starts file watcher for state.json changes
```

**User navigates tree:**
```
1. User clicks work item in tree
2. Cascade opens markdown file in editor
3. Cascade highlights item in tree
4. Cascade shows breadcrumb navigation
```

**CARL updates status:**
```
1. Cascade receives file system event (state.json changed)
2. Cascade reads updated state
3. Cascade updates tree view (status badge, progress bar)
4. Cascade propagates to parent
5. Cascade updates parent tree node
6. User sees real-time updates in tree
```

---

## Performance Considerations

### File Watching Optimization

**Recommendation:**
- Use VSCode's built-in file watcher API
- Watch pattern: `**/.cascade/**/state.json`
- Ignore patterns: `**/*.md`, `**/work-item-registry.json`
- Debounce rapid changes (250ms recommended)

### State Propagation Efficiency

**Optimization Strategies:**
1. **Batch Updates**: If multiple children change, batch parent updates
2. **Short-Circuit**: Stop propagation if parent state unchanged
3. **Async Processing**: Use async/await to avoid blocking UI
4. **Cache Registry**: Keep registry in memory, reload on change
5. **Lazy Loading**: Load work item details on-demand, not upfront

### Tree View Performance

**For Large Hierarchies:**
- Use virtual scrolling for tree view
- Lazy load children (load on expand)
- Limit initial expansion depth (configurable)
- Cache rendered tree nodes

---

## Example Workflows

### Workflow 1: CARL Creates New Epic

```
User: /carl:plan "User Authentication System"

CARL:
1. Generates ID: E0001
2. Creates directory: .cascade/E0001-user-authentication-system/
3. Creates file: E0001.md with frontmatter
4. Creates state.json:
   { id: "E0001", status: "planned", progress: {...}, children: {}, updated: "..." }
5. Updates registry with E0001 entry
6. Returns to user

Cascade (auto):
1. Detects new state.json file
2. Reads E0001 state
3. Loads parent (P0001) state
4. Adds E0001 to P0001.children
5. Recalculates P0001 progress
6. Updates P0001 state.json
7. Refreshes tree view
8. User sees new Epic E0001 in tree
```

### Workflow 2: CARL Completes Task

```
User: /carl:work T0123

CARL:
1. Executes task
2. Updates T0123.md frontmatter: status = "completed"
3. Finds parent Story (S0045)
4. Loads S0045/state.json
5. Updates S0045/state.json:
   { ..., status: "completed", updated: "now" }
6. Saves S0045/state.json
7. Returns to user

Cascade (auto):
1. Detects S0045/state.json change
2. Reads new S0045 state: completed
3. Loads parent Feature (F0012) state
4. Updates F0012.children["S0045"] = { status: "completed", progress: 100 }
5. Recalculates F0012 progress (now 40% complete if 2/5 stories done)
6. Updates F0012 state.json
7. Loads parent Epic (E0001) state
8. Updates E0001.children["F0012"] = { status: "in-progress", progress: 40 }
9. Recalculates E0001 progress
10. Updates E0001 state.json
11. Loads Project (P0001) state
12. Updates P0001.children["E0001"]
13. Recalculates P0001 progress
14. Updates P0001 state.json
15. Refreshes all tree nodes (S0045, F0012, E0001, P0001)
16. User sees completed checkmark on S0045, updated progress bars
```

### Workflow 3: User Navigates Hierarchy

```
User: Opens VSCode

Cascade:
1. Activates extension
2. Discovers .cascade/ directory
3. Loads work-item-registry.json
4. Builds tree structure from registry
5. Displays tree view in sidebar
6. Shows P0001 at root
   - E0001 nested under P0001
   - F0012 nested under E0001
   - etc.

User: Clicks E0001 in tree

Cascade:
1. Opens .cascade/E0001-user-authentication-system/E0001.md
2. Shows breadcrumb: P0001 > E0001
3. Highlights E0001 in tree
4. Shows children in tree (F0001, F0002, F0003)

User: Expands F0001

Cascade:
1. Lazy loads F0001 children from directory
2. Shows stories S0045, S0046 under F0001
3. Displays status badges and progress bars
```

---

## Error Scenarios & Handling

### Scenario 1: Missing state.json

**Problem:** Directory exists but state.json is missing

**Detection:**
- Cascade scans directory and finds markdown but no state.json

**Handling:**
1. Show warning in Problems panel
2. Offer "Fix" action to generate missing state.json
3. Generate initial state based on children (if any)
4. Continue propagation after fix

### Scenario 2: Malformed state.json

**Problem:** state.json exists but invalid JSON or wrong structure

**Detection:**
- JSON.parse() fails
- Schema validation fails

**Handling:**
1. Show error in Problems panel
2. Mark work item in tree with error icon
3. Offer "Restore" action to recreate from markdown + children
4. Log error details for debugging

### Scenario 3: Registry Mismatch

**Problem:** Work item exists but not in registry, or vice versa

**Detection:**
- File exists but no registry entry
- Registry entry but file missing

**Handling:**
1. Show warning in Problems panel
2. Offer "Sync Registry" action
3. Rebuild registry from filesystem scan
4. Mark orphaned entries as deleted

### Scenario 4: Circular Dependency

**Problem:** Work item A depends on B, B depends on A

**Detection:**
- While propagating, encounter already-visited parent

**Handling:**
1. Stop propagation loop
2. Show error in Problems panel
3. Highlight problematic items in tree
4. Suggest breaking circular dependency

---

## Testing Requirements

### Unit Tests

**State Propagation:**
- Test single-level propagation (Story → Feature)
- Test multi-level propagation (Task → Story → Feature → Epic → Project)
- Test progress calculation with various child states
- Test concurrent updates

**File Watching:**
- Test detection of state.json changes
- Test debouncing of rapid changes
- Test handling of deleted files

**Validation:**
- Test schema validation for state.json
- Test directory structure validation
- Test registry integrity checks

### Integration Tests

**CARL → Cascade:**
- Test work item creation flow
- Test status update flow
- Test concurrent CARL operations

**User Interactions:**
- Test tree view rendering
- Test navigation
- Test context menu actions

### Performance Tests

**Large Hierarchies:**
- Test with 1000+ work items
- Test propagation performance
- Test tree view rendering performance
- Test file watcher with many rapid changes

---

## Migration & Versioning

### Breaking Changes

If Cascade format changes in future:

**Version field in registry:**
- Use `version` field to detect format
- Implement migration logic for old formats
- Provide "Migrate" command in VSCode

**Example migration:**
```javascript
if (registry.version === "1.0.0") {
  // Migrate to 2.0.0 format
  // ... migration logic
  registry.version = "2.0.0";
  saveRegistry(registry);
}
```

### Backward Compatibility

**Maintain compatibility for:**
- At least 2 major versions back
- Provide clear migration guides
- Auto-migrate on first extension load

---

## Summary & Quick Reference

### File Types

| File | Purpose | Modified By | Format |
|------|---------|-------------|--------|
| `{ID}.md` | Work item content | CARL | Markdown with YAML frontmatter |
| `state.json` | Work item state & progress | CARL (local), Cascade (parents) | JSON |
| `work-item-registry.json` | Master ID registry | CARL | JSON |

### Directory Structure Rules

- **Has directory**: Epic, Feature, Story, Bug, Phase
- **File only**: Project (root), Task (leaf)
- **Naming**: Directories use `{ID}-{slug}/`, files use `{ID}.md`

### Cascade Core Functions

1. **Watch** state.json files for changes
2. **Propagate** updates to parent state files
3. **Calculate** progress metrics (rollup)
4. **Display** work item hierarchy in tree view
5. **Navigate** between related work items
6. **Validate** structure and report errors

### Integration Contract

- **CARL creates** work items (directory + markdown + state.json)
- **CARL updates** only what it's working on (markdown + local state.json)
- **Cascade watches** for state.json changes
- **Cascade propagates** updates upward to parents
- **Cascade displays** real-time progress in tree view

---

## Appendix: Example Files

### Example: Epic state.json

```json
{
  "id": "E0001",
  "status": "in-progress",
  "progress": {
    "total_items": 4,
    "completed": 1,
    "in_progress": 2,
    "planned": 1,
    "percentage": 25
  },
  "children": {
    "F0001": {
      "status": "completed",
      "progress": 100
    },
    "F0002": {
      "status": "in-progress",
      "progress": 60
    },
    "F0003": {
      "status": "in-progress",
      "progress": 30
    },
    "F0004": {
      "status": "planned",
      "progress": 0
    }
  },
  "updated": "2025-01-05T14:23:45Z"
}
```

### Example: Feature Markdown

```markdown
---
id: F0001
type: Feature
title: Login Functionality
status: completed
priority: high
complexity: medium
parent: E0001
created: 2025-01-05
updated: 2025-01-05
---

# Login Functionality

## Description
Implement user login with email/password authentication.

## Acceptance Criteria
- [x] Login form with email and password fields
- [x] Form validation (email format, password requirements)
- [x] API integration for authentication
- [x] Remember me checkbox
- [x] Error handling for invalid credentials
- [x] Redirect to dashboard on success

## Dependencies
- Depends on: Database schema setup
- Blocks: Session management feature

## Children
- S0001: Login Form UI
- S0002: Remember Me Functionality
- S0003: Error Handling

## Execution Strategy
- **Parallel execution possible**: Yes (Stories are independent)
- **Prerequisites**: API endpoints ready, database configured
- **Estimated effort**: 1 week

## Technical Notes
- Use JWT tokens for authentication
- Implement rate limiting to prevent brute force
- Store passwords with bcrypt hashing
```

---

## Questions & Clarifications

If you have questions while implementing Cascade:

1. **Structure Questions**: Refer to "Directory Structure" section
2. **Format Questions**: Refer to "File Formats" section
3. **Behavior Questions**: Refer to "Cascade Responsibilities" section
4. **Integration Questions**: Refer to "Integration Points" section

**Contact**: Refer to CARL project documentation or the orchestration specification in `ORCHESTRATION-SKELETON.md`

---

**End of Cascade Integration Specification**
