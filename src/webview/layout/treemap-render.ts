export const TREEMAP_RENDER_SCRIPT = `
// Main treemap rendering - layout and file/folder rectangles
// Animation is handled by the orchestrator via zoom.animateLayers()

// Helper to save clicked element bounds for zoom-in animation
function saveClickedBounds(e) {
  const rect = e.target.getBoundingClientRect();
  const container = document.getElementById('functions-chart');
  const containerRect = container.getBoundingClientRect();
  const bounds = {
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    w: rect.width,
    h: rect.height
  };
  zoom.setClickedBounds(bounds);
  return bounds;
}

// Render treemap layout - LAYOUT ONLY, no animation
// Animation is handled by the orchestrator via zoom.animateLayers()
function renderTreemapLayout(container, fileData, width, height, t, targetLayer) {
  // Build hierarchy, optionally filtered to a zoomed folder
  const root = buildFileHierarchy(fileData, zoomedFolder);
  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

  // Add extra top padding when viewing partial items (for the header)
  const partialViewPadding = zoomedOtherInfo ? 16 : 0;

  d3.treemap()
    .size([width, height])
    .paddingTop(d => {
      if (d.depth === 0) return partialViewPadding + 2;  // Root: add partial header space
      if (d.depth === 1) return 16;  // Depth-1 folders get header space
      return 2;
    })
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  // Apply adaptive aggregation - small children become "X small items" node
  // Uses bounding box of small nodes, no relayout needed
  aggregateSmallNodes(hierarchy);

  const leaves = hierarchy.leaves();
  const clickedLeaf = zoomedFile ? leaves.find(l => l.data.path === zoomedFile) : null;

  // Ensure SVG exists
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }
  svg.attr('width', width).attr('height', height);

  // Use provided layer or get/create default
  let fileLayer = targetLayer;
  if (!fileLayer) {
    fileLayer = svg.select('g.file-layer');
    if (fileLayer.empty()) {
      fileLayer = svg.append('g').attr('class', 'file-layer');
    }
  }

  // Render elements at final positions
  renderFileRects(fileLayer, leaves, width, height, t);
  renderFileLabels(fileLayer, leaves, width, height, t);
  renderFolderLeafLabels(fileLayer, leaves);
  renderFolderHeaders(fileLayer, hierarchy, width, height, t);
  renderPartialViewHeader(fileLayer, width);

  if (DEBUG_SHOW_PARTITIONS) {
    renderDebugPartitions(fileLayer, hierarchy);
  }

  return { svg, fileLayer, leaves, clickedLeaf, hierarchy };
}

function renderFileRects(layer, leaves, width, height, t) {
  // Separate files and collapsed folders for different styling
  const fileLeaves = leaves.filter(d => !d.data._collapsed);
  const folderLeaves = leaves.filter(d => d.data._collapsed);

  // Render file nodes at final positions
  layer.selectAll('rect.file-node').data(fileLeaves, d => d.data.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'file-node node')
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.path)
        .attr('fill', d => d.data.color)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0)),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      let html = '<div><strong>' + d.data.name + '</strong></div>';
      if (d.data.hasFunctions) {
        const fnCount = d.data.functions.length;
        html += '<div>' + fnCount + ' function' + (fnCount !== 1 ? 's' : '') + ' \\u00b7 ' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to view functions</div>';
      } else {
        html += '<div>' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to open file</div>';
      }
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      saveClickedBounds(e);
      // Clear partial view when navigating
      setZoomedOther(null);
      // Direct zoom: file with functions fills the view, otherwise open in editor
      if (d.data.hasFunctions) {
        zoomTo(d.data.uri);
      } else {
        vscode.postMessage({ command: 'openFile', uri: d.data.uri });
      }
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Render collapsed folder nodes at final positions (use path as key since "other" nodes share parent URI)
  layer.selectAll('rect.folder-node').data(folderLeaves, d => d.data.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'folder-node node')
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.path)
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => Math.max(0, d.x1 - d.x0))
        .attr('height', d => Math.max(0, d.y1 - d.y0)),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      let html;
      if (d.data._isOther) {
        // "X small items" node
        html = '<div><strong>' + d.data.name + '</strong></div>' +
          '<div style="color:var(--vscode-descriptionForeground)">Click to expand folder</div>';
      } else {
        // Regular collapsed folder
        const count = d.data._childCount;
        html = '<div><strong>' + d.data.name + '/</strong></div>' +
          '<div>' + count + ' item' + (count !== 1 ? 's' : '') + '</div>' +
          '<div style="color:var(--vscode-descriptionForeground)">Click to expand</div>';
      }
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      const bounds = saveClickedBounds(e);
      if (d.data._isOther) {
        // Save entry bounds for zoom-out animation when leaving partial view
        zoom.setPartialEntryBounds(bounds);
        // Expand collapsed items: zoom to parent folder showing only these items
        const parentPath = d.data.path.replace(/\\/_other_[a-z0-9]+$/, '');
        setZoomedOther({
          folderPath: parentPath,
          paths: d.data._collapsedPaths,
          count: d.data._otherCount,
          total: d.data._totalSiblings
        });
        // Add #partial fragment so nav sees this as a different URI and animates
        nav.goTo({ uri: d.data.uri + '#partial' });
      } else {
        // Regular collapsed folder - clear partial view and zoom
        setZoomedOther(null);
        nav.goTo({ uri: d.data.uri });
      }
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Folder leaf labels rendered separately in renderFolderLeafLabels
}
`;
