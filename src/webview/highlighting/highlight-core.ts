export const HIGHLIGHT_CORE_SCRIPT = `
// Core node highlighting functions for treemap and chord diagram

function updateStatusButton() {
  updateStatus();
}

// Pure DOM operation - highlights nodes matching the given URIs or file paths
function highlightNodes(urisOrPaths) {
  // Clear previous highlights and reset inline styles from animation
  document.querySelectorAll('.node.highlighted, .chord-arc.highlighted, .chord-ribbon.highlighted').forEach(el => {
    el.classList.remove('highlighted');
    el.style.removeProperty('fill');
    el.style.removeProperty('fill-opacity');
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

  // Highlight matching nodes (check both data-uri and data-path for compatibility)
  document.querySelectorAll('.node').forEach(node => {
    const uri = node.getAttribute('data-uri');
    const path = node.getAttribute('data-path');
    if (uri && urisOrPaths.includes(uri)) {
      node.classList.add('highlighted');
    } else if (path && pathSet.has(path)) {
      node.classList.add('highlighted');
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
}

// Handle AI response highlights (separate from user selection)
function updateHighlights(relevantFiles) {
  // AI responses temporarily override the visual highlight
  // but don't change the selection state
  highlightNodes(relevantFiles);
}
`;
