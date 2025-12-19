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
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    }
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
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperture Dashboard</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <p>Scanning workspace...</p>
</body>
</html>`;
}

function getErrorContent(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperture Dashboard</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    .error { color: var(--vscode-errorForeground); }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <p class="error">Error: ${message}</p>
</body>
</html>`;
}

function getDashboardContent(data: ProjectData): string {
  const languageRows = data.languages
    .map(l => `<tr><td>${l.language}</td><td>${l.fileCount}</td><td>${l.loc.toLocaleString()}</td></tr>`)
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Aperture Dashboard</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      color: var(--vscode-foreground);
      background-color: var(--vscode-editor-background);
    }
    h1, h2 { margin-bottom: 10px; }
    .summary {
      display: flex;
      gap: 40px;
      margin-bottom: 20px;
    }
    .stat {
      display: flex;
      flex-direction: column;
    }
    .stat-value {
      font-size: 2em;
      font-weight: bold;
      color: var(--vscode-textLink-foreground);
    }
    .stat-label {
      color: var(--vscode-descriptionForeground);
    }
    table {
      border-collapse: collapse;
      width: 100%;
      max-width: 500px;
    }
    th, td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid var(--vscode-widget-border);
    }
    th { color: var(--vscode-descriptionForeground); }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>

  <div class="summary">
    <div class="stat">
      <span class="stat-value">${data.totals.files.toLocaleString()}</span>
      <span class="stat-label">Files</span>
    </div>
    <div class="stat">
      <span class="stat-value">${data.totals.loc.toLocaleString()}</span>
      <span class="stat-label">Lines of Code</span>
    </div>
  </div>

  <h2>Languages</h2>
  <table>
    <thead>
      <tr>
        <th>Language</th>
        <th>Files</th>
        <th>LOC</th>
      </tr>
    </thead>
    <tbody>
      ${languageRows}
    </tbody>
  </table>
</body>
</html>`;
}

export function deactivate() {}
