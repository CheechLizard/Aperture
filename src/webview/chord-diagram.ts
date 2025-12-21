export const CHORD_SCRIPT = `
function renderDepGraph() {
  if (!depGraph) return;

  const container = document.getElementById('dep-chord');
  container.innerHTML = '';
  const tooltip = document.querySelector('.tooltip');

  // Filter to code files with connections
  const codeNodes = depGraph.nodes.filter(n =>
    /\\.(ts|tsx|js|jsx|lua|py|go|rs)$/.test(n.path) && (n.imports.length > 0 || n.importedBy.length > 0)
  );

  renderStats(codeNodes.length, depGraph.edges.length);

  if (codeNodes.length === 0) {
    const debugLines = (depGraph.debug || []).map(d => '<br>• ' + d).join('');
    container.innerHTML = '<p style="padding:20px;color:var(--vscode-descriptionForeground);font-size:12px;">No dependencies found.<br><br><strong>Debug:</strong>' + debugLines + '</p>';
    return;
  }

  // Build file-based groups for chord diagram
  const maxItems = parseInt(document.getElementById('depth-slider').value) || 30;
  const sortMode = document.getElementById('sort-mode').value;
  const sortedFiles = [...codeNodes].sort((a, b) =>
    sortMode === 'used' ? b.importedBy.length - a.importedBy.length : b.imports.length - a.imports.length
  );

  // Get issue file paths from anti-patterns
  const issueFilePaths = new Set();
  if (depGraph.antiPatterns) {
    for (const ap of depGraph.antiPatterns) {
      for (const f of ap.files) { issueFilePaths.add(f); }
    }
  }

  // Always include issue files first, then fill with top sorted files
  const includedPaths = new Set();
  const selectedFiles = [];
  for (const f of codeNodes) {
    if (issueFilePaths.has(f.path)) { selectedFiles.push(f); includedPaths.add(f.path); }
  }
  for (const f of sortedFiles) {
    if (selectedFiles.length >= maxItems) break;
    if (!includedPaths.has(f.path)) { selectedFiles.push(f); includedPaths.add(f.path); }
  }

  topGroups = selectedFiles.map(f => ({
    name: f.path.split('/').pop(),
    fullPath: f.path,
    files: [f],
    imports: f.imports.length,
    importedBy: f.importedBy.length
  }));
  const groupIndex = new Map(topGroups.map((g, i) => [g.fullPath, i]));

  // Build adjacency matrix
  const n = topGroups.length;
  const matrix = Array(n).fill(null).map(() => Array(n).fill(0));
  for (const edge of depGraph.edges) {
    const fromIdx = groupIndex.get(edge.from);
    const toIdx = groupIndex.get(edge.to);
    if (fromIdx !== undefined && toIdx !== undefined) { matrix[fromIdx][toIdx]++; }
  }
  for (let i = 0; i < n; i++) { matrix[i][i] = Math.max(matrix[i][i], 2); }

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
      const pathParts = g.fullPath.split('/');
      const fileName = pathParts.pop();
      let html = '<div style="font-size:10px;color:var(--vscode-descriptionForeground);">' + pathParts.join('/') + '</div>';
      html += '<div style="font-size:16px;font-weight:bold;margin:4px 0 8px 0;">' + fileName + '</div>';
      html += '<div style="font-size:11px;color:var(--vscode-descriptionForeground);">' + g.imports + ' imports out · ' + g.importedBy + ' imports in</div>';
      if (node && node.imports && node.imports.length > 0) {
        html += '<div style="margin-top:10px;border-top:1px solid var(--vscode-widget-border);padding-top:8px;"><strong style="font-size:11px;">Imports:</strong></div>';
        for (const imp of node.imports.slice(0, 5)) { html += '<div style="font-size:10px;color:var(--vscode-textLink-foreground);margin-top:3px;">' + imp.split('/').pop() + '</div>'; }
        if (node.imports.length > 5) { html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:3px;">...and ' + (node.imports.length - 5) + ' more</div>'; }
      }
      html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:8px;">Click to open file</div>';
      tooltip.style.display = 'block'; tooltip.innerHTML = html;
    })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
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
      let html = '<strong>' + topGroups[d.source.index].name + '</strong> → <strong>' + topGroups[d.target.index].name + '</strong>';
      if (edge && edge.code) {
        html += '<br><code style="font-size:11px;background:rgba(0,0,0,0.3);padding:2px 4px;border-radius:2px;display:block;margin-top:6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px;">' + escapeHtml(edge.code) + '</code>';
        html += '<div style="font-size:10px;color:var(--vscode-descriptionForeground);margin-top:4px;">Line ' + edge.line + ' · Click to open</div>';
      } else { html += '<br>' + d.source.value + ' dependencies'; }
      tooltip.style.display = 'block'; tooltip.innerHTML = html;
    })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => {
      const fromPath = topGroups[d.source.index].fullPath;
      const edge = edgeLookup.get(fromPath + '|' + topGroups[d.target.index].fullPath);
      vscode.postMessage({ command: 'openFile', path: rootPath + '/' + fromPath, line: edge ? edge.line : undefined });
    });

  applyPersistentIssueHighlights();
}
`;
