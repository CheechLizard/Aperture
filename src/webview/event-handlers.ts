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

function updateStatus() {
  const warningContainer = document.getElementById('rules-warning-container');
  const headerEdit = document.getElementById('header-edit-btn');

  // Render warning for unrecognized rules
  if (warningContainer) {
    if (!codingStandardsExists) {
      warningContainer.innerHTML = '<button class="rules-create-btn" onclick="createCodingStandards()">' +
        '<span class="rules-create-text">No coding-standards.md</span>' +
        '<span class="rules-create-action">Create</span>' +
        '</button>';
    } else if (ruleResult.newCount > 0) {
      warningContainer.innerHTML = '<button class="rules-warning" onclick="promptFixRules()">' +
        '<span class="rules-warning-icon">&#9888;</span>' +
        '<span>' + ruleResult.newCount + ' unrecognized rule' + (ruleResult.newCount !== 1 ? 's' : '') + '</span>' +
        '</button>';
    } else {
      warningContainer.innerHTML = '';
    }
  }

  // Show/hide Edit button in header
  if (headerEdit) {
    headerEdit.style.display = codingStandardsExists ? 'block' : 'none';
  }
}

function editCodingStandards() {
  vscode.postMessage({ command: 'editCodingStandards' });
}

function createCodingStandards() {
  vscode.postMessage({ command: 'createCodingStandards' });
}

function promptFixRules() {
  const newRules = ruleResult.rules.filter(r => r.status === 'new');
  if (newRules.length === 0) return;

  // Build prompt with the unrecognized rules
  const rulesList = newRules.map(r => '- ' + r.rawText).join('\\n');
  const prompt = 'Help me fix these unrecognized rules in coding-standards.md:\\n\\n' + rulesList +
    '\\n\\nFor each rule, tell me if it\\'s a typo, something you could help implement, too complex for automation, or should be removed.';

  // Populate input and focus
  const input = document.getElementById('query');
  input.value = prompt;

  // Auto-resize textarea to fit content
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 120) + 'px';

  // Mark send button as ready
  document.getElementById('send').classList.add('ready');

  input.focus();

  // Show AI panel (positions before making visible to prevent flash)
  showAiPanel();
}

function renderFooterStats() {
  const container = document.getElementById('footer-stats');
  if (!container) return;

  const totalFiles = files.length;
  const totalFunctions = files.reduce((sum, f) => sum + (f.functions ? f.functions.length : 0), 0);
  const totalLoc = files.reduce((sum, f) => sum + (f.loc || 0), 0);

  let html = totalFiles.toLocaleString() + ' files · ' + totalFunctions.toLocaleString() + ' functions · ' + totalLoc.toLocaleString() + ' LOC';

  // Add rules count if coding-standards exists
  if (codingStandardsExists && ruleResult.activeCount > 0) {
    html += ' · ' + ruleResult.activeCount + ' rules';
    if (ruleResult.unsupportedCount > 0) {
      html += ' <span class="footer-rules-unsupported">(' + ruleResult.unsupportedCount + ' unsupported)</span>';
    }
  }

  container.innerHTML = html;
}
`;
