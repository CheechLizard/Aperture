export const PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Stack chart style: labels on left, fixed-width bars on right
// 1px = 1 LOC for true proportional representation

const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 1;
const PARTITION_BAR_WIDTH = 128;
const PARTITION_LABEL_HEIGHT = 18;
const PARTITION_LABEL_WIDTH = 140;  // Fixed width for all labels
const PARTITION_LABEL_GAP = 12;     // Gap between cascaded labels
const PARTITION_LABEL_PADDING = 8;  // Left/right padding inside label
const PARTITION_LABEL_SPACING = 22; // Vertical spacing for collision detection (> LABEL_HEIGHT)

function buildPartitionData(file, width, height) {
  if (!file || !file.functions || file.functions.length === 0) {
    return { nodes: [], requiredHeight: height };
  }

  // Sort by startLine to preserve document order
  const sortedFunctions = file.functions
    .slice()
    .sort((a, b) => a.startLine - b.startLine);

  // 1px = 1 LOC - direct mapping
  const totalPadding = (sortedFunctions.length - 1) * PARTITION_PADDING;

  // Build partition nodes with exact LOC heights
  let currentY = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const nodes = sortedFunctions.map((fn) => {
    const nodeHeight = fn.loc; // 1px per LOC

    // Bars at fixed position (will be centered later)
    const barX = 0;
    const node = {
      name: fn.name,
      value: fn.loc,
      line: fn.startLine,
      endLine: fn.endLine,
      depth: fn.maxNestingDepth,
      params: fn.parameterCount,
      filePath: file.path,
      uri: fn.uri,
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
  const requiredHeight = PARTITION_HEADER_HEIGHT + (PARTITION_PADDING * 2) + totalLoc + totalPadding;

  return { nodes, requiredHeight };
}

// Calculate label positions with horizontal cascade (labels never move down)
function calculateLabelPositions(nodes, width) {
  // Labels start just left of the bars (bars are at x=0 to PARTITION_BAR_WIDTH)
  const labelStart = -PARTITION_LABEL_GAP - PARTITION_LABEL_WIDTH;

  const labels = nodes.map(d => ({
    node: d,
    y: d.y0 + (d.y1 - d.y0) / 2,  // Always centered on bar vertically
    x: labelStart,                 // Start position (rightmost column, to left of bars)
    text: d.name + ' (' + d.value + ')'
  }));

  // For each label, cascade LEFT if it overlaps vertically with any label in the same column
  for (let i = 1; i < labels.length; i++) {
    const curr = labels[i];

    // Keep moving left until no vertical overlap with labels in the same column
    let hasOverlap = true;
    while (hasOverlap) {
      hasOverlap = false;
      for (let j = 0; j < i; j++) {
        const prev = labels[j];
        // Same column (within label width) and vertical overlap?
        const sameColumn = Math.abs(prev.x - curr.x) < PARTITION_LABEL_WIDTH;
        const verticalOverlap = Math.abs(curr.y - prev.y) < PARTITION_LABEL_SPACING;
        if (sameColumn && verticalOverlap) {
          curr.x = prev.x - PARTITION_LABEL_WIDTH - PARTITION_LABEL_GAP;
          hasOverlap = true;
          break;
        }
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

  svg.attr('width', width).attr('height', svgHeight);

  let partitionLayer = targetLayer;
  if (!partitionLayer) {
    partitionLayer = svg.select('g.partition-layer');
    if (partitionLayer.empty()) {
      partitionLayer = svg.append('g').attr('class', 'partition-layer');
    }
  }

  // Calculate diagram width and center offset
  // Bars are at x=0 to PARTITION_BAR_WIDTH, labels extend to the left (negative x)
  const labelPositions = calculateLabelPositions(nodes, width);
  const minLabelX = labelPositions.length > 0 ? Math.min(...labelPositions.map(l => l.x)) : 0;
  const diagramWidth = PARTITION_BAR_WIDTH - minLabelX;  // From leftmost label to bar right edge
  const centerOffset = (width - diagramWidth) / 2 - minLabelX;

  // Clear transform (we'll apply offset directly to positions)
  partitionLayer.attr('transform', null);

  // Apply offset to all positions
  nodes.forEach(n => { n.x0 += centerOffset; n.x1 += centerOffset; });
  labelPositions.forEach(l => { l.x += centerOffset; });

  renderPartitionHeader(partitionLayer, file, minLabelX + centerOffset, diagramWidth);
  renderPartitionRects(partitionLayer, nodes);
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

function renderPartitionLeaders(layer, labelPositions) {
  layer.selectAll('path.partition-leader').data(labelPositions, d => d.node.uri)
    .join(
      enter => enter.append('path')
        .attr('class', 'partition-leader')
        .attr('data-uri', d => d.node.uri)
        .attr('fill', 'none')
        .attr('stroke', 'rgba(255,255,255,0.25)')
        .attr('stroke-width', 1),
      update => update,
      exit => exit.remove()
    )
    .attr('d', d => {
      const barCenterY = d.y;  // Label stays at bar center
      const labelRight = d.x + PARTITION_LABEL_WIDTH;
      const barLeft = d.node.x0;
      // Horizontal line from label right to bar left
      return 'M' + labelRight + ',' + barCenterY + ' L' + barLeft + ',' + barCenterY;
    });
}

function renderPartitionLabels(layer, labelPositions) {
  // Label backgrounds (pill shape)
  layer.selectAll('rect.partition-label-bg').data(labelPositions, d => d.node.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-label-bg')
        .attr('data-uri', d => d.node.uri)
        .attr('rx', 9)
        .attr('ry', 9)
        .attr('fill', 'rgba(50,50,50,0.9)'),
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
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', uri: d.node.uri, line: d.node.line });
    })
    .attr('x', d => d.x)
    .attr('y', d => d.y - PARTITION_LABEL_HEIGHT / 2)
    .attr('width', PARTITION_LABEL_WIDTH)
    .attr('height', PARTITION_LABEL_HEIGHT);

  // Label text
  layer.selectAll('text.partition-label').data(labelPositions, d => d.node.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-label')
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none'),
      update => update,
      exit => exit.remove()
    )
    .text(d => truncateLabel(d.text, PARTITION_LABEL_WIDTH - PARTITION_LABEL_PADDING * 2, 7))
    .attr('x', d => d.x + PARTITION_LABEL_PADDING)
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
