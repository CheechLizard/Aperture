export const EVENT_HANDLERS_SCRIPT = `
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

document.getElementById('send').addEventListener('click', () => {
  const input = document.getElementById('query');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('send').disabled = true;

  // Get context from selection state
  const context = selection.getAIContext();

  vscode.postMessage({ command: 'query', text, context });
});

document.getElementById('query').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('send').click();
});

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

window.addEventListener('message', event => {
  const msg = event.data;
  if (msg.type === 'thinking') {
    const resp = document.getElementById('response');
    resp.classList.add('visible');
    resp.innerHTML = '<div class="thinking"><div class="thinking-spinner"></div><span>Analyzing...</span></div>';
    document.getElementById('ai-dropdown').classList.add('visible');
  } else if (msg.type === 'response') {
    document.getElementById('response').classList.remove('thinking');
    document.getElementById('send').disabled = false;
    const resp = document.getElementById('response');
    resp.classList.add('visible');
    resp.textContent = msg.message;
    document.getElementById('clear').classList.add('visible');
    updateHighlights(msg.relevantFiles || []);
    // Update context pie chart with actual usage
    if (msg.usage) {
      const pct = Math.min(100, Math.round((msg.usage.totalTokens / msg.usage.contextLimit) * 100));
      const pie = document.getElementById('context-pie');
      if (pie) {
        pie.style.background = 'conic-gradient(#bbb 0% ' + pct + '%, #555 ' + pct + '% 100%)';
        pie.title = msg.usage.totalTokens.toLocaleString() + ' / ' + msg.usage.contextLimit.toLocaleString() + ' tokens (' + pct + '%)';
      }
    }
  } else if (msg.type === 'dependencyGraph') {
    depGraph = msg.graph;
    // Merge architecture issues from graph into issues array (only circular-dependency and hub-file)
    if (msg.graph.issues && msg.graph.issues.length > 0) {
      for (const issue of msg.graph.issues) {
        // Only add circular-dependency and hub-file from dependency graph
        // (orphan-file is already detected by scanner)
        if (issue.ruleId !== 'circular-dependency' && issue.ruleId !== 'hub-file') continue;

        const exists = issues.some(i =>
          i.ruleId === issue.ruleId &&
          i.message === issue.message &&
          JSON.stringify(i.locations) === JSON.stringify(issue.locations)
        );
        if (!exists) {
          issues.push(issue);
        }
      }
    }
    // Only render dep graph if on deps view
    if (currentView === 'deps') {
      renderDepGraph();
      applyPersistentIssueHighlights();
      selection._applyHighlights();
    }
    // Always re-render issues to show architecture issues in sidebar
    renderIssues();
    updateStatus();
  } else if (msg.type === 'dependencyError') {
    document.getElementById('status').textContent = 'Error: ' + msg.message;
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
    statusBtn.textContent = 'Possible issues in ' + issueFiles.length + ' files';
  } else {
    statusBtn.textContent = 'No issues found';
  }
}
`;
