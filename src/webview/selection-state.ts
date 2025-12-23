export const SELECTION_STATE_SCRIPT = `
// Get files that have high severity issues
function getHighSeverityFiles(filePaths) {
  const highSevFiles = new Set();
  for (const issue of issues) {
    if (issue.severity === 'high' && !isIssueIgnored(issue)) {
      for (const loc of issue.locations) {
        if (filePaths.includes(loc.file)) {
          highSevFiles.add(loc.file);
        }
      }
    }
  }
  return [...highSevFiles];
}

// Selection state module - manages issue selection and focus for AI context
const selection = {
  _state: {
    ruleId: null,       // Selected issue type (e.g., 'silent-failure')
    focusFiles: []      // User's focus selection for AI context
  },

  // Select an issue type - computes affected files and highlights them
  selectRule(ruleId) {
    this._state.ruleId = ruleId;
    this._state.focusFiles = this.getAffectedFiles();
    this._applyHighlights();
  },

  // Get files affected by current rule (derived, not stored)
  getAffectedFiles() {
    if (!this._state.ruleId) return [];
    const fileSet = new Set();
    for (const issue of issues) {
      if (issue.ruleId === this._state.ruleId && !isIssueIgnored(issue)) {
        for (const loc of issue.locations) {
          fileSet.add(loc.file);
        }
      }
    }
    return [...fileSet];
  },

  // Set focus to specific files (for AI context)
  setFocus(files) {
    this._state.focusFiles = files;
    this._applyHighlights();
  },

  // Select all issues (status button behavior)
  selectAllIssues() {
    this._state.ruleId = null;
    this._state.focusFiles = getAllIssueFiles();
    this._applyHighlights();
  },

  // Clear selection
  clear() {
    this._state.ruleId = null;
    this._state.focusFiles = [];
    this._applyHighlights();
  },

  // Get current state (read-only)
  getState() {
    return {
      ruleId: this._state.ruleId,
      focusFiles: [...this._state.focusFiles]
    };
  },

  // Get context for AI chat
  getAIContext() {
    const focusedIssues = this._state.ruleId
      ? issues.filter(i =>
          i.ruleId === this._state.ruleId &&
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.focusFiles.includes(l.file))
        )
      : issues.filter(i =>
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.focusFiles.includes(l.file))
        );

    return {
      ruleId: this._state.ruleId,
      files: this._state.focusFiles,
      issues: focusedIssues
    };
  },

  // Remove a file from focus (called when user clicks X on chip)
  removeFile(filePath) {
    this._state.focusFiles = this._state.focusFiles.filter(f => f !== filePath);
    this._applyHighlights();
  },

  // Filter current selection to only high severity issues
  filterToHighSeverity() {
    const highSeverityFiles = new Set();
    const relevantIssues = this._state.ruleId
      ? issues.filter(i => i.ruleId === this._state.ruleId && !isIssueIgnored(i))
      : issues.filter(i => !isIssueIgnored(i));

    for (const issue of relevantIssues) {
      if (issue.severity === 'high') {
        for (const loc of issue.locations) {
          if (this._state.focusFiles.includes(loc.file)) {
            highSeverityFiles.add(loc.file);
          }
        }
      }
    }
    this._state.focusFiles = [...highSeverityFiles];
    this._applyHighlights();
  },

  // Apply highlights to DOM nodes
  _applyHighlights() {
    highlightNodes(this._state.focusFiles);
    this._renderContextFiles();
    renderDynamicPrompts();
  },

  // Render context files as chips in footer - show first 5 with +N more button
  _renderContextFiles() {
    const container = document.getElementById('context-files');
    if (!container) return;

    const files = this._state.focusFiles;
    if (files.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Show first 5 files, then +N more button (but ALL files are sent to API)
    const maxVisible = 5;
    const visibleFiles = files.slice(0, maxVisible);
    const hiddenCount = files.length - maxVisible;

    let html = visibleFiles.map(filePath => {
      const fileName = filePath.split('/').pop();
      return '<div class="context-chip" data-path="' + filePath + '">' +
        '<span class="context-chip-name" title="' + filePath + '">' + fileName + '</span>' +
        '<button class="context-chip-remove" title="Remove from context">×</button>' +
        '</div>';
    }).join('');

    if (hiddenCount > 0) {
      html += '<button class="context-chip more" id="show-all-files-btn">+' + hiddenCount + ' more</button>';
    }

    container.innerHTML = html;

    // Add click handlers for remove buttons
    container.querySelectorAll('.context-chip-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const chip = btn.closest('.context-chip');
        const filePath = chip.getAttribute('data-path');
        selection.removeFile(filePath);
      });
    });

    // Add click handler for +N more button
    const moreBtn = document.getElementById('show-all-files-btn');
    if (moreBtn) {
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._showFilesFlyout(files, moreBtn);
      });
    }
  },

  // Show flyout with all files
  _showFilesFlyout(files, anchorEl) {
    // Remove existing flyout
    const existing = document.getElementById('files-flyout');
    if (existing) existing.remove();

    const flyout = document.createElement('div');
    flyout.id = 'files-flyout';
    flyout.className = 'files-flyout';

    const header = document.createElement('div');
    header.className = 'files-flyout-header';
    header.innerHTML = '<span>' + files.length + ' files in context</span><button class="files-flyout-close">×</button>';
    flyout.appendChild(header);

    const list = document.createElement('div');
    list.className = 'files-flyout-list';
    list.innerHTML = files.map(filePath => {
      const fileName = filePath.split('/').pop();
      return '<div class="files-flyout-item" data-path="' + filePath + '" title="' + filePath + '">' +
        '<span>' + fileName + '</span>' +
        '<button class="files-flyout-remove">×</button>' +
        '</div>';
    }).join('');
    flyout.appendChild(list);

    // Position flyout above the button
    const rect = anchorEl.getBoundingClientRect();
    flyout.style.bottom = (window.innerHeight - rect.top + 8) + 'px';
    flyout.style.left = rect.left + 'px';

    document.body.appendChild(flyout);

    // Close button handler
    flyout.querySelector('.files-flyout-close').addEventListener('click', () => flyout.remove());

    // Remove file handlers
    flyout.querySelectorAll('.files-flyout-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const item = btn.closest('.files-flyout-item');
        const filePath = item.getAttribute('data-path');
        selection.removeFile(filePath);
        item.remove();
        // Update header count
        const remaining = flyout.querySelectorAll('.files-flyout-item').length;
        if (remaining === 0) {
          flyout.remove();
        } else {
          flyout.querySelector('.files-flyout-header span').textContent = remaining + ' files in context';
        }
      });
    });

    // Click outside to close
    const closeOnOutsideClick = (e) => {
      if (!flyout.contains(e.target) && e.target !== anchorEl) {
        flyout.remove();
        document.removeEventListener('mousedown', closeOnOutsideClick);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', closeOnOutsideClick), 10);
  }
};
`;
