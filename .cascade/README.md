# Cascade Work Items

This directory contains the hierarchical work item structure for the Cascade VSCode Extension project.

## Structure

```
.cascade/
  ├── README.md                          # This file
  ├── P0001.md                           # Project file (root level)
  ├── state.json                         # Project state
  ├── work-item-registry.json            # Master ID registry
  └── E0001-cascade-integration/         # Epic directory
      ├── E0001.md                       # Epic markdown
      ├── state.json                     # Epic state
      └── F0001-state-propagation/       # Feature directory
          ├── F0001.md                   # Feature markdown
          ├── state.json                 # Feature state
          └── S0001-propagation-engine/  # Story directory
              ├── S0001.md               # Story markdown
              ├── state.json             # Story state
              └── T0001.md               # Task file (leaf node)
```

## File Formats

- **Markdown files**: Work item descriptions with YAML frontmatter
- **state.json**: Automated state tracking and progress metrics
- **work-item-registry.json**: Master registry of all work items

For detailed specifications, see CASCADE-INTEGRATION-SPEC.md in the project root.
