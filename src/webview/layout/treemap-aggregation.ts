export const TREEMAP_AGGREGATION_SCRIPT = `
// BSP-based aggregation algorithm for collapsing small treemap nodes
// Aggregates small sibling nodes into "X small items" collapsed groups

function aggregateSmallNodes(hierarchyNode) {
  if (!hierarchyNode.children) return;

  // Recurse into children first (depth-first, reverse order = smallest first)
  const children = hierarchyNode.children;
  for (let i = children.length - 1; i >= 0; i--) {
    aggregateSmallNodes(children[i]);
  }

  const EPS = 2;

  // Helper: compute bounding box of nodes
  const computeBbox = (nodes) => ({
    x0: Math.min(...nodes.map(c => c.x0)),
    y0: Math.min(...nodes.map(c => c.y0)),
    x1: Math.max(...nodes.map(c => c.x1)),
    y1: Math.max(...nodes.map(c => c.y1))
  });

  // Helper: create a collapsed node from items
  const createCollapsedNode = (items) => {
    const bbox = computeBbox(items);
    let otherCount = 0;
    const collapsedPaths = [];
    for (const node of items) {
      otherCount += countDescendantFiles(node.data);
      collapsedPaths.push(node.data.path);
    }
    return {
      data: {
        name: otherCount + ' more...',
        path: hierarchyNode.data.path + '/_other_' + Math.random().toString(36).slice(2, 6),
        uri: hierarchyNode.data.uri,
        _isOther: true,
        _otherCount: otherCount,
        _collapsedPaths: collapsedPaths,
        _totalSiblings: children.length,
        _collapsed: true
      },
      x0: bbox.x0, y0: bbox.y0, x1: bbox.x1, y1: bbox.y1,
      depth: hierarchyNode.depth + 1,
      parent: hierarchyNode,
      children: null,
      _isCollapsedGroup: true,
      _collapsedItems: items
    };
  };

  // Find a split line that separates items into two groups
  const findSplit = (items) => {
    if (items.length <= 1) return null;

    const allSameY = items.every(n =>
      Math.abs(n.y0 - items[0].y0) < EPS && Math.abs(n.y1 - items[0].y1) < EPS);
    const allSameX = items.every(n =>
      Math.abs(n.x0 - items[0].x0) < EPS && Math.abs(n.x1 - items[0].x1) < EPS);

    if (allSameY || allSameX) return null;

    const xEdges = new Set();
    const yEdges = new Set();
    items.forEach(n => {
      xEdges.add(n.x0); xEdges.add(n.x1);
      yEdges.add(n.y0); yEdges.add(n.y1);
    });

    for (const x of xEdges) {
      const left = items.filter(n => n.x1 <= x + EPS);
      const right = items.filter(n => n.x0 >= x - EPS);
      if (left.length > 0 && right.length > 0 && left.length + right.length === items.length) {
        return { first: left, last: right };
      }
    }

    for (const y of yEdges) {
      const top = items.filter(n => n.y1 <= y + EPS);
      const bottom = items.filter(n => n.y0 >= y - EPS);
      if (top.length > 0 && bottom.length > 0 && top.length + bottom.length === items.length) {
        return { first: top, last: bottom };
      }
    }

    return null;
  };

  // Build BSP tree node from items
  const buildBspNode = (items) => {
    if (items.length === 0) return null;
    const split = findSplit(items);
    if (!split) {
      // Leaf node - items are siblings
      return { isLeaf: true, items: items };
    }
    return {
      isLeaf: false,
      first: buildBspNode(split.first),
      last: buildBspNode(split.last)
    };
  };

  // Process BSP tree node, collapsing small items
  // Modifies the tree in place, returns the resulting items array for this subtree
  const processBspNode = (node) => {
    if (!node) return [];

    if (node.isLeaf) {
      // Leaf: items are siblings, can be collapsed together
      const items = node.items;
      const smalls = items.filter(n => tooSmallForLabel(n));

      if (smalls.length === 0) {
        return items; // Nothing to collapse
      }

      // Sort by value (large first) so smallest are at end
      const sorted = [...items].sort((a, b) => (b.data.value || 0) - (a.data.value || 0));

      let toCollapse = [];
      let toKeep = [];

      for (const item of sorted) {
        if (tooSmallForLabel(item)) {
          toCollapse.push(item);
        } else {
          toKeep.push(item);
        }
      }

      // Grow collapsed region until labelable
      let bbox = computeBbox(toCollapse);
      while (tooSmallForLabel(bbox) && toKeep.length > 0) {
        toCollapse.push(toKeep.pop());
        bbox = computeBbox(toCollapse);
      }

      // Always create collapsed node if there are smalls
      if (toCollapse.length > 0) {
        return [...toKeep, createCollapsedNode(toCollapse)];
      }

      return items;
    }

    // Internal node: process children first
    const firstItems = processBspNode(node.first);
    const lastItems = processBspNode(node.last);

    // Find collapsed groups that need growth (not labelable)
    const firstCollapsed = firstItems.find(n => n._isCollapsedGroup);
    const lastCollapsed = lastItems.find(n => n._isCollapsedGroup);
    const needsGrowth = (firstCollapsed && tooSmallForLabel(firstCollapsed)) ||
                        (lastCollapsed && tooSmallForLabel(lastCollapsed));

    if (needsGrowth) {
      // Collect all original items from both sides
      const allItems = [];
      for (const item of [...firstItems, ...lastItems]) {
        if (item._isCollapsedGroup) {
          allItems.push(...item._collapsedItems);
        } else {
          allItems.push(item);
        }
      }
      return [createCollapsedNode(allItems)];
    }

    // Check if both sides are fully collapsed (single collapsed node each)
    const firstIsCollapsed = firstItems.length === 1 && firstItems[0]._isCollapsedGroup;
    const lastIsCollapsed = lastItems.length === 1 && lastItems[0]._isCollapsedGroup;

    if (firstIsCollapsed && lastIsCollapsed) {
      // Both siblings are collapsed - merge them
      const allOriginalItems = [
        ...firstItems[0]._collapsedItems,
        ...lastItems[0]._collapsedItems
      ];
      const bbox = computeBbox(allOriginalItems);

      if (!tooSmallForLabel(bbox)) {
        // Merge into single collapsed node
        return [createCollapsedNode(allOriginalItems)];
      }
      // Can't merge - keep separate (will try at parent level)
    }

    // Return combined items from both branches
    return [...firstItems, ...lastItems];
  };

  // DEBUG: Collect all leaf partitions for visualization
  const collectLeafPartitions = (items) => {
    if (items.length === 0) return [];
    const split = findSplit(items);
    if (!split) return [items];
    return [...collectLeafPartitions(split.first), ...collectLeafPartitions(split.last)];
  };

  // Build BSP tree and process it
  const bspRoot = buildBspNode([...children]);
  const resultItems = processBspNode(bspRoot);

  // Store debug partitions
  hierarchyNode._debugPartitions = collectLeafPartitions([...children]);

  // If ALL children collapsed into a single "other" group,
  // show this as a collapsed folder instead (e.g. "camera/" not "4 small items")
  if (resultItems.length === 1 &&
      resultItems[0]._isCollapsedGroup &&
      resultItems[0]._collapsedItems.length === children.length) {
    hierarchyNode.data._collapsed = true;
    hierarchyNode.data._childCount = countDescendantFiles(hierarchyNode.data);
    hierarchyNode.children = null;
    return;
  }

  // Update children with processed items
  hierarchyNode.children = resultItems;
}


function relayoutModifiedNodes(hierarchy, width, height) {
  // Find nodes that need re-layout (bottom-up order so children are processed first)
  const nodesToRelayout = hierarchy.descendants()
    .filter(d => d.data._needsRelayout)
    .sort((a, b) => b.depth - a.depth);  // Process deepest first

  nodesToRelayout.forEach(node => {
    // Rebuild hierarchy for this subtree from modified data
    const subHierarchy = d3.hierarchy(node.data)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    // Run treemap layout on this subtree
    // Use same padding as original, accounting for actual depth in hierarchy
    const nodeWidth = node.x1 - node.x0;
    const nodeHeight = node.y1 - node.y0;
    d3.treemap()
      .size([nodeWidth, nodeHeight])
      .paddingTop(d => {
        // Map sub-hierarchy depth to actual depth in original hierarchy
        const actualDepth = d.depth + node.depth;
        return actualDepth === 1 ? 16 : 2;
      })
      .paddingRight(2).paddingBottom(2).paddingLeft(2).paddingInner(1)
      (subHierarchy);

    // Update the original hierarchy node's children with new positions
    node.children = subHierarchy.children;
    if (node.children) {
      // Offset positions and fix depths for ALL descendants (not just direct children)
      subHierarchy.descendants().forEach(c => {
        if (c.depth === 0) return;  // Skip sub-root (represents node itself)
        c.x0 += node.x0;
        c.x1 += node.x0;
        c.y0 += node.y0;
        c.y1 += node.y0;
        c.depth += node.depth;  // Map sub-depth to actual depth
      });
      // Fix parent pointers for direct children to point to original node
      node.children.forEach(c => {
        c.parent = node;
      });
    }

    delete node.data._needsRelayout;
  });
}
`;
