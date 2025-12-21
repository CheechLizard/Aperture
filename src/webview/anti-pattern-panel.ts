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

  if (antiPatterns.length === 0 && ignoredPatterns.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  if (depGraph) { buildIssueFileMap(); }

  // Group anti-patterns by type
  const groups = new Map();
  for (const ap of antiPatterns) {
    if (!groups.has(ap.type)) { groups.set(ap.type, { type: ap.type, severity: ap.severity, items: [] }); }
    groups.get(ap.type).items.push(ap);
  }

  const severityOrder = { high: 0, medium: 1, low: 2 };
  const sortedGroups = [...groups.values()].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  let html = sortedGroups.map((group, gIdx) => {
    const allFiles = group.items.flatMap(item => item.files);
    const isRuleActive = activeRules.has(group.type);
    const itemsHtml = group.items.map((item, iIdx) => {
      const fileName = item.files.map(f => f.split('/').pop()).join(', ');
      const filesData = item.files.join(',');
      return '<div class="pattern-item" data-files="' + filesData + '" data-group="' + gIdx + '" data-item="' + iIdx + '" data-type="' + item.type + '" data-description="' + item.description.replace(/"/g, '&quot;') + '">' +
        '<div class="pattern-item-row"><div class="pattern-item-content">' +
        '<div class="pattern-item-desc">' + item.description + '</div>' +
        '<div class="pattern-item-file">' + fileName + '</div></div>' +
        '<button class="pattern-ignore-btn" title="Ignore this item">&#10005;</button></div></div>';
    }).join('');

    return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.type + '">' +
      '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-severity="' + group.severity + '" data-type="' + group.type + '">' +
      '<span class="pattern-chevron">&#9654;</span><span class="pattern-title">' + group.type + '</span>' +
      '<span class="pattern-count">' + group.items.length + '</span><span class="pattern-spacer"></span>' +
      '<button class="pattern-rules-toggle' + (isRuleActive ? ' active' : '') + '" title="' + (isRuleActive ? 'Remove from' : 'Add to') + ' CLAUDE.md rules">' + (isRuleActive ? '- rule' : '+ rule') + '</button></div>' +
      '<div class="pattern-items">' + itemsHtml + '</div></div>';
  }).join('');

  if (ignoredPatterns.length > 0) {
    const ignoredHtml = ignoredPatterns.map((item, idx) => {
      const fileName = item.files.map(f => f.split('/').pop()).join(', ');
      return '<div class="ignored-item" data-idx="' + idx + '"><span>' + item.type + ': ' + fileName + '</span>' +
        '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
    }).join('');
    html += '<div class="ignored-section"><div class="ignored-header"><span class="pattern-chevron">&#9654;</span>' +
      '<span>Ignored items (' + ignoredPatterns.length + ')</span></div><div class="ignored-items">' + ignoredHtml + '</div></div>';
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
    const content = item.querySelector('.pattern-item-content');
    content.addEventListener('click', (e) => {
      e.stopPropagation();
      highlightIssueFiles(files);
      if (files.length > 0) { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + files[0] }); }
    });
  });

  // Handle ignore button clicks
  list.querySelectorAll('.pattern-ignore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.pattern-item');
      const files = item.getAttribute('data-files').split(',').filter(f => f);
      const type = item.getAttribute('data-type');
      const description = item.getAttribute('data-description');
      ignoredPatterns.push({ type, files, description });
      const expandedState = getExpandedState();
      renderAntiPatterns();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();
      // Clear dimming if no active patterns remain
      if (issueFileMap.size === 0) {
        highlightIssueFiles([]);
      }
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
      ignoredPatterns.splice(idx, 1);
      const expandedState = getExpandedState();
      renderAntiPatterns();
      restoreExpandedState(expandedState);
      buildIssueFileMap();
      applyPersistentIssueHighlights();
      updateStatusButton();
      renderFooterStats();
      // Re-apply highlighting with active pattern files
      const allFiles = [...issueFileMap.keys()];
      highlightIssueFiles(allFiles);
    });
  });
}
`;
