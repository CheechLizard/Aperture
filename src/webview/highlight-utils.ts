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

// Track pending prompt token counts
let pendingPrompts = [];
let promptIdCounter = 0;

// Generate context variants for graceful degradation
function getContextVariants(fullContext) {
  const variants = [];

  // 1. Full context (best case)
  variants.push({
    label: null,
    context: fullContext
  });

  // 2. High severity files only
  const highSevFiles = getHighSeverityFiles(fullContext.files);
  if (highSevFiles.length > 0 && highSevFiles.length < fullContext.files.length) {
    const highSevIssues = fullContext.issues.filter(i =>
      i.severity === 'high' && i.locations.some(l => highSevFiles.includes(l.file))
    );
    variants.push({
      label: ' (high severity only)',
      context: { ...fullContext, files: highSevFiles, issues: highSevIssues }
    });
  }

  // 3. First 5 files
  if (fullContext.files.length > 5) {
    const first5 = fullContext.files.slice(0, 5);
    const first5Issues = fullContext.issues.filter(i =>
      i.locations.some(l => first5.includes(l.file))
    );
    variants.push({
      label: ' (5 files)',
      context: { ...fullContext, files: first5, issues: first5Issues }
    });
  }

  // 4. First 1 file
  if (fullContext.files.length > 1) {
    const first1 = fullContext.files.slice(0, 1);
    const first1Issues = fullContext.issues.filter(i =>
      i.locations.some(l => first1.includes(l.file))
    );
    variants.push({
      label: ' (1 file)',
      context: { ...fullContext, files: first1, issues: first1Issues }
    });
  }

  return variants;
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

  // No prompts to show
  if (prompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">No issues detected</span>';
    return;
  }

  // Show spinner while costing prompts
  container.innerHTML = '<div class="prompt-loading"><div class="thinking-spinner"></div><span style="font-size:0.8em;opacity:0.7;">Costing prompts...</span></div>';

  // Get full context and generate variants for graceful degradation
  const fullContext = selection.getAIContext();
  const variants = getContextVariants(fullContext);

  // Assign IDs and create pending prompts for ALL variants of each prompt
  pendingPrompts = [];
  for (const p of prompts) {
    const baseId = 'prompt-' + (++promptIdCounter);
    for (let i = 0; i < variants.length; i++) {
      pendingPrompts.push({
        ...p,
        baseId: baseId,
        variantIndex: i,
        variantLabel: variants[i].label,
        variantContext: variants[i].context,
        id: baseId + '-v' + i,
        tokens: null,
        tooExpensive: false
      });
    }
  }

  // Request token counts for all variants
  for (const p of pendingPrompts) {
    vscode.postMessage({
      command: 'countTokens',
      text: p.prompt,
      context: p.variantContext,
      promptId: p.id
    });
  }
}

// Called when a token count response comes back
function handleTokenCount(promptId, tokens, limit) {
  const prompt = pendingPrompts.find(p => p.id === promptId);
  if (!prompt) return;

  prompt.tokens = tokens;
  prompt.tooExpensive = tokens > limit;

  // Check if all prompts have been costed
  const allCosted = pendingPrompts.every(p => p.tokens !== null);
  if (allCosted) {
    renderCostdPrompts();
  }
}

// Render prompts after costing - pick best affordable variant for each
function renderCostdPrompts() {
  const container = document.getElementById('rules');

  // Group by base prompt ID
  const byPrompt = {};
  for (const p of pendingPrompts) {
    if (!byPrompt[p.baseId]) byPrompt[p.baseId] = [];
    byPrompt[p.baseId].push(p);
  }

  // For each prompt, find first affordable variant (ordered best→worst)
  const affordablePrompts = [];
  const usedHighSeverityVariant = new Set(); // Track which rules used high severity degradation

  for (const variants of Object.values(byPrompt)) {
    variants.sort((a, b) => a.variantIndex - b.variantIndex);
    const affordable = variants.find(v => !v.tooExpensive);
    if (affordable) {
      // Build display label based on variant
      let displayLabel = affordable.label;

      if (affordable.variantLabel) {
        // If degraded to high severity, update the issue count in label
        if (affordable.variantLabel.includes('high severity')) {
          const highSevIssueCount = affordable.variantContext.issues.length;
          // Replace the count in the label with high severity count
          // "Analyze 175 Long Function issues" → "Analyze 14 high severity Long Function issues"
          displayLabel = displayLabel.replace(/\\d+/, highSevIssueCount + ' high severity');
          usedHighSeverityVariant.add(affordable.baseId);
        } else {
          // For other variants (5 files, 1 file), append the suffix
          displayLabel += affordable.variantLabel;
        }
      }
      // File count is shown in chips below, not needed in button

      // Skip "Focus on high severity" buttons if we already degraded another prompt to high severity
      if (affordable.action === 'filter-high-severity') {
        continue; // Degradation handles this, don't show duplicate
      }

      affordablePrompts.push({
        ...affordable,
        displayLabel: displayLabel
      });
    }
  }

  if (affordablePrompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">Context too large for prompts</span>';
    return;
  }

  container.innerHTML = affordablePrompts.map(p =>
    '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '"' +
    ' data-prompt-id="' + p.id + '"' +
    ' data-variant-files="' + encodeURIComponent(JSON.stringify(p.variantContext.files)) + '"' +
    (p.action ? ' data-action="' + p.action + '"' : '') +
    '>' + p.displayLabel + '</button>'
  ).join('');

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // If this is a degraded variant, update selection to match
      const variantFilesData = btn.getAttribute('data-variant-files');
      if (variantFilesData) {
        const variantFiles = JSON.parse(decodeURIComponent(variantFilesData));
        selection.setFocus(variantFiles);
      }

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
