export const BREADCRUMB_SCRIPT = `
// Breadcrumb navigation for treemap
// Shows clickable path segments: ProjectName / src / components / Header.tsx

const MAX_BREADCRUMB_SEGMENTS = 6;

// Extract project name from root path
function getProjectName() {
  if (!rootPath) return 'Project';
  const parts = rootPath.replace(/\\\\/g, '/').split('/').filter(Boolean);
  return parts[parts.length - 1] || 'Project';
}

function buildBreadcrumbSegments(uri) {
  const segments = [];

  // Always add project root as first segment
  segments.push({
    name: getProjectName(),
    uri: null,  // null URI means go to root
    isRoot: true
  });

  if (!uri) return segments;

  const parsed = parseUri(uri);

  // Add path segments (folders and file)
  const pathParts = parsed.path.split('/').filter(Boolean);
  let currentPath = '';
  for (const part of pathParts) {
    currentPath = currentPath ? currentPath + '/' + part : part;
    const isFile = currentPath === parsed.path && !parsed.fragment;
    segments.push({
      name: part,
      uri: isFile ? createFileUri(currentPath) : createFolderUri(currentPath),
      isFile: isFile
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

  const segments = buildBreadcrumbSegments(zoomedUri);
  const displaySegments = truncateBreadcrumb(segments);

  // Always show breadcrumb (at minimum shows project root)
  container.classList.remove('hidden');

  // Build HTML - no back button, just path segments
  let html = '';

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
      // Clickable segment - use 'null' string for root
      const uriAttr = seg.uri === null ? 'null' : seg.uri;
      html += '<button class="breadcrumb-segment" data-uri="' + uriAttr + '">' + seg.name + '</button>';
    }
  });

  container.innerHTML = html;

  // Add event listeners for clickable segments
  container.querySelectorAll('.breadcrumb-segment').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const uriStr = e.target.dataset.uri;
      // Handle root navigation (null URI)
      const uri = uriStr === 'null' ? null : uriStr;
      nav.goTo({ uri: uri });
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
