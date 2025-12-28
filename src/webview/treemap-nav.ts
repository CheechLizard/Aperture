export const TREEMAP_NAV_SCRIPT = `
// Navigation module - manages view and zoom state only
const nav = {
  _state: {
    view: 'files',        // 'files' | 'functions' | 'deps'
    zoomedUri: null,      // null (L1) or file URI (L2)
    prevZoomedUri: null,  // For animation direction
    prevView: null        // For view transition detection
  },

  // Navigate to a target - handles view/zoom state and triggers render
  // target: { view?, uri? }
  goTo(target) {
    // Save previous state for animation detection
    this._state.prevView = this._state.view;
    this._state.prevZoomedUri = this._state.zoomedUri;

    // Update state
    if (target.view !== undefined) {
      this._state.view = target.view;
    }
    if (target.uri !== undefined) {
      this._state.zoomedUri = target.uri;
    }

    // Sync to legacy globals for compatibility with renderers
    this._syncToGlobals();

    // Update DOM visibility
    this._updateDOM();

    // Trigger appropriate render
    this._render();
  },

  // Go back one level - uses getParentUri for proper hierarchy traversal
  back() {
    if (this._state.zoomedUri) {
      const parentUri = getParentUri(this._state.zoomedUri);
      this.goTo({ uri: parentUri });
    }
  },

  // Get current state (read-only copy)
  getState() {
    const zoomedPath = this._state.zoomedUri ? getFilePath(this._state.zoomedUri) : null;
    return {
      view: this._state.view,
      zoomedUri: this._state.zoomedUri,
      zoomedFile: zoomedPath  // Legacy compatibility
    };
  },

  // Check if a path is a file (exists in files array) or folder
  _isFilePath(path) {
    if (!path) return false;
    return files.some(f => f.path === path);
  },

  // Sync internal state to legacy globals (for renderer compatibility)
  _syncToGlobals() {
    currentView = this._state.view;
    const uri = this._state.zoomedUri;
    const prevUri = this._state.prevZoomedUri;

    const prevFolder = zoomedFolder;  // Track previous folder for animation reset

    if (!uri) {
      zoomedFile = null;
      zoomedFolder = null;
    } else {
      const path = getFilePath(uri);
      if (this._isFilePath(path)) {
        zoomedFile = path;
        zoomedFolder = null;
      } else {
        zoomedFile = null;
        zoomedFolder = path;
      }
    }

    // Handle previous state for animations
    if (!prevUri) {
      prevZoomedFile = null;
      prevZoomedFolder = null;
    } else {
      const prevPath = getFilePath(prevUri);
      if (this._isFilePath(prevPath)) {
        prevZoomedFile = prevPath;
        prevZoomedFolder = null;
      } else {
        prevZoomedFile = null;
        prevZoomedFolder = prevPath;
      }
    }

    // Reset zoom transforms when folder changes (layout will be completely different)
    if (zoomedFolder !== prevFolder) {
      zoom.reset();
    }
  },

  // Update DOM container visibility based on current view
  _updateDOM() {
    const view = this._state.view;

    // Unified treemap container for both files and functions views
    document.getElementById('functions-container').classList.toggle('visible', view === 'files' || view === 'functions');

    // Dependencies chord diagram
    document.getElementById('dep-container').style.display = view === 'deps' ? 'block' : 'none';
    document.getElementById('dep-controls').classList.toggle('visible', view === 'deps');

    // Legend (hidden for deps)
    document.getElementById('legend').style.display = view !== 'deps' ? 'flex' : 'none';

    // Breadcrumb (always shown in files or functions view)
    const backHeader = document.getElementById('back-header');
    if (view === 'files' || view === 'functions') {
      renderBreadcrumb(backHeader, this._state.zoomedUri);
    } else if (backHeader) {
      backHeader.classList.add('hidden');
      backHeader.innerHTML = '';
    }
  },

  // Trigger the appropriate renderer for current view
  _render() {
    if (this._state.view === 'files' || this._state.view === 'functions') {
      renderDistributionChart();
    } else if (this._state.view === 'deps') {
      if (!depGraph) {
        document.getElementById('status').textContent = 'Analyzing dependencies...';
        vscode.postMessage({ command: 'getDependencies' });
      } else {
        renderDepGraph();
        renderIssues();
      }
    }

    // Apply persistent issue styling and current selection highlights
    applyPersistentIssueHighlights();
    selection._applyHighlights();

    // Update UI
    renderDynamicPrompts();
    updateStatus();
  }
};
`;
