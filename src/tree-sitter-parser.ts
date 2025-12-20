import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { ImportInfo } from './types';

let parser: TreeSitter.Parser | null = null;
let luaLanguage: TreeSitter.Language | null = null;
let initPromise: Promise<void> | null = null;

/**
 * Initialize tree-sitter parser with language grammars.
 * Must be called before extractImportsAST.
 * @param wasmDir Directory containing WASM files (tree-sitter runtime + language grammars)
 */
export async function initParser(wasmDir: string): Promise<void> {
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async () => {
    // Initialize tree-sitter runtime
    await TreeSitter.Parser.init({
      locateFile: (scriptName: string) => path.join(wasmDir, scriptName),
    });

    parser = new TreeSitter.Parser();

    // Load Lua grammar
    const luaWasmPath = path.join(wasmDir, 'tree-sitter-lua.wasm');
    luaLanguage = await TreeSitter.Language.load(luaWasmPath);
  })();

  return initPromise;
}

/**
 * Check if parser is initialized
 */
export function isParserReady(): boolean {
  return parser !== null && luaLanguage !== null;
}

/**
 * Extract imports from source code using AST parsing.
 * Falls back to regex for unsupported languages.
 * Returns ImportInfo with line numbers and code snippets.
 */
export function extractImportsAST(content: string, filePath: string): ImportInfo[] {
  const ext = path.extname(filePath).toLowerCase();
  const lines = content.split('\n');

  if (ext === '.lua' && parser && luaLanguage) {
    return extractLuaRequires(content, lines);
  }

  // Fall back to regex for unsupported languages
  return extractImportsRegex(content, filePath, lines);
}

/**
 * Extract Lua require() calls using tree-sitter AST
 */
function extractLuaRequires(content: string, lines: string[]): ImportInfo[] {
  if (!parser || !luaLanguage) {
    return [];
  }

  parser.setLanguage(luaLanguage);
  const tree = parser.parse(content);
  if (!tree) {
    return [];
  }
  const imports: ImportInfo[] = [];

  // Walk the tree to find function calls named "require"
  function walk(node: TreeSitter.Node): void {
    if (node.type === 'function_call') {
      // Check if it's a require call
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.text === 'require') {
        // Get the argument
        const argsNode = node.childForFieldName('arguments');
        if (argsNode) {
          // Find string argument
          for (let i = 0; i < argsNode.childCount; i++) {
            const child = argsNode.child(i);
            if (child && child.type === 'string') {
              // Extract string content (remove quotes)
              const raw = child.text;
              const lineNum = node.startPosition.row + 1;
              let modulePath: string;
              // Handle both 'string' and "string" and [[string]]
              if (raw.startsWith('[[') && raw.endsWith(']]')) {
                modulePath = raw.slice(2, -2);
              } else if (raw.length >= 2) {
                modulePath = raw.slice(1, -1);
              } else {
                continue;
              }
              imports.push({
                modulePath,
                line: lineNum,
                code: lines[lineNum - 1]?.trim() || '',
              });
            }
          }
        }
      }
    }

    // Recurse into children
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        walk(child);
      }
    }
  }

  walk(tree.rootNode);
  return imports;
}

/**
 * Get line number from character position in content
 */
function getLineNumber(content: string, position: number): number {
  return content.substring(0, position).split('\n').length;
}

/**
 * Fallback regex-based import extraction for non-Lua files
 */
function extractImportsRegex(content: string, filePath: string, lines: string[]): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const ext = path.extname(filePath).toLowerCase();
  let match;

  if (ext === '.py') {
    // Python: from module import thing  OR  from module.sub import thing
    const fromImport = /^from\s+(\.{0,2}[\w.]+)\s+import/gm;
    while ((match = fromImport.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
    // Python: import module  OR  import module.sub
    const directImport = /^import\s+([\w.]+)/gm;
    while ((match = directImport.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
  } else if (ext === '.go') {
    // Go: import "path" or import ( "path1" "path2" )
    const singleImport = /import\s+"([^"]+)"/g;
    while ((match = singleImport.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
    // Multi-line import block - track individual line positions
    const blockImport = /import\s*\(([^)]+)\)/gs;
    while ((match = blockImport.exec(content)) !== null) {
      const blockStart = match.index;
      const block = match[1];
      const pkgPattern = /"([^"]+)"/g;
      let pkgMatch;
      while ((pkgMatch = pkgPattern.exec(block)) !== null) {
        const lineNum = getLineNumber(content, blockStart + pkgMatch.index);
        imports.push({ modulePath: pkgMatch[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
      }
    }
  } else if (ext === '.rs') {
    // Rust: mod name; (declares submodule)
    const modDecl = /^mod\s+(\w+)\s*;/gm;
    while ((match = modDecl.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: `mod:${match[1]}`, line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
    // Rust: use crate::path or use super::path or use self::path
    const useStmt = /^use\s+((?:crate|super|self)(?:::\w+)+)/gm;
    while ((match = useStmt.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
  } else {
    // TypeScript/JavaScript: from 'path' or from "path"
    const fromPattern = /from\s+['"]([^'"]+)['"]/g;
    while ((match = fromPattern.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }

    // CommonJS: require('path') or require("path")
    const requirePattern = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
    while ((match = requirePattern.exec(content)) !== null) {
      const lineNum = getLineNumber(content, match.index);
      imports.push({ modulePath: match[1], line: lineNum, code: lines[lineNum - 1]?.trim() || '' });
    }
  }

  return imports;
}
