export const TREEMAP_LAYOUT_SCRIPT = `
// Treemap layout for folder/file level visualization
// Uses d3.treemap() for efficient space usage at folder level

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;

function buildFileHierarchy(fileData) {
  const root = { name: 'root', children: [] };
  for (const file of fileData) {
    const parts = file.path.split('/');
    let current = root;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      let child = current.children.find(c => c.name === part && c.children);
      if (!child) {
        child = { name: part, children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.children.push(file);
  }
  return root;
}

function renderTreemapLayout(container, fileData, width, height, t) {
  const root = buildFileHierarchy(fileData);
  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  const leaves = hierarchy.leaves();
  const clickedLeaf = zoomedFile ? leaves.find(l => l.data.path === zoomedFile) : null;

  const curr = calculateZoomTransform(clickedLeaf, width, height);
  const prev = { ...prevZoomState };
  prevZoomState = curr;

  let svg = d3.select(container).select('svg');
  if (svg.empty()) {
    container.innerHTML = '';
    svg = d3.select(container).append('svg');
    svg.append('g').attr('class', 'file-layer');
    svg.append('g').attr('class', 'func-layer');
  }
  svg.attr('width', width).attr('height', height);

  const fileLayer = svg.select('g.file-layer');
  const funcLayer = svg.select('g.func-layer');

  const isZoomingIn = zoomedFile && !prevZoomedFile;
  const isZoomingOut = !zoomedFile && prevZoomedFile;
  if (isZoomingIn) {
    fileLayer.attr('opacity', 1).transition(t).attr('opacity', 0);
    funcLayer.attr('opacity', 0).transition(t).attr('opacity', 1);
  } else if (isZoomingOut) {
    fileLayer.attr('opacity', 0).transition(t).attr('opacity', 1);
    funcLayer.attr('opacity', 1).transition(t).attr('opacity', 0);
  }

  renderFileRects(fileLayer, leaves, prev, curr, t);
  renderFileLabels(fileLayer, leaves, prev, curr, t);
  renderFolderHeaders(fileLayer, hierarchy, prev, curr, t);

  return { leaves, clickedLeaf, prev, curr, funcLayer };
}

function renderFileRects(layer, leaves, prev, curr, t) {
  layer.selectAll('rect.file-node').data(leaves, d => d.data.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'file-node node')
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.path)
        .attr('fill', d => d.data.color)
        .attr('x', d => (d.x0 - prev.x) * prev.kx)
        .attr('y', d => (d.y0 - prev.y) * prev.ky)
        .attr('width', d => Math.max(0, (d.x1 - d.x0) * prev.kx))
        .attr('height', d => Math.max(0, (d.y1 - d.y0) * prev.ky)),
      update => update,
      exit => exit.transition(t).remove()
    )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      const fnCount = d.data.functions.length;
      let html = '<div><strong>' + d.data.name + '</strong></div>';
      if (d.data.hasFunctions) {
        html += '<div>' + fnCount + ' function' + (fnCount !== 1 ? 's' : '') + ' \\u00b7 ' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to view functions</div>';
      } else {
        html += '<div>' + d.data.value + ' LOC</div>';
        html += '<div style="color:var(--vscode-descriptionForeground)">Click to open file</div>';
      }
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (zoomedFile) return;
      if (d.data.hasFunctions) {
        zoomTo(d.data.uri);
      } else {
        vscode.postMessage({ command: 'openFile', uri: d.data.uri });
      }
    })
    .transition(t)
    .attr('x', d => (d.x0 - curr.x) * curr.kx)
    .attr('y', d => (d.y0 - curr.y) * curr.ky)
    .attr('width', d => Math.max(0, (d.x1 - d.x0) * curr.kx))
    .attr('height', d => Math.max(0, (d.y1 - d.y0) * curr.ky));
}

function renderFileLabels(layer, leaves, prev, curr, t) {
  const labelsData = leaves.filter(d => {
    const w = (d.x1 - d.x0) * curr.kx;
    const h = (d.y1 - d.y0) * curr.ky;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.file-label').data(zoomedFile ? [] : labelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-label')
        .attr('fill', '#fff')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .attr('x', d => (d.x0 - prev.x) * prev.kx + 4)
        .attr('y', d => (d.y0 - prev.y) * prev.ky + 12)
        .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) * curr.kx - 8, 5)),
      update => update,
      exit => exit.transition(t).remove()
    )
    .transition(t)
    .attr('x', d => (d.x0 - curr.x) * curr.kx + 4)
    .attr('y', d => (d.y0 - curr.y) * curr.ky + 12);
}

function renderFolderHeaders(layer, hierarchy, prev, curr, t) {
  const depth1 = zoomedFile ? [] : hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  layer.selectAll('rect.dir-header').data(depth1, d => d.data.name)
    .join(
      enter => enter.append('rect')
        .attr('class', 'dir-header')
        .attr('x', d => (d.x0 - prev.x) * prev.kx)
        .attr('y', d => (d.y0 - prev.y) * prev.ky)
        .attr('width', d => (d.x1 - d.x0) * prev.kx)
        .attr('height', 16),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => (d.x0 - curr.x) * curr.kx)
        .attr('y', d => (d.y0 - curr.y) * curr.ky)
        .attr('width', d => (d.x1 - d.x0) * curr.kx)
        .remove()
    )
    .transition(t)
    .attr('x', d => (d.x0 - curr.x) * curr.kx)
    .attr('y', d => (d.y0 - curr.y) * curr.ky)
    .attr('width', d => (d.x1 - d.x0) * curr.kx)
    .attr('height', 16);

  layer.selectAll('text.dir-label').data(depth1, d => d.data.name)
    .join(
      enter => enter.append('text')
        .attr('class', 'dir-label')
        .attr('x', d => (d.x0 - prev.x) * prev.kx + 4)
        .attr('y', d => (d.y0 - prev.y) * prev.ky + 12),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => (d.x0 - curr.x) * curr.kx + 4)
        .attr('y', d => (d.y0 - curr.y) * curr.ky + 12)
        .remove()
    )
    .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) * curr.kx - 8, 7))
    .transition(t)
    .attr('x', d => (d.x0 - curr.x) * curr.kx + 4)
    .attr('y', d => (d.y0 - curr.y) * curr.ky + 12);
}
`;
