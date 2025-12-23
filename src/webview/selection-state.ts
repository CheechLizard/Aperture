export const SELECTION_STATE_SCRIPT = `
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

  // Apply highlights to DOM nodes
  _applyHighlights() {
    highlightNodes(this._state.focusFiles);
    this._renderContextFiles();
    renderDynamicPrompts();
  },

  // Render context files as chips in AI dropdown
  _renderContextFiles() {
    const container = document.getElementById('context-files');
    const dropdown = document.getElementById('ai-dropdown');
    if (!container) return;

    const files = this._state.focusFiles;
    if (files.length === 0) {
      container.innerHTML = '';
      // Hide dropdown if no response either
      if (dropdown && !document.getElementById('response').classList.contains('visible')) {
        dropdown.classList.remove('visible');
      }
      return;
    }

    // Show dropdown when there are context files
    if (dropdown) {
      dropdown.classList.add('visible');
    }

    // Limit to 5 visible chips
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
      html += '<div class="context-chip context-chip-more">+' + hiddenCount + ' more</div>';
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
  }
};
`;
