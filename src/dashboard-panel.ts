import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { scanWorkspace } from './scanner';
import { ProjectData } from './types';
import { analyzeQuery, buildPromptPreview, estimatePromptTokens } from './agent';
import { analyzeDependencies, debugInfo } from './dependency-analyzer';
import { addAntiPatternRule, removeAntiPatternRule } from './anti-pattern-rules';
import { getLoadingContent, getErrorContent, getDashboardContent } from './dashboard-html';

let currentData: ProjectData | null = null;
let currentPanel: vscode.WebviewPanel | null = null;
let parserInitPromise: Promise<void> | null = null;
let currentQueryController: AbortController | null = null;

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
        try {
          const uri = vscode.Uri.file(message.path);
          const options: { selection?: vscode.Range } = {};
          if (message.line && message.line > 0) {
            const line = Math.max(0, message.line - 1);
            options.selection = new vscode.Range(line, 0, line, 0);
          }
          await vscode.commands.executeCommand('vscode.open', uri, options);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to open file: ${message.path} - ${msg}`);
        }
      } else if (message.command === 'abortQuery') {
        if (currentQueryController) {
          currentQueryController.abort();
          currentQueryController = null;
        }
      } else if (message.command === 'query' && currentData) {
        // Abort any existing query
        if (currentQueryController) {
          currentQueryController.abort();
        }
        currentQueryController = new AbortController();
        const signal = currentQueryController.signal;

        try {
          // Read file contents for highlighted files
          const fileContents: Record<string, string> = {};
          if (message.context?.files) {
            for (const filePath of message.context.files) {
              const fullPath = path.join(currentData.root, filePath);
              try {
                fileContents[filePath] = fs.readFileSync(fullPath, 'utf8');
              } catch {
                // Skip unreadable files
              }
            }
          }

          const context = message.context ? {
            highlightedFiles: message.context.files || [],
            issues: message.context.issues || [],
            fileContents
          } : undefined;

          // Build and send the prompt preview immediately
          const promptPreview = buildPromptPreview(message.text, currentData.files, context);
          panel.webview.postMessage({ type: 'promptPreview', prompt: promptPreview });

          // Then make the API call with abort signal
          const response = await analyzeQuery(message.text, currentData.files, currentData.root, context, signal);

          // Only send response if not aborted
          if (!signal.aborted) {
            panel.webview.postMessage({ type: 'response', ...response });
          }
        } catch (error) {
          // Don't send error for aborted requests
          if (signal.aborted) {
            return;
          }
          const msg = error instanceof Error ? error.message : 'Unknown error';
          panel.webview.postMessage({ type: 'response', message: `Error: ${msg}`, relevantFiles: [] });
        } finally {
          currentQueryController = null;
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
            issues: graph.issues,
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
      } else if (message.command === 'countTokens' && currentData) {
        // Estimate tokens for prompt cost estimation (synchronous, no API call)
        const fileContents: Record<string, string> = {};
        if (message.context?.files) {
          for (const filePath of message.context.files) {
            const fullPath = path.join(currentData.root, filePath);
            try {
              fileContents[filePath] = fs.readFileSync(fullPath, 'utf8');
            } catch {
              // Skip unreadable files
            }
          }
        }

        const context = message.context ? {
          highlightedFiles: message.context.files || [],
          issues: message.context.issues || [],
          fileContents
        } : undefined;

        const result = estimatePromptTokens(message.text, context);
        panel.webview.postMessage({
          type: 'tokenCount',
          promptId: message.promptId,
          tokens: result.tokens,
          limit: result.limit
        });
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

    panel.webview.html = getDashboardContent(currentData, graph.issues);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    panel.webview.html = getErrorContent(message);
  }
}
