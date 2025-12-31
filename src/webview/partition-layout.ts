export const PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Stack chart style: labels on left, fixed-width bars on right
// 1px = 1 LOC for true proportional representation

const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 2;
const PARTITION_BAR_WIDTH = 128;
const PARTITION_NESTING_WIDTH = 48;  // Width per nesting level
const PARTITION_LOC_SCALE = 2;       // Pixels per LOC (2px = 1 LOC)
const PARTITION_LABEL_HEIGHT = 14;
const PARTITION_LABEL_GAP = 8;       // Gap between label and bar
const PARTITION_LABEL_SPACING = 16;  // Vertical spacing for collision detection

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
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
  }

  // Build partition data
  const partitionData = buildPartitionData(file, width, height);
  const nodes = partitionData.nodes;
  const svgHeight = partitionData.requiredHeight;
  const maxDepth = partitionData.maxDepth;

  svg.attr('width', width).attr('height', svgHeight);

  let partitionLayer = targetLayer;
  if (!partitionLayer) {
    partitionLayer = svg.select('g.partition-layer');
    if (partitionLayer.empty()) {
      partitionLayer = svg.append('g').attr('class', 'partition-layer');
    }
  }

  // Calculate diagram width and center offset
  // Labels extend left (negative x), bars at 0 to BAR_WIDTH, nesting extends right
  const labelPositions = calculateLabelPositions(nodes);
  const minLabelX = labelPositions.length > 0 ? Math.min(...labelPositions.map(l => l.x)) : 0;
  const nestingWidth = maxDepth * PARTITION_NESTING_WIDTH;
  const diagramWidth = PARTITION_BAR_WIDTH + nestingWidth - minLabelX;
  const centerOffset = (width - diagramWidth) / 2 - minLabelX;

  // Clear transform (we'll apply offset directly to positions)
  partitionLayer.attr('transform', null);

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

  layer.selectAll('rect.partition-header').data(headerData, d => d.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-header')
        .attr('y', 0)
        .attr('height', PARTITION_HEADER_HEIGHT),
      update => update,
      exit => exit.remove()
    )
    .attr('x', minLabelX)
    .attr('width', diagramWidth);

  layer.selectAll('text.partition-header-label').data(headerData, d => d.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-header-label')
        .attr('y', 16),
      update => update,
      exit => exit.remove()
    )
    .attr('x', minLabelX + 8)
    .text(d => truncateLabel(d.name, diagramWidth - 16, 7));
}

function renderPartitionRects(layer, nodes) {
  layer.selectAll('rect.partition-node').data(nodes, d => d.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-node node')
        .attr('data-uri', d => d.uri)
        .attr('data-path', d => d.filePath)
        .attr('data-line', d => d.line)
        .attr('data-end-line', d => d.endLine)
        .attr('fill', FUNC_NEUTRAL_COLOR),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.name + '</strong></div>' +
        '<div>Lines ' + d.line + '-' + d.endLine + ' \\u00b7 ' + d.value + ' LOC</div>' +
        (d.depth ? '<div>Nesting depth: ' + d.depth + '</div>' : '') +
        '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', uri: d.uri, line: d.line });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => Math.max(1, d.y1 - d.y0));
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

  layer.selectAll('rect.partition-nesting').data(nestingData, d => d.node.uri + '-' + d.idx)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-nesting'),
      update => update,
      exit => exit.remove()
    )
    .attr('fill', d => {
      // Progressively lighter gray for deeper nesting
      const base = 60;
      const step = 15;
      const lightness = Math.min(base + d.block.depth * step, 120);
      return 'rgb(' + lightness + ',' + lightness + ',' + lightness + ')';
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', d => Math.max(1, d.y1 - d.y0));
}

function renderPartitionLeaders(layer, labelPositions) {
  layer.selectAll('path.partition-leader').data(labelPositions, d => d.node.uri)
    .join(
      enter => enter.append('path')
        .attr('class', 'partition-leader')
        .attr('data-uri', d => d.node.uri)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 1),
      update => update,
      exit => exit.remove()
    )
    .attr('d', d => {
      const labelY = d.y;
      const labelX = d.x + 4;  // Small gap after text
      const barLeft = d.node.x0;
      const barCenterY = d.node.y0 + (d.node.y1 - d.node.y0) / 2;
      // Line from label to bar center
      return 'M' + labelX + ',' + labelY + ' L' + barLeft + ',' + barCenterY;
    });
}

function renderPartitionLabels(layer, labelPositions) {
  // Remove old pill backgrounds if any
  layer.selectAll('rect.partition-label-bg').remove();

  // Label text - right-aligned, interactive
  layer.selectAll('text.partition-label').data(labelPositions, d => d.node.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-label')
        .attr('data-uri', d => d.node.uri)
        .attr('fill', 'rgba(255,255,255,0.7)')
        .attr('font-size', '11px')
        .attr('text-anchor', 'end')
        .attr('cursor', 'pointer'),
      update => update,
      exit => exit.remove()
    )
    .on('mouseover', (e, d) => {
      const n = d.node;
      const html = '<div><strong>' + n.name + '</strong></div>' +
        '<div>Lines ' + n.line + '-' + n.endLine + ' \\u00b7 ' + n.value + ' LOC</div>' +
        (n.depth ? '<div>Nesting depth: ' + n.depth + '</div>' : '') +
        '<div style="color:var(--vscode-descriptionForeground)">Click to open in editor</div>';
      showTooltip(html, e);
      d3.select(e.target).attr('fill', '#fff');
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', (e) => {
      hideTooltip();
      d3.select(e.target).attr('fill', 'rgba(255,255,255,0.7)');
    })
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', uri: d.node.uri, line: d.node.line });
    })
    .text(d => d.text)
    .attr('x', d => d.x)
    .attr('y', d => d.y + 4);
}

function clearPartitionLayer(container) {
  const svg = d3.select(container).select('svg');
  if (!svg.empty()) {
    const partitionLayer = svg.select('g.partition-layer');
    partitionLayer.selectAll('*').remove();
  }
}
`;
