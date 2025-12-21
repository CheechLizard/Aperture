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
    body { font-family: var(--vscode-font-family); padding: 12px 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); margin: 0; }
    .footer { display: flex; gap: 24px; align-items: center; padding: 10px 0; border-top: 1px solid var(--vscode-widget-border); margin-top: 12px; font-size: 0.8em; color: var(--vscode-descriptionForeground); }
    .footer-stat { display: flex; gap: 6px; align-items: baseline; }
    .footer-stat strong { color: var(--vscode-textLink-foreground); font-size: 1.1em; }
    .footer-langs { display: flex; flex-wrap: wrap; gap: 4px; align-items: center; }
    .footer-lang { padding: 2px 6px; background: rgba(204, 167, 0, 0.2); border-radius: 3px; color: var(--vscode-editorWarning-foreground, #cca700); font-size: 0.9em; }
    #treemap { width: 100%; height: 100%; }
    .node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; transition: opacity 0.2s; }
    .node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .node.dimmed { opacity: 0.2; }
    .node.highlighted { stroke: #fff; stroke-width: 3px; }
    .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); padding: 8px; font-size: 12px; pointer-events: none; z-index: 100; }
    .chat { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--vscode-widget-border); }
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
    .view-controls { display: flex; gap: 10px; align-items: center; justify-content: center; margin-bottom: 12px; }
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
    .view-toggle { display: flex; border: 1px solid var(--vscode-widget-border); border-radius: 6px; overflow: hidden; }
    .view-toggle button { padding: 10px 20px; border: none; background: transparent; color: var(--vscode-foreground); cursor: pointer; font-size: 1.1em; font-weight: 500; }
    .view-toggle button.active { background: var(--vscode-button-background); color: var(--vscode-button-foreground); }
    .view-toggle button:not(.active):hover { background: var(--vscode-list-hoverBackground); }
    .main-split { display: flex; gap: 16px; height: calc(100vh - 140px); }
    .main-content { flex: 3; display: flex; flex-direction: column; position: relative; }
    .main-sidebar { flex: 1; min-width: 250px; max-width: 320px; overflow-y: auto; }
    .diagram-area { flex: 1; position: relative; min-height: 0; overflow: hidden; }
    .dep-container { display: none; width: 100%; height: 100%; }
    .dep-chord { display: flex; align-items: center; justify-content: center; height: 100%; }
    .dep-chord svg { display: block; }
    .dep-controls { display: none; position: absolute; bottom: 20px; left: 20px; background: var(--vscode-editor-background); padding: 8px; border-radius: 6px; border: 1px solid var(--vscode-widget-border); z-index: 10; }
    .dep-controls.visible { display: block; }
    .dep-control-row { display: flex; align-items: center; gap: 12px; padding: 8px 10px; background: var(--vscode-editor-inactiveSelectionBackground); border-radius: 4px; margin-bottom: 6px; }
    .dep-control-row label { font-size: 0.85em; white-space: nowrap; }
    .dep-control-row input[type="range"] { flex: 1; min-width: 80px; }
    .dep-control-row .slider-value { font-size: 0.85em; min-width: 24px; text-align: right; color: var(--vscode-textLink-foreground); font-weight: bold; }
    .chord-group { cursor: pointer; }
    .chord-group:hover .chord-arc { opacity: 0.8; }
    .chord-arc { stroke: var(--vscode-editor-background); stroke-width: 1px; transition: opacity 0.2s; }
    .chord-arc.dimmed { opacity: 0.15; }
    .chord-arc.highlighted { stroke: #fff; stroke-width: 3px; }
    .chord-ribbon { fill-opacity: 0.6; transition: opacity 0.2s; }
    .chord-ribbon.dimmed { opacity: 0.1; }
    .chord-ribbon.highlighted { fill-opacity: 0.9; }
    .chord-ribbon:hover { fill-opacity: 0.9; }
    .chord-label { font-size: 10px; fill: var(--vscode-foreground); }
    .status-btn { display: block; width: 100%; padding: 10px 12px; margin-bottom: 8px; border-radius: 4px; font-size: 0.85em; font-weight: 600; cursor: pointer; background: rgba(150, 150, 150, 0.15); border: none; border-left: 3px solid #888; color: var(--vscode-foreground); text-align: left; }
    .status-btn:hover { opacity: 0.9; }
    .status-btn:empty { display: none; }
    .anti-patterns { margin: 0; }
    .pattern-group { margin-bottom: 8px; }
    .pattern-header { padding: 10px 12px; border-radius: 4px; font-size: 0.85em; cursor: pointer; display: flex; align-items: center; gap: 8px; }
    .pattern-header:hover { opacity: 0.9; }
    .pattern-header.high { background: rgba(231, 76, 60, 0.2); border-left: 3px solid #e74c3c; }
    .pattern-header.medium { background: rgba(243, 156, 18, 0.2); border-left: 3px solid #f39c12; }
    .pattern-header.low { background: rgba(127, 140, 141, 0.2); border-left: 3px solid #7f8c8d; }
    .pattern-chevron { transition: transform 0.2s; font-size: 0.8em; }
    .pattern-chevron.expanded { transform: rotate(90deg); }
    .pattern-title { flex: 1; font-weight: 600; }
    .pattern-count { font-size: 0.8em; color: var(--vscode-descriptionForeground); background: var(--vscode-badge-background); padding: 2px 6px; border-radius: 10px; }
    .pattern-items { display: none; padding-left: 16px; margin-top: 4px; }
    .pattern-items.expanded { display: block; }
    .pattern-item { padding: 8px 10px; margin-bottom: 4px; border-radius: 3px; font-size: 0.8em; cursor: pointer; background: var(--vscode-editor-inactiveSelectionBackground); }
    .pattern-item:hover { background: var(--vscode-list-hoverBackground); }
    .pattern-item-desc { color: var(--vscode-foreground); line-height: 1.3; margin-bottom: 4px; }
    .pattern-item-file { font-size: 0.9em; color: var(--vscode-textLink-foreground); }
    .dep-stats { display: none; }

    /* Issue highlighting - JS animation at 60fps for color cycling + alpha pulsing on fills */
    .node.issue-high, .node.issue-medium, .node.issue-low,
    .chord-arc.issue-high, .chord-arc.issue-medium, .chord-arc.issue-low,
    .chord-ribbon.issue-high, .chord-ribbon.issue-medium, .chord-ribbon.issue-low {
      /* No CSS transition - direct JS animation handles fill color and opacity */
    }
  </style>
</head>
<body>
  <div class="view-controls">
    <div class="view-toggle">
      <button id="view-treemap" class="active">Treemap</button>
      <button id="view-deps">Dependencies</button>
    </div>
  </div>
  <div class="main-split">
    <div class="main-content">
      <div class="diagram-area">
        <div id="treemap"></div>
        <div id="dep-container" class="dep-container">
          <div id="dep-chord" class="dep-chord"></div>
        </div>
        <div id="legend" class="legend"></div>
        <div id="dep-controls" class="dep-controls">
          <div class="dep-control-row">
            <label>Sort:</label>
            <select id="sort-mode" style="flex:1;padding:4px;background:var(--vscode-input-background);color:var(--vscode-input-foreground);border:1px solid var(--vscode-input-border);border-radius:3px;">
              <option value="used">Most Used</option>
              <option value="deps">Most Dependencies</option>
            </select>
          </div>
          <div class="dep-control-row">
            <label>Files:</label>
            <input type="range" id="depth-slider" min="5" max="${data.totals.files}" value="${data.totals.files}">
            <span id="depth-value" class="slider-value">${data.totals.files}</span>
          </div>
        </div>
      </div>
      <div class="chat">
        <div class="chat-input">
          <input type="text" id="query" placeholder="Ask about this codebase..." />
          <button id="send">Ask</button>
          <button class="clear-btn" id="clear" style="display:none;">Clear</button>
        </div>
        <div id="response" class="response" style="display:none;"></div>
        <div id="rules" class="rules"></div>
      </div>
    </div>
    <div class="main-sidebar">
      <div id="dep-stats" class="dep-stats"></div>
      <button id="status" class="status-btn"></button>
      <div id="anti-patterns" class="anti-patterns">
        <div id="anti-pattern-list"></div>
      </div>
    </div>
  </div>
  <div class="tooltip" style="display:none;"></div>
  <div class="footer">
    <div class="footer-stat"><strong>${data.totals.files.toLocaleString()}</strong> files</div>
    <div class="footer-stat"><strong>${data.totals.loc.toLocaleString()}</strong> lines of code</div>
    <div id="footer-dep-stats"></div>
    ${unsupportedCount > 0 ? `<div class="footer-langs">${data.languageSupport.filter(l => !l.isSupported).map(l => '<span class="footer-lang">' + l.language + '</span>').join('')}</div>` : ''}
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
let selectedElement = null;

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
  document.getElementById('status').textContent = initialAntiPatterns.length + ' anti-patterns found';
  selectedElement = document.getElementById('status');
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
  const height = container.clientHeight || 400;
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

  // Ensure minimum arc size for all files (prevents invisible arcs)
  const minArcValue = 2;
  for (let i = 0; i < n; i++) {
    matrix[i][i] = Math.max(matrix[i][i], minArcValue);
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
      const pathParts = g.fullPath.split('/');
      const fileName = pathParts.pop();
      const folderPath = pathParts.join('/');

      let html = '<div style="font-size:10px;color:var(--vscode-descriptionForeground);">' + folderPath + '</div>';
      html += '<div style="font-size:16px;font-weight:bold;margin:4px 0 8px 0;">' + fileName + '</div>';
      html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + g.imports + ' imports out · ' + g.importedBy + ' imports in</div>';

      // Show imported files
      if (node && node.imports && node.imports.length > 0) {
        html += '<div style="margin-top:10px;border-top:1px solid var(--vscode-widget-border);padding-top:8px;"><strong style="font-size:11px;">Imports:</strong></div>';
        const showImports = node.imports.slice(0, 5);
        for (const imp of showImports) {
          const impFile = imp.split('/').pop();
          html += '<div style="font-size:10px;color:var(--vscode-textLink-foreground);margin-top:3px;">' + impFile + '</div>';
        }
        if (node.imports.length > 5) {
          html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px;">...and ' + (node.imports.length - 5) + ' more</div>';
        }
      }
      html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:8px;">Click to open file</div>';

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
      return name.length > 15 ? name.slice(0, 12) + '...' : name;
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
  // Update footer stats
  const footerStats = document.getElementById('footer-dep-stats');
  footerStats.innerHTML =
    '<span class="footer-stat"><strong>' + nodeCount + '</strong> connected</span>' +
    '<span class="footer-stat" style="margin-left:16px;"><strong>' + edgeCount + '</strong> dependencies</span>' +
    '<span class="footer-stat" style="margin-left:16px;"><strong>' + depGraph.antiPatterns.length + '</strong> issues</span>';
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

  // Use depGraph anti-patterns if available, otherwise use initial anti-patterns
  const antiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;

  if (!antiPatterns || antiPatterns.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  // Build file->severity map for persistent highlights
  if (depGraph) {
    buildIssueFileMap();
  }

  // Group anti-patterns by type
  const groups = new Map();
  for (const ap of antiPatterns) {
    if (!groups.has(ap.type)) {
      groups.set(ap.type, { type: ap.type, severity: ap.severity, items: [] });
    }
    groups.get(ap.type).items.push(ap);
  }

  // Sort groups by severity (use highest severity in group)
  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedGroups = [...groups.values()].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  list.innerHTML = sortedGroups.map((group, gIdx) => {
    const allFiles = group.items.flatMap(item => item.files);
    const itemsHtml = group.items.map((item, iIdx) => {
      const fileName = item.files.map(f => f.split('/').pop()).join(', ');
      return '<div class="pattern-item" data-files="' + item.files.join(',') + '" data-group="' + gIdx + '" data-item="' + iIdx + '">' +
        '<div class="pattern-item-desc">' + item.description + '</div>' +
        '<div class="pattern-item-file">' + fileName + '</div>' +
      '</div>';
    }).join('');

    return '<div class="pattern-group" data-group="' + gIdx + '">' +
      '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-severity="' + group.severity + '">' +
        '<span class="pattern-chevron">&#9654;</span>' +
        '<span class="pattern-title">' + group.type + '</span>' +
        '<span class="pattern-count">' + group.items.length + '</span>' +
      '</div>' +
      '<div class="pattern-items">' + itemsHtml + '</div>' +
    '</div>';
  }).join('');

  // Handle header clicks - expand/collapse and highlight all files
  list.querySelectorAll('.pattern-header').forEach(header => {
    const files = header.getAttribute('data-files').split(',').filter(f => f);
    const group = header.closest('.pattern-group');
    const chevron = header.querySelector('.pattern-chevron');
    const items = group.querySelector('.pattern-items');

    header.addEventListener('click', (e) => {
      // Toggle expand/collapse
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');

      // Reset previous selection and track new one
      if (selectedElement) {
        selectedElement.style.borderLeftColor = '';
        selectedElement.style.background = '';
      }
      selectedElement = header;

      // Highlight all files in this pattern group
      highlightIssueFiles(files);
    });
  });

  // Handle individual item clicks - highlight just that item's files
  list.querySelectorAll('.pattern-item').forEach(item => {
    const files = item.getAttribute('data-files').split(',').filter(f => f);

    item.addEventListener('click', (e) => {
      e.stopPropagation();
      // Highlight just this item's files
      highlightIssueFiles(files);
      // Open the first file
      if (files.length > 0) {
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + files[0] });
      }
    });
  });
}

function highlightIssueFiles(files) {
  // Clear previous highlights
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
  });
  document.querySelectorAll('.node.dimmed, .chord-arc.dimmed, .chord-ribbon.dimmed').forEach(el => {
    el.classList.remove('dimmed');
  });

  if (files.length === 0) return;

  // Dim all nodes and highlight matching ones
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    if (files.includes(path)) {
      node.classList.add('highlighted');
    } else {
      node.classList.add('dimmed');
    }
  });

  // Highlight chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    if (files.includes(path)) {
      arc.classList.add('highlighted');
    } else {
      arc.classList.add('dimmed');
    }
  });

  // Highlight ribbons where source or target matches
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const source = ribbon.getAttribute('data-source');
    const target = ribbon.getAttribute('data-target');
    if (files.includes(source) || files.includes(target)) {
      ribbon.classList.add('highlighted');
    } else {
      ribbon.classList.add('dimmed');
    }
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
    document.getElementById('dep-controls').classList.remove('visible');
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
    document.getElementById('dep-controls').classList.add('visible');

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
renderAntiPatterns();
applyPersistentIssueHighlights();

// Status button click - highlight all anti-pattern files
document.getElementById('status').addEventListener('click', () => {
  // Reset previous selection and track new one
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;
  const antiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;
  const allFiles = antiPatterns.flatMap(ap => ap.files);
  highlightIssueFiles(allFiles);
});

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

  // Only cycle the selected button
  if (selectedElement) {
    const bgColor = color.replace('#', 'rgba(')
      .replace(/(..)(..)(..)/, (_, r, g, b) =>
        parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',0.2)');
    selectedElement.style.borderLeftColor = color;
    selectedElement.style.background = bgColor;
  }
}

// Run animation at 60fps (16ms)
setInterval(cycleIssueColors, 16);
</script>
</body>
</html>`;
}

export function deactivate() {}
