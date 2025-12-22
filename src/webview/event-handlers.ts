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

document.getElementById('clear').addEventListener('click', () => {
  updateHighlights([]);
  document.getElementById('response').style.display = 'none';
});

// Track currently highlighted files for tab switching
let currentHighlightedFiles = [];

document.getElementById('view-treemap').addEventListener('click', () => {
  if (currentView !== 'treemap') {
    currentView = 'treemap';
    document.getElementById('view-treemap').classList.add('active');
    document.getElementById('view-deps').classList.remove('active');
    document.getElementById('view-functions').classList.remove('active');
    document.getElementById('treemap').style.display = 'block';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('functions-container').classList.remove('visible');
    document.getElementById('legend').style.display = 'flex';
    document.getElementById('dep-controls').classList.remove('visible');
    // Re-render in case window was resized while on deps tab
    render();
    applyPersistentIssueHighlights();
    // Restore current selection
    if (currentHighlightedFiles.length > 0) {
      highlightIssueFiles(currentHighlightedFiles);
    }
  }
});

document.getElementById('view-deps').addEventListener('click', () => {
  if (currentView !== 'deps') {
    currentView = 'deps';
    document.getElementById('view-deps').classList.add('active');
    document.getElementById('view-treemap').classList.remove('active');
    document.getElementById('view-functions').classList.remove('active');
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
      // Restore current selection
      if (currentHighlightedFiles.length > 0) {
        highlightIssueFiles(currentHighlightedFiles);
      }
    }
  }
});

document.getElementById('view-functions').addEventListener('click', () => {
  if (currentView !== 'functions') {
    currentView = 'functions';
    document.getElementById('view-functions').classList.add('active');
    document.getElementById('view-treemap').classList.remove('active');
    document.getElementById('view-deps').classList.remove('active');
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('functions-container').classList.add('visible');
    document.getElementById('dep-controls').classList.remove('visible');

    renderDistributionChart();
  }
});

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
    resp.style.display = 'block';
    resp.innerHTML = '<span class="thinking">Analyzing</span>';
  } else if (msg.type === 'response') {
    document.getElementById('response').classList.remove('thinking');
    document.getElementById('send').disabled = false;
    document.getElementById('response').style.display = 'block';
    document.getElementById('response').textContent = msg.message;
    updateHighlights(msg.relevantFiles || []);
  } else if (msg.type === 'dependencyGraph') {
    depGraph = msg.graph;
    // Merge architecture issues from graph into issues array
    if (msg.graph.issues) {
      for (const issue of msg.graph.issues) {
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
    renderDepGraph();
    renderIssues();
    applyPersistentIssueHighlights();
    updateStatus();
    // Restore current selection
    if (currentHighlightedFiles.length > 0) {
      highlightIssueFiles(currentHighlightedFiles);
    }
  } else if (msg.type === 'dependencyError') {
    document.getElementById('status').textContent = 'Error: ' + msg.message;
  }
});

render();
renderLegend();
renderRules();
renderIssues();
applyPersistentIssueHighlights();
renderFooterStats();
updateStatus();

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

// Status button click - highlight all files with any issue
document.getElementById('status').addEventListener('click', () => {
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;
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
