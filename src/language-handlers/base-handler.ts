import { ImportInfo } from '../types';

export interface LanguageHandler {
  readonly languageIds: string[];
  readonly extensions: string[];

  isInitialized(): boolean;
  initialize(wasmDir: string): Promise<void>;
  extractImports(content: string, filePath: string): ImportInfo[];
  // TODO: extractFunctions(content: string): FunctionInfo[];
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
}
