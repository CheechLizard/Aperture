import * as path from 'path';
import { DependencyNode, DependencyEdge, Issue } from './types';

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.lua', '.py', '.go', '.rs'];

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

export function detectArchitectureIssues(
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[],
  codeFileCount: number
): Issue[] {
  const issues: Issue[] = [];

  const cycles = findCycles(nodes);
  for (const cycle of cycles) {
    issues.push({
      ruleId: 'circular-dependency',
      category: 'architecture',
      severity: 'high',
      message: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
      locations: cycle.map(file => ({ file })),
    });
  }

  const nexusImportThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));
  const nexusImportedByThreshold = Math.max(3, Math.floor(codeFileCount * 0.05));

  for (const [filePath, node] of nodes) {
    if (node.imports.length >= nexusImportThreshold && node.importedBy.length >= nexusImportedByThreshold) {
      const importsPct = Math.round((node.imports.length / codeFileCount) * 100);
      const dependentsPct = Math.round((node.importedBy.length / codeFileCount) * 100);
      issues.push({
        ruleId: 'hub-file',
        category: 'architecture',
        severity: 'medium',
        message: `Coupling bottleneck: imports ${node.imports.length} files (${importsPct}%), ${node.importedBy.length} files (${dependentsPct}%) depend on it`,
        locations: [{ file: filePath }],
      });
    }
  }

  for (const [filePath, node] of nodes) {
    if (isCodeFile(filePath) && node.imports.length === 0 && node.importedBy.length === 0) {
      issues.push({
        ruleId: 'orphan-file',
        category: 'architecture',
        severity: 'low',
        message: 'No imports or dependents',
        locations: [{ file: filePath }],
      });
    }
  }

  return issues;
}

function findCycles(nodes: Map<string, DependencyNode>): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function dfs(node: string, nodePath: string[]): void {
    if (recursionStack.has(node)) {
      const cycleStart = nodePath.indexOf(node);
      if (cycleStart !== -1) {
        const cycle = nodePath.slice(cycleStart);
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
    nodePath.push(node);

    const nodeData = nodes.get(node);
    if (nodeData) {
      for (const imp of nodeData.imports) {
        dfs(imp, [...nodePath]);
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
