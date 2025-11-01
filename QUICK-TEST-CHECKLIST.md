# Quick Test Checklist - Phase 2

**For rapid validation of activation event changes.**

## Prerequisites
- [ ] Extension rebuilt: `npm run compile` ✅
- [ ] Package.json has 3 activation events ✅

## 5-Minute Quick Test

### Test 1: Lineage Project (2 min)
```bash
# In VSCode with extension source open, press F5
# Extension Development Host opens D:\projects\lineage
# View → Output → "Lineage Planning"
```
**Expected**: ✅ Channel appears within 1 second, shows activation logs

---

### Test 2: Empty Project (2 min)
```bash
# Close Extension Development Host
# Open VSCode in any folder without plans/specs
# Press F5 in extension source
# View → Output → Check dropdown
```
**Expected**: ❌ "Lineage Planning" does NOT appear in dropdown

---

### Test 3: Multi-Root (1 min) - Optional
```bash
# File → Add Folder to Workspace → D:\projects\lineage
# Check if extension activates
```
**Expected**: ✅ Activates (even if other folders don't have plans/specs)

---

## Pass Criteria

✅ **Phase 2 Complete** if:
1. Extension activates in Lineage (Test 1 passes)
2. Extension doesn't activate in empty projects (Test 2 passes)
3. No errors in any scenario

❌ **Issues to investigate** if:
- Extension takes > 2 seconds to activate (workspaceContains not working)
- Extension activates in empty projects (glob pattern too broad)
- Errors appear in Debug Console

## Detailed Testing

For comprehensive test procedures, see: `PHASE2-MANUAL-TESTS.md`
For test results documentation, see: `PHASE2-TEST-RESULTS.md`

## Debug Tips

**Extension activates slowly?**
- Check which event triggered: Look for logs mentioning activation source
- workspaceContains should be instant, onStartupFinished delayed

**Extension won't activate in Lineage?**
- Verify plans/ and specs/ directories exist: `ls D:\projects\lineage`
- Check package.json syntax: `node -e "require('./package.json')"`
- Rebuild: `npm run compile`

**Extension activates in empty projects?**
- Check workspace detection logs (should show "will not initialize features")
- This is expected if onStartupFinished triggers (Phase 1 early return)
- Memory still saved vs old behavior (Phase 1 optimization)
