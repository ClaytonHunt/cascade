---
item: E3
title: VSCode Planning & Spec Status Extension
type: epic
parent: P2
status: Completed
priority: High
dependencies: []
created: 2025-10-12
updated: 2025-10-14
archived: 2025-10-13
archived_reason: File decoration approach replaced by TreeView-based kanban panel (E4)
---

# E3 - VSCode Planning & Spec Status Extension

## Description

Create a Visual Studio Code extension that provides visual status tracking for the planning and specification system. The extension reads YAML frontmatter from files in the `plans/` and `specs/` directories to display hierarchical progress through icons and badges in the VSCode file explorer.

## Objectives

- **Visual Status Tracking**: Display status of planning items (Epics, Features, Stories, Bugs) and specs (Phases, Tasks) using icons and badges
- **Hierarchical Progress**: Show aggregate completion for parent items (e.g., Epic shows "2/5 features complete")
- **Frontmatter-Driven**: Read status information from YAML frontmatter in markdown files
- **Seamless Integration**: Work alongside existing VSCode features (git status, etc.) without conflicts
- **Consistency**: Ensure `/plan`, `/spec`, and `/build` commands maintain frontmatter consistently

## Scope

This epic encompasses:
1. VSCode extension development with file decoration API
2. Frontmatter parsing system for plans and specs
3. Icon and badge rendering for status visualization
4. Hierarchical progress calculation (aggregate status for folders/parents)
5. Updates to existing Claude Code commands (`/plan`, `/spec`, `/build`) for consistent frontmatter management
6. Documentation for extension usage and frontmatter schema

## Status Hierarchy

### Plans Directory
- **Projects** (P#): Shows aggregate epic completion
- **Epics** (E#): Shows aggregate feature completion (e.g., "2/5")
- **Features** (F#): Shows aggregate story/bug completion (e.g., "3/8")
- **Stories/Bugs** (S#/B#): Shows individual status icon

### Specs Directory
- **Spec plan.md**: Shows overall spec status
- **Phase files** (tasks/*.md): Shows individual phase status based on frontmatter
- **Task tracking**: Tasks within phases tracked via phase status

## Visual Design Principles

- **Icons over colors**: Use icons and badges to avoid conflicts with git status colors
- **Clear hierarchy**: Parent folders show aggregate progress, child files show individual status
- **Scannable**: Quick visual indication of what's ready, in progress, blocked, or complete
- **Non-intrusive**: Integrates naturally with VSCode's file explorer

## Key Requirements

1. **Frontmatter Schema Standardization**
   - Ensure all plan files have consistent YAML frontmatter fields
   - Add frontmatter to spec task files for phase tracking
   - Status values: Not Started, In Planning, Ready, In Progress, Blocked, Completed

2. **Extension Capabilities**
   - Parse YAML frontmatter from markdown files
   - Calculate aggregate status for parent items
   - Apply file decorations (icons/badges) in VSCode explorer
   - Watch for file changes and update decorations in real-time

3. **Command Updates**
   - `/plan`: Ensure all created/updated files maintain consistent frontmatter
   - `/spec`: Add frontmatter to spec plan.md and task files
   - `/build`: Update phase/task frontmatter as work progresses

## Child Items

- **F11**: Extension Infrastructure - Workspace activation, file watching, frontmatter parsing
- **F12**: Plans Directory Visualization - Icons/badges for Epics, Features, Stories, Bugs
- **F13**: Specs Directory Visualization - Icons/badges for Specs, Phases, Tasks
- **F14**: Slash Command Frontmatter Consistency - Update /plan, /spec, /build commands
- **F15**: Documentation and Testing - User guides, schema docs, tests, packaging

## Dependencies

None (can be developed independently)

## Analysis Summary

**Current State:**
- Plans directory has established YAML frontmatter pattern with required fields
- Specs directory uses frontmatter in plan.md but not consistently in task files
- Slash commands (`/plan`, `/spec`, `/build`) defined in `.claude/commands/`

**VSCode Extension Requirements:**
- Use VSCode Extension API for file decorations
- FileSystemWatcher for real-time updates
- YAML parsing library (e.g., js-yaml)
- Icon theming support for light/dark themes

**Integration Points:**
- Plans structure: `plans/epic-##-name/feature-##-name/story-##-name.md`
- Specs structure: `specs/S##-name/plan.md` and `specs/S##-name/tasks/##-phase-name.md`
- Frontmatter fields: `item`, `title`, `type`, `status`, `priority`, `dependencies`, `estimate`, `created`, `updated`

**Technical Considerations:**
- Extension must handle Windows paths (project at `D:\projects\lineage`)
- Should not interfere with git decorations
- Performance: Must efficiently parse frontmatter without blocking UI
- Workspace-specific: Only activate when workspace contains `plans/` or `specs/` directories

## Next Steps

Break down into features:
1. Extension infrastructure (workspace activation, file watching, frontmatter parsing)
2. Plans directory visualization (Epic/Feature/Story hierarchy with icons/badges)
3. Specs directory visualization (Spec/Phase/Task tracking)
4. Slash command updates for frontmatter consistency
5. Documentation and testing

Run `/plan E3` to break down into features.
