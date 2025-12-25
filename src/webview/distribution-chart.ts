export const DISTRIBUTION_CHART_SCRIPT = `
const FUNC_NEUTRAL_COLOR = '#3a3a3a';
const FILE_NO_FUNCTIONS_COLOR = '#2a2a2a';
const ZOOM_DURATION = 500;
const LABEL_MIN_WIDTH = 40;
const LABEL_MIN_HEIGHT = 16;

function getDynamicFunctionColor(func) {
  return FUNC_NEUTRAL_COLOR;
}

function getDynamicFileColor(fileData) {
  // Darker color for files without functions
  return fileData.hasFunctions ? FUNC_NEUTRAL_COLOR : FILE_NO_FUNCTIONS_COLOR;
}

function zoomTo(uri) {
  // Preserve current highlights - don't override when zooming
  nav.goTo({ uri: uri });
}

function zoomOut() {
  // Just navigate - selection state is preserved
  nav.goTo({ uri: null });
}

function truncateLabel(name, maxWidth, charWidth) {
  const maxChars = Math.floor(maxWidth / charWidth);
  return name.length > maxChars ? name.slice(0, maxChars - 1) + '\\u2026' : name;
}

function buildFileData() {
  // Include all files in both views for consistency
  return files
    .map(f => {
      const hasFunctions = f.functions && f.functions.length > 0;
      const fileData = {
        name: f.path.split('/').pop(),
        path: f.path,
        uri: f.uri,  // Use pre-computed URI from data model
        value: hasFunctions ? f.functions.reduce((sum, fn) => sum + fn.loc, 0) : f.loc,
        functions: f.functions || [],
        hasFunctions: hasFunctions
      };
      fileData.color = getDynamicFileColor(fileData);
      return fileData;
    });
}

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

function calculateZoomTransform(clickedLeaf, width, height) {
  if (clickedLeaf) {
    return {
      x: clickedLeaf.x0,
      y: clickedLeaf.y0,
      kx: width / (clickedLeaf.x1 - clickedLeaf.x0),
      ky: height / (clickedLeaf.y1 - clickedLeaf.y0)
    };
  }
  return { x: 0, y: 0, kx: 1, ky: 1 };
}

function buildFunctionLeaves(width, height) {
  const file = files.find(f => f.path === zoomedFile);
  if (!file || !file.functions) return [];

  const functionData = file.functions.map(fn => ({
    name: fn.name,
    value: fn.loc,
    line: fn.startLine,
    depth: fn.maxNestingDepth,
    params: fn.parameterCount,
    filePath: file.path,
    uri: fn.uri  // Use pre-computed URI from data model
  }));

  const funcHierarchy = d3.hierarchy({ name: 'root', children: functionData })
    .sum(d => d.value || 0)
    .sort((a, b) => b.value - a.value);

  d3.treemap()
    .size([width, height])
    .paddingTop(18)
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(2)
    (funcHierarchy);

  return funcHierarchy.leaves();
}

function calculateExitBounds(leaf, transform) {
  if (!leaf) return { x: 0, y: 0, w: 0, h: 0 };
  return {
    x: (leaf.x0 - transform.x) * transform.kx,
    y: (leaf.y0 - transform.y) * transform.ky,
    w: (leaf.x1 - leaf.x0) * transform.kx,
    h: (leaf.y1 - leaf.y0) * transform.ky
  };
}

function renderDistributionChart() {
  const container = document.getElementById('functions-chart');
  if (!container) return;

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 400;

  const fileData = buildFileData();
  if (fileData.length === 0) {
    container.innerHTML = '<div class="functions-empty">No functions found.</div>';
    renderFilesLegend([]);
    return;
  }

  const root = buildFileHierarchy(fileData);
  const hierarchy = d3.hierarchy(root).sum(d => d.value || 0).sort((a, b) => b.value - a.value);
  d3.treemap()
    .size([width, height])
    .paddingTop(d => d.depth === 1 ? 16 : 2)
    .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
    (hierarchy);

  const leaves = hierarchy.leaves();

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
  const clickedLeaf = zoomedFile ? leaves.find(l => l.data.path === zoomedFile) : null;

  const curr = calculateZoomTransform(clickedLeaf, width, height);
  const prev = { ...prevZoomState };
  prevZoomState = curr;

  const t = d3.transition('zoom').duration(ZOOM_DURATION).ease(d3.easeCubicOut);

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

  const funcLeaves = clickedLeaf ? buildFunctionLeaves(width, height) : [];
  const prevBounds = calculateExitBounds(clickedLeaf, prev);
  const exitLeaf = prevZoomedFile ? leaves.find(l => l.data.path === prevZoomedFile) : clickedLeaf;
  const exitBounds = calculateExitBounds(exitLeaf, curr);

  renderFuncRects(funcLayer, funcLeaves, prevBounds, exitBounds, width, height, t);
  renderFuncLabels(funcLayer, funcLeaves, prevBounds, exitBounds, width, height, t);
  renderFileHeader(funcLayer, width, t);

  if (zoomedFile) {
    renderFunctionLegend(funcLeaves);
  } else {
    renderFilesLegend(fileData);
  }

  // Note: Highlights are applied by nav._render() via selection._applyHighlights()
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
        // Open file directly if no functions to zoom into
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
    return w >= LABEL_MIN_WIDTH && h >= LABEL_MIN_HEIGHT;
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

function renderFuncRects(layer, funcLeaves, prevBounds, exitBounds, width, height, t) {
  layer.selectAll('rect.func-node').data(funcLeaves, d => d.data.uri)
    .join(
      enter => enter.append('rect')
        .attr('class', 'func-node node')
        .attr('data-uri', d => d.data.uri)
        .attr('data-path', d => d.data.filePath)
        .attr('fill', d => getDynamicFunctionColor(d.data))
        .attr('x', d => prevBounds.x + (d.x0 / width) * prevBounds.w)
        .attr('y', d => prevBounds.y + (d.y0 / height) * prevBounds.h)
        .attr('width', d => Math.max(0, ((d.x1 - d.x0) / width) * prevBounds.w))
        .attr('height', d => Math.max(0, ((d.y1 - d.y0) / height) * prevBounds.h)),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => exitBounds.x + (d.x0 / width) * exitBounds.w)
        .attr('y', d => exitBounds.y + (d.y0 / height) * exitBounds.h)
        .attr('width', d => Math.max(0, ((d.x1 - d.x0) / width) * exitBounds.w))
        .attr('height', d => Math.max(0, ((d.y1 - d.y0) / height) * exitBounds.h))
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
      vscode.postMessage({ command: 'openFile', uri: d.data.uri });
    })
    .transition(t)
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => Math.max(0, d.x1 - d.x0))
    .attr('height', d => Math.max(0, d.y1 - d.y0));
}

function renderFuncLabels(layer, funcLeaves, prevBounds, exitBounds, width, height, t) {
  const labelsData = funcLeaves.filter(d => (d.x1 - d.x0) >= 30 && (d.y1 - d.y0) >= 14);

  layer.selectAll('text.func-label').data(labelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'func-label')
        .attr('fill', '#fff')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .attr('x', d => prevBounds.x + ((d.x0 + 3) / width) * prevBounds.w)
        .attr('y', d => prevBounds.y + ((d.y0 + 11) / height) * prevBounds.h)
        .text(d => truncateLabel(d.data.name, d.x1 - d.x0 - 6, 5)),
      update => update,
      exit => exit.transition(t)
        .attr('x', d => exitBounds.x + ((d.x0 + 3) / width) * exitBounds.w)
        .attr('y', d => exitBounds.y + ((d.y0 + 11) / height) * exitBounds.h)
        .remove()
    )
    .transition(t)
    .attr('x', d => d.x0 + 3)
    .attr('y', d => d.y0 + 11);
}

function renderFileHeader(layer, width, t) {
  const headerData = zoomedFile ? [{ path: zoomedFile, name: zoomedFile.split('/').pop() }] : [];

  layer.selectAll('rect.file-header').data(headerData, d => d.path)
    .join(
      enter => enter.append('rect')
        .attr('class', 'file-header')
        .attr('x', 0).attr('y', 0)
        .attr('width', width).attr('height', 16)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .transition(t)
    .attr('width', width)
    .attr('opacity', 1);

  layer.selectAll('text.file-header-label').data(headerData, d => d.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-header-label')
        .attr('x', 4).attr('y', 12)
        .attr('opacity', 0),
      update => update,
      exit => exit.transition(t).attr('opacity', 0).remove()
    )
    .text(d => truncateLabel(d.name, width - 8, 7))
    .transition(t)
    .attr('opacity', 1);
}

function renderFilesLegend(fileData) {
  // Stats now shown in status button via updateStatus()
  const legend = document.getElementById('legend');
  if (legend) legend.style.display = 'none';
}

function renderFunctionLegend(leaves) {
  const legend = document.getElementById('legend');
  if (!legend || currentView !== 'functions') return;

  legend.style.display = 'flex';
  legend.innerHTML = '<div class="legend-item" style="margin-left:auto;"><strong>' + leaves.length + '</strong> functions</div>';
}

// Re-render on window resize
window.addEventListener('resize', () => {
  if (currentView === 'files' || currentView === 'functions') {
    renderDistributionChart();
    selection._applyHighlights();
  } else if (currentView === 'deps' && depGraph) {
    renderDepGraph();
    selection._applyHighlights();
  }
});
`;
