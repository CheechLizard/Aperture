export const DISTRIBUTION_CHART_SCRIPT = `
const FUNC_NEUTRAL_COLOR = '#3a3a3a';

const ZOOM_DURATION = 500;
let zoomedFile = null;
let prevZoomedFile = null;  // Track previous zoomed file for exit animations
let prevZoomState = { x: 0, y: 0, kx: 1, ky: 1 };  // Track previous zoom for animation

function getDynamicFunctionColor(func) {
  return FUNC_NEUTRAL_COLOR;
}

function getDynamicFileColor(fileData) {
  return FUNC_NEUTRAL_COLOR;
}

function zoomTo(filePath) {
  prevZoomedFile = zoomedFile;
  zoomedFile = filePath;
  renderDistributionChart();
}

function zoomOut() {
  prevZoomedFile = zoomedFile;
  zoomedFile = null;
  renderDistributionChart();
}

function renderDistributionChart() {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  // Build file-level data
  const fileData = files
    .filter(f => f.functions && f.functions.length > 0)
    .map(f => {
      const data = {
        name: f.path.split('/').pop(),
        path: f.path,
        value: f.functions.reduce((sum, fn) => sum + fn.loc, 0),
        functions: f.functions
      };
      data.color = getDynamicFileColor(data);
      return data;
    });

  if (fileData.length === 0) {
    container.innerHTML = '<div class="functions-empty">No functions found.</div>';
    renderFilesLegend([]);
    return;
  }

  // Build hierarchy
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

  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  const leaves = hierarchy.leaves();

  // Create or select SVG with layered groups
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

  // Find clicked file leaf
  const clickedLeaf = zoomedFile ? leaves.find(l => l.data.path === zoomedFile) : null;

  // Calculate scale transforms
  let x, y, kx, ky;
  if (clickedLeaf) {
    // Zoomed in: scale so clicked file fills container
    x = clickedLeaf.x0;
    y = clickedLeaf.y0;
    kx = width / (clickedLeaf.x1 - clickedLeaf.x0);
    ky = height / (clickedLeaf.y1 - clickedLeaf.y0);
  } else {
    // Zoomed out: normal view
    x = 0;
    y = 0;
    kx = 1;
    ky = 1;
  }

  // Previous state for animation start positions
  const px = prevZoomState.x, py = prevZoomState.y;
  const pkx = prevZoomState.kx, pky = prevZoomState.ky;

  // Save current state for next animation
  prevZoomState = { x, y, kx, ky };

  // Shared named transition for sync
  const t = d3.transition('zoom').duration(ZOOM_DURATION).ease(d3.easeCubicOut);

  // Cross-fade layer opacity
  const isZoomingIn = zoomedFile && !prevZoomedFile;
  const isZoomingOut = !zoomedFile && prevZoomedFile;
  if (isZoomingIn) {
    fileLayer.attr('opacity', 1).transition(t).attr('opacity', 0);
    funcLayer.attr('opacity', 0).transition(t).attr('opacity', 1);
  } else if (isZoomingOut) {
    fileLayer.attr('opacity', 0).transition(t).attr('opacity', 1);
    funcLayer.attr('opacity', 1).transition(t).attr('opacity', 0);
  }

  // File rectangles (in file layer)
  const rects = fileLayer.selectAll('rect.file-node').data(leaves, d => d.data.path);

  rects.join(
    enter => enter.append('rect')
      .attr('class', 'file-node node')
      .attr('data-path', d => d.data.path)
      .attr('fill', d => d.data.color)
      // Start at PREVIOUS zoom state positions
      .attr('x', d => (d.x0 - px) * pkx)
      .attr('y', d => (d.y0 - py) * pky)
      .attr('width', d => Math.max(0, (d.x1 - d.x0) * pkx))
      .attr('height', d => Math.max(0, (d.y1 - d.y0) * pky)),
    update => update,
    exit => exit.transition(t).remove()
  )
    .on('mouseover', (e, d) => {
      if (zoomedFile) return;
      const fnCount = d.data.functions.length;
      const totalLoc = d.data.value;
      const html = '<div><strong>' + d.data.name + '</strong></div>' +
        '<div>' + fnCount + ' function' + (fnCount !== 1 ? 's' : '') + ' \\u00b7 ' + totalLoc + ' LOC</div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to view functions</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      if (!zoomedFile) zoomTo(d.data.path);
    })
    .transition(t)
    .attr('x', d => (d.x0 - x) * kx)
    .attr('y', d => (d.y0 - y) * ky)
    .attr('width', d => Math.max(0, (d.x1 - d.x0) * kx))
    .attr('height', d => Math.max(0, (d.y1 - d.y0) * ky));

  // File labels
  const labelMinWidth = 40;
  const labelMinHeight = 16;
  const labelsData = leaves.filter(d => {
    const w = (d.x1 - d.x0) * kx;
    const h = (d.y1 - d.y0) * ky;
    return w >= labelMinWidth && h >= labelMinHeight;
  });

  const labels = fileLayer.selectAll('text.file-label').data(zoomedFile ? [] : labelsData, d => d.data.path);

  labels.join(
    enter => enter.append('text')
      .attr('class', 'file-label')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none')
      // Start at PREVIOUS zoom state positions
      .attr('x', d => (d.x0 - px) * pkx + 4)
      .attr('y', d => (d.y0 - py) * pky + 12)
      .text(d => {
        const w = (d.x1 - d.x0) * kx - 8;
        const name = d.data.name;
        const maxChars = Math.floor(w / 5);
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '\\u2026' : name;
      }),
    update => update,
    exit => exit.transition(t).remove()
  )
    .transition(t)
    .attr('x', d => (d.x0 - x) * kx + 4)
    .attr('y', d => (d.y0 - y) * ky + 12);

  // Folder headers (only when not zoomed)
  const depth1 = zoomedFile ? [] : hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  fileLayer.selectAll('rect.dir-header').data(depth1, d => d.data.name)
    .join(
      enter => enter.append('rect')
        .attr('class', 'dir-header')
        .attr('x', d => (d.x0 - px) * pkx)
        .attr('y', d => (d.y0 - py) * pky)
        .attr('width', d => (d.x1 - d.x0) * pkx)
        .attr('height', 16),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => (d.x0 - x) * kx)
        .attr('y', d => (d.y0 - y) * ky)
        .attr('width', d => (d.x1 - d.x0) * kx)
        .remove()
    )
    .transition(t)
    .attr('x', d => (d.x0 - x) * kx)
    .attr('y', d => (d.y0 - y) * ky)
    .attr('width', d => (d.x1 - d.x0) * kx)
    .attr('height', 16);

  fileLayer.selectAll('text.dir-label').data(depth1, d => d.data.name)
    .join(
      enter => enter.append('text')
        .attr('class', 'dir-label')
        .attr('x', d => (d.x0 - px) * pkx + 4)
        .attr('y', d => (d.y0 - py) * pky + 12),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => (d.x0 - x) * kx + 4)
        .attr('y', d => (d.y0 - y) * ky + 12)
        .remove()
    )
    .text(d => {
      const w = (d.x1 - d.x0) * kx - 8;
      const name = d.data.name;
      return name.length * 7 > w ? name.slice(0, Math.floor(w/7)) + '\\u2026' : name;
    })
    .transition(t)
    .attr('x', d => (d.x0 - x) * kx + 4)
    .attr('y', d => (d.y0 - y) * ky + 12);

  // Function rectangles (only when zoomed)
  let funcLeaves = [];
  if (clickedLeaf) {
    const file = files.find(f => f.path === zoomedFile);
    if (file && file.functions) {
      const functionData = file.functions.map(fn => ({
        name: fn.name,
        value: fn.loc,
        line: fn.startLine,
        depth: fn.maxNestingDepth,
        params: fn.parameterCount,
        filePath: file.path
      }));

      const funcHierarchy = d3.hierarchy({ name: 'root', children: functionData })
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);

      d3.treemap().size([width, height]).paddingTop(18).paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(2)(funcHierarchy);
      funcLeaves = funcHierarchy.leaves();
    }
  }

  const funcRects = funcLayer.selectAll('rect.func-node').data(funcLeaves, d => d.data.name + d.data.line);

  // For ENTER: start at file's position in PREVIOUS zoom state (unzoomed = file at its normal treemap position)
  // For EXIT: shrink back to file's position in NEW zoom state (unzoomed = file at its normal position)
  const prevFileX = clickedLeaf ? (clickedLeaf.x0 - px) * pkx : 0;
  const prevFileY = clickedLeaf ? (clickedLeaf.y0 - py) * pky : 0;
  const prevFileW = clickedLeaf ? (clickedLeaf.x1 - clickedLeaf.x0) * pkx : width;
  const prevFileH = clickedLeaf ? (clickedLeaf.y1 - clickedLeaf.y0) * pky : height;

  // For exit, find file to shrink back to (use prevZoomedFile when zooming out)
  const exitLeaf = prevZoomedFile ? leaves.find(l => l.data.path === prevZoomedFile) : clickedLeaf;
  const exitFileX = exitLeaf ? (exitLeaf.x0 - x) * kx : 0;
  const exitFileY = exitLeaf ? (exitLeaf.y0 - y) * ky : 0;
  const exitFileW = exitLeaf ? (exitLeaf.x1 - exitLeaf.x0) * kx : width;
  const exitFileH = exitLeaf ? (exitLeaf.y1 - exitLeaf.y0) * ky : height;

  funcRects.join(
    enter => enter.append('rect')
      .attr('class', 'func-node node')
      .attr('data-path', d => d.data.filePath)
      .attr('data-line', d => d.data.line)
      .attr('fill', d => getDynamicFunctionColor(d.data))
      // Start scaled inside file's PREVIOUS position
      .attr('x', d => prevFileX + (d.x0 / width) * prevFileW)
      .attr('y', d => prevFileY + (d.y0 / height) * prevFileH)
      .attr('width', d => Math.max(0, ((d.x1 - d.x0) / width) * prevFileW))
      .attr('height', d => Math.max(0, ((d.y1 - d.y0) / height) * prevFileH)),
    update => update,
    exit => exit.transition(t)
      // Shrink back into file's NEW position
      .attr('x', d => exitFileX + (d.x0 / width) * exitFileW)
      .attr('y', d => exitFileY + (d.y0 / height) * exitFileH)
      .attr('width', d => Math.max(0, ((d.x1 - d.x0) / width) * exitFileW))
      .attr('height', d => Math.max(0, ((d.y1 - d.y0) / height) * exitFileH))
      .remove()
  )
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.data.name + '</strong></div>' +
        '<div>' + d.data.value + ' LOC' + (d.data.depth ? ' \\u00b7 depth ' + d.data.depth : '') + '</div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to open file</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.filePath, line: d.data.line });
    })
    .transition(t)
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));

  // Function labels
  const funcLabelsData = funcLeaves.filter(d => (d.x1 - d.x0) >= 30 && (d.y1 - d.y0) >= 14);

  const funcLabels = funcLayer.selectAll('text.func-label').data(funcLabelsData, d => d.data.name + d.data.line);

  funcLabels.join(
    enter => enter.append('text')
      .attr('class', 'func-label')
      .attr('fill', '#fff')
      .attr('font-size', '9px')
      .attr('pointer-events', 'none')
      // Start scaled inside file's PREVIOUS position
      .attr('x', d => prevFileX + ((d.x0 + 3) / width) * prevFileW)
      .attr('y', d => prevFileY + ((d.y0 + 11) / height) * prevFileH)
      .text(d => {
        const w = d.x1 - d.x0 - 6;
        const name = d.data.name;
        const maxChars = Math.floor(w / 5);
        return name.length > maxChars ? name.slice(0, maxChars - 1) + '\\u2026' : name;
      }),
    update => update,
    exit => exit.transition(t)
      .attr('x', d => exitFileX + ((d.x0 + 3) / width) * exitFileW)
      .attr('y', d => exitFileY + ((d.y0 + 11) / height) * exitFileH)
      .remove()
  )
    .transition(t)
    .attr('x', d => d.x0 + 3)
    .attr('y', d => d.y0 + 11);

  // SVG file header for L2 (matching folder header style)
  const fileHeaderData = zoomedFile ? [{ path: zoomedFile, name: zoomedFile.split('/').pop() }] : [];

  funcLayer.selectAll('rect.file-header').data(fileHeaderData, d => d.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'file-header')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', 16)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .transition(t)
    .attr('width', width)
    .attr('opacity', 1);

  funcLayer.selectAll('text.file-header-label').data(fileHeaderData, d => d.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-header-label')
        .attr('x', 4)
        .attr('y', 12)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .text(d => {
      const maxChars = Math.floor((width - 8) / 7);
      return d.name.length > maxChars ? d.name.slice(0, maxChars - 1) + '\\u2026' : d.name;
    })
    .transition(t)
    .attr('opacity', 1);

  // HTML back button in view controls
  const header = document.getElementById('back-header');
  if (header) {
    if (zoomedFile) {
      header.classList.remove('hidden');
      header.innerHTML = '<button class="back-btn">\\u2190</button><span class="back-path">' + zoomedFile + '</span>';
      header.querySelector('.back-btn').addEventListener('click', zoomOut);
    } else {
      header.classList.add('hidden');
      header.innerHTML = '';
    }
  }

  // Update legend
  if (zoomedFile) {
    renderFunctionLegend(funcLeaves);
  } else {
    renderFilesLegend(fileData);
  }

  // Reapply issue highlighting to new elements
  applyPersistentIssueHighlights();
  if (currentHighlightedFiles.length > 0) {
    highlightIssueFiles(currentHighlightedFiles);
  }
}

function renderFilesLegend(fileData) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  const total = fileData.length;
  const totalFns = fileData.reduce((sum, f) => sum + f.functions.length, 0);

  legend.style.display = 'flex';
  legend.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + total + '</strong> files \\u00b7 <strong>' + totalFns + '</strong> functions</div>';
}

function renderFunctionLegend(leaves) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  legend.style.display = 'flex';
  legend.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + leaves.length + '</strong> functions</div>';
}
`;
