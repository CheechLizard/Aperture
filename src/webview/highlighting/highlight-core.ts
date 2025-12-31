export const HIGHLIGHT_CORE_SCRIPT = `
// Core node highlighting functions for treemap and chord diagram

function updateStatusButton() {
  updateStatus();
}

// Pure DOM operation - highlights nodes matching the given URIs or file paths
// lineMap is optional: { filePath: [line1, line2, ...] } for function-level highlighting
function highlightNodes(urisOrPaths, lineMap) {
  // Clear previous highlights and reset inline styles from animation
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
    el.style.removeProperty('fill');
    el.style.removeProperty('fill-opacity');
  });

  // Also clear partition label/leader styles
  document.querySelectorAll('.partition-label, .partition-leader').forEach(el => {
    el.style.removeProperty('fill');
    el.style.removeProperty('stroke');
    el.style.removeProperty('stroke-opacity');
  });

  if (urisOrPaths.length === 0) return;

  // Build a set of paths for matching (extract from URIs if needed)
  const pathSet = new Set();
  for (const item of urisOrPaths) {
    if (item.startsWith('file://')) {
      pathSet.add(getFilePath(item));
    } else {
      pathSet.add(item);
    }
  }

  lineMap = lineMap || {};

  // For partition nodes with line info, find the MOST SPECIFIC (smallest) container
  // that contains each issue line, then highlight that and its children only
  const partitionNodes = [];
  const otherNodes = [];

  document.querySelectorAll('.node').forEach(node => {
    const nodeLine = node.getAttribute('data-line');
    const nodeEndLine = node.getAttribute('data-end-line');
    const path = node.getAttribute('data-path');

    if (nodeLine && nodeEndLine && path) {
      partitionNodes.push({
        el: node,
        path: path,
        startLine: parseInt(nodeLine),
        endLine: parseInt(nodeEndLine),
        loc: parseInt(nodeEndLine) - parseInt(nodeLine) + 1,
        uri: node.getAttribute('data-uri'),
        blockType: node.getAttribute('data-block-type'),
        isNested: node.getAttribute('data-is-nested') === 'true'
      });
    } else {
      otherNodes.push(node);
    }
  });

  // For each file with line-specific issues, find and highlight the most specific containers
  for (const [filePath, lines] of Object.entries(lineMap)) {
    if (!lines || lines.length === 0) continue;

    // Get all partition nodes for this file
    const filePartitionNodes = partitionNodes.filter(n => n.path === filePath);

    for (const issueLine of lines) {
      // Find all nodes that contain this line
      const containingNodes = filePartitionNodes.filter(n =>
        issueLine >= n.startLine && issueLine <= n.endLine
      );

      if (containingNodes.length === 0) continue;

      // Find the smallest (most specific) container - the one with smallest LOC
      // NEVER select the file block if there are other candidates (different LOC counting methods)
      const mostSpecific = containingNodes.reduce((best, curr) => {
        // File blocks always lose to non-file blocks
        if (best.blockType === 'file' && curr.blockType !== 'file') return curr;
        if (curr.blockType === 'file' && best.blockType !== 'file') return best;
        // Between non-file blocks, prefer smaller LOC
        if (curr.loc < best.loc) return curr;
        return best;
      });

      // Highlight the most specific container
      mostSpecific.el.classList.add('highlighted');

      // Also highlight nested blocks (if/for/etc) within the most specific container
      // But NOT other functions/containers - those are separate issues
      filePartitionNodes.forEach(n => {
        if (n.isNested && n.startLine >= mostSpecific.startLine && n.endLine <= mostSpecific.endLine) {
          n.el.classList.add('highlighted');
        }
      });
    }
  }

  // Handle file-level highlighting (no line info) for non-partition nodes
  otherNodes.forEach(node => {
    const uri = node.getAttribute('data-uri');
    const path = node.getAttribute('data-path');
    const collapsedPaths = node.getAttribute('data-collapsed-paths');

    if (uri && urisOrPaths.includes(uri)) {
      node.classList.add('highlighted');
    } else if (path && pathSet.has(path)) {
      node.classList.add('highlighted');
    } else if (collapsedPaths) {
      // "N small items" node - highlight if any collapsed path matches
      const paths = collapsedPaths.split(',');
      for (const p of paths) {
        if (pathSet.has(p)) {
          node.classList.add('highlighted');
          break;
        }
        // Also check if collapsed path is a folder containing highlighted files
        const folderPrefix = p.endsWith('/') ? p : p + '/';
        for (const filePath of pathSet) {
          if (filePath.startsWith(folderPrefix)) {
            node.classList.add('highlighted');
            break;
          }
        }
        if (node.classList.contains('highlighted')) break;
      }
    } else if (path) {
      // Highlight folders that contain highlighted files
      const folderPrefix = path.endsWith('/') ? path : path + '/';
      for (const filePath of pathSet) {
        if (filePath.startsWith(folderPrefix)) {
          node.classList.add('highlighted');
          break;
        }
      }
    }
  });

  // For file-level issues (path in pathSet but no lineMap entry), highlight the file block
  partitionNodes.forEach(n => {
    if (pathSet.has(n.path) && !lineMap[n.path]) {
      // File-level issue - only highlight the file block (line 1)
      if (n.startLine === 1 && n.el.getAttribute('data-block-type') === 'file') {
        n.el.classList.add('highlighted');
      }
    }
  });

  // Highlight chord arcs (still using data-path for now)
  document.querySelectorAll('.chord-arc').forEach(arc => {
    const path = arc.getAttribute('data-path');
    if (path && pathSet.has(path)) {
      arc.classList.add('highlighted');
    }
  });

  // Highlight ribbons where source or target matches
  document.querySelectorAll('.chord-ribbon').forEach(ribbon => {
    const from = ribbon.getAttribute('data-from');
    const to = ribbon.getAttribute('data-to');
    if ((from && pathSet.has(from)) || (to && pathSet.has(to))) {
      ribbon.classList.add('highlighted');
    }
  });

  // Immediately style all highlighted elements in a single batch (avoid multiple paints)
  // Collect all elements first, then apply all styles together
  const highlightedNodes = document.querySelectorAll('.node.highlighted');
  const highlightedArcs = document.querySelectorAll('.chord-arc.highlighted');
  const highlightedRibbons = document.querySelectorAll('.chord-ribbon.highlighted');

  // Collect URIs for labels/leaders/nesting blocks
  const highlightedUris = new Set();
  highlightedNodes.forEach(node => {
    const uri = node.getAttribute('data-uri');
    if (uri) highlightedUris.add(uri);
  });

  // Highlight partition-nesting nodes whose parent function is highlighted
  document.querySelectorAll('.partition-nesting').forEach(nesting => {
    const uri = nesting.getAttribute('data-uri');
    if (uri && highlightedUris.has(uri)) {
      nesting.classList.add('highlighted');
    }
  });

  // Re-query to include newly highlighted nesting blocks
  const allHighlightedNodes = document.querySelectorAll('.node.highlighted');

  // Collect matching labels/leaders
  const matchingLabels = [];
  const matchingLeaders = [];
  document.querySelectorAll('.partition-label').forEach(el => {
    if (highlightedUris.has(el.getAttribute('data-uri'))) matchingLabels.push(el);
  });
  document.querySelectorAll('.partition-leader').forEach(el => {
    if (highlightedUris.has(el.getAttribute('data-uri'))) matchingLeaders.push(el);
  });

  // Now apply all styles in one batch
  if (allHighlightedNodes.length > 0) {
    const t = (Date.now() % 3000) / 3000;
    const colors = [[100, 149, 237], [147, 112, 219], [64, 224, 208]];
    const segment = t * 3;
    const idx = Math.floor(segment) % 3;
    const nextIdx = (idx + 1) % 3;
    const localT = segment - Math.floor(segment);
    const r = Math.round(colors[idx][0] + (colors[nextIdx][0] - colors[idx][0]) * localT);
    const g = Math.round(colors[idx][1] + (colors[nextIdx][1] - colors[idx][1]) * localT);
    const b = Math.round(colors[idx][2] + (colors[nextIdx][2] - colors[idx][2]) * localT);
    const color = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

    // Apply all fill styles
    allHighlightedNodes.forEach(n => { n.style.setProperty('fill', color, 'important'); n.style.setProperty('fill-opacity', '0.75', 'important'); });
    highlightedArcs.forEach(a => { a.style.setProperty('fill', color, 'important'); a.style.setProperty('fill-opacity', '0.75', 'important'); });
    highlightedRibbons.forEach(r => { r.style.setProperty('fill', color, 'important'); r.style.setProperty('fill-opacity', '0.5', 'important'); });
    matchingLabels.forEach(l => { l.style.setProperty('fill', color, 'important'); });
    matchingLeaders.forEach(l => { l.style.setProperty('stroke', color, 'important'); l.style.setProperty('stroke-opacity', '0.75', 'important'); });
  }

  // Update scroll indicators after styling
  // Use requestAnimationFrame to ensure DOM has painted
  if (typeof updateScrollIndicators === 'function') {
    requestAnimationFrame(() => updateScrollIndicators());
  }
}
`;
