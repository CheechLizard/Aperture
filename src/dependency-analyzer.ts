import * as fs from 'fs';
import * as path from 'path';
import { FileInfo, ImportInfo } from './types';
import { extractImportsAST, isParserReady } from './tree-sitter-parser';

export interface ImportDetail {
  targetPath: string;
  line: number;
  code: string;
}

export interface DependencyEdge {
  from: string;
  to: string;
  line: number;
  code: string;
}

export interface DependencyNode {
  path: string;
  imports: string[];
  importedBy: string[];
  importDetails: ImportDetail[];
}

export interface AntiPattern {
  type: 'circular' | 'nexus' | 'orphan' | 'hub';
  severity: 'high' | 'medium' | 'low';
  description: string;
  files: string[];
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  antiPatterns: AntiPattern[];
}

// Store debug info for UI display
export let debugInfo: string[] = [];

export function analyzeDependencies(files: FileInfo[], rootPath: string): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  debugInfo = [];

  debugInfo.push(`Root: ${rootPath}`);
  debugInfo.push(`Parser: ${isParserReady() ? 'tree-sitter (AST)' : 'regex (fallback)'}`);
  debugInfo.push(`Total files: ${files.length}`);

  const codeFiles = files.filter(f => isCodeFile(f.path));
  debugInfo.push(`Code files: ${codeFiles.length}`);
  debugInfo.push(`First 3: ${codeFiles.slice(0, 3).map(f => f.path).join(', ')}`);

  // Initialize nodes
  for (const file of files) {
    nodes.set(file.path, {
      path: file.path,
      imports: [],
      importedBy: [],
      importDetails: [],
    });
  }

  // Parse imports for each file
  for (const file of codeFiles) {
    const fullPath = path.join(rootPath, file.path);
    const { rawImports, resolvedDetails } = parseImportsDebug(fullPath, file.path, files);

    if (rawImports.length > 0) {
      debugInfo.push(`${file.path}: raw=[${rawImports.slice(0, 3).map(r => r.modulePath).join(',')}] resolved=[${resolvedDetails.map(r => r.targetPath).join(',')}]`);
    }

    const node = nodes.get(file.path)!;
    node.imports = resolvedDetails.map(r => r.targetPath);
    node.importDetails = resolvedDetails;

    for (const detail of resolvedDetails) {
      edges.push({ from: file.path, to: detail.targetPath, line: detail.line, code: detail.code });
      const targetNode = nodes.get(detail.targetPath);
      if (targetNode) {
        targetNode.importedBy.push(file.path);
      }
    }
  }

  debugInfo.push(`Total edges: ${edges.length}`);
  const antiPatterns = detectAntiPatterns(nodes, edges, codeFiles.length);

  return { nodes, edges, antiPatterns };
}

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.lua', '.py', '.go', '.rs'].includes(ext);
}

function parseImportsDebug(fullPath: string, relativePath: string, allFiles: FileInfo[]): { rawImports: ImportInfo[], resolvedDetails: ImportDetail[] } {
  let content: string;
  try {
    content = fs.readFileSync(fullPath, 'utf8');
  } catch (e) {
    debugInfo.push(`FAIL read ${fullPath}: ${e}`);
    return { rawImports: [], resolvedDetails: [] };
  }

  const rawImports = extractImportsAST(content, relativePath);
  const resolvedDetails: ImportDetail[] = [];
  const seenPaths = new Set<string>();
  const fileDir = path.dirname(relativePath);
  const ext = path.extname(relativePath).toLowerCase();

  const langType = ext === '.lua' ? 'lua' : ext === '.py' ? 'py' : ext === '.go' ? 'go' : ext === '.rs' ? 'rs' : 'js';
  for (const importInfo of rawImports) {
    const resolvedPath = resolveImport(importInfo.modulePath, fileDir, allFiles, langType, relativePath);
    if (resolvedPath && resolvedPath !== relativePath && !seenPaths.has(resolvedPath)) {
      // Exclude self-imports and duplicates
      seenPaths.add(resolvedPath);
      resolvedDetails.push({
        targetPath: resolvedPath,
        line: importInfo.line,
        code: importInfo.code,
      });
    } else if (langType === 'lua' && rawImports.length <= 5 && !resolvedPath) {
      // Debug: show what paths we tried for unresolved Lua imports
      const luaPath = importInfo.modulePath.replace(/\./g, '/');
      const candidates = allFiles.filter(f => f.path.includes(luaPath.split('/').pop()!) && f.path !== relativePath).slice(0, 2);
      debugInfo.push(`  UNRESOLVED: "${importInfo.modulePath}" -> tried "${luaPath}.lua", candidates: [${candidates.map(c => c.path).join(', ')}]`);
    }
  }

  return { rawImports, resolvedDetails };
}

function resolveImport(importPath: string, fromDir: string, allFiles: FileInfo[], langType: 'lua' | 'py' | 'go' | 'rs' | 'js' = 'js', selfPath?: string): string | null {
  if (langType === 'lua') {
    // Lua modules use dot notation: "editor.utils" → "editor/utils.lua"
    const luaPath = importPath.replace(/\./g, '/');
    const luaExtensions = ['.lua', '/init.lua'];

    // Try from project root first (most common in Lua)
    for (const ext of luaExtensions) {
      const tryPath = luaPath + ext;
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
    }

    // Try relative to current file
    for (const ext of luaExtensions) {
      const tryPath = path.normalize(path.join(fromDir, luaPath)) + ext;
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
    }

    // Fuzzy match: find file ending with the path (handles different root structures)
    const endPattern = '/' + luaPath + '.lua';
    const endMatch = allFiles.find(f => (f.path.endsWith(endPattern) || f.path === luaPath + '.lua') && f.path !== selfPath);
    if (endMatch) {
      return endMatch.path;
    }

    // Try with common game engine prefixes
    const prefixes = ['game/', 'src/', 'lib/', 'scripts/'];
    for (const prefix of prefixes) {
      for (const ext of luaExtensions) {
        const tryPath = prefix + luaPath + ext;
        if (allFiles.some(f => f.path === tryPath)) {
          return tryPath;
        }
      }
    }

    // Try from parent directories of importing file
    const parts = fromDir.split('/');
    for (let i = 0; i < parts.length; i++) {
      const parentPath = parts.slice(0, i + 1).join('/');
      for (const ext of luaExtensions) {
        const tryPath = parentPath ? parentPath + '/' + luaPath + ext : luaPath + ext;
        if (allFiles.some(f => f.path === tryPath)) {
          return tryPath;
        }
      }
    }

    return null;
  }

  if (langType === 'py') {
    // Python: Handle relative imports (., ..)
    let pyPath = importPath;
    let searchDir = '';

    if (pyPath.startsWith('..')) {
      searchDir = path.dirname(fromDir);
      pyPath = pyPath.slice(2);
    } else if (pyPath.startsWith('.')) {
      searchDir = fromDir;
      pyPath = pyPath.slice(1);
    }

    // Convert dots to slashes
    const modulePath = pyPath.replace(/\./g, '/');
    const pyExtensions = ['.py', '/__init__.py'];

    // Try relative path first if it was a relative import
    if (searchDir) {
      for (const ext of pyExtensions) {
        const tryPath = path.normalize(path.join(searchDir, modulePath)) + ext;
        if (allFiles.some(f => f.path === tryPath)) {
          return tryPath;
        }
      }
    }

    // Try from project root
    for (const ext of pyExtensions) {
      const tryPath = modulePath + ext;
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
    }
    return null;
  }

  if (langType === 'go') {
    // Go: imports are relative to module root, skip standard library
    // Local imports typically start with ./ or the module name
    if (importPath.startsWith('./') || importPath.startsWith('../')) {
      const goPath = importPath.replace(/^\.\//, '');
      const tryPath = path.normalize(path.join(fromDir, goPath)) + '.go';
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
      // Try as directory with same-name file
      const dirPath = path.normalize(path.join(fromDir, goPath));
      const dirFile = allFiles.find(f => f.path.startsWith(dirPath + '/') && f.path.endsWith('.go'));
      if (dirFile) {
        return dirFile.path;
      }
    }
    // Try as package path from root
    const pkgPath = importPath.split('/').pop() + '.go';
    const matches = allFiles.filter(f => f.path.endsWith('/' + pkgPath) || f.path === pkgPath);
    if (matches.length === 1) {
      return matches[0].path;
    }
    return null;
  }

  if (langType === 'rs') {
    // Rust: mod declarations and use statements
    if (importPath.startsWith('mod:')) {
      // mod name; -> look for name.rs or name/mod.rs
      const modName = importPath.slice(4);
      const tryPaths = [
        path.normalize(path.join(fromDir, modName + '.rs')),
        path.normalize(path.join(fromDir, modName, 'mod.rs')),
      ];
      for (const tryPath of tryPaths) {
        if (allFiles.some(f => f.path === tryPath)) {
          return tryPath;
        }
      }
    } else if (importPath.startsWith('crate::')) {
      // use crate::path -> from src root
      const rustPath = importPath.slice(7).replace(/::/g, '/');
      const tryPaths = [rustPath + '.rs', 'src/' + rustPath + '.rs', rustPath + '/mod.rs', 'src/' + rustPath + '/mod.rs'];
      for (const tryPath of tryPaths) {
        if (allFiles.some(f => f.path === tryPath)) {
          return tryPath;
        }
      }
    } else if (importPath.startsWith('super::')) {
      // use super::path -> parent directory
      const rustPath = importPath.slice(7).replace(/::/g, '/');
      const parentDir = path.dirname(fromDir);
      const tryPath = path.normalize(path.join(parentDir, rustPath)) + '.rs';
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
    } else if (importPath.startsWith('self::')) {
      // use self::path -> same directory
      const rustPath = importPath.slice(6).replace(/::/g, '/');
      const tryPath = path.normalize(path.join(fromDir, rustPath)) + '.rs';
      if (allFiles.some(f => f.path === tryPath)) {
        return tryPath;
      }
    }
    return null;
  }

  // JS/TS: Skip external packages
  if (!importPath.startsWith('.') && !importPath.startsWith('/')) {
    return null;
  }

  // Resolve relative path
  let resolved = path.normalize(path.join(fromDir, importPath));

  // Try with extensions
  const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.js'];
  for (const ext of extensions) {
    const tryPath = resolved + ext;
    if (allFiles.some(f => f.path === tryPath)) {
      return tryPath;
    }
  }

  return null;
}

function detectAntiPatterns(nodes: Map<string, DependencyNode>, edges: DependencyEdge[], codeFileCount: number): AntiPattern[] {
  const antiPatterns: AntiPattern[] = [];

  // Detect circular dependencies
  const cycles = findCycles(nodes);
  for (const cycle of cycles) {
    antiPatterns.push({
      type: 'circular',
      severity: 'high',
      description: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
      files: cycle,
    });
  }

  // Detect nexus files (both imports many AND imported by many) - true coupling problem
  // A file that has high traffic in both directions is a coupling bottleneck
  const nexusImportThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));
  const nexusImportedByThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));
  for (const [filePath, node] of nodes) {
    if (node.imports.length >= nexusImportThreshold && node.importedBy.length >= nexusImportedByThreshold) {
      const importsPct = Math.round((node.imports.length / codeFileCount) * 100);
      const dependentsPct = Math.round((node.importedBy.length / codeFileCount) * 100);
      antiPatterns.push({
        type: 'nexus',
        severity: 'medium',
        description: `Coupling bottleneck: imports ${node.imports.length} files (${importsPct}%), ${node.importedBy.length} files (${dependentsPct}%) depend on it`,
        files: [filePath],
      });
    }
  }

  // Detect hub files (imports too many things) - 10% of codebase, min 5
  // Note: only flag as hub if not already flagged as nexus (nexus is more specific)
  const hubThreshold = Math.max(5, Math.floor(codeFileCount * 0.10));
  for (const [filePath, node] of nodes) {
    const isNexus = node.imports.length >= nexusImportThreshold && node.importedBy.length >= nexusImportedByThreshold;
    if (node.imports.length >= hubThreshold && !isNexus) {
      const pct = Math.round((node.imports.length / codeFileCount) * 100);
      antiPatterns.push({
        type: 'hub',
        severity: 'low',
        description: `Imports ${node.imports.length} files (${pct}% of codebase)`,
        files: [filePath],
      });
    }
  }

  // Detect orphan files (no connections)
  for (const [filePath, node] of nodes) {
    if (isCodeFile(filePath) && node.imports.length === 0 && node.importedBy.length === 0) {
      antiPatterns.push({
        type: 'orphan',
        severity: 'low',
        description: 'No imports or dependents',
        files: [filePath],
      });
    }
  }

  return antiPatterns;
}

function findCycles(nodes: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, path: string[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = path.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = path.slice(cycleStart);
        // Only add if we haven't seen this cycle before
        const cycleKey = [...cycle].sort().join('|');
        if (!cycles.some(c => [...c].sort().join('|') === cycleKey)) {
          cycles.push(cycle);
        }
      }
      return;
    }

    if (visited.has(node)) return;

    visited.add(node);
    recursionStack.add(node);
    path.push(node);

    const nodeData = nodes.get(node);
    if (nodeData) {
      for (const imp of nodeData.imports) {
        dfs(imp, [...path]);
      }
    }

    recursionStack.delete(node);
  }

  for (const node of nodes.keys()) {
    if (!visited.has(node)) {
      dfs(node, []);
    }
  }

  return cycles;
}
