import * as vscode from 'vscode';
import { scanWorkspace } from './scanner';
import { ProjectData } from './types';
import { analyzeQuery } from './agent';

let currentData: ProjectData | null = null;

export function activate(context: vscode.ExtensionContext) {
  console.log('Aperture extension is now active');

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
    { enableScripts: true }
  );

  panel.webview.onDidReceiveMessage(
    async (message) => {
      if (message.command === 'openFile') {
        const uri = vscode.Uri.file(message.path);
        await vscode.window.showTextDocument(uri);
      } else if (message.command === 'query' && currentData) {
        panel.webview.postMessage({ type: 'thinking' });
        try {
          const response = await analyzeQuery(message.text, currentData.files, currentData.root);
          panel.webview.postMessage({ type: 'response', ...response });
        } catch (error) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          panel.webview.postMessage({ type: 'response', message: `Error: ${msg}`, relevantFiles: [] });
        }
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = getLoadingContent();

  try {
    currentData = await scanWorkspace();
    panel.webview.html = getDashboardContent(currentData);
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

function getDashboardContent(data: ProjectData): string {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);
  const rulesJson = JSON.stringify(data.rules);

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
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <div class="summary">
    <div><span class="stat-value">${data.totals.files.toLocaleString()}</span><br><span class="stat-label">Files</span></div>
    <div><span class="stat-value">${data.totals.loc.toLocaleString()}</span><br><span class="stat-label">Lines of Code</span></div>
  </div>
  <div id="treemap"></div>
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
let highlightedFiles = [];

const COLORS = {
  'TypeScript': '#3178c6', 'JavaScript': '#f0db4f', 'Lua': '#9b59b6',
  'JSON': '#27ae60', 'HTML': '#e34c26', 'CSS': '#e91e63',
  'Markdown': '#795548', 'Python': '#2ecc71', 'Shell': '#89e051'
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
  const width = container.clientWidth;
  const height = 400;
  const tooltip = document.querySelector('.tooltip');

  const hierarchy = d3.hierarchy(buildHierarchy(files)).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
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

  svg.selectAll('rect').data(leaves).join('rect')
    .attr('class', 'node')
    .attr('data-path', d => d.data.path)
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
    .attr('fill', d => COLORS[d.data.language] || DEFAULT_COLOR)
    .on('mouseover', (e, d) => { tooltip.style.display = 'block'; tooltip.innerHTML = '<strong>' + d.data.path + '</strong><br>' + d.data.language + ' · ' + d.value.toLocaleString() + ' LOC'; })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.path }); });

  // Depth 1: Top-level directory headers (in the paddingTop space)
  const depth1 = hierarchy.descendants().filter(d => d.depth === 1 && (d.x1 - d.x0) > 30);

  svg.selectAll('rect.dir-header-1').data(depth1).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', 16);

  svg.selectAll('text.dir-label-1').data(depth1).join('text')
    .attr('class', 'dir-label')
    .attr('x', d => d.x0 + 4).attr('y', d => d.y0 + 12)
    .text(d => { const w = d.x1 - d.x0 - 8; const name = d.data.name; return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name; });

  // Depth 2: Sub-directory labels (small overlay badges)
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
  const languages = [...new Set(files.map(f => f.language))].sort();
  const container = document.getElementById('legend');
  container.innerHTML = languages.map(lang => {
    const color = COLORS[lang] || DEFAULT_COLOR;
    return '<div class="legend-item"><span class="legend-swatch" style="background:' + color + ';"></span>' + lang + '</div>';
  }).join('');
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
  }
});

render();
renderLegend();
renderRules();
</script>
</body>
</html>`;
}

export function deactivate() {}
