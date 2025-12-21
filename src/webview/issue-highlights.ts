export const ISSUE_HIGHLIGHTS_SCRIPT = `
function escapeHtml(text) {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function renderStats(nodeCount, edgeCount) {
  // Update footer stats
  const footerStats = document.getElementById('footer-dep-stats');
  footerStats.innerHTML =
    '<span class="footer-stat"><strong>' + nodeCount + '</strong> connected</span>' +
    '<span class="footer-stat" style="margin-left:16px;"><strong>' + edgeCount + '</strong> dependencies</span>' +
    '<span class="footer-stat" style="margin-left:16px;"><strong>' + depGraph.antiPatterns.length + '</strong> issues</span>';
}

// Rebuild issue file map when dependency graph updates
function buildIssueFileMap() {
  issueFileMap.clear();

  // Use depGraph anti-patterns if available, otherwise use initial anti-patterns
  const antiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;
  if (!antiPatterns) return;

  const severityRank = { high: 0, medium: 1, low: 2 };
  for (const ap of antiPatterns) {
    // Skip ignored patterns
    if (isPatternIgnored(ap)) continue;

    for (const file of ap.files) {
      const existing = issueFileMap.get(file);
      if (!existing || severityRank[ap.severity] < severityRank[existing]) {
        issueFileMap.set(file, ap.severity);
      }
    }
  }
}

function applyPersistentIssueHighlights() {
  // Apply persistent issue classes to treemap nodes
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    node.classList.remove('issue-high', 'issue-medium', 'issue-low');
    const severity = issueFileMap.get(path);
    if (severity) {
      node.classList.add('issue-' + severity);
    }
  });

  // Apply persistent issue classes to chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    arc.classList.remove('issue-high', 'issue-medium', 'issue-low');
    if (path) {
      const severity = issueFileMap.get(path);
      if (severity) {
        arc.classList.add('issue-' + severity);
      }
    }
  });

  // Apply persistent issue classes to chord ribbons
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const fromPath = ribbon.getAttribute('data-from');
    const toPath = ribbon.getAttribute('data-to');
    ribbon.classList.remove('issue-high', 'issue-medium', 'issue-low');
    // Use the highest severity from either end
    const fromSev = fromPath ? issueFileMap.get(fromPath) : null;
    const toSev = toPath ? issueFileMap.get(toPath) : null;
    const severityRank = { high: 0, medium: 1, low: 2 };
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
`;
