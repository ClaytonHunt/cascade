// Simple test script for archive detection

function isItemArchived(item) {
  // Check 1: Frontmatter status is 'Archived'
  if (item.status === 'Archived') {
    return true;
  }

  // Check 2: File path contains archive directory
  // Normalize path: lowercase + forward slashes for cross-platform compatibility
  const normalizedPath = item.filePath.toLowerCase().replace(/\\/g, '/');

  // Check for '/archive/' in path (exact match with separators)
  if (normalizedPath.includes('/archive/')) {
    return true;
  }

  // Check for path ending with '/archive'
  if (normalizedPath.endsWith('/archive')) {
    return true;
  }

  // Not archived
  return false;
}

// Test case from bug report
const s43 = {
  item: 'S43',
  title: 'File Type Detection',
  type: 'story',
  status: 'Not Started',
  priority: 'High',
  filePath: 'D:\\projects\\lineage\\plans\\archive\\epic-03-vscode-planning-extension-archived-20251013\\feature-12-plans-visualization\\story-43-file-type-detection.md'
};

console.log('Testing S43 (from bug report):');
console.log('  Path:', s43.filePath);
console.log('  Status:', s43.status);
console.log('  isItemArchived:', isItemArchived(s43));
console.log('  Expected: true');
console.log('');

// Additional test cases
const testCases = [
  {
    name: 'Archived by status',
    item: {
      item: 'S1',
      status: 'Archived',
      filePath: '/plans/epic-01/story-01.md'
    },
    expected: true
  },
  {
    name: 'Active item',
    item: {
      item: 'S2',
      status: 'In Progress',
      filePath: '/plans/epic-01/story-02.md'
    },
    expected: false
  },
  {
    name: 'In archive directory with non-archived status',
    item: {
      item: 'S3',
      status: 'Ready',
      filePath: '/plans/archive/epic-03/story-03.md'
    },
    expected: true
  },
  {
    name: 'False positive: archive-old',
    item: {
      item: 'S4',
      status: 'Ready',
      filePath: '/plans/archive-old/epic-03/story-04.md'
    },
    expected: false
  }
];

console.log('Running additional test cases:');
for (const test of testCases) {
  const result = isItemArchived(test.item);
  const pass = result === test.expected;
  console.log(`  ${pass ? '✅' : '❌'} ${test.name}: ${result} (expected ${test.expected})`);
}
