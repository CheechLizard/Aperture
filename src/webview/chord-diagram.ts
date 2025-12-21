export const CHORD_SCRIPT = `
function renderDepGraph() {
  if (!depGraph) return;

  const container = document.getElementById('dep-chord');
  container.innerHTML = '';

  // Filter to code files, optionally including orphans
  const showOrphans = document.getElementById('show-orphans').checked;
  const codeNodes = depGraph.nodes.filter(n =>
    /\\.(ts|tsx|js|jsx|lua|py|go|rs)$/.test(n.path) &&
    (showOrphans || n.imports.length > 0 || n.importedBy.length > 0)
  );

  renderStats(codeNodes.length, depGraph.edges.length);

  if (codeNodes.length === 0) {
    const debugLines = (depGraph.debug || []).map(d => '<br>• ' + d).join('');
    container.innerHTML = '<p style="padding:20px;color:var(--vscode-descriptionForeground);font-size:12px;">No dependencies found.<br><br><strong>Debug:</strong>' + debugLines + '</p>';
    return;
  }

  // Calculate max depth and update slider
  const maxDepth = Math.max(...codeNodes.map(n => n.path.split('/').length));
  const depthSlider = document.getElementById('depth-slider');
  depthSlider.max = maxDepth;
  if (parseInt(depthSlider.value) > maxDepth) depthSlider.value = maxDepth;
  const depthLevel = parseInt(depthSlider.value) || maxDepth;
  document.getElementById('depth-value').textContent = depthLevel;

  function getGroupKey(path, depth) {
    const parts = path.split('/');
    if (depth >= parts.length) return path; // Individual file
    return parts.slice(0, depth).join('/');
  }

  // Build groups by folder depth
  const groups = new Map();
  for (const node of codeNodes) {
    const key = getGroupKey(node.path, depthLevel);
    if (!groups.has(key)) {
      const isFile = depthLevel >= node.path.split('/').length;
      groups.set(key, {
        name: key.split('/').pop() + (isFile ? '' : '/'),
        fullPath: key,
        files: [],
        imports: 0,
        importedBy: 0,
        isFolder: !isFile
      });
    }
    const g = groups.get(key);
    g.files.push(node);
    g.imports += node.imports.length;
    g.importedBy += node.importedBy.length;
  }

  // Sort groups based on sort mode
  const sortMode = document.getElementById('sort-mode').value;
  topGroups = [...groups.values()].sort((a, b) =>
    sortMode === 'used' ? b.importedBy - a.importedBy : b.imports - a.imports
  );

  // Build index mapping file paths to their group index
  const groupIndex = new Map();
  topGroups.forEach((g, i) => {
    for (const f of g.files) {
      groupIndex.set(f.path, i);
    }
  });

  // Build adjacency matrix
  const n = topGroups.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  for (const edge of depGraph.edges) {
    const fromIdx = groupIndex.get(edge.from);
    const toIdx = groupIndex.get(edge.to);
    if (fromIdx !== undefined && toIdx !== undefined) { matrix[fromIdx][toIdx]++; }
  }
  // Only set diagonal for groups with connections (not orphans)
  for (let i = 0; i < n; i++) {
    const hasConnections = topGroups[i].imports > 0 || topGroups[i].importedBy > 0;
    if (hasConnections) { matrix[i][i] = Math.max(matrix[i][i], 2); }
  }

  const availableHeight = window.innerHeight - 200;
  const availableWidth = container.clientWidth;
  const size = Math.min(availableWidth, availableHeight, 800);
  const outerRadius = size / 2 - 60;
  const innerRadius = outerRadius - 24;

  const svg = d3.select('#dep-chord').append('svg')
    .attr('width', size).attr('height', size)
    .append('g').attr('transform', 'translate(' + size/2 + ',' + size/2 + ')');

  const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending);
  const chords = chord(matrix);
  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);
  const ribbon = d3.ribbon().radius(innerRadius - 4);
  const color = d3.scaleOrdinal().domain(topGroups.map((_, i) => i)).range(d3.schemeTableau10);

  const group = svg.append('g').selectAll('g').data(chords.groups).join('g').attr('class', 'chord-group');
  const nodeLookup = new Map();
  for (const node of depGraph.nodes) { nodeLookup.set(node.path, node); }

  group.append('path')
    .attr('class', 'chord-arc')
    .attr('data-path', d => topGroups[d.index].fullPath)
    .attr('d', arc).attr('fill', d => color(d.index)).style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const g = topGroups[d.index];
      const node = nodeLookup.get(g.fullPath);
      const html = buildFileTooltip({
        path: g.fullPath,
        imports: g.imports,
        importedBy: g.importedBy,
        showImportsList: !g.isFolder,
        nodeData: node,
        fileCount: g.files.length,
        isFolder: g.isFolder
      });
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + topGroups[d.index].fullPath }); });

  group.append('text').attr('class', 'chord-label')
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2; })
    .attr('dy', '0.35em')
    .attr('transform', d => 'rotate(' + (d.angle * 180 / Math.PI - 90) + ')translate(' + (outerRadius + 6) + ')' + (d.angle > Math.PI ? 'rotate(180)' : ''))
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : null)
    .text(d => { const name = topGroups[d.index].name; return name.length > 15 ? name.slice(0, 12) + '...' : name; });

  const edgeLookup = new Map();
  for (const edge of depGraph.edges) { edgeLookup.set(edge.from + '|' + edge.to, edge); }

  svg.append('g').selectAll('path').data(chords).join('path')
    .attr('class', 'chord-ribbon')
    .attr('data-from', d => topGroups[d.source.index].fullPath)
    .attr('data-to', d => topGroups[d.target.index].fullPath)
    .attr('d', ribbon).attr('fill', d => color(d.source.index)).attr('fill-opacity', 0.6).style('cursor', 'pointer')
    .on('mouseover', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + topGroups[d.target.index].fullPath);
      const html = buildEdgeTooltip({
        fromName: topGroups[d.source.index].name,
        toName: topGroups[d.target.index].name,
        code: edge ? edge.code : null,
        line: edge ? edge.line : null
      });
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + topGroups[d.target.index].fullPath);
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + fromPath, line: edge ? edge.line : undefined });
    });

  applyPersistentIssueHighlights();
}
`;
