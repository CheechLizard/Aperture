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

  if (selectedElement && selectedElement.isConnected) {
    // Visible selection background with pulsing alpha
    const bgAlpha = 0.5 + 0.1 * Math.sin(pulsePhase);
    selectedElement.style.background = 'rgba(' + r + ',' + g + ',' + b + ',' + bgAlpha.toFixed(2) + ')';
  }
}

setInterval(cycleIssueColors, 16);
`;
