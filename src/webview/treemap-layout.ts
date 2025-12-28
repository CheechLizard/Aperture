export const TREEMAP_LAYOUT_SCRIPT = `
// Treemap layout for folder/file level visualization
// Uses d3.treemap() for efficient space usage at folder level
// Supports adaptive depth - collapses folders when children would be too small

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;
const MIN_NODE_SIZE = 30;  // Minimum px for a clickable node
const MIN_EXPAND_SIZE = 100;  // Folders larger than this should always expand

// Helper to check if a node is too small to show a useful label
function isSmall(node) {
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  return w < TREEMAP_LABEL_MIN_WIDTH || h < TREEMAP_LABEL_MIN_HEIGHT;
}

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

function aggregateSmallNodes(hierarchyNode) {
  if (!hierarchyNode.children) return;

  // Recurse first (depth-first) so inner folders aggregate before outer ones
  hierarchyNode.children.forEach(c => aggregateSmallNodes(c));

  // Never aggregate at root (depth 0) - always show top-level structure
  if (hierarchyNode.depth === 0) return;

  const children = hierarchyNode.children;
  const smallChildren = children.filter(c => isSmall(c));
  if (smallChildren.length === 0) return;

  // Compute bounding box of all small children
  let bbox = {
    x0: Math.min(...smallChildren.map(c => c.x0)),
    y0: Math.min(...smallChildren.map(c => c.y0)),
    x1: Math.max(...smallChildren.map(c => c.x1)),
    y1: Math.max(...smallChildren.map(c => c.y1))
  };

  // Helper: check if node is fully contained in bbox (with tolerance for padding)
  const EPS = 2;  // Account for paddingInner(1) + tolerance
  const isContained = (c) =>
    c.x0 >= bbox.x0 - EPS && c.x1 <= bbox.x1 + EPS &&
    c.y0 >= bbox.y0 - EPS && c.y1 <= bbox.y1 + EPS;

  // Helper: check if node shares an edge with bbox (not just corner-adjacent)
  const sharesEdge = (c) => {
    const hAdjacent = Math.abs(c.x1 - bbox.x0) < EPS || Math.abs(c.x0 - bbox.x1) < EPS;
    const vAdjacent = Math.abs(c.y1 - bbox.y0) < EPS || Math.abs(c.y0 - bbox.y1) < EPS;
    const hOverlap = c.y0 < bbox.y1 && c.y1 > bbox.y0;
    const vOverlap = c.x0 < bbox.x1 && c.x1 > bbox.x0;
    // Must be adjacent in one direction AND overlap in the perpendicular direction
    return (hAdjacent && hOverlap) || (vAdjacent && vOverlap);
  };

  // Find all children fully contained in bbox (greedy rectangular)
  let toCollapse = children.filter(isContained);

  // Expand bbox by adding neighbor that maintains rectangular shape
  const expandBbox = () => {
    const others = children.filter(c => !toCollapse.includes(c));
    const adjacent = others.filter(sharesEdge);
    if (adjacent.length === 0) return false;

    // Only consider neighbors that don't extend beyond bbox (maintains rectangle)
    const valid = adjacent.filter(c => {
      const isLeftRight = Math.abs(c.x1 - bbox.x0) < EPS || Math.abs(c.x0 - bbox.x1) < EPS;
      const isAboveBelow = Math.abs(c.y1 - bbox.y0) < EPS || Math.abs(c.y0 - bbox.y1) < EPS;
      // Left/right: y-bounds must be within bbox
      const yContained = c.y0 >= bbox.y0 - EPS && c.y1 <= bbox.y1 + EPS;
      // Above/below: x-bounds must be within bbox
      const xContained = c.x0 >= bbox.x0 - EPS && c.x1 <= bbox.x1 + EPS;
      return (isLeftRight && yContained) || (isAboveBelow && xContained);
    });

    if (valid.length === 0) return false;  // Can't expand without breaking rectangle

    const neighbor = valid[0];
    bbox.x0 = Math.min(bbox.x0, neighbor.x0);
    bbox.y0 = Math.min(bbox.y0, neighbor.y0);
    bbox.x1 = Math.max(bbox.x1, neighbor.x1);
    bbox.y1 = Math.max(bbox.y1, neighbor.y1);
    toCollapse = children.filter(isContained);
    return true;
  };

  // Keep expanding until we have 2+ nodes and bbox can show a label
  while (toCollapse.length < 2 ||
         bbox.x1 - bbox.x0 < TREEMAP_LABEL_MIN_WIDTH ||
         bbox.y1 - bbox.y0 < TREEMAP_LABEL_MIN_HEIGHT) {
    if (!expandBbox()) break;
  }

  // Final checks
  if (toCollapse.length < 2) return;
  if (bbox.x1 - bbox.x0 < TREEMAP_LABEL_MIN_WIDTH ||
      bbox.y1 - bbox.y0 < TREEMAP_LABEL_MIN_HEIGHT) return;

  // Count files in collapsed nodes
  const otherCount = toCollapse.reduce((sum, c) =>
    sum + countDescendantFiles(c.data), 0);

  // Create synthetic node with exact bounding box (no relayout needed)
  const otherData = {
    name: otherCount + ' small item' + (otherCount !== 1 ? 's' : ''),
    path: hierarchyNode.data.path + '/_other',
    uri: hierarchyNode.data.uri,
    _isOther: true,
    _otherCount: otherCount,
    _collapsed: true
  };

  const otherNode = {
    data: otherData,
    x0: bbox.x0,
    y0: bbox.y0,
    x1: bbox.x1,
    y1: bbox.y1,
    depth: hierarchyNode.depth + 1,
    parent: hierarchyNode,
    children: null
  };

  // Replace collapsed children with the synthetic node
  const toKeep = children.filter(c => !toCollapse.includes(c));
  hierarchyNode.children = toKeep.concat([otherNode]);
}

function relayoutModifiedNodes(hierarchy, width, height) {
  // Find nodes that need re-layout (bottom-up order so children are processed first)
  const nodesToRelayout = hierarchy.descendants()
    .filter(d => d.data._needsRelayout)
    .sort((a, b) => b.depth - a.depth);  // Process deepest first

  nodesToRelayout.forEach(node => {
    // Rebuild hierarchy for this subtree from modified data
    const subHierarchy = d3.hierarchy(node.data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    // Run treemap layout on this subtree
    // Use same padding as original, accounting for actual depth in hierarchy
    const nodeWidth = node.x1 - node.x0;
    const nodeHeight = node.y1 - node.y0;
    d3.treemap()
      .size([nodeWidth, nodeHeight])
      .paddingTop(d => {
        // Map sub-hierarchy depth to actual depth in original hierarchy
        const actualDepth = d.depth + node.depth;
        return actualDepth === 1 ? 16 : 2;
      })
      .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
      (subHierarchy);

    // Update the original hierarchy node's children with new positions
    node.children = subHierarchy.children;
    if (node.children) {
      // Offset positions and fix depths for ALL descendants (not just direct children)
      subHierarchy.descendants().forEach(c => {
        if (c.depth === 0) return;  // Skip sub-root (represents node itself)
        c.x0 += node.x0;
        c.x1 += node.x0;
        c.y0 += node.y0;
        c.y1 += node.y0;
        c.depth += node.depth;  // Map sub-depth to actual depth
      });
      // Fix parent pointers for direct children to point to original node
      node.children.forEach(c => {
        c.parent = node;
      });
    }

    delete node.data._needsRelayout;
  });
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

  layer.selectAll('text.folder-label').data(zoomedFile ? [] : folderLabelsData, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-label')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .text(d => {
      // "Other" nodes already have descriptive name, folders get trailing "/"
      const label = d.data._isOther ? d.data.name : d.data.name + '/';
      return truncateLabel(label, (d.x1 - d.x0) - 8, 5);
    })
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);

  // Render folder item counts at final positions (only for regular folders, not "other" nodes)
  const folderCountData = folderLabelsData.filter(d => !d.data._isOther);
  layer.selectAll('text.folder-count').data(zoomedFile ? [] : folderCountData, d => d.data.path)
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
