export const HIGHLIGHT_UTILS_SCRIPT = `
function updateStatusButton() {
  updateStatus();
}

function highlightIssueFiles(files) {
  // Track for tab switching
  currentHighlightedFiles = files;

  // Clear previous highlights and reset inline styles from animation
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
    el.style.removeProperty('fill');
    el.style.removeProperty('fill-opacity');
  });

  if (files.length === 0) return;

  // Highlight matching nodes
  document.querySelectorAll('.node').forEach(node => {
    const path = node.getAttribute('data-path');
    if (files.includes(path)) {
      node.classList.add('highlighted');
    }
  });

  // Highlight chord arcs
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    if (files.includes(path)) {
      arc.classList.add('highlighted');
    }
  });

  // Highlight ribbons where source or target matches
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const from = ribbon.getAttribute('data-from');
    const to = ribbon.getAttribute('data-to');
    if (files.includes(from) || files.includes(to)) {
      ribbon.classList.add('highlighted');
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
    if (relevantFiles.includes(path)) {
      node.classList.add('highlighted');
    } else {
      node.classList.remove('highlighted');
    }
  });
  document.getElementById('clear').style.display = relevantFiles.length > 0 ? 'inline-block' : 'none';
}
`;
