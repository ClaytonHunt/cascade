---
spec: S997
title: Test Spec Completed
type: spec
status: Completed
priority: High
phases: 2
created: 2025-10-27
updated: 2025-10-27
---

# S997 Test Spec (Out of Sync)

## Overview

Test spec with "Completed" status while story status is "Ready".
This status mismatch should trigger sync warning in TreeView.

This spec has 2 phases, both completed:
- Phase 1: Completed
- Phase 2: Completed

Used in manual testing to verify:
- Sync warning icon (⚠️) appears in TreeView
- Tooltip displays warning message
- User understands spec is ahead of story status
- /sync command suggestion provided

## Phases

1. Phase 1 - Completed
2. Phase 2 - Completed

## Test Instructions

Story S997 has status "Ready" but this spec has status "Completed".
This intentional mismatch tests sync warning display logic.

Expected TreeView indicator: `⚠️ 📋 ✓ Phase 2/2`
Expected tooltip warning: "Spec and Story status out of sync - run /sync to update"
