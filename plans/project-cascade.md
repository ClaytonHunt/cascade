---
item: P2
title: Cascade VSCode Extension
type: project
status: In Progress
priority: High
created: 2025-10-14
updated: 2025-10-14
---
# P2 - Cascade VSCode Extension

## Description

Cascade is a VSCode extension that provides hierarchical planning and project management capabilities directly within the editor. It enables developers to manage project hierarchies (Projects → Epics → Features → Stories/Bugs) with visual kanban-style status tracking, real-time synchronization, and seamless integration with markdown-based planning files.

As a meta-development tool, Cascade works with any project (including Lineage RPG and other codebases) to facilitate planning, tracking, and implementation workflows without being tied to a specific domain or technology.

## Objectives

- Provide hierarchical planning visualization within VSCode
- Enable kanban-style status tracking with drag-and-drop transitions
- Maintain bidirectional sync between UI and markdown frontmatter
- Support real-time updates via file system watchers
- Integrate with existing planning infrastructure (parsers, cache, icons)
- Replace file decoration approach with dedicated TreeView panel

## Scope

This project encompasses the complete Cascade VSCode extension, including:
- **Custom TreeView Panel**: Hierarchical display of planning items in Activity Bar
- **Status-Based Kanban Layout**: Items grouped by status for pipeline visibility
- **Drag-and-Drop Interactions**: Visual status transitions with automatic file updates
- **Context Menu Actions**: Quick access to common operations (status change, file open, create child)
- **Real-Time Synchronization**: Watch planning files for external changes
- **Infrastructure**: YAML parsing, caching, file watching, icon mapping

## Child Items

- **E3**: VSCode Planning Extension (Archived 2025-10-13) - File decoration approach
- **E4**: Planning Kanban View - TreeView-based kanban panel

## Dependencies

None (standalone development tooling project)

## Analysis Summary

**Project Separation Rationale:**

Cascade is fundamentally different from Lineage RPG game systems:
- **Purpose**: Development tooling vs. game functionality
- **Scope**: Works with any project vs. Lineage-specific
- **Technology**: VSCode TypeScript extension vs. Godot GDScript addons
- **Users**: Developers managing projects vs. players experiencing gameplay

**Reusable Infrastructure:**

The extension leverages completed work from archived E3:
- S39: YAML Frontmatter Parser (`vscode-extension/src/parser.ts`)
- S40: Frontmatter Cache Layer (`vscode-extension/src/cache.ts`)
- S38: File System Watcher (integrated in `extension.ts`)
- S42: Status Icon Mapping (`vscode-extension/src/statusIcons.ts`)

**Active Development:**

E4 (Planning Kanban View) is the current active epic, implementing:
- F16: TreeView Foundation (S48-S53 completed)
- F17-F21: Status layout, drag-drop, context menus, sync, cleanup

## Notes

This project was separated from P1 (Lineage RPG) on 2025-10-14 to properly distinguish between:
- Game development systems (P1)
- Development tooling (P2)

Cascade extension code lives in `vscode-extension/` directory and uses the planning files in `plans/` to provide visualization and management capabilities.
