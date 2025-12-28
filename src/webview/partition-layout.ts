export const PARTITION_LAYOUT_SCRIPT = `
// Partition layout for file internals (functions/blocks)
// Uses horizontal stacking with height proportional to LOC
// Preserves document order (sorted by startLine)

const PARTITION_HEADER_HEIGHT = 24;
const PARTITION_PADDING = 2;
const PARTITION_MIN_HEIGHT = 20;
const PARTITION_LABEL_MIN_HEIGHT = 18;

function buildPartitionData(file, width, height) {
  if (!file || !file.functions || file.functions.length === 0) {
    return [];
  }

  // Sort by startLine to preserve document order
  const sortedFunctions = file.functions
    .slice()
    .sort((a, b) => a.startLine - b.startLine);

  // Calculate total LOC for proportional heights
  const totalLoc = sortedFunctions.reduce((sum, fn) => sum + fn.loc, 0);
  const availableHeight = height - PARTITION_HEADER_HEIGHT - (PARTITION_PADDING * 2);

  // Build partition nodes with calculated positions
  let currentY = PARTITION_HEADER_HEIGHT + PARTITION_PADDING;
  const nodes = sortedFunctions.map(fn => {
    const proportion = fn.loc / totalLoc;
    const nodeHeight = Math.max(PARTITION_MIN_HEIGHT, proportion * availableHeight);

    const node = {
      name: fn.name,
      value: fn.loc,
      line: fn.startLine,
      endLine: fn.endLine,
      depth: fn.maxNestingDepth,
      params: fn.parameterCount,
      filePath: file.path,
      uri: fn.uri,
      x0: PARTITION_PADDING,
      y0: currentY,
      x1: width - PARTITION_PADDING,
      y1: currentY + nodeHeight
    };

    currentY += nodeHeight + PARTITION_PADDING;
    return node;
  });

  return nodes;
}

function renderPartitionLayout(container, file, width, height, prevBounds, t) {
  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
    svg.append('g').attr('class', 'file-layer');
    svg.append('g').attr('class', 'partition-layer');
  }
  svg.attr('width', width).attr('height', height);

  const partitionLayer = svg.select('g.partition-layer');
  const nodes = buildPartitionData(file, width, height);

  // Render header
  renderPartitionHeader(partitionLayer, file, width, t);

  // Render function rectangles with animation from previous bounds
  renderPartitionRects(partitionLayer, nodes, prevBounds, width, height, t);

  // Render labels
  renderPartitionLabels(partitionLayer, nodes, prevBounds, width, height, t);

  return nodes;
}

function renderPartitionHeader(layer, file, width, t) {
  const headerData = file ? [{ path: file.path, name: file.path.split('/').pop() }] : [];

  layer.selectAll('rect.partition-header').data(headerData, d => d.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-header')
        .attr('x', 0).attr('y', 0)
        .attr('width', width).attr('height', PARTITION_HEADER_HEIGHT)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .transition(t)
    .attr('width', width)
    .attr('opacity', 1);

  layer.selectAll('text.partition-header-label').data(headerData, d => d.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-header-label')
        .attr('x', 8).attr('y', 16)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .text(d => truncateLabel(d.name, width - 16, 7))
    .transition(t)
    .attr('opacity', 1);
}

function renderPartitionRects(layer, nodes, prevBounds, width, height, t) {
  layer.selectAll('rect.partition-node').data(nodes, d => d.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partition-node node')
        .attr('data-uri', d => d.uri)
        .attr('data-path', d => d.filePath)
        .attr('fill', FUNC_NEUTRAL_COLOR)
        .attr('x', prevBounds.x)
        .attr('y', prevBounds.y)
        .attr('width', Math.max(0, prevBounds.w))
        .attr('height', Math.max(0, prevBounds.h / nodes.length)),
      update => update,
      exit => exit.transition(t)
        .attr('opacity', 0)
        .remove()
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
      vscode.postMessage({ command: 'openFile', uri: d.uri });
    })
    .transition(t)
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));
}

function renderPartitionLabels(layer, nodes, prevBounds, width, height, t) {
  const labelsData = nodes.filter(d => (d.y1 - d.y0) >= PARTITION_LABEL_MIN_HEIGHT);

  layer.selectAll('text.partition-label').data(labelsData, d => d.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'partition-label')
        .attr('fill', '#fff')
        .attr('font-size', '11px')
        .attr('pointer-events', 'none')
        .attr('x', prevBounds.x + 8)
        .attr('y', prevBounds.y + 14),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .text(d => {
      const locText = ' (' + d.value + ')';
      const maxWidth = (d.x1 - d.x0) - 16;
      const availableForName = maxWidth - (locText.length * 6);
      const name = truncateLabel(d.name, availableForName, 6);
      return name + locText;
    })
    .transition(t)
    .attr('x', d => d.x0 + 8)
    .attr('y', d => d.y0 + ((d.y1 - d.y0) / 2) + 4);
}

function clearPartitionLayer(container) {
  const svg = d3.select(container).select('svg');
  if (!svg.empty()) {
    const partitionLayer = svg.select('g.partition-layer');
    partitionLayer.selectAll('*').remove();
  }
}
`;
