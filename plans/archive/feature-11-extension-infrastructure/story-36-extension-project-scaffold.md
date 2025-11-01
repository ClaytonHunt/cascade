---
item: S36
title: Extension Project Scaffold
type: story
status: In Progress
priority: High
dependencies: []
estimate: XS
spec: specs/S36-extension-project-scaffold/
created: 2025-10-12
updated: 2025-10-12
---

# S36 - Extension Project Scaffold

## Description

Create the foundational VSCode extension project structure with TypeScript configuration, build tooling, and basic extension lifecycle hooks. This story establishes the minimal viable extension that can activate in VSCode without any functionality.

## Acceptance Criteria

- [ ] Extension project structure created with standard VSCode extension layout
- [ ] `package.json` configured with extension metadata and activation events
- [ ] TypeScript configuration (`tsconfig.json`) set up with appropriate compiler options
- [ ] Build tooling configured (webpack or esbuild for bundling)
- [ ] Basic `extension.ts` with `activate()` and `deactivate()` functions
- [ ] Extension can be loaded in VSCode Extension Development Host
- [ ] Extension activates without errors (empty activation is acceptable)
- [ ] Output channel created for logging extension messages

## Technical Notes

**Project Structure:**
```
vscode-extension/
├── src/
│   └── extension.ts          # Entry point
├── package.json               # Extension manifest
├── tsconfig.json              # TypeScript config
├── webpack.config.js          # Bundler config
└── README.md                  # Extension docs
```

**package.json Key Fields:**
- `name`: `lineage-planning-extension`
- `displayName`: `Lineage Planning & Spec Status`
- `publisher`: TBD
- `engines.vscode`: `^1.80.0` (or latest stable)
- `categories`: `["Other"]`
- `activationEvents`: `["onStartupFinished"]` (will be refined in S37)
- `main`: `./dist/extension.js`

**TypeScript Configuration:**
- `target`: `ES2020`
- `module`: `commonjs`
- `strict`: `true`
- `outDir`: `./dist`
- `rootDir`: `./src`

**Dependencies:**
- `@types/vscode` - VSCode API types
- `@types/node` - Node.js types
- `typescript` - TypeScript compiler
- `webpack` or `esbuild` - Bundler

**Output Channel:**
Create an output channel named "Lineage Planning" for extension logging:
```typescript
const outputChannel = vscode.window.createOutputChannel('Lineage Planning');
outputChannel.appendLine('Extension activated');
```

## Integration Points

- Next story (S37) will add workspace detection logic to `activate()`
- Extension structure will be extended by S38-S40 with watchers, parsers, and cache

## Definition of Done

- Extension project builds without errors (`npm run compile` or equivalent)
- Extension runs in Extension Development Host (F5 in VSCode)
- Extension activates and logs "Extension activated" to output channel
- No runtime errors in extension host
- TypeScript strict mode enabled and passing
