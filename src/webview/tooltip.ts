export const TOOLTIP_SCRIPT = `
const tooltipEl = document.querySelector('.tooltip');

function showTooltip(html, e) {
  tooltipEl.innerHTML = html;
  tooltipEl.style.display = 'block';
  positionTooltip(e);
}

function positionTooltip(e) {
  tooltipEl.style.left = (e.pageX + 10) + 'px';
  tooltipEl.style.top = (e.pageY + 10) + 'px';
}

function hideTooltip() {
  tooltipEl.style.display = 'none';
}

function buildFileTooltip(opts) {
  const { path, language, loc, imports, importedBy, showImportsList, nodeData } = opts;
  const pathParts = path.split('/');
  const fileName = pathParts.pop();
  const dirPath = pathParts.join('/');

  let html = '';
  if (dirPath) {
    html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);">' + dirPath + '</div>';
  }
  html += '<div style="font-size:16px;font-weight:bold;margin:4px 0 8px 0;">' + fileName + '</div>';

  if (language && loc !== undefined) {
    html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + language + ' · ' + loc.toLocaleString() + ' lines</div>';
  }

  if (imports !== undefined || importedBy !== undefined) {
    const stats = [];
    if (imports !== undefined) stats.push(imports + ' imports out');
    if (importedBy !== undefined) stats.push(importedBy + ' imports in');
    html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + stats.join(' · ') + '</div>';
  }

  if (showImportsList && nodeData && nodeData.imports && nodeData.imports.length > 0) {
    html += '<div style="margin-top:10px;border-top:1px solid var(--vscode-widget-border);padding-top:8px;">';
    html += '<strong style="font-size:11px;">Imports:</strong></div>';
    for (const imp of nodeData.imports.slice(0, 5)) {
      html += '<div style="font-size:10px;color:var(--vscode-textLink-foreground);margin-top:3px;">' + imp.split('/').pop() + '</div>';
    }
    if (nodeData.imports.length > 5) {
      html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px;">...and ' + (nodeData.imports.length - 5) + ' more</div>';
    }
  }

  html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:8px;">Click to open file</div>';
  return html;
}

function buildEdgeTooltip(opts) {
  const { fromName, toName, code, line } = opts;
  let html = '<strong>' + fromName + '</strong> → <strong>' + toName + '</strong>';
  if (code) {
    html += '<br><code style="font-size:11px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:2px;display:block;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;">' + escapeHtml(code) + '</code>';
    html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:4px;">Line ' + line + ' · Click to open</div>';
  }
  return html;
}
`;
