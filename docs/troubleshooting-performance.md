# Troubleshooting Performance Issues

This guide helps diagnose and resolve performance issues in the Cascade TreeView.

## Symptoms and Solutions

### Symptom: TreeView Takes > 5 Seconds to Load

**Likely Cause:** Too many planning files (> 200), or slow file system.

**Diagnosis:**
1. Check item count: Count files in plans/ directory
   ```bash
   find plans -name "*.md" | wc -l
   ```
2. Check timing logs in Cascade Output Channel:
   - `[ItemsCache] Loaded X items in Yms`
   - If Y > 1000ms, file system is bottleneck

**Solutions:**
- Archive completed items to reduce file count
- Move plans/ to faster storage (SSD vs HDD)
- Disable antivirus scanning for workspace directory
- Check if other extensions are competing for file system access

---

### Symptom: Status Groups Slow to Expand (> 500ms)

**Likely Cause:** Cache not working, hierarchy building slow.

**Diagnosis:**
1. Open Cascade Output Channel
2. Expand a status group
3. Check for cache hit/miss:
   - `[ItemsCache] Cache HIT` - Good (cached)
   - `[ItemsCache] Cache MISS` - Bad (cache not working)

**Solutions:**
- If always cache MISS: Cache invalidation too aggressive
  - Check file watcher events (should debounce rapid changes)
  - Check if external process modifying files rapidly
- If hierarchy build > 100ms: Too many items in status group
  - Consider splitting large epics/features into smaller pieces
  - Archive completed items to reduce active item count

---

### Symptom: TreeView Freezes or Lags

**Likely Cause:** Synchronous operation blocking UI thread.

**Diagnosis:**
1. Open VSCode Developer Tools: Ctrl+Shift+P → "Developer: Toggle Developer Tools"
2. Switch to "Performance" tab
3. Start recording
4. Trigger freeze (expand TreeView, etc.)
5. Stop recording
6. Look for long synchronous blocks (> 100ms) in flame graph

**Solutions:**
- If file parsing is bottleneck: Check FrontmatterCache hit rate
  - `[CACHE STATS]` in Output Channel (logged every 60s)
  - Hit rate should be > 80%
  - If low: Investigate why cache invalidation is excessive
- If hierarchy building is bottleneck: Consider optimizing buildHierarchy()
  - Current implementation is O(n log n), should scale to 500+ items
  - If slow, check for nested loop or redundant operations

---

### Symptom: High Memory Usage (> 100MB)

**Likely Cause:** Cache not being cleared, memory leak.

**Diagnosis:**
1. Check cache statistics: "Cascade: Show Cache Statistics" command
   - Note current size and eviction count
2. Trigger multiple refresh cycles (edit files repeatedly)
3. Check cache statistics again
4. If size keeps growing (no evictions), possible memory leak

**Solutions:**
- Verify cache cleared on deactivation (check deactivate() function)
- Check FrontmatterCache maxSize (should be 1000 by default)
- Check if items cache is ever cleared (should clear on refresh())
- Profile with VSCode DevTools Memory tab to identify leak source

---

### Symptom: Cache Hit Rate < 50%

**Likely Cause:** File watcher triggering excessive refreshes.

**Diagnosis:**
1. Open Cascade Output Channel
2. Watch for FILE_CHANGED events
3. Count events per file save (should be 1 event per save, after 300ms)
4. If multiple events per save: Debouncing not working

**Solutions:**
- Check file watcher debounce delay (should be 300ms)
- Check if external process modifying files (build tools, git, etc.)
- Check if user has auto-save with very short delay (< 300ms)
  - Suggest increasing auto-save delay in VSCode settings

---

## Performance Monitoring

### Enable Verbose Logging

All performance-critical operations already log to Output Channel:
- Cache hit/miss: `[ItemsCache] Cache HIT/MISS`
- Timing: `[ItemsCache] Loaded X items in Yms`
- Cache stats: `[CACHE STATS]` (every 60 seconds)

No additional configuration needed.

### Benchmark Your Workspace

Run this test to establish baseline performance:

1. Count your planning files:
   ```bash
   find plans -name "*.md" | wc -l
   ```

2. Open Cascade TreeView, note timing logs:
   - Initial load time: `[ItemsCache] Loaded X items in Yms`
   - First expansion: `[Hierarchy] Built hierarchy in Yms`

3. Expand all 6 status groups, count cache hits:
   - Should see 1 MISS + 5+ HITs

4. Document results in `vscode-extension/performance-results.md`

### Recommended Monitoring (Production)

For teams using Cascade in production:
- Monitor cache hit rate weekly (should stay > 80%)
- Monitor item load time monthly (track trend as item count grows)
- Alert if load time exceeds 1000ms (indicates degradation)
- Archive completed items quarterly to keep count manageable

## Getting Help

If performance issues persist:
1. Collect diagnostic data:
   - Item count: `find plans -name "*.md" | wc -l`
   - Cache statistics: "Cascade: Show Cache Statistics" command
   - Output Channel logs (copy last 100 lines)
   - VSCode DevTools Performance profile (export as JSON)

2. File GitHub issue: https://github.com/anthropics/claude-code/issues
   - Include diagnostic data
   - Include steps to reproduce
   - Include expected vs actual performance

3. Tag issue with `performance` label
