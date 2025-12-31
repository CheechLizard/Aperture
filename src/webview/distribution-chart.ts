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

// Helper to find bounds of a URI in a hierarchy (skips root - we want descendants only)
function findBoundsInHierarchy(hierarchy, targetUri) {
  if (!hierarchy || !targetUri) return null;
  const targetPath = getFilePath(targetUri);
  // Skip depth 0 (root) - zooming to root bounds is meaningless
  const node = hierarchy.descendants().find(d => d.depth > 0 && d.data.path === targetPath);
  if (node) {
    return {
      x: node.x0,
      y: node.y0,
      w: node.x1 - node.x0,
      h: node.y1 - node.y0
    };
  }
  return null;
}

// Main orchestrator - handles all zoom transitions uniformly
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

  // Detect transition type
  const clickedBounds = zoom.consumeClickedBounds();
  const isZoomingIn = !!clickedBounds;
  // Only consume partial exit bounds when NOT zooming in (to avoid consuming on entry)
  const partialExitBounds = !isZoomingIn ? zoom.consumePartialEntryBounds() : null;
  const isZoomingOut = !isZoomingIn && (prevZoomedFolder || prevZoomedFile || partialExitBounds);

  // Determine what to render: files/folders (treemap) or functions (partition)
  const showingFunctions = !!zoomedFile;
  const wasShowingFunctions = !!prevZoomedFile;

  // Ensure SVG exists (dimensions set by render functions)
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }

  if (isZoomingIn) {
    // ZOOM IN: create new layer, render into it, animate old → new
    if (showingFunctions && !wasShowingFunctions) {
      // File → Functions: new partition layer expands from file
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.partition-layer');

      const newLayer = svg.append('g').attr('class', 'partition-layer');

      const file = files.find(f => f.path === zoomedFile);
      if (file) {
        renderPartitionLayout(container, file, width, height, t, newLayer);
        renderFunctionLegend(file.functions ? file.functions.length : 0);
      }

      zoom.animateLayers(oldLayer, newLayer, clickedBounds, width, height, t, 'in');

      // Update scroll indicators after animation completes
      setTimeout(() => {
        if (typeof updateScrollIndicators === 'function') {
          updateScrollIndicators();
        }
      }, zoom.duration + 50);

    } else {
      // Folder → Folder (or Folder → File preview): new file layer expands
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer-old');

      // For zoom-in, new layer goes on TOP (append) - it expands from clicked element
      const newLayer = svg.append('g').attr('class', 'file-layer');

      renderTreemapLayout(container, fileData, width, height, t, newLayer);

      zoom.animateLayers(oldLayer, newLayer, clickedBounds, width, height, t, 'in');

      // Mark old layer to avoid selection conflicts
      oldLayer.attr('class', 'file-layer-old');
    }

  } else if (isZoomingOut) {
    // ZOOM OUT: use previous URI to find bounds in new layout
    const prevPath = prevZoomedFile || prevZoomedFolder;
    const sourceUri = prevPath ? createFileUri(prevPath) : null;

    if (wasShowingFunctions && !showingFunctions) {
      // Functions → File: partition shrinks to file, file layer appears
      const oldLayer = svg.select('g.partition-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer, g.file-layer-old');

      const newLayer = svg.insert('g', ':first-child').attr('class', 'file-layer');

      const result = renderTreemapLayout(container, fileData, width, height, t, newLayer);
      renderFilesLegend(fileData);

      // Look up the source file in the new layout, fallback to center
      const bounds = findBoundsInHierarchy(result.hierarchy, sourceUri) || {
        x: width * 0.25, y: height * 0.25, w: width * 0.5, h: height * 0.5
      };

      if (!zoom.animateLayers(oldLayer, newLayer, bounds, width, height, t, 'out')) {
        // Animation failed (empty layer) - just fade in new layer
        newLayer.style('opacity', 0).transition(t).style('opacity', 1);
      }

    } else {
      // Folder → Parent Folder (or partial → full): file layer shrinks to folder
      const oldLayer = svg.select('g.file-layer');
      zoom.prepareAnimation(svg, oldLayer, 'g.file-layer-old');

      const newLayer = svg.insert('g', ':first-child').attr('class', 'file-layer');

      const result = renderTreemapLayout(container, fileData, width, height, t, newLayer);
      renderFilesLegend(fileData);

      // For partial view exit, use saved entry bounds, otherwise look up in hierarchy
      const bounds = partialExitBounds || findBoundsInHierarchy(result.hierarchy, sourceUri);

      if (!zoom.animateLayers(oldLayer, newLayer, bounds, width, height, t, 'out')) {
        // Animation failed - crossfade
        oldLayer.transition(t).style('opacity', 0).remove();
        newLayer.style('opacity', 0).transition(t).style('opacity', 1);
      }

      // Mark old layer to avoid selection conflicts
      oldLayer.attr('class', 'file-layer-old');
    }

  } else {
    // No animation - initial render or resize
    if (showingFunctions) {
      // Clear any stale file layer content, render partition
      let partitionLayer = svg.select('g.partition-layer');
      if (partitionLayer.empty()) {
        partitionLayer = svg.append('g').attr('class', 'partition-layer');
      }

      const file = files.find(f => f.path === zoomedFile);
      if (file) {
        renderPartitionLayout(container, file, width, height, t, partitionLayer);
        renderFunctionLegend(file.functions ? file.functions.length : 0);
      }
    } else {
      // Render treemap
      let fileLayer = svg.select('g.file-layer');
      if (fileLayer.empty()) {
        fileLayer = svg.append('g').attr('class', 'file-layer');
      }

      // Clear any stale partition layer
      clearPartitionLayer(container);

      renderTreemapLayout(container, fileData, width, height, t, fileLayer);
      renderFilesLegend(fileData);
    }
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
