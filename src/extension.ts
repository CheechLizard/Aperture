import * as vscode from 'vscode';
import { scanWorkspace } from './scanner';
import { ProjectData } from './types';

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
      }
    },
    undefined,
    context.subscriptions
  );

  panel.webview.html = getLoadingContent();

  try {
    const data = await scanWorkspace();
    panel.webview.html = getDashboardContent(data);
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
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
  </style>
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
  <style>
    body { font-family: var(--vscode-font-family); padding: 20px; color: var(--vscode-foreground); background: var(--vscode-editor-background); }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body><h1>Aperture Dashboard</h1><p class="error">Error: ${message}</p></body>
</html>`;
}

function getDashboardContent(data: ProjectData): string {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);

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
    #treemap { width: 100%; height: 500px; }
    .node { stroke: var(--vscode-editor-background); stroke-width: 1px; cursor: pointer; }
    .node:hover { stroke: var(--vscode-focusBorder); stroke-width: 2px; }
    .tooltip { position: absolute; background: var(--vscode-editorWidget-background); border: 1px solid var(--vscode-widget-border); padding: 8px; font-size: 12px; pointer-events: none; z-index: 100; }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <div class="summary">
    <div><span class="stat-value">${data.totals.files.toLocaleString()}</span><br><span class="stat-label">Files</span></div>
    <div><span class="stat-value">${data.totals.loc.toLocaleString()}</span><br><span class="stat-label">Lines of Code</span></div>
  </div>
  <div id="treemap"></div>
  <div class="tooltip" style="display:none;"></div>

<script>
const vscode = acquireVsCodeApi();
const files = ${filesJson};
const rootPath = ${rootPath};

const COLORS = {
  'TypeScript': '#3178c6', 'JavaScript': '#f0db4f', 'Lua': '#000080',
  'JSON': '#292929', 'HTML': '#e34c26', 'CSS': '#563d7c',
  'Markdown': '#083fa1', 'Python': '#3572A5', 'Shell': '#89e051'
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
        child = isFile
          ? { name: part, value: file.loc, language: file.language, path: file.path }
          : { name: part, children: [] };
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
  const height = 500;
  const tooltip = document.querySelector('.tooltip');

  const hierarchy = d3.hierarchy(buildHierarchy(files))
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap().size([width, height]).padding(2)(hierarchy);

  const svg = d3.select('#treemap').append('svg')
    .attr('width', width).attr('height', height);

  const leaves = hierarchy.leaves();

  svg.selectAll('rect')
    .data(leaves)
    .join('rect')
    .attr('class', 'node')
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => d.y1 - d.y0)
    .attr('fill', d => COLORS[d.data.language] || DEFAULT_COLOR)
    .on('mouseover', (e, d) => {
      tooltip.style.display = 'block';
      tooltip.innerHTML = '<strong>' + d.data.path + '</strong><br>' + d.data.language + ' · ' + d.value.toLocaleString() + ' LOC';
    })
    .on('mousemove', e => {
      tooltip.style.left = (e.pageX + 10) + 'px';
      tooltip.style.top = (e.pageY + 10) + 'px';
    })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.path });
    });
}

render();
</script>
</body>
</html>`;
}

export function deactivate() {}
