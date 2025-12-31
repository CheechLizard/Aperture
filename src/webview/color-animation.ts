export const COLOR_ANIMATION_SCRIPT = `
// Color cycle synced with CSS animations (3s cycle: cornflower → purple → turquoise)
const CYCLE_COLORS = [
  [100, 149, 237],  // Cornflower blue at 0%
  [147, 112, 219],  // Purple at 33%
  [64, 224, 208]    // Turquoise at 66%
];

function interpolateColor(t) {
  // t is 0-1 representing position in 3s cycle
  // 0-0.33: blue→purple, 0.33-0.66: purple→turquoise, 0.66-1: turquoise→blue
  const segment = t * 3;
  const idx = Math.floor(segment) % 3;
  const nextIdx = (idx + 1) % 3;
  const localT = segment - Math.floor(segment);

  const c1 = CYCLE_COLORS[idx];
  const c2 = CYCLE_COLORS[nextIdx];
  const r = Math.round(c1[0] + (c2[0] - c1[0]) * localT);
  const g = Math.round(c1[1] + (c2[1] - c1[1]) * localT);
  const b = Math.round(c1[2] + (c2[2] - c1[2]) * localT);
  return [r, g, b];
}

function cycleIssueColors() {
  // Sync with CSS animations using same timing base
  const t = (Date.now() % 3000) / 3000;
  const [r, g, b] = interpolateColor(t);
  const color = '#' + r.toString(16).padStart(2, '0') + g.toString(16).padStart(2, '0') + b.toString(16).padStart(2, '0');

  const pulsePhase = t * 2 * Math.PI;
  const alpha = 0.7 + 0.05 * Math.sin(pulsePhase);
  const ribbonAlpha = 0.3 + 0.2 * Math.sin(pulsePhase);

  document.querySelectorAll('.node.highlighted').forEach(node => {
    node.style.setProperty('fill', color, 'important');
    node.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-arc.highlighted').forEach(arc => {
    arc.style.setProperty('fill', color, 'important');
    arc.style.setProperty('fill-opacity', alpha.toString(), 'important');
  });

  document.querySelectorAll('.chord-ribbon.highlighted').forEach(ribbon => {
    ribbon.style.setProperty('fill', color, 'important');
    ribbon.style.setProperty('fill-opacity', ribbonAlpha.toString(), 'important');
  });

  // Style partition labels and leaders based on highlight state
  const highlightedUris = new Set();
  document.querySelectorAll('.node.highlighted').forEach(node => {
    const uri = node.getAttribute('data-uri');
    if (uri) highlightedUris.add(uri);
  });

  document.querySelectorAll('.partition-label').forEach(label => {
    const uri = label.getAttribute('data-uri');
    if (highlightedUris.has(uri)) {
      label.style.setProperty('fill', color, 'important');
    } else {
      label.style.removeProperty('fill');
    }
  });

  document.querySelectorAll('.partition-leader').forEach(leader => {
    const uri = leader.getAttribute('data-uri');
    if (highlightedUris.has(uri)) {
      leader.style.setProperty('stroke', color, 'important');
      leader.style.setProperty('stroke-opacity', alpha.toString(), 'important');
    } else {
      leader.style.removeProperty('stroke');
      leader.style.removeProperty('stroke-opacity');
    }
  });

  if (selectedElement && selectedElement.isConnected) {
    // Visible selection background with pulsing alpha
    const bgAlpha = 0.5 + 0.1 * Math.sin(pulsePhase);
    // Check if this is a sticky header (expanded pattern group) - needs opaque background
    const isSticky = selectedElement.classList.contains('pattern-header') &&
      selectedElement.closest('.pattern-group')?.querySelector('.pattern-items.expanded');
    if (isSticky) {
      // Blend highlight color with base background (#1e1e1e) to create opaque result
      const baseR = 30, baseG = 30, baseB = 30;
      const blendR = Math.round(r * bgAlpha + baseR * (1 - bgAlpha));
      const blendG = Math.round(g * bgAlpha + baseG * (1 - bgAlpha));
      const blendB = Math.round(b * bgAlpha + baseB * (1 - bgAlpha));
      selectedElement.style.background = 'rgb(' + blendR + ',' + blendG + ',' + blendB + ')';
    } else {
      selectedElement.style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + bgAlpha.toFixed(2) + ')';
    }
  }
}

setInterval(cycleIssueColors, 16);
`;
