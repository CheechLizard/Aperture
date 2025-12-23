export const ANTI_PATTERN_PANEL_SCRIPT = `
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function formatRuleId(ruleId) {
  return ruleId.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

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
  const viewMap = { functions: 'functions', chord: 'deps', files: 'files' };
  nav.goTo({ view: viewMap[view] || 'files', file: null });
}

function groupIssuesByRule(activeIssues) {
  const groups = new Map();
  for (const issue of activeIssues) {
    if (!groups.has(issue.ruleId)) {
      groups.set(issue.ruleId, { ruleId: issue.ruleId, items: [] });
    }
    groups.get(issue.ruleId).items.push(issue);
  }

  for (const group of groups.values()) {
    group.items.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
    group.severity = group.items.length > 0 ? group.items[0].severity : 'low';
  }

  return [...groups.values()].sort((a, b) =>
    SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
    b.items.length - a.items.length ||
    a.ruleId.localeCompare(b.ruleId)
  );
}

function categorizeGroups(sortedGroups) {
  return {
    code: sortedGroups.filter(g => !FILE_RULES.has(g.ruleId) && !ARCHITECTURE_RULES.has(g.ruleId)),
    file: sortedGroups.filter(g => FILE_RULES.has(g.ruleId)),
    arch: sortedGroups.filter(g => ARCHITECTURE_RULES.has(g.ruleId))
  };
}

function renderItemHtml(item) {
  const filesData = item.locations.map(loc => loc.file).join(',');
  const firstLoc = item.locations[0];
  const fileName = firstLoc.file.split('/').pop();
  const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';

  return '<div class="pattern-item ' + item.severity + '" data-files="' + filesData + '" data-line="' + (firstLoc.line || '') + '" data-rule-id="' + item.ruleId + '" data-message="' + item.message.replace(/"/g, '&quot;') + '">' +
    '<div class="pattern-item-row"><div class="pattern-item-content">' +
    '<div class="pattern-item-desc">' + item.message + '</div>' +
    '<div class="pattern-item-file">' + fileName + lineInfo + '</div></div>' +
    '<button class="pattern-ignore-btn" title="Ignore this item"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div></div>';
}

function renderGroupHtml(group, gIdx) {
  const isRuleActive = activeRules.has(group.ruleId);
  const allFiles = group.items.flatMap(item => item.locations.map(loc => loc.file));
  const itemsHtml = group.items.map(renderItemHtml).join('');

  return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.ruleId + '">' +
    '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-type="' + group.ruleId + '">' +
    '<span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
    '<span class="pattern-title">' + formatRuleId(group.ruleId) + '</span>' +
    '<span class="pattern-count">' + group.items.length + '</span><span class="pattern-spacer"></span>' +
    '<button class="pattern-rules-toggle' + (isRuleActive ? ' active' : '') + '" title="' + (isRuleActive ? 'Remove from' : 'Add to') + ' CLAUDE.md rules">' + (isRuleActive ? '- rule' : '+ rule') + '</button></div>' +
    '<div class="pattern-items">' + itemsHtml + '</div></div>';
}

function renderCategoryHtml(category, label, groups) {
  if (groups.length === 0) return '';
  const count = groups.reduce((sum, g) => sum + g.items.length, 0);
  const groupsHtml = groups.map((g, i) => renderGroupHtml(g, i)).join('');
  return '<div class="issue-category" data-category="' + category + '">' +
    '<div class="issue-category-header"><span class="issue-category-chevron expanded">▶</span>' + label + ' (' + count + ')</div>' +
    '<div class="issue-category-items expanded">' + groupsHtml + '</div></div>';
}

function renderIgnoredHtml() {
  if (ignoredIssues.length === 0) return '';
  const itemsHtml = ignoredIssues.map((item, idx) => {
    const firstLoc = item.locations[0];
    const fileName = firstLoc.file.split('/').pop();
    const lineInfo = firstLoc.line ? ':' + firstLoc.line : '';
    return '<div class="ignored-item" data-idx="' + idx + '"><span>' + formatRuleId(item.ruleId) + ': ' + fileName + lineInfo + '</span>' +
      '<button class="ignored-item-restore" title="Restore this item">restore</button></div>';
  }).join('');
  return '<div class="ignored-section"><div class="ignored-header"><span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
    '<span>Ignored items (' + ignoredIssues.length + ')</span></div><div class="ignored-items">' + itemsHtml + '</div></div>';
}

function setupCategoryHandlers(list) {
  list.querySelectorAll('.issue-category-header').forEach(header => {
    header.addEventListener('click', () => {
      header.querySelector('.issue-category-chevron').classList.toggle('expanded');
      header.nextElementSibling.classList.toggle('expanded');
    });
  });
}

function setupChevronHandlers(list) {
  list.querySelectorAll('.pattern-header .pattern-chevron').forEach(chevron => {
    const group = chevron.closest('.pattern-group');
    const items = group.querySelector('.pattern-items');
    chevron.addEventListener('click', (e) => {
      e.stopPropagation();
      chevron.classList.toggle('expanded');
      items.classList.toggle('expanded');
    });
  });
}

function setupHeaderHandlers(list) {
  list.querySelectorAll('.pattern-header').forEach(header => {
    const ruleId = header.getAttribute('data-type');
    header.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-chevron')) return;
      if (e.target.classList.contains('pattern-rules-toggle')) return;
      if (selectedElement) {
        selectedElement.style.borderLeftColor = '';
        selectedElement.style.background = '';
      }
      selectedElement = header;
      // Select this rule - computes affected files and highlights them
      selection.selectRule(ruleId);
      switchToView(ruleId);
    });
  });
}

function setupRulesToggleHandlers(list) {
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
}

function setupItemHandlers(list) {
  list.querySelectorAll('.pattern-item').forEach(item => {
    const files = item.getAttribute('data-files').split(',').filter(f => f);
    const line = item.getAttribute('data-line');
    const ruleId = item.getAttribute('data-rule-id');
    item.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-ignore-btn')) return;
      e.stopPropagation();
      // Select this rule and focus on specific files
      selection.selectRule(ruleId);
      selection.setFocus(files);
      switchToView(ruleId);
      if (files.length > 0) {
        vscode.postMessage({ command: 'openFile', path: rootPath + '/' + files[0], line: line ? parseInt(line) : undefined });
      }
    });
  });
}

function captureGroupPositions() {
  const positions = new Map();
  document.querySelectorAll('.pattern-group').forEach(group => {
    const type = group.getAttribute('data-type');
    const rect = group.getBoundingClientRect();
    positions.set(type, { top: rect.top, left: rect.left });
  });
  return positions;
}

function applyFlipAnimation(oldPositions) {
  const groups = document.querySelectorAll('.pattern-group');
  groups.forEach(group => {
    const type = group.getAttribute('data-type');
    const oldPos = oldPositions.get(type);
    if (!oldPos) {
      group.style.opacity = '0';
      group.style.transform = 'translateY(-10px)';
      requestAnimationFrame(() => {
        group.style.transition = 'opacity 0.2s, transform 0.2s';
        group.style.opacity = '1';
        group.style.transform = '';
      });
      return;
    }
    const newRect = group.getBoundingClientRect();
    const deltaY = oldPos.top - newRect.top;
    if (Math.abs(deltaY) > 1) {
      group.style.transform = 'translateY(' + deltaY + 'px)';
      requestAnimationFrame(() => {
        group.style.transition = 'transform 0.25s ease-out';
        group.style.transform = '';
      });
    }
  });
  setTimeout(() => {
    groups.forEach(group => {
      group.style.transition = '';
    });
  }, 300);
}

function refreshAfterChange(selectedType, wasStatusSelected) {
  const expandedState = getExpandedState();
  const oldPositions = captureGroupPositions();
  renderIssues();
  applyFlipAnimation(oldPositions);
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

  // Reapply current selection highlights
  selection._applyHighlights();
}

function setupIgnoreHandlers(list) {
  list.querySelectorAll('.pattern-ignore-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = btn.closest('.pattern-item');
      const ruleId = item.getAttribute('data-rule-id');
      const message = item.getAttribute('data-message');
      const filesStr = item.getAttribute('data-files');
      const line = item.getAttribute('data-line');

      const issueToIgnore = issues.find(i =>
        i.ruleId === ruleId && i.message === message &&
        i.locations.map(l => l.file).join(',') === filesStr &&
        (i.locations[0]?.line?.toString() || '') === line
      );
      if (issueToIgnore && !isIssueIgnored(issueToIgnore)) ignoredIssues.push(issueToIgnore);

      const selectedType = selectedElement && selectedElement.classList.contains('pattern-header')
        ? selectedElement.getAttribute('data-type') : null;
      refreshAfterChange(selectedType, selectedElement && selectedElement.id === 'status');
    });
  });
}

function setupIgnoredSectionHandlers(list) {
  const ignoredHeader = list.querySelector('.ignored-header');
  if (ignoredHeader) {
    ignoredHeader.addEventListener('click', () => {
      ignoredHeader.querySelector('.pattern-chevron').classList.toggle('expanded');
      ignoredHeader.nextElementSibling.classList.toggle('expanded');
    });
  }
}

function setupRestoreHandlers(list) {
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

      // If the restored rule was selected, reselect it to update affected files
      if (selectedType === restoredRuleId) {
        selection.selectRule(restoredRuleId);
        const newHeader = document.querySelector('.pattern-header[data-type="' + restoredRuleId + '"]');
        if (newHeader) {
          selectedElement = newHeader;
        }
      } else {
        // Reapply current selection highlights
        selection._applyHighlights();
      }
    });
  });
}

function renderIssues() {
  const list = document.getElementById('anti-pattern-list');
  const activeIssues = issues.filter(issue => !isIssueIgnored(issue));

  if (activeIssues.length === 0 && ignoredIssues.length === 0) {
    list.innerHTML = '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>';
    return;
  }

  buildIssueFileMap();

  const sortedGroups = groupIssuesByRule(activeIssues);
  const categories = categorizeGroups(sortedGroups);

  list.innerHTML =
    renderCategoryHtml('code', 'Code Issues', categories.code) +
    renderCategoryHtml('file', 'File Issues', categories.file) +
    renderCategoryHtml('architecture', 'Architecture Issues', categories.arch) +
    renderIgnoredHtml();

  setupCategoryHandlers(list);
  setupChevronHandlers(list);
  setupHeaderHandlers(list);
  setupRulesToggleHandlers(list);
  setupItemHandlers(list);
  setupIgnoreHandlers(list);
  setupIgnoredSectionHandlers(list);
  setupRestoreHandlers(list);
}
`;
