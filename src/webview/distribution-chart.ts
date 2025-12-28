export const DISTRIBUTION_CHART_SCRIPT = `
const FUNC_NEUTRAL_COLOR = '#3a3a3a';
const FILE_NO_FUNCTIONS_COLOR = '#2a2a2a';

function getDynamicFunctionColor(func) {
  return FUNC_NEUTRAL_COLOR;
}

function getDynamicFileColor(fileData) {
  return fileData.hasFunctions ? FUNC_NEUTRAL_COLOR : FILE_NO_FUNCTIONS_COLOR;
}

function zoomTo(uri) {
  nav.goTo({ uri: uri });
}

function zoomOut() {
  nav.goTo({ uri: null });
}

function truncateLabel(name, maxWidth, charWidth) {
  const maxChars = Math.floor(maxWidth / charWidth);
  return name.length > maxChars ? name.slice(0, maxChars - 1) + '\\u2026' : name;
}

function buildFileData() {
  return files.map(f => {
    const hasFunctions = f.functions && f.functions.length > 0;
    const fileData = {
      name: f.path.split('/').pop(),
      path: f.path,
      uri: f.uri,
      value: hasFunctions ? f.functions.reduce((sum, fn) => sum + fn.loc, 0) : f.loc,
      functions: f.functions || [],
      hasFunctions: hasFunctions
    };
    fileData.color = getDynamicFileColor(fileData);
    return fileData;
  });
}

function renderDistributionChart() {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;
  const t = zoom.transition('main');

  const fileData = buildFileData();
  if (fileData.length === 0) {
    container.innerHTML = '<div class="functions-empty">No functions found.</div>';
    renderFilesLegend([]);
    return;
  }

  // Render treemap layout for files (always, for animation continuity)
  const treemapResult = renderTreemapLayout(container, fileData, width, height, t);
  const { leaves, clickedLeaf, prev, curr } = treemapResult;

  // Get partition layer
  let svg = d3.select(container).select('svg');
  let partitionLayer = svg.select('g.partition-layer');
  if (partitionLayer.empty()) {
    partitionLayer = svg.append('g').attr('class', 'partition-layer');
  }

  // When zoomed into a file, use partition layout
  if (zoomedFile) {
    const file = files.find(f => f.path === zoomedFile);
    const prevBounds = zoom.exitBounds(clickedLeaf, prev);

    // Fade in partition layer
    partitionLayer.attr('opacity', 0).transition(t).attr('opacity', 1);

    if (file) {
      renderPartitionLayout(container, file, width, height, prevBounds, t);
      renderFunctionLegend(file.functions ? file.functions.length : 0);
    }
  } else {
    // Clear partition layer when zoomed out
    clearPartitionLayer(container);
    partitionLayer.transition(t).attr('opacity', 0);
    renderFilesLegend(fileData);
  }
}

function renderFilesLegend(fileData) {
  const legend = document.getElementById('legend');
  if (legend) legend.style.display = 'none';
}

function renderFunctionLegend(count) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  legend.style.display = 'flex';
  legend.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + count + '</strong> functions</div>';
}

// Re-render on window resize
window.addEventListener('resize', () => {
  if (currentView === 'files' || currentView === 'functions') {
    renderDistributionChart();
    selection._applyHighlights();
  } else if (currentView === 'deps' && depGraph) {
    renderDepGraph();
    selection._applyHighlights();
  }
});
`;
