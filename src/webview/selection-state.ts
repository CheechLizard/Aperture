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

  // Apply highlights to DOM nodes
  _applyHighlights() {
    highlightNodes(this._state.focusFiles);
    renderDynamicPrompts();
  }
};
`;
