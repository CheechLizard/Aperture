export const HIGHLIGHT_UTILS_SCRIPT = `
function updateStatusButton() {
  updateStatus();
}

function highlightIssueFiles(files) {
  // Track for tab switching
  currentHighlightedFiles = files;

  // Update dynamic prompts based on new selection
  renderDynamicPrompts();

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

function renderDynamicPrompts() {
  const container = document.getElementById('rules');
  const prompts = [];

  // Get issues for currently highlighted files
  const highlightedIssues = getIssuesForFiles(currentHighlightedFiles);
  const ruleTypes = getActiveRuleTypes(currentHighlightedFiles);

  // Primary prompt - analyze all highlighted issues
  if (currentHighlightedFiles.length > 0 && highlightedIssues.length > 0) {
    prompts.push({
      label: 'Analyze ' + highlightedIssues.length + ' issues in ' + currentHighlightedFiles.length + ' files',
      prompt: 'Analyze the issues in these files and suggest fixes'
    });
  }

  // Secondary prompts based on issue types
  if (ruleTypes.has('long-function') || ruleTypes.has('deep-nesting')) {
    prompts.push({ label: 'Review function complexity', prompt: 'Review the long or complex functions and suggest how to refactor them' });
  }
  if (ruleTypes.has('circular-dependency')) {
    prompts.push({ label: 'Explain circular deps', prompt: 'Explain these circular dependencies and how to break them' });
  }
  if (ruleTypes.has('high-comment-density')) {
    prompts.push({ label: 'Evaluate comment quality', prompt: 'Evaluate the comment quality - are these comments helpful or noise?' });
  }
  if (ruleTypes.has('generic-name') || ruleTypes.has('non-verb-function') || ruleTypes.has('non-question-boolean')) {
    prompts.push({ label: 'Check naming', prompt: 'Review the naming issues and suggest better names' });
  }

  // Fallback if no specific prompts
  if (prompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">Select issues to see suggested prompts</span>';
    return;
  }

  container.innerHTML = prompts.map(p =>
    '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '">' + p.label + '</button>'
  ).join('');

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const prompt = btn.getAttribute('data-prompt');
      document.getElementById('query').value = prompt;
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
