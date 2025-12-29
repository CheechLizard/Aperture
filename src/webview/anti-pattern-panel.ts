export const ANTI_PATTERN_PANEL_SCRIPT = `
// Anti-pattern panel - displays code issues grouped by rule
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
  nav.goTo({ view: viewMap[view] || 'files', uri: null });
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
    '<div class="pattern-item-file">' + fileName + lineInfo + '</div>' +
    '<div class="pattern-item-desc">' + item.message + '</div></div>' +
    '<button class="pattern-ignore-btn" title="Ignore this item"><svg viewBox="0 0 16 16"><path d="M4 4l8 8M12 4l-8 8"/></svg></button></div></div>';
}

function renderGroupHtml(group, gIdx) {
  const allFiles = group.items.flatMap(item => item.locations.map(loc => loc.file));
  const itemsHtml = group.items.map(renderItemHtml).join('');

  return '<div class="pattern-group" data-group="' + gIdx + '" data-type="' + group.ruleId + '">' +
    '<div class="pattern-header ' + group.severity + '" data-files="' + allFiles.join(',') + '" data-type="' + group.ruleId + '">' +
    '<span class="pattern-chevron"><svg viewBox="0 0 16 16"><path d="M6 4l4 4-4 4"/></svg></span>' +
    '<span class="pattern-title">' + formatRuleId(group.ruleId) + '</span>' +
    '<span class="pattern-count">' + group.items.length + '</span>' +
    '</div>' +
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

function renderIssues() {
  const list = document.getElementById('anti-pattern-list');
  const activeIssues = issues.filter(issue => !isIssueIgnored(issue));

  if (activeIssues.length === 0 && ignoredIssues.length === 0) {
    // If no coding-standards.md, show nothing (Create button is in status bar)
    // If file exists but no issues, show "No issues detected"
    list.innerHTML = codingStandardsExists
      ? '<div style="color:var(--vscode-descriptionForeground);font-size:0.85em;padding:8px;">No issues detected</div>'
      : '';
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
  setupItemHandlers(list);
  setupIgnoreHandlers(list);
  setupIgnoredSectionHandlers(list);
  setupRestoreHandlers(list);
}
`;
