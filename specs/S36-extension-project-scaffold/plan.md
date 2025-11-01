---
spec: S36
title: Extension Project Scaffold
type: spec
status: Completed
priority: High
phases: 3
created: 2025-10-12
updated: 2025-10-12
---

# S36 - Extension Project Scaffold

## Implementation Strategy

Create a VSCode extension project from scratch with industry-standard tooling and configuration. The extension will serve as the foundation for the Lineage Planning & Spec Status Extension (Epic E3), providing workspace activation, file watching, and frontmatter parsing capabilities in subsequent stories.

This implementation follows a three-phase approach:
1. **Project Initialization** - Create directory structure, package.json, and install dependencies
2. **TypeScript Configuration** - Set up TypeScript compiler and build tooling (esbuild for fast builds)
3. **Extension Entry Point** - Implement basic activate/deactivate lifecycle with output channel logging

## Architecture Decisions

### Build Tool: esbuild vs webpack
**Decision: Use esbuild**
- Faster build times (10-100x faster than webpack for this use case)
- Simpler configuration (single esbuild.js file vs complex webpack.config.js)
- Native TypeScript support without additional loaders
- VSCode extension best practices recommend esbuild for new extensions (as of 2024)
- Reference: https://code.visualstudio.com/api/working-with-extensions/bundling-extension

### TypeScript Configuration
**Target: ES2020**
- Supports modern JavaScript features (optional chaining, nullish coalescing, etc.)
- Compatible with VSCode's minimum Node.js version (Node 16+)
- Balances modern syntax with broad compatibility

**Module System: CommonJS**
- Required by VSCode extension host (uses Node.js require() system)
- ESM support is experimental in VSCode extensions
- Reference: https://code.visualstudio.com/api/advanced-topics/extension-host

### Project Location
**Directory: `vscode-extension/` at workspace root**
- Separate from Godot project files (avoids Godot import/scan confusion)
- Co-located with main project (easier to reference plans/ and specs/ directories)
- Not nested in addons/ (this is VSCode tooling, not Godot addon)

### Activation Events
**Initial: `onStartupFinished`**
- Extension activates after VSCode startup completes (low priority)
- S37 will refine to use workspace-specific activation events
- Reference: https://code.visualstudio.com/api/references/activation-events

## Key Integration Points

1. **Workspace Structure**
   - Extension will live in `D:\projects\lineage\vscode-extension\`
   - Needs access to `D:\projects\lineage\plans\` and `D:\projects\lineage\specs\` for future features
   - Git repository remains at workspace root (extension is part of Lineage project)

2. **Output Channel**
   - Named "Lineage Planning" for consistency with extension display name
   - Used for debugging and status messages throughout all features (F11-F15)
   - Accessible via View → Output → "Lineage Planning" in VSCode

3. **Future Story Dependencies**
   - S37 (Workspace Activation) will modify `activate()` function
   - S38 (File System Watcher) will add watcher initialization in `activate()`
   - S39 (YAML Parser) will be imported as utility module
   - S40 (Cache Layer) will be initialized in `activate()`

## Risk Assessment

### Low Risks (Mitigated)
- **TypeScript compilation errors**: Strict mode catches issues early; common VSCode patterns are well-documented
- **Extension activation failures**: Minimal activation logic reduces failure surface; extensive logging for debugging

### Medium Risks (Monitoring Required)
- **Build configuration complexity**: esbuild simplifies this vs webpack, but still requires correct output format
  - **Mitigation**: Follow VSCode extension samples for esbuild configuration
  - **Reference**: https://github.com/microsoft/vscode-extension-samples

### No High Risks Identified
This is a foundational scaffold with well-established patterns and minimal custom logic.

## Codebase Analysis Summary

### Existing Project Context
- **Project type**: Godot 4.4 RPG game with custom testing system addon
- **Repository**: Git repository at `D:\projects\lineage\` (Windows environment)
- **Node.js environment**: Node v22.18.0, npm 10.9.0 (available and compatible)
- **Existing TypeScript project**: `Godot-MCP/server/` uses TypeScript with similar setup
  - Can reference tsconfig.json structure
  - Uses strict mode, ESNext modules
  - Builds to dist/ directory

### Files to Create (New Extension Project)
```
vscode-extension/
├── src/
│   └── extension.ts          # Entry point (NEW)
├── .vscode/
│   ├── launch.json            # Debug configuration (NEW)
│   └── tasks.json             # Build task configuration (NEW)
├── .vscodeignore              # Extension packaging exclusions (NEW)
├── package.json               # Extension manifest (NEW)
├── tsconfig.json              # TypeScript config (NEW)
├── esbuild.js                 # Build script (NEW)
├── .gitignore                 # Node/build ignores (NEW)
└── README.md                  # Extension documentation (NEW)
```

### External Dependencies
**Runtime Dependencies:**
- None for this phase (pure VSCode API usage)

**Development Dependencies:**
- `@types/vscode` ^1.80.0 - VSCode API TypeScript definitions
- `@types/node` ^20.0.0 - Node.js TypeScript definitions
- `typescript` ^5.0.0 - TypeScript compiler
- `esbuild` ^0.19.0 - Fast JavaScript bundler
- `@vscode/vsce` ^2.21.0 - Extension packaging tool (for future publishing)

### VSCode APIs Used
- `vscode.window.createOutputChannel()` - Create output panel for logging
- Activation lifecycle: `activate(context: vscode.ExtensionContext)` and `deactivate()`
- Extension context subscriptions for cleanup

**API Documentation**: https://code.visualstudio.com/api/references/vscode-api

## Phase Overview

### Phase 1: Project Initialization
**Goal**: Create directory structure and package.json with correct extension metadata

**Key Tasks**:
- Create `vscode-extension/` directory
- Initialize npm package with extension-specific fields
- Install development dependencies
- Create .gitignore and .vscodeignore files

**Deliverable**: Valid extension package that can be loaded by VSCode (even if it does nothing yet)

### Phase 2: TypeScript Configuration
**Goal**: Configure TypeScript compiler and esbuild bundler for VSCode extension format

**Key Tasks**:
- Create tsconfig.json with CommonJS output and strict mode
- Create esbuild.js build script
- Configure VSCode tasks.json for build automation
- Add build scripts to package.json

**Deliverable**: TypeScript code compiles to dist/extension.js that VSCode can load

### Phase 3: Extension Entry Point
**Goal**: Implement minimal activate/deactivate functions with output channel logging

**Key Tasks**:
- Create src/extension.ts with lifecycle functions
- Initialize output channel named "Lineage Planning"
- Log activation message
- Configure launch.json for Extension Development Host debugging
- Test extension activation in VSCode

**Deliverable**: Extension activates successfully, logs message to output channel, and can be debugged

## Testing Strategy

### Manual Testing (All Phases)
1. **Build verification**: Run `npm run compile` - should complete without errors
2. **Extension packaging**: Run `npm run package` - should create .vsix file
3. **Extension installation**: Run `code --install-extension [extension-name].vsix --force`
4. **Activation verification**: Reload window, check Output Channel for activation message
5. **No errors**: Check Output Channel for any runtime errors

### Validation Checklist
- [ ] TypeScript compiles with strict mode (no errors)
- [ ] Extension packages to .vsix file
- [ ] Extension installs locally without errors
- [ ] Output channel appears in View → Output after reload
- [ ] Activation message logged in Output Channel
- [ ] No errors in Output Channel
- [ ] Extension deactivates cleanly when closing VSCode

## Next Steps After Completion

Once S36 is complete, the extension scaffold will be ready for:
1. **S37 - Workspace Activation Logic**: Add directory detection in `activate()`
2. **S39 - YAML Frontmatter Parser**: Create utility module in `src/parser.ts`
3. **S38 - File System Watcher**: Add watcher initialization after workspace validation

**Recommended implementation order**: S36 → S37 → S39 → S38 → S40 (allows testing parser independently before adding file watching complexity)
