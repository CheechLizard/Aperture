import * as fs from 'fs';
import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { languageRegistry } from './language-registry';
import { ImportInfo, ParseStatus } from './types';

export interface ParseResult {
  imports: ImportInfo[];
  status: ParseStatus;
}

let treeSitterInitialized = false;

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

export async function initializeParser(wasmDir: string): Promise<void> {
  // Initialize tree-sitter WASM runtime once globally
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
