export const ISSUE_HIGHLIGHTS_SCRIPT = `
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildIssueFileMap() {
  issueFileMap.clear();
  const activeIssues = issues.filter(i => !isIssueIgnored(i));
  const severityRank = { high: 0, medium: 1, low: 2 };

  for (const issue of activeIssues) {
    for (const loc of issue.locations) {
      const existing = issueFileMap.get(loc.file);
      if (!existing || severityRank[issue.severity] < severityRank[existing]) {
        issueFileMap.set(loc.file, issue.severity);
      }
    }
  }
}

function applyPersistentIssueHighlights() {
  // Apply persistent issue severity styling to all nodes
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    node.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (issueFileMap.has(path)) {
      node.classList.add('issue-' + issueFileMap.get(path));
    }
  });

  // Apply to chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    arc.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (path && issueFileMap.has(path)) {
      arc.classList.add('issue-' + issueFileMap.get(path));
    }
  });

  // Apply to chord ribbons
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const fromPath = ribbon.getAttribute('data-from');
    const toPath = ribbon.getAttribute('data-to');
    ribbon.classList.remove('issue-high', 'issue-medium', 'issue-low');
    const severityRank = { high: 0, medium: 1, low: 2 };
    const fromSev = fromPath ? issueFileMap.get(fromPath) : null;
    const toSev = toPath ? issueFileMap.get(toPath) : null;
    let severity = null;
    if (fromSev && toSev) {
      severity = severityRank[fromSev] < severityRank[toSev] ? fromSev : toSev;
    } else {
      severity = fromSev || toSev;
    }
    if (severity) {
      ribbon.classList.add('issue-' + severity);
    }
  });
}

function renderFooterStats() {
  // Stats are now shown in status button via updateStatus()
}

function renderStats() {
  // Stats are now shown in status button via updateStatus()
}
`;
