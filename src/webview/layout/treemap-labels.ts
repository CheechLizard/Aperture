export const TREEMAP_LABELS_SCRIPT = `
// Treemap label and header rendering
// File labels, folder headers, partial view header, and debug visualization

function renderFolderLeafLabels(layer, leaves) {
  // Render labels for collapsed folder leaf nodes
  const folderLeaves = leaves.filter(d => d.data._collapsed);
  const folderLabelsData = folderLeaves.filter(d => {
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.folder-label').data(zoomedFile ? [] : folderLabelsData, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-label')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .text(d => {
      // "Other" nodes already have descriptive name, folders get trailing "/"
      const label = d.data._isOther ? d.data.name : d.data.name + '/';
      return truncateLabel(label, (d.x1 - d.x0) - 8, 5);
    })
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);

  // Render folder item counts (only for regular folders, not "other" nodes)
  const folderCountData = folderLabelsData.filter(d => !d.data._isOther);
  layer.selectAll('text.folder-count').data(zoomedFile ? [] : folderCountData, d => d.data.path)
    .join(
      enter => enter.append('text')
        .attr('class', 'folder-count')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 22),
      update => update,
      exit => exit.remove()
    )
    .text(d => d.data._childCount + ' items')
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 22);
}

function renderFileLabels(layer, leaves, width, height, t) {
  // Only label files (not collapsed folders - they have their own labels)
  const labelsData = leaves.filter(d => {
    if (d.data._collapsed) return false;  // Skip collapsed folders
    const w = d.x1 - d.x0;
    const h = d.y1 - d.y0;
    return w >= TREEMAP_LABEL_MIN_WIDTH && h >= TREEMAP_LABEL_MIN_HEIGHT;
  });

  layer.selectAll('text.file-label').data(zoomedFile ? [] : labelsData, d => d.data.uri)
    .join(
      enter => enter.append('text')
        .attr('class', 'file-label')
        .attr('fill', '#fff')
        .attr('font-size', '9px')
        .attr('pointer-events', 'none')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12)
        .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 5)),
      update => update,
      exit => exit.remove()
    )
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}

function renderFolderHeaders(layer, hierarchy, width, height, t) {
  const depth1 = zoomedFile ? [] : hierarchy.descendants().filter(d => d.depth === 1 && d.children && (d.x1 - d.x0) > 30);

  layer.selectAll('rect.dir-header').data(depth1, d => d.data?.path || '')
    .join(
      enter => enter.append('rect')
        .attr('class', 'dir-header')
        .attr('x', d => d.x0)
        .attr('y', d => d.y0)
        .attr('width', d => d.x1 - d.x0)
        .attr('height', 16),
      update => update,
      exit => exit.remove()
    )
    .style('cursor', 'pointer')
    .style('pointer-events', 'auto')
    .on('mouseover', (e, d) => {
      const html = '<div><strong>' + d.data.name + '/</strong></div>' +
        '<div style="color:var(--vscode-descriptionForeground)">Click to zoom into folder</div>';
      showTooltip(html, e);
    })
    .on('mousemove', e => positionTooltip(e))
    .on('mouseout', () => hideTooltip())
    .on('click', (e, d) => {
      e.stopPropagation();
      if (!d.data.uri) return;
      // Clear partial view when navigating to a folder
      setZoomedOther(null);
      // Use the full folder bounds (not just header) for smoother animation
      zoom.setClickedBounds({
        x: d.x0,
        y: d.y0,
        w: d.x1 - d.x0,
        h: d.y1 - d.y0
      });
      nav.goTo({ uri: d.data.uri });
    })
    .attr('x', d => d.x0)
    .attr('y', d => d.y0)
    .attr('width', d => d.x1 - d.x0)
    .attr('height', 16);

  layer.selectAll('text.dir-label').data(depth1, d => d.data?.path || '')
    .join(
      enter => enter.append('text')
        .attr('class', 'dir-label')
        .attr('x', d => d.x0 + 4)
        .attr('y', d => d.y0 + 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => truncateLabel(d.data.name, (d.x1 - d.x0) - 8, 7))
    .attr('x', d => d.x0 + 4)
    .attr('y', d => d.y0 + 12);
}

function renderPartialViewHeader(layer, width) {
  // Show header when viewing a partial set of items (expanded "other" node)
  const otherInfo = zoomedOtherInfo;
  const headerData = otherInfo ? [otherInfo] : [];

  layer.selectAll('rect.partial-header').data(headerData)
    .join(
      enter => enter.append('rect')
        .attr('class', 'partial-header dir-header')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', 16),
      update => update.attr('width', width),
      exit => exit.remove()
    );

  layer.selectAll('text.partial-label').data(headerData)
    .join(
      enter => enter.append('text')
        .attr('class', 'partial-label dir-label')
        .attr('x', 4)
        .attr('y', 12),
      update => update,
      exit => exit.remove()
    )
    .style('pointer-events', 'none')
    .text(d => d.count + ' of ' + d.total + ' items');
}

// DEBUG: Visualize BSP partitions
// - Solid red: Partition with small items (2+ items -> will collapse)
// - Dashed red: Single small item partition (MISS - won't collapse)
// - Blue: Partition with no small items
function renderDebugPartitions(layer, hierarchy) {
  // Clear existing debug elements
  layer.selectAll('.debug-partition').remove();

  const nodesWithPartitions = hierarchy.descendants().filter(d => d._debugPartitions);

  nodesWithPartitions.forEach(node => {
    const partitions = node._debugPartitions;
    partitions.forEach((partition, i) => {
      const x0 = Math.min(...partition.map(n => n.x0));
      const y0 = Math.min(...partition.map(n => n.y0));
      const x1 = Math.max(...partition.map(n => n.x1));
      const y1 = Math.max(...partition.map(n => n.y1));

      const hasSmall = partition.some(n => tooSmallForLabel(n));
      const isSingle = partition.length === 1;

      layer.append('rect')
        .attr('class', 'debug-partition')
        .attr('x', x0 + 1)
        .attr('y', y0 + 1)
        .attr('width', x1 - x0 - 2)
        .attr('height', y1 - y0 - 2)
        .attr('fill', 'none')
        .attr('stroke', hasSmall ? '#ff3333' : '#3333ff')
        .attr('stroke-width', 2)
        .attr('stroke-dasharray', isSingle ? '4,4' : 'none')
        .attr('pointer-events', 'none');
    });
  });
}
`;
