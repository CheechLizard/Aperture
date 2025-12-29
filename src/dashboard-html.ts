import { ProjectData, Issue } from './types';
import { DASHBOARD_STYLES } from './webview/styles';
import { TOOLTIP_SCRIPT } from './webview/tooltip';
import { TREEMAP_NAV_SCRIPT } from './webview/treemap-nav';
import { ISSUE_HIGHLIGHTS_SCRIPT } from './webview/issue-highlights';
import { CHORD_SCRIPT } from './webview/chord-diagram';
import { HIGHLIGHT_CORE_SCRIPT } from './webview/highlighting/highlight-core';
import { PROMPT_UTILS_SCRIPT } from './webview/highlighting/prompt-utils';
import { ISSUE_CONFIG_SCRIPT } from './webview/issue-config';
import { ANTI_PATTERN_PANEL_SCRIPT } from './webview/anti-pattern-panel';
import { ANTI_PATTERN_HANDLERS_SCRIPT } from './webview/panels/anti-pattern-handlers';
import { FILE_ISSUES_PANEL_SCRIPT } from './webview/file-issues-panel';
import { CHAT_PANEL_SCRIPT } from './webview/chat-panel';
import { EVENT_HANDLERS_SCRIPT } from './webview/event-handlers';
import { MESSAGE_HANDLERS_SCRIPT } from './webview/interactions/message-handlers';
import { TREEMAP_CORE_SCRIPT } from './webview/layout/treemap-core';
import { TREEMAP_AGGREGATION_SCRIPT } from './webview/layout/treemap-aggregation';
import { TREEMAP_RENDER_SCRIPT } from './webview/layout/treemap-render';
import { TREEMAP_LABELS_SCRIPT } from './webview/layout/treemap-labels';
import { PARTITION_LAYOUT_SCRIPT } from './webview/partition-layout';
import { DISTRIBUTION_CHART_SCRIPT } from './webview/distribution-chart';
import { COLOR_ANIMATION_SCRIPT } from './webview/color-animation';
import { SELECTION_STATE_SCRIPT } from './webview/selection-state';
import { URI_SCRIPT } from './webview/uri';
import { BREADCRUMB_SCRIPT } from './webview/breadcrumb';
import { CODE_PREVIEW_SCRIPT } from './webview/code-preview';
import { ZOOM_SCRIPT } from './webview/zoom';

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

export function getDashboardContent(data: ProjectData, architectureIssues: Issue[]): string {
  const filesJson = JSON.stringify(data.files);
  const rootPath = JSON.stringify(data.root);
  const rulesJson = JSON.stringify(data.rules);
  const unsupportedCount = data.totals.unsupportedFiles;

  // Combine architecture issues with code issues from files into single unified array
  const codeIssues: Issue[] = data.files.flatMap(f => f.issues || []);
  const allIssues: Issue[] = [...architectureIssues, ...codeIssues];
  const issuesJson = JSON.stringify(allIssues);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Aperture Dashboard</title>
  <script src="https://d3js.org/d3.v7.min.js"></script>
  <style>${DASHBOARD_STYLES}</style>
</head>
<body><header class="app-header">
    <div id="back-header" class="back-header hidden"></div>
    <div></div>
  </header>
  <div class="main-split">
    <div class="main-content">
      <div class="diagram-area">
        <div id="dep-container" class="dep-container">
          <div id="dep-chord" class="dep-chord"></div>
        </div>
        <div id="functions-container" class="functions-container">
          <div id="functions-chart"></div>
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
  <div class="tooltip" style="display:none;"></div>
  <div id="ai-panel" class="ai-panel">
    <div id="chat-messages" class="chat-messages"></div>
    <div id="chat-actions" class="chat-actions">
      <div id="rules" class="rules"></div>
    </div>
  </div>
  <div class="footer">
    <div id="footer-stats" class="footer-stats"></div>
    <div class="footer-input-container">
      <div class="ai-input-wrapper">
        <textarea id="query" placeholder="Ask about this codebase..." rows="1"></textarea>
        <div class="ai-input-actions">
          <div id="context-pie" class="context-pie" title="Context used"></div>
          <button id="send" class="ai-send-btn">↑</button>
        </div>
      </div>
      <div id="context-files" class="context-files"></div>
    </div>
    ${unsupportedCount > 0 ? `<div id="footer-parsers" class="footer-parsers"><span class="footer-parsers-icon">⚠</span><span>Missing parsers:</span>${data.languageSupport.filter(l => !l.isSupported).map(l => '<span class="footer-lang">' + l.language + '</span>').join('')}</div>` : ''}
  </div>

<script>
const vscode = acquireVsCodeApi();
const files = ${filesJson};
const rootPath = ${rootPath};
const rules = ${rulesJson};
const issues = ${issuesJson};

let currentView = 'treemap';
let depGraph = null;
let simulation = null;
let topGroups = [];
let selectedElement = null;
// ignoredIssues is defined in FILE_ISSUES_PANEL_SCRIPT
let activeRules = new Set();  // Set of pattern types added as rules

// Navigation state - managed by nav module but exposed as globals for renderer compatibility
let zoomedFile = null;
let zoomedFolder = null;
let prevZoomedFile = null;
let prevZoomedFolder = null;

// Build issue file map from all issues
const issueFileMap = new Map();
const severityRank = { high: 0, medium: 1, low: 2 };
for (const issue of issues) {
  for (const loc of issue.locations) {
    const existing = issueFileMap.get(loc.file);
    if (!existing || severityRank[issue.severity] < severityRank[existing]) {
      issueFileMap.set(loc.file, issue.severity);
    }
  }
}

${URI_SCRIPT}

${ZOOM_SCRIPT}

${BREADCRUMB_SCRIPT}

${TOOLTIP_SCRIPT}

${TREEMAP_NAV_SCRIPT}

${ISSUE_HIGHLIGHTS_SCRIPT}

${CHORD_SCRIPT}

${HIGHLIGHT_CORE_SCRIPT}

${PROMPT_UTILS_SCRIPT}

${SELECTION_STATE_SCRIPT}

${ISSUE_CONFIG_SCRIPT}

${ANTI_PATTERN_HANDLERS_SCRIPT}

${ANTI_PATTERN_PANEL_SCRIPT}

${FILE_ISSUES_PANEL_SCRIPT}

${CHAT_PANEL_SCRIPT}

${TREEMAP_CORE_SCRIPT}

${TREEMAP_AGGREGATION_SCRIPT}

${TREEMAP_RENDER_SCRIPT}

${TREEMAP_LABELS_SCRIPT}

${PARTITION_LAYOUT_SCRIPT}

${DISTRIBUTION_CHART_SCRIPT}

${CODE_PREVIEW_SCRIPT}

${COLOR_ANIMATION_SCRIPT}

${MESSAGE_HANDLERS_SCRIPT}

${EVENT_HANDLERS_SCRIPT}
</script>
</body>
</html>`;
}
