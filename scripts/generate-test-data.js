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
