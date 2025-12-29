export const TREEMAP_LAYOUT_SCRIPT = `
// Treemap layout for folder/file level visualization
// Uses d3.treemap() for efficient space usage at folder level
// Supports adaptive depth - collapses folders when children would be too small

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;
const MIN_NODE_SIZE = 30;  // Minimum px for a clickable node
const MIN_EXPAND_SIZE = 100;  // Folders larger than this should always expand

// Helper to check if a node is too small to show a useful label
function tooSmallForLabel(node) {
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  return w < TREEMAP_LABEL_MIN_WIDTH || h < TREEMAP_LABEL_MIN_HEIGHT;
}

// State for viewing a subset of items (when expanding collapsed "other" nodes)
let zoomedOtherInfo = null;  // { folderPath, paths, count, total }

function setZoomedOther(info) {
  zoomedOtherInfo = info;
}

function getZoomedOther() {
  return zoomedOtherInfo;
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
    if (subtree) {
      // If viewing partial (collapsed items), filter children to only those paths
      if (zoomedOtherInfo && zoomedOtherInfo.folderPath === zoomedFolderPath) {
        const allowedPaths = new Set(zoomedOtherInfo.paths);
        subtree.children = subtree.children.filter(c => allowedPaths.has(c.path));
      }
      return subtree;
    }
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

  // Recurse into children first (depth-first, reverse order = smallest first)
  const children = hierarchyNode.children;
  for (let i = children.length - 1; i >= 0; i--) {
    aggregateSmallNodes(children[i]);
  }

  const EPS = 2;

  // Helper: compute bounding box of nodes
  const computeBbox = (nodes) => ({
    x0: Math.min(...nodes.map(c => c.x0)),
    y0: Math.min(...nodes.map(c => c.y0)),
    x1: Math.max(...nodes.map(c => c.x1)),
    y1: Math.max(...nodes.map(c => c.y1))
  });

  // Helper: check if bbox can fit a label
  const isLabelable = (bbox) =>
    (bbox.x1 - bbox.x0) >= TREEMAP_LABEL_MIN_WIDTH &&
    (bbox.y1 - bbox.y0) >= TREEMAP_LABEL_MIN_HEIGHT;

  // Helper: create a collapsed node from items
  const createCollapsedNode = (items) => {
    const bbox = computeBbox(items);
    let otherCount = 0;
    const collapsedPaths = [];
    for (const node of items) {
      otherCount += countDescendantFiles(node.data);
      collapsedPaths.push(node.data.path);
    }
    return {
      data: {
        name: otherCount + ' small item' + (otherCount !== 1 ? 's' : ''),
        path: hierarchyNode.data.path + '/_other_' + Math.random().toString(36).slice(2, 6),
        uri: hierarchyNode.data.uri,
        _isOther: true,
        _otherCount: otherCount,
        _collapsedPaths: collapsedPaths,
        _totalSiblings: children.length,
        _collapsed: true
      },
      x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1,
      depth: hierarchyNode.depth + 1,
      parent: hierarchyNode,
      children: null,
      _isCollapsedGroup: true,
      _collapsedItems: items
    };
  };

  // Find a split line that separates items into two groups
  const findSplit = (items) => {
    if (items.length <= 1) return null;

    const allSameY = items.every(n =>
      Math.abs(n.y0 - items[0].y0) < EPS && Math.abs(n.y1 - items[0].y1) < EPS);
    const allSameX = items.every(n =>
      Math.abs(n.x0 - items[0].x0) < EPS && Math.abs(n.x1 - items[0].x1) < EPS);

    if (allSameY || allSameX) return null;

    const xEdges = new Set();
    const yEdges = new Set();
    items.forEach(n => {
      xEdges.add(n.x0); xEdges.add(n.x1);
      yEdges.add(n.y0); yEdges.add(n.y1);
    });

    for (const x of xEdges) {
      const left = items.filter(n => n.x1 <= x + EPS);
      const right = items.filter(n => n.x0 >= x - EPS);
      if (left.length > 0 && right.length > 0 && left.length + right.length === items.length) {
        return { first: left, last: right };
      }
    }

    for (const y of yEdges) {
      const top = items.filter(n => n.y1 <= y + EPS);
      const bottom = items.filter(n => n.y0 >= y - EPS);
      if (top.length > 0 && bottom.length > 0 && top.length + bottom.length === items.length) {
        return { first: top, last: bottom };
      }
    }

    return null;
  };

  // Build BSP tree node from items
  const buildBspNode = (items) => {
    if (items.length === 0) return null;
    const split = findSplit(items);
    if (!split) {
      // Leaf node - items are siblings
      return { isLeaf: true, items: items };
    }
    return {
      isLeaf: false,
      first: buildBspNode(split.first),
      last: buildBspNode(split.last)
    };
  };

  // Process BSP tree node, collapsing small items
  // Modifies the tree in place, returns the resulting items array for this subtree
  const processBspNode = (node) => {
    if (!node) return [];

    if (node.isLeaf) {
      // Leaf: items are siblings, can be collapsed together
      const items = node.items;
      const smalls = items.filter(n => tooSmallForLabel(n));

      if (smalls.length === 0) {
        return items; // Nothing to collapse
      }

      // Sort by value (large first) so smallest are at end
      const sorted = [...items].sort((a, b) => (b.data.value || 0) - (a.data.value || 0));

      let toCollapse = [];
      let toKeep = [];

      for (const item of sorted) {
        if (tooSmallForLabel(item)) {
          toCollapse.push(item);
        } else {
          toKeep.push(item);
        }
      }

      // Grow collapsed region until labelable
      let bbox = computeBbox(toCollapse);
      while (!isLabelable(bbox) && toKeep.length > 0) {
        toCollapse.push(toKeep.pop());
        bbox = computeBbox(toCollapse);
      }

      // Always create collapsed node if there are smalls
      if (toCollapse.length > 0) {
        return [...toKeep, createCollapsedNode(toCollapse)];
      }

      return items;
    }

    // Internal node: process children first
    const firstItems = processBspNode(node.first);
    const lastItems = processBspNode(node.last);

    // Find collapsed groups that need growth (not labelable)
    const firstCollapsed = firstItems.find(n => n._isCollapsedGroup);
    const lastCollapsed = lastItems.find(n => n._isCollapsedGroup);
    const needsGrowth = (firstCollapsed && !isLabelable(firstCollapsed)) ||
                        (lastCollapsed && !isLabelable(lastCollapsed));

    if (needsGrowth) {
      // Collect all original items from both sides
      const allItems = [];
      for (const item of [...firstItems, ...lastItems]) {
        if (item._isCollapsedGroup) {
          allItems.push(...item._collapsedItems);
        } else {
          allItems.push(item);
        }
      }
      return [createCollapsedNode(allItems)];
    }

    // Check if both sides are fully collapsed (single collapsed node each)
    const firstIsCollapsed = firstItems.length === 1 && firstItems[0]._isCollapsedGroup;
    const lastIsCollapsed = lastItems.length === 1 && lastItems[0]._isCollapsedGroup;

    if (firstIsCollapsed && lastIsCollapsed) {
      // Both siblings are collapsed - merge them
      const allOriginalItems = [
        ...firstItems[0]._collapsedItems,
        ...lastItems[0]._collapsedItems
      ];
      const bbox = computeBbox(allOriginalItems);

      if (isLabelable(bbox)) {
        // Merge into single collapsed node
        return [createCollapsedNode(allOriginalItems)];
      }
      // Can't merge - keep separate (will try at parent level)
    }

    // Return combined items from both branches
    return [...firstItems, ...lastItems];
  };

  // DEBUG: Collect all leaf partitions for visualization
  const collectLeafPartitions = (items) => {
    if (items.length === 0) return [];
    const split = findSplit(items);
    if (!split) return [items];
    return [...collectLeafPartitions(split.first), ...collectLeafPartitions(split.last)];
  };

  // Build BSP tree and process it
  const bspRoot = buildBspNode([...children]);
  const resultItems = processBspNode(bspRoot);

  // Store debug partitions
  hierarchyNode._debugPartitions = collectLeafPartitions([...children]);

  // Update children with processed items
  hierarchyNode.children = resultItems;
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
  renderFolderHeaders(fileLayer, hierarchy, width, height, t);
  renderPartialViewHeader(fileLayer, width);

  // DEBUG: Visualize BSP partitions (remove after diagnosis)
  renderDebugPartitions(fileLayer, hierarchy);

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
        const parentPath = d.data.path.replace(/\\/_other$/, '');
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
      // Clear partial view when navigating to a folder
      setZoomedOther(null);
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

function renderPartialViewHeader(layer, width) {
  // Show header when viewing a partial set of items (expanded "other" node)
  const otherInfo = zoomedOtherInfo;
  const headerData = otherInfo ? [otherInfo] : [];

  layer.selectAll('rect.partial-header').data(headerData)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partial-header dir-header')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', 16),
      update => update.attr('width', width),
      exit => exit.remove()
    );

  layer.selectAll('text.partial-label').data(headerData)
    .join(
      enter => enter.append('text')
        .attr('class', 'partial-label dir-label')
        .attr('x', 4)
        .attr('y', 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => d.count + ' of ' + d.total + ' items');
}

// DEBUG: Visualize BSP partitions
// - Solid red: Partition with small items (2+ items -> will collapse)
// - Dashed red: Single small item partition (MISS - won't collapse)
// - Blue: Partition with no small items
function renderDebugPartitions(layer, hierarchy) {
  // Clear existing debug elements
  layer.selectAll('.debug-partition').remove();

  const nodesWithPartitions = hierarchy.descendants().filter(d => d._debugPartitions);

  nodesWithPartitions.forEach(node => {
    const partitions = node._debugPartitions;
    partitions.forEach((partition, i) => {
      const x0 = Math.min(...partition.map(n => n.x0));
      const y0 = Math.min(...partition.map(n => n.y0));
      const x1 = Math.max(...partition.map(n => n.x1));
      const y1 = Math.max(...partition.map(n => n.y1));

      const hasSmall = partition.some(n => tooSmallForLabel(n));
      const isSingle = partition.length === 1;

      layer.append('rect')
        .attr('class', 'debug-partition')
        .attr('x', x0 + 1)
        .attr('y', y0 + 1)
        .attr('width', x1 - x0 - 2)
        .attr('height', y1 - y0 - 2)
        .attr('fill', 'none')
        .attr('stroke', hasSmall ? '#ff3333' : '#3333ff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isSingle ? '4,4' : 'none')
        .attr('pointer-events', 'none');
    });
  });
}
`;
