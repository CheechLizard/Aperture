export const DISTRIBUTION_CHART_SCRIPT = `
const FUNCTION_SIZE_COLORS = {
  small: '#27ae60',   // 1-20 LOC
  medium: '#f39c12',  // 21-50 LOC
  large: '#e74c3c'    // 50+ LOC
};

function getFunctionColor(loc) {
  if (loc <= 20) return FUNCTION_SIZE_COLORS.small;
  if (loc <= 50) return FUNCTION_SIZE_COLORS.medium;
  return FUNCTION_SIZE_COLORS.large;
}

function buildFunctionHierarchy(files) {
  const root = { name: 'root', children: [] };

  for (const file of files) {
    if (!file.functions || file.functions.length === 0) continue;

    const parts = file.path.split('/');
    let current = root;

    // Build folder structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = current.children.find(c => c.name === part && c.children);
      if (!child) {
        child = { name: part, children: [] };
        current.children.push(child);
      }
      current = child;
    }

    // Add file node containing functions
    const fileName = parts[parts.length - 1];
    let fileNode = current.children.find(c => c.name === fileName && c.children);
    if (!fileNode) {
      fileNode = { name: fileName, children: [], filePath: file.path };
      current.children.push(fileNode);
    }

    // Add each function as a leaf
    for (const fn of file.functions) {
      fileNode.children.push({
        name: fn.name,
        value: fn.loc,
        line: fn.startLine,
        filePath: file.path,
        depth: fn.maxNestingDepth
      });
    }
  }

  return root;
}

function renderDistributionChart() {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  container.innerHTML = '';
  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  const rootData = buildFunctionHierarchy(files);

  // Check if there are any functions
  const hierarchy = d3.hierarchy(rootData).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
  const leaves = hierarchy.leaves();

  if (leaves.length === 0) {
    container.innerHTML = '<div class="functions-empty">No functions found. AST parsing may not be available for these file types.</div>';
    renderFunctionLegend([]);
    return;
  }

  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : d.depth === 2 ? 14 : 2)
    .paddingRight(2)
    .paddingBottom(2)
    .paddingLeft(2)
    .paddingInner(1)
    (hierarchy);

  const svg = d3.select(container).append('svg').attr('width', width).attr('height', height);

  // Draw function rectangles - use .node class for consistent hover styling
  svg.selectAll('rect.node').data(leaves).join('rect')
    .attr('class', 'node')
    .attr('data-path', d => d.data.filePath)
    .attr('data-line', d => d.data.line)
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0)).attr('height', d => Math.max(0, d.y1 - d.y0))
    .attr('fill', d => getFunctionColor(d.data.value))
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.data.name + '</strong></div>' +
        '<div>' + d.data.value + ' LOC' + (d.data.depth ? ' · depth ' + d.data.depth : '') + '</div>' +
        '<div style="color:var(--vscode-textLink-foreground)">' + d.data.filePath + ':' + d.data.line + '</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.filePath, line: d.data.line });
    });

  // Function labels - only on nodes large enough
  const labelMinWidth = 30;
  const labelMinHeight = 14;
  const labelsData = leaves.filter(d => (d.x1 - d.x0) >= labelMinWidth && (d.y1 - d.y0) >= labelMinHeight);

  svg.selectAll('text.file-label').data(labelsData).join('text')
    .attr('class', 'file-label')
    .attr('x', d => d.x0 + 3).attr('y', d => d.y0 + 10)
    .attr('fill', '#fff')
    .attr('font-size', '8px')
    .attr('pointer-events', 'none')
    .text(d => {
      const w = d.x1 - d.x0 - 6;
      const name = d.data.name;
      const maxChars = Math.floor(w / 4.5);
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    });

  // Depth 1: Top-level folder headers
  const depth1 = hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  svg.selectAll('rect.dir-header-1').data(depth1).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', 16);

  svg.selectAll('text.dir-label-1').data(depth1).join('text')
    .attr('class', 'dir-label')
    .attr('x', d => d.x0 + 4).attr('y', d => d.y0 + 12)
    .text(d => {
      const w = d.x1 - d.x0 - 8;
      const name = d.data.name;
      return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name;
    });

  // Depth 2: File headers
  const depth2 = hierarchy.descendants().filter(d => d.depth === 2 && d.children && (d.x1 - d.x0) > 40 && (d.y1 - d.y0) > 20);

  svg.selectAll('rect.dir-badge-2').data(depth2).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0 + 2).attr('y', d => d.y0 + 2)
    .attr('width', d => Math.min(d.data.name.length * 6 + 8, d.x1 - d.x0 - 4))
    .attr('height', 12)
    .attr('rx', 2)
    .attr('opacity', 0.85);

  svg.selectAll('text.dir-label-2').data(depth2).join('text')
    .attr('class', 'dir-label-sub')
    .attr('x', d => d.x0 + 5).attr('y', d => d.y0 + 11)
    .attr('font-size', '8px')
    .text(d => {
      const w = d.x1 - d.x0 - 10;
      const name = d.data.name;
      return name.length * 5 > w ? name.slice(0, Math.floor(w/5)) + '…' : name;
    });

  renderFunctionLegend(leaves);
}

function renderFunctionLegend(leaves) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  const total = leaves.length;
  const small = leaves.filter(d => d.data.value <= 20).length;
  const medium = leaves.filter(d => d.data.value > 20 && d.data.value <= 50).length;
  const large = leaves.filter(d => d.data.value > 50).length;

  legend.style.display = 'flex';
  legend.innerHTML =
    '<div class="legend-item"><span class="legend-swatch" style="background:#27ae60;"></span>≤20 LOC (' + small + ')</div>' +
    '<div class="legend-item"><span class="legend-swatch" style="background:#f39c12;"></span>21-50 LOC (' + medium + ')</div>' +
    '<div class="legend-item"><span class="legend-swatch" style="background:#e74c3c;"></span>50+ LOC (' + large + ')</div>' +
    '<div class="legend-item" style="margin-left:auto;"><strong>' + total + '</strong> functions</div>';
}
`;
