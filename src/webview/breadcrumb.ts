export const BREADCRUMB_SCRIPT = `
// Breadcrumb navigation for treemap
// Shows clickable path segments: ← Back  src / components / Header.tsx

const BREADCRUMB_SEPARATOR = ' / ';
const MAX_BREADCRUMB_SEGMENTS = 6;

function buildBreadcrumbSegments(uri) {
  if (!uri) return [];

  const parsed = parseUri(uri);
  const segments = [];

  // Add path segments (folders and file)
  const pathParts = parsed.path.split('/').filter(Boolean);
  let currentPath = '';
  for (const part of pathParts) {
    currentPath = currentPath ? currentPath + '/' + part : part;
    segments.push({
      name: part,
      uri: createFileUri(currentPath),
      isFile: currentPath === parsed.path
    });
  }

  // Add symbol segments if we have a fragment
  if (parsed.fragment) {
    const symbolParts = parsed.fragment.split('.');
    let currentFragment = '';
    for (const part of symbolParts) {
      currentFragment = currentFragment ? currentFragment + '.' + part : part;
      // Clean up block notation for display (e.g., "if:10" -> "if")
      const displayName = part.replace(/:(\\d+)$/, '');
      segments.push({
        name: displayName,
        uri: createFileUri(parsed.path) + '#' + currentFragment,
        isSymbol: true
      });
    }
  }

  return segments;
}

function truncateBreadcrumb(segments) {
  if (segments.length <= MAX_BREADCRUMB_SEGMENTS) {
    return segments;
  }

  // Keep first 2 and last 3, add ellipsis in middle
  const start = segments.slice(0, 2);
  const end = segments.slice(-3);
  return [...start, { name: '...', uri: null, isEllipsis: true }, ...end];
}

function renderBreadcrumb(container, zoomedUri) {
  if (!container) return;

  if (!zoomedUri) {
    container.classList.add('hidden');
    container.innerHTML = '';
    return;
  }

  const segments = buildBreadcrumbSegments(zoomedUri);
  const displaySegments = truncateBreadcrumb(segments);

  container.classList.remove('hidden');

  // Build HTML
  let html = '<button class="back-btn" title="Go back (Escape)">\\u2190</button>';

  displaySegments.forEach((seg, i) => {
    if (i > 0) {
      html += '<span class="breadcrumb-separator">/</span>';
    }

    if (seg.isEllipsis) {
      html += '<span class="breadcrumb-ellipsis">...</span>';
    } else if (i === displaySegments.length - 1) {
      // Current location - not clickable
      html += '<span class="breadcrumb-current">' + seg.name + '</span>';
    } else {
      // Clickable segment
      html += '<button class="breadcrumb-segment" data-uri="' + seg.uri + '">' + seg.name + '</button>';
    }
  });

  container.innerHTML = html;

  // Add event listeners
  container.querySelector('.back-btn').addEventListener('click', () => nav.back());

  container.querySelectorAll('.breadcrumb-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uri = e.target.dataset.uri;
      if (uri) {
        nav.goTo({ uri: uri });
      }
    });
  });
}

// Keyboard navigation
document.addEventListener('keydown', (e) => {
  // Only handle when treemap is active
  if (currentView !== 'files' && currentView !== 'functions') return;

  // Don't intercept if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key === 'Escape' || e.key === 'Backspace') {
    e.preventDefault();
    nav.back();
  } else if (e.key === 'Home') {
    e.preventDefault();
    nav.goTo({ uri: null });
  }
});
`;
