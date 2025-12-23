export const COLOR_ANIMATION_SCRIPT = `
let cycleTime = 0;

function hslToHex(h, s, l) {
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return '#' + f(0) + f(8) + f(4);
}

function cycleIssueColors() {
  cycleTime += 0.016;
  const hue = (cycleTime * 36) % 360;
  const color = hslToHex(hue, 0.85, 0.6);

  const pulsePhase = (cycleTime * 1000 / 2000) * 2 * Math.PI;
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
    const bgColor = color.replace('#', 'rgba(')
      .replace(/(..)(..)(..)/, (_, r, g, b) =>
        parseInt(r, 16) + ',' + parseInt(g, 16) + ',' + parseInt(b, 16) + ',0.2)');
    selectedElement.style.borderLeftColor = color;
    selectedElement.style.background = bgColor;
  }
}

setInterval(cycleIssueColors, 16);
`;
