import * as TreeSitter from 'web-tree-sitter';
import { ImportInfo } from '../../types';

export function extractImportsFromTree(
  root: TreeSitter.Node,
  lines: string[]
): ImportInfo[] {
  const imports: ImportInfo[] = [];
  walkForImports(root, imports, lines);
  return imports;
}

function walkForImports(
  node: TreeSitter.Node,
  imports: ImportInfo[],
  lines: string[]
): void {
  if (node.type === 'import_statement') {
    const source = node.childForFieldName('source');
    if (source) {
      const modulePath = extractStringContent(source.text);
      if (modulePath) {
        imports.push({
          modulePath,
          line: node.startPosition.row + 1,
          code: lines[node.startPosition.row]?.trim() || '',
        });
      }
    }
  }

  if (node.type === 'export_statement') {
    const source = node.childForFieldName('source');
    if (source) {
      const modulePath = extractStringContent(source.text);
      if (modulePath) {
        imports.push({
          modulePath,
          line: node.startPosition.row + 1,
          code: lines[node.startPosition.row]?.trim() || '',
        });
      }
    }
  }

  if (node.type === 'call_expression') {
    const func = node.childForFieldName('function');
    if (func?.text === 'require' || func?.type === 'import') {
      const args = node.childForFieldName('arguments');
      if (args && args.childCount > 0) {
        const firstArg = args.child(1);
        if (firstArg && firstArg.type === 'string') {
          const modulePath = extractStringContent(firstArg.text);
          if (modulePath) {
            imports.push({
              modulePath,
              line: node.startPosition.row + 1,
              code: lines[node.startPosition.row]?.trim() || '',
            });
          }
        }
      }
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForImports(child, imports, lines);
  }
}

export function extractStringContent(text: string): string | null {
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  if (text.startsWith('`') && text.endsWith('`')) return text.slice(1, -1);
  return null;
}
