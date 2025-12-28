export const ZOOM_SCRIPT = `
// Reusable zoom transition module
// Handles transform calculation and animation state for all zoom operations

const ZOOM_DURATION = 500;
const ZOOM_EASE = d3.easeCubicOut;

const zoom = {
  _prev: { x: 0, y: 0, kx: 1, ky: 1 },
  _curr: { x: 0, y: 0, kx: 1, ky: 1 },
  _clickedBounds: null,  // Bounds of clicked element for enter animations
  _zoomStack: [],        // Stack of bounds for zoom-out animations

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

  // Set clicked bounds for enter animations (call before navigation)
  setClickedBounds(bounds) {
    this._clickedBounds = bounds;
  },

  // Get and clear clicked bounds (call during render)
  consumeClickedBounds() {
    const bounds = this._clickedBounds;
    this._clickedBounds = null;
    // Push to stack for zoom-out
    if (bounds) {
      this._zoomStack.push(bounds);
    }
    return bounds;
  },

  // Pop bounds from stack for zoom-out animation
  popZoomStack() {
    return this._zoomStack.pop() || null;
  },

  // Getters for current state
  get prev() { return this._prev; },
  get curr() { return this._curr; },
  get clickedBounds() { return this._clickedBounds; },
  get duration() { return ZOOM_DURATION; }
};
`;
