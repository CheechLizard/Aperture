import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { scanWorkspace } from './scanner';
import { ProjectData, RuleParseResult } from './types';
import { analyzeQuery, buildPromptPreview, countPromptTokens, estimatePromptTokens, calibrateRatio, buildSystemPrompt } from './agent';
import { analyzeDependencies, debugInfo } from './dependency-analyzer';
import { addAntiPatternRule, removeAntiPatternRule } from './anti-pattern-rules';
import { getLoadingContent, getErrorContent, getDashboardContent } from './dashboard-html';
import { parseUri, getFilePath, getFragment, getLineFromUri } from './uri';
import { loadCodingStandards, startWatching, stopWatching, getCodingStandardsPath } from './coding-standards-watcher';
import { extractThresholds } from './coding-standards-parser';

let currentData: ProjectData | null = null;
let currentPanel: vscode.WebviewPanel | null = null;
let parserInitPromise: Promise<void> | null = null;
let currentQueryController: AbortController | null = null;
let currentRuleResult: RuleParseResult | null = null;
let codingStandardsExists = false;

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
          let filePath: string;
          let line: number | null = null;

          if (message.uri) {
            const relativePath = getFilePath(message.uri);
            filePath = path.join(currentData?.root || '', relativePath);
            // Prefer explicit line parameter over line extracted from URI fragment
            line = message.line ?? getLineFromUri(message.uri) ?? null;
          } else {
            filePath = message.path;
            line = message.line || null;
          }

          const uri = vscode.Uri.file(filePath);
          const options: { selection?: vscode.Range } = {};
          if (line && line > 0) {
            const lineIndex = Math.max(0, line - 1);
            options.selection = new vscode.Range(lineIndex, 0, lineIndex, 0);
          }
          await vscode.commands.executeCommand('vscode.open', uri, options);
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          vscode.window.showErrorMessage(`Failed to open file: ${message.uri || message.path} - ${msg}`);
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
      } else if (message.command === 'editCodingStandards' && currentData) {
        const filePath = getCodingStandardsPath(currentData.root);
        const uri = vscode.Uri.file(filePath);
        await vscode.commands.executeCommand('vscode.open', uri);
      } else if (message.command === 'createCodingStandards' && currentData) {
        await createDefaultCodingStandards(currentData.root);
        const { result, fileExists } = await loadCodingStandards(currentData.root);
        currentRuleResult = result;
        codingStandardsExists = fileExists;

        // Extract thresholds from the new rules
        const newThresholds = extractThresholds(result.rules);

        // Re-scan workspace with issue detection now enabled
        currentData = await scanWorkspace(true, newThresholds);

        // Re-run dependency analysis to get architecture issues
        const graph = analyzeDependencies(currentData.files, currentData.root);

        // Collect all issues (file issues + architecture issues)
        const allIssues = [
          ...currentData.files.flatMap(f => f.issues || []),
          ...graph.issues,
        ];

        panel.webview.postMessage({
          type: 'dataUpdated',
          files: currentData.files,
          issues: allIssues,
          ruleResult: currentRuleResult,
          fileExists: codingStandardsExists,
        });
      } else if (message.command === 'getCodePreview' && currentData) {
        try {
          const relativePath = getFilePath(message.uri);
          const filePath = path.join(currentData.root, relativePath);
          const startLine = message.startLine || 1;
          const endLine = message.endLine || startLine + 50;

          const content = fs.readFileSync(filePath, 'utf8');
          const lines = content.split('\n').slice(startLine - 1, endLine);

          panel.webview.postMessage({
            type: 'codePreview',
            uri: message.uri,
            code: lines.join('\n'),
            startLine: startLine
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Could not read file';
          panel.webview.postMessage({
            type: 'codePreview',
            uri: message.uri,
            error: msg
          });
        }
      } else if (message.command === 'countTokens' && currentData) {
        // Count tokens using Anthropic's official API for exact counts
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

        // Use API for exact count if key available, else fall back to estimate
        const apiKey = getApiKey();
        let result: { tokens: number; limit: number };
        if (apiKey) {
          try {
            const client = new Anthropic({ apiKey });
            result = await countPromptTokens(message.text, context, client);
            // Calibrate the estimate using actual count
            const systemPrompt = buildSystemPrompt(context);
            const totalChars = systemPrompt.length + message.text.length;
            calibrateRatio(totalChars, result.tokens);
          } catch {
            // API call failed, fall back to estimate
            result = estimatePromptTokens(message.text, context);
          }
        } else {
          result = estimatePromptTokens(message.text, context);
        }

        // Import getObservedRatio dynamically to get current value
        const { getObservedRatio } = await import('./prompt-builder');
        panel.webview.postMessage({
          type: 'tokenCount',
          promptId: message.promptId,
          tokens: result.tokens,
          limit: result.limit,
          charsPerToken: getObservedRatio()
        });
      } else if (message.command === 'refresh' && currentData) {
        // Manual refresh - re-load rules and re-scan
        const { result, fileExists } = await loadCodingStandards(currentData.root);
        currentRuleResult = result;
        codingStandardsExists = fileExists;

        const refreshThresholds = extractThresholds(result.rules);
        currentData = await scanWorkspace(fileExists, refreshThresholds);

        const graph = analyzeDependencies(currentData.files, currentData.root);
        const allIssues = fileExists
          ? [...currentData.files.flatMap(f => f.issues || []), ...graph.issues]
          : [];

        panel.webview.postMessage({
          type: 'dataUpdated',
          files: currentData.files,
          issues: allIssues,
          ruleResult: result,
          fileExists,
        });
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = getLoadingContent();

  // Calibrate token ratio at startup with known payload (non-blocking)
  const startupApiKey = getApiKey();
  if (startupApiKey) {
    const client = new Anthropic({ apiKey: startupApiKey });
    const calibrationText = 'function example() { return 42; }';
    const calibrationSystem = 'You are a code analyzer.';
    client.messages.countTokens({
      model: 'claude-sonnet-4-20250514',
      system: calibrationSystem,
      messages: [{ role: 'user', content: calibrationText }]
    }).then(result => {
      const chars = calibrationText.length + calibrationSystem.length;
      calibrateRatio(chars, result.input_tokens);
    }).catch(() => {});  // Silently ignore errors
  }

  panel.onDidDispose(() => {
    stopWatching();
    currentPanel = null;
  });

  try {
    // Ensure AST parsers are initialized before scanning
    if (parserInitPromise) {
      await parserInitPromise;
    }

    // Check if coding-standards.md exists BEFORE scanning
    // No rules file = no issue detection
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder open');
    }
    const ruleData = await loadCodingStandards(workspaceFolder.uri.fsPath);
    currentRuleResult = ruleData.result;
    codingStandardsExists = ruleData.fileExists;

    // Extract thresholds from parsed rules
    const thresholds = extractThresholds(currentRuleResult.rules);

    // Scan workspace - only detect issues if rules file exists
    currentData = await scanWorkspace(codingStandardsExists, thresholds);

    // Start watching for changes - re-scan when rules file changes
    startWatching(currentData.root, async (result, fileExists) => {
      try {
        console.log('coding-standards.md changed, re-scanning...');
        currentRuleResult = result;
        codingStandardsExists = fileExists;

        // Extract thresholds from updated rules
        const updatedThresholds = extractThresholds(result.rules);

        // Re-scan workspace with updated rules and thresholds
        currentData = await scanWorkspace(fileExists, updatedThresholds);

        // Re-run dependency analysis
        const graph = analyzeDependencies(currentData!.files, currentData!.root);

        // Collect all issues
        const allIssues = fileExists
          ? [...currentData!.files.flatMap(f => f.issues || []), ...graph.issues]
          : [];

        panel.webview.postMessage({
          type: 'dataUpdated',
          files: currentData!.files,
          issues: allIssues,
          ruleResult: result,
          fileExists,
        });
        console.log('Re-scan complete, UI updated');
      } catch (err) {
        console.error('Error during re-scan:', err);
      }
    });

    // Run dependency analysis - only include issues if rules file exists
    const graph = analyzeDependencies(currentData.files, currentData.root);
    const depIssues = codingStandardsExists ? graph.issues : [];

    panel.webview.html = getDashboardContent(currentData, depIssues, currentRuleResult, codingStandardsExists);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    panel.webview.html = getErrorContent(message);
  }
}

let extensionPath: string = '';

export function setExtensionPath(extPath: string): void {
  extensionPath = extPath;
}

async function createDefaultCodingStandards(workspaceRoot: string): Promise<void> {
  const bundledDefaultsPath = path.join(extensionPath, 'dist', 'defaults', 'coding-standards.md');
  let defaultContent: string;

  try {
    defaultContent = fs.readFileSync(bundledDefaultsPath, 'utf8');
  } catch {
    // Fallback if bundled file not found
    defaultContent = `# Coding Standards

## Functions
- Functions should not exceed 20 lines (warning) or 50 lines (error)
- Functions should start with a verb (get, set, handle, process, etc.)
- Avoid deep nesting beyond 4 levels

## Naming
- Avoid generic names: data, result, temp, item, value, obj, ret, res, tmp, info, stuff
- Boolean variables should be named as questions: is*, has*, can*, should*, will*

## Files
- Files should not exceed 200 lines
- Each file should have at least one incoming dependency (no orphans)
- Avoid circular dependencies

## Error Handling
- Never use empty catch/except blocks (silent failures)

## Comments
- Remove commented-out code
- Comments should explain why, not what
`;
  }

  const filePath = getCodingStandardsPath(workspaceRoot);
  await vscode.workspace.fs.writeFile(
    vscode.Uri.file(filePath),
    new TextEncoder().encode(defaultContent)
  );
}

function getApiKey(): string | undefined {
  const config = vscode.workspace.getConfiguration('aperture');
  const configKey = config.get<string>('anthropicApiKey');
  if (configKey) {
    return configKey;
  }
  return process.env.ANTHROPIC_API_KEY;
}
