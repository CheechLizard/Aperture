import {
  ImportInfo,
  FunctionInfo,
  CatchBlockInfo,
  CommentInfo,
  LiteralInfo,
  ASTExtractionResult,
} from '../types';

export interface LanguageHandler {
  readonly languageIds: string[];
  readonly extensions: string[];

  isInitialized(): boolean;
  initialize(wasmDir: string): Promise<void>;
  extractImports(content: string, filePath: string): ImportInfo[];
  extractFunctions(content: string, filePath: string): FunctionInfo[];
  extractCatchBlocks(content: string, filePath: string): CatchBlockInfo[];
  extractComments(content: string, filePath: string): CommentInfo[];
  extractLiterals(content: string, filePath: string): LiteralInfo[];
  extractAll(content: string, filePath: string): ASTExtractionResult;
}

export abstract class BaseLanguageHandler implements LanguageHandler {
  abstract readonly languageIds: string[];
  abstract readonly extensions: string[];

  protected initialized = false;

  isInitialized(): boolean {
    return this.initialized;
  }

  abstract initialize(wasmDir: string): Promise<void>;
  abstract extractImports(content: string, filePath: string): ImportInfo[];
  abstract extractFunctions(content: string, filePath: string): FunctionInfo[];
  abstract extractCatchBlocks(content: string, filePath: string): CatchBlockInfo[];
  abstract extractComments(content: string, filePath: string): CommentInfo[];
  abstract extractLiterals(content: string, filePath: string): LiteralInfo[];
  abstract extractAll(content: string, filePath: string): ASTExtractionResult;
}
