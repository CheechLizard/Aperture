import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { BaseLanguageHandler } from './base-handler';
import { ImportInfo } from '../types';

export class LuaHandler extends BaseLanguageHandler {
  readonly languageIds = ['Lua'];
  readonly extensions = ['.lua'];

  private parser: TreeSitter.Parser | null = null;
  private luaLanguage: TreeSitter.Language | null = null;

  async initialize(wasmDir: string): Promise<void> {
    if (this.initialized) return;

    // Parser.init() is called centrally in ast-parser.ts
    this.parser = new TreeSitter.Parser();
    const luaWasmPath = path.join(wasmDir, 'tree-sitter-lua.wasm');
    this.luaLanguage = await TreeSitter.Language.load(luaWasmPath);
    this.initialized = true;
  }

  extractImports(content: string, filePath: string): ImportInfo[] {
    if (!this.parser || !this.luaLanguage) return [];

    this.parser.setLanguage(this.luaLanguage);
    const tree = this.parser.parse(content);
    if (!tree) return [];

    const imports: ImportInfo[] = [];
    const lines = content.split('\n');

    this.walkTree(tree.rootNode, imports, lines);
    return imports;
  }

  private walkTree(
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
      if (child) {
        this.walkTree(child, imports, lines);
      }
    }
  }
}
