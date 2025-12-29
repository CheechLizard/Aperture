export const ANTI_PATTERN_HANDLERS_SCRIPT = `
// Event handlers for anti-pattern panel interactions

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
    const ruleId = item.getAttribute('data-rule-id');
    item.addEventListener('click', (e) => {
      if (e.target.closest('.pattern-ignore-btn')) return;
      e.stopPropagation();
      // Clear previous selection styling
      if (selectedElement) {
        selectedElement.style.background = '';
      }
      selectedElement = item;
      selection.selectRule(ruleId);
      selection.setFocus(files);
      switchToView(ruleId);
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
`;
