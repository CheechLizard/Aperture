export const SCROLL_INDICATORS_SCRIPT = `
// Scroll edge indicators - show count of highlighted items above/below viewport
function initScrollIndicators() {
  const container = document.querySelector('.functions-container');
  if (!container || container.querySelector('.scroll-indicator')) return;

  const topIndicator = document.createElement('div');
  topIndicator.className = 'scroll-indicator top';
  topIndicator.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 14l5-5 5 5"/></svg><span class="count"></span>';

  const bottomIndicator = document.createElement('div');
  bottomIndicator.className = 'scroll-indicator bottom';
  bottomIndicator.innerHTML = '<svg viewBox="0 0 24 24"><path d="M7 10l5 5 5-5"/></svg><span class="count"></span>';

  container.appendChild(topIndicator);
  container.appendChild(bottomIndicator);

  // Click to scroll to first off-screen highlighted item
  topIndicator.addEventListener('click', () => scrollToOffscreenHighlight('above'));
  bottomIndicator.addEventListener('click', () => scrollToOffscreenHighlight('below'));
}

function updateScrollIndicators() {
  const chart = document.getElementById('functions-chart');
  const container = document.querySelector('.functions-container');
  if (!chart || !container) return;

  const topIndicator = container.querySelector('.scroll-indicator.top');
  const bottomIndicator = container.querySelector('.scroll-indicator.bottom');
  if (!topIndicator || !bottomIndicator) return;

  // Only show indicators when zoomed into a file (partition layout)
  if (!zoomedFile) {
    topIndicator.classList.remove('visible');
    bottomIndicator.classList.remove('visible');
    return;
  }

  // Get all highlighted nodes in the partition view
  const highlighted = chart.querySelectorAll('.node.highlighted');
  if (highlighted.length === 0) {
    topIndicator.classList.remove('visible');
    bottomIndicator.classList.remove('visible');
    return;
  }

  const chartRect = chart.getBoundingClientRect();
  let aboveCount = 0;
  let belowCount = 0;

  highlighted.forEach(node => {
    const rect = node.getBoundingClientRect();
    // Check if node is above viewport (its bottom is above chart top)
    if (rect.bottom < chartRect.top) {
      aboveCount++;
    }
    // Check if node is below viewport (its top is below chart bottom)
    else if (rect.top > chartRect.bottom) {
      belowCount++;
    }
  });

  // Update top indicator
  if (aboveCount > 0) {
    topIndicator.querySelector('.count').textContent = aboveCount + ' issue' + (aboveCount !== 1 ? 's' : '') + ' above';
    topIndicator.classList.add('visible');
  } else {
    topIndicator.classList.remove('visible');
  }

  // Update bottom indicator
  if (belowCount > 0) {
    bottomIndicator.querySelector('.count').textContent = belowCount + ' issue' + (belowCount !== 1 ? 's' : '') + ' below';
    bottomIndicator.classList.add('visible');
  } else {
    bottomIndicator.classList.remove('visible');
  }
}

function scrollToOffscreenHighlight(direction) {
  const chart = document.getElementById('functions-chart');
  if (!chart) return;

  const highlighted = [...chart.querySelectorAll('.node.highlighted')];
  if (highlighted.length === 0) return;

  const chartRect = chart.getBoundingClientRect();

  if (direction === 'above') {
    // Find the last highlighted node that's above viewport
    for (let i = highlighted.length - 1; i >= 0; i--) {
      const rect = highlighted[i].getBoundingClientRect();
      if (rect.bottom < chartRect.top) {
        highlighted[i].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  } else {
    // Find the first highlighted node that's below viewport
    for (const node of highlighted) {
      const rect = node.getBoundingClientRect();
      if (rect.top > chartRect.bottom) {
        node.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
    }
  }
}

// Initialize indicators and listen for scroll
initScrollIndicators();
document.getElementById('functions-chart')?.addEventListener('scroll', updateScrollIndicators);
`;
