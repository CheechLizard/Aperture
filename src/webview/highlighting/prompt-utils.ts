export const PROMPT_UTILS_SCRIPT = `
// Dynamic prompt generation and rendering for AI analysis

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

  // 2. High severity files only - skip if no high severity issues
  const highSevFiles = getHighSeverityFiles(fullContext.files);
  const highSevIssues = fullContext.issues.filter(i =>
    i.severity === 'high' && i.locations.some(l => highSevFiles.includes(l.file))
  );
  if (highSevIssues.length > 0 && highSevFiles.length < fullContext.files.length) {
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
    // Scenario 3: Files selected via status button but no specific rule
    // No prompts shown - too broad, user should select a specific issue type
  } else {
    // Scenario 4: Nothing selected (initial state)
    // No prompts shown - user should select issues or files first
  }

  // No prompts to show
  if (prompts.length === 0) {
    const hasIssues = activeIssues.length > 0;
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">' +
      (hasIssues ? 'Select an issue type to analyze' : 'No issues detected') + '</span>';
    return;
  }

  // Show spinner while costing prompts
  container.innerHTML = '<div class="prompt-loading"><div class="thinking-spinner"></div><span style="font-size:0.8em;opacity:0.7;">Costing prompts...</span></div>';

  // Get preview context (based on current selection) for prompt costing
  const fullContext = selection.getPreviewContext();
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
      // Get original issue count from full variant (variantIndex=0)
      const fullVariant = variants.find(v => v.variantIndex === 0);
      const totalIssues = fullVariant ? fullVariant.variantContext.issues.length : affordable.variantContext.issues.length;

      if (affordable.variantLabel) {
        // If degraded to high severity, update the issue count in label
        if (affordable.variantLabel.includes('high severity')) {
          const highSevIssueCount = affordable.variantContext.issues.length;
          // Replace the count in the label with high severity count
          // "Analyze 175 Long Function issues" → "Analyze 14 high severity Long Function issues"
          displayLabel = displayLabel.replace(/\\d+/, highSevIssueCount + ' high severity');
          usedHighSeverityVariant.add(affordable.baseId);
        } else if (affordable.variantLabel.includes('file')) {
          // For file-limited variants (5 files, 1 file), show "Analyze the first X files"
          const fileCount = affordable.variantContext.files.length;
          displayLabel = 'Analyze the first ' + fileCount + ' file' + (fileCount === 1 ? '' : 's');
        }
      }
      // Track total issues for "(X of Y)" chip display

      // Skip "Focus on high severity" buttons if we already degraded another prompt to high severity
      if (affordable.action === 'filter-high-severity') {
        continue; // Degradation handles this, don't show duplicate
      }

      affordablePrompts.push({
        ...affordable,
        displayLabel: displayLabel,
        totalIssues: totalIssues,
        isFileLimited: affordable.variantLabel && affordable.variantLabel.includes('file')
      });
    }
  }

  if (affordablePrompts.length === 0) {
    container.innerHTML = '<span style="color:var(--vscode-descriptionForeground);font-size:0.85em;">Context too large for prompts</span>';
    return;
  }

  container.innerHTML = affordablePrompts.map(p => {
    const fileCount = p.variantContext.files.length;
    // For file-limited variants, show "(X of Y)" where X=files, Y=total issues
    const fileLabel = p.isFileLimited
      ? fileCount + ' of ' + p.totalIssues
      : (fileCount === 1 ? '1 file' : fileCount + ' files');
    return '<button class="rule-btn" data-prompt="' + p.prompt.replace(/"/g, '&quot;') + '"' +
      ' data-prompt-id="' + p.id + '"' +
      ' data-variant-files="' + encodeURIComponent(JSON.stringify(p.variantContext.files)) + '"' +
      ' data-variant-issues="' + encodeURIComponent(JSON.stringify(p.variantContext.issues)) + '"' +
      '>' + p.displayLabel + ' <span class="file-count">(' + fileLabel + ')</span></button>';
  }).join('');

  container.querySelectorAll('.rule-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Attach context files and issues (commits them for sending)
      const variantFilesData = btn.getAttribute('data-variant-files');
      const variantIssuesData = btn.getAttribute('data-variant-issues');
      if (variantFilesData) {
        const variantFiles = JSON.parse(decodeURIComponent(variantFilesData));
        const variantIssues = variantIssuesData ? JSON.parse(decodeURIComponent(variantIssuesData)) : [];
        selection.attachContext(variantFiles, variantIssues);
      }

      const prompt = btn.getAttribute('data-prompt');
      const input = document.getElementById('query');
      input.value = prompt;
      input.focus();
    });
  });
}
`;
