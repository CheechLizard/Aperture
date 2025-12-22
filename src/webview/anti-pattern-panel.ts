export const ANTI_PATTERN_PANEL_SCRIPT = `
function getExpandedState() {
  const state = { groups: new Set(), ignored: false };
  document.querySelectorAll('.pattern-group').forEach(group => {
    if (group.querySelector('.pattern-items.expanded')) {
      state.groups.add(group.getAttribute('data-type'));
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
  if (state.ignored) {
    const ignoredHeader = document.querySelector('.ignored-header');
    if (ignoredHeader) {
      ignoredHeader.querySelector('.pattern-chevron').classList.add('expanded');
      ignoredHeader.nextElementSibling.classList.add('expanded');
    }
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

  // Format rule ID for display (e.g., "long-function" → "Long Function")
  function formatRuleId(ruleId) {
    return ruleId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  let html = sortedGroups.map((group, gIdx) => {
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

  // Handle header clicks (select/highlight only, no expand)
  list.querySelectorAll('.pattern-header').forEach(header => {
    const files = header.getAttribute('data-files').split(',').filter(f => f);
    header.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-chevron')) return;
      if (e.target.classList.contains('pattern-rules-toggle')) return;
      if (selectedElement) { selectedElement.style.borderLeftColor = ''; selectedElement.style.background = ''; }
      selectedElement = header;
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
    item.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-ignore-btn')) return;
      e.stopPropagation();
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
