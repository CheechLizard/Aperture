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
  document.querySelectorAll('.partition-label-bg, .partition-leader').forEach(el => {
    el.style.removeProperty('fill');
    el.style.removeProperty('fill-opacity');
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

  // Highlight matching nodes (check both data-uri and data-path for compatibility)
  document.querySelectorAll('.node').forEach(node => {
    const uri = node.getAttribute('data-uri');
    const path = node.getAttribute('data-path');
    const collapsedPaths = node.getAttribute('data-collapsed-paths');
    const nodeLine = node.getAttribute('data-line');
    const nodeEndLine = node.getAttribute('data-end-line');

    // For partition-node (function) elements, check line ranges
    if (nodeLine && nodeEndLine && path) {
      const lines = lineMap[path];
      if (lines && lines.length > 0) {
        // Only highlight if an issue line falls within this function's range
        const startLine = parseInt(nodeLine);
        const endLine = parseInt(nodeEndLine);
        const matches = lines.some(l => l >= startLine && l <= endLine);
        if (matches) {
          node.classList.add('highlighted');
        }
        return; // Don't fall through to file-level matching
      }
      // If no line info for this file, don't highlight function nodes
      // (file-level highlighting happens on file nodes, not function nodes)
      return;
    }

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

  // Collect URIs for labels/leaders
  const highlightedUris = new Set();
  highlightedNodes.forEach(node => {
    const uri = node.getAttribute('data-uri');
    if (uri) highlightedUris.add(uri);
  });

  // Collect matching labels/leaders
  const matchingLabels = [];
  const matchingLeaders = [];
  document.querySelectorAll('.partition-label-bg').forEach(el => {
    if (highlightedUris.has(el.getAttribute('data-uri'))) matchingLabels.push(el);
  });
  document.querySelectorAll('.partition-leader').forEach(el => {
    if (highlightedUris.has(el.getAttribute('data-uri'))) matchingLeaders.push(el);
  });

  // Now apply all styles in one batch
  if (highlightedNodes.length > 0) {
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
    highlightedNodes.forEach(n => { n.style.setProperty('fill', color, 'important'); n.style.setProperty('fill-opacity', '0.75', 'important'); });
    highlightedArcs.forEach(a => { a.style.setProperty('fill', color, 'important'); a.style.setProperty('fill-opacity', '0.75', 'important'); });
    highlightedRibbons.forEach(r => { r.style.setProperty('fill', color, 'important'); r.style.setProperty('fill-opacity', '0.5', 'important'); });
    matchingLabels.forEach(l => { l.style.setProperty('fill', color, 'important'); l.style.setProperty('fill-opacity', '0.75', 'important'); });
    matchingLeaders.forEach(l => { l.style.setProperty('stroke', color, 'important'); l.style.setProperty('stroke-opacity', '0.75', 'important'); });
  }

  // Update scroll indicators after styling
  if (typeof updateScrollIndicators === 'function') {
    updateScrollIndicators();
  }
}

// Handle AI response highlights (separate from user selection)
function updateHighlights(relevantFiles) {
  // AI responses temporarily override the visual highlight
  // but don't change the selection state
  highlightNodes(relevantFiles);
}
`;
