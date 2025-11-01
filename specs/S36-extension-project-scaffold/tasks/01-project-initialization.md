---
spec: S36
phase: 1
title: Project Initialization
status: Completed
priority: High
created: 2025-10-12
updated: 2025-10-12
---

# Phase 1: Project Initialization

## Overview

Create the foundational directory structure and package.json for the VSCode extension. This phase establishes the npm project with correct extension metadata, installs development dependencies, and configures file exclusions for git and extension packaging.

## Prerequisites

- Node.js v16+ and npm installed (verified: Node v22.18.0, npm 10.9.0)
- VSCode installed with Extension Development capabilities
- Working directory: `D:\projects\lineage\`

## Tasks

### Task 1: Create Extension Directory

Create the extension project directory at workspace root.

```bash
cd D:\projects\lineage
mkdir vscode-extension
cd vscode-extension
```

**Expected Outcome**: Directory `D:\projects\lineage\vscode-extension\` exists

**Validation**: Run `pwd` (Git Bash) or `cd` (cmd) - should show `D:\projects\lineage\vscode-extension`

---

### Task 2: Initialize npm Package

Initialize npm package with extension-specific configuration.

```bash
npm init -y
```

This creates a default `package.json`. We'll replace it with extension-specific metadata in the next task.

**Expected Outcome**: File `package.json` created with default npm metadata

---

### Task 3: Create Extension package.json

Replace the default package.json with VSCode extension manifest.

**File**: `vscode-extension/package.json`

```json
{
  "name": "lineage-planning-extension",
  "displayName": "Lineage Planning & Spec Status",
  "description": "Visual status tracking for planning and specification system",
  "version": "0.1.0",
  "publisher": "lineage",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/lineage"
  },
  "engines": {
    "vscode": "^1.80.0"
  },
  "categories": [
    "Other"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./dist/extension.js",
  "scripts": {
    "compile": "node esbuild.js",
    "watch": "node esbuild.js --watch",
    "package": "vsce package"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/vscode": "^1.80.0",
    "@vscode/vsce": "^2.21.0",
    "esbuild": "^0.19.0",
    "typescript": "^5.0.0"
  }
}
```

**Key Fields Explained**:
- `name`: Package identifier (lowercase, no spaces)
- `displayName`: Human-readable name shown in VSCode Extensions panel
- `publisher`: Publisher ID (placeholder, can be updated later)
- `engines.vscode`: Minimum VSCode version (^1.80.0 = July 2023 or later)
- `activationEvents`: When extension activates (`onStartupFinished` = after VSCode loads)
- `main`: Entry point after bundling (dist/extension.js)

**Expected Outcome**: Extension manifest with correct VSCode-specific fields

**Validation**: Run `npm pkg get name displayName` - should output extension name

**References**:
- Extension Manifest: https://code.visualstudio.com/api/references/extension-manifest
- Activation Events: https://code.visualstudio.com/api/references/activation-events

---

### Task 4: Install Development Dependencies

Install TypeScript, esbuild, and VSCode types.

```bash
npm install
```

This installs all `devDependencies` listed in package.json:
- `@types/vscode` - VSCode API TypeScript definitions
- `@types/node` - Node.js TypeScript definitions
- `typescript` - TypeScript compiler
- `esbuild` - Fast bundler
- `@vscode/vsce` - Extension packaging tool

**Expected Outcome**:
- `node_modules/` directory created with dependencies
- `package-lock.json` generated

**Validation**: Run `npm list --depth=0` - should show 5 devDependencies installed

**Note**: This may take 30-60 seconds depending on network speed.

---

### Task 5: Create .gitignore

Configure git to ignore build artifacts and dependencies.

**File**: `vscode-extension/.gitignore`

```gitignore
# Build output
dist/
out/

# Dependencies
node_modules/

# VSCode
.vscode-test/

# Extension packaging
*.vsix

# OS
.DS_Store
Thumbs.db
```

**Expected Outcome**: Git ignores node_modules and build directories

**Validation**: Run `git status` in workspace root - should not show node_modules/

---

### Task 6: Create .vscodeignore

Configure extension packaging to exclude unnecessary files.

**File**: `vscode-extension/.vscodeignore`

```
# Source files (only bundle dist/ into .vsix)
src/**
esbuild.js
tsconfig.json

# Development files
node_modules/**
.vscode/**
.vscode-test/**

# Build artifacts
*.map

# Git
.git
.gitignore

# Documentation (include README.md but exclude others)
CHANGELOG.md
```

**Expected Outcome**: Extension package (.vsix) will only include dist/ and package.json

**Note**: This file is used by `vsce package` command (not needed until publishing, but good practice to set up early)

**References**:
- Publishing Extensions: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

---

### Task 7: Create src/ Directory

Create source directory for TypeScript files.

```bash
mkdir src
```

**Expected Outcome**: Directory `vscode-extension/src/` exists (empty for now)

**Note**: The actual extension.ts file will be created in Phase 3. This task just sets up the structure.

---

### Task 8: Verify Directory Structure

Confirm the project structure matches the expected layout.

```bash
ls -R
```

**Expected Structure**:
```
vscode-extension/
├── src/                    # Source directory (empty)
├── node_modules/           # Dependencies (many files)
├── .gitignore              # Git exclusions
├── .vscodeignore           # Extension packaging exclusions
├── package.json            # Extension manifest
└── package-lock.json       # Dependency lock file
```

**Validation**: Run `ls -la` - should show all listed files/directories

---

## Completion Criteria

- [x] Directory `vscode-extension/` exists at workspace root
- [x] File `package.json` contains valid extension manifest with:
  - `name`: `lineage-planning-extension`
  - `engines.vscode`: `^1.80.0`
  - `activationEvents`: `["onStartupFinished"]`
  - `main`: `./dist/extension.js`
- [x] All devDependencies installed (node_modules/ populated)
- [x] File `.gitignore` excludes node_modules/ and dist/
- [x] File `.vscodeignore` excludes source and development files
- [x] Directory `src/` exists (empty)
- [x] No errors during npm install

## Troubleshooting

**Issue**: `npm install` fails with network error
- **Solution**: Check internet connection, try `npm install --registry https://registry.npmjs.org/`

**Issue**: Permission denied creating directory
- **Solution**: Ensure you have write permissions to `D:\projects\lineage\`

**Issue**: Git shows node_modules/ in status
- **Solution**: Verify `.gitignore` file exists and contains `node_modules/`

## Next Phase

Proceed to **Phase 2: TypeScript Configuration** to set up the compiler and build tooling.

Phase 2 will create:
- `tsconfig.json` - TypeScript compiler configuration
- `esbuild.js` - Build script
- `.vscode/tasks.json` - VSCode build task integration
