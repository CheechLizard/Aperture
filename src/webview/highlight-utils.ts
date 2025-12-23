export const HIGHLIGHT_UTILS_SCRIPT = `
function updateStatusButton() {
  updateStatus();
}

// Pure DOM operation - highlights nodes matching the given file paths
function highlightNodes(files) {
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
  const state = selection.getState();
  const navState = nav.getState();
  const { ruleId, focusFiles } = state;
  const zoomedFile = navState.zoomedFile;

  const prompts = [];
  const activeIssues = issues.filter(i => !isIssueIgnored(i));

  if (ruleId && zoomedFile) {
    // Scenario 1: Rule selected + zoomed into file
    const fileName = zoomedFile.split('/').pop();

    prompts.push({
      label: 'Analyze ' + formatRuleId(ruleId) + ' in ' + fileName,
      prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues in ' + fileName
    });

    // Other issues in same file
    const otherInFile = activeIssues.filter(i =>
      i.ruleId !== ruleId &&
      i.locations.some(l => l.file === zoomedFile)
    );
    if (otherInFile.length > 0) {
      prompts.push({
        label: 'All issues in ' + fileName,
        prompt: 'Analyze all issues in ' + fileName
      });
    }

    // Same issue in other files
    const sameIssueOtherFiles = activeIssues.filter(i =>
      i.ruleId === ruleId &&
      !i.locations.some(l => l.file === zoomedFile)
    );
    if (sameIssueOtherFiles.length > 0) {
      prompts.push({
        label: 'All ' + formatRuleId(ruleId) + ' issues',
        prompt: 'Analyze all ' + formatRuleId(ruleId).toLowerCase() + ' issues in the codebase'
      });
    }

  } else if (ruleId) {
    // Scenario 2: Rule selected, not zoomed
    const ruleIssues = activeIssues.filter(i => i.ruleId === ruleId);
    const highSeverity = ruleIssues.filter(i => i.severity === 'high');

    prompts.push({
      label: 'Analyze ' + ruleIssues.length + ' ' + formatRuleId(ruleId) + ' issues',
      prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues and suggest fixes'
    });

    if (highSeverity.length > 0 && highSeverity.length < ruleIssues.length) {
      prompts.push({
        label: 'Focus on ' + highSeverity.length + ' high severity',
        prompt: 'Analyze the ' + formatRuleId(ruleId).toLowerCase() + ' issues and suggest fixes',
        action: 'filter-high-severity'
      });
    }

  } else if (focusFiles.length > 0) {
    // Scenario 3: No rule, but files selected (status button)
    const highSeverity = activeIssues.filter(i => i.severity === 'high');

    if (highSeverity.length > 0) {
      prompts.push({
        label: 'Review ' + highSeverity.length + ' high severity',
        prompt: 'Analyze the issues and suggest fixes',
        action: 'filter-high-severity'
      });
    }

    // Group by category
    const archIssues = activeIssues.filter(i => ARCHITECTURE_RULES.has(i.ruleId));
    const codeIssues = activeIssues.filter(i => !ARCHITECTURE_RULES.has(i.ruleId) && !FILE_RULES.has(i.ruleId));

    if (archIssues.length > 0) {
      prompts.push({
        label: 'Architecture issues (' + archIssues.length + ')',
        prompt: 'Analyze the architecture issues and suggest how to fix them'
      });
    }
    if (codeIssues.length > 0) {
      prompts.push({
        label: 'Code issues (' + codeIssues.length + ')',
        prompt: 'Analyze the code quality issues and suggest fixes'
      });
    }

  } else {
    // Scenario 4: Nothing selected (initial state)
    prompts.push({
      label: 'Where are the issues?',
      prompt: 'Identify which areas of the codebase have the most issues and explain why they need attention'
    });

    const highSeverity = activeIssues.filter(i => i.severity === 'high');
    if (highSeverity.length > 0) {
      prompts.push({
        label: 'High severity first',
        prompt: 'Analyze the issues and suggest fixes',
        action: 'filter-high-severity'
      });
    }
  }

  // Render prompts
  if (prompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">No issues detected</span>';
    return;
  }

  container.innerHTML = prompts.map(p =>
    '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '"' +
    (p.action ? ' data-action="' + p.action + '"' : '') +
    '>' + p.label + '</button>'
  ).join('');

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const action = btn.getAttribute('data-action');
      if (action === 'filter-high-severity') {
        selection.filterToHighSeverity();
      }
      const prompt = btn.getAttribute('data-prompt');
      const input = document.getElementById('query');
      input.value = prompt;
      input.focus();
    });
  });
}

// Handle AI response highlights (separate from user selection)
function updateHighlights(relevantFiles) {
  // AI responses temporarily override the visual highlight
  // but don't change the selection state
  highlightNodes(relevantFiles);
}
`;
