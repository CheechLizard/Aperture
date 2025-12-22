import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { BaseLanguageHandler } from './base-handler';
import {
  ImportInfo,
  FunctionInfo,
  CatchBlockInfo,
  CommentInfo,
  LiteralInfo,
  ASTExtractionResult,
} from '../types';

const NESTING_NODE_TYPES = new Set([
  'if_statement',
  'for_statement',
  'for_in_statement',
  'while_statement',
  'repeat_statement',
]);

export class LuaHandler extends BaseLanguageHandler {
  readonly languageIds = ['Lua'];
  readonly extensions = ['.lua'];

  private parser: TreeSitter.Parser | null = null;
  private luaLanguage: TreeSitter.Language | null = null;

  async initialize(wasmDir: string): Promise<void> {
    if (this.initialized) return;

    this.parser = new TreeSitter.Parser();
    const luaWasmPath = path.join(wasmDir, 'tree-sitter-lua.wasm');
    this.luaLanguage = await TreeSitter.Language.load(luaWasmPath);
    this.initialized = true;
  }

  private parseContent(content: string): TreeSitter.Tree | null {
    if (!this.parser || !this.luaLanguage) return null;
    this.parser.setLanguage(this.luaLanguage);
    return this.parser.parse(content);
  }

  extractImports(content: string, filePath: string): ImportInfo[] {
    const tree = this.parseContent(content);
    if (!tree) return [];

    const imports: ImportInfo[] = [];
    const lines = content.split('\n');
    this.walkForImports(tree.rootNode, imports, lines);
    return imports;
  }

  private walkForImports(
    node: TreeSitter.Node,
    imports: ImportInfo[],
    lines: string[]
  ): void {
    if (node.type === 'function_call') {
      const nameNode = node.childForFieldName('name');
      if (nameNode && nameNode.text === 'require') {
        const argsNode = node.childForFieldName('arguments');
        if (argsNode) {
          for (let i = 0; i < argsNode.childCount; i++) {
            const child = argsNode.child(i);
            if (child && child.type === 'string') {
              const raw = child.text;
              const lineNum = node.startPosition.row + 1;
              let modulePath: string;

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

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) this.walkForImports(child, imports, lines);
    }
  }

  extractFunctions(content: string, filePath: string): FunctionInfo[] {
    const tree = this.parseContent(content);
    if (!tree) return [];

    const functions: FunctionInfo[] = [];
    this.walkForFunctions(tree.rootNode, functions);
    return functions;
  }

  private walkForFunctions(node: TreeSitter.Node, functions: FunctionInfo[]): void {
    if (node.type === 'function_declaration' || node.type === 'function_definition') {
      const name = this.extractFunctionName(node);
      const params = node.childForFieldName('parameters');
      functions.push({
        name,
        startLine: node.startPosition.row + 1,
        endLine: node.endPosition.row + 1,
        loc: node.endPosition.row - node.startPosition.row + 1,
        maxNestingDepth: this.calculateMaxNesting(node, 0),
        parameterCount: this.countParameters(params),
      });
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) this.walkForFunctions(child, functions);
    }
  }

  private extractFunctionName(node: TreeSitter.Node): string {
    const nameNode = node.childForFieldName('name');
    if (nameNode) return nameNode.text;

    const parent = node.parent;
    if (parent?.type === 'assignment_statement') {
      const varList = parent.childForFieldName('variables');
      if (varList && varList.childCount > 0) {
        return varList.child(0)?.text || 'anonymous';
      }
    }
    return 'anonymous';
  }

  private countParameters(paramsNode: TreeSitter.Node | null): number {
    if (!paramsNode) return 0;
    let count = 0;
    for (let i = 0; i < paramsNode.childCount; i++) {
      const child = paramsNode.child(i);
      if (child && child.type === 'identifier') count++;
    }
    return count;
  }

  private calculateMaxNesting(node: TreeSitter.Node, currentDepth: number): number {
    let maxDepth = currentDepth;
    const newDepth = NESTING_NODE_TYPES.has(node.type) ? currentDepth + 1 : currentDepth;

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) {
        const childMax = this.calculateMaxNesting(child, newDepth);
        if (childMax > maxDepth) maxDepth = childMax;
      }
    }
    return maxDepth;
  }

  extractCatchBlocks(content: string, filePath: string): CatchBlockInfo[] {
    // Lua uses pcall/xpcall instead of try/catch - not a direct equivalent
    // Return empty as Lua handles errors differently
    return [];
  }

  extractComments(content: string, filePath: string): CommentInfo[] {
    const tree = this.parseContent(content);
    if (!tree) return [];

    const comments: CommentInfo[] = [];
    this.walkForComments(tree.rootNode, comments);
    return comments;
  }

  private walkForComments(node: TreeSitter.Node, comments: CommentInfo[]): void {
    if (node.type === 'comment') {
      const text = node.text;
      const isBlockComment = text.startsWith('--[[');
      comments.push({
        line: node.startPosition.row + 1,
        text,
        isBlockComment,
      });
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) this.walkForComments(child, comments);
    }
  }

  extractLiterals(content: string, filePath: string): LiteralInfo[] {
    const tree = this.parseContent(content);
    if (!tree) return [];

    const literals: LiteralInfo[] = [];
    this.walkForLiterals(tree.rootNode, literals);
    return literals;
  }

  private walkForLiterals(node: TreeSitter.Node, literals: LiteralInfo[]): void {
    if (node.type === 'number') {
      const value = parseFloat(node.text);
      if (!isNaN(value)) {
        literals.push({
          line: node.startPosition.row + 1,
          value,
          context: this.determineContext(node),
        });
      }
    }

    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child) this.walkForLiterals(child, literals);
    }
  }

  private determineContext(
    node: TreeSitter.Node
  ): 'standalone' | 'comparison' | 'assignment' | 'array-index' | 'other' {
    const parent = node.parent;
    if (!parent) return 'standalone';

    if (parent.type === 'bracket_index_expression') return 'array-index';
    if (parent.type === 'binary_expression') {
      const op = parent.child(1)?.text;
      if (op && ['==', '~=', '<', '>', '<=', '>='].includes(op)) {
        return 'comparison';
      }
    }
    if (parent.type === 'assignment_statement') return 'assignment';
    return 'other';
  }

  extractAll(content: string, filePath: string): ASTExtractionResult {
    const tree = this.parseContent(content);
    if (!tree) {
      return {
        imports: [],
        functions: [],
        catchBlocks: [],
        comments: [],
        literals: [],
        status: 'error',
      };
    }

    const lines = content.split('\n');
    const imports: ImportInfo[] = [];
    const functions: FunctionInfo[] = [];
    const comments: CommentInfo[] = [];
    const literals: LiteralInfo[] = [];

    this.walkForImports(tree.rootNode, imports, lines);
    this.walkForFunctions(tree.rootNode, functions);
    this.walkForComments(tree.rootNode, comments);
    this.walkForLiterals(tree.rootNode, literals);

    return {
      imports,
      functions,
      catchBlocks: [], // Lua uses pcall/xpcall
      comments,
      literals,
      status: 'parsed',
    };
  }
}
