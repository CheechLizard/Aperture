# CLAUDE.md

Rules and patterns for AI agents working on this codebase.

For what this project is, see `README.md`. For design intent, see `../Specs/AI_Partner_Programming_Toolkit_PRD.md`.

## Essential Commands

```bash
# Development
npm install              # Install dependencies
npm run bundle           # Bundle extension to dist/ (REQUIRED for VS Code to load changes)
npm run compile          # Type-check only (outputs to out/, not loaded by VS Code)

# Testing
F5 in VSCode             # Launch extension in debug mode
Developer: Reload Window # Reload after bundling to pick up changes
```

**Critical**: VS Code loads `dist/extension.js`. Always use `npm run bundle` after changes.

## Architecture Rules

### Data Flow (Never Break)

Scanner produces data. Webview consumes it. No tight coupling.

```
Scanner Module → ProjectData (JSON) → Webview Renderer → D3 Visualizations
```

| Module | Responsibility |
|--------|----------------|
| Scanner | Traverse files, extract metrics, output JSON |
| Data Model | TypeScript interfaces for files, functions, languages |
| Webview | Receive data via postMessage, render D3 visualizations |
| Commands | Trigger scan, open panels, navigate to files |

All visualization data flows through `ProjectData` JSON. Scanner never touches rendering. Webview never touches file system.

See `../Specs/AI_Partner_Programming_Toolkit_PRD.md` for data model definitions.

### Code Standards

1. **Keep functions short.** ~20 lines is a guideline—if longer, check it's still single-purpose.
2. **No duplicate values.** One source of truth.
3. **No magic numbers.** All values are named constants.
4. **No reinventing.** Search before creating utilities.
5. **No silent failures.** Fail fast and loud.
6. **Name for behavior.** Name things for what they do, not what they were intended to do.
7. **Separate concerns.** Scanner, data model, and rendering go in distinct files.
8. **Match patterns.** Check existing code before inventing new approaches.

### File Rules

- Files stay under 200 lines. Split when approaching.
- One responsibility per file.

### Naming

- Functions: camelCase verbs (`scanWorkspace`, `extractFunctions`, `renderTreemap`)
- Types/Interfaces: PascalCase (`ProjectData`, `FileInfo`, `FunctionInfo`)
- Constants: UPPER_SNAKE_CASE (`DEFAULT_FILE_THRESHOLD`, `MAX_FUNCTION_LINES`)
- Files: kebab-case (`project-scanner.ts`, `treemap-view.ts`)
- Booleans: questions (`isScanning`, `hasErrors`, `canNavigate`)

### Comments

- No "what" comments. Fix unclear code instead.
- Rare "why" comments only for non-obvious logic.
- Never comment out code. Delete it.
