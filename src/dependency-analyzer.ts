import * as path from 'path';
import { FileInfo, DependencyNode, DependencyEdge, AntiPattern } from './types';
import { resolveImports } from './import-resolver';
import { detectAntiPatterns } from './anti-pattern-detector';

export { ImportDetail, DependencyNode, DependencyEdge, AntiPattern } from './types';

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  edges: DependencyEdge[];
  antiPatterns: AntiPattern[];
}

export let debugInfo: string[] = [];

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.lua', '.py', '.go', '.rs'];

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

export function analyzeDependencies(files: FileInfo[], rootPath: string): DependencyGraph {
  const nodes = new Map<string, DependencyNode>();
  const edges: DependencyEdge[] = [];
  debugInfo = [];

  debugInfo.push(`Root: ${rootPath}`);
  debugInfo.push(`Parser: AST (pre-parsed)`);
  debugInfo.push(`Total files: ${files.length}`);

  const codeFiles = files.filter(f => isCodeFile(f.path));
  debugInfo.push(`Code files: ${codeFiles.length}`);

  // Debug: count raw imports from AST parsing
  const totalRawImports = codeFiles.reduce((sum, f) => sum + f.imports.length, 0);
  debugInfo.push(`Raw imports from AST: ${totalRawImports}`);

  // Debug: count files with parseStatus
  const parsed = files.filter(f => f.parseStatus === 'parsed').length;
  const unsupported = files.filter(f => f.parseStatus === 'unsupported').length;
  const errors = files.filter(f => f.parseStatus === 'error').length;
  debugInfo.push(`Parse status: ${parsed} parsed, ${unsupported} unsupported, ${errors} errors`);

  // Initialize nodes for all files
  for (const file of files) {
    nodes.set(file.path, {
      path: file.path,
      imports: [],
      importedBy: [],
      importDetails: [],
    });
  }

  // Process pre-parsed imports for each code file
  for (const file of codeFiles) {
    if (file.imports.length === 0) continue;

    const resolvedDetails = resolveImports(file.imports, file.path, files);

    if (resolvedDetails.length > 0) {
      debugInfo.push(`${file.path}: ${file.imports.length} raw -> ${resolvedDetails.length} resolved`);
    }

    const node = nodes.get(file.path)!;
    node.imports = resolvedDetails.map(r => r.targetPath);
    node.importDetails = resolvedDetails;

    for (const detail of resolvedDetails) {
      edges.push({
        from: file.path,
        to: detail.targetPath,
        line: detail.line,
        code: detail.code,
      });

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
