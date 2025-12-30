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
    ruleId: null,         // Selected issue type (e.g., 'silent-failure')
    highlightFiles: [],   // Files to highlight visually (what user is browsing)
    highlightLines: {},   // Map of file path -> line number for function-level highlighting
    attachedFiles: [],    // Files attached to context (ready to send)
    attachedIssues: []    // Issues attached to context
  },

  // Select an issue type - highlights affected files but does NOT attach to context
  selectRule(ruleId) {
    this._state.ruleId = ruleId;
    this._state.highlightFiles = this.getAffectedFiles();
    this._state.highlightLines = this.getAffectedLines();
    this._applyHighlights();
  },

  // Get lines affected by current rule (for function-level highlighting)
  getAffectedLines() {
    if (!this._state.ruleId) return {};
    const lineMap = {};
    for (const issue of issues) {
      if (issue.ruleId === this._state.ruleId && !isIssueIgnored(issue)) {
        for (const loc of issue.locations) {
          if (loc.line) {
            if (!lineMap[loc.file]) lineMap[loc.file] = [];
            lineMap[loc.file].push(loc.line);
          }
        }
      }
    }
    return lineMap;
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

  // Set highlight focus to specific files (visual only, does NOT attach to context)
  // lineMap is optional: { filePath: [line1, line2, ...] }
  setFocus(files, lineMap) {
    this._state.highlightFiles = files;
    this._state.highlightLines = lineMap || {};
    this._applyHighlights();
  },

  // Attach files to context (called when prompt button clicked - commits to sending)
  attachContext(files, contextIssues) {
    this._state.attachedFiles = files;
    this._state.attachedIssues = contextIssues || [];
    this._state.highlightFiles = files;
    this._renderContextFiles();
  },

  // Select all issues (status button behavior) - highlights only
  selectAllIssues() {
    this._state.ruleId = null;
    this._state.highlightFiles = getAllIssueFiles();
    this._applyHighlights();
  },

  // Clear selection and attached context
  clear() {
    this._state.ruleId = null;
    this._state.highlightFiles = [];
    this._state.highlightLines = {};
    this._state.attachedFiles = [];
    this._state.attachedIssues = [];
    this._applyHighlights();
  },

  // Get current state (read-only)
  getState() {
    return {
      ruleId: this._state.ruleId,
      focusFiles: [...this._state.highlightFiles],
      attachedFiles: [...this._state.attachedFiles]
    };
  },

  // Get context for AI chat - uses ATTACHED files (not highlight files)
  getAIContext() {
    // If files are attached, use those; otherwise return empty
    if (this._state.attachedFiles.length === 0) {
      return { ruleId: null, files: [], issues: [] };
    }

    return {
      ruleId: this._state.ruleId,
      files: this._state.attachedFiles,
      issues: this._state.attachedIssues
    };
  },

  // Get preview context for prompt costing (based on current selection, not attached)
  getPreviewContext() {
    const focusedIssues = this._state.ruleId
      ? issues.filter(i =>
          i.ruleId === this._state.ruleId &&
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.highlightFiles.includes(l.file))
        )
      : issues.filter(i =>
          !isIssueIgnored(i) &&
          i.locations.some(l => this._state.highlightFiles.includes(l.file))
        );

    return {
      ruleId: this._state.ruleId,
      files: this._state.highlightFiles,
      issues: focusedIssues
    };
  },

  // Remove a file from attached context (called when user clicks X on chip)
  removeFile(filePath) {
    this._state.attachedFiles = this._state.attachedFiles.filter(f => f !== filePath);
    this._state.attachedIssues = this._state.attachedIssues.filter(i =>
      i.locations.some(l => this._state.attachedFiles.includes(l.file))
    );
    this._state.highlightFiles = this._state.highlightFiles.filter(f => f !== filePath);
    this._renderContextFiles();
    highlightNodes(this._state.highlightFiles);
  },

  // Apply highlights to DOM nodes
  _applyHighlights() {
    highlightNodes(this._state.highlightFiles, this._state.highlightLines);
    this._renderContextFiles();
    renderDynamicPrompts();
  },

  // Render context files as chips in footer - shows ATTACHED files (ready to send)
  _renderContextFiles() {
    const container = document.getElementById('context-files');
    if (!container) return;

    const files = this._state.attachedFiles;
    if (files.length === 0) {
      container.innerHTML = '';
      return;
    }

    // Show first 3 files, then +N more button (but ALL files are sent to API)
    const maxVisible = 3;
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

  // Show flyout with all files (delegates to global function)
  _showFilesFlyout(files, anchorEl) {
    showFilesFlyout(files, anchorEl);
  }
};
`;
