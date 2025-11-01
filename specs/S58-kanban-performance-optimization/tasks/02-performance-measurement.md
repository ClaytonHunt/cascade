---
spec: S58
phase: 2
title: Performance Measurement
status: Completed
priority: Low
created: 2025-10-14
updated: 2025-10-14
---

# Phase 2: Performance Measurement

## Overview

This phase validates the optimization implemented in Phase 1 by conducting performance tests with varying dataset sizes and stress scenarios. The goal is to measure actual performance against target benchmarks and identify any remaining bottlenecks.

**Performance Targets (from S58 requirements):**
- TreeView refresh < 500ms with 100+ items
- Status group expansion < 100ms
- Hierarchy expansion < 50ms per level
- Progress calculation < 50ms per parent (already cached)
- Cache hit rate > 80% after initial load
- No visible lag or UI freezing

## Prerequisites

- Phase 1 completed (items cache implemented)
- Performance timing logs added to Output Channel
- Cache statistics logging available (already implemented in extension.ts:622)
- VSCode DevTools available (F1 → "Developer: Toggle Developer Tools")

## Tasks

### Task 1: Create Test Dataset Generator

**Purpose:** Generate synthetic planning files to test performance at 50, 100, and 200 item scales.

**File:** Create new script `vscode-extension/scripts/generate-test-data.js`

**Script Content:**
```javascript
/**
 * Generates synthetic planning files for performance testing.
 *
 * Usage: node generate-test-data.js <count> <output-dir>
 * Example: node generate-test-data.js 100 test-plans
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const count = parseInt(process.argv[2] || '50', 10);
const outputDir = process.argv[3] || 'test-plans';

// Item type distribution (realistic mix)
const typeDistribution = {
  epic: 0.05,      // 5% epics
  feature: 0.15,   // 15% features
  story: 0.70,     // 70% stories
  bug: 0.10        // 10% bugs
};

// Status distribution (realistic workflow state)
const statusDistribution = {
  'Not Started': 0.30,
  'In Planning': 0.10,
  'Ready': 0.15,
  'In Progress': 0.20,
  'Blocked': 0.05,
  'Completed': 0.20
};

// Priority distribution
const priorityDistribution = {
  'High': 0.30,
  'Medium': 0.50,
  'Low': 0.20
};

// Utility: Random item from weighted distribution
function randomFromDistribution(dist) {
  const rand = Math.random();
  let cumulative = 0;
  for (const [key, weight] of Object.entries(dist)) {
    cumulative += weight;
    if (rand <= cumulative) return key;
  }
  return Object.keys(dist)[0]; // Fallback
}

// Generate frontmatter for a planning item
function generateFrontmatter(itemNumber, itemType) {
  const status = randomFromDistribution(statusDistribution);
  const priority = randomFromDistribution(priorityDistribution);
  const title = `Test ${itemType.charAt(0).toUpperCase() + itemType.slice(1)} ${itemNumber}`;

  const prefix = {
    epic: 'E',
    feature: 'F',
    story: 'S',
    bug: 'B'
  }[itemType];

  return `---
item: ${prefix}${itemNumber}
title: ${title}
type: ${itemType}
status: ${status}
priority: ${priority}
dependencies: []
estimate: M
created: 2025-10-14
updated: 2025-10-14
---

# ${prefix}${itemNumber} - ${title}

## Description

This is a synthetic ${itemType} generated for performance testing purposes.
It contains minimal content to simulate realistic file sizes.

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3
`;
}

// Generate directory structure
function createDirectoryStructure() {
  // Create output directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create epic subdirectories (5% of items)
  const epicCount = Math.ceil(count * typeDistribution.epic);
  const epicDirs = [];

  for (let i = 1; i <= epicCount; i++) {
    const epicDir = path.join(outputDir, `epic-${String(i).padStart(2, '0')}-test-epic`);
    fs.mkdirSync(epicDir, { recursive: true });
    epicDirs.push(epicDir);

    // Create feature subdirectories within epics
    const featuresPerEpic = Math.ceil((count * typeDistribution.feature) / epicCount);
    for (let j = 1; j <= featuresPerEpic; j++) {
      const featureDir = path.join(epicDir, `feature-${String(j).padStart(2, '0')}-test-feature`);
      fs.mkdirSync(featureDir, { recursive: true });
    }
  }

  return epicDirs;
}

// Main generation logic
function generateTestData() {
  console.log(`Generating ${count} test planning items in ${outputDir}/`);

  // Create directory structure
  createDirectoryStructure();

  let itemNumber = 1;

  // Generate epics (in epic-XX-test-epic/ directories)
  const epicCount = Math.ceil(count * typeDistribution.epic);
  for (let i = 1; i <= epicCount; i++) {
    const epicDir = path.join(outputDir, `epic-${String(i).padStart(2, '0')}-test-epic`);
    const epicFile = path.join(epicDir, 'epic.md');
    const content = generateFrontmatter(itemNumber, 'epic');
    fs.writeFileSync(epicFile, content);
    itemNumber++;
  }

  // Generate features (in epic-XX-test-epic/feature-YY-test-feature/ directories)
  const featureCount = Math.ceil(count * typeDistribution.feature);
  for (let i = 1; i <= featureCount; i++) {
    const epicIndex = ((i - 1) % epicCount) + 1;
    const epicDir = path.join(outputDir, `epic-${String(epicIndex).padStart(2, '0')}-test-epic`);
    const featureIndex = Math.ceil(i / epicCount);
    const featureDir = path.join(epicDir, `feature-${String(featureIndex).padStart(2, '0')}-test-feature`);
    const featureFile = path.join(featureDir, 'feature.md');
    const content = generateFrontmatter(itemNumber, 'feature');
    fs.writeFileSync(featureFile, content);
    itemNumber++;
  }

  // Generate stories (in epic-XX/feature-YY/ directories + some orphans)
  const storyCount = Math.ceil(count * typeDistribution.story);
  const orphanStoryCount = Math.ceil(storyCount * 0.1); // 10% orphans

  // Nested stories
  for (let i = 1; i <= storyCount - orphanStoryCount; i++) {
    const featureIndex = ((i - 1) % featureCount) + 1;
    const epicIndex = ((featureIndex - 1) % epicCount) + 1;
    const epicDir = path.join(outputDir, `epic-${String(epicIndex).padStart(2, '0')}-test-epic`);
    const featureDirIndex = Math.ceil(featureIndex / epicCount);
    const featureDir = path.join(epicDir, `feature-${String(featureDirIndex).padStart(2, '0')}-test-feature`);
    const storyFile = path.join(featureDir, `story-${String(itemNumber).padStart(3, '0')}-test.md`);
    const content = generateFrontmatter(itemNumber, 'story');
    fs.writeFileSync(storyFile, content);
    itemNumber++;
  }

  // Orphan stories
  for (let i = 1; i <= orphanStoryCount; i++) {
    const storyFile = path.join(outputDir, `story-${String(itemNumber).padStart(3, '0')}-orphan.md`);
    const content = generateFrontmatter(itemNumber, 'story');
    fs.writeFileSync(storyFile, content);
    itemNumber++;
  }

  // Generate bugs (mix of nested and orphan)
  const bugCount = count - itemNumber + 1; // Remaining items
  const orphanBugCount = Math.ceil(bugCount * 0.3); // 30% orphans

  // Nested bugs
  for (let i = 1; i <= bugCount - orphanBugCount; i++) {
    const featureIndex = ((i - 1) % featureCount) + 1;
    const epicIndex = ((featureIndex - 1) % epicCount) + 1;
    const epicDir = path.join(outputDir, `epic-${String(epicIndex).padStart(2, '0')}-test-epic`);
    const featureDirIndex = Math.ceil(featureIndex / epicCount);
    const featureDir = path.join(epicDir, `feature-${String(featureDirIndex).padStart(2, '0')}-test-feature`);
    const bugFile = path.join(featureDir, `bug-${String(itemNumber).padStart(3, '0')}-test.md`);
    const content = generateFrontmatter(itemNumber, 'bug');
    fs.writeFileSync(bugFile, content);
    itemNumber++;
  }

  // Orphan bugs
  for (let i = 1; i <= orphanBugCount && itemNumber <= count; i++) {
    const bugFile = path.join(outputDir, `bug-${String(itemNumber).padStart(3, '0')}-orphan.md`);
    const content = generateFrontmatter(itemNumber, 'bug');
    fs.writeFileSync(bugFile, content);
    itemNumber++;
  }

  console.log(`✅ Generated ${itemNumber - 1} planning items`);
  console.log(`   Epics: ${epicCount}`);
  console.log(`   Features: ${featureCount}`);
  console.log(`   Stories: ${storyCount} (${orphanStoryCount} orphans)`);
  console.log(`   Bugs: ${bugCount} (${orphanBugCount} orphans)`);
}

// Run generator
generateTestData();
```

**Expected Outcome:**
- Script creates realistic planning hierarchy with correct frontmatter
- Supports variable item counts (50, 100, 200)
- Creates nested directory structure (epic/feature/story hierarchy)
- Includes orphan items (stories/bugs without parents)

**Validation:**
```bash
cd vscode-extension/scripts
node generate-test-data.js 100 test-plans-100
# Check output:
ls -la test-plans-100  # Should show epic directories
find test-plans-100 -name "*.md" | wc -l  # Should show ~100
```

---

### Task 2: Run Performance Tests with Different Dataset Sizes

**Test Scenarios:**

**Scenario 1: Baseline (Current Workspace - 84 items)**
- Use existing `plans/` directory (84 real planning files)
- Measure TreeView operations as baseline
- Record cache hit rates, timing logs

**Scenario 2: Small Dataset (50 items)**
- Generate 50 test items: `node generate-test-data.js 50 test-plans-50`
- Create temporary workspace with test data
- Measure performance

**Scenario 3: Medium Dataset (100 items)**
- Generate 100 test items: `node generate-test-data.js 100 test-plans-100`
- Create temporary workspace with test data
- Measure performance (target: < 500ms refresh)

**Scenario 4: Large Dataset (200 items)**
- Generate 200 test items: `node generate-test-data.js 200 test-plans-200`
- Create temporary workspace with test data
- Measure performance (stress test)

**Measurement Process (for each scenario):**

1. **Setup Test Workspace:**
   ```bash
   mkdir temp-workspace
   cp -r test-plans-[N] temp-workspace/plans
   code temp-workspace  # Open in VSCode
   ```

2. **Open Cascade Output Channel:**
   - Ctrl+Shift+P → "View: Toggle Output"
   - Select "Cascade" from dropdown

3. **Measure Initial Load:**
   - Open Cascade TreeView (Activity Bar)
   - Record timing from Output Channel:
     - `[ItemsCache] Loaded X items in Yms`
     - `[StatusGroups] Built 6 status groups in Yms`
   - **Target:** < 500ms total for 100 items

4. **Measure Status Group Expansion:**
   - Expand "Ready" status group
   - Record timing: `[Hierarchy] Built hierarchy for Ready: X root nodes in Yms`
   - **Target:** < 100ms

5. **Measure Cache Hit Rate:**
   - Expand all 6 status groups in sequence
   - Count "Cache HIT" vs "Cache MISS" in Output Channel
   - **Target:** > 80% hit rate

6. **Measure Cache Invalidation + Refresh:**
   - Edit any file in plans/ directory
   - Wait for file watcher trigger (300ms)
   - Expand status group again
   - Record full cycle time (invalidation + reload)
   - **Target:** < 500ms for reload

7. **Check Final Cache Statistics:**
   - Wait 60 seconds for periodic stats log, OR
   - Run command: "Cascade: Show Cache Statistics"
   - Record hit rate percentage from Output Channel

**Recording Template:**

Create file: `vscode-extension/performance-results.md`

```markdown
# Performance Test Results - S58 Optimization

## Test Environment
- VSCode Version: [version]
- Extension Version: [version]
- Platform: Windows/Mac/Linux
- Date: [date]

## Scenario 1: Baseline (84 items)
- Initial load time: Xms
- Status group expansion: Xms
- Cache hit rate: X%
- Notes: [observations]

## Scenario 2: Small Dataset (50 items)
- Initial load time: Xms
- Status group expansion: Xms
- Cache hit rate: X%
- Notes: [observations]

## Scenario 3: Medium Dataset (100 items)
- Initial load time: Xms
- Status group expansion: Xms
- Cache hit rate: X%
- Notes: [observations]
- ✅/❌ Meets target (< 500ms refresh)

## Scenario 4: Large Dataset (200 items)
- Initial load time: Xms
- Status group expansion: Xms
- Cache hit rate: X%
- Notes: [observations]

## Summary
- All targets met: ✅/❌
- Performance acceptable up to X items
- Bottlenecks identified: [list]
```

**Expected Outcome:**
- Performance data collected for 4 dataset sizes
- Cache hit rates recorded (expect > 80%)
- Timing logs confirm optimization effective
- Targets met for 100-item scenario

---

### Task 3: Stress Testing

**Purpose:** Validate extension behavior under extreme conditions.

**Stress Test 1: Rapid File Changes**
- Open workspace with 100 test items
- Edit and save 10 files in rapid succession (< 1 second)
- Observe Output Channel for debouncing behavior
- **Expected:** File watcher debouncing batches changes, single refresh triggered

**Stress Test 2: Concurrent Status Group Expansions**
- Open workspace with 100 test items
- Rapidly expand all 6 status groups (click each as fast as possible)
- Observe TreeView responsiveness
- **Expected:** No lag, no freezing, all groups expand correctly

**Stress Test 3: Deep Hierarchy Navigation**
- Open workspace with 200 test items
- Expand Epic → Feature → Stories (multiple levels)
- Observe hierarchy expansion timing
- **Expected:** Each level expands in < 50ms

**Stress Test 4: Memory Stability**
- Open workspace with 200 test items
- Expand all status groups
- Edit files repeatedly (trigger 20+ cache invalidations)
- Monitor memory usage via Task Manager/Activity Monitor
- **Expected:** Memory usage stable (no leaks), stays under 100MB for extension

**Validation Criteria:**
- ✅ No UI freezing during rapid operations
- ✅ File watcher debouncing prevents excessive refreshes
- ✅ Hierarchy expansions remain fast (< 50ms)
- ✅ Memory usage stable over extended session
- ✅ No errors in Output Channel or Debug Console

---

### Task 4: Profile with VSCode DevTools

**Purpose:** Identify any remaining performance bottlenecks using browser-based profiling.

**Steps:**

1. **Open DevTools:**
   - Ctrl+Shift+P → "Developer: Toggle Developer Tools"
   - Switch to "Performance" tab

2. **Start Recording:**
   - Click "Record" button (red circle)
   - Perform TreeView operations:
     - Open TreeView (initial load)
     - Expand status groups
     - Trigger file change
   - Stop recording after ~10 seconds

3. **Analyze Flame Graph:**
   - Look for long-running functions (> 50ms blocks)
   - Identify hot paths (frequently called functions)
   - Focus on `PlanningTreeProvider` methods

4. **Check for Red Flags:**
   - ⚠️ Long synchronous operations (> 100ms blocking)
   - ⚠️ Repeated file system calls (should be cached)
   - ⚠️ Memory allocation spikes (GC pressure)

5. **Document Findings:**
   - Screenshot flame graph showing key operations
   - Note any methods taking > 50ms
   - Compare before/after optimization (if baseline profile available)

**Expected Outcome:**
- Most operations < 50ms (cached)
- `loadAllPlanningItemsUncached()` only called once per refresh
- No excessive GC activity
- Flame graph shows efficient execution

**Optional:** Take screenshots and add to `performance-results.md`.

---

### Task 5: Document Performance Characteristics

**File:** Update `vscode-extension/performance-results.md` with findings

**Sections to Add:**

```markdown
## Performance Characteristics

### Cache Behavior
- Items cache hit rate: X% (target: > 80%)
- First load: ~Xms for 100 items
- Subsequent operations: < 5ms (cached)

### Bottlenecks Identified
- [List any remaining bottlenecks]
- [Recommendations for future optimization]

### Scalability Assessment
- Acceptable performance up to X items
- Degradation point: X items (if applicable)
- Memory usage: ~X MB for 100 items

### Optimization Impact
- Before: X file scans per TreeView interaction
- After: 1 file scan per refresh cycle
- Speed improvement: Xx faster (estimated)

## Recommendations
- [Production readiness assessment]
- [Suggested monitoring/alerting]
- [Future optimization opportunities]
```

**Expected Outcome:**
- Complete performance report with data-backed conclusions
- Clear assessment of whether targets were met
- Recommendations for future work (if needed)

## Completion Criteria

- ✅ Test dataset generator script created and validated
- ✅ Performance tests run for 50, 100, 200 item datasets
- ✅ Timing logs collected for all key operations
- ✅ Cache hit rates measured (expect > 80%)
- ✅ Stress tests completed (rapid changes, concurrent expansions)
- ✅ VSCode DevTools profiling completed
- ✅ Performance report documented in `performance-results.md`
- ✅ All targets met for 100-item scenario:
  - TreeView refresh < 500ms ✅
  - Status group expansion < 100ms ✅
  - Hierarchy expansion < 50ms ✅
  - Cache hit rate > 80% ✅
- ✅ No regressions in existing 84-item workspace

## Next Phase

Proceed to **Phase 3: Documentation and Polish** to finalize code documentation and update project guides.
