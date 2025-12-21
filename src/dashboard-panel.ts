import * as vscode from 'vscode';
import { scanWorkspace } from './scanner';
import { ProjectData } from './types';
import { analyzeQuery } from './agent';
import { analyzeDependencies, debugInfo } from './dependency-analyzer';
import { addAntiPatternRule, removeAntiPatternRule } from './anti-pattern-rules';
import { getLoadingContent, getErrorContent, getDashboardContent } from './dashboard-html';

let currentData: ProjectData | null = null;
let currentPanel: vscode.WebviewPanel | null = null;
let parserInitPromise: Promise<void> | null = null;

export function setParserInitPromise(promise: Promise<void>): void {
  parserInitPromise = promise;
}

export function getCurrentPanel(): vscode.WebviewPanel | null {
  return currentPanel;
}

export async function openDashboard(context: vscode.ExtensionContext): Promise<void> {
  const panel = vscode.window.createWebviewPanel(
    'apertureDashboard',
    'Aperture Dashboard',
    vscode.ViewColumn.One,
    { enableScripts: true, retainContextWhenHidden: true }
  );

  currentPanel = panel;

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'openFile') {
        const uri = vscode.Uri.file(message.path);
        const doc = await vscode.window.showTextDocument(uri);
        if (message.line && message.line > 0) {
          const line = Math.max(0, message.line - 1);
          const position = new vscode.Position(line, 0);
          doc.selection = new vscode.Selection(position, position);
          doc.revealRange(new vscode.Range(position, position), vscode.TextEditorRevealType.InCenter);
        }
      } else if (message.command === 'query' && currentData) {
        panel.webview.postMessage({ type: 'thinking' });
        try {
          const response = await analyzeQuery(message.text, currentData.files, currentData.root);
          panel.webview.postMessage({ type: 'response', ...response });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          panel.webview.postMessage({ type: 'response', message: `Error: ${msg}`, relevantFiles: [] });
        }
      } else if (message.command === 'getDependencies' && currentData) {
        try {
          const graph = analyzeDependencies(currentData.files, currentData.root);
          const serializedGraph = {
            nodes: Array.from(graph.nodes.entries()).map(([path, node]) => ({
              path,
              imports: node.imports,
              importedBy: node.importedBy,
              importDetails: node.importDetails,
            })),
            edges: graph.edges,
            antiPatterns: graph.antiPatterns,
            debug: debugInfo,
          };
          panel.webview.postMessage({ type: 'dependencyGraph', graph: serializedGraph });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          panel.webview.postMessage({ type: 'dependencyError', message: msg });
        }
      } else if (message.command === 'addRule') {
        await addAntiPatternRule(currentData?.root || '', message.patternType);
      } else if (message.command === 'removeRule') {
        await removeAntiPatternRule(currentData?.root || '', message.patternType);
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = getLoadingContent();

  try {
    // Ensure AST parsers are initialized before scanning
    if (parserInitPromise) {
      await parserInitPromise;
    }
    currentData = await scanWorkspace();

    // Run dependency analysis to get anti-patterns for treemap highlighting
    const graph = analyzeDependencies(currentData.files, currentData.root);

    panel.webview.html = getDashboardContent(currentData, graph.antiPatterns);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    panel.webview.html = getErrorContent(message);
  }
}
