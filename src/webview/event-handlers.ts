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
    document.getElementById('treemap').style.display = 'block';
    document.getElementById('dep-container').style.display = 'none';
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
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'block';
    document.getElementById('legend').style.display = 'none';
    document.getElementById('dep-controls').classList.add('visible');

    if (!depGraph) {
      document.getElementById('status').textContent = 'Analyzing dependencies...';
      vscode.postMessage({ command: 'getDependencies' });
    } else {
      renderDepGraph();
      renderAntiPatterns();
      applyPersistentIssueHighlights();
      // Restore current selection
      if (currentHighlightedFiles.length > 0) {
        highlightIssueFiles(currentHighlightedFiles);
      }
    }
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
    document.getElementById('status').textContent = depGraph.antiPatterns.length + ' anti-patterns found';
    renderDepGraph();
    renderAntiPatterns();
    applyPersistentIssueHighlights();
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
renderAntiPatterns();
applyPersistentIssueHighlights();
renderFooterStats();

// Auto-highlight all issue files on initial load
if (initialAntiPatterns && initialAntiPatterns.length > 0) {
  const activePatterns = initialAntiPatterns.filter(ap => !isPatternIgnored(ap));
  const allFiles = activePatterns.flatMap(ap => ap.files);
  if (allFiles.length > 0) {
    selectedElement = document.getElementById('status');
    highlightIssueFiles(allFiles);
  }
}

// Status button click - highlight all active (non-ignored) anti-pattern files
document.getElementById('status').addEventListener('click', () => {
  // Reset previous selection and track new one
  if (selectedElement) {
    selectedElement.style.borderLeftColor = '';
    selectedElement.style.background = '';
  }
  const statusBtn = document.getElementById('status');
  selectedElement = statusBtn;
  const allAntiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;
  const activePatterns = allAntiPatterns ? allAntiPatterns.filter(ap => !isPatternIgnored(ap)) : [];
  const allFiles = activePatterns.flatMap(ap => ap.files);
  highlightIssueFiles(allFiles);
});

// JavaScript-driven color cycling for issue highlights
// Smooth sine-wave rainbow cycle (inspired by GLSL shader)
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
  // Smooth rainbow: cycle hue over time (360° in 10 seconds at 60fps)
  cycleTime += 0.016;  // ~16ms in seconds per frame
  const hue = (cycleTime * 36) % 360;  // 36°/sec = 360° in 10sec
  const color = hslToHex(hue, 0.85, 0.6);  // 85% saturation, 60% lightness

  // Pulsing opacity: sine wave, period 2000ms (slow gentle pulse)
  const pulsePhase = (cycleTime * 1000 / 2000) * 2 * Math.PI;
  const alpha = 0.6 + 0.4 * Math.sin(pulsePhase);  // 0.2 to 1.0
  const ribbonAlpha = 0.3 + 0.2 * Math.sin(pulsePhase);  // 0.1 to 0.5

  // Cycle highlighted treemap nodes
  document.querySelectorAll('.node.highlighted').forEach(node => {
    node.style.setProperty('fill', color, 'important');
    node.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  // Cycle highlighted chord arcs
  document.querySelectorAll('.chord-arc.highlighted').forEach(arc => {
    arc.style.setProperty('fill', color, 'important');
    arc.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  // Cycle highlighted chord ribbons
  document.querySelectorAll('.chord-ribbon.highlighted').forEach(ribbon => {
    ribbon.style.setProperty('fill', color, 'important');
    ribbon.style.setProperty('fill-opacity', ribbonAlpha.toString(), 'important');
  });

  // Cycle the selected sidebar button
  if (selectedElement && selectedElement.isConnected) {
    const bgColor = color.replace('#', 'rgba(')
      .replace(/(..)(..)(..)/, (_, r, g, b) =>
        parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',0.2)');
    selectedElement.style.borderLeftColor = color;
    selectedElement.style.background = bgColor;
  }
}

// Run animation at 60fps (16ms)
setInterval(cycleIssueColors, 16);
`;
