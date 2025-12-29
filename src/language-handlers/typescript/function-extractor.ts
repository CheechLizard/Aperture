import * as TreeSitter from 'web-tree-sitter';
import { FunctionInfo } from '../../types';

const NESTING_NODE_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'while_statement',
  'do_statement',
  'switch_statement',
  'try_statement',
]);

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
