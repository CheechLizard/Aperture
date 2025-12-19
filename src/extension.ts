import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('Aperture extension is now active');

  const disposable = vscode.commands.registerCommand('aperture.openDashboard', () => {
    createDashboardPanel(context);
  });

  context.subscriptions.push(disposable);
}

function createDashboardPanel(context: vscode.ExtensionContext) {
  const panel = vscode.window.createWebviewPanel(
    'apertureDashboard',
    'Aperture Dashboard',
    vscode.ViewColumn.One,
    {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(context.extensionPath)]
    }
  );

  panel.webview.html = getWebviewContent();
}

function getWebviewContent(): string {
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
    h1 {
      color: var(--vscode-foreground);
      margin-bottom: 10px;
    }
    p {
      color: var(--vscode-descriptionForeground);
    }
  </style>
</head>
<body>
  <h1>Aperture Dashboard</h1>
  <p>Codebase visualization coming soon.</p>
</body>
</html>`;
}

export function deactivate() {}
