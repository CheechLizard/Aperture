import * as path from 'path';
import * as TreeSitter from 'web-tree-sitter';
import { BaseLanguageHandler } from './base-handler';
import { ImportInfo } from '../types';

export class TypeScriptHandler extends BaseLanguageHandler {
  readonly languageIds = ['TypeScript', 'JavaScript'];
  readonly extensions = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.mts', '.cts'];

  private parser: TreeSitter.Parser | null = null;
  private tsLanguage: TreeSitter.Language | null = null;
  private tsxLanguage: TreeSitter.Language | null = null;

  async initialize(wasmDir: string): Promise<void> {
    if (this.initialized) return;

    // Parser.init() is called centrally in ast-parser.ts
    this.parser = new TreeSitter.Parser();
    this.tsLanguage = await TreeSitter.Language.load(
      path.join(wasmDir, 'tree-sitter-typescript.wasm')
    );
    this.tsxLanguage = await TreeSitter.Language.load(
      path.join(wasmDir, 'tree-sitter-tsx.wasm')
    );
    this.initialized = true;
  }

  extractImports(content: string, filePath: string): ImportInfo[] {
    if (!this.parser || !this.tsLanguage || !this.tsxLanguage) return [];

    const ext = path.extname(filePath).toLowerCase();
    const isTsx = ext === '.tsx' || ext === '.jsx';
    this.parser.setLanguage(isTsx ? this.tsxLanguage : this.tsLanguage);

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
    // ES6: import x from 'module'
    if (node.type === 'import_statement') {
      const source = node.childForFieldName('source');
      if (source) {
        const modulePath = this.extractStringContent(source.text);
        if (modulePath) {
          imports.push({
            modulePath,
            line: node.startPosition.row + 1,
            code: lines[node.startPosition.row]?.trim() || '',
          });
        }
      }
    }

    // ES6: export { x } from 'module'
    if (node.type === 'export_statement') {
      const source = node.childForFieldName('source');
      if (source) {
        const modulePath = this.extractStringContent(source.text);
        if (modulePath) {
          imports.push({
            modulePath,
            line: node.startPosition.row + 1,
            code: lines[node.startPosition.row]?.trim() || '',
          });
        }
      }
    }

    // CommonJS: require('module')
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func?.text === 'require') {
        const args = node.childForFieldName('arguments');
        if (args && args.childCount > 0) {
          const firstArg = args.child(1); // Skip opening paren
          if (firstArg && firstArg.type === 'string') {
            const modulePath = this.extractStringContent(firstArg.text);
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

    // Dynamic: import('module')
    if (node.type === 'call_expression') {
      const func = node.childForFieldName('function');
      if (func?.type === 'import') {
        const args = node.childForFieldName('arguments');
        if (args && args.childCount > 0) {
          const firstArg = args.child(1);
          if (firstArg && firstArg.type === 'string') {
            const modulePath = this.extractStringContent(firstArg.text);
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
      if (child) {
        this.walkTree(child, imports, lines);
      }
    }
  }

  private extractStringContent(text: string): string | null {
    if (text.startsWith("'") && text.endsWith("'")) {
      return text.slice(1, -1);
    }
    if (text.startsWith('"') && text.endsWith('"')) {
      return text.slice(1, -1);
    }
    if (text.startsWith('`') && text.endsWith('`')) {
      return text.slice(1, -1);
    }
    return null;
  }
}
