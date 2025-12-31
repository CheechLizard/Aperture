export const PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Stack chart style: labels on left, fixed-width bars on right
// Uses plain DOM - no D3 layout algorithms needed here

const SVG_NS = 'http://www.w3.org/2000/svg';
const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 2;
const PARTITION_BAR_WIDTH = 384;     // Total width of diagram (3x original)
const PARTITION_LOC_SCALE = 4;       // Pixels per LOC (4px = 1 LOC)
const PARTITION_LABEL_GAP = 8;       // Gap between label and bar
const PARTITION_LABEL_SPACING = 16;  // Vertical spacing for collision detection
const PARTITION_SCALE_WIDTH = 36;    // Width reserved for LOC scale on left
const PARTITION_GRID_INTERVAL = 10;  // Grid line every N LOC
const CONTAINMENT_INDENT = 24;       // Pixels to indent per containment level (equal spacing)

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
  if (!file) {
    return { nodes: [], requiredHeight: height, maxDepth: 0, maxLine: 0 };
  }

  const maxLine = file.loc || 0;
  const contentStart = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const nodes = [];

  // Add file-level block first
  nodes.push({
    name: file.path.split('/').pop(),
    value: maxLine,
    line: 1,
    endLine: maxLine,
    depth: 0,
    filePath: file.path,
    uri: file.uri,
    isFileBlock: true,
    isContainer: true,
    blockType: 'file'
  });

  if (file.functions && file.functions.length > 0) {
    const sortedFunctions = file.functions
      .slice()
      .sort((a, b) => a.startLine - b.startLine);

    // Add functions and their nested blocks as nodes
    sortedFunctions.forEach((fn) => {
      // Add the function node
      nodes.push({
        name: fn.name,
        value: fn.loc,
        line: fn.startLine,
        endLine: fn.endLine,
        depth: fn.maxNestingDepth || 0,
        filePath: file.path,
        uri: fn.uri,
        isContainer: fn.isContainer || false,
        isFileBlock: false,
        blockType: fn.isContainer ? 'container' : 'function'
      });

      // Add nested blocks (if/for/etc) as nodes too
      const nestedBlocks = fn.nestedBlocks || [];
      nestedBlocks.forEach((block, idx) => {
        nodes.push({
          name: block.type,
          value: block.loc,
          line: block.startLine,
          endLine: block.endLine,
          depth: block.depth,
          filePath: file.path,
          uri: fn.uri + '-block-' + idx,
          isContainer: false,
          isFileBlock: false,
          blockType: block.type,
          isNestedBlock: true
        });
      });
    });
  }

  // Calculate containment depth for each node
  // File is always depth 0. Everything else counts containers that encompass it.
  nodes.forEach(node => {
    // File block is always at the top level
    if (node.isFileBlock) {
      node.containmentDepth = 0;
      return;
    }

    let containmentDepth = 0;
    for (const other of nodes) {
      if (other === node) continue;

      // File always contains everything else
      if (other.isFileBlock) {
        containmentDepth++;
        continue;
      }

      // For other nodes, check if they strictly contain this node
      // (must encompass the line range, and must be a container/function/nested block)
      const otherContainsNode = other.line <= node.line && other.endLine >= node.endLine;
      // Any block type can contain things inside it (containers, functions, nested blocks)
      const canContain = other.isContainer || other.blockType === 'function' || other.isNestedBlock;
      if (otherContainsNode && canContain) {
        containmentDepth++;
      }
    }
    node.containmentDepth = containmentDepth;
  });

  // Calculate y positions and x bounds based on containment depth
  // Deeper nodes indent from left only (all blocks extend to the same right edge)
  nodes.forEach(node => {
    node.y0 = contentStart + (node.line - 1) * PARTITION_LOC_SCALE;
    node.y1 = contentStart + node.endLine * PARTITION_LOC_SCALE;
    node.x0 = node.containmentDepth * CONTAINMENT_INDENT;
    node.x1 = PARTITION_BAR_WIDTH;  // All blocks extend to same right edge
  });

  const maxDepth = Math.max(0, ...nodes.map(n => n.containmentDepth));
  const requiredHeight = contentStart + maxLine * PARTITION_LOC_SCALE + PARTITION_PADDING;
  return { nodes, requiredHeight, maxDepth, maxLine };
}

// Calculate label positions - horizontal cascade (labels never move down)
function calculateLabelPositions(nodes) {
  // Labels are right-aligned just before the bar
  const labelX = -PARTITION_LABEL_GAP;

  // Exclude file blocks and nested blocks from labels
  const labelNodes = nodes.filter(d => !d.isFileBlock && !d.isNestedBlock);

  const labels = labelNodes.map(d => ({
    node: d,
    y: d.y0 + 11,  // Top-aligned (offset for text baseline)
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
  // Labels extend left (negative x), bars contained within PARTITION_BAR_WIDTH
  const labelPositions = calculateLabelPositions(nodes);
  const minLabelX = labelPositions.length > 0 ? Math.min(...labelPositions.map(l => l.x)) : 0;
  const diagramWidth = PARTITION_BAR_WIDTH - minLabelX;
  const centerOffset = (width - diagramWidth) / 2 - minLabelX;

  // Apply offset to all positions
  nodes.forEach(n => { n.x0 += centerOffset; n.x1 += centerOffset; });
  labelPositions.forEach(l => { l.x += centerOffset; });

  renderPartitionHeader(partitionLayer, file, width);
  renderLocScale(partitionLayer, partitionData.maxLine, width);
  renderPartitionRects(partitionLayer, nodes);
  renderPartitionLeaders(partitionLayer, labelPositions);
  renderPartitionLabels(partitionLayer, labelPositions);

  return { svg, partitionLayer, nodes };
}

function renderPartitionHeader(layer, file, width) {
  const headerData = file ? [{ path: file.path, name: file.path.split('/').pop() }] : [];

  syncElements(layer, 'rect.partition-header', headerData,
    d => d.path,
    () => {
      const rect = createSvgElement('rect');
      rect.setAttribute('class', 'partition-header');
      rect.setAttribute('x', 0);
      rect.setAttribute('y', 0);
      rect.setAttribute('height', PARTITION_HEADER_HEIGHT);
      return rect;
    },
    (el, d) => {
      el.setAttribute('width', width);
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
      el.setAttribute('x', PARTITION_SCALE_WIDTH + 8);
      el.textContent = truncateLabel(d.name, width - PARTITION_SCALE_WIDTH - 16, 7);
    }
  );
}

function renderLocScale(layer, maxLine, width) {
  const contentStart = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const gridLines = [];

  // Generate grid line data for every PARTITION_GRID_INTERVAL lines
  for (let line = PARTITION_GRID_INTERVAL; line <= maxLine; line += PARTITION_GRID_INTERVAL) {
    const y = contentStart + line * PARTITION_LOC_SCALE;
    gridLines.push({ line, y });
  }

  // Render grid lines (full width)
  syncElements(layer, 'line.partition-grid', gridLines,
    d => 'grid-' + d.line,
    () => {
      const gridLine = createSvgElement('line');
      gridLine.setAttribute('class', 'partition-grid');
      gridLine.setAttribute('stroke', 'rgba(255,255,255,0.08)');
      gridLine.setAttribute('stroke-width', 1);
      return gridLine;
    },
    (el, d) => {
      el.setAttribute('x1', 0);
      el.setAttribute('x2', width);
      el.setAttribute('y1', d.y);
      el.setAttribute('y2', d.y);
    }
  );

  // Render scale labels on left
  syncElements(layer, 'text.partition-scale', gridLines,
    d => 'scale-' + d.line,
    () => {
      const text = createSvgElement('text');
      text.setAttribute('class', 'partition-scale');
      text.setAttribute('fill', 'rgba(255,255,255,0.4)');
      text.setAttribute('font-size', '10px');
      text.setAttribute('text-anchor', 'end');
      return text;
    },
    (el, d) => {
      el.setAttribute('x', PARTITION_SCALE_WIDTH - 4);
      el.setAttribute('y', d.y + 3);
      el.textContent = d.line;
    }
  );
}

function renderPartitionRects(layer, nodes) {
  syncElements(layer, 'rect.partition-node', nodes,
    d => d.uri,
    () => {
      const rect = createSvgElement('rect');
      rect.setAttribute('class', 'partition-node node');
      rect.setAttribute('fill', FUNC_NEUTRAL_COLOR);
      rect.style.cursor = 'pointer';

      // Event handlers read from data attributes to avoid stale closure data
      rect.addEventListener('mouseover', e => {
        const el = e.target;
        const blockType = el.getAttribute('data-block-type');
        const isNested = el.getAttribute('data-is-nested') === 'true';
        let html;
        if (isNested) {
          html = '<div><strong>' + blockType + '</strong></div>' +
            '<div>Lines ' + el.getAttribute('data-line') + '-' + el.getAttribute('data-end-line') + ' \\u00b7 ' + el.getAttribute('data-loc') + ' LOC</div>' +
            '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        } else {
          const depth = el.getAttribute('data-depth');
          html = '<div><strong>' + el.getAttribute('data-name') + '</strong></div>' +
            '<div>Lines ' + el.getAttribute('data-line') + '-' + el.getAttribute('data-end-line') + ' \\u00b7 ' + el.getAttribute('data-loc') + ' LOC</div>' +
            (depth && depth !== '0' ? '<div>Nesting depth: ' + depth + '</div>' : '') +
            '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        }
        showTooltip(html, e);
      });
      rect.addEventListener('mousemove', e => positionTooltip(e));
      rect.addEventListener('mouseout', () => hideTooltip());
      rect.addEventListener('click', e => {
        const el = e.target;
        vscode.postMessage({ command: 'openFile', uri: el.getAttribute('data-uri'), line: parseInt(el.getAttribute('data-line')) });
      });

      return rect;
    },
    (el, d) => {
      // Update all data attributes on every render
      el.setAttribute('data-uri', d.uri);
      el.setAttribute('data-path', d.filePath);
      el.setAttribute('data-line', d.line);
      el.setAttribute('data-end-line', d.endLine);
      el.setAttribute('data-name', d.name);
      el.setAttribute('data-loc', d.value);
      el.setAttribute('data-depth', d.depth);
      el.setAttribute('data-block-type', d.blockType || '');
      el.setAttribute('data-is-nested', d.isNestedBlock ? 'true' : 'false');

      // Style based on block type:
      // - File block: very subtle outline
      // - Container (class/module/object): subtle fill with outline
      // - Function: solid fill
      // - Nested block (if/for/etc): progressively lighter based on depth
      if (d.isFileBlock) {
        el.setAttribute('fill', 'rgba(255,255,255,0.02)');
        el.setAttribute('stroke', 'rgba(255,255,255,0.08)');
        el.setAttribute('stroke-width', '1');
      } else if (d.isNestedBlock) {
        // Progressively lighter gray for deeper nesting (can reach white)
        const base = 50;
        const step = 20;
        const lightness = Math.min(base + d.containmentDepth * step, 255);
        el.setAttribute('fill', 'rgb(' + lightness + ',' + lightness + ',' + lightness + ')');
        el.removeAttribute('stroke');
        el.removeAttribute('stroke-width');
      } else if (d.isContainer) {
        el.setAttribute('fill', 'rgba(255,255,255,0.06)');
        el.setAttribute('stroke', 'rgba(255,255,255,0.15)');
        el.setAttribute('stroke-width', '1');
      } else {
        el.setAttribute('fill', FUNC_NEUTRAL_COLOR);
        el.removeAttribute('stroke');
        el.removeAttribute('stroke-width');
      }

      el.setAttribute('x', d.x0);
      el.setAttribute('y', d.y0);
      el.setAttribute('width', Math.max(1, d.x1 - d.x0));
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
      const labelY = d.y - 4;  // Adjust for text baseline
      const labelX = d.x + 4;  // Small gap after text
      const barLeft = d.node.x0;
      const barTopY = d.node.y0 + 6;  // Top of bar with small offset
      // Line from label to bar top
      el.setAttribute('d', 'M' + labelX + ',' + labelY + ' L' + barLeft + ',' + barTopY);
    }
  );
}

function renderPartitionLabels(layer, labelPositions) {
  // Remove old pill backgrounds if any
  layer.querySelectorAll('rect.partition-label-bg').forEach(el => el.remove());

  syncElements(layer, 'text.partition-label', labelPositions,
    d => d.node.uri,
    () => {
      const text = createSvgElement('text');
      text.setAttribute('class', 'partition-label');
      text.setAttribute('fill', 'rgba(255,255,255,0.7)');
      text.setAttribute('font-size', '11px');
      text.setAttribute('text-anchor', 'end');
      text.style.cursor = 'pointer';

      // Event handlers read from data attributes to avoid stale closure data
      text.addEventListener('mouseover', e => {
        const el = e.target;
        const depth = el.getAttribute('data-depth');
        const html = '<div><strong>' + el.getAttribute('data-name') + '</strong></div>' +
          '<div>Lines ' + el.getAttribute('data-line') + '-' + el.getAttribute('data-end-line') + ' \\u00b7 ' + el.getAttribute('data-loc') + ' LOC</div>' +
          (depth && depth !== '0' ? '<div>Nesting depth: ' + depth + '</div>' : '') +
          '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
        showTooltip(html, e);
        el.setAttribute('fill', '#fff');
      });
      text.addEventListener('mousemove', e => positionTooltip(e));
      text.addEventListener('mouseout', e => {
        hideTooltip();
        e.target.setAttribute('fill', 'rgba(255,255,255,0.7)');
      });
      text.addEventListener('click', e => {
        const el = e.target;
        vscode.postMessage({ command: 'openFile', uri: el.getAttribute('data-uri'), line: parseInt(el.getAttribute('data-line')) });
      });

      return text;
    },
    (el, d) => {
      // Update all data attributes on every render
      el.setAttribute('data-uri', d.node.uri);
      el.setAttribute('data-name', d.node.name);
      el.setAttribute('data-line', d.node.line);
      el.setAttribute('data-end-line', d.node.endLine);
      el.setAttribute('data-loc', d.node.value);
      el.setAttribute('data-depth', d.node.depth);

      el.textContent = d.text;
      el.setAttribute('x', d.x);
      el.setAttribute('y', d.y);
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
