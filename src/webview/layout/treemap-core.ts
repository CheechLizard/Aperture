export const TREEMAP_CORE_SCRIPT = `
// Core treemap constants, state management, and hierarchy building
// Uses d3.treemap() for efficient space usage at folder level
// Supports adaptive depth - collapses folders when children would be too small

const TREEMAP_LABEL_MIN_WIDTH = 40;
const TREEMAP_LABEL_MIN_HEIGHT = 16;
const MIN_NODE_SIZE = 30;  // Minimum px for a clickable node
const MIN_EXPAND_SIZE = 100;  // Folders larger than this should always expand
const DEBUG_SHOW_PARTITIONS = false;  // Show BSP partition debug visualization

// Helper to check if a node is too small to show a useful label
function tooSmallForLabel(node) {
  const w = node.x1 - node.x0;
  const h = node.y1 - node.y0;
  return w < TREEMAP_LABEL_MIN_WIDTH || h < TREEMAP_LABEL_MIN_HEIGHT;
}

// State for viewing a subset of items (when expanding collapsed "other" nodes)
let zoomedOtherInfo = null;  // { folderPath, paths, count, total }

function setZoomedOther(info) {
  zoomedOtherInfo = info;
}

function getZoomedOther() {
  return zoomedOtherInfo;
}

function buildFileHierarchy(fileData, zoomedFolderPath) {
  // Build full hierarchy with folder URIs
  const root = { name: 'root', path: '', uri: createFolderUri(''), children: [] };
  for (const file of fileData) {
    const parts = file.path.split('/');
    let current = root;
    let currentPath = '';
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      currentPath = currentPath ? currentPath + '/' + part : part;
      let child = current.children.find(c => c.name === part && c.children);
      if (!child) {
        child = { name: part, path: currentPath, uri: createFolderUri(currentPath), children: [] };
        current.children.push(child);
      }
      current = child;
    }
    current.children.push(file);
  }

  // If zoomed into a folder, return that subtree
  if (zoomedFolderPath) {
    const subtree = findNodeByPath(root, zoomedFolderPath);
    if (subtree) {
      // If viewing partial (collapsed items), filter children to only those paths
      if (zoomedOtherInfo && zoomedOtherInfo.folderPath === zoomedFolderPath) {
        const allowedPaths = new Set(zoomedOtherInfo.paths);
        subtree.children = subtree.children.filter(c => allowedPaths.has(c.path));
      }
      return subtree;
    }
  }

  // Handle root-level partial view (when folderPath is '')
  if (zoomedOtherInfo && zoomedOtherInfo.folderPath === '') {
    const allowedPaths = new Set(zoomedOtherInfo.paths);
    root.children = root.children.filter(c => allowedPaths.has(c.path));
  }

  return root;
}

function findNodeByPath(node, targetPath) {
  if (node.path === targetPath) return node;
  if (!node.children) return null;
  for (const child of node.children) {
    const found = findNodeByPath(child, targetPath);
    if (found) return found;
  }
  return null;
}

function countDescendantFiles(node) {
  if (!node.children) return 1;  // It's a file
  return node.children.reduce((sum, c) => sum + countDescendantFiles(c), 0);
}
`;
