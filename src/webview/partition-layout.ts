export const PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Stack chart style: labels on left, fixed-width bars on right
// Uses plain DOM - no D3 layout algorithms needed here

const SVG_NS = 'http://www.w3.org/2000/svg';
const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 2;
const PARTITION_BAR_WIDTH = 128;
const PARTITION_NESTING_WIDTH = 48;  // Width per nesting level
const PARTITION_LOC_SCALE = 4;       // Pixels per LOC (4px = 1 LOC)
const PARTITION_LABEL_GAP = 8;       // Gap between label and bar
const PARTITION_LABEL_SPACING = 16;  // Vertical spacing for collision detection

function createSvgElement(tag) {
  return document.createElementNS(SVG_NS, tag);
}

// Sync DOM elements with data array, keyed by attribute
function syncElements(parent, selector, data, keyFn, create, update) {
  const existing = new Map();
  parent.querySelectorAll(selector).forEach(el => {
    existing.set(el.getAttribute('data-key'), el);
  });

  const activeKeys = new Set();
  data.forEach((d, i) => {
    const key = keyFn(d, i);
    activeKeys.add(key);
    let el = existing.get(key);
    if (!el) {
      el = create(d);
      el.setAttribute('data-key', key);
      parent.appendChild(el);
    }
    update(el, d);
  });

  existing.forEach((el, key) => {
    if (!activeKeys.has(key)) el.remove();
  });
}

function buildPartitionData(file, width, height) {
  if (!file || !file.functions || file.functions.length === 0) {
    return { nodes: [], requiredHeight: height, maxDepth: 0 };
  }

  // Sort by startLine to preserve document order
  const sortedFunctions = file.functions
    .slice()
    .sort((a, b) => a.startLine - b.startLine);

  // 1px = 1 LOC - direct mapping
  const totalPadding = (sortedFunctions.length - 1) * PARTITION_PADDING;

  // Find max nesting depth for diagram width calculation
  const maxDepth = Math.max(0, ...sortedFunctions.map(fn => fn.maxNestingDepth || 0));

  // Build partition nodes with scaled LOC heights
  let currentY = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const nodes = sortedFunctions.map((fn) => {
    const nodeHeight = fn.loc * PARTITION_LOC_SCALE;

    // Bars at fixed position (will be centered later)
    const barX = 0;
    const node = {
      name: fn.name,
      value: fn.loc,
      line: fn.startLine,
      endLine: fn.endLine,
      depth: fn.maxNestingDepth || 0,
      params: fn.parameterCount,
      filePath: file.path,
      uri: fn.uri,
      nestedBlocks: fn.nestedBlocks || [],
      x0: barX,
      y0: currentY,
      x1: barX + PARTITION_BAR_WIDTH,
      y1: currentY + nodeHeight
    };

    currentY += nodeHeight + PARTITION_PADDING;
    return node;
  });

  // Calculate required height
  const totalLoc = sortedFunctions.reduce((sum, fn) => sum + fn.loc, 0);
  const scaledLoc = totalLoc * PARTITION_LOC_SCALE;
  const requiredHeight = PARTITION_HEADER_HEIGHT + (PARTITION_PADDING * 2) + scaledLoc + totalPadding;

  return { nodes, requiredHeight, maxDepth };
}

// Calculate label positions - horizontal cascade (labels never move down)
function calculateLabelPositions(nodes) {
  // Labels are right-aligned just before the bar
  const labelX = -PARTITION_LABEL_GAP;

  const labels = nodes.map(d => ({
    node: d,
    y: d.y0 + (d.y1 - d.y0) / 2,  // Always centered on bar vertically
    x: labelX,
    column: 0,  // Track which column (0 = closest to bar)
    text: d.name + ' (' + d.value + ')'
  }));

  // Cascade LEFT if overlapping vertically - labels stay at their bar's Y
  const COLUMN_WIDTH = 120;  // Width per column
  for (let i = 1; i < labels.length; i++) {
    const curr = labels[i];
    // Check all previous labels for vertical overlap
    for (let j = 0; j < i; j++) {
      const prev = labels[j];
      const sameColumn = curr.column === prev.column;
      const verticalOverlap = Math.abs(curr.y - prev.y) < PARTITION_LABEL_SPACING;
      if (sameColumn && verticalOverlap) {
        curr.column++;
        curr.x = labelX - curr.column * COLUMN_WIDTH;
        j = -1;  // Restart overlap check with new position
      }
    }
  }

  return labels;
}

// Render partition layout
function renderPartitionLayout(container, file, width, height, t, targetLayer) {
  // Handle D3 selection passed as targetLayer (from distribution-chart zoom animations)
  if (targetLayer && typeof targetLayer.node === 'function') {
    targetLayer = targetLayer.node();
  }

  let svg = container.querySelector('svg');
  if (!svg) {
    container.innerHTML = '';
    svg = createSvgElement('svg');
    container.appendChild(svg);
  }

  // Build partition data
  const partitionData = buildPartitionData(file, width, height);
  const nodes = partitionData.nodes;
  const svgHeight = partitionData.requiredHeight;
  const maxDepth = partitionData.maxDepth;

  svg.setAttribute('width', width);
  svg.setAttribute('height', svgHeight);

  let partitionLayer = targetLayer;
  if (!partitionLayer) {
    partitionLayer = svg.querySelector('g.partition-layer');
    if (!partitionLayer) {
      partitionLayer = createSvgElement('g');
      partitionLayer.setAttribute('class', 'partition-layer');
      svg.appendChild(partitionLayer);
    }
  }

  // Calculate diagram width and center offset
  // Labels extend left (negative x), bars at 0 to BAR_WIDTH, nesting extends right
  const labelPositions = calculateLabelPositions(nodes);
  const minLabelX = labelPositions.length > 0 ? Math.min(...labelPositions.map(l => l.x)) : 0;
  const nestingWidth = maxDepth * PARTITION_NESTING_WIDTH;
  const diagramWidth = PARTITION_BAR_WIDTH + nestingWidth - minLabelX;
  const centerOffset = (width - diagramWidth) / 2 - minLabelX;

  // Apply offset to all positions
  nodes.forEach(n => { n.x0 += centerOffset; n.x1 += centerOffset; });
  labelPositions.forEach(l => { l.x += centerOffset; });

  renderPartitionHeader(partitionLayer, file, minLabelX + centerOffset, diagramWidth);
  renderPartitionRects(partitionLayer, nodes);
  renderPartitionNesting(partitionLayer, nodes);
  renderPartitionLeaders(partitionLayer, labelPositions);
  renderPartitionLabels(partitionLayer, labelPositions);

  return { svg, partitionLayer, nodes };
}

function renderPartitionHeader(layer, file, minLabelX, diagramWidth) {
  const headerData = file ? [{ path: file.path, name: file.path.split('/').pop() }] : [];

  syncElements(layer, 'rect.partition-header', headerData,
    d => d.path,
    () => {
      const rect = createSvgElement('rect');
      rect.setAttribute('class', 'partition-header');
      rect.setAttribute('y', 0);
      rect.setAttribute('height', PARTITION_HEADER_HEIGHT);
      return rect;
    },
    (el, d) => {
      el.setAttribute('x', minLabelX);
      el.setAttribute('width', diagramWidth);
    }
  );

  syncElements(layer, 'text.partition-header-label', headerData,
    d => d.path,
    () => {
      const text = createSvgElement('text');
      text.setAttribute('class', 'partition-header-label');
      text.setAttribute('y', 16);
      return text;
    },
    (el, d) => {
      el.setAttribute('x', minLabelX + 8);
      el.textContent = truncateLabel(d.name, diagramWidth - 16, 7);
    }
  );
}

function renderPartitionRects(layer, nodes) {
  syncElements(layer, 'rect.partition-node', nodes,
    d => d.uri,
    d => {
      const rect = createSvgElement('rect');
      rect.setAttribute('class', 'partition-node node');
      rect.setAttribute('data-uri', d.uri);
      rect.setAttribute('data-path', d.filePath);
      rect.setAttribute('data-line', d.line);
      rect.setAttribute('data-end-line', d.endLine);
      rect.setAttribute('fill', FUNC_NEUTRAL_COLOR);
      rect.style.cursor = 'pointer';

      rect.addEventListener('mouseover', e => {
        const html = '<div><strong>' + d.name + '</strong></div>' +
          '<div>Lines ' + d.line + '-' + d.endLine + ' \\u00b7 ' + d.value + ' LOC</div>' +
          (d.depth ? '<div>Nesting depth: ' + d.depth + '</div>' : '') +
          '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        showTooltip(html, e);
      });
      rect.addEventListener('mousemove', e => positionTooltip(e));
      rect.addEventListener('mouseout', () => hideTooltip());
      rect.addEventListener('click', () => {
        vscode.postMessage({ command: 'openFile', uri: d.uri, line: d.line });
      });

      return rect;
    },
    (el, d) => {
      el.setAttribute('x', d.x0);
      el.setAttribute('y', d.y0);
      el.setAttribute('width', d.x1 - d.x0);
      el.setAttribute('height', Math.max(1, d.y1 - d.y0));
    }
  );
}

function renderPartitionNesting(layer, nodes) {
  // Build nesting data from actual nested blocks
  const nestingData = [];
  nodes.forEach(node => {
    const blocks = node.nestedBlocks || [];
    blocks.forEach((block, idx) => {
      // Calculate Y position relative to function start (scaled)
      const relativeStart = (block.startLine - node.line) * PARTITION_LOC_SCALE;
      const y0 = node.y0 + relativeStart;
      const y1 = y0 + block.loc * PARTITION_LOC_SCALE;

      nestingData.push({
        node: node,
        block: block,
        idx: idx,
        x0: node.x1 + (block.depth - 1) * PARTITION_NESTING_WIDTH,
        x1: node.x1 + block.depth * PARTITION_NESTING_WIDTH,
        y0: y0,
        y1: y1
      });
    });
  });

  syncElements(layer, 'rect.partition-nesting', nestingData,
    d => d.node.uri + '-' + d.idx,
    d => {
      const rect = createSvgElement('rect');
      rect.setAttribute('class', 'partition-nesting node');
      rect.setAttribute('data-uri', d.node.uri);
      rect.setAttribute('data-path', d.node.filePath);
      rect.setAttribute('data-line', d.block.startLine);
      rect.setAttribute('data-end-line', d.block.endLine);
      rect.style.cursor = 'pointer';

      // Progressively lighter gray for deeper nesting
      const base = 60;
      const step = 15;
      const lightness = Math.min(base + d.block.depth * step, 120);
      rect.setAttribute('fill', 'rgb(' + lightness + ',' + lightness + ',' + lightness + ')');

      rect.addEventListener('mouseover', e => {
        const html = '<div><strong>' + d.block.type + '</strong></div>' +
          '<div>Lines ' + d.block.startLine + '-' + d.block.endLine + ' \\u00b7 ' + d.block.loc + ' LOC</div>' +
          '<div>Depth: ' + d.block.depth + '</div>' +
          '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        showTooltip(html, e);
      });
      rect.addEventListener('mousemove', e => positionTooltip(e));
      rect.addEventListener('mouseout', () => hideTooltip());
      rect.addEventListener('click', () => {
        vscode.postMessage({ command: 'openFile', uri: d.node.uri, line: d.block.startLine });
      });

      return rect;
    },
    (el, d) => {
      el.setAttribute('x', d.x0);
      el.setAttribute('y', d.y0);
      el.setAttribute('width', d.x1 - d.x0);
      el.setAttribute('height', Math.max(1, d.y1 - d.y0));
    }
  );
}

function renderPartitionLeaders(layer, labelPositions) {
  syncElements(layer, 'path.partition-leader', labelPositions,
    d => d.node.uri,
    d => {
      const path = createSvgElement('path');
      path.setAttribute('class', 'partition-leader');
      path.setAttribute('data-uri', d.node.uri);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'rgba(255,255,255,0.15)');
      path.setAttribute('stroke-width', 1);
      return path;
    },
    (el, d) => {
      const labelY = d.y;
      const labelX = d.x + 4;  // Small gap after text
      const barLeft = d.node.x0;
      const barCenterY = d.node.y0 + (d.node.y1 - d.node.y0) / 2;
      // Line from label to bar center
      el.setAttribute('d', 'M' + labelX + ',' + labelY + ' L' + barLeft + ',' + barCenterY);
    }
  );
}

function renderPartitionLabels(layer, labelPositions) {
  // Remove old pill backgrounds if any
  layer.querySelectorAll('rect.partition-label-bg').forEach(el => el.remove());

  syncElements(layer, 'text.partition-label', labelPositions,
    d => d.node.uri,
    d => {
      const text = createSvgElement('text');
      text.setAttribute('class', 'partition-label');
      text.setAttribute('data-uri', d.node.uri);
      text.setAttribute('fill', 'rgba(255,255,255,0.7)');
      text.setAttribute('font-size', '11px');
      text.setAttribute('text-anchor', 'end');
      text.style.cursor = 'pointer';

      text.addEventListener('mouseover', e => {
        const n = d.node;
        const html = '<div><strong>' + n.name + '</strong></div>' +
          '<div>Lines ' + n.line + '-' + n.endLine + ' \\u00b7 ' + n.value + ' LOC</div>' +
          (n.depth ? '<div>Nesting depth: ' + n.depth + '</div>' : '') +
          '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        showTooltip(html, e);
        e.target.setAttribute('fill', '#fff');
      });
      text.addEventListener('mousemove', e => positionTooltip(e));
      text.addEventListener('mouseout', e => {
        hideTooltip();
        e.target.setAttribute('fill', 'rgba(255,255,255,0.7)');
      });
      text.addEventListener('click', () => {
        vscode.postMessage({ command: 'openFile', uri: d.node.uri, line: d.node.line });
      });

      return text;
    },
    (el, d) => {
      el.textContent = d.text;
      el.setAttribute('x', d.x);
      el.setAttribute('y', d.y + 4);
    }
  );
}

function clearPartitionLayer(container) {
  const svg = container.querySelector('svg');
  if (svg) {
    const partitionLayer = svg.querySelector('g.partition-layer');
    if (partitionLayer) {
      partitionLayer.innerHTML = '';
    }
  }
}
`;
