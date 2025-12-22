export const TREEMAP_SCRIPT = `
const TREEMAP_NEUTRAL_COLOR = '#3a3a3a';

function getDynamicFilesTreemapColor(d) {
  return TREEMAP_NEUTRAL_COLOR;
}

function buildHierarchy(files) {
  const root = { name: 'root', children: [] };
  for (const file of files) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isFile = i === parts.length - 1;
      let child = current.children.find(c => c.name === part);
      if (!child) {
        child = isFile ? { name: part, value: file.loc, language: file.language, path: file.path } : { name: part, children: [] };
        current.children.push(child);
      }
      current = child;
    }
  }
  return root;
}

function render() {
  const container = document.getElementById('treemap');
  container.innerHTML = '';
  const width = container.clientWidth;
  const height = container.clientHeight || 400;

  const rootData = buildHierarchy(files);
  const hierarchy = d3.hierarchy(rootData).sum(d => d.value || 0).sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2)
    .paddingBottom(2)
    .paddingLeft(2)
    .paddingInner(2)
    (hierarchy);

  const svg = d3.select('#treemap').append('svg').attr('width', width).attr('height', height);
  const leaves = hierarchy.leaves();

  svg.selectAll('rect.node').data(leaves).join('rect')
    .attr('class', 'node')
    .attr('data-path', d => d.data.path)
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
    .attr('fill', getDynamicFilesTreemapColor)
    .on('mouseover', (e, d) => {
      const html = buildFileTooltip({ path: d.data.path, language: d.data.language, loc: d.value });
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.path }); });

  // File labels - only show on nodes large enough to fit text
  const labelMinWidth = 40;
  const labelMinHeight = 16;
  const labelsData = leaves.filter(d => (d.x1 - d.x0) >= labelMinWidth && (d.y1 - d.y0) >= labelMinHeight);

  svg.selectAll('text.file-label').data(labelsData).join('text')
    .attr('class', 'file-label')
    .attr('x', d => d.x0 + 3).attr('y', d => d.y0 + 11)
    .attr('fill', '#fff')
    .attr('font-size', '9px')
    .attr('pointer-events', 'none')
    .text(d => {
      const w = d.x1 - d.x0 - 6;
      const name = d.data.name;
      const maxChars = Math.floor(w / 5.5);
      return name.length > maxChars ? name.slice(0, maxChars - 1) + '…' : name;
    });

  // Depth 1: Top-level headers (folders or patterns)
  const depth1 = hierarchy.descendants().filter(d => d.depth === 1 && (d.x1 - d.x0) > 30);

  svg.selectAll('rect.dir-header-1').data(depth1).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', 16);

  svg.selectAll('text.dir-label-1').data(depth1).join('text')
    .attr('class', 'dir-label')
    .attr('x', d => d.x0 + 4).attr('y', d => d.y0 + 12)
    .text(d => { const w = d.x1 - d.x0 - 8; const name = d.data.name; return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name; });

  // Depth 2: Sub-labels
  const depth2 = hierarchy.descendants().filter(d => d.depth === 2 && d.children && (d.x1 - d.x0) > 50 && (d.y1 - d.y0) > 25);

  svg.selectAll('rect.dir-badge-2').data(depth2).join('rect')
    .attr('class', 'dir-header')
    .attr('x', d => d.x0 + 2).attr('y', d => d.y0 + 2)
    .attr('width', d => Math.min(d.data.name.length * 7 + 8, d.x1 - d.x0 - 4))
    .attr('height', 14)
    .attr('rx', 2)
    .attr('opacity', 0.85);

  svg.selectAll('text.dir-label-2').data(depth2).join('text')
    .attr('class', 'dir-label-sub')
    .attr('x', d => d.x0 + 6).attr('y', d => d.y0 + 12)
    .text(d => { const w = d.x1 - d.x0 - 12; const name = d.data.name; return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '…' : name; });
}

function renderTreemapLegend() {
  const container = document.getElementById('legend');
  if (!container || currentView !== 'treemap') return;

  container.style.display = 'flex';
  container.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + files.length + '</strong> files</div>';
}

// Re-render on window resize
window.addEventListener('resize', () => {
  if (currentView === 'treemap') {
    render();
    // Restore current selection after re-render
    if (currentHighlightedFiles.length > 0) {
      highlightIssueFiles(currentHighlightedFiles);
    }
  } else if (currentView === 'deps' && depGraph) {
    renderDepGraph();
    // Restore current selection after re-render
    if (currentHighlightedFiles.length > 0) {
      highlightIssueFiles(currentHighlightedFiles);
    }
  } else if (currentView === 'functions') {
    renderDistributionChart();
  }
});
`;
