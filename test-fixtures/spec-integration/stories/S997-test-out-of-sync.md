---
item: S997
title: Test Story Out of Sync
type: story
parent: F25
status: Ready
spec: specs/story-997-test
priority: High
estimate: M
created: 2025-10-27
updated: 2025-10-27
---

# S997 - Test Story Out of Sync

## Description

Test story with spec status ahead of story status.
Should display sync warning (⚠️) in TreeView indicator.

Story status is "Ready" but spec status is "Completed" (2/2 phases complete).
This mismatch triggers the sync warning feature.

Used in manual testing to verify:
- Sync warning icon (⚠️) appears when statuses mismatch
- Tooltip displays sync warning message
- User understands spec is ahead of story
- /sync command suggestion provided

## Acceptance Criteria

- [ ] Sync warning icon (⚠️) displayed in TreeView
- [ ] Spec indicator shows all phases complete (✓ 2/2)
- [ ] Tooltip contains warning: "Spec and Story status out of sync - run /sync to update"
- [ ] Warning clearly explains issue to user
