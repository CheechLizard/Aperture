import { ProjectData, AntiPattern, FileIssue } from './types';
import { DASHBOARD_STYLES } from './webview/styles';
import { TOOLTIP_SCRIPT } from './webview/tooltip';
import { TREEMAP_SCRIPT } from './webview/treemap';
import { ISSUE_HIGHLIGHTS_SCRIPT } from './webview/issue-highlights';
import { CHORD_SCRIPT } from './webview/chord-diagram';
import { HIGHLIGHT_UTILS_SCRIPT } from './webview/highlight-utils';
import { ANTI_PATTERN_PANEL_SCRIPT } from './webview/anti-pattern-panel';
import { FILE_ISSUES_PANEL_SCRIPT } from './webview/file-issues-panel';
import { CHAT_PANEL_SCRIPT } from './webview/chat-panel';
import { EVENT_HANDLERS_SCRIPT } from './webview/event-handlers';

export function getLoadingContent(): string {
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

export function getErrorContent(message: string): string {
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

export function getDashboardContent(data: ProjectData, antiPatterns: AntiPattern[]): string {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);
  const rulesJson = JSON.stringify(data.rules);
  const antiPatternsJson = JSON.stringify(antiPatterns);
  const unsupportedCount = data.totals.unsupportedFiles;

  // Aggregate file-level issues from all files
  const fileIssues: FileIssue[] = data.files.flatMap(f => f.issues || []);
  const fileIssuesJson = JSON.stringify(fileIssues);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>${DASHBOARD_STYLES}</style>
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
            <label>Depth:</label>
            <input type="range" id="depth-slider" min="1" max="10" value="10">
            <span id="depth-value" class="slider-value">10</span>
          </div>
          <div class="dep-control-row">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;"><input type="checkbox" id="show-orphans"> Show orphans</label>
          </div>
        </div>
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
  <div id="chat-panel" class="chat-panel">
    <div class="chat-header" id="chat-header">
      <span class="chat-title">Ask AI</span>
      <button class="chat-collapse-btn" id="chat-collapse">−</button>
    </div>
    <div class="chat-body" id="chat-body">
      <div class="chat-input">
        <input type="text" id="query" placeholder="Ask about this codebase..." />
        <button id="send">Ask</button>
        <button class="clear-btn" id="clear" style="display:none;">Clear</button>
      </div>
      <div id="response" class="response" style="display:none;"></div>
      <div id="rules" class="rules"></div>
    </div>
  </div>
  <div class="tooltip" style="display:none;"></div>
  <div class="footer">
    <div class="footer-stats">
      <span class="footer-stat"><strong>${data.totals.files.toLocaleString()}</strong> files</span>
      <span class="footer-stat"><strong>${data.totals.loc.toLocaleString()}</strong> LOC</span>
      <span id="footer-dep-stats"></span>
    </div>
    ${unsupportedCount > 0 ? `<div class="footer-warning"><span class="footer-warning-icon">⚠</span><span class="footer-warning-text">Missing AST parsers for:</span>${data.languageSupport.filter(l => !l.isSupported).map(l => '<span class="footer-lang">' + l.language + '</span>').join('')}</div>` : ''}
  </div>

<script>
const vscode = acquireVsCodeApi();
const files = ${filesJson};
const rootPath = ${rootPath};
const rules = ${rulesJson};
const initialAntiPatterns = ${antiPatternsJson};
const fileIssues = ${fileIssuesJson};

let highlightedFiles = [];
let currentView = 'treemap';
let depGraph = null;
let simulation = null;
let topGroups = [];
let selectedElement = null;
let ignoredPatterns = [];  // Array of {type, files, description} for ignored items
let activeRules = new Set();  // Set of pattern types added as rules

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

${TOOLTIP_SCRIPT}

${TREEMAP_SCRIPT}

${ISSUE_HIGHLIGHTS_SCRIPT}

${CHORD_SCRIPT}

${HIGHLIGHT_UTILS_SCRIPT}

${ANTI_PATTERN_PANEL_SCRIPT}

${FILE_ISSUES_PANEL_SCRIPT}

${CHAT_PANEL_SCRIPT}

${EVENT_HANDLERS_SCRIPT}
</script>
</body>
</html>`;
}
