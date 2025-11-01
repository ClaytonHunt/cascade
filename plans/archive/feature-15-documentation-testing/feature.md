---
item: F15
title: Documentation and Testing
type: feature
status: Not Started
priority: Medium
dependencies: [F11, F12, F13, F14]
created: 2025-10-12
updated: 2025-10-12
---

# F15 - Documentation and Testing

## Description

Create comprehensive documentation for the VSCode extension and planning system, including setup instructions, frontmatter schema reference, and usage guides. Implement testing infrastructure to ensure extension reliability and correctness.

## Objectives

- Write extension README with installation and usage instructions
- Document frontmatter schema specification
- Create user guide for planning and spec workflow with visual examples
- Implement unit tests for core extension functionality
- Create integration tests for decoration providers
- Set up CI/CD pipeline for extension testing
- Package extension for distribution

## Scope

- README.md for extension repository
- Frontmatter schema documentation (YAML field reference)
- User guide with screenshots showing icon/badge meanings
- Unit tests for:
  - Frontmatter parser
  - Hierarchical progress calculation
  - Cache management
- Integration tests for:
  - FileDecorationProvider
  - FileSystemWatcher
  - Workspace activation
- VSCode extension testing setup (vscode-test)
- GitHub Actions CI workflow
- Extension packaging (.vsix file)

## Acceptance Criteria

### Documentation
- README includes:
  - Installation instructions
  - Feature overview with screenshots
  - Configuration options (if any)
  - Troubleshooting section
- Frontmatter schema document includes:
  - All required fields with descriptions
  - Valid values for status, priority, type fields
  - Examples for each item type (Epic, Feature, Story, Spec, Phase)
- User guide includes:
  - Planning workflow (Project → Epic → Feature → Story)
  - Spec workflow (Story → Spec → Phases → Tasks)
  - Build workflow (/build with TDD cycle)
  - Visual reference for all status icons and badges

### Testing
- Unit test coverage ≥ 80% for core logic
- Integration tests verify:
  - Decorations appear correctly for each status type
  - Aggregate counts calculated correctly
  - File changes trigger decoration updates
- All tests pass in CI pipeline
- Extension can be packaged without errors

### Distribution
- Extension packaged as .vsix file
- Installation tested in clean VSCode environment
- Extension published to VSCode Marketplace (optional)

## Technical Notes

**Testing Framework:**
- Use `@vscode/test-electron` for VSCode extension testing
- Use `mocha` for test runner
- Use `chai` or `assert` for assertions

**Test Structure:**
```
test/
├── suite/
│   ├── frontmatter.test.ts
│   ├── hierarchy.test.ts
│   ├── decoration.test.ts
│   └── watcher.test.ts
└── fixtures/
    ├── plans/
    │   └── (sample plan files)
    └── specs/
        └── (sample spec files)
```

**Documentation Structure:**
```
docs/
├── README.md (main extension docs)
├── frontmatter-schema.md
├── user-guide.md
└── screenshots/
    ├── plans-view.png
    ├── specs-view.png
    └── status-icons.png
```

**Packaging:**
```bash
vsce package  # Creates .vsix file
vsce publish  # Publishes to marketplace (optional)
```

## Child Items

To be broken down into stories.

## Dependencies

- **F11**: Extension Infrastructure (test core functionality)
- **F12**: Plans Visualization (test plans decorations)
- **F13**: Specs Visualization (test specs decorations)
- **F14**: Command Updates (document frontmatter requirements)

## Analysis Summary

**VSCode Extension Testing:**
- VSCode provides `@vscode/test-electron` for running tests in real VSCode instance
- Can create fixture files to test decoration logic
- Integration tests can verify FileDecorationProvider behavior

**Documentation Requirements:**
- Users need to understand frontmatter schema to manually edit files if needed
- Visual guide helps users quickly recognize status icons
- Troubleshooting section for common issues (extension not activating, decorations not appearing)

**Distribution:**
- Extension can be distributed as .vsix file for internal use
- Optional: Publish to VSCode Marketplace for wider distribution
- Requires publisher account and marketplace listing

**Integration Points:**
- Documentation references all other features (F11-F14)
- Tests validate functionality of all features
- CI pipeline ensures reliability across changes
