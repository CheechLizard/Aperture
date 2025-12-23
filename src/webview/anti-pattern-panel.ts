export const ANTI_PATTERN_PANEL_SCRIPT = `
// Issue view mapping - determines which view to show for each rule
const ISSUE_VIEW_MAP = {
  // Functions treemap
  'long-function': 'functions',
  'deep-nesting': 'functions',
  'too-many-parameters': 'functions',
  'silent-failure': 'functions',
  'generic-name': 'functions',
  'non-verb-function': 'functions',
  'non-question-boolean': 'functions',
  'magic-number': 'functions',
  'commented-code': 'functions',
  // Files treemap
  'long-file': 'files',
  'orphan-file': 'files',
  'mixed-concerns': 'files',
  'high-comment-density': 'files',
  // Chord diagram
  'circular-dependency': 'chord',
  'hub-file': 'chord',
};

// File-level rule IDs (shown on Files treemap)
const FILE_RULES = new Set(['long-file', 'mixed-concerns', 'orphan-file', 'high-comment-density']);

// Architecture rule IDs (graph-level, shown on Chord diagram)
const ARCHITECTURE_RULES = new Set(['circular-dependency', 'hub-file']);

// selectedRuleId and colorMode are global variables (set in event-handlers.ts)

function getExpandedState() {
  const state = { groups: new Set(), ignored: false, categories: new Set() };
  document.querySelectorAll('.pattern-group').forEach(group => {
    if (group.querySelector('.pattern-items.expanded')) {
      state.groups.add(group.getAttribute('data-type'));
    }
  });
  document.querySelectorAll('.issue-category').forEach(cat => {
    if (cat.querySelector('.issue-category-items.expanded')) {
      state.categories.add(cat.getAttribute('data-category'));
    }
  });
  const ignoredItems = document.querySelector('.ignored-items');
  if (ignoredItems && ignoredItems.classList.contains('expanded')) {
    state.ignored = true;
  }
  return state;
}

function restoreExpandedState(state) {
  document.querySelectorAll('.pattern-group').forEach(group => {
    const type = group.getAttribute('data-type');
    if (state.groups.has(type)) {
      group.querySelector('.pattern-chevron').classList.add('expanded');
      group.querySelector('.pattern-items').classList.add('expanded');
    }
  });
  document.querySelectorAll('.issue-category').forEach(cat => {
    const category = cat.getAttribute('data-category');
    if (state.categories.has(category)) {
      cat.querySelector('.issue-category-chevron').classList.add('expanded');
      cat.querySelector('.issue-category-items').classList.add('expanded');
    }
  });
  if (state.ignored) {
    const ignoredHeader = document.querySelector('.ignored-header');
    if (ignoredHeader) {
      ignoredHeader.querySelector('.pattern-chevron').classList.add('expanded');
      ignoredHeader.nextElementSibling.classList.add('expanded');
    }
  }
}

function switchToView(ruleId) {
  const view = ISSUE_VIEW_MAP[ruleId] || 'files';
  selectedRuleId = ruleId;

  // Switch visualization
  if (view === 'functions') {
    currentView = 'functions';
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('dep-controls').classList.remove('visible');
    document.getElementById('functions-container').classList.add('visible');
    document.getElementById('legend').style.display = 'flex';
    // Trigger zoom out animation if currently zoomed
    if (zoomedFile) {
      prevZoomedFile = zoomedFile;
      zoomedFile = null;
    }
    renderDistributionChart();
  } else if (view === 'chord') {
    currentView = 'deps';
    document.getElementById('treemap').style.display = 'none';
    document.getElementById('functions-container').classList.remove('visible');
    document.getElementById('dep-container').style.display = 'block';
    document.getElementById('dep-controls').classList.add('visible');
    document.getElementById('legend').style.display = 'none';
    if (!depGraph) {
      document.getElementById('status').textContent = 'Analyzing dependencies...';
      vscode.postMessage({ command: 'getDependencies' });
    } else {
      renderDepGraph();
    }
  } else {
    // files view
    currentView = 'treemap';
    document.getElementById('functions-container').classList.remove('visible');
    document.getElementById('dep-container').style.display = 'none';
    document.getElementById('dep-controls').classList.remove('visible');
    document.getElementById('treemap').style.display = 'block';
    document.getElementById('legend').style.display = 'flex';
    render();
    renderTreemapLegend();
  }
}

function renderIssues() {
  const list = document.getElementById('anti-pattern-list');

  // Filter out ignored issues
  const activeIssues = issues.filter(issue => !isIssueIgnored(issue));

  if (activeIssues.length === 0 && ignoredIssues.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  buildIssueFileMap();

  // Group issues by ruleId
  const groups = new Map();
  const severityOrder = { high: 0, medium: 1, low: 2 };

  for (const issue of activeIssues) {
    if (!groups.has(issue.ruleId)) {
      groups.set(issue.ruleId, { ruleId: issue.ruleId, items: [] });
    }
    groups.get(issue.ruleId).items.push(issue);
  }

  // Calculate max severity for each group and sort items within each group
  for (const group of groups.values()) {
    group.items.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
    group.severity = group.items.length > 0 ? group.items[0].severity : 'low';
  }

  const sortedGroups = [...groups.values()].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Split into code, file, and architecture issues
  const codeGroups = sortedGroups.filter(g => !FILE_RULES.has(g.ruleId) && !ARCHITECTURE_RULES.has(g.ruleId));
  const fileGroups = sortedGroups.filter(g => FILE_RULES.has(g.ruleId));
  const archGroups = sortedGroups.filter(g => ARCHITECTURE_RULES.has(g.ruleId));

  // Format rule ID for display (e.g., "long-function" → "Long Function")
  function formatRuleId(ruleId) {
    return ruleId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  function renderGroupsHtml(groupList) {
    return groupList.map((group, gIdx) => {
    const isRuleActive = activeRules.has(group.ruleId);

    // Get all files from all locations
    const allFiles = group.items.flatMap(item => item.locations.map(loc => loc.file));

    const itemsHtml = group.items.map((item, iIdx) => {
      const filesData = item.locations.map(loc => loc.file).join(',');
      const firstLoc = item.locations[0];
      const fileName = firstLoc.file.split('/').pop();
      const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';

      return '<div class="pattern-item ' + item.severity + '" data-files="' + filesData + '" data-line="' + (firstLoc.line || '') + '" data-rule-id="' + item.ruleId + '" data-message="' + item.message.replace(/"/g, '&quot;') + '">' +
        '<div class="pattern-item-row"><div class="pattern-item-content">' +
        '<div class="pattern-item-desc">' + item.message + '</div>' +
        '<div class="pattern-item-file">' + fileName + lineInfo + '</div></div>' +
        '<button class="pattern-ignore-btn" title="Ignore this item"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div></div>';
    }).join('');

    return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.ruleId + '">' +
      '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-type="' + group.ruleId + '">' +
      '<span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span><span class="pattern-title">' + formatRuleId(group.ruleId) + '</span>' +
      '<span class="pattern-count">' + group.items.length + '</span><span class="pattern-spacer"></span>' +
      '<button class="pattern-rules-toggle' + (isRuleActive ? ' active' : '') + '" title="' + (isRuleActive ? 'Remove from' : 'Add to') + ' CLAUDE.md rules">' + (isRuleActive ? '- rule' : '+ rule') + '</button></div>' +
      '<div class="pattern-items">' + itemsHtml + '</div></div>';
    }).join('');
  }

  // Build category sections
  let html = '';

  // Code Issues section (function-level, shown on Functions treemap)
  if (codeGroups.length > 0) {
    const codeCount = codeGroups.reduce((sum, g) => sum + g.items.length, 0);
    html += '<div class="issue-category" data-category="code">' +
      '<div class="issue-category-header"><span class="issue-category-chevron expanded">▶</span>Code Issues (' + codeCount + ')</div>' +
      '<div class="issue-category-items expanded">' + renderGroupsHtml(codeGroups) + '</div></div>';
  }

  // File Issues section (file-level, shown on Files treemap)
  if (fileGroups.length > 0) {
    const fileCount = fileGroups.reduce((sum, g) => sum + g.items.length, 0);
    html += '<div class="issue-category" data-category="file">' +
      '<div class="issue-category-header"><span class="issue-category-chevron expanded">▶</span>File Issues (' + fileCount + ')</div>' +
      '<div class="issue-category-items expanded">' + renderGroupsHtml(fileGroups) + '</div></div>';
  }

  // Architecture Issues section (graph-level, shown on Chord diagram)
  if (archGroups.length > 0) {
    const archCount = archGroups.reduce((sum, g) => sum + g.items.length, 0);
    html += '<div class="issue-category" data-category="architecture">' +
      '<div class="issue-category-header"><span class="issue-category-chevron expanded">▶</span>Architecture Issues (' + archCount + ')</div>' +
      '<div class="issue-category-items expanded">' + renderGroupsHtml(archGroups) + '</div></div>';
  }

  // Ignored section
  if (ignoredIssues.length > 0) {
    const ignoredHtml = ignoredIssues.map((item, idx) => {
      const firstLoc = item.locations[0];
      const fileName = firstLoc.file.split('/').pop();
      const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';
      return '<div class="ignored-item" data-idx="' + idx + '"><span>' + formatRuleId(item.ruleId) + ': ' + fileName + lineInfo + '</span>' +
        '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
    }).join('');
    html += '<div class="ignored-section"><div class="ignored-header"><span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
      '<span>Ignored items (' + ignoredIssues.length + ')</span></div><div class="ignored-items">' + ignoredHtml + '</div></div>';
  }

  list.innerHTML = html;

  // Handle category header clicks (expand/collapse)
  list.querySelectorAll('.issue-category-header').forEach(header => {
    header.addEventListener('click', () => {
      const chevron = header.querySelector('.issue-category-chevron');
      const items = header.nextElementSibling;
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
    });
  });

  // Handle chevron clicks (expand/collapse only)
  list.querySelectorAll('.pattern-header .pattern-chevron').forEach(chevron => {
    const group = chevron.closest('.pattern-group');
    const items = group.querySelector('.pattern-items');
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
    });
  });

  // Handle header clicks (select/highlight and switch view)
  list.querySelectorAll('.pattern-header').forEach(header => {
    const files = header.getAttribute('data-files').split(',').filter(f => f);
    const ruleId = header.getAttribute('data-type');
    header.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-chevron')) return;
      if (e.target.classList.contains('pattern-rules-toggle')) return;
      if (selectedElement) { selectedElement.style.borderLeftColor = ''; selectedElement.style.background = ''; }
      selectedElement = header;
      // Switch to appropriate view and coloring
      switchToView(ruleId);
      highlightIssueFiles(files);
    });
  });

  // Handle rules toggle clicks
  list.querySelectorAll('.pattern-rules-toggle').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const header = btn.closest('.pattern-header');
      const ruleId = header.getAttribute('data-type');
      const isActive = btn.classList.contains('active');
      if (isActive) {
        activeRules.delete(ruleId);
        btn.classList.remove('active');
        btn.textContent = '+ rule';
        btn.title = 'Add to CLAUDE.md rules';
        vscode.postMessage({ command: 'removeRule', patternType: ruleId });
      } else {
        activeRules.add(ruleId);
        btn.classList.add('active');
        btn.textContent = '- rule';
        btn.title = 'Remove from CLAUDE.md rules';
        vscode.postMessage({ command: 'addRule', patternType: ruleId });
      }
    });
  });

  // Handle individual item clicks (entire row, excluding ignore button)
  list.querySelectorAll('.pattern-item').forEach(item => {
    const files = item.getAttribute('data-files').split(',').filter(f => f);
    const line = item.getAttribute('data-line');
    const ruleId = item.getAttribute('data-rule-id');
    item.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-ignore-btn')) return;
      e.stopPropagation();
      // Switch to appropriate view for this rule type
      switchToView(ruleId);
      highlightIssueFiles(files);
      if (files.length > 0) {
        const lineNum = line ? parseInt(line) : undefined;
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + files[0], line: lineNum });
      }
    });
  });

  // Handle ignore button clicks
  list.querySelectorAll('.pattern-ignore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.pattern-item');
      const ruleId = item.getAttribute('data-rule-id');
      const message = item.getAttribute('data-message');
      const filesStr = item.getAttribute('data-files');
      const line = item.getAttribute('data-line');

      // Find the matching issue and add to ignored
      const issueToIgnore = issues.find(i =>
        i.ruleId === ruleId &&
        i.message === message &&
        i.locations.map(l => l.file).join(',') === filesStr
      );
      if (issueToIgnore) {
        ignoredIssues.push(issueToIgnore);
      }

      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      const wasStatusSelected = selectedElement && selectedElement.id === 'status';

      const expandedState = getExpandedState();
      renderIssues();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();

      if (selectedType) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
        if (newHeader) selectedElement = newHeader;
      } else if (wasStatusSelected) {
        selectedElement = document.getElementById('status');
      }

      const currentHighlighted = [...document.querySelectorAll('.node.highlighted')].map(n => n.getAttribute('data-path'));
      const stillValid = currentHighlighted.filter(f => issueFileMap.has(f));
      highlightIssueFiles(stillValid);
    });
  });

  // Handle ignored section
  const ignoredHeader = list.querySelector('.ignored-header');
  if (ignoredHeader) {
    ignoredHeader.addEventListener('click', () => {
      const chevron = ignoredHeader.querySelector('.pattern-chevron');
      const items = ignoredHeader.nextElementSibling;
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
    });
  }

  // Handle restore button clicks
  list.querySelectorAll('.ignored-item-restore').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.ignored-item');
      const idx = parseInt(item.getAttribute('data-idx'));
      const restoredRuleId = ignoredIssues[idx].ruleId;

      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      const wasStatusSelected = selectedElement && selectedElement.id === 'status';

      ignoredIssues.splice(idx, 1);

      const expandedState = getExpandedState();
      renderIssues();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();

      if (wasStatusSelected) {
        selectedElement = document.getElementById('status');
      } else if (selectedType && selectedType !== restoredRuleId) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
        if (newHeader) selectedElement = newHeader;
      }

      if (selectedType === restoredRuleId) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + restoredRuleId + '"]');
        if (newHeader) {
          selectedElement = newHeader;
          const allFiles = newHeader.getAttribute('data-files').split(',').filter(f => f);
          highlightIssueFiles(allFiles);
          return;
        }
      }

      const currentHighlighted = [...document.querySelectorAll('.node.highlighted')].map(n => n.getAttribute('data-path'));
      const stillValid = currentHighlighted.filter(f => issueFileMap.has(f));
      highlightIssueFiles(stillValid);
    });
  });
}

// Alias for backwards compatibility
function renderAntiPatterns() { renderIssues(); }
`;
