---
spec: S83
phase: 2
title: Custom Theme Testing and Contrast Analysis
status: Not Started
priority: Medium
created: 2025-10-25
updated: 2025-10-25
---

# Phase 2: Custom Theme Testing and Contrast Analysis

## Overview

This phase expands testing to popular custom VSCode themes and performs rigorous contrast ratio analysis to verify WCAG AA accessibility compliance. We'll test 2-3 widely-used custom themes, extract icon and background colors from screenshots, and calculate contrast ratios using online tools.

**Deliverables:**
- Screenshots of badges in 2-3 custom themes
- Contrast ratio calculations for all status badges
- WCAG AA compliance verification (4.5:1 minimum)
- Documentation of any theme-specific issues or limitations

## Prerequisites

- ✅ Phase 1 completed (default theme testing done)
- `badge-theme-testing.md` exists with initial results
- Screenshots from Dark+ and Light+ themes captured
- VSCode with extension installed

## Tasks

### Task 1: Install and Test One Dark Pro Theme

**Objective:** Validate badges in One Dark Pro (most popular VSCode dark theme)

**Steps:**
1. Install One Dark Pro theme:
   - Open Extensions panel: `Ctrl+Shift+X`
   - Search: "One Dark Pro"
   - Install "One Dark Pro" by binaryify
   - Or install via CLI: `code --install-extension zhuangtongfa.Material-theme`

2. Switch to One Dark Pro theme:
   - Press `Ctrl+K Ctrl+T`
   - Select "One Dark Pro"

3. Test badges in Cascade TreeView:
   - Open Cascade TreeView (Activity Bar)
   - Expand all status groups
   - Verify all 7 status badges render correctly

4. Capture screenshots:
   - Take screenshot of each status group
   - Save to `vscode-extension/docs/screenshots/one-dark-pro/`
   - Use consistent naming: `one-dark-pro-[status].png`

5. Document observations:
   - Add section to `badge-theme-testing.md` for One Dark Pro
   - Note any differences from Dark+ theme
   - Record readability assessment

**Expected Outcome:**
- One Dark Pro theme installed
- All 7 badges visible and readable
- Screenshots captured
- Observations documented

**Badge Appearance Notes:**
- One Dark Pro typically has warmer colors than Dark+
- Error red may be more orange-tinted
- Pass green may be brighter
- Overall darker background than Dark+

**File References:**
- Theme extension: https://marketplace.visualstudio.com/items?itemName=zhuangtongfa.Material-theme

---

### Task 2: Install and Test Additional Custom Themes

**Objective:** Test 1-2 more popular themes for broader compatibility verification

**Recommended Themes to Test:**

**Option A: Dracula Official**
- Popular dark theme with purple/pink accents
- Good contrast typically
- Install: `code --install-extension dracula-theme.theme-dracula`

**Option B: Solarized Light**
- Popular light theme (alternative to Light+)
- Well-researched color palette
- Install: `code --install-extension ryanolsonx.solarized`

**Steps (repeat for each theme):**
1. Install theme via Extensions panel or CLI
2. Switch to theme: `Ctrl+K Ctrl+T`
3. Test badges in Cascade TreeView
4. Capture screenshots for all 7 status values
5. Save to theme-specific directory: `screenshots/[theme-name]/`
6. Document observations in `badge-theme-testing.md`

**Expected Outcome:**
- 2-3 custom themes tested total (including One Dark Pro)
- Screenshots captured for each theme
- Observations documented
- Any theme-specific issues identified

**Flexibility:**
- If specific themes have issues, test alternatives
- Focus on popular themes (>1M installs preferred)
- Document theme version and publisher

---

### Task 3: Extract Colors from Screenshots for Contrast Analysis

**Objective:** Prepare color data for contrast ratio calculations

**Steps:**
1. Choose color picker tool:
   - **Option A:** Use online color picker (https://imagecolorpicker.com/)
   - **Option B:** Use browser DevTools (open screenshot, inspect, use eyedropper)
   - **Option C:** Use image editing software (GIMP, Photoshop, Paint.NET)

2. For each screenshot, extract:
   - **Badge icon color** (foreground): RGB or hex value
   - **Background color** (behind badge): RGB or hex value

3. Create color data spreadsheet:
   - Use markdown table in `badge-theme-testing.md`
   - Or create CSV file: `badge-colors.csv`

4. Document color extraction method:
   - Note which tool used
   - Note any challenges or approximations
   - Include color picker screenshots if helpful

**Template for Color Data Table:**
```markdown
## Color Data for Contrast Analysis

### Dark+ Theme
| Status       | Icon Color (Hex) | Background (Hex) | Icon RGB         | Background RGB  |
|--------------|------------------|------------------|------------------|-----------------|
| Not Started  | #858585          | #1E1E1E          | 133, 133, 133    | 30, 30, 30      |
| In Planning  | #DCDCAA          | #1E1E1E          | 220, 220, 170    | 30, 30, 30      |
| Ready        | #4EC9B0          | #1E1E1E          | 78, 201, 176     | 30, 30, 30      |
| In Progress  | #569CD6          | #1E1E1E          | 86, 156, 214     | 30, 30, 30      |
| Blocked      | #F48771          | #1E1E1E          | 244, 135, 113    | 30, 30, 30      |
| Completed    | #73C991          | #1E1E1E          | 115, 201, 145    | 30, 30, 30      |
| Archived     | #858585          | #1E1E1E          | 133, 133, 133    | 30, 30, 30      |
```

**Expected Outcome:**
- Color values extracted for all badges in all tested themes
- Data organized in table format
- Hex and RGB values recorded for accuracy

**Notes:**
- VSCode themes use semi-transparent colors sometimes - sample final rendered color
- Background color may vary by panel (sidebar vs editor)
- Use sidebar background color (where Cascade TreeView appears)

**Tools:**
- Online color picker: https://imagecolorpicker.com/
- Contrast checker (next task): https://webaim.org/resources/contrastchecker/

---

### Task 4: Calculate Contrast Ratios Using WCAG Tool

**Objective:** Compute contrast ratios and verify WCAG AA compliance

**Steps:**
1. Open WCAG contrast checker:
   - Visit: https://webaim.org/resources/contrastchecker/
   - Or use alternative: https://contrastchecker.com/

2. For each badge/theme combination:
   - Enter icon color (foreground) as hex value
   - Enter background color as hex value
   - Tool automatically calculates contrast ratio
   - Record ratio in testing results

3. Verify WCAG AA compliance:
   - WCAG AA standard: 4.5:1 minimum for normal text
   - WCAG AAA standard: 7:1 minimum (stricter, optional)
   - Badge icons are UI components, text is normal size
   - Target: ≥ 4.5:1 for all badges

4. Document results:
   - Add contrast ratio column to color data tables
   - Mark Pass/Fail for WCAG AA (4.5:1 threshold)
   - Note any badges failing to meet standard

**Template for Contrast Ratio Table:**
```markdown
## Contrast Ratio Analysis

### Dark+ Theme
| Status       | Icon Color | Background | Contrast Ratio | WCAG AA (4.5:1) | WCAG AAA (7:1) |
|--------------|------------|------------|----------------|-----------------|----------------|
| Not Started  | #858585    | #1E1E1E    | 5.12:1         | ✅ Pass         | ❌ Fail        |
| In Planning  | #DCDCAA    | #1E1E1E    | 13.45:1        | ✅ Pass         | ✅ Pass        |
| Ready        | #4EC9B0    | #1E1E1E    | 9.87:1         | ✅ Pass         | ✅ Pass        |
| In Progress  | #569CD6    | #1E1E1E    | 8.23:1         | ✅ Pass         | ✅ Pass        |
| Blocked      | #F48771    | #1E1E1E    | 10.56:1        | ✅ Pass         | ✅ Pass        |
| Completed    | #73C991    | #1E1E1E    | 9.12:1         | ✅ Pass         | ✅ Pass        |
| Archived     | #858585    | #1E1E1E    | 5.12:1         | ✅ Pass         | ❌ Fail        |

**Summary:** 7/7 badges pass WCAG AA, 5/7 pass WCAG AAA
```

**Expected Outcome:**
- Contrast ratios calculated for all badges in all themes
- WCAG AA compliance verified (target: 100% pass rate)
- Any failures documented with recommendations

**Notes:**
- Dark themes typically have high contrast (light icons on dark bg)
- Light themes may have lower contrast (dark icons on light bg)
- Custom themes vary widely in contrast quality

**WCAG Standards Reference:**
- WCAG 2.1 Level AA: https://www.w3.org/WAI/WCAG21/quickref/?showtechniques=143#contrast-minimum
- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum (but we target 4.5:1 for text)

---

### Task 5: Identify and Document Theme-Specific Issues

**Objective:** Flag any themes with readability problems or unexpected behavior

**Steps:**
1. Review all testing results:
   - Screenshots from all themes (2-3 custom + 2 default = 4-5 total)
   - Contrast ratio data
   - Readability assessments

2. Identify problematic themes:
   - Any badges failing WCAG AA (contrast < 4.5:1)?
   - Any badges visually difficult to read despite passing contrast?
   - Any themes where icons don't adapt correctly?
   - Any unexpected color choices (e.g., Blocked not red)?

3. Investigate root causes:
   - Is it theme's fault (poor color choices)?
   - Is it VSCode's Codicon system (wrong semantic mapping)?
   - Is it extension's code (incorrect icon choice)?

4. Document findings:
   - Add "Theme-Specific Issues" section to `badge-theme-testing.md`
   - For each issue, note:
     - Theme name and version
     - Badge(s) affected
     - Description of problem
     - Root cause analysis
     - Recommended action (extension fix, theme fix, or accept as-is)

**Example Issue Documentation:**
```markdown
## Theme-Specific Issues

### Issue 1: One Dark Pro - "Not Started" Badge Low Contrast
**Affected:** Not Started status badge
**Theme:** One Dark Pro v3.0.0
**Problem:** Gray circle-outline icon barely visible (contrast ratio: 3.2:1)
**Root Cause:** Theme uses very dark sidebar background (#21252B), standard gray icon too similar
**Impact:** Low - users can still read "Not Started" text, icon just less visible
**Recommendation:** Accept as-is (theme's design choice, not extension's issue)
**Alternative:** User can switch to Light+ or adjust theme colors

### Issue 2: Solarized Light - "Blocked" Badge Color Confusing
**Affected:** Blocked status badge
**Theme:** Solarized Light
**Problem:** Error icon renders as orange-red (Solarized's error color), may be confused with warning
**Root Cause:** Solarized uses orange-red for errors by design (part of palette)
**Impact:** Low - still indicates error/problem, just different shade of red
**Recommendation:** Accept as-is (respecting theme's color palette)
```

**Expected Outcome:**
- All theme-specific issues identified and documented
- Root cause analysis completed
- Recommendations provided (fix, accept, or workaround)
- No critical issues found (all badges at least minimally readable)

**Acceptance Criteria:**
- If any badges fail WCAG AA in default themes (Dark+/Light+), flag as critical
- If badges fail WCAG AA in custom themes only, document as theme limitation
- No issues that require code changes to badge renderer (S81 is correct)

---

### Task 6: Update Testing Results Document with Complete Findings

**Objective:** Finalize `badge-theme-testing.md` with comprehensive results

**Steps:**
1. Consolidate all testing data:
   - Default theme results (from Phase 1)
   - Custom theme results (from this phase)
   - Color data and contrast ratios (Task 3-4)
   - Theme-specific issues (Task 5)

2. Structure document sections:
   - **Executive Summary**: Overall findings, pass/fail summary
   - **Test Environment**: VSCode version, extension version, OS, date
   - **Default Themes**: Dark+ and Light+ results with tables
   - **Custom Themes**: One Dark Pro, Dracula, Solarized results
   - **Contrast Analysis**: Contrast ratio tables for all themes
   - **Theme-Specific Issues**: Documented issues and recommendations
   - **Conclusions**: Overall assessment, WCAG compliance summary
   - **Recommendations**: Any actions needed (likely none)

3. Add executive summary:
```markdown
# Badge Theme Compatibility Testing Results

## Executive Summary

**Test Date:** 2025-10-25
**Extension Version:** 0.1.0
**Themes Tested:** 5 (Dark+, Light+, One Dark Pro, Dracula, Solarized Light)
**Status Badges Tested:** 7 per theme (35 total badge tests)

**WCAG AA Compliance:**
- Dark+ Theme: 7/7 badges pass (100%)
- Light+ Theme: 7/7 badges pass (100%)
- One Dark Pro: 6/7 badges pass (85%)
- Dracula: 7/7 badges pass (100%)
- Solarized Light: 7/7 badges pass (100%)

**Overall Assessment:** ✅ **Excellent**
- Badges readable in all tested themes
- WCAG AA compliance high (96% pass rate across all themes)
- Codicon system works as expected (automatic theme adaptation)
- No code changes required

**Recommendations:**
- Document theme compatibility in README
- Note that custom themes may vary in contrast quality
- Suggest users test with their preferred theme
```

4. Finalize all sections with complete data

5. Proofread document:
   - Fix typos and formatting
   - Verify all screenshots referenced
   - Check all tables complete
   - Ensure conclusions match data

**Expected Outcome:**
- `badge-theme-testing.md` is complete and comprehensive
- All testing data documented
- Executive summary provides quick overview
- Document ready for publication in Phase 3

**File Structure:**
```
vscode-extension/docs/
├── badge-theme-testing.md          # Complete testing results
└── screenshots/
    ├── dark-plus/                   # 7 screenshots
    ├── light-plus/                  # 7 screenshots
    ├── one-dark-pro/                # 7 screenshots
    ├── dracula/                     # 7 screenshots (if tested)
    └── solarized-light/             # 7 screenshots (if tested)
```

**File References:**
- `vscode-extension/docs/badge-theme-testing.md` - Primary deliverable

---

## Completion Criteria

All tasks (1-6) must be completed:
- ✅ One Dark Pro theme tested and documented
- ✅ 1-2 additional custom themes tested
- ✅ Colors extracted from all screenshots
- ✅ Contrast ratios calculated for all badges
- ✅ Theme-specific issues identified and documented
- ✅ Testing results document finalized

**Deliverables Checklist:**
- [ ] Screenshots for 2-3 custom themes (14-21 images)
- [ ] Color data table with hex/RGB values
- [ ] Contrast ratio analysis table (WCAG AA compliance)
- [ ] Theme-specific issues section (may be empty if no issues)
- [ ] Complete `badge-theme-testing.md` document

**Phase Complete When:**
- All custom themes tested and documented
- Contrast ratios calculated and verified
- WCAG AA compliance confirmed (≥ 95% pass rate target)
- No critical accessibility issues found
- Testing results document finalized and ready for publication

**Quality Checks:**
- [ ] At least 2 custom themes tested (One Dark Pro + 1 more)
- [ ] All contrast ratios calculated accurately
- [ ] WCAG AA pass rate ≥ 95% across all themes
- [ ] Any failures documented with clear explanations
- [ ] Document proofread and formatted correctly

## Next Phase

**Phase 3: Documentation and Results Publication**
- Update extension README with theme compatibility section
- Add screenshots to README
- Document badge color meanings and Codicon choices
- Publish testing results
- Close S83 story as Completed
