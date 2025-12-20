import * as path from 'path';
import { DependencyNode, DependencyEdge, AntiPattern } from './types';

const CODE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.lua', '.py', '.go', '.rs'];

function isCodeFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return CODE_EXTENSIONS.includes(ext);
}

export function detectAntiPatterns(
  nodes: Map<string, DependencyNode>,
  edges: DependencyEdge[],
  codeFileCount: number
): AntiPattern[] {
  const antiPatterns: AntiPattern[] = [];

  const cycles = findCycles(nodes);
  for (const cycle of cycles) {
    antiPatterns.push({
      type: 'circular',
      severity: 'high',
      description: `Circular dependency: ${cycle.join(' → ')} → ${cycle[0]}`,
      files: cycle,
    });
  }

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
