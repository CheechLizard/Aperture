export const TREEMAP_NAV_SCRIPT = `
// Navigation module - manages view and zoom state only
const nav = {
  _state: {
    view: 'files',        // 'files' | 'functions' | 'deps'
    zoomedFile: null,     // null (L1) or filePath (L2)
    prevZoomedFile: null, // For animation direction
    prevView: null        // For view transition detection
  },

  // Navigate to a target - handles view/zoom state and triggers render
  // target: { view?, file? }
  goTo(target) {
    // Save previous state for animation detection
    this._state.prevView = this._state.view;
    this._state.prevZoomedFile = this._state.zoomedFile;

    // Update state
    if (target.view !== undefined) {
      this._state.view = target.view;
    }
    if (target.file !== undefined) {
      this._state.zoomedFile = target.file;
    }

    // Sync to legacy globals for compatibility with renderers
    this._syncToGlobals();

    // Update DOM visibility
    this._updateDOM();

    // Trigger appropriate render
    this._render();
  },

  // Go back one level (L2 -> L1, or no-op at L1)
  back() {
    if (this._state.zoomedFile) {
      this.goTo({ file: null });
    }
  },

  // Get current state (read-only copy)
  getState() {
    return {
      view: this._state.view,
      zoomedFile: this._state.zoomedFile
    };
  },

  // Sync internal state to legacy globals (for renderer compatibility)
  _syncToGlobals() {
    currentView = this._state.view;
    zoomedFile = this._state.zoomedFile;
    prevZoomedFile = this._state.prevZoomedFile;
  },

  // Update DOM container visibility based on current view
  _updateDOM() {
    const view = this._state.view;

    // Files treemap
    document.getElementById('treemap').style.display = view === 'files' ? 'block' : 'none';

    // Functions view
    document.getElementById('functions-container').classList.toggle('visible', view === 'functions');

    // Dependencies chord diagram
    document.getElementById('dep-container').style.display = view === 'deps' ? 'block' : 'none';
    document.getElementById('dep-controls').classList.toggle('visible', view === 'deps');

    // Legend (hidden for deps)
    document.getElementById('legend').style.display = view !== 'deps' ? 'flex' : 'none';

    // Back header (only in functions view when zoomed)
    const backHeader = document.getElementById('back-header');
    if (backHeader) {
      if (view === 'functions' && this._state.zoomedFile) {
        const folderPath = this._state.zoomedFile.split('/').slice(0, -1).join('/');
        backHeader.classList.remove('hidden');
        backHeader.innerHTML = '<button class="back-btn">\\u2190 Back</button><span class="back-path">' + folderPath + '</span>';
        backHeader.querySelector('.back-btn').addEventListener('click', () => nav.back());
      } else {
        backHeader.classList.add('hidden');
        backHeader.innerHTML = '';
      }
    }
  },

  // Trigger the appropriate renderer for current view
  _render() {
    if (this._state.view === 'files') {
      render();
      renderTreemapLegend();
    } else if (this._state.view === 'functions') {
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
