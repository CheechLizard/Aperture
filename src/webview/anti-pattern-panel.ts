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

function renderAntiPatterns() {
  const list = document.getElementById('anti-pattern-list');
  const allAntiPatterns = depGraph ? depGraph.antiPatterns : initialAntiPatterns;
  const antiPatterns = allAntiPatterns ? allAntiPatterns.filter(ap => !isPatternIgnored(ap)) : [];

  // Get file issues
  const allFileIssues = typeof fileIssues !== 'undefined' ? fileIssues : [];
  const activeFileIssues = allFileIssues.filter(i => !isFileIssueIgnored(i));

  if (antiPatterns.length === 0 && activeFileIssues.length === 0 && ignoredPatterns.length === 0 && ignoredFileIssues.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  if (depGraph) { buildIssueFileMap(); }

  // Group anti-patterns by type
  const groups = new Map();
  for (const ap of antiPatterns) {
    if (!groups.has(ap.type)) { groups.set(ap.type, { type: ap.type, severity: ap.severity, items: [], isFileIssue: false }); }
    groups.get(ap.type).items.push(ap);
  }

  // Add file issues as groups (convert severity: error→high, warning→medium, info→low)
  const severityMap = { error: 'high', warning: 'medium', info: 'low' };
  for (const issue of activeFileIssues) {
    const type = issue.ruleId;
    const severity = severityMap[issue.severity] || 'low';
    if (!groups.has(type)) { groups.set(type, { type: type, severity: severity, items: [], isFileIssue: true }); }
    groups.get(type).items.push(issue);
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedGroups = [...groups.values()].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  // Format rule ID for display (e.g., "long-function" → "Long Function")
  function formatType(type) {
    return type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  let html = sortedGroups.map((group, gIdx) => {
    const isRuleActive = activeRules.has(group.type);
    let allFiles, itemsHtml;

    if (group.isFileIssue) {
      // File issues: each item has file, line, message
      allFiles = group.items.map(item => item.file);
      itemsHtml = group.items.map((item, iIdx) => {
        const fileName = item.file.split('/').pop();
        const lineInfo = item.line ? ':' + item.line : '';
        return '<div class="pattern-item" data-files="' + item.file + '" data-line="' + (item.line || '') + '" data-type="' + group.type + '" data-description="' + item.message.replace(/"/g, '&quot;') + '" data-is-file-issue="true">' +
          '<div class="pattern-item-row"><div class="pattern-item-content">' +
          '<div class="pattern-item-desc">' + item.message + '</div>' +
          '<div class="pattern-item-file">' + fileName + lineInfo + '</div></div>' +
          '<button class="pattern-ignore-btn" title="Ignore this item">&#10005;</button></div></div>';
      }).join('');
    } else {
      // Anti-patterns: each item has files array, description
      allFiles = group.items.flatMap(item => item.files);
      itemsHtml = group.items.map((item, iIdx) => {
        const fileName = item.files.map(f => f.split('/').pop()).join(', ');
        const filesData = item.files.join(',');
        return '<div class="pattern-item" data-files="' + filesData + '" data-type="' + item.type + '" data-description="' + item.description.replace(/"/g, '&quot;') + '">' +
          '<div class="pattern-item-row"><div class="pattern-item-content">' +
          '<div class="pattern-item-desc">' + item.description + '</div>' +
          '<div class="pattern-item-file">' + fileName + '</div></div>' +
          '<button class="pattern-ignore-btn" title="Ignore this item">&#10005;</button></div></div>';
      }).join('');
    }

    return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.type + '" data-is-file-issue="' + group.isFileIssue + '">' +
      '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-severity="' + group.severity + '" data-type="' + group.type + '">' +
      '<span class="pattern-chevron">&#9654;</span><span class="pattern-title">' + formatType(group.type) + '</span>' +
      '<span class="pattern-count">' + group.items.length + '</span><span class="pattern-spacer"></span>' +
      '<button class="pattern-rules-toggle' + (isRuleActive ? ' active' : '') + '" title="' + (isRuleActive ? 'Remove from' : 'Add to') + ' CLAUDE.md rules">' + (isRuleActive ? '- rule' : '+ rule') + '</button></div>' +
      '<div class="pattern-items">' + itemsHtml + '</div></div>';
  }).join('');

  // Combine ignored anti-patterns and file issues
  const totalIgnored = ignoredPatterns.length + ignoredFileIssues.length;
  if (totalIgnored > 0) {
    let ignoredHtml = ignoredPatterns.map((item, idx) => {
      const fileName = item.files.map(f => f.split('/').pop()).join(', ');
      return '<div class="ignored-item" data-idx="' + idx + '" data-is-file-issue="false"><span>' + formatType(item.type) + ': ' + fileName + '</span>' +
        '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
    }).join('');
    ignoredHtml += ignoredFileIssues.map((item, idx) => {
      const fileName = item.file.split('/').pop();
      const lineInfo = item.line ? ':' + item.line : '';
      return '<div class="ignored-item" data-idx="' + idx + '" data-is-file-issue="true"><span>' + formatType(item.ruleId) + ': ' + fileName + lineInfo + '</span>' +
        '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
    }).join('');
    html += '<div class="ignored-section"><div class="ignored-header"><span class="pattern-chevron">&#9654;</span>' +
      '<span>Ignored items (' + totalIgnored + ')</span></div><div class="ignored-items">' + ignoredHtml + '</div></div>';
  }

  list.innerHTML = html;

  // Handle header clicks
  list.querySelectorAll('.pattern-header').forEach(header => {
    const files = header.getAttribute('data-files').split(',').filter(f => f);
    const group = header.closest('.pattern-group');
    const chevron = header.querySelector('.pattern-chevron');
    const items = group.querySelector('.pattern-items');
    header.addEventListener('click', (e) => {
      if (e.target.classList.contains('pattern-rules-toggle')) return;
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
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
      const patternType = header.getAttribute('data-type');
      const isActive = btn.classList.contains('active');
      if (isActive) {
        activeRules.delete(patternType);
        btn.classList.remove('active');
        btn.textContent = '+ rule';
        btn.title = 'Add to CLAUDE.md rules';
        vscode.postMessage({ command: 'removeRule', patternType: patternType });
      } else {
        activeRules.add(patternType);
        btn.classList.add('active');
        btn.textContent = '- rule';
        btn.title = 'Remove from CLAUDE.md rules';
        vscode.postMessage({ command: 'addRule', patternType: patternType });
      }
    });
  });

  // Handle individual item clicks
  list.querySelectorAll('.pattern-item').forEach(item => {
    const files = item.getAttribute('data-files').split(',').filter(f => f);
    const line = item.getAttribute('data-line');
    const content = item.querySelector('.pattern-item-content');
    content.addEventListener('click', (e) => {
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
      const isFileIssue = item.getAttribute('data-is-file-issue') === 'true';
      const type = item.getAttribute('data-type');
      const description = item.getAttribute('data-description');

      // Save selected element type before DOM rebuild
      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      const wasStatusSelected = selectedElement && selectedElement.id === 'status';

      if (isFileIssue) {
        const file = item.getAttribute('data-files');
        const line = item.getAttribute('data-line');
        ignoredFileIssues.push({ ruleId: type, file, line, message: description });
      } else {
        const files = item.getAttribute('data-files').split(',').filter(f => f);
        ignoredPatterns.push({ type, files, description });
      }

      const expandedState = getExpandedState();
      renderAntiPatterns();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();

      // Restore selectedElement reference after DOM rebuild
      if (selectedType) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
        if (newHeader) selectedElement = newHeader;
      } else if (wasStatusSelected) {
        selectedElement = document.getElementById('status');
      }

      // Update selection: keep only files still in issueFileMap
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
      const isFileIssue = item.getAttribute('data-is-file-issue') === 'true';
      const restoredType = isFileIssue ? ignoredFileIssues[idx].ruleId : ignoredPatterns[idx].type;

      // Check if a pattern header of the same type is currently selected
      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      const wasStatusSelected = selectedElement && selectedElement.id === 'status';

      if (isFileIssue) {
        ignoredFileIssues.splice(idx, 1);
      } else {
        ignoredPatterns.splice(idx, 1);
      }

      const expandedState = getExpandedState();
      renderAntiPatterns();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();

      // Restore selectedElement reference after DOM rebuild
      if (wasStatusSelected) {
        selectedElement = document.getElementById('status');
      } else if (selectedType && selectedType !== restoredType) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + selectedType + '"]');
        if (newHeader) selectedElement = newHeader;
      }

      // If restored item's type matches selected type, re-select the group
      if (selectedType === restoredType) {
        const newHeader = document.querySelector('.pattern-header[data-type="' + restoredType + '"]');
        if (newHeader) {
          selectedElement = newHeader;
          const allFiles = newHeader.getAttribute('data-files').split(',').filter(f => f);
          highlightIssueFiles(allFiles);
          return;
        }
      }

      // Otherwise keep current highlights, filtering out invalid
      const currentHighlighted = [...document.querySelectorAll('.node.highlighted')].map(n => n.getAttribute('data-path'));
      const stillValid = currentHighlighted.filter(f => issueFileMap.has(f));
      highlightIssueFiles(stillValid);
    });
  });
}
`;
