export const EVENT_HANDLERS_SCRIPT = `
// UI event handlers and initialization

// Helper: get issues for a list of files
function getIssuesForFiles(filePaths) {
  return issues.filter(i =>
    i.locations.some(loc => filePaths.includes(loc.file))
  );
}

// Helper: get unique rule types from highlighted files
function getActiveRuleTypes(filePaths) {
  const issuesForFiles = getIssuesForFiles(filePaths);
  return new Set(issuesForFiles.map(i => i.ruleId));
}

function showView(view) {
  // Map view names to nav view names
  const viewMap = { treemap: 'files', files: 'files', chord: 'deps', deps: 'deps', functions: 'functions' };
  const navView = viewMap[view] || 'files';
  nav.goTo({ view: navView });
}

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

document.getElementById('show-orphans').addEventListener('change', () => {
  if (depGraph) {
    renderDepGraph();
  }
});

// Initialize with files treemap view (default state)
colorMode = 'none';

// Initialize navigation to files view
nav.goTo({ view: 'files', file: null });
renderDynamicPrompts();
renderIssues();
renderFooterStats();
updateStatus();

// Trigger dependency analysis to detect architecture issues
vscode.postMessage({ command: 'getDependencies' });

// Collect all files with issues
function getAllIssueFiles() {
  const fileSet = new Set();
  const activeIssues = issues.filter(i => !isIssueIgnored(i));
  for (const issue of activeIssues) {
    for (const loc of issue.locations) {
      fileSet.add(loc.file);
    }
  }
  return [...fileSet];
}

// Status button click - highlight all files with any issue, reset to default view
document.getElementById('status').addEventListener('click', () => {
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;

  // Reset to default state - select all issues
  colorMode = 'none';
  selection.selectAllIssues();

  // Navigate to files view
  nav.goTo({ view: 'files', file: null });
});

function updateStatus() {
  const statusBtn = document.getElementById('status');

  if (!codingStandardsExists) {
    statusBtn.innerHTML = '<span class="rule-status-missing">No coding-standards.md</span> ' +
      '<button class="rule-status-btn" onclick="createCodingStandards()">Create</button>';
    return;
  }

  let html = '<strong>' + ruleResult.activeCount + ' rules</strong>';

  if (ruleResult.newCount > 0) {
    html += ' · <span class="rule-status-new" onclick="showNewRulesModal()">' + ruleResult.newCount + ' new</span>';
  }

  if (ruleResult.unsupportedCount > 0) {
    html += ' · <span class="rule-status-unsupported">' + ruleResult.unsupportedCount + ' unsupported</span>';
  }

  html += ' <button class="rule-status-btn" onclick="editCodingStandards()">Edit</button>';
  html += ' <button class="rule-status-btn" onclick="refreshData()" title="Refresh">↻</button>';

  statusBtn.innerHTML = html;
}

function editCodingStandards() {
  vscode.postMessage({ command: 'editCodingStandards' });
}

function refreshData() {
  vscode.postMessage({ command: 'refresh' });
}

function createCodingStandards() {
  vscode.postMessage({ command: 'createCodingStandards' });
}

function showNewRulesModal() {
  const newRules = ruleResult.rules.filter(r => r.status === 'new');
  if (newRules.length === 0) return;

  let html = '<div class="modal-overlay" onclick="closeNewRulesModal(event)">' +
    '<div class="modal-content" onclick="event.stopPropagation()">' +
    '<div class="modal-header"><h3>New Rules</h3><button class="modal-close" onclick="closeNewRulesModal()">×</button></div>' +
    '<div class="modal-body">' +
    '<p class="modal-desc">These rules could not be automatically parsed. Edit the coding-standards.md file to clarify them.</p>';

  for (const rule of newRules) {
    html += '<div class="new-rule-item"><span class="new-rule-text">' + rule.rawText + '</span></div>';
  }

  html += '</div></div></div>';

  let modal = document.getElementById('new-rules-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'new-rules-modal';
    document.body.appendChild(modal);
  }
  modal.innerHTML = html;
}

function closeNewRulesModal(event) {
  if (event && event.target !== event.currentTarget) return;
  const modal = document.getElementById('new-rules-modal');
  if (modal) modal.innerHTML = '';
}

function renderFooterStats() {
  const container = document.getElementById('footer-stats');
  if (!container) return;

  const totalFiles = files.length;
  const totalFunctions = files.reduce((sum, f) => sum + (f.functions ? f.functions.length : 0), 0);
  const totalLoc = files.reduce((sum, f) => sum + (f.loc || 0), 0);

  container.innerHTML = totalFiles.toLocaleString() + ' files · ' + totalFunctions.toLocaleString() + ' functions · ' + totalLoc.toLocaleString() + ' LOC';
}
`;
