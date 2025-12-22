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
import {
  extractImportsFromTree,
  extractFunctionsFromTree,
  extractCatchBlocksFromTree,
  extractCommentsFromTree,
  extractLiteralsFromTree,
} from './typescript-extractors';

export class TypeScriptHandler extends BaseLanguageHandler {
  readonly languageIds = ['TypeScript', 'JavaScript'];
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

  private parser: TreeSitter.Parser | null = null;
  private tsLanguage: TreeSitter.Language | null = null;
  private tsxLanguage: TreeSitter.Language | null = null;

  async initialize(wasmDir: string): Promise<void> {
    if (this.initialized) return;

    this.parser = new TreeSitter.Parser();
    this.tsLanguage = await TreeSitter.Language.load(
      path.join(wasmDir, 'tree-sitter-typescript.wasm')
    );
    this.tsxLanguage = await TreeSitter.Language.load(
      path.join(wasmDir, 'tree-sitter-tsx.wasm')
    );
    this.initialized = true;
  }

  private parseContent(content: string, filePath: string): TreeSitter.Tree | null {
    if (!this.parser || !this.tsLanguage || !this.tsxLanguage) return null;

    const ext = path.extname(filePath).toLowerCase();
    const isTsx = ext === '.tsx' || ext === '.jsx';
    this.parser.setLanguage(isTsx ? this.tsxLanguage : this.tsLanguage);

    return this.parser.parse(content);
  }

  extractImports(content: string, filePath: string): ImportInfo[] {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    const lines = content.split('\n');
    return extractImportsFromTree(tree.rootNode, lines);
  }

  extractFunctions(content: string, filePath: string): FunctionInfo[] {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractFunctionsFromTree(tree.rootNode);
  }

  extractCatchBlocks(content: string, filePath: string): CatchBlockInfo[] {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractCatchBlocksFromTree(tree.rootNode);
  }

  extractComments(content: string, filePath: string): CommentInfo[] {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractCommentsFromTree(tree.rootNode);
  }

  extractLiterals(content: string, filePath: string): LiteralInfo[] {
    const tree = this.parseContent(content, filePath);
    if (!tree) return [];
    return extractLiteralsFromTree(tree.rootNode);
  }

  extractAll(content: string, filePath: string): ASTExtractionResult {
    const tree = this.parseContent(content, filePath);
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
    return {
      imports: extractImportsFromTree(tree.rootNode, lines),
      functions: extractFunctionsFromTree(tree.rootNode),
      catchBlocks: extractCatchBlocksFromTree(tree.rootNode),
      comments: extractCommentsFromTree(tree.rootNode),
      literals: extractLiteralsFromTree(tree.rootNode),
      status: 'parsed',
    };
  }
}
