import * as fs from 'fs';
import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { languageRegistry } from './language-registry';
import { ImportInfo, ParseStatus, ASTExtractionResult } from './types';

// Legacy interface for backward compatibility
export interface ParseResult {
  imports: ImportInfo[];
  status: ParseStatus;
}

let treeSitterInitialized = false;

// Legacy function - returns just imports for backward compatibility
export function parse(
  content: string,
  filePath: string,
  language: string
): ParseResult {
  const ext = path.extname(filePath).toLowerCase();
  const handler = languageRegistry.getHandlerByExtension(ext);

  if (!handler) {
    return { imports: [], status: 'unsupported' };
  }

  if (!handler.isInitialized()) {
    return { imports: [], status: 'error' };
  }

  try {
    const imports = handler.extractImports(content, filePath);
    return { imports, status: 'parsed' };
  } catch (error) {
    console.error(`AST parse error for ${filePath}:`, error);
    return { imports: [], status: 'error' };
  }
}

// New function - returns full extraction result
export function parseAll(
  content: string,
  filePath: string,
  language: string
): ASTExtractionResult {
  const ext = path.extname(filePath).toLowerCase();
  const handler = languageRegistry.getHandlerByExtension(ext);

  if (!handler) {
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: 'unsupported',
    };
  }

  if (!handler.isInitialized()) {
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: 'error',
    };
  }

  try {
    return handler.extractAll(content, filePath);
  } catch (error) {
    console.error(`AST parse error for ${filePath}:`, error);
    return {
      imports: [],
      functions: [],
      catchBlocks: [],
      comments: [],
      literals: [],
      status: 'error',
    };
  }
}

export async function initializeParser(wasmDir: string): Promise<void> {
  if (!treeSitterInitialized) {
    const wasmPath = path.join(wasmDir, 'web-tree-sitter.wasm');
    const wasmBinary = fs.readFileSync(wasmPath);
    await TreeSitter.Parser.init({
      wasmBinary,
    });
    treeSitterInitialized = true;
  }

  await languageRegistry.initializeAll(wasmDir);
}

export function isLanguageSupported(language: string): boolean {
  return languageRegistry.isLanguageSupported(language);
}

export function isExtensionSupported(ext: string): boolean {
  return languageRegistry.isExtensionSupported(ext);
}
