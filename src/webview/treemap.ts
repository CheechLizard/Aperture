export const TREEMAP_SCRIPT = `
const COLORS = {
  'TypeScript': '#3178c6', 'JavaScript': '#f0db4f', 'Lua': '#9b59b6',
  'JSON': '#27ae60', 'HTML': '#e34c26', 'CSS': '#e91e63',
  'Markdown': '#795548', 'Python': '#2ecc71', 'Shell': '#89e051',
  'Go': '#00add8', 'Rust': '#dea584'
};
const DEFAULT_COLOR = '#808080';

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
  const tooltip = document.querySelector('.tooltip');

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

  const getColor = (d) => COLORS[d.data.language] || DEFAULT_COLOR;
  const getTooltip = (d) => '<strong>' + d.data.path + '</strong><br>' + d.data.language + ' · ' + d.value.toLocaleString() + ' LOC';

  svg.selectAll('rect.node').data(leaves).join('rect')
    .attr('class', 'node')
    .attr('data-path', d => d.data.path)
    .attr('x', d => d.x0).attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0).attr('height', d => d.y1 - d.y0)
    .attr('fill', getColor)
    .on('mouseover', (e, d) => { tooltip.style.display = 'block'; tooltip.innerHTML = getTooltip(d); })
    .on('mousemove', e => { tooltip.style.left = (e.pageX + 10) + 'px'; tooltip.style.top = (e.pageY + 10) + 'px'; })
    .on('mouseout', () => { tooltip.style.display = 'none'; })
    .on('click', (e, d) => { vscode.postMessage({ command: 'openFile', path: rootPath + '/' + d.data.path }); });

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

function renderLegend() {
  const container = document.getElementById('legend');
  const languages = [...new Set(files.map(f => f.language))].sort();
  container.innerHTML = languages.map(lang => {
    const color = COLORS[lang] || DEFAULT_COLOR;
    return '<div class="legend-item"><span class="legend-swatch" style="background:' + color + ';"></span>' + lang + '</div>';
  }).join('');
}
`;
