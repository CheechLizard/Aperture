export const HIGHLIGHT_UTILS_SCRIPT = `
function isPatternIgnored(ap) {
  return ignoredPatterns.some(ignored =>
    ignored.type === ap.type &&
    ignored.description === ap.description &&
    JSON.stringify(ignored.files) === JSON.stringify(ap.files)
  );
}

function updateStatusButton() {
  const allAntiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;
  const activeCount = allAntiPatterns ? allAntiPatterns.filter(ap => !isPatternIgnored(ap)).length : 0;
  document.getElementById('status').textContent = activeCount + ' anti-patterns found';
}

function highlightIssueFiles(files) {
  // Clear previous highlights
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
  });
  document.querySelectorAll('.node.dimmed, .chord-arc.dimmed, .chord-ribbon.dimmed').forEach(el => {
    el.classList.remove('dimmed');
  });

  if (files.length === 0) return;

  // Dim all nodes and highlight matching ones
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    if (files.includes(path)) {
      node.classList.add('highlighted');
    } else {
      node.classList.add('dimmed');
    }
  });

  // Highlight chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    if (files.includes(path)) {
      arc.classList.add('highlighted');
    } else {
      arc.classList.add('dimmed');
    }
  });

  // Highlight ribbons where source or target matches
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const source = ribbon.getAttribute('data-source');
    const target = ribbon.getAttribute('data-target');
    if (files.includes(source) || files.includes(target)) {
      ribbon.classList.add('highlighted');
    } else {
      ribbon.classList.add('dimmed');
    }
  });
}

function renderRules() {
  const container = document.getElementById('rules');
  if (rules.length === 0) { container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.8em;">No CLAUDE.md rules found</span>'; return; }
  container.innerHTML = rules.map(r => '<button class="rule-btn" data-rule="' + r.title + '">' + r.title + '</button>').join('');
  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rule = btn.getAttribute('data-rule');
      document.getElementById('query').value = 'Check if the code follows the rule: "' + rule + '"';
      document.getElementById('send').click();
    });
  });
}

function updateHighlights(relevantFiles) {
  highlightedFiles = relevantFiles;
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    if (relevantFiles.length === 0) {
      node.classList.remove('dimmed', 'highlighted');
    } else if (relevantFiles.includes(path)) {
      node.classList.remove('dimmed');
      node.classList.add('highlighted');
    } else {
      node.classList.add('dimmed');
      node.classList.remove('highlighted');
    }
  });
  document.getElementById('clear').style.display = relevantFiles.length > 0 ? 'inline-block' : 'none';
}
`;
