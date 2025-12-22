export const EVENT_HANDLERS_SCRIPT = `
document.getElementById('send').addEventListener('click', () => {
  const input = document.getElementById('query');
  const text = input.value.trim();
  if (!text) return;
  document.getElementById('send').disabled = true;
  vscode.postMessage({ command: 'query', text });
});

document.getElementById('query').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') document.getElementById('send').click();
});

// Clear button handling moved to chat-panel.ts

// Track currently highlighted files for view switching
let currentHighlightedFiles = [];

// View switching function - called by anti-pattern-panel when issue is clicked
function showView(view) {
  if (view === 'treemap' || view === 'files') {
    currentView = 'treemap';
    document.getElementById('treemap').style.display = 'block';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('functions-container').classList.remove('visible');
    document.getElementById('legend').style.display = 'flex';
    document.getElementById('dep-controls').classList.remove('visible');
    render();
    renderTreemapLegend();
    applyPersistentIssueHighlights();
    if (currentHighlightedFiles.length > 0) {
      highlightIssueFiles(currentHighlightedFiles);
    }
  } else if (view === 'chord' || view === 'deps') {
    currentView = 'deps';
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'block';
    document.getElementById('functions-container').classList.remove('visible');
    document.getElementById('legend').style.display = 'none';
    document.getElementById('dep-controls').classList.add('visible');

    if (!depGraph) {
      document.getElementById('status').textContent = 'Analyzing dependencies...';
      vscode.postMessage({ command: 'getDependencies' });
    } else {
      renderDepGraph();
      renderIssues();
      applyPersistentIssueHighlights();
      if (currentHighlightedFiles.length > 0) {
        highlightIssueFiles(currentHighlightedFiles);
      }
    }
  } else if (view === 'functions') {
    currentView = 'functions';
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('functions-container').classList.add('visible');
    document.getElementById('dep-controls').classList.remove('visible');
    renderDistributionChart();
  }
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
    resp.innerHTML = '<span class="thinking">Analyzing</span>';
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
      if (currentHighlightedFiles.length > 0) {
        highlightIssueFiles(currentHighlightedFiles);
      }
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
selectedRuleId = null;
currentView = 'treemap';
render();
renderTreemapLegend();
renderRules();
renderIssues();
applyPersistentIssueHighlights();
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

// Auto-highlight all issue files on initial load
const initialIssueFiles = getAllIssueFiles();
if (initialIssueFiles.length > 0) {
  selectedElement = document.getElementById('status');
  highlightIssueFiles(initialIssueFiles);
}

// Status button click - highlight all files with any issue, reset to default view
document.getElementById('status').addEventListener('click', () => {
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;

  // Reset to default state
  colorMode = 'none';
  selectedRuleId = null;
  showView('treemap');

  const allIssueFiles = getAllIssueFiles();
  highlightIssueFiles(allIssueFiles);
});

// JavaScript-driven color cycling for issue highlights
let cycleTime = 0;

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

function cycleIssueColors() {
  cycleTime += 0.016;
  const hue = (cycleTime * 36) % 360;
  const color = hslToHex(hue, 0.85, 0.6);

  const pulsePhase = (cycleTime * 1000 / 2000) * 2 * Math.PI;
  const alpha = 0.7 + 0.05 * Math.sin(pulsePhase);
  const ribbonAlpha = 0.3 + 0.2 * Math.sin(pulsePhase);

  document.querySelectorAll('.node.highlighted').forEach(node => {
    node.style.setProperty('fill', color, 'important');
    node.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-arc.highlighted').forEach(arc => {
    arc.style.setProperty('fill', color, 'important');
    arc.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-ribbon.highlighted').forEach(ribbon => {
    ribbon.style.setProperty('fill', color, 'important');
    ribbon.style.setProperty('fill-opacity', ribbonAlpha.toString(), 'important');
  });

  if (selectedElement && selectedElement.isConnected) {
    const bgColor = color.replace('#', 'rgba(')
      .replace(/(..)(..)(..)/, (_, r, g, b) =>
        parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',0.2)');
    selectedElement.style.borderLeftColor = color;
    selectedElement.style.background = bgColor;
  }
}

setInterval(cycleIssueColors, 16);

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
