import * as vscode from 'vscode';
import * as path from 'path';
import { languageRegistry } from './language-registry';
import { initializeParser } from './ast-parser';
import { TypeScriptHandler } from './language-handlers/typescript-handler';
import { LuaHandler } from './language-handlers/lua-handler';
import { openDashboard, setParserInitPromise, setExtensionPath } from './dashboard-panel';
import { setBundledDefaultsPath } from './coding-standards-watcher';

export function activate(context: vscode.ExtensionContext) {
  console.log('Aperture extension is now active');

  // Set extension path for reading bundled defaults
  setExtensionPath(context.extensionPath);
  setBundledDefaultsPath(context.extensionPath);

  // Register language handlers
  languageRegistry.register(new TypeScriptHandler());
  languageRegistry.register(new LuaHandler());

  // Initialize AST parsers with WASM files from dist/
  const wasmDir = path.join(context.extensionPath, 'dist');
  const parserPromise = initializeParser(wasmDir).catch((err: Error) => {
    console.error('AST parser initialization failed:', err);
  });
  setParserInitPromise(parserPromise);

  const disposable = vscode.commands.registerCommand('aperture.openDashboard', async () => {
    await openDashboard(context);
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
