import * as TreeSitter from 'web-tree-sitter';
import {
  ImportInfo,
  FunctionInfo,
  CatchBlockInfo,
  CommentInfo,
  LiteralInfo,
} from '../types';

const NESTING_NODE_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'try_statement',
]);

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

export function extractFunctionsFromTree(root: TreeSitter.Node): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  walkForFunctions(root, functions, 0);
  return functions;
}

function walkForFunctions(
  node: TreeSitter.Node,
  functions: FunctionInfo[],
  currentDepth: number
): void {
  const funcInfo = tryExtractFunction(node);
  if (funcInfo) {
    funcInfo.maxNestingDepth = calculateMaxNesting(node, 0);
    functions.push(funcInfo);
  }

  const newDepth = NESTING_NODE_TYPES.has(node.type) ? currentDepth + 1 : currentDepth;

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForFunctions(child, functions, newDepth);
  }
}

function tryExtractFunction(node: TreeSitter.Node): FunctionInfo | null {
  if (node.type === 'function_declaration') {
    const name = node.childForFieldName('name')?.text || 'anonymous';
    const params = node.childForFieldName('parameters');
    return {
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params),
    };
  }

  if (node.type === 'method_definition') {
    const name = node.childForFieldName('name')?.text || 'anonymous';
    const params = node.childForFieldName('parameters');
    return {
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params),
    };
  }

  if (node.type === 'arrow_function') {
    const parent = node.parent;
    let name = 'anonymous';
    if (parent?.type === 'variable_declarator') {
      name = parent.childForFieldName('name')?.text || 'anonymous';
    } else if (parent?.type === 'pair') {
      name = parent.childForFieldName('key')?.text || 'anonymous';
    }
    const params = node.childForFieldName('parameters');
    return {
      name,
      startLine: node.startPosition.row + 1,
      endLine: node.endPosition.row + 1,
      loc: node.endPosition.row - node.startPosition.row + 1,
      maxNestingDepth: 0,
      parameterCount: countParameters(params),
    };
  }

  return null;
}

function countParameters(paramsNode: TreeSitter.Node | null): number {
  if (!paramsNode) return 0;
  let count = 0;
  for (let i = 0; i < paramsNode.childCount; i++) {
    const child = paramsNode.child(i);
    if (child && (child.type === 'identifier' || child.type === 'required_parameter' ||
        child.type === 'optional_parameter' || child.type === 'rest_pattern')) {
      count++;
    }
  }
  return count;
}

function calculateMaxNesting(node: TreeSitter.Node, currentDepth: number): number {
  let maxDepth = currentDepth;
  const newDepth = NESTING_NODE_TYPES.has(node.type) ? currentDepth + 1 : currentDepth;

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) {
      const childMax = calculateMaxNesting(child, newDepth);
      if (childMax > maxDepth) maxDepth = childMax;
    }
  }
  return maxDepth;
}

export function extractCatchBlocksFromTree(root: TreeSitter.Node): CatchBlockInfo[] {
  const catches: CatchBlockInfo[] = [];
  walkForCatches(root, catches);
  return catches;
}

function walkForCatches(node: TreeSitter.Node, catches: CatchBlockInfo[]): void {
  if (node.type === 'catch_clause') {
    const body = node.childForFieldName('body');
    const isEmpty = !body || body.childCount <= 2; // Just { and }
    catches.push({
      line: node.startPosition.row + 1,
      isEmpty,
    });
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForCatches(child, catches);
  }
}

export function extractCommentsFromTree(root: TreeSitter.Node): CommentInfo[] {
  const comments: CommentInfo[] = [];
  walkForComments(root, comments);
  return comments;
}

function walkForComments(node: TreeSitter.Node, comments: CommentInfo[]): void {
  if (node.type === 'comment') {
    const text = node.text;
    const isBlockComment = text.startsWith('/*');
    comments.push({
      line: node.startPosition.row + 1,
      text: text,
      isBlockComment,
    });
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForComments(child, comments);
  }
}

export function extractLiteralsFromTree(root: TreeSitter.Node): LiteralInfo[] {
  const literals: LiteralInfo[] = [];
  walkForLiterals(root, literals);
  return literals;
}

function walkForLiterals(node: TreeSitter.Node, literals: LiteralInfo[]): void {
  if (node.type === 'number') {
    const value = parseFloat(node.text);
    if (!isNaN(value)) {
      literals.push({
        line: node.startPosition.row + 1,
        value,
        context: determineContext(node),
      });
    }
  }

  for (let i = 0; i < node.childCount; i++) {
    const child = node.child(i);
    if (child) walkForLiterals(child, literals);
  }
}

function determineContext(
  node: TreeSitter.Node
): 'standalone' | 'comparison' | 'assignment' | 'array-index' | 'other' {
  const parent = node.parent;
  if (!parent) return 'standalone';

  if (parent.type === 'subscript_expression') {
    return 'array-index';
  }
  if (parent.type === 'binary_expression') {
    const op = parent.childForFieldName('operator')?.text;
    if (op && ['===', '!==', '==', '!=', '<', '>', '<=', '>='].includes(op)) {
      return 'comparison';
    }
  }
  if (parent.type === 'variable_declarator' || parent.type === 'assignment_expression') {
    return 'assignment';
  }
  return 'other';
}

export function extractStringContent(text: string): string | null {
  if (text.startsWith("'") && text.endsWith("'")) return text.slice(1, -1);
  if (text.startsWith('"') && text.endsWith('"')) return text.slice(1, -1);
  if (text.startsWith('`') && text.endsWith('`')) return text.slice(1, -1);
  return null;
}
