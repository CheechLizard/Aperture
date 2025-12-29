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
  const issueFiles = getAllIssueFiles();

  if (issueFiles.length > 0) {
    statusBtn.innerHTML = '<strong>' + issueFiles.length + ' files with issues</strong>';
  } else {
    statusBtn.innerHTML = '<span style="opacity:0.7">No issues detected</span>';
  }
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
