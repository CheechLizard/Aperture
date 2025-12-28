export const ZOOM_SCRIPT = `
// Reusable zoom transition module
// Handles transform calculation and animation state for all zoom operations

const ZOOM_DURATION = 500;
const ZOOM_EASE = d3.easeCubicOut;

const zoom = {
  _prev: { x: 0, y: 0, kx: 1, ky: 1 },
  _curr: { x: 0, y: 0, kx: 1, ky: 1 },
  _clickedBounds: null,  // Bounds of clicked element for zoom-in animation

  // Calculate zoom transform for a target node
  calculateTransform(targetNode, width, height) {
    if (targetNode) {
      return {
        x: targetNode.x0,
        y: targetNode.y0,
        kx: width / (targetNode.x1 - targetNode.x0),
        ky: height / (targetNode.y1 - targetNode.y0)
      };
    }
    return { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Update zoom state and return prev/curr for animation
  update(targetNode, width, height) {
    this._prev = { ...this._curr };
    this._curr = this.calculateTransform(targetNode, width, height);
    return { prev: this._prev, curr: this._curr };
  },

  // Get a D3 transition configured for zoom animations
  transition(name) {
    return d3.transition(name || 'zoom')
      .duration(ZOOM_DURATION)
      .ease(ZOOM_EASE);
  },

  // Calculate bounds for exit animations (where element was in prev transform)
  exitBounds(node, transform) {
    if (!node) return { x: 0, y: 0, w: 0, h: 0 };
    return {
      x: (node.x0 - transform.x) * transform.kx,
      y: (node.y0 - transform.y) * transform.ky,
      w: (node.x1 - node.x0) * transform.kx,
      h: (node.y1 - node.y0) * transform.ky
    };
  },

  // Reset zoom state (for view changes)
  reset() {
    this._prev = { x: 0, y: 0, kx: 1, ky: 1 };
    this._curr = { x: 0, y: 0, kx: 1, ky: 1 };
  },

  // Set clicked bounds for zoom-in animation (call before navigation)
  setClickedBounds(bounds) {
    this._clickedBounds = bounds;
  },

  // Get and clear clicked bounds for zoom-in animation
  consumeClickedBounds() {
    const bounds = this._clickedBounds;
    this._clickedBounds = null;
    return bounds;
  },

  // Generalized two-layer crossfade animation
  // Works for any transition: folder→folder, file→function, etc.
  // direction: 'in' (zoom into clicked element) or 'out' (zoom back to parent)
  animateLayers(oldLayer, newLayer, bounds, width, height, t, direction) {
    if (!bounds || !oldLayer || !newLayer) return;

    // Use non-uniform scaling so both dimensions animate (avoids no-zoom when one dimension matches)
    const scaleX = width / bounds.w;
    const scaleY = height / bounds.h;
    const invScaleX = bounds.w / width;
    const invScaleY = bounds.h / height;

    // Hide text on old layer before scaling (prevents giant text)
    oldLayer.selectAll('text').style('opacity', 0);
    oldLayer.attr('pointer-events', 'none');

    if (direction === 'in') {
      // ZOOM IN: Old scales up toward bounds, new expands from bounds

      // Old layer: scale up so bounds fills screen
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start small at bounds position, expand to fill
      newLayer
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)')
        .style('opacity', 1);

    } else {
      // ZOOM OUT: Old shrinks to bounds, new scales down from enlarged state
      // Use top-left alignment: old view showed content at (0,0), so bounds should start there

      // Old layer: shrink so content at (0,0) ends up at bounds position
      oldLayer
        .transition(t)
        .attr('transform', 'translate(' + bounds.x + ',' + bounds.y + ') scale(' + invScaleX + ',' + invScaleY + ')')
        .style('opacity', 0)
        .remove();

      // New layer: start with bounds filling screen, animate to identity
      newLayer
        .attr('transform', 'translate(' + (-bounds.x * scaleX) + ',' + (-bounds.y * scaleY) + ') scale(' + scaleX + ',' + scaleY + ')')
        .transition(t)
        .attr('transform', 'translate(0,0) scale(1)');
    }
  },

  // Getters for current state
  get prev() { return this._prev; },
  get curr() { return this._curr; },
  get clickedBounds() { return this._clickedBounds; },
  get duration() { return ZOOM_DURATION; }
};
`;
