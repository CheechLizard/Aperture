export const CODE_PREVIEW_SCRIPT = `
// Code preview component for leaf nodes
// Shows source code with line numbers and action buttons

const CODE_PREVIEW_MAX_LINES = 50;

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function renderCodeWithLineNumbers(code, startLine) {
  const lines = code.split('\\n');
  return lines.map((line, i) => {
    const lineNum = startLine + i;
    const escapedLine = escapeHtml(line) || ' ';  // Preserve empty lines
    return '<span class="code-line"><span class="code-line-number">' + lineNum + '</span><span class="code-line-content">' + escapedLine + '</span></span>';
  }).join('\\n');
}

function showCodePreview(container, node) {
  // Request code from extension host
  vscode.postMessage({
    command: 'getCodePreview',
    uri: node.uri,
    startLine: node.line,
    endLine: node.endLine
  });

  // Show loading state in container
  const previewHtml = '<div class="code-preview-container">' +
    '<div class="code-preview-header">' +
    '<span class="code-preview-name">' + node.name + '</span>' +
    '<span class="code-preview-loc">Lines ' + node.line + '-' + node.endLine + '</span>' +
    '</div>' +
    '<div class="code-preview-loading">' +
    '<div class="thinking-spinner"></div>' +
    '<span>Loading code...</span>' +
    '</div>' +
    '<div class="code-preview-actions">' +
    '<button class="code-action-btn code-action-prompt" data-uri="' + node.uri + '">Add to Prompt</button>' +
    '<button class="code-action-btn code-action-open" data-uri="' + node.uri + '">Open in Editor</button>' +
    '</div>' +
    '</div>';

  // Store current preview node for when code arrives
  window._currentPreviewNode = node;

  return previewHtml;
}

function handleCodePreviewResponse(data) {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const previewLoading = container.querySelector('.code-preview-loading');
  if (!previewLoading) return;

  if (data.error) {
    previewLoading.innerHTML = '<span class="code-preview-error">' + data.error + '</span>';
    return;
  }

  const codeHtml = renderCodeWithLineNumbers(data.code, data.startLine);
  previewLoading.outerHTML = '<pre class="code-preview-code">' + codeHtml + '</pre>';

  // Add event listeners for action buttons
  const promptBtn = container.querySelector('.code-action-prompt');
  const openBtn = container.querySelector('.code-action-open');

  if (promptBtn) {
    promptBtn.addEventListener('click', (e) => {
      const uri = e.target.dataset.uri;
      // Add to selection for prompt context
      selection.add(uri);
      vscode.postMessage({
        command: 'showMessage',
        message: 'Added to prompt context'
      });
    });
  }

  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      const uri = e.target.dataset.uri;
      vscode.postMessage({ command: 'openFile', uri: uri });
    });
  }
}

// Listen for code preview response from extension host
window.addEventListener('message', (event) => {
  const message = event.data;
  if (message.type === 'codePreview') {
    handleCodePreviewResponse(message);
  }
});
`;
