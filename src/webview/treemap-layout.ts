export const TREEMAP_LAYOUT_SCRIPT = `
// Treemap layout for folder/file level visualization
// Uses d3.treemap() for efficient space usage at folder level
// Supports adaptive depth - collapses folders when children would be too small

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;
const MIN_NODE_SIZE = 30;  // Minimum px for a clickable node
const MIN_EXPAND_SIZE = 100;  // Folders larger than this should always expand

function buildFileHierarchy(fileData, zoomedFolderPath) {
  // Build full hierarchy with folder URIs
  const root = { name: 'root', path: '', uri: null, children: [] };
  for (const file of fileData) {
    const parts = file.path.split('/');
    let current = root;
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? currentPath + '/' + part : part;
      let child = current.children.find(c => c.name === part && c.children);
      if (!child) {
        child = { name: part, path: currentPath, uri: createFolderUri(currentPath), children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.children.push(file);
  }

  // If zoomed into a folder, return that subtree
  if (zoomedFolderPath) {
    const subtree = findNodeByPath(root, zoomedFolderPath);
    if (subtree) return subtree;
  }

  return root;
}

function findNodeByPath(node, targetPath) {
  if (node.path === targetPath) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeByPath(child, targetPath);
    if (found) return found;
  }
  return null;
}

function countDescendantFiles(node) {
  if (!node.children) return 1;  // It's a file
  return node.children.reduce((sum, c) => sum + countDescendantFiles(c), 0);
}

function collapseSmallNodes(hierarchyNode) {
  if (!hierarchyNode.children) return;

  // Recurse first (depth-first) so inner folders collapse before outer ones
  hierarchyNode.children.forEach(c => collapseSmallNodes(c));

  // Never collapse root (depth 0) - always show top-level structure
  if (hierarchyNode.depth === 0) return;

  // Large folders should always expand to show structure (either dimension >= 100)
  const nodeW = hierarchyNode.x1 - hierarchyNode.x0;
  const nodeH = hierarchyNode.y1 - hierarchyNode.y0;
  if (nodeW >= MIN_EXPAND_SIZE || nodeH >= MIN_EXPAND_SIZE) return;

  // For smaller folders, check if children would be too small to interact with
  const hasSmallChild = hierarchyNode.children.some(c => {
    const w = c.x1 - c.x0;
    const h = c.y1 - c.y0;
    return w < MIN_NODE_SIZE || h < MIN_NODE_SIZE;
  });

  if (hasSmallChild && hierarchyNode.data.children) {
    // Mark as collapsed and count descendants
    hierarchyNode.data._collapsed = true;
    hierarchyNode.data._childCount = countDescendantFiles(hierarchyNode.data);
    // Remove children from D3 hierarchy (will render as leaf)
    hierarchyNode.children = null;
  }
}

// Helper to save clicked element bounds for zoom-in animation
function saveClickedBounds(e) {
  const rect = e.target.getBoundingClientRect();
  const container = document.getElementById('functions-chart');
  const containerRect = container.getBoundingClientRect();
  zoom.setClickedBounds({
    x: rect.left - containerRect.left,
    y: rect.top - containerRect.top,
    w: rect.width,
    h: rect.height
  });
}

// Render treemap layout - LAYOUT ONLY, no animation
// Animation is handled by the orchestrator via zoom.animateLayers()
function renderTreemapLayout(container, fileData, width, height, t, targetLayer) {
  // Build hierarchy, optionally filtered to a zoomed folder
  const root = buildFileHierarchy(fileData, zoomedFolder);
  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  // Apply adaptive collapse - folders with children too small become leaves
  collapseSmallNodes(hierarchy);

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
  renderFolderHeaders(fileLayer, hierarchy, width, height, t);

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

  // Render collapsed folder nodes at final positions
  layer.selectAll('rect.folder-node').data(folderLeaves, d => d.data.uri)
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
      const html = '<div><strong>' + d.data.name + '/</strong></div>' +
        '<div>' + d.data._childCount + ' item' + (d.data._childCount !== 1 ? 's' : '') + '</div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to expand</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      saveClickedBounds(e);
      // Direct zoom to folder
      nav.goTo({ uri: d.data.uri });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Render folder labels at final positions
  const folderLabelsData = folderLeaves.filter(d => {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.folder-label').data(zoomedFile ? [] : folderLabelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-label')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .text(d => truncateLabel(d.data.name + '/', (d.x1 - d.x0) - 8, 5))
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);

  // Render folder item counts at final positions
  layer.selectAll('text.folder-count').data(zoomedFile ? [] : folderLabelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-count')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 22),
      update => update,
      exit => exit.remove()
    )
    .text(d => d.data._childCount + ' items')
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 22);
}

function renderFileLabels(layer, leaves, width, height, t) {
  // Only label files (not collapsed folders - they have their own labels)
  const labelsData = leaves.filter(d => {
    if (d.data._collapsed) return false;  // Skip collapsed folders
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.file-label').data(zoomedFile ? [] : labelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-label')
        .attr('fill', '#fff')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12)
        .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 5)),
      update => update,
      exit => exit.remove()
    )
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}

function renderFolderHeaders(layer, hierarchy, width, height, t) {
  const depth1 = zoomedFile ? [] : hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  layer.selectAll('rect.dir-header').data(depth1, d => d.data.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'dir-header')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', 16),
      update => update,
      exit => exit.remove()
    )
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.data.name + '/</strong></div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to zoom into folder</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      e.stopPropagation();
      if (!d.data.uri) return;
      // Use the full folder bounds (not just header) for smoother animation
      zoom.setClickedBounds({
        x: d.x0,
        y: d.y0,
        w: d.x1 - d.x0,
        h: d.y1 - d.y0
      });
      nav.goTo({ uri: d.data.uri });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', 16);

  layer.selectAll('text.dir-label').data(depth1, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'dir-label')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 7))
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}
`;
