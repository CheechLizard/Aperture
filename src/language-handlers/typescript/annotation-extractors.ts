import * as TreeSitter from 'web-tree-sitter';
import { CatchBlockInfo, CommentInfo, LiteralInfo } from '../../types';

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
