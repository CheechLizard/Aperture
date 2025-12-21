import * as vscode from 'vscode';
import * as path from 'path';
import { scanWorkspace } from './scanner';
import { ProjectData, AntiPattern } from './types';
import { analyzeQuery } from './agent';
import { analyzeDependencies, debugInfo } from './dependency-analyzer';
import { languageRegistry } from './language-registry';
import { initializeParser } from './ast-parser';
import { TypeScriptHandler } from './language-handlers/typescript-handler';
import { LuaHandler } from './language-handlers/lua-handler';

let currentData: ProjectData | null = null;
let currentPanel: vscode.WebviewPanel | null = null;
let parserInitPromise: Promise<void> | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('Aperture extension is now active');

  // Register language handlers
  languageRegistry.register(new TypeScriptHandler());
  languageRegistry.register(new LuaHandler());

  // Initialize AST parsers with WASM files from dist/
  const wasmDir = path.join(context.extensionPath, 'dist');
  parserInitPromise = initializeParser(wasmDir).catch((err: Error) => {
    console.error('AST parser initialization failed:', err);
  });

  const disposable = vscode.commands.registerCommand('aperture.openDashboard', async () => {
    await openDashboard(context);
  });

  context.subscriptions.push(disposable);
}

async function openDashboard(context: vscode.ExtensionContext) {
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

function getLoadingContent(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <style>body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }</style>
</head>
<body><h1>Aperture Dashboard</h1><p>Scanning workspace...</p></body>
</html>`;
}

function getErrorContent(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <style>body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); } .error { color: var(--vscode-errorForeground); }</style>
</head>
<body><h1>Aperture Dashboard</h1><p class="error">Error: ${message}</p></body>
</html>`;
}

function getDashboardContent(data: ProjectData, antiPatterns: AntiPattern[]): string {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);
  const rulesJson = JSON.stringify(data.rules);
  const antiPatternsJson = JSON.stringify(antiPatterns);
  const unsupportedCount = data.totals.unsupportedFiles;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    h1 { margin: 0 0 10px 0; font-size: 1.5em; }
    .summary { display: flex; gap: 30px; margin-bottom: 15px; }
    .stat-value { font-size: 1.8em; font-weight: bold; color: var(--vscode-textLink-foreground); }
    .stat-label { color: var(--vscode-descriptionForeground); font-size: 0.9em; }
    #treemap { width: 100%; height: 400px; }
    .node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .node.dimmed { opacity: 0.2; }
    .node.highlighted { stroke: #fff; stroke-width: 3px; }
    .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); padding: 8px; font-size: 12px; pointer-events: none; z-index: 100; }
    .chat { margin-top: 20px; border-top: 1px solid var(--vscode-widget-border); padding-top: 15px; }
    .chat-input { display: flex; gap: 10px; margin-bottom: 10px; }
    .chat-input input { flex: 1; padding: 8px; background: var(--vscode-input-background); border: 1px solid var(--vscode-input-border); color: var(--vscode-input-foreground); }
    .chat-input button { padding: 8px 16px; background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; cursor: pointer; }
    .chat-input button:hover { background: var(--vscode-button-hoverBackground); }
    .chat-input button:disabled { opacity: 0.5; cursor: not-allowed; }
    .response { padding: 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; white-space: pre-wrap; }
    .thinking { display: inline-block; } .thinking::after { content: ''; animation: dots 1.5s infinite; } @keyframes dots { 0%, 20% { content: '.'; } 40% { content: '..'; } 60%, 100% { content: '...'; } }
    .clear-btn { margin-left: 10px; padding: 4px 8px; font-size: 0.8em; background: transparent; border: 1px solid var(--vscode-widget-border); color: var(--vscode-foreground); cursor: pointer; }
    .rules { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 10px; }
    .rule-btn { padding: 4px 10px; font-size: 0.75em; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 3px; cursor: pointer; }
    .rule-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .dir-header { fill: rgba(30,30,30,0.95); pointer-events: none; }
    .dir-label { font-size: 11px; font-weight: bold; fill: #fff; pointer-events: none; text-transform: uppercase; letter-spacing: 0.5px; }
    .dir-label-sub { font-size: 9px; fill: #aaa; pointer-events: none; text-transform: uppercase; }
    .legend { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 10px; }
    .legend-item { display: flex; align-items: center; gap: 5px; font-size: 0.8em; color: var(--vscode-foreground); }
    .legend-swatch { width: 12px; height: 12px; border-radius: 2px; }
    .view-controls { display: flex; gap: 10px; align-items: center; margin-bottom: 15px; }
    .analyze-btn { padding: 6px 12px; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); border: none; border-radius: 4px; cursor: pointer; font-size: 0.85em; }
    .analyze-btn:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .progress-text { font-size: 0.85em; color: var(--vscode-descriptionForeground); }
    .pattern-panel { margin-top: 20px; border-top: 1px solid var(--vscode-widget-border); padding-top: 15px; display: none; }
    .pattern-panel h3 { margin: 0 0 12px 0; font-size: 1.1em; }
    .pattern-category { margin-bottom: 16px; }
    .pattern-category h4 { margin: 0 0 8px 0; font-size: 0.9em; color: var(--vscode-descriptionForeground); text-transform: uppercase; letter-spacing: 0.5px; }
    .pattern-item { margin-bottom: 4px; }
    .pattern-header { display: flex; align-items: center; gap: 8px; padding: 6px 8px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; cursor: pointer; }
    .pattern-header:hover { background: var(--vscode-list-hoverBackground); }
    .pattern-swatch { width: 12px; height: 12px; border-radius: 2px; flex-shrink: 0; }
    .pattern-name { font-weight: 500; flex: 1; }
    .pattern-count { color: var(--vscode-descriptionForeground); font-size: 0.85em; }
    .pattern-arrow { color: var(--vscode-descriptionForeground); transition: transform 0.2s; }
    .pattern-arrow.expanded { transform: rotate(90deg); }
    .pattern-files { padding-left: 20px; display: none; }
    .pattern-files.expanded { display: block; }
    .file-entry { padding: 4px 8px; font-size: 0.85em; cursor: pointer; border-radius: 3px; display: flex; gap: 8px; }
    .file-entry:hover { background: var(--vscode-list-hoverBackground); }
    .file-path { color: var(--vscode-textLink-foreground); }
    .file-reason { color: var(--vscode-descriptionForeground); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .view-toggle { display: flex; border: 1px solid var(--vscode-widget-border); border-radius: 4px; overflow: hidden; margin-right: 10px; }
    .view-toggle button { padding: 6px 12px; border: none; background: transparent; color: var(--vscode-foreground); cursor: pointer; font-size: 0.85em; }
    .view-toggle button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .view-toggle button:not(.active):hover { background: var(--vscode-list-hoverBackground); }
    .dep-container { display: none; width: 100%; }
    .dep-split { display: flex; gap: 16px; height: calc(100vh - 180px); }
    .dep-chord { flex: 3; display: flex; align-items: center; justify-content: center; }
    .dep-chord svg { display: block; }
    .dep-sidebar { flex: 1; min-width: 250px; max-width: 320px; overflow-y: auto; }
    .dep-controls { margin-bottom: 12px; }
    .dep-control-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; margin-bottom: 6px; }
    .dep-control-row label { font-size: 0.85em; white-space: nowrap; }
    .dep-control-row input[type="range"] { flex: 1; min-width: 80px; }
    .dep-control-row .slider-value { font-size: 0.85em; min-width: 24px; text-align: right; color: var(--vscode-textLink-foreground); font-weight: bold; }
    .chord-group { cursor: pointer; }
    .chord-group:hover .chord-arc { opacity: 0.8; }
    .chord-arc { stroke: var(--vscode-editor-background); stroke-width: 1px; }
    .chord-ribbon { fill-opacity: 0.6; }
    .chord-ribbon:hover { fill-opacity: 0.9; }
    .chord-label { font-size: 10px; fill: var(--vscode-foreground); }
    .anti-patterns { margin: 0; }
    .anti-patterns h3 { margin: 0 0 12px 0; font-size: 1em; border-bottom: 1px solid var(--vscode-widget-border); padding-bottom: 8px; }
    .anti-pattern { padding: 10px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85em; cursor: pointer; }
    .anti-pattern:hover { opacity: 0.9; }
    .anti-pattern.high { background: rgba(231, 76, 60, 0.2); border-left: 3px solid #e74c3c; }
    .anti-pattern.medium { background: rgba(243, 156, 18, 0.2); border-left: 3px solid #f39c12; }
    .anti-pattern.low { background: rgba(127, 140, 141, 0.2); border-left: 3px solid #7f8c8d; }
    .anti-pattern-type { font-weight: 600; text-transform: uppercase; font-size: 0.7em; margin-bottom: 4px; letter-spacing: 0.5px; }
    .anti-pattern-desc { color: var(--vscode-foreground); line-height: 1.4; }
    .anti-pattern-files { font-size: 0.8em; color: var(--vscode-descriptionForeground); margin-top: 4px; }
    .dep-stats { padding: 12px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; margin-bottom: 12px; font-size: 0.85em; }
    .dep-stats div { margin-bottom: 4px; }
    .dep-stats strong { color: var(--vscode-textLink-foreground); }
    .stat-warning { color: var(--vscode-editorWarning-foreground, #cca700); }
    .unsupported-langs { margin-bottom: 15px; padding: 8px 12px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; font-size: 0.85em; }
    .unsupported-label { color: var(--vscode-descriptionForeground); margin-right: 8px; }
    .unsupported-lang { display: inline-block; padding: 2px 8px; margin: 2px 4px; background: rgba(204, 167, 0, 0.2); border-radius: 3px; color: var(--vscode-editorWarning-foreground, #cca700); }

    /* Issue highlighting - JS animation at 60fps for color cycling + alpha pulsing on fills */
    .node.issue-high, .node.issue-medium, .node.issue-low,
    .chord-arc.issue-high, .chord-arc.issue-medium, .chord-arc.issue-low,
    .chord-ribbon.issue-high, .chord-ribbon.issue-medium, .chord-ribbon.issue-low {
      /* No CSS transition - direct JS animation handles fill color and opacity */
    }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <div class="summary">
    <div><span class="stat-value">${data.totals.files.toLocaleString()}</span><br><span class="stat-label">Files</span></div>
    <div><span class="stat-value">${data.totals.loc.toLocaleString()}</span><br><span class="stat-label">Lines of Code</span></div>
    ${unsupportedCount > 0 ? `<div><span class="stat-value stat-warning">${unsupportedCount}</span><br><span class="stat-label">Unparsed Files</span></div>` : ''}
  </div>
  ${unsupportedCount > 0 ? `
  <div class="unsupported-langs">
    <span class="unsupported-label">Languages without AST support:</span>
    ${data.languageSupport.filter(l => !l.isSupported).map(l =>
      '<span class="unsupported-lang">' + l.language + ' (' + l.fileCount + ')</span>'
    ).join('')}
  </div>` : ''}
  <div class="view-controls">
    <div class="view-toggle">
      <button id="view-treemap" class="active">Treemap</button>
      <button id="view-deps">Dependencies</button>
    </div>
    <span id="status" class="progress-text"></span>
  </div>
  <div id="treemap"></div>
  <div id="dep-container" class="dep-container">
    <div class="dep-split">
      <div id="dep-chord" class="dep-chord"></div>
      <div class="dep-sidebar">
        <div class="dep-controls">
          <div class="dep-control-row">
            <label>Sort:</label>
            <select id="sort-mode" style="flex:1;padding:4px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
              <option value="used">Most Used</option>
              <option value="deps">Most Dependencies</option>
            </select>
          </div>
          <div class="dep-control-row">
            <label>Files:</label>
            <input type="range" id="depth-slider" min="5" max="${data.totals.files}" value="30">
            <span id="depth-value" class="slider-value">30</span>
          </div>
        </div>
        <div id="dep-stats" class="dep-stats"></div>
        <div id="anti-patterns" class="anti-patterns">
          <h3>Issues Found</h3>
          <div id="anti-pattern-list"></div>
        </div>
      </div>
    </div>
  </div>
  <div id="legend" class="legend"></div>
  <div class="tooltip" style="display:none;"></div>
  <div class="chat">
    <div class="chat-input">
      <input type="text" id="query" placeholder="Ask about this codebase..." />
      <button id="send">Ask</button>
      <button class="clear-btn" id="clear" style="display:none;">Clear</button>
    </div>
    <div id="response" class="response" style="display:none;"></div>
    <div id="rules" class="rules"></div>
  </div>

<script>
const vscode = acquireVsCodeApi();
const files = ${filesJson};
const rootPath = ${rootPath};
const rules = ${rulesJson};
const initialAntiPatterns = ${antiPatternsJson};

let highlightedFiles = [];
let currentView = 'treemap';
let depGraph = null;
let simulation = null;
let topGroups = [];

// Build issue file map immediately from embedded anti-patterns
const issueFileMap = new Map();
if (initialAntiPatterns && initialAntiPatterns.length > 0) {
  const severityRank = { high: 0, medium: 1, low: 2 };
  for (const ap of initialAntiPatterns) {
    for (const file of ap.files) {
      const existing = issueFileMap.get(file);
      if (!existing || severityRank[ap.severity] < severityRank[existing]) {
        issueFileMap.set(file, ap.severity);
      }
    }
  }
  document.getElementById('status').textContent = initialAntiPatterns.length + ' issues found';
}

const COLORS = {
  'TypeScript': '#3178c6', 'JavaScript': '#f0db4f', 'Lua': '#9b59b6',
  'JSON': '#27ae60', 'HTML': '#e34c26', 'CSS': '#e91e63',
  'Markdown': '#795548', 'Python': '#2ecc71', 'Shell': '#89e051',
  'Go': '#00add8', 'Rust': '#dea584'
};
const DEFAULT_COLOR = '#808080';

function buildHierarchy(files) {
  const root = { name: 'root', children: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = isFile ? { name: part, value: file.loc, language: file.language, path: file.path } : { name: part, children: [] };
        current.children.push(child);
      }
      current = child;
    }
  }
  return root;
}

function render() {
  const container = document.getElementById('treemap');
  container.innerHTML = '';
  const width = container.clientWidth;
  const height = 400;
  const tooltip = document.querySelector('.tooltip');

  const rootData = buildHierarchy(files);
  const hierarchy = d3.hierarchy(rootData).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2)
    .paddingBottom(2)
    .paddingLeft(2)
    .paddingInner(2)
    (hierarchy);

  const svg = d3.select('#treemap').append('svg').attr('width', width).attr('height', height);
  const leaves = hierarchy.leaves();

  const getColor = (d) => COLORS[d.data.language] || DEFAULT_COLOR;
  const getTooltip = (d) => '<strong>' + d.data.path + '</strong><br>' + d.data.language + ' · ' + d.value.toLocaleString() + ' LOC';

  svg.selectAll('rect.node').data(leaves).join('rect')
    .attr('class', 'node')
    .attr('data-path', d => d.data.path)
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
    .attr('fill', getColor)
    .on('mouseover', (e, d) => { tooltip.style.display = 'block'; tooltip.innerHTML = getTooltip(d); })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.path }); });

  // Depth 1: Top-level headers (folders or patterns)
  const depth1 = hierarchy.descendants().filter(d => d.depth === 1 && (d.x1 - d.x0) > 30);

  svg.selectAll('rect.dir-header-1').data(depth1).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', 16);

  svg.selectAll('text.dir-label-1').data(depth1).join('text')
    .attr('class', 'dir-label')
    .attr('x', d => d.x0 + 4).attr('y', d => d.y0 + 12)
    .text(d => { const w = d.x1 - d.x0 - 8; const name = d.data.name; return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name; });

  // Depth 2: Sub-labels
  const depth2 = hierarchy.descendants().filter(d => d.depth === 2 && d.children && (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 25);

  svg.selectAll('rect.dir-badge-2').data(depth2).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0 + 2).attr('y', d => d.y0 + 2)
    .attr('width', d => Math.min(d.data.name.length * 7 + 8, d.x1 - d.x0 - 4))
    .attr('height', 14)
    .attr('rx', 2)
    .attr('opacity', 0.85);

  svg.selectAll('text.dir-label-2').data(depth2).join('text')
    .attr('class', 'dir-label-sub')
    .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 12)
    .text(d => { const w = d.x1 - d.x0 - 12; const name = d.data.name; return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name; });
}

function renderLegend() {
  const container = document.getElementById('legend');
  const languages = [...new Set(files.map(f => f.language))].sort();
  container.innerHTML = languages.map(lang => {
    const color = COLORS[lang] || DEFAULT_COLOR;
    return '<div class="legend-item"><span class="legend-swatch" style="background:' + color + ';"></span>' + lang + '</div>';
  }).join('');
}

function renderDepGraph() {
  if (!depGraph) return;

  const container = document.getElementById('dep-chord');
  container.innerHTML = '';
  const tooltip = document.querySelector('.tooltip');

  // Filter to code files with connections
  const codeNodes = depGraph.nodes.filter(n =>
    /\\.(ts|tsx|js|jsx|lua|py|go|rs)$/.test(n.path) && (n.imports.length > 0 || n.importedBy.length > 0)
  );

  // Render stats
  renderStats(codeNodes.length, depGraph.edges.length);

  if (codeNodes.length === 0) {
    const debugLines = (depGraph.debug || []).map(d => '<br>• ' + d).join('');
    container.innerHTML = '<p style="padding:20px;color:var(--vscode-descriptionForeground);font-size:12px;">No dependencies found.<br><br><strong>Debug:</strong>' + debugLines + '</p>';
    return;
  }

  // Build file-based groups for chord diagram
  // ALWAYS include issue files, plus top N by imports
  const maxItems = parseInt(document.getElementById('depth-slider').value) || 30;
  const sortMode = document.getElementById('sort-mode').value;
  const sortedFiles = [...codeNodes].sort((a, b) => {
    if (sortMode === 'used') {
      return b.importedBy.length - a.importedBy.length;
    } else {
      return b.imports.length - a.imports.length;
    }
  });

  // Get issue file paths from anti-patterns
  const issueFilePaths = new Set();
  if (depGraph.antiPatterns) {
    for (const ap of depGraph.antiPatterns) {
      for (const f of ap.files) {
        issueFilePaths.add(f);
      }
    }
  }

  // Always include issue files first, then fill with top sorted files
  const includedPaths = new Set();
  const selectedFiles = [];

  // First add all issue files
  for (const f of codeNodes) {
    if (issueFilePaths.has(f.path)) {
      selectedFiles.push(f);
      includedPaths.add(f.path);
    }
  }

  // Then fill remaining slots with top sorted files
  for (const f of sortedFiles) {
    if (selectedFiles.length >= maxItems) break;
    if (!includedPaths.has(f.path)) {
      selectedFiles.push(f);
      includedPaths.add(f.path);
    }
  }

  topGroups = selectedFiles.map(f => ({
    name: f.path.split('/').pop(),
    fullPath: f.path,
    files: [f],
    imports: f.imports.length,
    importedBy: f.importedBy.length
  }));
  const groupIndex = new Map(topGroups.map((g, i) => [g.fullPath, i]));

  // Build adjacency matrix for files
  const n = topGroups.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  for (const edge of depGraph.edges) {
    const fromIdx = groupIndex.get(edge.from);
    const toIdx = groupIndex.get(edge.to);
    if (fromIdx !== undefined && toIdx !== undefined) {
      matrix[fromIdx][toIdx]++;
    }
  }

  const availableHeight = window.innerHeight - 200;
  const availableWidth = container.clientWidth;
  const size = Math.min(availableWidth, availableHeight, 800);
  const outerRadius = size / 2 - 60;
  const innerRadius = outerRadius - 24;

  const svg = d3.select('#dep-chord').append('svg')
    .attr('width', size)
    .attr('height', size)
    .append('g')
    .attr('transform', 'translate(' + size/2 + ',' + size/2 + ')');

  const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const chords = chord(matrix);

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius - 4);

  // Color scale
  const color = d3.scaleOrdinal()
    .domain(topGroups.map((_, i) => i))
    .range(d3.schemeTableau10);

  // Draw arcs (groups)
  const group = svg.append('g')
    .selectAll('g')
    .data(chords.groups)
    .join('g')
    .attr('class', 'chord-group');

  // Build a node lookup for getting import details
  const nodeLookup = new Map();
  for (const node of depGraph.nodes) {
    nodeLookup.set(node.path, node);
  }

  group.append('path')
    .attr('class', 'chord-arc')
    .attr('data-path', d => topGroups[d.index].fullPath)
    .attr('d', arc)
    .attr('fill', d => color(d.index))
    .style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const g = topGroups[d.index];
      const node = nodeLookup.get(g.fullPath);
      let html = '<strong>' + g.fullPath + '</strong>';
      html += '<br>' + g.imports + ' imports out · ' + g.importedBy + ' imports in';

      // Show first few imports with code
      if (node && node.importDetails && node.importDetails.length > 0) {
        html += '<div style="margin-top:8px;border-top:1px solid var(--vscode-widget-border);padding-top:6px;"><strong>Imports:</strong></div>';
        const showImports = node.importDetails.slice(0, 3);
        for (const imp of showImports) {
          html += '<div style="font-size:10px;margin-top:4px;"><span style="color:var(--vscode-textLink-foreground);">' + imp.targetPath.split('/').pop() + '</span>';
          html += '<code style="font-size:10px;background:rgba(0,0,0,0.3);padding:1px 3px;border-radius:2px;margin-left:4px;display:inline-block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + escapeHtml(imp.code) + '</code></div>';
        }
        if (node.importDetails.length > 3) {
          html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);">...and ' + (node.importDetails.length - 3) + ' more</div>';
        }
      }
      html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:6px;">Click to open file</div>';

      tooltip.style.display = 'block';
      tooltip.innerHTML = html;
    })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => {
      const g = topGroups[d.index];
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + g.fullPath });
    });

  // Draw labels
  group.append('text')
    .attr('class', 'chord-label')
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr('dy', '0.35em')
    .attr('transform', d =>
      'rotate(' + (d.angle * 180 / Math.PI - 90) + ')' +
      'translate(' + (outerRadius + 6) + ')' +
      (d.angle > Math.PI ? 'rotate(180)' : '')
    )
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : null)
    .text(d => {
      const name = topGroups[d.index].name;
      return name.length > 15 ? '...' + name.slice(-12) : name;
    });

  // Build edge lookup for tooltips: key = "from|to", value = edge details
  const edgeLookup = new Map();
  for (const edge of depGraph.edges) {
    const key = edge.from + '|' + edge.to;
    edgeLookup.set(key, edge);
  }

  // Draw ribbons (connections)
  svg.append('g')
    .selectAll('path')
    .data(chords)
    .join('path')
    .attr('class', 'chord-ribbon')
    .attr('data-from', d => topGroups[d.source.index].fullPath)
    .attr('data-to', d => topGroups[d.target.index].fullPath)
    .attr('d', ribbon)
    .attr('fill', d => color(d.source.index))
    .attr('fill-opacity', 0.6)
    .style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const toPath = topGroups[d.target.index].fullPath;
      const from = topGroups[d.source.index].name;
      const to = topGroups[d.target.index].name;
      const edge = edgeLookup.get(fromPath + '|' + toPath);

      let html = '<strong>' + from + '</strong> → <strong>' + to + '</strong>';
      if (edge && edge.code) {
        html += '<br><code style="font-size:11px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:2px;display:block;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;">' + escapeHtml(edge.code) + '</code>';
        html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:4px;">Line ' + edge.line + ' · Click to open</div>';
      } else {
        html += '<br>' + d.source.value + ' dependencies';
      }
      tooltip.style.display = 'block';
      tooltip.innerHTML = html;
    })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const toPath = topGroups[d.target.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + toPath);
      if (edge) {
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + fromPath, line: edge.line });
      } else {
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + fromPath });
      }
    });

  // Apply persistent issue highlights to chord arcs
  applyPersistentIssueHighlights();
}

function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderStats(nodeCount, edgeCount) {
  const stats = document.getElementById('dep-stats');
  const parserType = (depGraph.debug || []).find(d => d.startsWith('Parser:')) || 'Parser: unknown';
  stats.innerHTML =
    '<div><strong>' + nodeCount + '</strong> connected files</div>' +
    '<div><strong>' + edgeCount + '</strong> dependencies</div>' +
    '<div><strong>' + depGraph.antiPatterns.length + '</strong> issues found</div>' +
    '<div style="font-size:0.8em;color:var(--vscode-descriptionForeground);margin-top:4px;">' + parserType + '</div>';
}

// Rebuild issue file map when dependency graph updates
function buildIssueFileMap() {
  issueFileMap.clear();
  if (!depGraph || !depGraph.antiPatterns) return;

  const severityRank = { high: 0, medium: 1, low: 2 };
  for (const ap of depGraph.antiPatterns) {
    for (const file of ap.files) {
      const existing = issueFileMap.get(file);
      if (!existing || severityRank[ap.severity] < severityRank[existing]) {
        issueFileMap.set(file, ap.severity);
      }
    }
  }
}

// Hover highlighting removed - only persistent issue highlighting now

function applyPersistentIssueHighlights() {
  // Apply persistent issue classes to treemap nodes
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    node.classList.remove('issue-high', 'issue-medium', 'issue-low');
    const severity = issueFileMap.get(path);
    if (severity) {
      node.classList.add('issue-' + severity);
    }
  });

  // Apply persistent issue classes to chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    arc.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (path) {
      const severity = issueFileMap.get(path);
      if (severity) {
        arc.classList.add('issue-' + severity);
      }
    }
  });

  // Apply persistent issue classes to chord ribbons
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const fromPath = ribbon.getAttribute('data-from');
    const toPath = ribbon.getAttribute('data-to');
    ribbon.classList.remove('issue-high', 'issue-medium', 'issue-low');
    // Use the highest severity from either end
    const fromSev = fromPath ? issueFileMap.get(fromPath) : null;
    const toSev = toPath ? issueFileMap.get(toPath) : null;
    const severityRank = { high: 0, medium: 1, low: 2 };
    let severity = null;
    if (fromSev && toSev) {
      severity = severityRank[fromSev] < severityRank[toSev] ? fromSev : toSev;
    } else {
      severity = fromSev || toSev;
    }
    if (severity) {
      ribbon.classList.add('issue-' + severity);
    }
  });
}

function renderAntiPatterns() {
  const list = document.getElementById('anti-pattern-list');

  if (!depGraph || depGraph.antiPatterns.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  // Build file->severity map for persistent highlights
  buildIssueFileMap();

  // Sort by severity
  const sorted = [...depGraph.antiPatterns].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  });

  list.innerHTML = sorted.map((ap, idx) => {
    const fileNames = ap.files.map(f => f.split('/').pop()).join(', ');
    return '<div class="anti-pattern ' + ap.severity + '" data-files="' + ap.files.join(',') + '" data-severity="' + ap.severity + '">' +
      '<div class="anti-pattern-type">' + ap.type + '</div>' +
      '<div class="anti-pattern-desc">' + ap.description + '</div>' +
      '<div class="anti-pattern-files">' + fileNames + '</div>' +
    '</div>';
  }).join('');

  list.querySelectorAll('.anti-pattern').forEach(el => {
    const files = el.getAttribute('data-files').split(',');

    el.addEventListener('click', () => {
      if (files.length > 0) {
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + files[0] });
      }
    });
  });
}

function renderRules() {
  const container = document.getElementById('rules');
  if (rules.length === 0) { container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.8em;">No CLAUDE.md rules found</span>'; return; }
  container.innerHTML = rules.map(r => '<button class="rule-btn" data-rule="' + r.title + '">' + r.title + '</button>').join('');
  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rule = btn.getAttribute('data-rule');
      document.getElementById('query').value = 'Check if the code follows the rule: "' + rule + '"';
      document.getElementById('send').click();
    });
  });
}

function updateHighlights(relevantFiles) {
  highlightedFiles = relevantFiles;
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    if (relevantFiles.length === 0) {
      node.classList.remove('dimmed', 'highlighted');
    } else if (relevantFiles.includes(path)) {
      node.classList.remove('dimmed');
      node.classList.add('highlighted');
    } else {
      node.classList.add('dimmed');
      node.classList.remove('highlighted');
    }
  });
  document.getElementById('clear').style.display = relevantFiles.length > 0 ? 'inline-block' : 'none';
}

document.getElementById('send').addEventListener('click', () => {
  const input = document.getElementById('query');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('send').disabled = true;
  vscode.postMessage({ command: 'query', text });
});

document.getElementById('query').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('send').click();
});

document.getElementById('clear').addEventListener('click', () => {
  updateHighlights([]);
  document.getElementById('response').style.display = 'none';
});

document.getElementById('view-treemap').addEventListener('click', () => {
  if (currentView !== 'treemap') {
    currentView = 'treemap';
    document.getElementById('view-treemap').classList.add('active');
    document.getElementById('view-deps').classList.remove('active');
    document.getElementById('treemap').style.display = 'block';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('legend').style.display = 'flex';
    // Apply issue highlights to treemap if dependency data is available
    if (depGraph) {
      applyPersistentIssueHighlights();
    }
  }
});

document.getElementById('view-deps').addEventListener('click', () => {
  if (currentView !== 'deps') {
    currentView = 'deps';
    document.getElementById('view-deps').classList.add('active');
    document.getElementById('view-treemap').classList.remove('active');
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'block';
    document.getElementById('legend').style.display = 'none';

    if (!depGraph) {
      document.getElementById('status').textContent = 'Analyzing dependencies...';
      vscode.postMessage({ command: 'getDependencies' });
    } else {
      renderDepGraph();
      renderAntiPatterns();
      applyPersistentIssueHighlights();
    }
  }
});

document.getElementById('depth-slider').addEventListener('input', (e) => {
  document.getElementById('depth-value').textContent = e.target.value;
  if (depGraph) {
    renderDepGraph();
  }
});

document.getElementById('sort-mode').addEventListener('change', () => {
  if (depGraph) {
    renderDepGraph();
  }
});

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'thinking') {
    const resp = document.getElementById('response');
    resp.style.display = 'block';
    resp.innerHTML = '<span class="thinking">Analyzing</span>';
  } else if (msg.type === 'response') {
    document.getElementById('response').classList.remove('thinking');
    document.getElementById('send').disabled = false;
    document.getElementById('response').style.display = 'block';
    document.getElementById('response').textContent = msg.message;
    updateHighlights(msg.relevantFiles || []);
  } else if (msg.type === 'dependencyGraph') {
    depGraph = msg.graph;
    document.getElementById('status').textContent = depGraph.antiPatterns.length + ' anti-patterns found';
    renderDepGraph();
    renderAntiPatterns();
    applyPersistentIssueHighlights();
  } else if (msg.type === 'dependencyError') {
    document.getElementById('status').textContent = 'Error: ' + msg.message;
  }
});

render();
renderLegend();
renderRules();

// JavaScript-driven color cycling for issue highlights
// Smooth sine-wave rainbow cycle (inspired by GLSL shader)
let cycleTime = 0;

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

function cycleIssueColors() {
  // Smooth rainbow: cycle hue over time (360° in 10 seconds at 60fps)
  cycleTime += 0.016;  // ~16ms in seconds per frame
  const hue = (cycleTime * 36) % 360;  // 36°/sec = 360° in 10sec
  const color = hslToHex(hue, 0.85, 0.6);  // 85% saturation, 60% lightness

  // Pulsing opacity: sine wave, period 750ms
  const pulsePhase = (cycleTime * 1000 / 750) * 2 * Math.PI;
  const alpha = 0.6 + 0.4 * Math.sin(pulsePhase);  // 0.2 to 1.0 for arcs
  const ribbonAlpha = 0.3 + 0.2 * Math.sin(pulsePhase);  // 0.1 to 0.5 for ribbons

  // Cycle treemap node fills - check issueFileMap directly like chord arcs
  const allNodes = document.querySelectorAll('.node');
  allNodes.forEach(node => {
    const nodePath = node.getAttribute('data-path');
    if (nodePath && issueFileMap.has(nodePath)) {
      node.style.setProperty('fill', color, 'important');
      node.style.setProperty('fill-opacity', alpha.toString(), 'important');
    }
  });

  // Cycle chord arc fills - check issueFileMap directly
  const allArcs = document.querySelectorAll('.chord-arc');
  allArcs.forEach(arc => {
    const arcPath = arc.getAttribute('data-path');
    if (arcPath && issueFileMap.has(arcPath)) {
      arc.style.setProperty('fill', color, 'important');
      arc.style.setProperty('fill-opacity', alpha.toString(), 'important');
    }
  });

  // Cycle chord ribbon fills - check issueFileMap directly for each ribbon
  const allRibbons = document.querySelectorAll('.chord-ribbon');
  allRibbons.forEach(ribbon => {
    const fromPath = ribbon.getAttribute('data-from');
    const toPath = ribbon.getAttribute('data-to');
    const fromIssue = fromPath && issueFileMap.has(fromPath);
    const toIssue = toPath && issueFileMap.has(toPath);
    if (fromIssue || toIssue) {
      ribbon.style.setProperty('fill', color, 'important');
      ribbon.style.setProperty('fill-opacity', ribbonAlpha.toString(), 'important');
    }
  });
}

// Run animation at 60fps (16ms)
setInterval(cycleIssueColors, 16);
</script>
</body>
</html>`;
}

export function deactivate() {}
